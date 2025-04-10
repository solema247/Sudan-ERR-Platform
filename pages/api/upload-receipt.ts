import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import { promisify } from 'util';

// TODO: Double check that we are only talking about receipts here and that this is not the place for other supporting images.

const unlinkFile = promisify(fs.unlink);

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileUrl, expenseId, projectId } = req.body;

        // Insert receipt record
        const { data, error } = await newSupabase
            .from('receipts')
            .insert([{
                expense_id: expenseId,
                image_url: fileUrl,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error handling receipt upload:', error);
        res.status(500).json({ error: 'Failed to process receipt upload' });
    }
} 