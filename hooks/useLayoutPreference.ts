import { useCallback, useEffect, useState } from 'react';

export type LayoutMode = 'mobile' | 'desktop';

const STORAGE_KEY = 'err-layout-preference';

function defaultFromViewport(): LayoutMode {
  if (typeof window === 'undefined') return 'mobile';
  return window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
}

export function useLayoutPreference() {
  const [layout, setLayoutState] = useState<LayoutMode>('mobile');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as LayoutMode | null;
      if (stored === 'mobile' || stored === 'desktop') {
        setLayoutState(stored);
      } else {
        setLayoutState(defaultFromViewport());
      }
    } catch {
      setLayoutState(defaultFromViewport());
    }
    setReady(true);
  }, []);

  const setLayout = useCallback((mode: LayoutMode) => {
    setLayoutState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLayout = useCallback(() => {
    setLayout(layout === 'mobile' ? 'desktop' : 'mobile');
  }, [layout, setLayout]);

  return { layout, setLayout, toggleLayout, ready };
}
