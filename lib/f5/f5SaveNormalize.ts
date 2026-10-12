/**
 * F5 save helpers: infer source language, normalize dates, merge demographics into reach rows.
 */
import { normalizePaymentDateForDb, textLooksArabic } from '../f4/f4SaveNormalize';

export { statusAfterUpload } from '../f4/f4SaveNormalize';

const SUMMARY_TEXT_KEYS = [
  'positive_changes',
  'negative_results',
  'unexpected_results',
  'lessons_learned',
  'suggestions',
  'reporting_person',
] as const;

const REACH_TEXT_KEYS = ['activity_name', 'activity_goal', 'location', 'category'] as const;

export function inferF5SourceLanguage(
  summary: Record<string, unknown>,
  reach: unknown[]
): 'ar' | 'en' {
  if (summary?.language === 'ar') return 'ar';
  if (summary?.language === 'en') return 'en';

  const texts: string[] = [];
  for (const k of SUMMARY_TEXT_KEYS) {
    const v = summary[k];
    if (typeof v === 'string') texts.push(v);
  }
  if (Array.isArray(reach)) {
    for (const r of reach) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      for (const k of REACH_TEXT_KEYS) {
        const v = row[k];
        if (typeof v === 'string') texts.push(v);
      }
    }
  }
  return texts.some(textLooksArabic) ? 'ar' : 'en';
}

/** Snapshot of free-text summary fields as entered (no translation). */
export function buildSummaryOriginalText(
  summary: Record<string, unknown>,
  language: string
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SUMMARY_TEXT_KEYS) out[k] = summary[k] || null;
  out.language = language;
  return out;
}

export function buildReachOriginalText(
  row: Record<string, unknown>,
  language: string
): Record<string, unknown> {
  return {
    activity_name: row.activity_name || null,
    activity_goal: row.activity_goal || null,
    location: row.location || null,
    language,
  };
}

/**
 * Normalize user/model date strings to YYYY-MM-DD for DB columns.
 * Handles ISO, d/m/y (incl. truncated 3-digit years like "18/7/202"), and Date-parsable strings.
 */
export function cleanDate(dateStr: unknown): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  let cleaned = dateStr.trim();
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // Partial year (3 digits) → assume current decade
  const partial = cleaned.match(/^(\d{1,2})([\/\-])(\d{1,2})\2(\d{3})$/);
  if (partial) {
    const lastDigit = String(new Date().getFullYear()).slice(-1);
    const year = partial[4].startsWith('20') ? `${partial[4]}${lastDigit}` : `20${partial[4]}`;
    cleaned = `${partial[1]}/${partial[3]}/${year}`;
  }

  const slash = normalizePaymentDateForDb(cleaned, null);
  if (slash) return slash;

  try {
    const date = new Date(cleaned);
    if (!Number.isNaN(date.getTime())) return date.toISOString().split('T')[0];
  } catch {
    /* ignore */
  }
  return null;
}

export function normalizeActivityName(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
