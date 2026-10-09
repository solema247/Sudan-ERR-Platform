/** MAP post-OCR review shape (ExtractedDataReview / ManualEntry). */

export type MapExpense = {
  activity: string;
  total_cost_usd: number;
  total_cost_sdg: number | null;
  currency: string;
  category: string | null;
  planned_activity: string | null;
  planned_activity_other: string | null;
};

export type MapPlannedActivity = {
  activity: string;
  category: string | null;
  individuals: number | null;
  families: number | null;
  planned_activity_cost: number | null;
};

export type MapExtractedData = {
  date: string | null;
  state: string | null;
  locality: string | null;
  project_objectives: string | null;
  intended_beneficiaries: string | null;
  estimated_beneficiaries: number | null;
  estimated_timeframe: string | null;
  additional_support: string | null;
  banking_details: string | null;
  program_officer_name: string | null;
  program_officer_phone: string | null;
  reporting_officer_name: string | null;
  reporting_officer_phone: string | null;
  finance_officer_name: string | null;
  finance_officer_phone: string | null;
  planned_activities: MapPlannedActivity[] | string[];
  expenses: MapExpense[];
  language: 'ar' | 'en' | null;
  form_currency?: string;
  exchange_rate?: number;
  raw_ocr?: string;
};

export type F1OcrReviewPayload = {
  extracted: MapExtractedData;
  emergency_room_id: string;
  grant_segment: string;
  organization_id: string;
  organization_label: string;
  state_name: string;
  locality: string;
  room_label: string;
  temp_file_key: string;
  form_currency: string;
  exchange_rate: number;
  /** Local file kept for review preview (object URL); not serialized */
  file?: File | null;
  file_name?: string;
  file_type?: string;
};
