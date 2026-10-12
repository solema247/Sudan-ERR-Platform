/**
 * MAP-parity F4 save into Prod:
 * err_summary + err_expense + err_summary_attachments + err_projects.f4_status.
 * Auth: staging session. Writes: prod service role.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';
import {
  assertProdProjectAccess,
  isAllowedF4TempKey,
} from '../../../services/prodProjectAccess';
import {
  inferF4SourceLanguage,
  normalizePaymentDateForDb,
  statusAfterUpload,
} from '../../../lib/f4/f4SaveNormalize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({ error: 'Reporting database not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const accessToken = authHeader.replace('Bearer ', '');
  const user = await validateSession(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { project_id, summary, expenses, file_key_temp, uploaded_by } = req.body || {};
    if (!project_id || !summary) {
      return res.status(400).json({ error: 'project_id and summary required' });
    }

    if (file_key_temp && !isAllowedF4TempKey(String(file_key_temp), String(project_id))) {
      return res.status(400).json({ error: 'Invalid file_key_temp path' });
    }

    const prod = createProdSupabaseAdmin();
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId: String(project_id),
      select:
        'id, err_id, emergency_room_id, state, grant_serial_id, f4_status, organization_id, emergency_rooms ( err_code )',
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }
    const prj = access.project;

    const err_id = (prj as any).err_id || null;
    const state_name = (prj as any).state || null;
    const grant_serial_id = (prj as any).grant_serial_id || null;
    const err_code = (prj as any).emergency_rooms?.err_code || null;
    const organization_id = (prj as any).organization_id || null;

    const sourceLanguage = inferF4SourceLanguage(
      summary,
      Array.isArray(expenses) ? expenses : []
    );

    // Preserve original_text snapshot (translation optional — store source as-is for now)
    const original_text = {
      lessons: summary.lessons || null,
      training: summary.training || null,
      excess_expenses: summary.excess_expenses || null,
      surplus_use: summary.surplus_use || null,
      beneficiaries: summary.beneficiaries || null,
      language: sourceLanguage,
    };

    const insertSummary: Record<string, unknown> = {
      project_id,
      err_id,
      report_date: summary.report_date || null,
      total_grant: summary.total_grant ?? null,
      total_expenses: summary.total_expenses ?? null,
      total_expenses_sdg: summary.total_expenses_sdg ?? summary.total_expenses ?? null,
      remainder: summary.remainder ?? null,
      beneficiaries: summary.beneficiaries || null,
      lessons: summary.lessons || null,
      training: summary.training || null,
      project_objectives: summary.project_objectives || null,
      excess_expenses: summary.excess_expenses || null,
      surplus_use: summary.surplus_use || null,
      total_other_sources: summary.total_other_sources ?? null,
      receipt_check: summary.receipt_check ?? null,
      original_text,
      language: sourceLanguage,
    };
    if (organization_id) insertSummary.organization_id = organization_id;

    const { data: inserted, error: insErr } = await prod
      .from('err_summary')
      .insert(insertSummary)
      .select('id')
      .single();
    if (insErr) throw insErr;
    const summary_id = inserted.id;

    let expense_ids: number[] = [];
    if (Array.isArray(expenses) && expenses.length) {
      const reportDateStr =
        summary.report_date != null ? String(summary.report_date).slice(0, 10) : null;
      const payload = expenses.map((e: any) => ({
        project_id,
        summary_id,
        expense_activity: e.expense_activity || null,
        expense_description: e.expense_description || null,
        expense_amount: e.expense_amount ?? null,
        expense_amount_sdg: e.expense_amount_sdg ?? null,
        payment_date: normalizePaymentDateForDb(e.payment_date, reportDateStr),
        payment_method: e.payment_method || null,
        receipt_no: e.receipt_no || null,
        seller: e.seller || null,
        uploaded_by: uploaded_by || user.id || null,
        language: sourceLanguage,
      }));
      const { data: expRows, error: expErr } = await prod
        .from('err_expense')
        .insert(payload)
        .select('expense_id');
      if (expErr) {
        await prod.from('err_summary').delete().eq('id', summary_id);
        throw expErr;
      }
      expense_ids = (expRows || []).map((r: any) => r.expense_id);
    }

    if (file_key_temp) {
      try {
        const tempKey = String(file_key_temp);
        const ext = (tempKey.split('.').pop() || 'pdf').toLowerCase();
        const safe = (s: string | null | undefined) =>
          (s || 'UNKNOWN')
            .toString()
            .trim()
            .replace(/[^\p{L}\p{N}\-_. ]+/gu, '-')
            .replace(/\s+/g, '-');
        const finalPath = `f4-financial-reports/${safe(state_name)}/${safe(
          err_code || err_id
        )}/${safe(grant_serial_id)}/${summary_id}/summary.${ext}`;

        const { data: sign, error: signErr } = await prod.storage
          .from('images')
          .createSignedUrl(tempKey, 60);
        if (signErr || !sign?.signedUrl) throw new Error('Failed to sign temp file');
        const resp = await fetch(sign.signedUrl);
        if (!resp.ok) throw new Error('Failed to read temp file');
        const blob = await resp.blob();
        const { error: upErr } = await prod.storage
          .from('images')
          .upload(finalPath, blob, { upsert: true });
        if (upErr) throw upErr;
        try {
          await prod.storage.from('images').remove([tempKey]);
        } catch {
          /* ignore */
        }
        await prod.from('err_summary_attachments').insert({
          summary_id,
          file_key: finalPath,
          file_type: 'summary_pdf',
          uploaded_by: uploaded_by || user.id || null,
        });
      } catch (e) {
        console.warn('F4 file finalize failed, continuing without attachment', e);
      }
    }

    const prevF4 = (prj as any).f4_status as string | null;
    const nextStatus = statusAfterUpload(prevF4);
    if (nextStatus) {
      const { error: stErr } = await prod
        .from('err_projects')
        .update({ f4_status: nextStatus })
        .eq('id', project_id);
      if (stErr) console.warn('F4 save: failed to update f4_status', stErr);
    }

    return res.status(200).json({ summary_id, expense_ids, source: 'prod' });
  } catch (e: any) {
    console.error('F4 save error', e);
    return res.status(500).json({ error: e?.message || 'Failed to save F4' });
  }
}
