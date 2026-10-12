import { newSupabase } from '../../../services/newSupabaseClient';

/** Bearer header from the current session (same pattern as other F4/F5 calls). */
export async function f5AuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await newSupabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${session.access_token}` };
}

/** Init temp key + upload bytes to temp storage. Returns key + signed URL. */
export async function f5TempUpload(
  projectId: string,
  file: File
): Promise<{ file_key_temp: string; signed_url: string | null }> {
  const headers = await f5AuthHeaders();
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();

  const initRes = await fetch('/api/f5/upload/init', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ext }),
  });
  const initJson = await initRes.json().catch(() => ({}));
  if (!initRes.ok) throw new Error((initJson as any).error || 'Init failed');

  const form = new FormData();
  form.append('file', file);
  form.append('file_key_temp', (initJson as any).file_key_temp);
  form.append('project_id', projectId);

  const upRes = await fetch('/api/f5/temp-upload', {
    method: 'POST',
    headers,
    body: form,
  });
  const upJson = await upRes.json().catch(() => ({}));
  if (!upRes.ok) throw new Error((upJson as any).message || 'Upload failed');
  return {
    file_key_temp: (upJson as any).file_key_temp,
    signed_url: (upJson as any).signed_url || null,
  };
}

export async function f5ParseSnips(form: FormData): Promise<Record<string, unknown>> {
  const headers = await f5AuthHeaders();
  const res = await fetch('/api/f5/parse-snips', { method: 'POST', headers, body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || 'Could not read the selected regions');
  }
  return json as Record<string, unknown>;
}

export async function f5Save(body: {
  project_id: string;
  summary: unknown;
  reach: unknown[];
  file_key_temp: string;
}): Promise<{ report_id?: string }> {
  const headers = await f5AuthHeaders();
  const res = await fetch('/api/f5/save', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).error || 'Save failed');
  return json as { report_id?: string };
}
