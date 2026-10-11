import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronRight, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AppShell from '../../../components/layout/AppShell';
import ProjectIndex, { type ProjectRow } from '../../../components/projects/ProjectIndex';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { HomeCard } from '../../../components/home/HomeSection';
import F4WizardFlow from '../../../components/f4/F4WizardFlow';
import F4ReportView from '../../../components/f4/F4ReportView';
import ReportingForm from '../../../components/forms/ReportForm/ReportingForm';
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

function formatReportLabel(r: any) {
  const date = r.report_date ? String(r.report_date).slice(0, 10) : null;
  const created = r.created_at ? String(r.created_at).slice(0, 10) : null;
  return date || created || `Report #${r.id}`;
}

function formatUsd(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function F4F5ReportingIndexPage() {
  const { ready, token } = useRequireAuth();
  const { t, i18n } = useTranslation('menu');
  const router = useRouter();
  const [view, setView] = useState<'hub' | 'pick-project'>('hub');
  const [action, setAction] = useState<ReportingAction | null>(null);
  const [f4ModalProject, setF4ModalProject] = useState<ProjectRow | null>(null);
  const [f4ModalStep, setF4ModalStep] = useState<'choice' | 'upload' | 'view'>(
    'choice'
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [f4WizardWide, setF4WizardWide] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [manualReportId, setManualReportId] = useState<string | null>(null);
  const [existingReports, setExistingReports] = useState<any[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAction = (next: ReportingAction) => {
    setAction(next);
    setView('pick-project');
  };

  const closeF4Modal = () => {
    setF4ModalProject(null);
    setF4ModalStep('choice');
    setPendingFile(null);
    setUploadError('');
    setViewReportId(null);
    setManualReportId(null);
    setExistingReports([]);
    setExistingError('');
    setExistingLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const backToChoice = () => {
    setF4ModalStep('choice');
    setViewReportId(null);
    setManualReportId(null);
  };

  const goUploadNew = () => {
    if (!f4ModalProject || !action) return;
    if (action === 'f4-manual') {
      setManualReportId(uuidv4());
      setF4ModalStep('upload');
      return;
    }
    // AI: open native file picker; stay in this modal
    setUploadError('');
    fileInputRef.current?.click();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setPendingFile(file);
    setUploadError('');
    // keep modal on choice so selected file + Upload & scan show in-place
    setF4ModalStep('choice');
  };

  const startScan = () => {
    if (!pendingFile) return;
    setUploadError('');
    setF4ModalStep('upload');
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openExistingReport = (reportId: string | number) => {
    setViewReportId(String(reportId));
    setF4ModalStep('view');
  };

  const onUploadFinished = () => {
    setF4ModalStep('choice');
    setPendingFile(null);
    setUploadError('');
    setManualReportId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (f4ModalProject && token) {
      fetch(
        `/api/f4/project-reports?project_id=${encodeURIComponent(f4ModalProject.id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.reports) setExistingReports(data.reports);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (!f4ModalProject || !token) return;
    let cancelled = false;
    (async () => {
      setExistingLoading(true);
      setExistingError('');
      try {
        const res = await fetch(
          `/api/f4/project-reports?project_id=${encodeURIComponent(f4ModalProject.id)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load reports');
        if (!cancelled) setExistingReports(data.reports || []);
      } catch (e: any) {
        if (!cancelled) {
          setExistingError(e?.message || 'Failed to load reports');
          setExistingReports([]);
        }
      } finally {
        if (!cancelled) setExistingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [f4ModalProject, token]);

  const onSelectProject = (project: ProjectRow) => {
    if (!action) return;
    if (action === 'f4-ai' || action === 'f4-manual') {
      setF4ModalProject(project);
      setF4ModalStep('choice');
      setPendingFile(null);
      setUploadError('');
      setViewReportId(null);
      setManualReportId(null);
      setExistingReports([]);
      setExistingError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    router.push(`/f-system/f4-f5/${project.id}?action=${action}`);
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
              closeF4Modal();
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
          useProdDb={action.startsWith('f4')}
          onSelect={onSelectProject}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.docx,application/pdf"
          className="hidden"
          onChange={onFilePicked}
        />

        {f4ModalProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1828]/85 backdrop-blur-sm p-4"
            onClick={f4ModalStep === 'choice' ? closeF4Modal : undefined}
            role="presentation"
          >
            <div
              className={`app-panel w-full shadow-xl ${
                f4ModalStep === 'choice'
                  ? 'max-w-sm p-5'
                  : f4WizardWide
                    ? 'max-w-5xl max-h-[92vh] overflow-y-auto p-4'
                    : 'max-w-lg max-h-[90vh] overflow-y-auto p-5'
              }`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="f4-choice-title"
            >
              {f4ModalStep === 'choice' && (
                <>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="app-section-label mb-1">F4 · Financial</p>
                      <h3
                        id="f4-choice-title"
                        className="text-lg font-bold text-white leading-snug mb-0"
                      >
                        What would you like to do?
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={closeF4Modal}
                      className="shrink-0 rounded-lg p-1.5 text-[#8a97ab] hover:text-white hover:bg-white/5"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {action === 'f4-ai' && pendingFile ? (
                    <div className="mb-4 space-y-3">
                      <div className="rounded-xl border border-white/10 bg-[#152238] px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a97ab] mb-0.5">
                          File selected
                        </p>
                        <p className="text-sm font-semibold text-white mb-0 truncate">
                          {pendingFile.name}
                        </p>
                      </div>
                      {uploadError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
                          {uploadError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={startScan}
                        className="w-full rounded-xl bg-brand-orange text-[#152238] text-sm font-bold py-3 px-4 hover:bg-[#ffb88a]"
                      >
                        Upload & scan
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={goUploadNew}
                          className="flex-1 rounded-xl border border-white/15 text-white text-sm font-semibold py-2.5"
                        >
                          Change file
                        </button>
                        <button
                          type="button"
                          onClick={clearPendingFile}
                          className="flex-1 rounded-xl border border-white/15 text-[#a8b6cc] text-sm font-semibold py-2.5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={goUploadNew}
                      className="w-full rounded-xl bg-brand-orange text-[#152238] text-sm font-bold py-3 px-4 hover:bg-[#ffb88a] mb-4"
                    >
                      Upload new
                    </button>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a97ab] mb-2">
                      Existing reports
                    </p>
                    {existingLoading && (
                      <p className="text-sm text-[#a8b6cc]">Loading reports…</p>
                    )}
                    {existingError && (
                      <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
                        {existingError}
                      </div>
                    )}
                    {!existingLoading &&
                      !existingError &&
                      existingReports.length === 0 && (
                        <p className="text-sm text-[#a8b6cc]">
                          No F4 reports yet for this project.
                        </p>
                      )}
                    {!existingLoading && existingReports.length > 0 && (
                      <ul className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
                        {existingReports.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => openExistingReport(r.id)}
                              className="w-full text-left rounded-xl border border-white/10 bg-[#152238] px-3 py-2.5 hover:border-brand-orange/50 hover:bg-[#1a2d4a] transition-colors"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-white mb-0.5">
                                    {formatReportLabel(r)}
                                  </span>
                                  <span className="block text-xs text-[#8a97ab]">
                                    Expenses: {formatUsd(r.total_expenses)}
                                    {r.review_status
                                      ? ` · ${r.review_status}`
                                      : ''}
                                  </span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-[#8a97ab]" />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {f4ModalStep === 'upload' && action === 'f4-ai' && pendingFile && (
                <F4WizardFlow
                  key={pendingFile.name + pendingFile.lastModified}
                  project={f4ModalProject}
                  initialFile={pendingFile}
                  autoStart
                  onStepChange={(s) =>
                    setF4WizardWide(s === 'wizard' || s === 'review')
                  }
                  onReturnToMenu={onUploadFinished}
                  onAutoStartFailed={(msg) => {
                    setUploadError(msg);
                    setF4ModalStep('choice');
                  }}
                />
              )}

              {f4ModalStep === 'upload' &&
                action === 'f4-manual' &&
                manualReportId && (
                  <ReportingForm
                    errId={f4ModalProject.err_id || ''}
                    reportId={manualReportId}
                    project={f4ModalProject as any}
                    onReturnToMenu={onUploadFinished}
                    onSubmitAnotherForm={() => setManualReportId(uuidv4())}
                    initialDraft={null}
                  />
                )}

              {f4ModalStep === 'view' && viewReportId && token && (
                <F4ReportView
                  reportId={viewReportId}
                  token={token}
                  onBack={backToChoice}
                />
              )}
            </div>
          </div>
        )}
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
