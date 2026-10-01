// Which rooms and states a signed-in user may see in the app's lists.
// The database access rules enforce the same thing; this keeps the app correct on any database.
//
//   superadmin                        every room, every state
//   admin / support                   rooms in their visible states (all if can_see_all_states)
//   state_err                         rooms in their own room's state
//   base_err                          their own room only

export interface AccessScope {
    all: boolean;              // true: no room filter
    roomIds: string[];         // rooms the user may see (when all is false)
    states: string[];          // state names the user may see (empty + all=true means every state)
    ownRoomId: string | null;
    ownState: string | null;
}

export async function getAccessScope(db: any, userId: string): Promise<AccessScope> {
    const { data: me, error } = await db
        .from('users')
        .select('role, err_id, visible_states, can_see_all_states')
        .eq('id', userId)
        .single();
    if (error || !me) throw new Error(error?.message || 'User not found');

    const ownRoomId: string | null = me.err_id ? String(me.err_id) : null;
    let ownState: string | null = null;
    if (ownRoomId) {
        const { data: room } = await db
            .from('emergency_rooms')
            .select('states ( state_name )')
            .eq('id', ownRoomId)
            .maybeSingle();
        ownState = (room as any)?.states?.state_name || null;
    }

    const role: string = me.role;
    const seesAll = role === 'superadmin' || ((role === 'admin' || role === 'support') && me.can_see_all_states === true);
    if (seesAll) return { all: true, roomIds: [], states: [], ownRoomId, ownState };

    let states: string[] = [];
    if (role === 'state_err') states = ownState ? [ownState] : [];
    else if (role === 'admin' || role === 'support') states = (me.visible_states || []).filter(Boolean);

    const roomIds = new Set<string>(ownRoomId ? [ownRoomId] : []);
    if (states.length > 0) {
        const { data: stateRows } = await db.from('states').select('id').in('state_name', states);
        const stateIds = (stateRows || []).map((s: any) => s.id);
        if (stateIds.length > 0) {
            const { data: rooms } = await db.from('emergency_rooms').select('id').in('state_reference', stateIds);
            (rooms || []).forEach((r: any) => roomIds.add(String(r.id)));
        }
    }
    if (role === 'base_err' && ownState) states = [ownState];
    return { all: false, roomIds: Array.from(roomIds), states, ownRoomId, ownState };
}

/** Room names for a list of room ids, so screens can say which room a project belongs to. */
export async function getRoomNames(db: any, roomIds: string[]): Promise<Record<string, { name: string | null; name_ar: string | null; err_code: string | null; state: string | null }>> {
    const ids = Array.from(new Set(roomIds.filter(id => /^[0-9a-f-]{36}$/i.test(id))));
    if (ids.length === 0) return {};
    const { data } = await db
        .from('emergency_rooms')
        .select('id, name, name_ar, err_code, states ( state_name )')
        .in('id', ids);
    const out: Record<string, any> = {};
    (data || []).forEach((r: any) => {
        out[String(r.id)] = { name: r.name, name_ar: r.name_ar, err_code: r.err_code, state: r.states?.state_name || null };
    });
    return out;
}
