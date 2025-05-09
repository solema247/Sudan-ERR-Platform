// pages/api/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';

/**
 * Login
 * 
 * User logs on using an Err_Id.
 * 
 * TODO: Secure password storage by comparing against hash.
 * TODO: Any other forms of login.
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { email, password } = req.body;

        try {
            // Sign in with Supabase Auth
            const { data: authData, error: signInError } = await newSupabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials'
                });
            }

            if (!authData.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'No user data returned'
                });
            }

            // Fetch user's role and status
            const { data: userData, error: userError } = await newSupabase
                .from('users')
                .select('role, status, display_name')
                .eq('id', authData.user.id)
                .single();

            if (userError || !userData) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User data not found'
                });
            }

            // Check if user is approved
            if (userData.status !== 'active') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Account not active'
                });
            }

            // Return success with session
            return res.status(200).json({ 
                success: true,
                session: authData.session,
                user: {
                    id: authData.user.id,
                    email: authData.user.email,
                    role: userData.role,
                    status: userData.status,
                    display_name: userData.display_name
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Unexpected server error'
            });
        }
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
    });
}
