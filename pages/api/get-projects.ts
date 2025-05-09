// /pages/api/get-projects.ts
import { NextApiRequest, NextApiResponse } from "next";
import { newSupabase } from "../../services/newSupabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

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

        // Get the user's err_id from the users table
        const { data: userData, error: userError } = await newSupabase
            .from('users')
            .select('err_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user data:', userError);
            return res.status(500).json({ success: false, message: 'Failed to fetch user data' });
        }

        // Get active projects for the ERR
        const { data: projects, error: projectsError } = await newSupabase
            .from('err_projects')
            .select('id, project_objectives, state, locality')
            .eq('err_id', userData.err_id)
            .eq('status', 'active')
            .eq('is_draft', false)
            .order('last_modified', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
        }

        return res.status(200).json({ success: true, projects });
    } catch (error) {
        console.error('Unexpected error in get-projects:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
