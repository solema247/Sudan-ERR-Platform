import type { NextApiRequest, NextApiResponse } from 'next';

/** Legacy custom scan path — retired (legacy DB offline). */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'This endpoint has been retired',
    success: false,
    message: 'This endpoint has been retired',
  });
}
