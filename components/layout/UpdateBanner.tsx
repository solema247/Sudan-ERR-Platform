import React, { useEffect, useState } from 'react';
import { applyServiceWorkerUpdate } from '../../services/serviceWorkerRegistration';

const UpdateBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener('swUpdateAvailable', onUpdate as EventListener);
    return () => window.removeEventListener('swUpdateAvailable', onUpdate as EventListener);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-brand-deep text-white px-4 py-3 shadow-lift max-w-md w-full">
        <p className="text-sm flex-1 mb-0">A new version is available.</p>
        <button
          type="button"
          className="text-sm font-semibold underline"
          onClick={() => applyServiceWorkerUpdate()}
        >
          Update
        </button>
        <button
          type="button"
          className="text-sm opacity-80"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
