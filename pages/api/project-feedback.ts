import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';

interface FeedbackUser {
    display_name: string;
}

interface FeedbackData {
    id: string;
    feedback_text: string;
    feedback_status: string;
    created_at: string;
    iteration_number: number;
    users: FeedbackUser;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        const accessToken = authHeader.replace('Bearer ', '');
        
        // Validate session and get user data
        const user = await validateSession(accessToken);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Create an authenticated client for database queries
        const authenticatedClient = createAuthenticatedClient(accessToken);

        if (req.method === 'GET') {
            const { project_id } = req.query;

            if (!project_id) {
                return res.status(400).json({ success: false, message: 'Project ID is required' });
            }

            // Get feedback for the project
            const { data: feedbackRaw, error } = await authenticatedClient
                .from('project_feedback')
                .select(`
                    id,
                    feedback_text,
                    feedback_status,
                    created_at,
                    iteration_number,
                    users!created_by (
                        display_name
                    )
                `)
                .eq('project_id', project_id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching feedback:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to fetch feedback',
                    error: error.message 
                });
            }

            // Type assertion after validating the structure
            const feedback = (feedbackRaw || []) as unknown as Array<{
                id: string;
                feedback_text: string;
                feedback_status: string;
                created_at: string;
                iteration_number: number;
                users: { display_name: string } | null;
            }>;

            return res.status(200).json({
                success: true,
                feedback: feedback.map(f => ({
                    id: f.id,
                    feedback_text: f.feedback_text,
                    feedback_status: f.feedback_status,
                    created_at: f.created_at,
                    iteration_number: f.iteration_number,
                    created_by: {
                        full_name: f.users?.display_name || 'Unknown'
                    }
                }))
            });
        }

        if (req.method === 'POST') {
            const { project_id } = req.query;
            const { feedback_text } = req.body;

            if (!project_id || !feedback_text) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Project ID and feedback text are required' 
                });
            }

            // Get the latest iteration number for this project
            const { data: latestFeedback, error: countError } = await authenticatedClient
                .from('project_feedback')
                .select('iteration_number')
                .eq('project_id', project_id)
                .order('iteration_number', { ascending: false })
                .limit(1)
                .single();

            const nextIteration = latestFeedback ? latestFeedback.iteration_number + 1 : 1;

            // Insert new feedback
            const { data, error } = await authenticatedClient
                .from('project_feedback')
                .insert([{
                    project_id,
                    feedback_text,
                    feedback_status: 'pending_changes',
                    created_by: user.id,
                    iteration_number: nextIteration
                }])
                .select()
                .single();

            if (error) {
                console.error('Error saving feedback:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save feedback',
                    error: error.message
                });
            }

            // Update project status
            const { error: projectError } = await authenticatedClient
                .from('err_projects')
                .update({ 
                    status: 'feedback',
                    current_feedback_id: data.id
                })
                .eq('id', project_id);

            if (projectError) {
                console.error('Error updating project status:', projectError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update project status',
                    error: projectError.message
                });
            }

            return res.status(200).json({
                success: true,
                feedback: {
                    ...data,
                    created_by: {
                        full_name: user.display_name
                    }
                }
            });
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
} 