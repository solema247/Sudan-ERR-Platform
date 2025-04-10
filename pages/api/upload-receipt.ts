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
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    try {
        const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        const file = files.file?.[0];
        const expenseId = fields.expenseId?.[0];
        const projectId = fields.projectId?.[0];

        if (!file || !expenseId || !projectId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const filename = `${Date.now()}_${file.originalFilename}`;
        const filePath = `receipts/${projectId}/${expenseId}/${filename}`;
        const fileBuffer = await fs.promises.readFile(file.filepath);

        // Upload to new Supabase storage
        const { data: uploadData, error: uploadError } = await newSupabase.storage
            .from('images')
            .upload(filePath, fileBuffer, {
                contentType: file.mimetype || 'application/octet-stream',
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = newSupabase.storage
            .from('images')
            .getPublicUrl(filePath);

        // Insert into receipts table
        const { error: receiptError } = await newSupabase
            .from('receipts')
            .insert([{
                expense_id: expenseId,
                image_url: publicUrl,
                created_at: new Date().toISOString(),
            }]);

        if (receiptError) throw receiptError;

        // Clean up temp file
        await unlinkFile(file.filepath);

        res.status(200).json({ 
            success: true, 
            filename,
            url: publicUrl
        });
    } catch (error) {
        console.error('Error handling receipt upload:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error uploading receipt' 
        });
    }
} 