import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../../services/prodSupabaseAdmin';
import { assertProdProjectAccess } from '../../../../services/prodProjectAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  try {
    const { project_id, ext } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });

    const prod = createProdSupabaseAdmin();
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId: String(project_id),
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const safeExt =
      typeof ext === 'string' && ext.length <= 6
        ? ext.toLowerCase().replace(/[^a-z0-9]/g, '')
        : 'pdf';
    const file_key_temp = `f4-financial-reports/${project_id}/tmp/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExt}`;
    return res.status(200).json({ file_key_temp });
  } catch (e) {
    console.error('f4/upload/init', e);
    return res.status(500).json({ error: 'Failed to init upload' });
  }
}
