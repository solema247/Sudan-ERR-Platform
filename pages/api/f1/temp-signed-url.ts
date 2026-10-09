/**
 * Signed URL for a Prod Storage F1 temp file (review preview fallback).
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

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({ success: false, message: 'Prod storage is not configured' });
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

  const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
  if (!key || !key.startsWith('f1-forms/_incoming/')) {
    return res.status(400).json({ success: false, message: 'Invalid temp file key' });
  }

  try {
    const prod = createProdSupabaseAdmin();
    const { data, error } = await prod.storage.from('images').createSignedUrl(key, 3600);
    if (error || !data?.signedUrl) {
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to create signed URL',
      });
    }
    return res.status(200).json({ success: true, signedUrl: data.signedUrl });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      message: e?.message || 'Failed to create signed URL',
    });
  }
}
