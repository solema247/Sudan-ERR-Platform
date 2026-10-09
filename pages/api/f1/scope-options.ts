/**
 * F1 scope options: grant segments + states/rooms for admin-style pickers.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../../services/auth';
import { createAuthenticatedClient } from '../../../services/createAuthenticatedClient';
import { getAccessScope } from '../../../services/accessScope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await validateSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const db = createAuthenticatedClient(token);

  try {
    const [{ data: segments, error: segError }, scope] = await Promise.all([
      db
        .from('grant_segments')
        .select('id, code, label_en, label_ar, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      getAccessScope(db, user.id),
    ]);

    if (segError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load grant segments',
        error: segError.message,
      });
    }

    const needsRoomPicker = !user.err_id || ['admin', 'support', 'superadmin'].includes(user.role);

    let rooms: any[] = [];
    let states: string[] = [];

    if (needsRoomPicker) {
      let roomQuery = db
        .from('emergency_rooms')
        .select(
          `
          id,
          name,
          name_ar,
          err_code,
          state_reference,
          states:states!emergency_rooms_state_reference_fkey (
            id,
            state_name,
            state_name_ar,
            locality,
            locality_ar
          )
        `
        )
        .order('name', { ascending: true });

      if (!scope.all && scope.roomIds.length > 0) {
        roomQuery = roomQuery.in('id', scope.roomIds);
      } else if (!scope.all && scope.states.length > 0) {
        // Fallback: filter by state names via nested relation isn't trivial — fetch all then filter
      }

      const { data: roomRows, error: roomError } = await roomQuery;
      if (roomError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to load rooms',
          error: roomError.message,
        });
      }

      const stateOf = (r: any) => {
        const s = Array.isArray(r.states) ? r.states[0] : r.states;
        return s || null;
      };

      rooms = (roomRows || [])
        .map((r: any) => ({ ...r, states: stateOf(r) }))
        .filter((r: any) => {
          if (scope.all) return true;
          if (scope.roomIds.length > 0) return scope.roomIds.includes(r.id);
          const stateName = r.states?.state_name;
          if (scope.states.length > 0 && stateName) return scope.states.includes(stateName);
          return true;
        });

      const stateSet = new Set<string>();
      for (const r of rooms) {
        const name = r.states?.state_name;
        if (name) stateSet.add(name);
      }
      states = Array.from(stateSet).sort();
    } else {
      // Locked room user — return their room for display
      if (user.err_id) {
        const { data: room } = await db
          .from('emergency_rooms')
          .select(
            `
            id,
            name,
            name_ar,
            err_code,
            states:states!emergency_rooms_state_reference_fkey (
              id,
              state_name,
              state_name_ar,
              locality,
              locality_ar
            )
          `
          )
          .eq('id', user.err_id)
          .maybeSingle();
        if (room) {
          const st = Array.isArray(room.states) ? room.states[0] : room.states;
          rooms = [{ ...room, states: st }];
          if (st?.state_name) states = [st.state_name];
        }
      }
    }

    return res.status(200).json({
      success: true,
      role: user.role,
      err_id: user.err_id,
      needsRoomPicker,
      grant_segments: segments || [],
      states,
      rooms,
    });
  } catch (error: any) {
    console.error('F1 scope-options error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load scope options',
    });
  }
}
