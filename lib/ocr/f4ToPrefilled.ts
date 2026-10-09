/**
 * Map MAP F4 Gemini output → Chatbot PrefilledForm shape.
 */

export type PrefilledFormData = {
  date: string;
  err_id: string;
  expenses: Array<{
    activity: string;
    description: string;
    payment_date: string;
    seller: string;
    payment_method: string;
    receipt_no: string;
    amount: string | number;
  }>;
  financial_summary: {
    total_expenses: number;
    total_grant_received: number;
    total_other_sources: number;
    remainder: number;
  };
  additional_questions: {
    excess_expenses: string;
    surplus_use: string;
    lessons_learned: string;
    training_needs: string;
  };
  raw_ocr?: string;
  language?: string;
};

function num(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function str(v: any): string {
  if (v == null) return '';
  return String(v).trim();
}

export function f4ToPrefilled(f4: any, fallbackErrId?: string): PrefilledFormData {
  const expensesSrc = Array.isArray(f4?.expenses) ? f4.expenses : [];

  const expenses = expensesSrc.map((e: any) => ({
    activity: str(e.activity || e.activity_name || e.النشاط),
    description: str(e.description || e.expense_description || e.وصف),
    payment_date: str(e.payment_date || e.date || e.تاريخ),
    seller: str(e.seller || e.recipient || e.vendor),
    payment_method: str(e.payment_method || e.method || ''),
    receipt_no: str(e.receipt_no || e.receipt_number || e.receipt),
    amount: num(e.amount_value ?? e.amount ?? e.قيمة),
  }));

  const totalExpenses =
    num(f4?.total_expenses_text ?? f4?.total_expenses ?? f4?.financial_summary?.total_expenses) ||
    expenses.reduce((s, e) => s + num(e.amount), 0);

  const totalGrant = num(
    f4?.total_grant_text ?? f4?.total_grant_received ?? f4?.financial_summary?.total_grant_received
  );
  const totalOther = num(
    f4?.total_other_sources_text ??
      f4?.total_other_sources ??
      f4?.financial_summary?.total_other_sources
  );
  const remainder = num(
    f4?.remainder_text ?? f4?.remainder ?? f4?.financial_summary?.remainder
  );

  return {
    date: str(f4?.date || f4?.report_date),
    err_id: str(f4?.err_id || f4?.err_number || fallbackErrId),
    expenses:
      expenses.length > 0
        ? expenses
        : [
            {
              activity: '',
              description: '',
              payment_date: '',
              seller: '',
              payment_method: '',
              receipt_no: '',
              amount: '',
            },
          ],
    financial_summary: {
      total_expenses: totalExpenses,
      total_grant_received: totalGrant,
      total_other_sources: totalOther,
      remainder:
        remainder ||
        (totalGrant + totalOther > 0 ? totalGrant + totalOther - totalExpenses : 0),
    },
    additional_questions: {
      excess_expenses: str(
        f4?.excess_expenses ?? f4?.additional_questions?.excess_expenses
      ),
      surplus_use: str(f4?.surplus_use ?? f4?.additional_questions?.surplus_use),
      lessons_learned: str(
        f4?.lessons ?? f4?.lessons_learned ?? f4?.additional_questions?.lessons_learned
      ),
      training_needs: str(
        f4?.training ?? f4?.training_needs ?? f4?.additional_questions?.training_needs
      ),
    },
    raw_ocr: f4?.raw_ocr,
    language: f4?.language,
  };
}
