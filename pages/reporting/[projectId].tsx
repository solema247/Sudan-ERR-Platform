import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import ReportingForm from '../../components/forms/ReportForm/ReportingForm';
import ScanForm from '../scan-form';
import ProgramReportForm from '../../components/forms/ProgramReportForm/ReportingForm';
import FinancialReportDrafts from '../../components/forms/FinancialReportForm/FinancialReportDrafts';
import ProgramReportDrafts from '../../components/forms/ProgramReportForm/ProgramReportDrafts';
import { newSupabase } from '../../services/newSupabaseClient';
import { v4 as uuidv4 } from 'uuid';

type Workflow = 'menu' | 'fill' | 'scan' | 'program' | 'drafts';

export default function ReportingProjectPage() {
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
        const res = await fetch(`/api/get-projects?id=${encodeURIComponent(projectId)}&status=all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      <AppShell title="Reporting">
        <p className="text-gray-500 text-sm">Loading…</p>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title={t('reporting', 'Reporting')}>
        <p className="text-gray-500 text-sm">Loading project…</p>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title={t('reporting', 'Reporting')}>
        <p className="text-sm text-red-600 mb-4">Project not found or not accessible.</p>
        <button
          type="button"
          className="text-brand-deep underline text-sm"
          onClick={() => router.push('/reporting')}
        >
          Back to projects
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('reporting', 'Reporting')}>
      <div className="mb-5 app-panel p-4">
        <button
          type="button"
          onClick={() => (workflow === 'menu' ? router.push('/reporting') : setWorkflow('menu'))}
          className="text-xs font-semibold text-brand-deep hover:underline"
        >
          {workflow === 'menu' ? t('selectDifferentProject', 'Choose another project') : t('backToReportTypes', 'Back')}
        </button>
        <h2 className="mt-2 font-bold text-ink text-base leading-snug">
          {project.project_objectives}
        </h2>
        <p className="text-xs text-ink-muted mt-1 mb-0">
          {[project.locality, project.state].filter(Boolean).join(' · ')}
        </p>
      </div>

      {workflow === 'menu' && (
        <div className="space-y-2">
          <p className="app-section-label mb-2">{t('selectReportType', 'Actions')}</p>
          {[
            { key: 'fill' as const, label: t('reportFillForm', 'Fill financial report'), action: openFill, primary: true },
            {
              key: 'scan' as const,
              label: t('reportScanForm', 'Scan financial report'),
              action: () => setWorkflow('scan'),
              primary: false,
            },
            {
              key: 'program' as const,
              label: t('reportProgramForm', 'Program report'),
              action: () => {
                setCurrentProgramDraft(null);
                setWorkflow('program');
              },
              primary: false,
            },
            {
              key: 'drafts' as const,
              label: t('viewDrafts', 'View drafts'),
              action: async () => {
                await fetchDrafts();
                setWorkflow('drafts');
              },
              primary: false,
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.action}
              className={item.primary ? 'app-action-primary' : 'app-action'}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {workflow === 'fill' && (
        <div className="app-panel p-4">
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
        <div className="app-panel p-4">
          <ScanForm project={project} onReturnToMenu={() => setWorkflow('menu')} />
        </div>
      )}

      {workflow === 'program' && (
        <div className="app-panel p-4">
          <ProgramReportForm
            project={project}
            onReturnToMenu={() => setWorkflow('menu')}
            onSubmitAnotherForm={() => setWorkflow('program')}
            initialDraft={currentProgramDraft}
          />
        </div>
      )}

      {workflow === 'drafts' && (
        <div className="space-y-6 app-panel p-4">
          <div>
            <h3 className="font-semibold mb-3">{t('financial.draftsTitle', 'Financial drafts')}</h3>
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
            <h3 className="font-semibold mb-3">{t('program.draftsTitle', 'Program drafts')}</h3>
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
      ...(await serverSideTranslations(locale || 'ar', ['menu', 'scan-form', 'fill-form', 'financial-report', 'program-report'])),
    },
  };
}
