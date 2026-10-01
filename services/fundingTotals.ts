// Committed / pending totals for funding allocations.
// Uses the database function funding_pool_totals, so every role sees the same state-wide totals.
// If that function isn't in the database yet, falls back to adding up the projects this user can see.

export type AllocationTotals = Record<string, { committed: number; pending: number }>;

/** Project statuses that count as committed when funding_status is 'committed'. */
export const COMMITTED_STATUSES = ['approved', 'active', 'completed'];

const sumExpenses = (expenses: any): number => {
    if (!expenses) return 0;
    try {
        const arr = Array.isArray(expenses) ? expenses : typeof expenses === 'string' ? JSON.parse(expenses) : [];
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((sum, e) => sum + (Number(e?.total_cost) || 0), 0);
    } catch {
        return 0;
    }
};

export async function getAllocationTotals(db: any, allocationIds: string[]): Promise<AllocationTotals> {
    const totals: AllocationTotals = {};
    if (allocationIds.length === 0) return totals;

    const { data, error } = await db.rpc('funding_pool_totals', { p_allocation_ids: allocationIds });
    if (!error && Array.isArray(data)) {
        for (const row of data) {
            totals[row.allocation_id] = { committed: Number(row.committed) || 0, pending: Number(row.pending) || 0 };
        }
        return totals;
    }
    console.warn('funding_pool_totals not available, totals cover visible projects only:', error?.message);

    const { data: projects, error: projectsError } = await db
        .from('err_projects')
        .select('cycle_state_allocation_id, status, funding_status, expenses')
        .in('cycle_state_allocation_id', allocationIds);
    if (projectsError) throw new Error(projectsError.message);

    for (const p of projects || []) {
        const key = p.cycle_state_allocation_id as string;
        if (!totals[key]) totals[key] = { committed: 0, pending: 0 };
        const amount = sumExpenses(p.expenses);
        if (p.funding_status === 'committed' && COMMITTED_STATUSES.includes(p.status)) totals[key].committed += amount;
        else if (p.funding_status === 'allocated' && p.status === 'pending') totals[key].pending += amount;
    }
    return totals;
}
