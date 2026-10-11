import { newSupabase } from '../../../services/newSupabaseClient';

/** Bearer header from the current session (same pattern as other F4 calls). */
export async function f4AuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await newSupabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${session.access_token}` };
}

/** Init temp key + upload bytes to temp storage. Returns key + signed URL. */
export async function f4TempUpload(
  projectId: string,
  file: File
): Promise<{ file_key_temp: string; signed_url: string | null }> {
  const headers = await f4AuthHeaders();
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();

  const initRes = await fetch('/api/f4/upload/init', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ext }),
  });
  const initJson = await initRes.json();
  if (!initRes.ok) throw new Error(initJson.error || 'Init failed');

  const form = new FormData();
  form.append('file', file);
  form.append('file_key_temp', initJson.file_key_temp);
  form.append('project_id', projectId);

  const upRes = await fetch('/api/f4/temp-upload', {
    method: 'POST',
    headers,
    body: form,
  });
  const upJson = await upRes.json();
  if (!upRes.ok) throw new Error(upJson.message || 'Upload failed');
  return { file_key_temp: upJson.file_key_temp, signed_url: upJson.signed_url || null };
}

export async function f4ParseSnips(form: FormData): Promise<Record<string, unknown>> {
  const headers = await f4AuthHeaders();
  const res = await fetch('/api/f4/parse-snips', { method: 'POST', headers, body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Could not read the selected regions');
  return json as Record<string, unknown>;
}

export async function f4Save(body: {
  project_id: string;
  summary: unknown;
  expenses: unknown[];
  file_key_temp: string;
}): Promise<{ summary_id?: number }> {
  const headers = await f4AuthHeaders();
  const res = await fetch('/api/f4/save', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).error || 'Save failed');
  return json as { summary_id?: number };
}
