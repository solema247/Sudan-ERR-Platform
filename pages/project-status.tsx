// pages/project-status.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nType } from 'i18next';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { newSupabase } from '../services/newSupabaseClient';
import appI18n from '../services/i18n';
import enProjectStatus from '../public/locales/en/project-status.json';
import arProjectStatus from '../public/locales/ar/project-status.json';
import esProjectStatus from '../public/locales/es/project-status.json';

const PROJECT_STATUS_BUNDLES = {
  en: enProjectStatus,
  ar: arProjectStatus,
  es: esProjectStatus,
} as const;

function ensureProjectStatusBundles(instance: I18nType) {
  (Object.keys(PROJECT_STATUS_BUNDLES) as (keyof typeof PROJECT_STATUS_BUNDLES)[]).forEach(
    (lng) => {
      const bundle = PROJECT_STATUS_BUNDLES[lng];
      instance.addResourceBundle(lng, 'project-status', bundle, true, true);
      instance.addResourceBundle(lng, 'projectStatus', bundle, true, true);
    }
  );
}

ensureProjectStatusBundles(appI18n);

interface ProjectStatusProps {
  onReturnToMenu: () => void;
  onEditProject?: (projectId: string) => void;
}

type ProjectRow = {
  id: string;
  date?: string | null;
  state?: string | null;
  locality?: string | null;
  status: string;
  funding_status?: string | null;
  submitted_at?: string | null;
  last_modified?: string | null;
  version?: number;
  err_id?: string;
  project_name?: string | null;
  is_own_room?: boolean;
  room?: { name?: string; name_ar?: string; err_code?: string; state?: string } | null;
  // detail fields
  project_objectives?: string | null;
  intended_beneficiaries?: string | null;
  estimated_beneficiaries?: number | null;
  estimated_timeframe?: string | null;
  additional_support?: string | null;
  planned_activities?: any[];
};

const PAGE_SIZE = 20;

const STATUS_FILTERS = ['', 'pending', 'feedback', 'approved'] as const;

const statusColor = (status: string) => {
  if (status === 'active') return 'text-emerald-300';
  if (status === 'pending') return 'text-brand-orange';
  if (status === 'feedback') return 'text-[#9BB0D4]';
  if (status === 'approved') return 'text-emerald-200';
  return 'text-[#a8b6cc]';
};

