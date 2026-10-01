import { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../services/auth';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { getAccessScope } from '../../services/accessScope';
import { getFundingByState, StatePool } from '../../services/fundingPool';

/**
 * Funding Pool API
 * Allocated, Committed, Pending and Remaining across ALL open cycles, one entry per state the user may see:
 * their own state (base / state ERR), their visible states (admin / support), or every state (superadmin).
 * The top-level fields keep the user's own state's figures.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        const accessToken = authHeader.replace('Bearer ', '');
        const user = await validateSession(accessToken);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            return res.status(405).json({ success: false, message: 'Method not allowed' });
        }

        const db = createAuthenticatedClient(accessToken);

        let scope;
        try {
            scope = await getAccessScope(db, user.id);
        } catch (e: any) {
            return res.status(500).json({ success: false, message: 'Failed to fetch user state', error: e.message });
        }
        const userState = scope.ownState;
        const empty = { success: true, user_state: userState, allocated: 0, committed: 0, pending: 0, remaining: 0, states: [] as StatePool[] };

        let states: StatePool[];
        try {
            states = await getFundingByState(db, scope);
        } catch (e: any) {
            return res.status(500).json({ success: false, message: 'Failed to fetch funding pool', error: e.message });
        }
        if (states.length === 0) return res.status(200).json(empty);

        const own = states.find(s => s.is_own_state);
        return res.status(200).json({
            success: true,
            user_state: userState,
            allocated: own?.allocated || 0,
            committed: own?.committed || 0,
            pending: own?.pending || 0,
            remaining: own?.remaining || 0,
            states,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Unexpected server error', error: error.message });
    }
}
