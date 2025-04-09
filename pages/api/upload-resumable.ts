import { NextApiRequest, NextApiResponse } from 'next';
import { Server, Upload } from '@tus/server'
import { FileStore } from '@tus/file-store'
import { supabase } from '../../services/supabaseClient';
import { ImageCategory } from '../../services/uploadImages';

/**
 * We need to tell Next.js not to parse the body, or else it will interfere with tus.
 */

export const config = {
    api: {
        bodyParser: false,
    }
}

const tusServer = new Server({
    path: '/api/upload-resumable',
    datastore: new FileStore({directory: './files'})
})

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    return tusServer.handle(req, res)
}

