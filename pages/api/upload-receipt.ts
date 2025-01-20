import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabaseClient';
import { ImageCategory } from '../../services/uploadImageAndInsertRecord';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import { promisify } from 'util';

const unlinkFile = promisify(fs.unlink);

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Method not allowed' 
        });
    }

    const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    try {
        // Parse the form using Promise with proper typing
        const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        const file = files.file?.[0];
        const expenseId = fields.expenseId?.[0];
        const projectId = fields.projectId?.[0];
        const reportId = fields.reportId?.[0];

        if (!file || !expenseId || !projectId || !reportId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid file type. Only JPEG and PNG are allowed.' 
            });
        }

        const filename = `${crypto.randomUUID()}.${file.originalFilename?.split('.').pop()}`;
        const filePath = `receipts/${projectId}/${expenseId}/${filename}`;

        const fileBuffer = await fs.promises.readFile(file.filepath);

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, fileBuffer, {
                contentType: file.mimetype || 'application/octet-stream',
                cacheControl: '3600'
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Clean up the temp file
        await unlinkFile(file.filepath).catch(console.error);

        // Create record in images table
        const { data: imageRecord, error: imageError } = await supabase
            .from('images')
            .insert([{
                filename,
                path: filePath,
                category: ImageCategory.REPORT_EXPENSES,
                project_id: projectId,
                notes: `Receipt for expense ${expenseId}`,
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (imageError) {
            throw new Error(`Failed to create image record: ${imageError.message}`);
        }

        // Create record in expense_receipts table
        const { error: receiptError } = await supabase
            .from('expense_receipts')
            .insert([{
                expense_id: expenseId,
                image_id: imageRecord.id,
                report_id: reportId,
                created_at: new Date().toISOString(),
            }]);

        if (receiptError) {
            throw new Error(`Failed to create receipt record: ${receiptError.message}`);
        }

        res.status(200).json({ 
            success: true, 
            filename,
            message: 'Receipt uploaded successfully' 
        });
    } catch (error) {
        console.error('Error handling receipt upload:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error uploading receipt' 
        });
    }
} 