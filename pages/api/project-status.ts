/**
 * Project Status list/detail.
 * Auth + access scope: staging session.
 * Project rows: Prod (service role) — same DB F1 OCR writes to.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { validateSession } from '../../services/auth';
import { getAccessScope, getRoomNames } from '../../services/accessScope';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../services/prodSupabaseAdmin';

const LIST_SELECT = `
  id,
  date,
  state,
  locality,
  status,
  funding_status,
  submitted_at,
  last_modified,
  version,
  err_id,
  emergency_room_id,
  project_name
`;

const DETAIL_SELECT = `
  id,
  date,
  state,
  locality,
  status,
  funding_status,
  project_objectives,
  intended_beneficiaries,
  estimated_beneficiaries,
  estimated_timeframe,
  additional_support,
  banking_details,
  submitted_at,
  program_officer_name,
  program_officer_phone,
  reporting_officer_name,
  reporting_officer_phone,
  finance_officer_name,
  finance_officer_phone,
  planned_activities,
  funding_cycle_id,
  version,
  last_modified,
  err_id,
  emergency_room_id,
  project_name
`;

/** Statuses shown on Project Status (excludes active / completed). */
const ALLOWED_STATUS = new Set([
  'pending',
  'feedback',
  'approved',
  'rejected',
  'closed',
]);

const HIDDEN_STATUSES = ['active', 'completed'] as const;

function parseIntParam(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function quoteIn(ids: string[]): string {
  return `(${ids.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',')})`;
}

function roomKey(project: { emergency_room_id?: string | null; err_id?: string | null }): string {
  return String(project.emergency_room_id || project.err_id || '');
}

function inScope(
  project: { emergency_room_id?: string | null; err_id?: string | null },
  roomIds: Set<string>,
  errCodes: Set<string>
): boolean {
  const er = project.emergency_room_id ? String(project.emergency_room_id) : '';
  const err = project.err_id ? String(project.err_id) : '';
  if (er && roomIds.has(er)) return true;
  if (err && roomIds.has(err)) return true;
  if (err && errCodes.has(err)) return true;
  return false;
}

async function resolveRoomErrCodes(
  prod: SupabaseClient,
  roomIds: string[]
): Promise<string[]> {
  const uuids = roomIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (uuids.length === 0) return [];
  const { data } = await prod
    .from('emergency_rooms')
    .select('err_code')
    .in('id', uuids);
  return (data || [])
    .map((r: { err_code?: string | null }) => (r.err_code ? String(r.err_code) : ''))
    .filter(Boolean);
}

async function enrichActivities(client: SupabaseClient, project: any, language: string) {
  let planned_activities: any[] = [];
  if (!project?.planned_activities) {
    return { ...project, planned_activities };
  }

  const raw =
    typeof project.planned_activities === 'string'
      ? JSON.parse(project.planned_activities)
      : project.planned_activities;

  const { data: activities } = await client
    .from('planned_activities')
    .select('id, activity_name')
    .eq('language', language || 'en');

  const activityMap = (activities || []).reduce((map: Record<string, string>, a: any) => {
    map[a.id] = a.activity_name;
    return map;
  }, {});

  planned_activities = (Array.isArray(raw) ? raw : []).map((activity: any) => {
    const key = activity.selectedActivity || activity.activity || '';
    const label =
      activityMap[key] || activity.activityName || activity.activity || key;
    return { ...activity, activityName: label };
  });

  return { ...project, planned_activities };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    if (!isProdSupabaseConfigured()) {
      return res.status(500).json({
        success: false,
        message:
          'Reporting database not configured (prod service role or NEXT_PUBLIC_NEW_SUPABASE_URL + SUPABASE_SERVICE_KEY)',
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header' });
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const user = await validateSession(accessToken);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Scope from staging profile; project data from Prod
    const staging = createAuthenticatedClient(accessToken);
    const prod = createProdSupabaseAdmin();

    let scope;
    try {
      scope = await getAccessScope(staging, user.id);
    } catch (e) {
      console.error('Error fetching user data:', e);
      return res.status(500).json({ success: false, message: 'Failed to fetch user data' });
    }

    if (!scope.all && scope.roomIds.length === 0) {
      return res.status(200).json({
        success: true,
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    }

    const roomIdSet = new Set<string>(scope.roomIds.map(String));
    const errCodes: string[] = scope.all
      ? []
      : await resolveRoomErrCodes(prod, scope.roomIds);
    const errCodeSet = new Set<string>(errCodes);

    const language = String(req.query.language || 'en');
    const detailId =
      typeof req.query.id === 'string' && req.query.id.trim()
        ? req.query.id.trim()
        : null;

    // ---- Detail (one project) ----
    if (detailId) {
      const { data: project, error } = await prod
        .from('err_projects')
        .select(DETAIL_SELECT)
        .eq('id', detailId)
        .eq('is_draft', false)
        .maybeSingle();
      if (error) {
        console.error('Error fetching project detail:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch project' });
      }
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      if (!scope.all && !inScope(project, roomIdSet, errCodeSet)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const enriched = await enrichActivities(prod, project, language);
      const key = roomKey(project);
      const rooms = await getRoomNames(prod, [key]);

      return res.status(200).json({
        success: true,
        project: {
          ...enriched,
          is_own_room: key === scope.ownRoomId,
          room: rooms[key] || null,
        },
      });
    }

    // ---- List (paginated summary) ----
    const limit = Math.min(parseIntParam(req.query.limit, 20) || 20, 50);
    const offset = parseIntParam(req.query.offset, 0);
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const status = statusRaw && ALLOWED_STATUS.has(statusRaw) ? statusRaw : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    let listQuery = prod
      .from('err_projects')
      .select(LIST_SELECT, { count: 'exact' })
      .eq('is_draft', false)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (!scope.all) {
      const errKeys = Array.from(new Set([...scope.roomIds, ...errCodes]));
      listQuery = listQuery.or(
        `emergency_room_id.in.${quoteIn(scope.roomIds)},err_id.in.${quoteIn(errKeys)}`
      );
    }
    if (status) {
      listQuery = listQuery.eq('status', status);
    } else {
      listQuery = listQuery.not('status', 'in', `(${HIDDEN_STATUSES.join(',')})`);
    }
    if (q) {
      const escaped = q.replace(/%/g, '').replace(/,/g, ' ');
      listQuery = listQuery.or(
        `locality.ilike.%${escaped}%,state.ilike.%${escaped}%,project_name.ilike.%${escaped}%`
      );
    }

    const { data: projects, error: projectsError, count } = await listQuery;

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
    }

    const rooms = await getRoomNames(
      prod,
      (projects || []).map((p: any) => roomKey(p))
    );

    const processedProjects = (projects || []).map((project: any) => {
      const key = roomKey(project);
      return {
        ...project,
        is_own_room: key === scope.ownRoomId,
        room: rooms[key] || null,
      };
    });

    return res.status(200).json({
      success: true,
      projects: processedProjects,
      total: count ?? processedProjects.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Project status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
