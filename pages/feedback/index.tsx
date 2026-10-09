import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import FeedbackForm from '../../components/forms/FeedbackForm';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function FeedbackPage() {
  const { ready } = useRequireAuth();
  const { t } = useTranslation('menu');
  const router = useRouter();

  if (!ready) {
    return (
      <AppShell title={t('feedback', 'Feedback')}>
        <p className="text-gray-500 text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('feedback', 'Feedback')}>
      <div className="app-panel p-4">
        <FeedbackForm onReturnToMenu={() => router.push('/home')} />
      </div>
    </AppShell>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', ['menu', 'feedback'])),
    },
  };
}
