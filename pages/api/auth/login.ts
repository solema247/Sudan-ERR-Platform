// pages/api/login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { generateToken } from '../../../lib/auth'; // Import token generation function

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { err_id, pin } = req.body;

        // Step 1: Verify user credentials in Supabase
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('err_id', err_id)
            .single();

        if (error || !data || data.pin_hash !== pin) { // Replace with hashed PIN check in production
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Step 2: Generate a JWT using the helper function
        const token = generateToken({ err_id });

        // Step 3: Set the JWT as an HTTP-only cookie
        res.setHeader(
            'Set-Cookie',
            `token=${token}; HttpOnly; Path=/; Max-Age=3600; Secure; SameSite=Strict`
        );

        // Step 4: Return a success response
        return res.status(200).json({ success: true });
    } else {
        // Step 5: Handle unsupported HTTP methods
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method not allowed' });
    }
}
