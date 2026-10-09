/**
 * Dropdown options for MAP-parity F1 OCR review (sectors + planned activities).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../services/auth';
import { createAuthenticatedClient } from '../../../services/createAuthenticatedClient';

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

  const db = createAuthenticatedClient(token);

  try {
    const [sectorsRes, activitiesRes] = await Promise.all([
      db.from('sectors').select('id, sector_name_en, sector_name_ar').order('sector_name_en'),
      db
        .from('planned_activities')
        .select('id, activity_name, activity_name_ar, language')
        .order('activity_name'),
    ]);

    if (sectorsRes.error) {
      return res.status(500).json({
        success: false,
        message: sectorsRes.error.message,
      });
    }
    if (activitiesRes.error) {
      return res.status(500).json({
        success: false,
        message: activitiesRes.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      sectors: sectorsRes.data || [],
      planned_activities: activitiesRes.data || [],
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      message: e?.message || 'Failed to load review options',
    });
  }
}
