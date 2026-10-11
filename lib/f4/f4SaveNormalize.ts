/**
 * F4 save helpers (MAP parity): infer Arabic source language and normalize dates.
 */

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

export function textLooksArabic(value: unknown): boolean {
  if (value == null || typeof value !== 'string') return false;
  return ARABIC_RANGE.test(value);
}

export function inferF4SourceLanguage(
  summary: Record<string, unknown>,
  expenses: unknown[]
): 'ar' | 'en' {
  if (summary?.language === 'ar') return 'ar';

  const texts: string[] = [];
  for (const k of [
    'lessons',
    'training',
    'beneficiaries',
    'project_objectives',
    'excess_expenses',
    'surplus_use',
  ]) {
    const v = summary[k];
    if (typeof v === 'string') texts.push(v);
  }
  if (Array.isArray(expenses)) {
    for (const e of expenses) {
      if (!e || typeof e !== 'object') continue;
      const ex = e as Record<string, unknown>;
      for (const k of [
        'expense_activity',
        'expense_description',
        'seller',
        'payment_method',
        'receipt_no',
      ]) {
        const v = ex[k];
        if (typeof v === 'string') texts.push(v);
      }
    }
  }
  if (texts.some(textLooksArabic)) return 'ar';
  return 'en';
}

export function normalizePaymentDateForDb(
  raw: unknown,
  reportDateIso?: string | null
): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  let fallbackYear = new Date().getFullYear();
  if (reportDateIso && /^\d{4}-\d{2}-\d{2}$/.test(reportDateIso)) {
    fallbackYear = parseInt(reportDateIso.slice(0, 4), 10);
  }

  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!slash) return null;

  let day = parseInt(slash[1], 10);
  let month = parseInt(slash[2], 10);
  const year = slash[3]
    ? slash[3].length === 2
      ? 2000 + parseInt(slash[3], 10)
      : parseInt(slash[3], 10)
    : fallbackYear;

  if (day > 12 && month <= 12) {
    /* day first */
  } else if (month > 12 && day <= 12) {
    const t = day;
    day = month;
    month = t;
  } else {
    day = parseInt(slash[1], 10);
    month = parseInt(slash[2], 10);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (Number.isNaN(Date.parse(`${iso}T12:00:00Z`))) return null;
  return iso;
}

/** Mark F4 partial after upload; leave completed unchanged. */
export function statusAfterUpload(current: string | null | undefined): 'partial' | null {
  if (String(current ?? '').trim().toLowerCase() === 'completed') return null;
  return 'partial';
}
