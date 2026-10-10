import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';
import ReportingSmartFilter, {
  filtersToQueryParams,
  getReportingFilterFields,
} from '../smart-filter/ReportingSmartFilter';
import type { ActiveFilter, FilterSelectOption } from '../smart-filter/types';

export type ProjectRow = {
  id: string;
  project_objectives: string;
  project_name?: string | null;
  state?: string;
  locality?: string;
  err_id?: string;
  status?: string;
  date?: string | null;
  submitted_at?: string | null;
  date_transfer?: string | null;
  f4_status?: string | null;
  f5_status?: string | null;
  is_own_room?: boolean;
  room?: { name?: string; name_ar?: string; err_code?: string } | null;
};

type ProjectIndexProps = {
  token: string;
  mode?: 'reporting' | 'browse';
  onSelect?: (project: ProjectRow) => void;
  locale?: string;
  /** API status filter — used when smart filters are off */
  status?: string;
  layout?: 'list' | 'status-table';
  pageSize?: number;
  /** Enable portal-style smart filters (State, Locality, …) */
  enableSmartFilters?: boolean;
  /** Which report status filter to expose */
  reportKind?: 'f4' | 'f5';
};

const DEFAULT_PAGE_SIZE = 20;

function defaultReportingFilters(): ActiveFilter[] {
  return [
    {
      id: 'default_project_status',
      fieldId: 'project_status',
      value: ['active'],
    },
  ];
}

