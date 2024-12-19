import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import i18n from '../../../lib/i18n'; // Import i18n directly


/**
 * Upload
 * 
 * TODO: Is this actually used?
 */

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET_NAME_IMAGES;
const FOLDER_PATH = 'forms/scanned'


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Determine user language and fallback to English
  const lang = req.headers['accept-language']?.split(',')[0] || 'en';

  // Change the language dynamically
  await i18n.changeLanguage(lang);

  const t = (key: string, options?: any) => i18n.t(key, options); // Translation helper function

  if (req.method !== 'POST') {
    return res.status(405).json({ error: t('errors.method_not_allowed') });
  }

  const { fileName, fileContent } = req.body;

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: t('errors.file_required') });
  }

  try {
    // Upload the file to Supabase
    const { data, error } = await supabase.storage
      .from(`${BUCKET_NAME}/${FOLDER_PATH}`)
      .upload(fileName, Buffer.from(fileContent, 'base64'), {
        contentType: 'application/octet-stream',
      });

    if (error) {
      throw error;
    }

    // TODO: Use signed keys.
    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(`${BUCKET_NAME}/${FOLDER_PATH}`)
      .getPublicUrl(data.path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to generate the public URL for the uploaded file.');
    }

    const publicUrl = publicUrlData.publicUrl;

    res.status(200).json({ url: publicUrl, message: t('form_success') });
  } catch (error) {
    console.error(t('errors.upload_failed'), error);
    res.status(500).json({ error: t('errors.upload_failed') });
  }
}
