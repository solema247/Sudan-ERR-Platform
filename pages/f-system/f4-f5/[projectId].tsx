import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronRight, X } from 'lucide-react';
import AppShell from '../../../components/layout/AppShell';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import ReportingForm from '../../../components/forms/ReportForm/ReportingForm';
import ScanCustomForm from '../../scan-custom-form';
import ProgramReportForm from '../../../components/forms/ProgramReportForm/ReportingForm';
import F4WizardFlow from '../../../components/f4/F4WizardFlow';
import F4ReportView from '../../../components/f4/F4ReportView';
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

type Workflow =
  | 'menu'
  | 'f4-choice'
  | 'f4-upload'
  | 'f4-view'
  | 'fill'
  | 'scan'
  | 'program'
  | 'program-scan'
  | 'drafts';

type F4UploadMode = 'scan' | 'fill';

function workflowFromAction(action: string | string[] | undefined): Workflow | null {
  const a = Array.isArray(action) ? action[0] : action;
  // Hub already showed Upload new / Existing modal before navigating here
  if (a === 'f4-ai') return 'scan';
  if (a === 'f4-manual') return 'fill';
  if (a === 'f5-ai') return 'program-scan';
  if (a === 'f5-manual') return 'program';
  return null;
}

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

export default function F4F5ProjectPage() {
  const router = useRouter();
  const { projectId, action, reportId } = router.query;
  const { ready, token } = useRequireAuth();
  const { t } = useTranslation('menu');
  const [project, setProject] = useState<any>(null);
  const [workflow, setWorkflow] = useState<Workflow>('menu');
  const [actionApplied, setActionApplied] = useState(false);
  const [f4UploadMode, setF4UploadMode] = useState<F4UploadMode>('scan');
  const [existingReports, setExistingReports] = useState<any[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState('');
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [f4WizardWide, setF4WizardWide] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [financialDrafts, setFinancialDrafts] = useState([]);
  const [programDrafts, setProgramDrafts] = useState([]);
  const [currentProjectDraft, setCurrentProjectDraft] = useState(null);
  const [currentProgramDraft, setCurrentProgramDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportIdStr = Array.isArray(reportId) ? reportId[0] : reportId;

  useEffect(() => {
    if (!ready || !token || !projectId || typeof projectId !== 'string') return;
    (async () => {
      setLoading(true);
      try {
        const actionStr = Array.isArray(action) ? action[0] : action;
        const useProd =
          (typeof actionStr === 'string' && actionStr.startsWith('f4')) ||
          Boolean(reportIdStr);
        const params = new URLSearchParams({
          id: projectId,
          status: 'all',
        });
        if (useProd) params.set('db', 'prod');
        const res = await fetch(`/api/get-projects?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProject((data.projects || [])[0] || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, token, projectId, action, reportIdStr]);

  // Open the hub-selected action once project is ready
  useEffect(() => {
    if (!project || actionApplied || loading) return;
    if (reportIdStr) {
      setViewReportId(String(reportIdStr));
      setWorkflow('f4-view');
      setActionApplied(true);
      return;
    }
    const next = workflowFromAction(action);
    if (next === 'fill') {
      setF4UploadMode('fill');
      setActiveReportId(uuidv4());
      setCurrentProjectDraft(null);
      setWorkflow('fill');
      setActionApplied(true);
    } else if (next === 'scan') {
      setF4UploadMode('scan');
      setWorkflow('scan');
      setActionApplied(true);
    } else if (next === 'program') {
      setCurrentProgramDraft(null);
      setWorkflow('program');
      setActionApplied(true);
    } else if (next === 'program-scan') {
      setWorkflow('program-scan');
      setActionApplied(true);
    }
  }, [project, action, actionApplied, loading, reportIdStr]);

  // Load existing reports whenever the F4 choice modal opens
  useEffect(() => {
    if (workflow !== 'f4-choice' || !token || !projectId) return;
    let cancelled = false;
    (async () => {
      setExistingLoading(true);
      setExistingError('');
      try {
        const res = await fetch(
          `/api/f4/project-reports?project_id=${encodeURIComponent(String(projectId))}`,
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
  }, [workflow, token, projectId]);

  const openF4Upload = () => {
    if (f4UploadMode === 'fill') {
      setActiveReportId(uuidv4());
      setCurrentProjectDraft(null);
      setWorkflow('f4-upload');
      return;
    }
    setUploadError('');
    fileInputRef.current?.click();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setPendingFile(file);
    setUploadError('');
    setWorkflow('f4-choice');
  };

  const startScan = () => {
    if (!pendingFile) return;
    setUploadError('');
    setWorkflow('f4-upload');
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openExistingReport = (id: string | number) => {
    setViewReportId(String(id));
    setWorkflow('f4-view');
  };

  const finishF4Upload = () => {
    setViewReportId(null);
    setPendingFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setWorkflow('f4-choice');
  };

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

  const goBack = () => {
    if (workflow === 'menu') {
      router.push('/f-system/f4-f5');
      return;
    }
    if (workflow === 'f4-view' || workflow === 'f4-upload') {
      if (reportIdStr && workflow === 'f4-view') {
        router.push('/f-system/f4-f5');
        return;
      }
      setViewReportId(null);
      setWorkflow('f4-choice');
      return;
    }
    if (workflow === 'f4-choice') {
      setWorkflow('menu');
      return;
    }
    // Hub action: leave project page; local menu: return to project actions
    if (action && actionApplied) {
      router.push('/f-system/f4-f5');
      return;
    }
    if (workflow === 'scan' || (workflow === 'fill' && !currentProjectDraft)) {
      setWorkflow('f4-choice');
      return;
    }
    setWorkflow('menu');
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
          Back to reporting
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell title="F4 & F5 Reporting">
      <div className="mb-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange transition-colors mb-3"
        >
          <span className="rtl:rotate-180 inline-flex">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </span>
          {workflow === 'menu'
            ? t('selectDifferentProject', 'Back to reporting')
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

      {(workflow === 'menu' ||
        workflow === 'f4-choice' ||
        workflow === 'f4-upload') && (
        <section className="mb-6">
          <div className="flex items-center gap-1.5 mb-3 px-0.5">
            <h3 className="text-lg font-bold text-white leading-tight">
              {t('selectReportType', 'Actions')}
            </h3>
          </div>
          <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
              <HomeCard
                onClick={() => {
                  setF4UploadMode('scan');
                  setWorkflow('f4-choice');
                }}
                code="AI"
                title="Upload F4 with AI"
                subtitle="Scan a financial report"
                illustration={MouScene}
                wash="bg-brand-orangeSoft"
                size="md"
              />
              <HomeCard
                onClick={() => {
                  setF4UploadMode('fill');
                  setWorkflow('f4-choice');
                }}
                code="Manual"
                title="Upload F4 Manual Form"
                subtitle="Fill expenses by hand"
                illustration={ReportingScene}
                wash="bg-[#7B96C4]"
                size="md"
              />
              <HomeCard
                onClick={() => setWorkflow('program-scan')}
                code="AI"
                title="Upload F5 with AI"
                subtitle="Scan a program report"
                illustration={ApprovalsScene}
                wash="bg-brand-orangeSoft"
                size="md"
              />
              <HomeCard
                onClick={() => {
                  setCurrentProgramDraft(null);
                  setWorkflow('program');
                }}
                code="Manual"
                title="Upload F5 Manual Form"
                subtitle="Fill the program report"
                illustration={WorkPlanScene}
                wash="bg-[#7B96C4]"
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
                wash="bg-[#9BB0D4]"
                size="md"
              />
            </div>
          </div>
        </section>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.docx,application/pdf"
        className="hidden"
        onChange={onFilePicked}
      />

      {(workflow === 'f4-choice' ||
        workflow === 'f4-upload' ||
        workflow === 'f4-view') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1828]/85 backdrop-blur-sm p-4"
          onClick={workflow === 'f4-choice' ? () => setWorkflow('menu') : undefined}
          role="presentation"
        >
          <div
            className={`app-panel w-full shadow-xl ${
              workflow === 'f4-choice'
                ? 'max-w-sm p-5'
                : f4WizardWide
                  ? 'max-w-5xl max-h-[92vh] overflow-y-auto p-4'
                  : 'max-w-lg max-h-[90vh] overflow-y-auto p-5'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="f4-project-choice-title"
          >
            {workflow === 'f4-choice' && (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="app-section-label mb-1">F4 · Financial</p>
                    <h3
                      id="f4-project-choice-title"
                      className="text-lg font-bold text-white leading-snug mb-0"
                    >
                      What would you like to do?
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWorkflow('menu')}
                    className="shrink-0 rounded-lg p-1.5 text-[#8a97ab] hover:text-white hover:bg-white/5"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {f4UploadMode === 'scan' && pendingFile ? (
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
                        onClick={openF4Upload}
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
                    onClick={openF4Upload}
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
                    <ul className="max-h-56 overflow-y-auto space-y-2">
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

            {workflow === 'f4-upload' &&
              f4UploadMode === 'scan' &&
              pendingFile && (
                <F4WizardFlow
                  key={pendingFile.name + pendingFile.lastModified}
                  project={project}
                  initialFile={pendingFile}
                  autoStart
                  onStepChange={(s) =>
                    setF4WizardWide(s === 'wizard' || s === 'review')
                  }
                  onReturnToMenu={finishF4Upload}
                  onAutoStartFailed={(msg) => {
                    setUploadError(msg);
                    setWorkflow('f4-choice');
                  }}
                />
              )}

            {workflow === 'f4-upload' &&
              f4UploadMode === 'fill' &&
              activeReportId && (
                <ReportingForm
                  errId={project.err_id}
                  reportId={activeReportId}
                  project={project}
                  onReturnToMenu={finishF4Upload}
                  onSubmitAnotherForm={() => {
                    setActiveReportId(uuidv4());
                    setCurrentProjectDraft(null);
                  }}
                  initialDraft={currentProjectDraft}
                />
              )}

            {workflow === 'f4-view' && viewReportId && token && (
              <F4ReportView
                reportId={viewReportId}
                token={token}
                onBack={finishF4Upload}
              />
            )}
          </div>
        </div>
      )}

      {workflow === 'fill' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <ReportingForm
            errId={project.err_id}
            reportId={activeReportId}
            project={project}
            onReturnToMenu={goBack}
            onSubmitAnotherForm={openFill}
            initialDraft={currentProjectDraft}
          />
        </div>
      )}

      {workflow === 'scan' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <F4WizardFlow project={project} onReturnToMenu={goBack} />
        </div>
      )}

      {workflow === 'program' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <ProgramReportForm
            project={project}
            onReturnToMenu={goBack}
            onSubmitAnotherForm={() => setWorkflow('program')}
            initialDraft={currentProgramDraft}
          />
        </div>
      )}

      {workflow === 'program-scan' && (
        <div className="rounded-xl border border-white/10 bg-[#122038]/60 p-4">
          <ScanCustomForm
            project={project}
            onReturnToMenu={goBack}
            onSubmitAnotherForm={() => setWorkflow('program-scan')}
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
        'scanForm',
        'customScanForm',
        'fill-form',
        'financial-report',
        'program-report',
      ])),
    },
  };
}
