//pages/api/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid'; // For unique session IDs

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { err_id, pin } = req.body;

        // Check user credentials in Supabase
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('err_id', err_id)
            .single();

        if (error || !data || data.pin_hash !== pin) {  // Replace with hashed PIN check in production
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate a session ID
        const sessionId = uuidv4();

        // Set the session cookie (HTTP-only, Secure in production)
        res.setHeader('Set-Cookie', `session_id=${sessionId}; HttpOnly; Path=/; Max-Age=3600`);

        // Return success response
        return res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method not allowed' });
    }
}
