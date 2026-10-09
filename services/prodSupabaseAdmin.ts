import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Prod Supabase client (service role).
 * Used for F1 OCR submit + temp file storage — login remains on staging.
 */
export function createProdSupabaseAdmin(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_PROD_SUPABASE_URL?.trim() ||
    process.env.PROD_SUPABASE_URL?.trim();
  const key = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      'Prod Supabase not configured (NEXT_PUBLIC_PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isProdSupabaseConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_PROD_SUPABASE_URL?.trim() ||
    process.env.PROD_SUPABASE_URL?.trim();
  const key = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}
