// pages/api/scan-prefill-form.ts

import { NextApiRequest, NextApiResponse } from 'next';
import i18n from '../../services/i18n'; // Import i18n for translations

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    const errorMessage = i18n.t('errors.method_not_allowed', { lng: req.headers['accept-language'] || 'en' });
    return res.status(405).json({ error: errorMessage });
  }

  try {
    const structuredData = req.body;

    // Validate the incoming data
    if (!structuredData) {
      const errorMessage = i18n.t('errors.no_data_received', { lng: req.headers['accept-language'] || 'en' });
      return res.status(400).json({ error: errorMessage });
    }

    // Log structured data for debugging (optional, can remove in production)
    console.log('Structured data received:', structuredData);

    // Respond with the structured data
    return res.status(200).json(structuredData);
  } catch (error: any) {
    // Log and handle unexpected errors
    console.error('Unexpected error in scan-prefill-form:', error.message);

    const errorMessage = i18n.t('errors.internal_server_error', { lng: req.headers['accept-language'] || 'en' });
    return res.status(500).json({ error: errorMessage });
  }
}

