// pages/api/validate-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { validateJWT } from '../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Extract the token from the cookie
    const token = req.cookies.token;

    // Validate the token
    const user = validateJWT(token);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Return success response with user data
    return res.status(200).json({ success: true, user });
}
