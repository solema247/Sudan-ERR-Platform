import { NextApiRequest, NextApiResponse } from 'next';
import { Server } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { requireApiSession } from '../../services/requireApiSession';

/**
 * We need to tell Next.js not to parse the body, or else it will interfere with tus.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

const tusServer = new Server({
  path: '/api/upload-resumable',
  datastore: new FileStore({ directory: './files' }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow CORS preflight without a session; all other methods require auth.
  if (req.method !== 'OPTIONS') {
    const user = await requireApiSession(req, res);
    if (!user) return;
  }
  return tusServer.handle(req, res);
}
