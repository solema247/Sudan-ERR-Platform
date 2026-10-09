import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { HomeSection, HomeCard } from '../../components/home/HomeSection';
import {
  WorkPlanScene,
  ApprovalsScene,
  MouScene,
  ReportingScene,
} from '../../components/home/illustrations';

export default function FSystemHubPage() {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <AppShell title="F-System">
        <p className="text-[#a8b6cc] text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="F-System">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white leading-snug mb-1">
          Choose a form
        </h2>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Start with F1 work plans or F4 & F5 reporting.
        </p>
      </div>

      <HomeSection title="Forms" href="/f-system">
        <HomeCard
          href="/f-system/f1"
          code="F1"
          title="Work Plans"
          subtitle="Apply & status"
          illustration={WorkPlanScene}
          wash="bg-brand-orangeSoft"
        />
        <HomeCard
          code="F2"
          title="Approvals"
          subtitle="Not available yet"
          illustration={ApprovalsScene}
          wash="bg-[#9BB0D4]"
          disabled
        />
        <HomeCard
          code="F3"
          title="MOUs"
          subtitle="Not available yet"
          illustration={MouScene}
          wash="bg-[#BCCBE3]"
          disabled
        />
        <HomeCard
          href="/f-system/f4-f5"
          code="F4 & F5"
          title="Reporting"
          subtitle="Financial & program"
          illustration={ReportingScene}
          wash="bg-[#7B96C4]"
        />
      </HomeSection>
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
