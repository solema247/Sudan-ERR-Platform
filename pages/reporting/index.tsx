import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import ProjectIndex from '../../components/projects/ProjectIndex';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function ReportingIndexPage() {
  const { ready, token } = useRequireAuth();
  const { t, i18n } = useTranslation('menu');
  const router = useRouter();

  if (!ready || !token) {
    return (
      <AppShell title={t('reporting', 'Reporting')}>
        <p className="text-gray-500 text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('reporting', 'Reporting')}>
      <p className="text-sm text-gray-600 mb-4">
        {t('selectProject', 'Select a project to fill or scan a report.')}
      </p>
      <ProjectIndex
        token={token}
        mode="reporting"
        locale={i18n.language}
        onSelect={(project) => router.push(`/reporting/${project.id}`)}
      />
    </AppShell>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', ['menu'])),
    },
  };
}
