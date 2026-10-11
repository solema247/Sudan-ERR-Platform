/**
 * Map Gemini F4 OCR JSON → MAP-style summaryDraft + expensesDraft for review/save.
 */

function toAsciiDigits(s: any) {
  if (s == null) return s;
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return String(s).replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

function toNumLoose(s: any): number | null {
  if (s == null || s === '') return null;
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  const cleaned = toAsciiDigits(String(s)).replace(/[،,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function str(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export type F4SummaryDraft = {
  report_date: string | null;
  total_expenses: number | null;
  total_grant: number | null;
  total_other_sources: number | null;
  remainder: number | null;
  excess_expenses: string | null;
  surplus_use: string | null;
  lessons: string | null;
  training: string | null;
  beneficiaries: string | null;
  project_objectives: string | null;
  language: string | null;
  raw_ocr: string | null;
  receipt_check?: {
    confirmed: boolean;
    receipts: any[];
  };
};

export type F4ExpenseDraft = {
  expense_activity: string | null;
  expense_description: string | null;
  expense_amount: number | null;
  expense_amount_sdg: number | null;
  payment_date: string | null;
  payment_method: string | null;
  receipt_no: string | null;
  seller: string | null;
};

export function mapOcrToF4Drafts(
  ocrJson: any,
  projectMeta?: { project_objectives?: string | null; estimated_beneficiaries?: number | null }
): { summaryDraft: F4SummaryDraft; expensesDraft: F4ExpenseDraft[] } {
  const isArabic = ocrJson?.language === 'ar';
  const modelRows = Array.isArray(ocrJson?.expenses) ? ocrJson.expenses : [];

  const expensesDraft: F4ExpenseDraft[] = modelRows.map((e: any) => {
    let expense_amount_sdg: number | null = null;
    let expense_amount: number | null = null;
    const amount = toNumLoose(e.amount_value ?? e.amount ?? e.total_cost_sdg ?? e.total_cost);

    if (amount != null) {
      if (e.currency === 'USD') {
        expense_amount = amount;
      } else if (e.currency === 'SDG' || (e.currency == null && isArabic)) {
        expense_amount_sdg = amount;
      } else {
        expense_amount_sdg = amount;
      }
    }

    return {
      expense_activity: str(e.activity || e.expense_activity || e.activity_name),
      expense_description: str(e.description || e.expense_description),
      expense_amount,
      expense_amount_sdg,
      payment_date: str(e.payment_date || e.date),
      payment_method: str(e.payment_method || e.method),
      receipt_no: str(e.receipt_no || e.receipt_number || e.receipt),
      seller: str(e.seller || e.recipient || e.vendor),
    };
  });

  const sumSdg = expensesDraft.reduce((s, r) => s + (r.expense_amount_sdg || 0), 0);
  const totalExpenses =
    toNumLoose(ocrJson?.total_expenses_text ?? ocrJson?.total_expenses) ??
    (sumSdg > 0 ? sumSdg : null);
  const totalGrant = toNumLoose(ocrJson?.total_grant_text ?? ocrJson?.total_grant);
  const totalOther = toNumLoose(
    ocrJson?.total_other_sources_text ?? ocrJson?.total_other_sources
  );
  let remainder = toNumLoose(ocrJson?.remainder_text ?? ocrJson?.remainder);
  if (
    remainder == null &&
    totalExpenses != null &&
    totalGrant != null
  ) {
    remainder = totalExpenses - totalGrant + (totalOther || 0);
  }

  const summaryDraft: F4SummaryDraft = {
    report_date: str(ocrJson?.date || ocrJson?.report_date),
    total_expenses: totalExpenses,
    total_grant: totalGrant,
    total_other_sources: totalOther,
    remainder,
    excess_expenses: str(ocrJson?.excess_expenses),
    surplus_use: str(ocrJson?.surplus_use),
    lessons: str(ocrJson?.lessons || ocrJson?.lessons_learned),
    training: str(ocrJson?.training || ocrJson?.training_needs),
    beneficiaries:
      str(ocrJson?.beneficiaries) ||
      (projectMeta?.estimated_beneficiaries != null
        ? String(projectMeta.estimated_beneficiaries)
        : null),
    project_objectives:
      str(ocrJson?.project_objectives) || str(projectMeta?.project_objectives) || null,
    language: str(ocrJson?.language) || (isArabic ? 'ar' : 'en'),
    raw_ocr: str(ocrJson?.raw_ocr),
    receipt_check: { confirmed: false, receipts: [] },
  };

  return { summaryDraft, expensesDraft };
}
