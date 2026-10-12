/**
 * GET /api/f4/report/[id] — F4 summary + expenses + signed attachment URLs (Prod).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../../services/prodSupabaseAdmin';
import { assertProdProjectAccess } from '../../../../services/prodProjectAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({ error: 'Prod Supabase not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const accessToken = authHeader.replace('Bearer ', '');
  const user = await validateSession(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const idRaw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const summaryId = Number(idRaw);
  if (!summaryId) return res.status(400).json({ error: 'Invalid id' });

  try {
    const prod = createProdSupabaseAdmin();
    const { data: summary, error } = await prod
      .from('err_summary')
      .select(
        'id, project_id, report_date, total_expenses, total_expenses_sdg, total_grant, remainder, created_at, review_status, beneficiaries, lessons, training'
      )
      .eq('id', summaryId)
      .maybeSingle();

    if (error) {
      console.error('f4/report', error);
      return res.status(500).json({ error: 'Failed to load report' });
    }
    if (!summary) return res.status(404).json({ error: 'Report not found' });

    const projectId = summary.project_id ? String(summary.project_id) : '';
    if (!projectId) return res.status(404).json({ error: 'Report not found' });
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId,
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const [{ data: expenses }, { data: attachments }] = await Promise.all([
      prod
        .from('err_expense')
        .select(
          'expense_id, expense_activity, expense_description, expense_amount_sdg, expense_amount, payment_date, payment_method, receipt_no, seller'
        )
        .eq('summary_id', summaryId)
        .order('expense_id', { ascending: true }),
      prod
        .from('err_summary_attachments')
        .select('id, file_key, file_type')
        .eq('summary_id', summaryId),
    ]);

    const files: { id: any; file_type: string | null; signed_url: string | null }[] = [];
    for (const att of attachments || []) {
      const key = att?.file_key;
      if (!key) {
        files.push({ id: att.id, file_type: att.file_type, signed_url: null });
        continue;
      }
      const { data: signed } = await prod.storage
        .from('images')
        .createSignedUrl(String(key), 60 * 30);
      files.push({
        id: att.id,
        file_type: att.file_type,
        signed_url: signed?.signedUrl || null,
      });
    }

    return res.status(200).json({
      success: true,
      summary,
      expenses: expenses || [],
      attachments: files,
    });
  } catch (e: any) {
    console.error('f4/report', e);
    return res.status(500).json({ error: e?.message || 'Failed to load report' });
  }
}
