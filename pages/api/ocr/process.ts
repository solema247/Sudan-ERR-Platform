/**
 * Gemini OCR process endpoint — mirrors MAP /api/fsystem/process for F4 financial reports.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { processFForm } from '../../../lib/ocr/ocrProcess';
import { f4ToPrefilled } from '../../../lib/ocr/f4ToPrefilled';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: 40 * 1024 * 1024,
    keepExtensions: true,
  });
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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      message: 'GEMINI_API_KEY not configured. Add it to .env.local and restart.',
    });
  }

  try {
    const { fields, files } = await parseForm(req);
    const fileEntry = files.file;
    const uploaded = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!uploaded?.filepath) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const formType = (firstField(fields, 'form_type') || 'F4').toUpperCase() as 'F1' | 'F4' | 'F5';
    const errId = firstField(fields, 'err_id') || '';
    const currency = firstField(fields, 'currency') || 'SDG';
    const exchangeRate = parseFloat(firstField(fields, 'exchange_rate') || '1') || 1;

    const buffer = fs.readFileSync(uploaded.filepath);
    const mime = uploaded.mimetype || 'application/octet-stream';
    const fileName = uploaded.originalFilename || 'document';

    // processFForm expects a File-like object (Node 18+ File, or a minimal shim)
    const fileLike =
      typeof File !== 'undefined'
        ? new File([buffer], fileName, { type: mime })
        : ({
            name: fileName,
            type: mime,
            arrayBuffer: async () =>
              buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
          } as File);

    const structured = await processFForm(fileLike, {
      form_type: formType,
      currency,
      exchange_rate: exchangeRate,
    });

    try {
      fs.unlinkSync(uploaded.filepath);
    } catch {
      /* ignore */
    }

    // F1: return MAP structured JSON as-is. F4: adapt to PrefilledForm.
    if (formType === 'F1') {
      return res.status(200).json({
        success: true,
        data: structured,
        raw: structured,
      });
    }

    const prefilled = f4ToPrefilled(structured, errId);
    return res.status(200).json({
      success: true,
      data: prefilled,
      raw: structured,
    });
  } catch (error: any) {
    console.error('OCR process error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'OCR processing failed',
    });
  }
}