const ProjectStatus: React.FC<ProjectStatusProps> = ({ onReturnToMenu, onEditProject }) => {
  const { t, i18n } = useTranslation(['project-status', 'projectStatus']);
  // Sync before paint — hook instance may differ from services/i18n.
  ensureProjectStatusBundles(i18n);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, ProjectRow>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, any[]>>({});
  const [pageInput, setPageInput] = useState('1');

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      setPageInput(String(page));
      return;
    }
    const clamped = Math.min(totalPages, Math.max(1, n));
    setPageInput(String(clamped));
    const nextOffset = (clamped - 1) * PAGE_SIZE;
    if (nextOffset !== offset) {
      setExpandedId(null);
      setOffset(nextOffset);
    }
  };

  // Debounce search
  useEffect(() => {
    const tmr = setTimeout(() => {
      const next = searchInput.trim();
      setSearchQ((prev) => {
        if (prev !== next) setOffset(0);
        return next;
      });
    }, 300);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        language: i18n.language || 'en',
      });
      if (statusFilter) params.set('status', statusFilter);
      if (searchQ) params.set('q', searchQ);

      const res = await fetch(`/api/project-status?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to fetch projects');
        setProjects([]);
        setTotal(0);
        return;
      }
      setProjects(data.projects || []);
      setTotal(typeof data.total === 'number' ? data.total : (data.projects || []).length);
    } catch (err) {
      console.error('Error fetching project statuses:', err);
      setError(t('fetchError'));
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, searchQ, i18n.language, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchProjectFeedback = async (projectId: string) => {
    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) return null;
      const res = await fetch(`/api/project-feedback?project_id=${projectId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.feedback : null;
    } catch {
      return null;
    }
  };

  const fetchDetail = async (projectId: string) => {
    if (detailMap[projectId]) return detailMap[projectId];
    setDetailLoadingId(projectId);
    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(
        `/api/project-status?id=${encodeURIComponent(projectId)}&language=${i18n.language || 'en'}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success && data.project) {
        setDetailMap((prev) => ({ ...prev, [projectId]: data.project }));
        return data.project as ProjectRow;
      }
    } catch (e) {
      console.error('Detail fetch error:', e);
    } finally {
      setDetailLoadingId(null);
    }
    return null;
  };

  const handleRowClick = async (project: ProjectRow) => {
    if (expandedId === project.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(project.id);
    const detail = await fetchDetail(project.id);
    if (detail?.status === 'feedback' && !feedbackMap[project.id]) {
      const feedback = await fetchProjectFeedback(project.id);
      if (feedback && Array.isArray(feedback)) {
        setFeedbackMap((prev) => ({ ...prev, [project.id]: feedback }));
      }
    }
  };

  const formatDate = (dateString?: string | null, short = false) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    if (short) {
      return d.toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return d.toLocaleString(i18n.language);
  };

  const statusLabel = (status: string) => {
    if (status === 'feedback') return t('feedbackStatus');
    const key = status;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const localityLabel = (p: ProjectRow) =>
    p.locality || p.state || p.project_name || t('workPlan');

  const filterChips = useMemo(
    () =>
      STATUS_FILTERS.map((value) => ({
        value,
        label: value === '' ? t('filterAll') : statusLabel(value),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="app-section-label mb-1">F1</p>
        <h2 className="text-xl font-bold text-white mb-1">{t('projectStatusTitle')}</h2>
        <p className="text-sm text-[#a8b6cc] mb-0">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => {
            const active = statusFilter === chip.value;
            return (
              <button
                key={chip.value || 'all'}
                type="button"
                onClick={() => {
                  setStatusFilter(chip.value);
                  setOffset(0);
                  setExpandedId(null);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-brand-orange text-[#152238]'
                    : 'bg-[#1c2d48] text-[#a8b6cc] border border-white/10 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="app-input !py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#a8b6cc]">{t('loading')}</p>
      ) : projects.length > 0 ? (
        <>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[320px]">
                <thead className="bg-[#1c2d48] text-[#a8b6cc] text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-start font-semibold">{t('locality')}</th>
                    <th className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">
                      {t('colDate')}
                    </th>
                    <th className="px-3 py-2.5 text-start font-semibold">{t('status')}</th>
                    <th className="w-8 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const open = expandedId === project.id;
                    const detail = detailMap[project.id];
                    return (
                      <React.Fragment key={project.id}>
                        <tr
                          className={`border-t border-white/10 cursor-pointer transition-colors ${
                            open ? 'bg-[#243656]' : 'bg-[#152238] hover:bg-[#1c2d48]'
                          }`}
                          onClick={() => handleRowClick(project)}
                        >
                          <td className="px-3 py-2.5 text-white font-medium max-w-[140px]">
                            <span className="line-clamp-2">{localityLabel(project)}</span>
                            {!project.is_own_room && project.room && (
                              <span className="block text-[11px] text-[#8a97ab] mt-0.5 truncate">
                                {(i18n.language === 'ar'
                                  ? project.room.name_ar || project.room.name
                                  : project.room.name || project.room.name_ar) ||
                                  project.room.err_code}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-[#a8b6cc] whitespace-nowrap text-xs">
                            {formatDate(project.submitted_at || project.date, true)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`text-xs font-semibold ${statusColor(project.status)}`}
                            >
                              {statusLabel(project.status)}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-[#8a97ab]">
                            {open ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-t border-white/10 bg-[#0f1828]">
                            <td colSpan={4} className="px-3 py-3">
                              {detailLoadingId === project.id && !detail ? (
                                <p className="text-xs text-[#8a97ab]">{t('loading')}</p>
                              ) : (
                                <div
                                  className="space-y-2.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {detail?.project_objectives && (
                                    <div className="rounded-lg bg-[#1c2d48] border border-white/5 p-2.5">
                                      <p className="text-[11px] text-[#8a97ab] mb-0.5">
                                        {t('details.objectives')}
                                      </p>
                                      <p className="text-sm text-[#e8eef8] whitespace-pre-wrap mb-0">
                                        {detail.project_objectives}
                                      </p>
                                    </div>
                                  )}

                                  <div className="rounded-lg bg-[#1c2d48] border border-white/5 p-2.5">
                                    <h4 className="font-semibold mb-1.5 text-white text-xs">
                                      {t('details.basicInfo')}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-1 text-xs text-[#a8b6cc]">
                                      {(detail?.state || detail?.locality || project.state || project.locality) && (
                                        <p>
                                          <span className="text-[#8a97ab]">
                                            {t('details.location')}:{' '}
                                          </span>
                                          {[
                                            detail?.state || project.state,
                                            detail?.locality || project.locality,
                                          ]
                                            .filter(Boolean)
                                            .join(', ')}
                                        </p>
                                      )}
                                      {detail?.intended_beneficiaries && (
                                        <p>
                                          <span className="text-[#8a97ab]">
                                            {t('details.intendedBeneficiaries')}:{' '}
                                          </span>
                                          {detail.intended_beneficiaries}
                                        </p>
                                      )}
                                      {detail?.estimated_beneficiaries != null && (
                                        <p>
                                          <span className="text-[#8a97ab]">
                                            {t('details.estimatedBeneficiaries')}:{' '}
                                          </span>
                                          {detail.estimated_beneficiaries}
                                        </p>
                                      )}
                                      {detail?.estimated_timeframe && (
                                        <p>
                                          <span className="text-[#8a97ab]">
                                            {t('details.timeframe')}:{' '}
                                          </span>
                                          {detail.estimated_timeframe}
                                        </p>
                                      )}
                                      {project.funding_status && (
                                        <p>
                                          <span className="text-[#8a97ab]">
                                            {t('funding.status')}:{' '}
                                          </span>
                                          {t(`funding.${project.funding_status}`, {
                                            defaultValue: project.funding_status,
                                          })}
                                        </p>
                                      )}
                                      {project.version != null && project.version > 1 && (
                                        <p>
                                          <span className="text-[#8a97ab]">{t('version')}: </span>
                                          {project.version}
                                        </p>
                                      )}
                                      <p>
                                        <span className="text-[#8a97ab]">{t('submittedAt')}: </span>
                                        {formatDate(project.submitted_at)}
                                      </p>
                                    </div>
                                  </div>

                                  {detail?.planned_activities &&
                                    detail.planned_activities.length > 0 && (
                                      <div className="rounded-lg bg-[#1c2d48] border border-white/5 p-2.5">
                                        <h4 className="font-semibold mb-1.5 text-white text-xs">
                                          {t('details.plannedActivities')}
                                        </h4>
                                        <div className="space-y-1.5">
                                          {detail.planned_activities.map(
                                            (activity: any, index: number) => (
                                              <div
                                                key={index}
                                                className="border-b border-white/5 pb-1.5 text-xs text-[#a8b6cc] last:border-0 last:pb-0"
                                              >
                                                {(activity.activityName || activity.activity) && (
                                                  <p>
                                                    <span className="text-[#8a97ab]">
                                                      {t('details.activity')}:{' '}
                                                    </span>
                                                    {activity.activityName || activity.activity}
                                                  </p>
                                                )}
                                                {activity.location && (
                                                  <p>
                                                    <span className="text-[#8a97ab]">
                                                      {t('details.location')}:{' '}
                                                    </span>
                                                    {activity.location}
                                                  </p>
                                                )}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {detail?.additional_support && (
                                    <div className="rounded-lg bg-[#1c2d48] border border-white/5 p-2.5">
                                      <h4 className="font-semibold mb-1 text-white text-xs">
                                        {t('details.additional')}
                                      </h4>
                                      <p className="text-xs text-[#a8b6cc] mb-0">
                                        {detail.additional_support}
                                      </p>
                                    </div>
                                  )}

                                  {project.status === 'feedback' &&
                                    feedbackMap[project.id]?.[0] && (
                                      <div className="rounded-lg bg-brand-orange/10 border border-brand-orange/30 p-2.5">
                                        <h4 className="font-semibold mb-1 text-white text-xs">
                                          {t('feedback.latest')}
                                        </h4>
                                        <p className="mb-2 text-sm text-[#e8eef8]">
                                          {feedbackMap[project.id][0].feedback_text}
                                        </p>
                                        {feedbackMap[project.id][0].created_by && (
                                          <p className="text-[11px] text-[#8a97ab]">
                                            {t('feedback.by')}:{' '}
                                            {feedbackMap[project.id][0].created_by.full_name ||
                                              t('feedback.unknown')}
                                          </p>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => onEditProject?.(project.id)}
                                          className="mt-2.5 w-full rounded-xl bg-brand-orange text-[#152238] text-sm font-bold py-2.5 hover:bg-[#ffb88a]"
                                        >
                                          {t('feedback.editProject')}
                                        </button>
                                      </div>
                                    )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={offset <= 0 || loading}
              onClick={() => {
                setExpandedId(null);
                setOffset((o) => Math.max(0, o - PAGE_SIZE));
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#1c2d48] border border-white/10 text-[#a8b6cc] disabled:opacity-40 hover:text-white"
            >
              {t('prevPage')}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#8a97ab]">
              <span>{t('pageLabel')}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={totalPages}
                value={pageInput}
                disabled={loading || total === 0}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => goToPage(pageInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                    goToPage(pageInput);
                  }
                }}
                aria-label={t('pageInputAria')}
                className="w-12 rounded-md border border-white/10 bg-[#122038] px-1.5 py-1 text-center text-xs font-semibold text-white outline-none focus:border-brand-orange/50 disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span>{t('pageOfShort', { totalPages, total })}</span>
            </div>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => {
                setExpandedId(null);
                setOffset((o) => o + PAGE_SIZE);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#1c2d48] border border-white/10 text-[#a8b6cc] disabled:opacity-40 hover:text-white"
            >
              {t('nextPage')}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-[#8a97ab]">
          {searchQ || statusFilter ? t('noFilteredProjects') : t('noProjectsFound')}
        </p>
      )}

      <button
        type="button"
        onClick={onReturnToMenu}
        className="text-sm font-medium text-[#8a97ab] hover:text-brand-orange px-1 py-2 transition-colors"
      >
        {t('returnToMenu')}
      </button>
    </div>
  );
};

export default ProjectStatus;
