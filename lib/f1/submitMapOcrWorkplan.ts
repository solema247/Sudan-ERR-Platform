import type { MapExtractedData, MapExpense, MapPlannedActivity } from './mapReviewTypes';
import { countOcrEditedFields, normalizePlannedActivities } from './mapReviewNormalize';

async function translateText(text: string | null): Promise<string | null> {
  if (!text || text.trim() === '') return text;
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'ar', target: 'en' }),
    });
    if (!response.ok) return text;
    const result = await response.json();
    return result.translatedText || text;
  } catch {
    return text;
  }
}

async function translateFields(data: MapExtractedData, sourceLanguage: string) {
  if (sourceLanguage !== 'ar') {
    return {
      translatedData: data,
      originalText: {
        source_language: sourceLanguage,
        project_objectives: null,
        intended_beneficiaries: null,
        estimated_timeframe: null,
        additional_support: null,
        banking_details: null,
        program_officer_name: null,
        reporting_officer_name: null,
        finance_officer_name: null,
        planned_activities: [],
        expenses: [],
      },
    };
  }

  const activities = normalizePlannedActivities(data.planned_activities);
  const expenses = data.expenses || [];

  const translatedActivities: MapPlannedActivity[] = [];
  for (const a of activities) {
    translatedActivities.push({ ...a, activity: (await translateText(a.activity)) || a.activity });
  }

  const translatedExpenses: MapExpense[] = [];
  for (const e of expenses) {
    translatedExpenses.push({
      ...e,
      activity: (await translateText(e.activity)) || e.activity,
      planned_activity: e.planned_activity
        ? (await translateText(e.planned_activity)) || e.planned_activity
        : null,
      planned_activity_other: e.planned_activity_other
        ? (await translateText(e.planned_activity_other)) || e.planned_activity_other
        : null,
    });
  }

  const translatedData: MapExtractedData = {
    ...data,
    project_objectives: await translateText(data.project_objectives),
    intended_beneficiaries: await translateText(data.intended_beneficiaries),
    estimated_timeframe: await translateText(data.estimated_timeframe),
    additional_support: await translateText(data.additional_support),
    banking_details: await translateText(data.banking_details),
    program_officer_name: await translateText(data.program_officer_name),
    reporting_officer_name: await translateText(data.reporting_officer_name),
    finance_officer_name: await translateText(data.finance_officer_name),
    planned_activities: translatedActivities,
    expenses: translatedExpenses,
  };

  return {
    translatedData,
    originalText: {
      source_language: sourceLanguage,
      project_objectives: data.project_objectives,
      intended_beneficiaries: data.intended_beneficiaries,
      estimated_timeframe: data.estimated_timeframe,
      additional_support: data.additional_support,
      banking_details: data.banking_details,
      program_officer_name: data.program_officer_name,
      reporting_officer_name: data.reporting_officer_name,
      finance_officer_name: data.finance_officer_name,
      planned_activities: activities.map((a) => ({ activity: a.activity })),
      expenses: expenses.map((e) => ({
        activity: e.activity,
        planned_activity: e.planned_activity || null,
        planned_activity_other: e.planned_activity_other || null,
      })),
    },
  };
}

export type SubmitMapOcrOptions = {
  emergency_room_id: string;
  grant_segment?: string | null;
  organization_id: string;
  temp_file_key: string;
  /** Snapshot from OCR before user edits (for ocr_edited_fields_count) */
  initialExtracted: MapExtractedData;
  accessToken: string;
};

/** Submit MAP-shaped OCR review → err_projects via /api/f1/workplan (source=err_app). */
export async function submitMapOcrWorkplan(
  editedData: MapExtractedData,
  options: SubmitMapOcrOptions
): Promise<{ id: string }> {
  const {
    emergency_room_id,
    grant_segment,
    organization_id,
    temp_file_key,
    initialExtracted,
    accessToken,
  } = options;
  const sourceLanguage = editedData.language || 'en';
  const { translatedData, originalText } = await translateFields(editedData, sourceLanguage);

  const expensesForDB = (translatedData.expenses || []).map((e) => ({
    activity: e.activity,
    total_cost: e.total_cost_usd || 0,
    category: e.category || null,
    planned_activity: e.planned_activity || null,
    planned_activity_other: e.planned_activity_other || null,
  }));

  const plannedActivitiesForDB = normalizePlannedActivities(translatedData.planned_activities || []);
  const ocrEditedFieldsCount = countOcrEditedFields(initialExtracted, editedData);

  const payload = {
    mode: 'ocr' as const,
    emergency_room_id,
    organization_id,
    grant_segment: grant_segment ? String(grant_segment) : null,
    date: typeof translatedData.date === 'string' ? translatedData.date : null,
    locality: translatedData.locality ?? null,
    project_objectives: translatedData.project_objectives ?? null,
    intended_beneficiaries: translatedData.intended_beneficiaries ?? null,
    estimated_beneficiaries: translatedData.estimated_beneficiaries ?? null,
    estimated_timeframe: translatedData.estimated_timeframe ?? null,
    additional_support: translatedData.additional_support ?? null,
    banking_details: translatedData.banking_details ?? null,
    program_officer_name: translatedData.program_officer_name ?? null,
    program_officer_phone: translatedData.program_officer_phone ?? null,
    reporting_officer_name: translatedData.reporting_officer_name ?? null,
    reporting_officer_phone: translatedData.reporting_officer_phone ?? null,
    finance_officer_name: translatedData.finance_officer_name ?? null,
    finance_officer_phone: translatedData.finance_officer_phone ?? null,
    planned_activities: plannedActivitiesForDB,
    expenses: expensesForDB,
    original_text: originalText,
    language: sourceLanguage,
    temp_file_key,
    ocr_edited_fields_count: ocrEditedFieldsCount,
  };

  const res = await fetch('/api/f1/workplan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || body?.message || 'Failed to submit F1 workplan');
  }
  return { id: body.id };
}
