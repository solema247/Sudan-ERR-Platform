//services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Anonymous client (file uploads and the older form routes). Users sign in through newSupabase, so this one never
// keeps a session of its own. That also stops it clashing with newSupabase when both point at the same project.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-legacy-anon' },
});
