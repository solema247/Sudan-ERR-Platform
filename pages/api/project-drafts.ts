import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateJWT } from '../../services/auth';

/**
 * Project Drafts API
 * 
 * Handles:
 * - GET: Fetch user's draft projects
 * - POST: Save/update draft project
 * - DELETE: Remove draft project
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const token = req.cookies.token;
        const user = validateJWT(token);

        if (!user) {
            console.error('Unauthorized: Invalid JWT');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const { data, error } = await newSupabase
                .from('err_projects')
                .select('*')
                .eq('created_by', user.err_id)
                .eq('is_draft', true)
                .order('last_modified', { ascending: false });

            if (error) {
                console.error('Error fetching drafts:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error fetching drafts',
                    error: error.message 
                });
            }

            return res.status(200).json({
                success: true,
                drafts: data
            });
        }

        if (req.method === 'POST') {
            const { id, ...formData } = req.body;
            
            const draftData = {
                ...formData,
                is_draft: true,
                created_by: user.err_id,
                last_modified: new Date().toISOString()
            };

            const { data, error } = id 
                ? await newSupabase
                    .from('err_projects')
                    .update(draftData)
                    .eq('id', id)
                    .eq('created_by', user.err_id)
                    .single()
                : await newSupabase
                    .from('err_projects')
                    .insert([draftData])
                    .single();

            if (error) {
                console.error('Error saving draft:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error saving draft',
                    error: error.message
                });
            }

            return res.status(200).json({
                success: true,
                draft: data
            });
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            
            const { error } = await newSupabase
                .from('err_projects')
                .delete()
                .eq('id', id)
                .eq('created_by', user.err_id)
                .eq('is_draft', true);

            if (error) {
                console.error('Error deleting draft:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error deleting draft',
                    error: error.message
                });
            }

            return res.status(200).json({ success: true });
        }

        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error) {
        console.error('Unexpected error in project-drafts API:', error);
        return res.status(500).json({
            success: false,
            message: 'Unexpected server error',
            error: error.message
        });
    }
} 