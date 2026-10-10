// /pages/api/get-projects.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { getAccessScope, getRoomNames } from '../../services/accessScope';
import { validateSession } from '../../services/auth';

function splitPipe(v: unknown): string[] {
  if (typeof v !== 'string' || !v.trim()) return [];
  return v
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await validateSession(token);
    const db = createAuthenticatedClient(token);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      includeDrafts,
      q,
      room_id,
      id: projectId,
      status = 'active',
      state: stateRaw,
      locality: localityRaw,
      f4_status: f4StatusRaw,
      f5_status: f5StatusRaw,
      date_from: dateFrom,
      date_to: dateTo,
      transfer_from: transferFrom,
      transfer_to: transferTo,
      limit: limitRaw,
      offset: offsetRaw,
      include_filter_options: includeFilterOptions,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(String(limitRaw || '100'), 10) || 100, 1), 200);
    const offset = Math.max(parseInt(String(offsetRaw || '0'), 10) || 0, 0);
    const search = typeof q === 'string' ? q.trim() : '';
    const roomId = typeof room_id === 'string' && room_id ? room_id : null;
    const idFilter = typeof projectId === 'string' && projectId ? projectId : null;
    const statusFilter = typeof status === 'string' && status ? status : 'active';
    const states = splitPipe(stateRaw);
    const localities = splitPipe(localityRaw);
    const statuses = splitPipe(statusFilter);
    const f4Status =
      typeof f4StatusRaw === 'string' && f4StatusRaw.trim() ? f4StatusRaw.trim() : '';
    const f5Status =
      typeof f5StatusRaw === 'string' && f5StatusRaw.trim() ? f5StatusRaw.trim() : '';
    const wantOptions = String(includeFilterOptions || '') === '1';

    const scope = await getAccessScope(db, user.id);
    if (!scope.all && scope.roomIds.length === 0) {
      return res.status(200).json({
        success: true,
        projects: [],
        total: 0,
        roomOptions: [],
        filterOptions: { states: [], localities: [] },
      });
    }

    let query = db
      .from('err_projects')
      .select(
        'id, project_objectives, project_name, state, locality, err_id, status, date, submitted_at, date_transfer, f4_status, f5_status',
        { count: 'exact' }
      );

    if (idFilter) {
      query = query.eq('id', idFilter);
    }
    if (!includeDrafts) {
      query = query.eq('is_draft', false);
    }
    if (!idFilter) {
      if (statuses.length === 1 && statuses[0] !== 'all') {
        query = query.eq('status', statuses[0]);
      } else if (statuses.length > 1) {
        query = query.in('status', statuses);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
    }
    if (!scope.all) {
      query = query.in('err_id', scope.roomIds);
    }
    if (roomId) {
      query = query.eq('err_id', roomId);
    }
    if (states.length === 1) {
      query = query.eq('state', states[0]);
    } else if (states.length > 1) {
      query = query.in('state', states);
    }
    if (localities.length === 1) {
      query = query.eq('locality', localities[0]);
    } else if (localities.length > 1) {
      query = query.in('locality', localities);
    }
    if (f4Status) {
      query = query.eq('f4_status', f4Status);
    }
    if (f5Status) {
      query = query.eq('f5_status', f5Status);
    }
    if (typeof dateFrom === 'string' && dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (typeof dateTo === 'string' && dateTo) {
      query = query.lte('date', dateTo);
    }
    if (typeof transferFrom === 'string' && transferFrom) {
      query = query.gte('date_transfer', transferFrom);
    }
    if (typeof transferTo === 'string' && transferTo) {
      query = query.lte('date_transfer', transferTo);
    }
    if (search) {
      const escaped = search.replace(/%/g, '\\%').replace(/,/g, '');
      query = query.or(
        `project_objectives.ilike.%${escaped}%,locality.ilike.%${escaped}%,state.ilike.%${escaped}%,project_name.ilike.%${escaped}%`
      );
    }

    query = query
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Error fetching projects:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
    }

    const rooms = await getRoomNames(
      db,
      (projects || []).map((p: any) => String(p.err_id || ''))
    );
    const withRooms = (projects || []).map((p: any) => ({
      ...p,
      is_own_room: String(p.err_id) === scope.ownRoomId,
      room: rooms[String(p.err_id)] || null,
    }));

    let roomOptions: { id: string; label: string }[] = [];
    if (!scope.all && scope.roomIds.length > 1) {
      const allRoomNames = await getRoomNames(db, scope.roomIds.map(String));
      roomOptions = scope.roomIds.map((id: string) => {
        const r = allRoomNames[String(id)];
        return {
          id: String(id),
          label: r?.name || r?.name_ar || r?.err_code || String(id),
        };
      });
    } else if (scope.all) {
      const unique = Array.from(new Set(withRooms.map((p: any) => String(p.err_id))));
      roomOptions = unique.map((id) => {
        const r = rooms[id];
        return { id, label: r?.name || r?.name_ar || r?.err_code || id };
      });
    }

    let filterOptions: {
      states: string[];
      localities: { state: string; locality: string }[];
    } | null = null;

    if (wantOptions) {
      let optQuery = db
        .from('err_projects')
        .select('state, locality')
        .eq('is_draft', false)
        .not('state', 'is', null);
      if (!scope.all) {
        optQuery = optQuery.in('err_id', scope.roomIds);
      }
      const { data: optRows } = await optQuery.limit(5000);
      const stateSet = new Set<string>();
      const locPairs = new Map<string, { state: string; locality: string }>();
      (optRows || []).forEach((r: any) => {
        const st = r.state ? String(r.state).trim() : '';
        const loc = r.locality ? String(r.locality).trim() : '';
        if (st) stateSet.add(st);
        if (st && loc) locPairs.set(`${st}||${loc}`, { state: st, locality: loc });
      });
      filterOptions = {
        states: Array.from(stateSet).sort((a, b) => a.localeCompare(b)),
        localities: Array.from(locPairs.values()).sort((a, b) =>
          a.locality.localeCompare(b.locality)
        ),
      };
    }

    return res.status(200).json({
      success: true,
      projects: withRooms,
      total: count ?? withRooms.length,
      limit,
      offset,
      roomOptions,
      ...(filterOptions ? { filterOptions } : {}),
    });
  } catch (error: any) {
    console.error('Unexpected error in get-projects:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
