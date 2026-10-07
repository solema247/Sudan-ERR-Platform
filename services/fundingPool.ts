// Funding pool per state across all open cycles: allocated (latest decision per cycle and state),
// committed, pending and remaining. Used by the funding screen and the dashboard so they always agree.
import { AccessScope } from './accessScope';
import { getAllocationTotals } from './fundingTotals';

export interface StatePool {
    state: string;
    allocated: number;
    committed: number;
    pending: number;
    remaining: number;
    is_own_state: boolean;
}

export async function getFundingByState(db: any, scope: AccessScope): Promise<StatePool[]> {
    if (!scope.all && scope.states.length === 0) return [];

    const { data: cycles, error: cyclesError } = await db.from('funding_cycles').select('id').eq('status', 'open');
    if (cyclesError) throw new Error(`Failed to fetch funding cycles: ${cyclesError.message}`);
    const cycleIds = (cycles || []).map((c: any) => c.id);
    if (cycleIds.length === 0) return [];

    let allocQuery = db
        .from('cycle_state_allocations')
        .select('id, cycle_id, state_name, amount, decision_no')
        .in('cycle_id', cycleIds);
    if (!scope.all) allocQuery = allocQuery.in('state_name', scope.states);
    const { data: allocations, error: allocError } = await allocQuery;
    if (allocError) throw new Error(`Failed to fetch allocations: ${allocError.message}`);

    // Latest decision per cycle and state
    const latest: Record<string, any> = {};
    (allocations || []).forEach((a: any) => {
        const key = `${a.cycle_id}|${a.state_name}`;
        if (!latest[key] || a.decision_no > latest[key].decision_no) latest[key] = a;
    });
    const latestAllocations = Object.values(latest);

    const totals = await getAllocationTotals(db, latestAllocations.map((a: any) => a.id));

    const byState: Record<string, StatePool> = {};
    latestAllocations.forEach((a: any) => {
        const s = (byState[a.state_name] ||= {
            state: a.state_name, allocated: 0, committed: 0, pending: 0, remaining: 0, is_own_state: a.state_name === scope.ownState,
        });
        s.allocated += Number(a.amount || 0);
        s.committed += totals[a.id]?.committed || 0;
        s.pending += totals[a.id]?.pending || 0;
    });
    return Object.values(byState)
        .map(s => ({ ...s, remaining: s.allocated - s.committed - s.pending }))
        .sort((a, b) => (Number(b.is_own_state) - Number(a.is_own_state)) || a.state.localeCompare(b.state));
}
