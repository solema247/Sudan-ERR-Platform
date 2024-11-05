// pages/api/scan-prefill-form.ts

import { NextApiRequest, NextApiResponse } from 'next';

// Endpoint to handle the structured data and send it to the frontend
export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const structuredData = req.body;

    if (!structuredData) {
      return res.status(400).json({ error: 'No structured data received' });
    }

    // Directly send structured data response to the frontend
    return res.status(200).json(structuredData);
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
