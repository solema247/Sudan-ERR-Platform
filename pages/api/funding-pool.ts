import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';

/**
 * Funding Pool API
 * Aggregates Allocated, Committed, Pending, Remaining across ALL open cycles for the user's state.
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

        // Get user's state via relationships
        const { data: userStateData, error: userStateError } = await newSupabase
            .from('users')
            .select(`
                emergency_rooms!inner (
                    states!inner (
                        state_name
                    )
                )
            `)
            .eq('id', user.id)
            .single();

        if (userStateError || !userStateData) {
            return res.status(500).json({ success: false, message: 'Failed to fetch user state', error: userStateError?.message });
        }

        let userState: string | null = null;
        try {
            const emergencyRooms: any = userStateData.emergency_rooms;
            if (emergencyRooms && emergencyRooms.states) {
                userState = emergencyRooms.states.state_name;
            }
        } catch (e: any) {
            return res.status(500).json({ success: false, message: 'Error extracting user state', error: e.message });
        }

        if (!userState) {
            return res.status(200).json({ success: true, user_state: null, allocated: 0, committed: 0, pending: 0, remaining: 0 });
        }

        // Open cycles only
        const { data: cycles, error: cyclesError } = await newSupabase
            .from('funding_cycles')
            .select('id')
            .eq('status', 'open');

        if (cyclesError) {
            return res.status(500).json({ success: false, message: 'Failed to fetch funding cycles', error: cyclesError.message });
        }

        const cycleIds = (cycles || []).map(c => c.id);
        if (cycleIds.length === 0) {
            return res.status(200).json({ success: true, user_state: userState, allocated: 0, committed: 0, pending: 0, remaining: 0 });
        }

        // Latest allocation per cycle for user's state
        const { data: allocations, error: allocError } = await newSupabase
            .from('cycle_state_allocations')
            .select('id, cycle_id, amount, decision_no')
            .in('cycle_id', cycleIds)
            .eq('state_name', userState)
            .order('decision_no', { ascending: false });

        if (allocError) {
            return res.status(500).json({ success: false, message: 'Failed to fetch allocations', error: allocError.message });
        }

        const latestByCycle = (allocations || []).reduce((acc: Record<string, any>, a: any) => {
            const existing = acc[a.cycle_id];
            if (!existing || a.decision_no > existing.decision_no) acc[a.cycle_id] = a;
            return acc;
        }, {});

        const latestAllocations = Object.values(latestByCycle) as Array<{ id: string; amount: number }>;
        const allocated = latestAllocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const allocationIds = latestAllocations.map(a => a.id);

        let committed = 0;
        let pending = 0;
        if (allocationIds.length > 0) {
            const { data: projects, error: projectsError } = await newSupabase
                .from('err_projects')
                .select('cycle_state_allocation_id, status, funding_status, expenses')
                .in('cycle_state_allocation_id', allocationIds);

            if (projectsError) {
                return res.status(500).json({ success: false, message: 'Failed to fetch project totals', error: projectsError.message });
            }

            const sumExpenses = (expenses: any): number => {
                if (!expenses) return 0;
                try {
                    const arr = Array.isArray(expenses) ? expenses : typeof expenses === 'string' ? JSON.parse(expenses) : [];
                    if (!Array.isArray(arr)) return 0;
                    return arr.reduce((sum, e) => sum + Number(e?.total_cost || 0), 0);
                } catch {
                    return 0;
                }
            };

            projects?.forEach(p => {
                const amount = sumExpenses(p.expenses);
                if (p.status === 'approved' && p.funding_status === 'committed') committed += amount;
                else if (p.status === 'pending' && p.funding_status === 'allocated') pending += amount;
            });
        }

        const remaining = Number(allocated) - Number(committed) - Number(pending);

        return res.status(200).json({ success: true, user_state: userState, allocated, committed, pending, remaining });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Unexpected server error', error: error.message });
    }
}


