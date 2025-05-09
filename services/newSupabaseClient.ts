import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_NEW_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_NEW_SUPABASE_ANON_KEY!;

export const newSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
            getItem: (key) => {
                if (typeof window === 'undefined') return null;
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            },
            setItem: (key, value) => {
                if (typeof window === 'undefined') return;
                localStorage.setItem(key, JSON.stringify(value));
            },
            removeItem: (key) => {
                if (typeof window === 'undefined') return;
                localStorage.removeItem(key);
            },
        },
    },
}); 