import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { newSupabase } from '../services/newSupabaseClient';

export function useRequireAuth() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await newSupabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }
        const response = await fetch('/api/validate-session', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          router.replace('/login');
          return;
        }
        const data = await response.json();
        if (!data.success) {
          router.replace('/login');
          return;
        }
        if (!cancelled) {
          setToken(session.access_token);
          setReady(true);
        }
      } catch {
        router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { ready, token };
}
