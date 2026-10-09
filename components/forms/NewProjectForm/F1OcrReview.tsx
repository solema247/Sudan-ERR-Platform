import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { newSupabase } from '../../../services/newSupabaseClient';
import type { F1OcrReviewPayload, MapExpense, MapExtractedData, MapPlannedActivity } from '../../../lib/f1/mapReviewTypes';
import { seedReviewFromOcr } from '../../../lib/f1/mapReviewNormalize';
import { submitMapOcrWorkplan } from '../../../lib/f1/submitMapOcrWorkplan';

/** Fixed height so native <select> matches <input> / read-only divs */
const FIELD =
  'app-input !box-border !h-10 !min-h-[2.5rem] !max-h-[2.5rem] !py-0 !leading-10 text-sm';
const FIELD_RO = `${FIELD} !flex !items-center !leading-normal bg-[#1c2d48] text-[#a8b6cc] truncate`;
const FIELD_AREA = 'app-input !py-2 text-sm leading-snug !h-auto !min-h-0 !max-h-none';
const FIELD_SM =
  'app-input !box-border !h-8 !min-h-[2rem] !max-h-[2rem] !py-0 !leading-8 text-xs';
const LABEL = 'font-semibold block text-xs text-[#a8b6cc] mb-1';

type Sector = { id: string; sector_name_en: string; sector_name_ar: string | null };
type CatalogActivity = {
  id: string;
  activity_name: string;
  activity_name_ar: string | null;
  language: string | null;
};

type Props = {
  payload: F1OcrReviewPayload;
  onBack: () => void;
  onSubmitted: () => void;
};

function isOtherActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('other') || name.includes('أخرى');
}

