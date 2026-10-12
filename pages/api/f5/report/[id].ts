/**
 * GET /api/f5/report/[id] — F5 program report + reach rows + files with signed URLs (Prod).
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
  const reportId = String(idRaw || '').trim();
  if (!reportId) return res.status(400).json({ error: 'Invalid id' });

  try {
    const prod = createProdSupabaseAdmin();
    const { data: report, error } = await prod
      .from('err_program_report')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error) {
      console.error('f5/report', error);
      return res.status(500).json({ error: 'Failed to load report' });
    }
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const projectId = (report as any).project_id ? String((report as any).project_id) : '';
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

    const [{ data: reach }, { data: fileRows }] = await Promise.all([
      prod.from('err_program_reach').select('*').eq('report_id', reportId),
      prod.from('err_program_files').select('*').eq('report_id', reportId),
    ]);

    const files: Array<Record<string, unknown> & { signed_url: string | null }> = [];
    for (const f of fileRows || []) {
      const key = (f as any)?.file_url;
      let signed_url: string | null = null;
      if (key && typeof key === 'string' && !/^https?:\/\//i.test(key)) {
        const { data: signed } = await prod.storage
          .from('images')
          .createSignedUrl(key, 60 * 30);
        signed_url = signed?.signedUrl || null;
      } else if (typeof key === 'string') {
        signed_url = key;
      }
      files.push({ ...(f as Record<string, unknown>), signed_url });
    }

    return res.status(200).json({
      success: true,
      report,
      reach: reach || [],
      files,
    });
  } catch (e: any) {
    console.error('f5/report', e);
    return res.status(500).json({ error: e?.message || 'Failed to load report' });
  }
}
