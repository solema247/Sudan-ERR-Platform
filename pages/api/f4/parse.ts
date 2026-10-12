/**
 * MAP-parity F4 full-document OCR.
 * Reads temp file from Prod storage, runs Gemini processFForm, returns review drafts.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';
import {
  assertProdProjectAccess,
  isAllowedF4TempKey,
} from '../../../services/prodProjectAccess';
import { processFForm } from '../../../lib/ocr/ocrProcess';
import { mapOcrToF4Drafts } from '../../../lib/f4/mapOcrToDrafts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({ error: 'Prod Supabase not configured' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const accessToken = authHeader.replace('Bearer ', '');
  const user = await validateSession(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { project_id, file_key_temp } = req.body || {};
    if (!project_id || !file_key_temp) {
      return res.status(400).json({ error: 'project_id and file_key_temp required' });
    }

    if (!isAllowedF4TempKey(String(file_key_temp), String(project_id))) {
      return res.status(400).json({ error: 'Invalid file_key_temp path' });
    }

    const prod = createProdSupabaseAdmin();
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId: String(project_id),
      select: 'id, project_objectives, estimated_beneficiaries, err_id, emergency_room_id',
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }
    const project = access.project;

    const { data: signed, error: signedErr } = await prod.storage
      .from('images')
      .createSignedUrl(String(file_key_temp), 60);
    if (signedErr || !signed?.signedUrl) {
      return res.status(400).json({ error: 'Failed to sign temp file' });
    }

    const fileResp = await fetch(signed.signedUrl);
    if (!fileResp.ok) return res.status(400).json({ error: 'Failed to fetch temp file' });
    const blob = await fileResp.blob();
    const ab = await blob.arrayBuffer();
    const buffer = Buffer.from(ab);

    const lowerKey = String(file_key_temp).toLowerCase();
    let mime = fileResp.headers.get('content-type') || 'application/octet-stream';
    if (!mime || mime === 'application/octet-stream') {
      if (lowerKey.endsWith('.pdf')) mime = 'application/pdf';
      else if (lowerKey.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
        const ext = lowerKey.split('.').pop() as string;
        mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      }
    }
    let filename = 'f4-upload';
    if (mime.includes('pdf') || lowerKey.endsWith('.pdf')) filename += '.pdf';
    else if (mime.startsWith('image/')) filename += `.${mime.split('/')[1] || 'png'}`;

    const fileLike =
      typeof File !== 'undefined'
        ? new File([buffer], filename, { type: mime })
        : ({
            name: filename,
            type: mime,
            arrayBuffer: async () =>
              buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
          } as File);

    const ocrJson = await processFForm(fileLike, {
      form_type: 'F4',
      currency: 'SDG',
      exchange_rate: 1,
    });

    const { summaryDraft, expensesDraft } = mapOcrToF4Drafts(ocrJson, {
      project_objectives: project?.project_objectives,
      estimated_beneficiaries: project?.estimated_beneficiaries as number | null | undefined,
    });

    // Prefer project grant total when OCR missed line B — client may still override via FX UI
    return res.status(200).json({
      summaryDraft,
      expensesDraft,
      aiOutput: ocrJson,
      project: project || null,
    });
  } catch (e: any) {
    console.error('f4/parse', e);
    return res.status(500).json({ error: e?.message || 'Failed to parse' });
  }
}
