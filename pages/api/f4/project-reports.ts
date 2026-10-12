/**
 * List F4 summaries for a project from Prod.
 * GET /api/f4/project-reports?project_id=...
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';
import { assertProdProjectAccess } from '../../../services/prodProjectAccess';

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

  const projectId =
    typeof req.query.project_id === 'string' ? req.query.project_id.trim() : '';
  if (!projectId) {
    return res.status(400).json({ error: 'project_id is required' });
  }

  try {
    const prod = createProdSupabaseAdmin();
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId,
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const { data, error } = await prod
      .from('err_summary')
      .select(
        'id, project_id, report_date, total_expenses, total_expenses_sdg, total_grant, remainder, created_at, review_status'
      )
      .eq('project_id', projectId)
      .is('activities_raw_import_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('f4/project-reports', error);
      return res.status(500).json({ error: 'Failed to load reports' });
    }

    return res.status(200).json({ success: true, reports: data || [] });
  } catch (e: any) {
    console.error('f4/project-reports', e);
    return res.status(500).json({ error: e?.message || 'Failed to load reports' });
  }
}
