import React from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../components/layout/AppShell';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { HomeSection, HomeCard } from '../components/home/HomeSection';
import {
  WorkPlanScene,
  ApprovalsScene,
  MouScene,
  ReportingScene,
  DashboardScene,
  FeedbackScene,
  OfflineScene,
} from '../components/home/illustrations';

export default function HomePage() {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <AppShell title="Home">
        <p className="text-[#a8b6cc] text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Home">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white leading-snug mb-1">
          What do you want to work on?
        </h2>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Apply for projects, submit reports, check your dashboard, or work offline.
        </p>
      </div>

      <HomeSection title="F-System" href="/f-system">
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

      <HomeSection title="Dashboard" href="/dashboard">
        <HomeCard
          href="/dashboard"
          title="Overview"
          subtitle="Funding & reach"
          illustration={DashboardScene}
          wash="bg-[#5D7EB3]"
        />
      </HomeSection>

      <HomeSection title="Utilities" href="/utilities">
        <HomeCard
          href="/feedback"
          title="Feedback"
          subtitle="Tickets & support"
          illustration={FeedbackScene}
          wash="bg-[#4A6798]"
        />
        <HomeCard
          href="/offline-mode"
          title="Offline"
          subtitle="Queue & sync"
          illustration={OfflineScene}
          wash="bg-brand-orangeSoft"
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
