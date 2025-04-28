import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient'; // Change to new client
import { validateJWT } from '../../services/auth'; // Import JWT validation helper

/**
 * Project status
 * 
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Validate the user's session
    const token = req.cookies.token;
    const user = validateJWT(token);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            // Use new database and err_id (which is now text)
            const { data, error } = await newSupabase
                .from('err_projects')
                .select(
                    'id, state, locality, planned_activities, expenses, status, submitted_at'
                )
                .eq('err_id', user.err_id)
                .eq('is_draft', false); // Add condition to exclude drafts

            if (error) {
                console.error('Error fetching project applications:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching project applications',
                });
            }

            // Format projects with a human-readable title
            const formattedProjects = data.map((project) => ({
                id: project.id,
                title: `${project.state || 'Unknown State'} - ${
                    project.locality || 'Unknown Locality'
                }`,
                planned_activities: project.planned_activities,
                expenses: project.expenses,
                status: project.status,
                submitted_at: project.submitted_at,
            }));

            return res.status(200).json({ success: true, projects: formattedProjects });
        } catch (error) {
            console.error('Server error during project status retrieval:', error);
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message,
            });
        }
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
}
