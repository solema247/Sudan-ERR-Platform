import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type ReportingDbTarget = 'prod' | 'staging';

function prodCreds(): { url: string; key: string } | null {
  const url =
    process.env.NEXT_PUBLIC_PROD_SUPABASE_URL?.trim() ||
    process.env.PROD_SUPABASE_URL?.trim() ||
    '';
  const key = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!url || !key) return null;
  return { url, key };
}

function stagingServiceCreds(): { url: string; key: string } | null {
  const url =
    process.env.NEXT_PUBLIC_NEW_SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const key =
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    '';
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Which DB F1/F4/F5 reporting APIs use.
 * - REPORTING_DB=staging|prod forces a target when that target is configured
 * - otherwise: prod if configured, else staging service role
 */
export function getReportingDbTarget(): ReportingDbTarget | null {
  const forced = process.env.REPORTING_DB?.trim().toLowerCase();
  const prod = prodCreds();
  const staging = stagingServiceCreds();

  if (forced === 'staging') {
    return staging ? 'staging' : null;
  }
  if (forced === 'prod') {
    return prod ? 'prod' : null;
  }
  if (prod) return 'prod';
  if (staging) return 'staging';
  return null;
}

function credsForTarget(target: ReportingDbTarget): { url: string; key: string } | null {
  return target === 'prod' ? prodCreds() : stagingServiceCreds();
}

/**
 * Server-only admin client for F1/F4/F5 reporting data + storage.
 * Login / access scope remain on staging user JWT.
 *
 * Prefer prod when configured; fall back to staging service role so local
 * and staging-only deploys work without PROD_* vars.
 */
export function createReportingSupabaseAdmin(): SupabaseClient {
  const target = getReportingDbTarget();
  const creds = target ? credsForTarget(target) : null;
  if (!target || !creds) {
    throw new Error(
      'Reporting Supabase not configured. Set either ' +
        '(NEXT_PUBLIC_PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_ROLE_KEY) or ' +
        '(NEXT_PUBLIC_NEW_SUPABASE_URL + SUPABASE_SERVICE_KEY). ' +
        'Optional: REPORTING_DB=staging|prod'
    );
  }

  return createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isReportingSupabaseConfigured(): boolean {
  return getReportingDbTarget() !== null;
}

/** @deprecated Prefer createReportingSupabaseAdmin — kept for existing F1/F4/F5 callers */
export function createProdSupabaseAdmin(): SupabaseClient {
  return createReportingSupabaseAdmin();
}

/** @deprecated Prefer isReportingSupabaseConfigured */
export function isProdSupabaseConfigured(): boolean {
  return isReportingSupabaseConfigured();
}

export const REPORTING_DB_NOT_CONFIGURED =
  'Reporting database not configured. Set (NEXT_PUBLIC_PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_ROLE_KEY) or (NEXT_PUBLIC_NEW_SUPABASE_URL + SUPABASE_SERVICE_KEY). Optional: REPORTING_DB=staging|prod';
