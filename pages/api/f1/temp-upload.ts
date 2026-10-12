/**
 * Upload F1 attachment to Prod Storage (images / f1-forms/_incoming/...).
 * Auth is validated against the app's login DB (staging); bytes go to prod.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ files: formidable.Files }> {
  const form = formidable({
    maxFileSize: 40 * 1024 * 1024,
    keepExtensions: true,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) reject(err);
      else resolve({ files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!isProdSupabaseConfigured()) {
    console.error(
      'f1/temp-upload: reporting DB not configured (prod service role or staging SUPABASE_SERVICE_KEY)'
    );
    return res.status(500).json({
      success: false,
      message:
        'Reporting storage is not configured. Set prod service role vars or NEXT_PUBLIC_NEW_SUPABASE_URL + SUPABASE_SERVICE_KEY, then restart.',
    });
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

  try {
    const { files } = await parseForm(req);
    const fileEntry = files.file;
    const uploaded = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!uploaded?.filepath) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const original = uploaded.originalFilename || 'document';
    const ext = original.includes('.') ? original.split('.').pop() : 'bin';
    const tempKey = `f1-forms/_incoming/${randomUUID()}.${ext}`;
    const buffer = fs.readFileSync(uploaded.filepath);
    const mime = uploaded.mimetype || 'application/octet-stream';

    const prod = createProdSupabaseAdmin();
    const { error: uploadError } = await prod.storage
      .from('images')
      .upload(tempKey, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: mime,
      });

    try {
      fs.unlinkSync(uploaded.filepath);
    } catch {
      /* ignore */
    }

    if (uploadError) {
      return res.status(500).json({
        success: false,
        message: uploadError.message || 'Prod storage upload failed',
      });
    }

    return res.status(200).json({
      success: true,
      temp_file_key: tempKey,
      bucket: 'images',
      target: 'prod',
    });
  } catch (e: any) {
    console.error('f1/temp-upload:', e);
    return res.status(500).json({
      success: false,
      message: e?.message || 'Upload failed',
    });
  }
}
