import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';

/**
 * Project status
 * 
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Get the session from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        // Get session
        const { data: { user }, error: sessionError } = await newSupabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (sessionError || !user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // First get the user's err_id from the users table
        const { data: userData, error: userError } = await newSupabase
            .from('users')
            .select('err_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user data:', userError);
            return res.status(500).json({ success: false, message: 'Failed to fetch user data' });
        }

        // Get user's projects using err_id
        const { data: projects, error: projectsError } = await newSupabase
            .from('err_projects')
            .select('*')
            .eq('err_id', userData.err_id)
            .order('last_modified', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
        }

        return res.status(200).json({
            success: true,
            projects: projects.map(project => ({
                id: project.id,
                title: project.project_objectives,
                status: project.status,
                submitted_at: project.submitted_at || project.last_modified
            }))
        });
    } catch (error) {
        console.error('Project status error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
