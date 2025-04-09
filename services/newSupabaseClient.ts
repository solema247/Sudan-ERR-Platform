import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_NEW_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_NEW_SUPABASE_ANON_KEY!;

export const newSupabase = createClient(supabaseUrl, supabaseAnonKey); 