const ProjectIndex: React.FC<ProjectIndexProps> = ({
  token,
  mode = 'reporting',
  onSelect,
  locale = 'en',
  status = 'active',
  layout = 'list',
  pageSize = DEFAULT_PAGE_SIZE,
  enableSmartFilters = false,
  reportKind = 'f4',
}) => {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<{ id: string; label: string }[]>([]);
  const [pageInput, setPageInput] = useState('1');
  const [filters, setFilters] = useState<ActiveFilter[]>(() =>
    enableSmartFilters ? defaultReportingFilters() : []
  );
  const [allStates, setAllStates] = useState<FilterSelectOption[]>([]);
  const [allLocalityPairs, setAllLocalityPairs] = useState<
    { state: string; locality: string }[]
  >([]);

  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const useTable = layout === 'status-table';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const selectedStates = useMemo(() => {
    const f = filters.find((x) => x.fieldId === 'state');
    return Array.isArray(f?.value) ? f!.value.map(String) : [];
  }, [filters]);

  const localityOptions = useMemo(() => {
    const pairs =
      selectedStates.length > 0
        ? allLocalityPairs.filter((p) => selectedStates.includes(p.state))
        : allLocalityPairs;
    const seen = new Set<string>();
    const opts: FilterSelectOption[] = [];
    pairs.forEach((p) => {
      if (seen.has(p.locality)) return;
      seen.add(p.locality);
      opts.push({ value: p.locality, label: p.locality });
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [allLocalityPairs, selectedStates]);

  // Drop locality selections that are no longer valid when state changes
  useEffect(() => {
    if (!enableSmartFilters) return;
    setFilters((prev) => {
      const locFilter = prev.find((f) => f.fieldId === 'locality');
      if (!locFilter || !Array.isArray(locFilter.value)) return prev;
      const allowed = new Set(localityOptions.map((o) => o.value));
      const next = locFilter.value.map(String).filter((v) => allowed.has(v));
      if (next.length === locFilter.value.length) return prev;
      return prev.map((f) => (f.id === locFilter.id ? { ...f, value: next } : f));
    });
  }, [localityOptions, enableSmartFilters]);

  const filterFields = useMemo(
    () =>
      getReportingFilterFields({
        reportKind,
        stateOptions: allStates,
        localityOptions,
      }),
    [reportKind, allStates, localityOptions]
  );

  const filterParams = useMemo(
    () => (enableSmartFilters ? filtersToQueryParams(filters) : {}),
    [enableSmartFilters, filters]
  );

  const fetchPage = useCallback(
    async (nextOffset: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: String(nextOffset),
        });

        if (enableSmartFilters) {
          if (filterParams.status) params.set('status', filterParams.status);
          else params.set('status', 'all');
          Object.entries(filterParams).forEach(([k, v]) => {
            if (k !== 'status') params.set(k, v);
          });
          if (replace) params.set('include_filter_options', '1');
        } else {
          params.set('status', status);
        }

        if (debouncedQ) params.set('q', debouncedQ);
        if (roomFilter) params.set('room_id', roomFilter);

        const res = await fetch(`/api/get-projects?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load projects');
        const data = await res.json();
        const list: ProjectRow[] = data.projects || [];
        setTotal(data.total ?? list.length);
        if (useTable) {
          setOffset(nextOffset);
          setProjects(list);
        } else {
          setOffset(nextOffset + list.length);
          setProjects((prev) => (replace ? list : [...prev, ...list]));
        }

        if (replace && data.filterOptions) {
          setAllStates(
            (data.filterOptions.states || []).map((s: string) => ({
              value: s,
              label: s,
            }))
          );
          setAllLocalityPairs(data.filterOptions.localities || []);
        }

        if (replace && data.roomOptions) {
          setRooms(data.roomOptions);
        } else if (replace) {
          const map = new Map<string, string>();
          list.forEach((p) => {
            if (!p.err_id) return;
            const label =
              (locale === 'ar'
                ? p.room?.name_ar || p.room?.name
                : p.room?.name || p.room?.name_ar) ||
              p.room?.err_code ||
              p.err_id;
            map.set(String(p.err_id), label);
          });
          setRooms(Array.from(map.entries()).map(([id, label]) => ({ id, label })));
        }
      } catch (e: any) {
        setError(e.message || 'Error loading projects');
      } finally {
        setLoading(false);
      }
    },
    [
      token,
      debouncedQ,
      roomFilter,
      locale,
      status,
      pageSize,
      useTable,
      enableSmartFilters,
      filterParams,
    ]
  );

  useEffect(() => {
    setProjects([]);
    setOffset(0);
    fetchPage(0, true);
  }, [fetchPage]);

  const hasMore = !useTable && projects.length < total;

  const handleSelect = (project: ProjectRow) => {
    if (onSelect) {
      onSelect(project);
      return;
    }
    if (mode === 'reporting') {
      router.push(`/f-system/f4-f5/${project.id}`);
    }
  };

  const goToPage = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) {
      setPageInput(String(page));
      return;
    }
    const clamped = Math.min(totalPages, Math.max(1, n));
    setPageInput(String(clamped));
    const nextOffset = (clamped - 1) * pageSize;
    if (nextOffset !== offset) fetchPage(nextOffset, true);
  };

  const onFiltersChange = (next: ActiveFilter[]) => {
    setFilters(next);
    setOffset(0);
  };

  const roomLabel = (p: ProjectRow) =>
    (locale === 'ar' ? p.room?.name_ar || p.room?.name : p.room?.name || p.room?.name_ar) ||
    p.room?.err_code ||
    null;

  const localityLabel = (p: ProjectRow) =>
    p.locality || p.state || p.project_name || p.project_objectives || 'Untitled';

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(locale || 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusColor = (s?: string) => {
    if (s === 'active') return 'text-emerald-300';
    if (s === 'pending') return 'text-brand-orange';
    if (s === 'feedback') return 'text-[#9BB0D4]';
    if (s === 'approved') return 'text-emerald-200';
    return 'text-[#a8b6cc]';
  };

  const statusLabel = (s?: string) => {
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const reportStatusLabel = (s?: string | null) => {
    if (!s) return '—';
    if (s === 'in review') return 'Under review';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="space-y-4">
      {enableSmartFilters && (
        <ReportingSmartFilter
          fields={filterFields}
          filters={filters}
          onFiltersChange={onFiltersChange}
          chipOptionsByFieldId={{ locality: localityOptions }}
          title="Projects"
          count={total}
        />
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a97ab] rtl:left-auto rtl:right-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search locality or state…"
            className="w-full rounded-xl border border-white/10 bg-[#122038] pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-sm text-white placeholder:text-[#6b7a94] outline-none focus:border-brand-orange/50"
          />
        </div>
        {rooms.length > 1 && (
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="sm:w-48 rounded-xl border border-white/10 bg-[#122038] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-orange/50"
          >
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {!enableSmartFilters && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-xs font-semibold text-[#8a97ab] mb-0">
            {total} project{total === 1 ? '' : 's'}
            {debouncedQ ? ` matching “${debouncedQ}”` : ''}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-400/30">
          {error}
        </div>
      )}

      {useTable ? (
        <>
          {loading && projects.length === 0 ? (
            <p className="text-sm text-[#a8b6cc]">Loading…</p>
          ) : projects.length > 0 ? (
            <>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[320px]">
                    <thead className="bg-[#1c2d48] text-[#a8b6cc] text-xs">
                      <tr>
                        <th className="px-3 py-2.5 text-start font-semibold">Locality</th>
                        <th className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">
                          Date
                        </th>
                        <th className="px-3 py-2.5 text-start font-semibold">Status</th>
                        {enableSmartFilters && (
                          <th className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">
                            {reportKind === 'f4' ? 'F4' : 'F5'}
                          </th>
                        )}
                        <th className="w-8 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr
                          key={project.id}
                          className="border-t border-white/10 cursor-pointer bg-[#152238] hover:bg-[#1c2d48] transition-colors"
                          onClick={() => handleSelect(project)}
                        >
                          <td className="px-3 py-2.5 text-white font-medium max-w-[140px]">
                            <span className="line-clamp-2">{localityLabel(project)}</span>
                            {project.state && (
                              <span className="block text-[11px] text-[#8a97ab] mt-0.5 truncate">
                                {project.state}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-[#a8b6cc] whitespace-nowrap text-xs">
                            {formatDate(project.date || project.submitted_at)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold ${statusColor(project.status)}`}
                            >
                              {statusLabel(project.status)}
                            </span>
                          </td>
                          {enableSmartFilters && (
                            <td className="px-3 py-2.5 text-[#a8b6cc] whitespace-nowrap text-xs">
                              {reportStatusLabel(
                                reportKind === 'f4' ? project.f4_status : project.f5_status
                              )}
                            </td>
                          )}
                          <td className="px-2 py-2.5 text-[#6b7a94]">
                            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={offset <= 0 || loading}
                    onClick={() => fetchPage(Math.max(0, offset - pageSize), true)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#1c2d48] border border-white/10 text-[#a8b6cc] disabled:opacity-40 hover:text-white"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-[#8a97ab]">
                    <span>Page</span>
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
                      aria-label="Go to page"
                      className="w-12 rounded-md border border-white/10 bg-[#122038] px-1.5 py-1 text-center text-xs font-semibold text-white outline-none focus:border-brand-orange/50 disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span>
                      of {totalPages} ({total})
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={offset + pageSize >= total || loading}
                    onClick={() => fetchPage(offset + pageSize, true)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#1c2d48] border border-white/10 text-[#a8b6cc] disabled:opacity-40 hover:text-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="rounded-xl border border-white/10 bg-[#122038]/60 px-4 py-10 text-center">
                <p className="text-sm text-[#a8b6cc] mb-0">No projects match these filters.</p>
              </div>
            )
          )}
          {loading && projects.length > 0 && (
            <div className="flex justify-center py-2 text-[#8a97ab]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="md:hidden space-y-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-start rounded-xl border border-white/10 bg-[#122038]/80 px-4 py-3 flex items-start gap-3 hover:border-brand-orange/40 transition-all"
              >
                <span className="mt-0.5 h-2 w-2 rounded-full bg-brand-orange shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-white text-sm leading-snug line-clamp-3 block">
                    {p.project_objectives || 'Untitled'}
                  </span>
                  <span className="mt-1 text-xs text-[#8a97ab] block">
                    {[p.locality, p.state, !p.is_own_room ? roomLabel(p) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#6b7a94] shrink-0 mt-1 rtl:rotate-180" />
              </button>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-[#122038]/60">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[#8a97ab]">
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                    Objectives
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                    Locality
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Room</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide w-28" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => handleSelect(p)}
                  >
                    <td className="px-4 py-3 max-w-md font-medium text-white">
                      <span className="line-clamp-2">{p.project_objectives || 'Untitled'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#a8b6cc] whitespace-nowrap">
                      {p.locality || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#a8b6cc] whitespace-nowrap">
                      {roomLabel(p) || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-brand-orange font-semibold text-sm">
                        Open
                        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex justify-center py-8 text-[#8a97ab]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-[#122038]/60 px-4 py-10 text-center">
              <p className="text-sm text-[#a8b6cc] mb-0">No projects found.</p>
            </div>
          )}

          {hasMore && !loading && (
            <button
              type="button"
              onClick={() => fetchPage(offset, false)}
              className="w-full rounded-xl border border-white/10 bg-[#1c2d48] py-2.5 text-sm font-semibold text-[#a8b6cc] hover:text-white hover:border-brand-orange/40 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectIndex;
