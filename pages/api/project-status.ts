//pages/api/project-status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { validateJWT } from '../../lib/auth'; // Import JWT validation helper

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Validate the user's session
    const token = req.cookies.token;
    const user = validateJWT(token);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            // Fetch project applications for the logged-in user's ERR ID
            const { data, error } = await supabase
                .from('err_projects')
                .select('id, state, locality, planned_activities, expenses, status, submitted_at')
                .eq('user_id', user.err_id);

            if (error) {
                return res.status(500).json({ success: false, message: 'Error fetching project applications' });
            }

            return res.status(200).json({ success: true, projects: data });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server error', error });
        }
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
}
