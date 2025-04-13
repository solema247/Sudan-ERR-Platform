import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../../services/newSupabaseClient';
import { validateJWT } from '../../../services/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const token = req.cookies.token;
        const user = validateJWT(token);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized - Please log in again' 
            });
        }

        const { report_id, files } = req.body;

        // Insert file metadata into err_program_files table
        const { error: filesError } = await newSupabase
            .from('err_program_files')
            .insert(
                files.map((file: any) => ({
                    report_id,
                    file_name: file.file_name,
                    file_url: file.file_url,
                    file_type: file.file_type,
                    file_size: file.file_size
                }))
            );

        if (filesError) throw filesError;

        res.status(200).json({ 
            success: true, 
            message: 'Files metadata saved successfully' 
        });

    } catch (error) {
        console.error('Error saving file metadata:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error saving file metadata' 
        });
    }
} 