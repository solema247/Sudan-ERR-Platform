import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getQueueCounts } from '../../lib/offline/offlineQueue';
import { handleOnline } from '../../services/handleOnline';

const OfflineStatusIndicator: React.FC = () => {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    try {
      const counts = await getQueueCounts();
      setPending(counts.pending);
      setFailed(counts.failed);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    refresh();

    const onOnline = () => {
      setOnline(true);
      handleOnline().finally(refresh);
    };
    const onOffline = () => setOnline(false);
    const onQueue = () => refresh();
    const onSync = (e: CustomEvent) => {
      setSyncing(e.detail?.status === 'syncing');
      if (e.detail?.status !== 'syncing') refresh();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offlineQueueUpdated', onQueue);
    window.addEventListener('offlineQueueCleared', onQueue);
    window.addEventListener('offlineFormSubmitted', onQueue);
    window.addEventListener('offlineSyncStatus', onSync as EventListener);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offlineQueueUpdated', onQueue);
      window.removeEventListener('offlineQueueCleared', onQueue);
      window.removeEventListener('offlineFormSubmitted', onQueue);
      window.removeEventListener('offlineSyncStatus', onSync as EventListener);
    };
  }, []);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div
      className={`text-xs sm:text-sm px-3 py-1.5 flex items-center justify-between gap-2 ${
        !online ? 'bg-red-600 text-white' : failed ? 'bg-amber-500 text-white' : 'bg-brand-blue text-white'
      }`}
    >
      <span>
        {!online
          ? 'You are offline'
          : syncing
            ? `Syncing ${pending} form(s)…`
            : failed
              ? `${failed} failed · ${pending} queued`
              : `${pending} form(s) waiting to sync`}
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {online && pending > 0 && !syncing && (
          <button
            type="button"
            className="underline font-medium"
            onClick={() => {
              setSyncing(true);
              handleOnline().finally(() => {
                setSyncing(false);
                refresh();
              });
            }}
          >
            Sync now
          </button>
        )}
        <Link href="/offline-mode" className="underline font-medium">
          Queue
        </Link>
      </span>
    </div>
  );
};

export default OfflineStatusIndicator;
