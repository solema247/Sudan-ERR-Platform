import type { MapExpense, MapExtractedData, MapPlannedActivity } from './mapReviewTypes';

export function normalizeF1DateForDb(dateStr: string | null | undefined): string | null {
  if (dateStr == null || typeof dateStr !== 'string') return null;
  const val = dateStr.trim();
  if (val === '') return null;
  if (/^\d{4}$/.test(val)) {
    const mm = val.slice(0, 2);
    const yy = val.slice(2, 4);
    return `20${yy}-${mm}-01`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}

/** Convert OCR/initial date (MMYY or YYYY-MM-DD) to YYYY-MM-DD for the date picker. */
export function deriveDateForPicker(value?: string | null): string {
  try {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}$/.test(value)) {
      const mm = value.slice(0, 2);
      const yy = value.slice(2, 4);
      return `20${yy}-${mm}-01`;
    }
    return '';
  } catch {
    return '';
  }
}

export function normalizePlannedActivities(
  activities: MapPlannedActivity[] | string[] | null | undefined
): MapPlannedActivity[] {
  if (!Array.isArray(activities) || activities.length === 0) return [];
  if (typeof activities[0] === 'object' && activities[0] !== null && 'activity' in (activities[0] as object)) {
    return (activities as MapPlannedActivity[]).map((activity: any) => {
      const { category_id, ...rest } = activity;
      if (category_id && !rest.category) rest.category = null;
      return rest as MapPlannedActivity;
    });
  }
  return (activities as string[]).map((activity) => ({
    activity: activity || '',
    category: null,
    individuals: null,
    families: null,
    planned_activity_cost: null,
  }));
}

export function normalizeExpenses(
  expenses: any[] | null | undefined,
  formCurrency = 'USD'
): MapExpense[] {
  if (!Array.isArray(expenses)) return [];
  return expenses.map((exp) => ({
    activity: exp?.activity || '',
    total_cost_usd: typeof exp?.total_cost_usd === 'number' ? exp.total_cost_usd : Number(exp?.total_cost_usd) || 0,
    total_cost_sdg:
      typeof exp?.total_cost_sdg === 'number'
        ? exp.total_cost_sdg
        : exp?.total_cost_sdg != null
          ? Number(exp.total_cost_sdg) || null
          : null,
    currency: exp?.currency || formCurrency || 'USD',
    category: exp?.category || null,
    planned_activity: exp?.planned_activity || null,
    planned_activity_other: exp?.planned_activity_other || null,
  }));
}

export function seedReviewFromOcr(
  data: MapExtractedData,
  defaults: { state?: string; locality?: string; form_currency?: string; exchange_rate?: number }
): MapExtractedData {
  const currency = data.form_currency || defaults.form_currency || 'USD';
  return {
    ...data,
    date: deriveDateForPicker(data.date) || null,
    // Prefer pre-upload room scope (locale-aware) over OCR for state/locality
    state: defaults.state || data.state || null,
    locality: defaults.locality || data.locality || null,
    form_currency: currency,
    exchange_rate: data.exchange_rate ?? defaults.exchange_rate ?? 2700,
    planned_activities: normalizePlannedActivities(
      Array.isArray(data.planned_activities) ? data.planned_activities : []
    ),
    expenses: normalizeExpenses(data.expenses, currency),
    language: data.language === 'ar' ? 'ar' : data.language === 'en' ? 'en' : data.language || 'en',
  };
}

const F1_OCR_COMPARE_KEYS = [
  'date',
  'state',
  'locality',
  'project_objectives',
  'intended_beneficiaries',
  'estimated_beneficiaries',
  'estimated_timeframe',
  'additional_support',
  'banking_details',
  'program_officer_name',
  'program_officer_phone',
  'reporting_officer_name',
  'reporting_officer_phone',
  'finance_officer_name',
  'finance_officer_phone',
  'planned_activities',
  'expenses',
] as const;

function normVal(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

export function countOcrEditedFields(initial: any, final: any): number {
  if (!initial || typeof initial !== 'object') return 0;
  let count = 0;
  for (const key of F1_OCR_COMPARE_KEYS) {
    if (normVal(initial[key]) !== normVal(final[key])) count += 1;
  }
  return count;
}
