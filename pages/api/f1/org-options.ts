/**
 * Active canvas orgs from Prod for F1 scoping (processors + coordinators like LCC).
 * Excludes demo shells.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');
  const user = await validateSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Prod Supabase not configured',
    });
  }

  try {
    const prod = createProdSupabaseAdmin();
    const { data, error } = await prod
      .from('organizations')
      .select('id, slug, name, org_type, is_default_owner')
      .eq('is_active', true)
      .in('org_type', ['processor', 'coordinator'])
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load organizations',
      });
    }

    const orgs = (data || []).slice().sort((a, b) => {
      // Default owner (LoHub) first, then coordinators (LCC), then others A–Z
      if (a.is_default_owner !== b.is_default_owner) {
        return a.is_default_owner ? -1 : 1;
      }
      if (a.org_type !== b.org_type) {
        if (a.org_type === 'coordinator') return -1;
        if (b.org_type === 'coordinator') return 1;
      }
      return String(a.name).localeCompare(String(b.name));
    });

    return res.status(200).json({ success: true, organizations: orgs });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      message: e?.message || 'Failed to load organizations',
    });
  }
}
