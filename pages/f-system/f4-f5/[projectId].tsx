import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronRight } from 'lucide-react';
import AppShell from '../../../components/layout/AppShell';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import ReportingForm from '../../../components/forms/ReportForm/ReportingForm';
import ScanForm from '../../scan-form';
import ProgramReportForm from '../../../components/forms/ProgramReportForm/ReportingForm';
import FinancialReportDrafts from '../../../components/forms/FinancialReportForm/FinancialReportDrafts';
import ProgramReportDrafts from '../../../components/forms/ProgramReportForm/ProgramReportDrafts';
import { HomeCard } from '../../../components/home/HomeSection';
import {
  ReportingScene,
  WorkPlanScene,
  ApprovalsScene,
  MouScene,
} from '../../../components/home/illustrations';
import { v4 as uuidv4 } from 'uuid';

type Workflow = 'menu' | 'fill' | 'scan' | 'program' | 'drafts';

export default function F4F5ProjectPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { ready, token } = useRequireAuth();
  const { t } = useTranslation('menu');
  const [project, setProject] = useState<any>(null);
  const [workflow, setWorkflow] = useState<Workflow>('menu');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [financialDrafts, setFinancialDrafts] = useState([]);
  const [programDrafts, setProgramDrafts] = useState([]);
  const [currentProjectDraft, setCurrentProjectDraft] = useState(null);
  const [currentProgramDraft, setCurrentProgramDraft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token || !projectId || typeof projectId !== 'string') return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/get-projects?id=${encodeURIComponent(projectId)}&status=all`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setProject((data.projects || [])[0] || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, token, projectId]);

  const fetchDrafts = async () => {
    if (!token || !projectId) return;
    const [fin, prog] = await Promise.all([
      fetch(`/api/financial-report-drafts?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/program-report-drafts?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (fin.ok) {
      const d = await fin.json();
      setFinancialDrafts(d.drafts || []);
    }
    if (prog.ok) {
      const d = await prog.json();
      setProgramDrafts(d.drafts || []);
    }
  };

  const openFill = () => {
    setActiveReportId(uuidv4());
    setCurrentProjectDraft(null);
    setWorkflow('fill');
  };

  if (!ready) {
    return (
      <AppShell title="F4 & F5 Reporting">
        <p className="text-[#a8b6cc] text-sm">Loading…</p>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="F4 & F5 Reporting">
        <p className="text-[#a8b6cc] text-sm">Loading project…</p>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="F4 & F5 Reporting">
        <p className="text-sm text-red-300 mb-4">Project not found or not accessible.</p>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange transition-colors"
          onClick={() => router.push('/f-system/f4-f5')}
        >
          <span className="rtl:rotate-180 inline-flex">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </span>
          Back to projects
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell title="F4 & F5 Reporting">
      <div className="mb-6">
        <button
          type="button"
          onClick={() =>
            workflow === 'menu' ? router.push('/f-system/f4-f5') : setWorkflow('menu')
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange transition-colors mb-3"
        >
          <span className="rtl:rotate-180 inline-flex">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </span>
          {workflow === 'menu'
            ? t('selectDifferentProject', 'Choose another project')
            : t('backToReportTypes', 'Back')}
        </button>
        <p className="app-section-label mb-1">F4 & F5 · Reporting</p>
        <h2 className="text-xl font-bold text-white leading-snug mb-1 line-clamp-3">
          {project.project_objectives || 'Untitled project'}
        </h2>
        <p className="text-sm text-[#a8b6cc] mb-0">
          {[project.locality, project.state].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      {workflow === 'menu' && (
        <section className="mb-6">
          <div className="flex items-center gap-1.5 mb-3 px-0.5">
            <h3 className="text-lg font-bold text-white leading-tight">
              {t('selectReportType', 'Actions')}
            </h3>
          </div>
          <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
              <HomeCard
                onClick={openFill}
                code="F4"
                title="Financial report"
                subtitle="Fill expenses for this project"
                illustration={ReportingScene}
                wash="bg-brand-orangeSoft"
                size="md"
              />
              <HomeCard
                onClick={() => setWorkflow('scan')}
                code="F4"
                title="Scan report"
                subtitle="OCR a financial report"
                illustration={MouScene}
                wash="bg-[#7B96C4]"
                size="md"
              />
              <HomeCard
                onClick={() => {
                  setCurrentProgramDraft(null);
                  setWorkflow('program');
                }}
                code="F5"
                title="Program report"
                subtitle="Report on activities"
                illustration={WorkPlanScene}
                wash="bg-brand-orangeSoft"
                size="md"
              />
              <HomeCard
                onClick={async () => {
                  await fetchDrafts();
                  setWorkflow('drafts');
                }}
                code="Drafts"
                title={t('viewDrafts', 'View drafts')}
                subtitle="Continue saved reports"
                illustration={ApprovalsScene}
                wash="bg-[#7B96C4]"
                size="md"
              />
            </div>
          </div>
        </section>
      )}

      {workflow === 'fill' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <ReportingForm
            errId={project.err_id}
            reportId={activeReportId}
            project={project}
            onReturnToMenu={() => setWorkflow('menu')}
            onSubmitAnotherForm={openFill}
            initialDraft={currentProjectDraft}
          />
        </div>
      )}

      {workflow === 'scan' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <ScanForm project={project} onReturnToMenu={() => setWorkflow('menu')} />
        </div>
      )}

      {workflow === 'program' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <ProgramReportForm
            project={project}
            onReturnToMenu={() => setWorkflow('menu')}
            onSubmitAnotherForm={() => setWorkflow('program')}
            initialDraft={currentProgramDraft}
          />
        </div>
      )}

      {workflow === 'drafts' && (
        <div className="space-y-6 rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <div>
            <h3 className="font-semibold text-white mb-3">F4 · Financial drafts</h3>
            <FinancialReportDrafts
              drafts={financialDrafts}
              onEditDraft={(draftId: string) => {
                const draft = (financialDrafts as any[]).find((d) => d.id === draftId);
                setCurrentProjectDraft(draft || null);
                setActiveReportId(draftId || uuidv4());
                setWorkflow('fill');
              }}
              onDeleteDraft={(id: string) =>
                setFinancialDrafts((prev) => prev.filter((d: any) => d.id !== id))
              }
              onNewReport={openFill}
              onReturnToMenu={() => setWorkflow('menu')}
            />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">F5 · Program drafts</h3>
            <ProgramReportDrafts
              drafts={programDrafts}
              onEditDraft={(draftId: string) => {
                const draft = (programDrafts as any[]).find((d) => d.id === draftId);
                setCurrentProgramDraft(draft || null);
                setWorkflow('program');
              }}
              onDeleteDraft={(id: string) =>
                setProgramDrafts((prev) => prev.filter((d: any) => d.id !== id))
              }
              onNewReport={() => {
                setCurrentProgramDraft(null);
                setWorkflow('program');
              }}
              onReturnToMenu={() => setWorkflow('menu')}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', [
        'menu',
        'scan-form',
        'fill-form',
        'financial-report',
        'program-report',
      ])),
    },
  };
}
