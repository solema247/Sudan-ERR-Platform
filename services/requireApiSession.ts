import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from './auth';

export type ApiSessionUser = NonNullable<Awaited<ReturnType<typeof validateSession>>>;

/**
 * Require Bearer session on a Pages API route.
 * Returns the user, or null after writing 401.
 */
export async function requireApiSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ApiSessionUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', success: false, message: 'Unauthorized' });
    return null;
  }
  const user = await validateSession(authHeader.slice('Bearer '.length));
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', success: false, message: 'Unauthorized' });
    return null;
  }
  return user;
}
