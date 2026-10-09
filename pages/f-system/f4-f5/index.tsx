import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../../components/layout/AppShell';
import ProjectIndex from '../../../components/projects/ProjectIndex';
import { useRequireAuth } from '../../../hooks/useRequireAuth';

export default function F4F5ReportingIndexPage() {
  const { ready, token } = useRequireAuth();
  const { t, i18n } = useTranslation('menu');
  const router = useRouter();

  if (!ready || !token) {
    return (
      <AppShell title="F4 & F5 Reporting">
        <p className="text-ink-muted text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="F4 & F5 Reporting">
      <div className="mb-4">
        <p className="app-section-label mb-1">F4 & F5 · Reporting</p>
        <h2 className="text-lg font-bold text-ink leading-snug mb-1">
          {t('selectProject', 'Select a project')}
        </h2>
        <p className="text-sm text-ink-muted mb-0">
          Open a project for F4 financial or F5 program reports.
        </p>
      </div>
      <ProjectIndex
        token={token}
        mode="reporting"
        locale={i18n.language}
        onSelect={(project) => router.push(`/f-system/f4-f5/${project.id}`)}
      />
      <button
        type="button"
        onClick={() => router.push('/f-system')}
        className="mt-4 text-sm font-medium text-ink-muted hover:text-brand-deep"
      >
        Back to F-System
      </button>
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
