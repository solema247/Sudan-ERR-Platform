import React, { useState, useEffect, useCallback } from 'react';
import OfflineForm from '../components/forms/OfflineForm';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import dynamic from 'next/dynamic';
import AppShell from '../components/layout/AppShell';
import {
  getSessionQueue,
  getSubmittedQueue,
  clearSubmittedQueue,
  type OfflineQueuedItem,
} from '../lib/offline/offlineQueue';
import { handleOnline } from '../services/handleOnline';

const OfflineMode: React.FC = () => {
  const { t, i18n } = useTranslation('offlineMode');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [queuedForms, setQueuedForms] = useState<OfflineQueuedItem[]>([]);
  const [submittedForms, setSubmittedForms] = useState<OfflineQueuedItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refreshQueues = useCallback(async () => {
    try {
      setQueuedForms(await getSessionQueue());
      setSubmittedForms(await getSubmittedQueue());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    refreshQueues();

    const onSubmitted = (event: CustomEvent) => {
      setSubmissionMessage(event.detail?.message || 'Synced');
      setTimeout(() => setSubmissionMessage(null), 3000);
      refreshQueues();
    };
    const onOnline = () => {
      setIsOnline(true);
      handleOnline().finally(refreshQueues);
    };
    const onOffline = () => setIsOnline(false);
    const onQueue = () => refreshQueues();

    window.addEventListener('offlineFormSubmitted', onSubmitted as EventListener);
    window.addEventListener('offlineQueueUpdated', onQueue);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('offlineFormSubmitted', onSubmitted as EventListener);
      window.removeEventListener('offlineQueueUpdated', onQueue);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshQueues]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      await handleOnline();
      await refreshQueues();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppShell title={t('instructions_title', 'Offline mode')}>
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm font-semibold mb-4 ${
          isOnline ? 'bg-brand-deep text-white' : 'bg-red-600 text-white'
        }`}
      >
        {isOnline ? t('status_online', 'Online') : t('status_offline', 'Offline')}
      </div>

      <div className="app-panel p-4 mb-4 space-y-2 text-sm text-ink-muted">
        <p className="app-section-label mb-2">How it works</p>
        <p className="mb-1">{t('instructions_step_1', 'Fill the form even when offline.')}</p>
        <p className="mb-1">{t('instructions_step_2', 'Required fields must be completed.')}</p>
        <p className="mb-0">{t('instructions_step_3', 'Queued forms sync automatically when you are back online.')}</p>
      </div>

      {submissionMessage && (
        <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm mb-4">
          {submissionMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-deep text-white font-semibold py-2.5 px-5 rounded-2xl shadow-soft"
        >
          {t('open_form_button', 'Open offline form')}
        </button>
        {isOnline && queuedForms.length > 0 && (
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="bg-white border border-green-200 text-brand-deep font-semibold py-2.5 px-5 rounded-2xl disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <section className="app-panel p-4">
          <h2 className="font-bold text-ink mb-3">
            {t('queued_forms_title', 'Queued')} ({queuedForms.length})
          </h2>
          {queuedForms.length === 0 ? (
            <p className="text-sm text-gray-500">No pending forms.</p>
          ) : (
            <ul className="space-y-2">
              {queuedForms.map((form) => (
                <li
                  key={form.id}
                  className="rounded-lg border border-green-50 bg-green-50/50 px-3 py-2 text-sm"
                >
                  <p>
                    <strong>{t('queued_form_id', 'ERR')}:</strong>{' '}
                    {form.formData?.err_id || t('unknown', '—')}
                  </p>
                  <p>
                    <strong>{t('queued_form_date', 'Date')}:</strong>{' '}
                    {form.formData?.date || t('unknown', '—')}
                  </p>
                  {form.lastError ? (
                    <p className="text-red-600 text-xs mt-1">{form.lastError}</p>
                  ) : (
                    <p className="text-amber-600 text-xs mt-1">
                      {t('queued_form_status_pending', 'Pending')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="app-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink">
              {t('submitted_forms_title', 'Synced')} ({submittedForms.length})
            </h2>
            {submittedForms.length > 0 && (
              <button
                type="button"
                className="text-xs text-red-600 underline"
                onClick={async () => {
                  await clearSubmittedQueue();
                  setSubmittedForms([]);
                }}
              >
                {t('clear_list_button', 'Clear')}
              </button>
            )}
          </div>
          {submittedForms.length === 0 ? (
            <p className="text-sm text-gray-500">{t('no_submitted_forms', 'No synced forms yet.')}</p>
          ) : (
            <ul className="space-y-2">
              {submittedForms.map((form) => (
                <li
                  key={form.id}
                  className="rounded-lg border border-green-50 px-3 py-2 text-sm flex justify-between gap-2"
                >
                  <span>
                    {form.formData?.err_id || '—'} · {form.formData?.date || '—'}
                  </span>
                  <span className="text-green-600 text-xs font-medium">
                    {t('submitted_form_status', 'Synced')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex gap-3 mt-6 text-sm">
        <button type="button" onClick={() => i18n.changeLanguage('en')} className="text-brand-blue underline">
          English
        </button>
        <button type="button" onClick={() => i18n.changeLanguage('ar')} className="text-brand-blue underline">
          العربية
        </button>
      </div>

      {isModalOpen && (
        <OfflineForm
          onClose={() => {
            setIsModalOpen(false);
            refreshQueues();
          }}
          onSubmitSuccess={() => {
            setIsModalOpen(false);
            refreshQueues();
            alert(t('form_submit_success'));
          }}
        />
      )}
    </AppShell>
  );
};

export default dynamic(() => Promise.resolve(OfflineMode), { ssr: false });

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', ['offline-mode'])),
    },
  };
}
