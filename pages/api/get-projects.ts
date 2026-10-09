// /pages/api/get-projects.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { getAccessScope, getRoomNames } from '../../services/accessScope';
import { validateSession } from '../../services/auth';

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
      limit: limitRaw,
      offset: offsetRaw,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(String(limitRaw || '100'), 10) || 100, 1), 200);
    const offset = Math.max(parseInt(String(offsetRaw || '0'), 10) || 0, 0);
    const search = typeof q === 'string' ? q.trim() : '';
    const roomId = typeof room_id === 'string' && room_id ? room_id : null;
    const idFilter = typeof projectId === 'string' && projectId ? projectId : null;
    const statusFilter = typeof status === 'string' && status ? status : 'active';

    const scope = await getAccessScope(db, user.id);
    if (!scope.all && scope.roomIds.length === 0) {
      return res.status(200).json({ success: true, projects: [], total: 0, roomOptions: [] });
    }

    let query = db
      .from('err_projects')
      .select('id, project_objectives, state, locality, err_id, status', { count: 'exact' });

    if (idFilter) {
      query = query.eq('id', idFilter);
    }
    if (!includeDrafts) {
      query = query.eq('is_draft', false);
    }
    if (statusFilter !== 'all' && !idFilter) {
      query = query.eq('status', statusFilter);
    }
    if (!scope.all) {
      query = query.in('err_id', scope.roomIds);
    }
    if (roomId) {
      query = query.eq('err_id', roomId);
    }
    if (search) {
      // PostgREST or-filter across text columns
      const escaped = search.replace(/%/g, '\\%').replace(/,/g, '');
      query = query.or(
        `project_objectives.ilike.%${escaped}%,locality.ilike.%${escaped}%,state.ilike.%${escaped}%`
      );
    }

    query = query.order('project_objectives', { ascending: true }).range(offset, offset + limit - 1);

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

    // Room filter options for multi-room users
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

    return res.status(200).json({
      success: true,
      projects: withRooms,
      total: count ?? withRooms.length,
      limit,
      offset,
      roomOptions,
    });
  } catch (error: any) {
    console.error('Unexpected error in get-projects:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
