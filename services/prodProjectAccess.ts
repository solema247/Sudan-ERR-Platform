/**
 * Ensure a staging-authenticated user may access a Prod err_projects row.
 * Scope comes from staging users/rooms; project data is read from Prod.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient } from './createAuthenticatedClient';
import { getAccessScope, type AccessScope } from './accessScope';

export type ProdProjectRow = {
  id: string;
  emergency_room_id?: string | null;
  err_id?: string | null;
  [key: string]: unknown;
};

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
  const { data } = await prod.from('emergency_rooms').select('err_code').in('id', uuids);
  return (data || [])
    .map((r: { err_code?: string | null }) => (r.err_code ? String(r.err_code) : ''))
    .filter(Boolean);
}

export async function getStagingAccessScope(
  accessToken: string,
  userId: string
): Promise<AccessScope> {
  const staging = createAuthenticatedClient(accessToken);
  return getAccessScope(staging, userId);
}

/**
 * Load a Prod project and verify the user is in scope.
 * Returns null project + forbidden when out of scope (do not leak existence to low-priv beyond 403/404 policy).
 */
export async function assertProdProjectAccess(opts: {
  accessToken: string;
  userId: string;
  prod: SupabaseClient;
  projectId: string;
  select?: string;
}): Promise<
  | { ok: true; project: ProdProjectRow; scope: AccessScope }
  | { ok: false; status: 403 | 404 | 500; error: string }
> {
  const { accessToken, userId, prod, projectId } = opts;
  const select =
    opts.select ||
    'id, emergency_room_id, err_id, state, grant_serial_id, f4_status, organization_id';

  let scope: AccessScope;
  try {
    scope = await getStagingAccessScope(accessToken, userId);
  } catch (e: any) {
    console.error('[prodProjectAccess] scope', e);
    return { ok: false, status: 500, error: 'Failed to resolve access scope' };
  }

  if (!scope.all && scope.roomIds.length === 0) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const { data: project, error } = await prod
    .from('err_projects')
    .select(select)
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    console.error('[prodProjectAccess] project', error);
    return { ok: false, status: 500, error: 'Failed to load project' };
  }
  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  if (!scope.all) {
    const roomIdSet = new Set(scope.roomIds.map(String));
    const errCodes = await resolveRoomErrCodes(prod, scope.roomIds);
    const errCodeSet = new Set(errCodes);
    if (!inScope(project as ProdProjectRow, roomIdSet, errCodeSet)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }
  }

  return { ok: true, project: project as ProdProjectRow, scope };
}

/** F4 temp uploads must stay under f4-financial-reports/{projectId}/tmp/... */
export function isAllowedF4TempKey(fileKey: string, projectId: string): boolean {
  if (!fileKey || !projectId) return false;
  if (fileKey.includes('..') || fileKey.includes('\\')) return false;
  const prefix = `f4-financial-reports/${projectId}/tmp/`;
  return fileKey.startsWith(prefix) && fileKey.length > prefix.length;
}
