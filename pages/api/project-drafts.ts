import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';

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

        if (req.method === 'GET') {
            const { data, error } = await newSupabase
                .from('err_projects')
                .select('*')
                .eq('created_by', user.err_id)
                .eq('is_draft', true)
                .order('last_modified', { ascending: false });

            if (error) {
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
            
            // Only include fields that have values
            const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    acc[key] = value;
                }
                return acc;
            }, {});

            try {
                // First check if this is a project with feedback
                if (id) {
                    const { data: existingProject, error: checkError } = await newSupabase
                        .from('err_projects')
                        .select('status, version, current_feedback_id')
                        .eq('id', id)
                        .single();

                    if (checkError) throw checkError;

                    // If this is a project with feedback, update it directly
                    if (existingProject?.status === 'feedback') {
                        const draftData = {
                            ...cleanedData,
                            is_draft: true,
                            status: 'draft',
                            created_by: user.err_id,
                            last_modified: new Date().toISOString(),
                            version: existingProject.version,
                            current_feedback_id: existingProject.current_feedback_id
                        };

                        const { data, error } = await newSupabase
                            .from('err_projects')
                            .update(draftData)
                            .eq('id', id)
                            .eq('created_by', user.err_id)
                            .select()
                            .single();
                            
                        if (error) throw error;
                        return res.status(200).json({
                            success: true,
                            draft: data
                        });
                    }
                }

                // Regular draft handling
                const draftData = {
                    ...cleanedData,
                    is_draft: true,
                    status: 'draft',
                    created_by: user.err_id,
                    last_modified: new Date().toISOString()
                };

                let result;
                if (id) {
                    const { data, error } = await newSupabase
                        .from('err_projects')
                        .update(draftData)
                        .eq('id', id)
                        .eq('created_by', user.err_id)
                        .select()
                        .single();
                        
                    if (error) throw error;
                    result = data;
                } else {
                    // Create new draft
                    const { data, error } = await newSupabase
                        .from('err_projects')
                        .insert([draftData])
                        .select()
                        .single();
                        
                    if (error) throw error;
                    result = data;
                }

                return res.status(200).json({
                    success: true,
                    draft: result
                });
            } catch (error) {
                console.error('Error saving draft:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error saving draft',
                    error: error.message
                });
            }
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
        return res.status(500).json({
            success: false,
            message: 'Unexpected server error',
            error: error.message
        });
    }
} 