import { NextApiRequest, NextApiResponse } from 'next';
import { newSupabase } from '../../services/newSupabaseClient';
import { validateSession } from '../../services/auth';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';

/**
 * List open funding cycles and the user's state allocation (latest decision) if available.
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

        // Create an authenticated client for database queries
        const authenticatedClient = createAuthenticatedClient(accessToken);

        // Fetch user's state via relationships (users -> emergency_rooms -> states)
        const { data: userStateData, error: userStateError } = await authenticatedClient
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

        // Get all open funding cycles
        const { data: cycles, error: cyclesError } = await authenticatedClient
            .from('funding_cycles')
            .select('id, cycle_number, year, name, status, start_date, end_date')
            .eq('status', 'open')
            .order('year', { ascending: false })
            .order('cycle_number', { ascending: false });

        if (cyclesError) {
            return res.status(500).json({ success: false, message: 'Failed to fetch funding cycles', error: cyclesError.message });
        }

        // If we know the user's state, fetch latest decision allocations per cycle for that state
        let allocationsByCycle: Record<string, { id: string; amount: number } | null> = {};
        if (userState && cycles && cycles.length > 0) {
            const cycleIds = cycles.map(c => c.id);
            const { data: allocations, error: allocError } = await authenticatedClient
                .from('cycle_state_allocations')
                .select('id, cycle_id, state_name, amount, decision_no')
                .in('cycle_id', cycleIds)
                .eq('state_name', userState);

            if (allocError) {
                return res.status(500).json({ success: false, message: 'Failed to fetch allocations', error: allocError.message });
            }

            // Pick latest decision per cycle
            const latestByCycle = (allocations || []).reduce((acc, a) => {
                const existing = acc[a.cycle_id];
                if (!existing || a.decision_no > existing.decision_no) {
                    acc[a.cycle_id] = a;
                }
                return acc;
            }, {} as Record<string, { id: string; cycle_id: string; amount: number; decision_no: number }>);

            allocationsByCycle = Object.fromEntries(
                Object.entries(latestByCycle).map(([cycleId, a]) => [cycleId, { id: a.id, amount: Number(a.amount) }])
            );
        }

        // Compute committed and pending sums for these allocations
        const allocationIds = Object.values(allocationsByCycle)
            .filter(Boolean)
            .map(a => (a as any).id);

        let totalsByAllocation: Record<string, { committed: number; pending: number }> = {};
        if (allocationIds.length > 0) {
            const { data: projects, error: projectsError } = await authenticatedClient
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
                const key = p.cycle_state_allocation_id as string;
                if (!totalsByAllocation[key]) totalsByAllocation[key] = { committed: 0, pending: 0 };
                const amount = sumExpenses(p.expenses);
                if (p.status === 'approved' && p.funding_status === 'committed') {
                    totalsByAllocation[key].committed += amount;
                } else if (p.status === 'pending' && p.funding_status === 'allocated') {
                    totalsByAllocation[key].pending += amount;
                }
            });
        }

        return res.status(200).json({
            success: true,
            user_state: userState,
            cycles: (cycles || []).map(c => ({
                id: c.id,
                cycle_number: c.cycle_number,
                year: c.year,
                name: c.name,
                start_date: c.start_date,
                end_date: c.end_date,
                state_amount: allocationsByCycle[c.id]?.amount ?? null,
                allocation_id: allocationsByCycle[c.id]?.id ?? null,
                committed_amount: allocationsByCycle[c.id]?.id ? (totalsByAllocation[allocationsByCycle[c.id]!.id]?.committed || 0) : 0,
                pending_amount: allocationsByCycle[c.id]?.id ? (totalsByAllocation[allocationsByCycle[c.id]!.id]?.pending || 0) : 0,
                remaining_amount: (() => {
                    const allocated = allocationsByCycle[c.id]?.amount ?? 0;
                    const allocId = allocationsByCycle[c.id]?.id as string | undefined;
                    const committed = allocId ? (totalsByAllocation[allocId]?.committed || 0) : 0;
                    const pending = allocId ? (totalsByAllocation[allocId]?.pending || 0) : 0;
                    return Number(allocated) - Number(committed) - Number(pending);
                })()
            }))
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Unexpected server error', error: error.message });
    }
}


