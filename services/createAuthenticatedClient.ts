import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_NEW_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_NEW_SUPABASE_ANON_KEY!;

/**
 * Create an authenticated Supabase client for server-side use
 * @param accessToken - The access token from the user's session
 * @returns Authenticated Supabase client
 */
export function createAuthenticatedClient(accessToken: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}

