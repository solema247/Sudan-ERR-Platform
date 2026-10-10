import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronRight } from 'lucide-react';
import AppShell from '../../../components/layout/AppShell';
import ProjectIndex from '../../../components/projects/ProjectIndex';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { HomeCard } from '../../../components/home/HomeSection';
import {
  ReportingScene,
  WorkPlanScene,
  MouScene,
  ApprovalsScene,
} from '../../../components/home/illustrations';

export type ReportingAction = 'f4-ai' | 'f4-manual' | 'f5-ai' | 'f5-manual';

const ACTION_COPY: Record<
  ReportingAction,
  { label: string; subtitle: string }
> = {
  'f4-ai': {
    label: 'Upload F4 with AI',
    subtitle: 'Scan a financial report with OCR',
  },
  'f4-manual': {
    label: 'Upload F4 Manual Form',
    subtitle: 'Fill the financial report by hand',
  },
  'f5-ai': {
    label: 'Upload F5 with AI',
    subtitle: 'Scan a program report with OCR',
  },
  'f5-manual': {
    label: 'Upload F5 Manual Form',
    subtitle: 'Fill the program report by hand',
  },
};

export default function F4F5ReportingIndexPage() {
  const { ready, token } = useRequireAuth();
  const { t, i18n } = useTranslation('menu');
  const router = useRouter();
  const [view, setView] = useState<'hub' | 'pick-project'>('hub');
  const [action, setAction] = useState<ReportingAction | null>(null);

  const openAction = (next: ReportingAction) => {
    setAction(next);
    setView('pick-project');
  };

  if (!ready || !token) {
    return (
      <AppShell title="F4 & F5 Reporting">
        <p className="text-[#a8b6cc] text-sm">Loading…</p>
      </AppShell>
    );
  }

  if (view === 'pick-project' && action) {
    const copy = ACTION_COPY[action];
    return (
      <AppShell title="F4 & F5 Reporting">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              setView('hub');
              setAction(null);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange transition-colors mb-3"
          >
            <span className="rtl:rotate-180 inline-flex">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </span>
            Back to reporting
          </button>
          <p className="app-section-label mb-1">F4 & F5 · Reporting</p>
          <h2 className="text-xl font-bold text-white leading-snug mb-1">
            {t('selectProject', 'Select a project')}
          </h2>
          <p className="text-sm text-[#a8b6cc] mb-0">
            {copy.label} — choose which project this report belongs to.
          </p>
        </div>

        <ProjectIndex
          token={token}
          mode="reporting"
          locale={i18n.language}
          status="active"
          layout="status-table"
          enableSmartFilters
          reportKind={action.startsWith('f5') ? 'f5' : 'f4'}
          onSelect={(project) =>
            router.push(`/f-system/f4-f5/${project.id}?action=${action}`)
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="F4 & F5 Reporting">
      <div className="mb-6">
        <p className="app-section-label mb-1">F4 & F5 · Reporting</p>
        <h2 className="text-xl font-bold text-white leading-snug mb-1">
          What do you want to do?
        </h2>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Upload financial (F4) or program (F5) reports for a project.
        </p>
      </div>

      {/* F4 carousel */}
      <section className="mb-8">
        <div className="flex items-center gap-1.5 mb-3 px-0.5">
          <h3 className="text-lg font-bold text-white leading-tight">
            F4 - Financial Reports
          </h3>
        </div>
        <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
            <HomeCard
              onClick={() => openAction('f4-ai')}
              code="AI"
              title="Upload F4 with AI"
              subtitle="Scan a financial report"
              illustration={MouScene}
              wash="bg-brand-orangeSoft"
              size="md"
            />
            <HomeCard
              onClick={() => openAction('f4-manual')}
              code="Manual"
              title="Upload F4 Manual Form"
              subtitle="Fill expenses by hand"
              illustration={ReportingScene}
              wash="bg-[#7B96C4]"
              size="md"
            />
          </div>
        </div>
      </section>

      {/* F5 carousel */}
      <section className="mb-8">
        <div className="flex items-center gap-1.5 mb-3 px-0.5">
          <h3 className="text-lg font-bold text-white leading-tight">
            F5 - Program Reports
          </h3>
        </div>
        <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
            <HomeCard
              onClick={() => openAction('f5-ai')}
              code="AI"
              title="Upload F5 with AI"
              subtitle="Scan a program report"
              illustration={ApprovalsScene}
              wash="bg-brand-orangeSoft"
              size="md"
            />
            <HomeCard
              onClick={() => openAction('f5-manual')}
              code="Manual"
              title="Upload F5 Manual Form"
              subtitle="Fill the program report"
              illustration={WorkPlanScene}
              wash="bg-[#7B96C4]"
              size="md"
            />
          </div>
        </div>
      </section>

      <Link
        href="/f-system"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange transition-colors"
      >
        <span className="rtl:rotate-180 inline-flex">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </span>
        Back to F-System
      </Link>
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
