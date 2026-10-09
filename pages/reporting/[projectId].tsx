import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Legacy route — redirects into F-System F4 & F5 */
export default function ReportingProjectRedirect() {
  const router = useRouter();
  const { projectId } = router.query;

  useEffect(() => {
    if (typeof projectId === 'string') {
      router.replace(`/f-system/f4-f5/${projectId}`);
    }
  }, [router, projectId]);

  return (
    <div className="min-h-screen flex items-center justify-center text-ink-muted text-sm">
      Redirecting…
    </div>
  );
}
