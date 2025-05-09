// pages/api/validate-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';

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

        // Get user data
        const { data: userData, error: userError } = await newSupabase
            .from('users')
            .select('role, status, display_name')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(401).json({ success: false, message: 'User data not found' });
        }

        // Check if user is active
        if (userData.status !== 'active') {
            return res.status(401).json({ success: false, message: 'Account not active' });
        }

        return res.status(200).json({ 
            success: true, 
            user: {
                id: user.id,
                email: user.email,
                role: userData.role,
                status: userData.status,
                display_name: userData.display_name
            }
        });
    } catch (error) {
        console.error('Session validation error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