export default function F1OcrReview({ payload, onBack, onSubmitted }: Props) {
  const [initialSnapshot] = useState(() =>
    seedReviewFromOcr(payload.extracted, {
      state: payload.state_name,
      locality: payload.locality,
      form_currency: payload.form_currency,
      exchange_rate: payload.exchange_rate,
    })
  );
  const [edited, setEdited] = useState<MapExtractedData>(initialSnapshot);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [catalogActivities, setCatalogActivities] = useState<CatalogActivity[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  const formCurrency = edited.form_currency || payload.form_currency || 'USD';
  const fileType = payload.file_type || payload.file?.type || '';
  const isPdf =
    fileType === 'application/pdf' ||
    (payload.file_name || '').toLowerCase().endsWith('.pdf');
  const isImage = fileType.startsWith('image/');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (payload.file) {
      objectUrl = URL.createObjectURL(payload.file);
      setFileUrl(objectUrl);
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    (async () => {
      if (!payload.temp_file_key) return;
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session || cancelled) return;
      const res = await fetch(
        `/api/f1/temp-signed-url?key=${encodeURIComponent(payload.temp_file_key)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (!cancelled && res.ok && data.signedUrl) setFileUrl(data.signedUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [payload.file, payload.temp_file_key]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/f1/review-options', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!cancelled && res.ok && data.success) {
        setSectors(data.sectors || []);
        setCatalogActivities(data.planned_activities || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-populate planned activities from tagged expenses (MAP logic)
  useEffect(() => {
    const activityMap = new Map<string, { activity: string; cost: number }>();
    edited.expenses.forEach((expense) => {
      if (!expense.planned_activity?.trim()) return;
      const isOther = isOtherActivity(expense.planned_activity);
      const activityName =
        isOther && expense.planned_activity_other?.trim()
          ? expense.planned_activity_other.trim()
          : expense.planned_activity.trim();
      if (!activityName) return;
      const existing = activityMap.get(activityName);
      if (existing) existing.cost += expense.total_cost_usd || 0;
      else activityMap.set(activityName, { activity: activityName, cost: expense.total_cost_usd || 0 });
    });

    const auto: MapPlannedActivity[] = Array.from(activityMap.values()).map((item) => ({
      activity: item.activity,
      category: null,
      individuals: null,
      families: null,
      planned_activity_cost: item.cost,
    }));

    const existing = edited.planned_activities as MapPlannedActivity[];
    const merged = auto.map((autoActivity) => {
      const prev = existing.find((e) => e.activity === autoActivity.activity);
      return {
        ...autoActivity,
        category: prev?.category ?? null,
        individuals: prev?.individuals ?? null,
        families: prev?.families ?? null,
      };
    });

    const needsUpdate =
      merged.length !== existing.length ||
      merged.some((m) => {
        const e = existing.find((x) => x.activity === m.activity);
        return !e || e.planned_activity_cost !== m.planned_activity_cost;
      }) ||
      existing.some((e) => !merged.find((m) => m.activity === e.activity));

    if (needsUpdate && (merged.length > 0 || existing.length > 0)) {
      setEdited((prev) => ({
        ...prev,
        planned_activities: merged,
      }));
    }
  }, [edited.expenses]);

  const totalUsd = useMemo(
    () => edited.expenses.reduce((s, e) => s + (e.total_cost_usd || 0), 0),
    [edited.expenses]
  );

  const setField = <K extends keyof MapExtractedData>(key: K, value: MapExtractedData[K]) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const setExpense = (index: number, patch: Partial<MapExpense>) => {
    const next = [...edited.expenses];
    next[index] = { ...next[index], ...patch };
    setEdited((prev) => ({ ...prev, expenses: next }));
  };

  const setActivity = (index: number, patch: Partial<MapPlannedActivity>) => {
    const activities = [...(edited.planned_activities as MapPlannedActivity[])];
    activities[index] = { ...activities[index], ...patch };
    setEdited((prev) => ({ ...prev, planned_activities: activities }));
  };

  const handleSubmit = async () => {
    setValidationError(null);
    const activities = edited.planned_activities as MapPlannedActivity[];
    if (activities.length > 0) {
      const hasIndividuals = activities.some(
        (a) => a.individuals != null && a.individuals > 0
      );
      if (!hasIndividuals) {
        const msg =
          'At least one planned activity must have "Individuals" filled in before submission.';
        setValidationError(msg);
        return;
      }
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) throw new Error('Not signed in');

      await submitMapOcrWorkplan(edited, {
        emergency_room_id: payload.emergency_room_id,
        grant_segment: payload.grant_segment,
        organization_id: payload.organization_id,
        temp_file_key: payload.temp_file_key,
        initialExtracted: initialSnapshot,
        accessToken: session.access_token,
      });
      setDone(true);
    } catch (e: any) {
      setValidationError(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-white text-base">F1 work plan submitted successfully.</p>
        <button type="button" onClick={onSubmitted} className="app-action-primary">
          Done
        </button>
      </div>
    );
  }

  const activities = edited.planned_activities as MapPlannedActivity[];

  return (
    <div>
      <div className="mb-3">
        <p className="app-section-label mb-0.5">F1 · Review</p>
        <h2 className="text-lg font-bold text-white leading-snug">Review extracted F1</h2>
        <p className="text-xs text-[#8a97ab] mt-0.5 mb-0">
          {payload.organization_label || 'Org'}
          {payload.room_label ? ` · ${payload.room_label}` : ''}
          {payload.grant_segment ? ` · ${payload.grant_segment}` : ''}
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-brand-orange/20 border border-brand-orange/40">
          <span className="font-semibold text-sm text-white">F1 amount</span>
          <span className="font-bold text-brand-orange" dir="ltr">
            {totalUsd.toLocaleString()} USD
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0">
            <label className={LABEL}>Date</label>
            <input
              type="date"
              className={FIELD}
              value={edited.date && /^\d{4}-\d{2}-\d{2}$/.test(edited.date) ? edited.date : ''}
              onChange={(e) => setField('date', e.target.value || null)}
            />
          </div>
          <div className="min-w-0">
            <label className={LABEL}>Language</label>
            <select
              className={FIELD}
              value={edited.language || 'en'}
              onChange={(e) => setField('language', e.target.value as 'ar' | 'en')}
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className={LABEL}>State</label>
            <div className={FIELD_RO}>
              {payload.state_name || edited.state || '—'}
            </div>
          </div>
          <div className="min-w-0">
            <label className={LABEL}>Locality</label>
            <div className={FIELD_RO}>
              {payload.locality || edited.locality || '—'}
            </div>
          </div>
          <div className="min-w-0">
            <label className={LABEL}>Estimated timeframe</label>
            <input
              className={FIELD}
              value={edited.estimated_timeframe || ''}
              onChange={(e) => setField('estimated_timeframe', e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label className={LABEL}>Estimated beneficiaries</label>
            <input
              type="number"
              className={FIELD}
              value={edited.estimated_beneficiaries ?? ''}
              onChange={(e) =>
                setField(
                  'estimated_beneficiaries',
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Project objectives</label>
          <textarea
            rows={3}
            className={FIELD_AREA}
            value={edited.project_objectives || ''}
            onChange={(e) => setField('project_objectives', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Intended beneficiaries</label>
          <textarea
            rows={2}
            className={FIELD_AREA}
            value={edited.intended_beneficiaries || ''}
            onChange={(e) => setField('intended_beneficiaries', e.target.value)}
          />
        </div>

        {/* Planned activities */}
        <div>
          <h3 className="text-sm font-bold text-white mb-1.5">
            Planned activities <span className="text-brand-orange">*</span>
          </h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1c2d48] text-[#a8b6cc]">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Activity</th>
                    <th className="px-2 py-1.5 text-left font-semibold min-w-[120px]">Sector</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Indiv.*</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Fam.</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Cost</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <tr key={`${activity.activity}-${index}`} className="border-t border-white/10">
                      <td className="px-2 py-1.5 text-white max-w-[140px] truncate">
                        {activity.activity || '—'}
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className={FIELD_SM}
                          value={sectors.find((s) => s.sector_name_en === activity.category)?.id || ''}
                          onChange={(e) => {
                            const sector = sectors.find((s) => s.id === e.target.value);
                            setActivity(index, {
                              category: sector ? sector.sector_name_en : null,
                            });
                          }}
                        >
                          <option value="">Sector</option>
                          {sectors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.sector_name_en}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          className={`${FIELD_SM} w-16`}
                          value={activity.individuals ?? ''}
                          onChange={(e) => {
                            setActivity(index, {
                              individuals: e.target.value ? parseInt(e.target.value, 10) : null,
                            });
                            if (validationError?.includes('Individuals')) setValidationError(null);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          className={`${FIELD_SM} w-16`}
                          value={activity.families ?? ''}
                          onChange={(e) =>
                            setActivity(index, {
                              families: e.target.value ? parseInt(e.target.value, 10) : null,
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right text-white font-medium" dir="ltr">
                        {(activity.planned_activity_cost || 0).toLocaleString()}
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button
                          type="button"
                          className="text-[#8a97ab] hover:text-red-300 px-1"
                          onClick={() => {
                            setEdited((prev) => ({
                              ...prev,
                              planned_activities: activities.filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-[#8a97ab] text-center">
                        Tag expenses with a planned activity below to populate this table.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-3 py-2 text-[11px] text-[#8a97ab] border-t border-white/10 mb-0">
              At least one activity needs Individuals before submit.
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div>
          <h3 className="text-sm font-bold text-white mb-1.5">Expenses</h3>
          {formCurrency === 'SDG' && (
            <p className="text-[11px] text-[#8a97ab] mb-1.5">
              Form currency: SDG · Rate: 1 USD = {edited.exchange_rate || payload.exchange_rate} SDG
            </p>
          )}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1c2d48] text-[#a8b6cc]">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Expense</th>
                    <th className="px-2 py-1.5 text-left font-semibold min-w-[140px]">
                      Planned activity
                    </th>
                    <th className="px-2 py-1.5 text-right font-semibold">USD</th>
                    {formCurrency === 'SDG' && (
                      <th className="px-2 py-1.5 text-right font-semibold">SDG</th>
                    )}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {edited.expenses.map((expense, index) => (
                    <tr key={index} className="border-t border-white/10 align-top">
                      <td className="px-2 py-1">
                        <input
                          className={FIELD_SM}
                          value={expense.activity}
                          onChange={(e) => setExpense(index, { activity: e.target.value })}
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className={FIELD_SM}
                          value={
                            catalogActivities.find(
                              (a) => a.activity_name === expense.planned_activity
                            )?.id || ''
                          }
                          onChange={(e) => {
                            const selected = catalogActivities.find((a) => a.id === e.target.value);
                            const name = selected?.activity_name || null;
                            setExpense(index, {
                              planned_activity: name,
                              planned_activity_other: isOtherActivity(name)
                                ? expense.planned_activity_other
                                : null,
                            });
                          }}
                        >
                          <option value="">Select…</option>
                          {catalogActivities.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.activity_name}
                            </option>
                          ))}
                        </select>
                        {isOtherActivity(expense.planned_activity) && (
                          <input
                            className={`${FIELD_SM} mt-1`}
                            value={expense.planned_activity_other || ''}
                            onChange={(e) =>
                              setExpense(index, { planned_activity_other: e.target.value })
                            }
                            placeholder="Specify other"
                          />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={`${FIELD_SM} text-right w-20`}
                          value={expense.total_cost_usd}
                          onChange={(e) =>
                            setExpense(index, {
                              total_cost_usd: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      {formCurrency === 'SDG' && (
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            className={`${FIELD_SM} text-right w-24`}
                            value={expense.total_cost_sdg ?? ''}
                            onChange={(e) =>
                              setExpense(index, {
                                total_cost_sdg: e.target.value
                                  ? parseFloat(e.target.value)
                                  : null,
                              })
                            }
                          />
                        </td>
                      )}
                      <td className="px-1 py-1 text-center">
                        <button
                          type="button"
                          className="text-[#8a97ab] hover:text-red-300 px-1"
                          onClick={() =>
                            setEdited((prev) => ({
                              ...prev,
                              expenses: prev.expenses.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-white/10 bg-[#152238]">
                    <td
                      colSpan={formCurrency === 'SDG' ? 2 : 2}
                      className="px-2 py-1.5 text-right font-semibold text-white"
                    >
                      Total
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-brand-orange" dir="ltr">
                      {totalUsd.toLocaleString()}
                    </td>
                    {formCurrency === 'SDG' && (
                      <td className="px-2 py-1.5 text-right text-white" dir="ltr">
                        {edited.expenses
                          .reduce((s, e) => s + (e.total_cost_sdg || 0), 0)
                          .toLocaleString()}
                      </td>
                    )}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-white/10">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#a8b6cc] hover:text-brand-orange"
                onClick={() =>
                  setEdited((prev) => ({
                    ...prev,
                    expenses: [
                      ...prev.expenses,
                      {
                        activity: '',
                        total_cost_usd: 0,
                        total_cost_sdg: null,
                        currency: formCurrency,
                        category: null,
                        planned_activity: null,
                        planned_activity_other: null,
                      },
                    ],
                  }))
                }
              >
                <Plus className="w-3.5 h-3.5" />
                Add expense
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className={LABEL}>Additional support</label>
          <textarea
            rows={2}
            className={FIELD_AREA}
            value={edited.additional_support || ''}
            onChange={(e) => setField('additional_support', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Banking details</label>
          <textarea
            rows={2}
            className={FIELD_AREA}
            value={edited.banking_details || ''}
            onChange={(e) => setField('banking_details', e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>Officers</label>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <input
                className={FIELD}
                placeholder="Program officer name"
                value={edited.program_officer_name || ''}
                onChange={(e) => setField('program_officer_name', e.target.value)}
              />
              <input
                className={FIELD}
                placeholder="Phone"
                value={edited.program_officer_phone || ''}
                onChange={(e) => setField('program_officer_phone', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={FIELD}
                placeholder="Reporting officer name"
                value={edited.reporting_officer_name || ''}
                onChange={(e) => setField('reporting_officer_name', e.target.value)}
              />
              <input
                className={FIELD}
                placeholder="Phone"
                value={edited.reporting_officer_phone || ''}
                onChange={(e) => setField('reporting_officer_phone', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={FIELD}
                placeholder="Finance officer name"
                value={edited.finance_officer_name || ''}
                onChange={(e) => setField('finance_officer_name', e.target.value)}
              />
              <input
                className={FIELD}
                placeholder="Phone"
                value={edited.finance_officer_phone || ''}
                onChange={(e) => setField('finance_officer_phone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {validationError && (
          <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
            {validationError}
          </div>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="app-action-primary !py-3 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit F1'}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back
        </button>

        {/* Original file — MAP-style collapsible (no OCR text) */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setFileOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#1c2d48] text-left"
          >
            <span className="text-sm font-semibold text-white">Original file</span>
            <ChevronDown
              className={`h-4 w-4 text-[#a8b6cc] transition-transform ${
                fileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {fileOpen && (
            <div className="p-3 space-y-2 bg-[#152238]">
              {(payload.file_name || payload.temp_file_key) && (
                <p className="text-[11px] text-[#8a97ab] truncate mb-0">
                  {payload.file_name || payload.temp_file_key}
                </p>
              )}
              {fileUrl ? (
                isPdf ? (
                  <div className="w-full h-[420px] rounded-lg border border-white/10 overflow-hidden">
                    <iframe
                      src={fileUrl}
                      className="w-full h-full"
                      title="Uploaded F1"
                    />
                  </div>
                ) : isImage ? (
                  <div className="w-full max-h-[420px] rounded-lg border border-white/10 overflow-auto">
                    <img
                      src={fileUrl}
                      alt="Uploaded F1"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 px-3 py-6 text-center space-y-2">
                    <p className="text-sm text-[#a8b6cc] mb-0">
                      Preview not available for this file type.
                    </p>
                    <a
                      href={fileUrl}
                      download={payload.file_name || 'f1-document'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-semibold text-brand-orange hover:underline"
                    >
                      Open / download file
                    </a>
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-white/10 px-3 py-8 text-center text-sm text-[#8a97ab]">
                  No file preview available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
