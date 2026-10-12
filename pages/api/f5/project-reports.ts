/**
 * List F5 program reports for a project from Prod.
 * GET /api/f5/project-reports?project_id=...
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
    return res.status(500).json({ error: 'Reporting database not configured' });
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
      .from('err_program_report')
      .select('id, project_id, report_date, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('f5/project-reports', error);
      return res.status(500).json({ error: 'Failed to load reports' });
    }

    const rows = data || [];
    const counts: Record<string, number> = {};
    if (rows.length > 0) {
      const { data: reach, error: reachErr } = await prod
        .from('err_program_reach')
        .select('report_id')
        .in(
          'report_id',
          rows.map((r: any) => r.id)
        );
      if (reachErr) {
        console.error('f5/project-reports reach', reachErr);
        return res.status(500).json({ error: 'Failed to load reports' });
      }
      for (const r of reach || []) {
        const key = String((r as { report_id: unknown }).report_id);
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    return res.status(200).json({
      success: true,
      reports: rows.map((r: any) => ({
        id: r.id,
        project_id: r.project_id,
        report_date: r.report_date ?? null,
        created_at: r.created_at ?? null,
        activities_count: counts[String(r.id)] || 0,
      })),
    });
  } catch (e: any) {
    console.error('f5/project-reports', e);
    return res.status(500).json({ error: e?.message || 'Failed to load reports' });
  }
}
