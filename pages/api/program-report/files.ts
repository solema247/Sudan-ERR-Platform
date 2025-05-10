import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../../services/newSupabaseClient';
import { validateSession } from '../../../services/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        // Validate session and get user data
        const user = await validateSession(authHeader.replace('Bearer ', ''));
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { report_id, files } = req.body;

        if (!report_id || !files) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Insert file metadata into the database with correct table name
        const { error: filesError } = await newSupabase
            .from('err_program_files')
            .insert(
                files.map(file => ({
                    report_id,
                    file_name: file.file_name,
                    file_url: file.file_url,
                    file_type: file.file_type,
                    file_size: file.file_size,
                    uploaded_by: user.id
                }))
            );

        if (filesError) {
            console.error('Error saving file metadata:', filesError);
            return res.status(500).json({
                success: false,
                message: `Database error: ${filesError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Files metadata saved successfully'
        });

    } catch (error) {
        console.error('Error handling file metadata:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error saving file metadata'
        });
    }
} 