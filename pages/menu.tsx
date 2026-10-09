import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Legacy chat hub — redirects to the new home shell.
 * Kept so existing bookmarks and PWA shortcuts keep working.
 */
export default function MenuRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/home');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 text-gray-600 text-sm">
      Redirecting…
    </div>
  );
}
