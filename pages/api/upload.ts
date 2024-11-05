// pages/api/upload.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, fileContent } = req.body;

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: 'File name and content are required' });
  }

  try {
    const { data, error } = await supabase.storage
      .from('expense-reports/scanned-report-files')
      .upload(fileName, Buffer.from(fileContent, 'base64'), { contentType: 'application/octet-stream' });

    if (error) {
      throw error;
    }

    const { publicUrl } = supabase.storage
      .from('expense-reports/scanned-report-files')
      .getPublicUrl(data.path);

    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}
