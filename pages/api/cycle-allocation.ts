import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';

/**
 * Get latest decision cycle allocation for a given cycle and state.
 * Query params: cycle_id, state_name
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        const user = await validateSession(authHeader.replace('Bearer ', ''));
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).json({ success: false, message: 'Method not allowed' });
        }

        const { cycle_id, state_name } = req.query as { cycle_id?: string; state_name?: string };
        if (!cycle_id || !state_name) {
            return res.status(400).json({ success: false, message: 'cycle_id and state_name are required' });
        }

        const { data, error } = await newSupabase
            .from('cycle_state_allocations')
            .select('id, amount, decision_no')
            .eq('cycle_id', cycle_id)
            .eq('state_name', state_name)
            .order('decision_no', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch allocation', error: error.message });
        }

        if (!data) {
            return res.status(200).json({ success: true, allocation: null });
        }

        return res.status(200).json({ success: true, allocation: { id: data.id, amount: Number(data.amount) } });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Unexpected server error', error: error.message });
    }
}


