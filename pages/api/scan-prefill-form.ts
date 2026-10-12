import type { NextApiRequest, NextApiResponse } from 'next';

/** Legacy prefill echo — retired. */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'This endpoint has been retired',
    success: false,
  });
}
