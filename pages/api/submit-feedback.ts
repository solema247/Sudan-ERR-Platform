import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { validateJWT } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { taskUsabilityRating, mainChallenges, recommendation } = req.body;
        const token = req.cookies.token;
        const user = validateJWT(token);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { err_id } = user;

        const { error } = await supabase
            .from('app_feedback')
            .insert([
                {
                    room_id: err_id,
                    task_usability_rating: taskUsabilityRating,
                    main_challenges: mainChallenges,
                    recommendation: recommendation,
                },
            ]);

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to submit feedback' });
        }

        return res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method not allowed' });
    }
} 