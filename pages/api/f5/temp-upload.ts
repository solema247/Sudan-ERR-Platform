/**
 * Upload F5 source file to Prod Storage (images bucket).
 * Auth: staging session. Bytes: prod.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';
import {
  assertProdProjectAccess,
  isAllowedF5TempKey,
} from '../../../services/prodProjectAccess';

export const config = {
  api: { bodyParser: false },
};

function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ maxFileSize: 40 * 1024 * 1024, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function firstField(fields: formidable.Fields, key: string): string | undefined {
  const v = fields[key];
  if (Array.isArray(v)) return v[0];
  return v as string | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Prod Supabase not configured',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const accessToken = authHeader.replace('Bearer ', '');
  const user = await validateSession(accessToken);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const { fields, files } = await parseForm(req);
    const fileEntry = files.file;
    const uploaded = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!uploaded?.filepath) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let fileKeyTemp = firstField(fields, 'file_key_temp') || '';
    const projectId = firstField(fields, 'project_id') || '';
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

    const prod = createProdSupabaseAdmin();
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId,
    });
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    if (!fileKeyTemp) {
      const original = uploaded.originalFilename || 'document.pdf';
      const ext = original.includes('.') ? original.split('.').pop()!.toLowerCase() : 'pdf';
      fileKeyTemp = `f5-program-reports/${projectId}/tmp/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
    }

    if (!isAllowedF5TempKey(fileKeyTemp, projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid file_key_temp path' });
    }

    const buffer = fs.readFileSync(uploaded.filepath);
    const mime = uploaded.mimetype || 'application/octet-stream';
    const { error: uploadError } = await prod.storage.from('images').upload(fileKeyTemp, buffer, {
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
      console.error('f5/temp-upload', uploadError);
      return res.status(500).json({ success: false, message: uploadError.message });
    }

    const { data: signed } = await prod.storage
      .from('images')
      .createSignedUrl(fileKeyTemp, 60 * 60);

    return res.status(200).json({
      success: true,
      file_key_temp: fileKeyTemp,
      signed_url: signed?.signedUrl || null,
    });
  } catch (e: any) {
    console.error('f5/temp-upload', e);
    return res.status(500).json({ success: false, message: e?.message || 'Upload failed' });
  }
}
