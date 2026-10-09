/**
 * MAP-parity F1 workplan insert into Prod err_projects.
 * Auth: staging session. Write + room lookup: Prod (service role).
 * Only difference from MAP portal row: source = err_app.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { validateSession } from '../../../services/auth';
import { normalizeF1DateForDb } from '../../../lib/f1/mapReviewNormalize';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';

function emptyToNull(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({
      error:
        'Prod Supabase not configured (NEXT_PUBLIC_PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_ROLE_KEY)',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');
  const user = await validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const v = req.body || {};

  if (v.mode !== 'ocr' && v.mode !== 'manual') {
    return res.status(400).json({ error: 'mode must be ocr or manual' });
  }

  const emergencyRoomId = emptyToNull(v.emergency_room_id);
  if (!emergencyRoomId) {
    return res.status(400).json({ error: 'emergency_room_id is required' });
  }

  const organizationId = emptyToNull(v.organization_id);
  if (!organizationId) {
    return res.status(400).json({ error: 'organization_id is required' });
  }

  // Base ERR locked to own room (id from login/staging profile)
  if (user.err_id && !['admin', 'support', 'superadmin'].includes(user.role || '')) {
    if (emergencyRoomId !== user.err_id) {
      return res.status(403).json({ error: 'Emergency room is outside your scope' });
    }
  }

  if (v.mode === 'ocr') {
    const key = emptyToNull(v.temp_file_key);
    if (!key) {
      return res.status(400).json({ error: 'temp_file_key is required for OCR uploads' });
    }
  }

  if (!Array.isArray(v.expenses)) {
    return res.status(400).json({ error: 'expenses must be an array' });
  }

  try {
    const db = createProdSupabaseAdmin();

    const { data: org, error: orgErr } = await db
      .from('organizations')
      .select('id, name, org_type, is_active')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgErr || !org) {
      return res.status(400).json({ error: 'Organization not found in Prod' });
    }
    if (!org.is_active) {
      return res.status(400).json({ error: 'Organization is not active' });
    }
    if (org.org_type !== 'processor' && org.org_type !== 'coordinator') {
      return res.status(400).json({ error: 'Organization type cannot own F1 submissions' });
    }

    const { data: room, error: roomErr } = await db
      .from('emergency_rooms')
      .select(
        `
        id,
        err_code,
        status,
        state:states!emergency_rooms_state_reference_fkey(state_name)
      `
      )
      .eq('id', emergencyRoomId)
      .maybeSingle();

    if (roomErr || !room) {
      return res.status(400).json({
        error:
          'Emergency room not found in Prod. Room IDs must match between login DB and Prod.',
      });
    }
    if (room.status !== 'active') {
      return res.status(400).json({ error: 'Emergency room is not active' });
    }

    const st = room.state as { state_name?: string } | { state_name?: string }[] | null | undefined;
    const stateName = Array.isArray(st) ? st[0]?.state_name ?? null : st?.state_name ?? null;

    const grantSegment =
      v.grant_segment === undefined || v.grant_segment === null
        ? null
        : String(v.grant_segment).trim() || null;

    const dbDate = normalizeF1DateForDb(emptyToNull(v.date) ?? undefined);
    const localityClean = emptyToNull(v.locality);

    const expenses = (v.expenses as any[]).map((e) => ({
      activity: String(e.activity || ''),
      total_cost: Number(e.total_cost) || 0,
      category: e.category ?? null,
      planned_activity: e.planned_activity ?? null,
      planned_activity_other: e.planned_activity_other ?? null,
    }));

    const plannedActivities = Array.isArray(v.planned_activities) ? v.planned_activities : [];

    const row = {
      id: randomUUID(),
      date: dbDate,
      state: stateName,
      locality: localityClean,
      project_objectives: emptyToNull(v.project_objectives),
      intended_beneficiaries: emptyToNull(v.intended_beneficiaries),
      estimated_beneficiaries:
        v.estimated_beneficiaries === null || v.estimated_beneficiaries === undefined
          ? null
          : Number(v.estimated_beneficiaries),
      estimated_timeframe: emptyToNull(v.estimated_timeframe),
      additional_support: emptyToNull(v.additional_support),
      banking_details: emptyToNull(v.banking_details),
      program_officer_name: emptyToNull(v.program_officer_name),
      program_officer_phone: emptyToNull(v.program_officer_phone),
      reporting_officer_name: emptyToNull(v.reporting_officer_name),
      reporting_officer_phone: emptyToNull(v.reporting_officer_phone),
      finance_officer_name: emptyToNull(v.finance_officer_name),
      finance_officer_phone: emptyToNull(v.finance_officer_phone),
      planned_activities: plannedActivities,
      expenses,
      emergency_room_id: emergencyRoomId,
      organization_id: organizationId,
      err_id: emptyToNull(room.err_code),
      status: 'pending',
      source: 'err_app',
      project_name: localityClean,
      temp_file_key: emptyToNull(v.temp_file_key),
      original_text: v.original_text ?? null,
      language: emptyToNull(v.language) || 'en',
      grant_segment: grantSegment,
      ocr_edited_fields_count:
        v.mode === 'ocr'
          ? v.ocr_edited_fields_count == null
            ? null
            : Number(v.ocr_edited_fields_count)
          : null,
    };

    const { data: inserted, error: insertError } = await db
      .from('err_projects')
      .insert([row])
      .select('id, emergency_room_id, status, funding_status, date, locality, state, source')
      .single();

    if (insertError) {
      console.error('f1/workplan prod insert:', insertError);
      const msg = insertError.message?.includes('grant_segment')
        ? 'Invalid grant segment'
        : insertError.message || 'Insert failed';
      const status =
        insertError.code === '23503' || insertError.code === '23514' ? 400 : 500;
      return res.status(status).json({ error: msg });
    }

    return res.status(200).json({ success: true, id: inserted?.id, target: 'prod' });
  } catch (e: any) {
    console.error('POST /api/f1/workplan:', e);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
