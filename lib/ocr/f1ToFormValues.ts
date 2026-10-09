/**
 * Map MAP Gemini F1 structured JSON into NewProjectForm initial values.
 * Keep it simple — user can fix dropdowns on review.
 */

export type F1OcrStructured = {
  date?: string | null;
  state?: string | null;
  locality?: string | null;
  project_objectives?: string | null;
  intended_beneficiaries?: string | null;
  estimated_beneficiaries?: number | null;
  estimated_timeframe?: string | null;
  additional_support?: string | null;
  banking_details?: string | null;
  program_officer_name?: string | null;
  program_officer_phone?: string | null;
  reporting_officer_name?: string | null;
  reporting_officer_phone?: string | null;
  finance_officer_name?: string | null;
  finance_officer_phone?: string | null;
  planned_activities?: string[];
  expenses?: Array<{
    activity?: string;
    total_cost_usd?: number;
    total_cost_sdg?: number | null;
    currency?: string;
  }>;
  form_currency?: string;
  exchange_rate?: number;
};

export type F1FormSeed = {
  date: string;
  state: string;
  locality: string;
  currency: string;
  project_objectives: string;
  intended_beneficiaries: string;
  estimated_beneficiaries: string | number;
  estimated_timeframe: string;
  additional_support: string;
  banking_details: string;
  /** Formik field names used by NewProjectForm */
  programOfficerName: string;
  programOfficerPhone: string;
  reportingOfficerName: string;
  reportingOfficerPhone: string;
  financeOfficerName: string;
  financeOfficerPhone: string;
  program_officer_name: string;
  program_officer_phone: string;
  reporting_officer_name: string;
  reporting_officer_phone: string;
  finance_officer_name: string;
  finance_officer_phone: string;
  planned_activities: Array<{
    selectedActivity: string;
    quantity: string;
    duration: string;
    location: string;
    expenses: Array<{
      expense: string;
      description: string;
      frequency: string;
      unitPrice: string;
      total: number | string;
    }>;
  }>;
  emergency_room_id?: string;
  grant_segment?: string;
};

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export function f1ToFormValues(
  structured: F1OcrStructured,
  scope?: { emergency_room_id?: string; grant_segment?: string; state?: string; locality?: string }
): F1FormSeed {
  const currency =
    structured.form_currency === 'SDG' || structured.form_currency === 'USD'
      ? structured.form_currency
      : 'SDG';

  const activityNames = Array.isArray(structured.planned_activities)
    ? structured.planned_activities.filter(Boolean).map(String)
    : [];
  const ocrExpenses = Array.isArray(structured.expenses) ? structured.expenses : [];

  // One Formik activity per OCR activity name; attach matching expenses by activity label.
  // If no activity names, put all expenses under a single untitled activity.
  const names = activityNames.length > 0 ? activityNames : [''] ;

  const planned_activities = names.map((name) => {
    const matched = ocrExpenses.filter((e) => {
      if (!name) return true;
      if (!e?.activity) return false;
      return String(e.activity).toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(String(e.activity).toLowerCase());
    });
    const expensesSource =
      matched.length > 0 ? matched : name === '' || names.length === 1 ? ocrExpenses : [];

    return {
      selectedActivity: '',
      quantity: '',
      duration: '',
      location: '',
      expenses: expensesSource.map((e) => {
        const total =
          currency === 'SDG'
            ? e.total_cost_sdg ?? e.total_cost_usd ?? ''
            : e.total_cost_usd ?? e.total_cost_sdg ?? '';
        return {
          expense: '',
          description: str(e.activity || name),
          frequency: '1',
          unitPrice: total === '' ? '' : String(total),
          total: total === '' ? '' : Number(total),
        };
      }),
    };
  });

  // If we had named activities but expenses didn't match any, dump leftovers on first activity
  if (activityNames.length > 0 && ocrExpenses.length > 0) {
    const used = new Set(
      planned_activities.flatMap((a) => a.expenses.map((e) => e.description))
    );
    const leftovers = ocrExpenses.filter((e) => e?.activity && !used.has(String(e.activity)));
    if (leftovers.length && planned_activities[0]) {
      for (const e of leftovers) {
        const total =
          currency === 'SDG'
            ? e.total_cost_sdg ?? e.total_cost_usd ?? ''
            : e.total_cost_usd ?? e.total_cost_sdg ?? '';
        planned_activities[0].expenses.push({
          expense: '',
          description: str(e.activity),
          frequency: '1',
          unitPrice: total === '' ? '' : String(total),
          total: total === '' ? '' : Number(total),
        });
      }
    }
  }

  return {
    date: str(structured.date),
    state: scope?.state || str(structured.state),
    locality: scope?.locality || str(structured.locality),
    currency,
    project_objectives: str(structured.project_objectives),
    intended_beneficiaries: str(structured.intended_beneficiaries),
    estimated_beneficiaries: structured.estimated_beneficiaries ?? '',
    estimated_timeframe: str(structured.estimated_timeframe),
    additional_support: str(structured.additional_support),
    banking_details: str(structured.banking_details),
    programOfficerName: str(structured.program_officer_name),
    programOfficerPhone: str(structured.program_officer_phone),
    reportingOfficerName: str(structured.reporting_officer_name),
    reportingOfficerPhone: str(structured.reporting_officer_phone),
    financeOfficerName: str(structured.finance_officer_name),
    financeOfficerPhone: str(structured.finance_officer_phone),
    program_officer_name: str(structured.program_officer_name),
    program_officer_phone: str(structured.program_officer_phone),
    reporting_officer_name: str(structured.reporting_officer_name),
    reporting_officer_phone: str(structured.reporting_officer_phone),
    finance_officer_name: str(structured.finance_officer_name),
    finance_officer_phone: str(structured.finance_officer_phone),
    planned_activities,
    emergency_room_id: scope?.emergency_room_id,
    grant_segment: scope?.grant_segment,
  };
}
