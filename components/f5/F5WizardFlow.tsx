/**
 * F5 guided upload:
 * temp upload → region wizard (activities → demographics → questions) → review → save.
 * Each wizard step sends only the highlighted regions to `/api/f5/parse-snips`.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  WizardFullscreenShell,
  type WizardStepPill,
} from '../f4/WizardFullscreenShell';
import type {
  F5WizardKind,
  RegionSelection,
  WizardPageEntry,
  WizardViewerMode,
} from './wizard/types';
import { buildSnippetFilesFromSelections } from './wizard/buildSnippetFiles';
import { f5ParseSnips, f5Save, f5TempUpload } from './wizard/f5WizardApi';
import { useF5WizardViewerPages } from './wizard/useF5WizardViewerPages';
import { useF5WizardDrag, type WizardDragState } from './wizard/useF5WizardDrag';
import { normalizeActivityName } from '../../lib/f5/f5SaveNormalize';

export type F5WizardFlowStep =
  | 'upload'
  | 'preparing'
  | 'wizard'
  | 'review'
  | 'saving'
  | 'done';

export type F5SummaryDraft = {
  report_date: string;
  reporting_person: string;
  positive_changes: string;
  negative_results: string;
  unexpected_results: string;
  lessons_learned: string;
  suggestions: string;
};

export type F5ReachDraft = {
  activity_name: string;
  activity_goal: string;
  category?: string | null;
  location: string;
  start_date: string;
  end_date: string;
  individual_count: number | null;
  household_count: number | null;
  male_count: number | null;
  female_count: number | null;
  under18_male: number | null;
  under18_female: number | null;
  people_with_disabilities: number | null;
  is_draft?: boolean;
};

type Props = {
  project: {
    id: string;
    err_id?: string;
    project_objectives?: string | null;
    locality?: string | null;
    state?: string | null;
  };
  onReturnToMenu: () => void;
  /** When set with autoStart, skip the file-picker UI and begin immediately */
  initialFile?: File | null;
  autoStart?: boolean;
  /** Called when autoStart upload fails so the parent can return to file selection */
  onAutoStartFailed?: (message: string) => void;
  /** Lets the parent widen its modal while the wizard / review is shown */
  onStepChange?: (step: F5WizardFlowStep) => void;
};

const EMPTY_SELECTIONS: Record<F5WizardKind, RegionSelection[]> = {
  activities: [],
  demographics: [],
  questions: [],
};

const STEP_LABEL: Record<F5WizardKind, string> = {
  activities: 'activities',
  demographics: 'demographics',
  questions: 'questions',
};

const inputCls =
  'mt-1 w-full rounded-lg border border-white/10 bg-[#122038] px-3 py-2 text-sm text-white';
const cellInputCls =
  'w-full rounded border border-white/10 bg-[#122038] px-2 py-1 text-white';
const ghostBtn =
  'rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-[#a8b6cc] hover:bg-white/5';
const primaryBtn =
  'rounded-xl bg-brand-orange text-[#152238] text-sm font-bold px-4 py-2.5 disabled:opacity-40';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyReachRow(): F5ReachDraft {
  return {
    activity_name: '',
    activity_goal: '',
    category: null,
    location: '',
    start_date: '',
    end_date: '',
    individual_count: null,
    household_count: null,
    male_count: null,
    female_count: null,
    under18_male: null,
    under18_female: null,
    people_with_disabilities: null,
    is_draft: true,
  };
}

function emptySummary(): F5SummaryDraft {
  return {
    report_date: todayIso(),
    reporting_person: '',
    positive_changes: '',
    negative_results: '',
    unexpected_results: '',
    lessons_learned: '',
    suggestions: '',
  };
}

function numOrNull(raw: string): number | null {
  if (raw === '') return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Merge demographics rows into reach rows by activity_name (fall back to row order). */
function mergeDemographicsIntoReach(prev: F5ReachDraft[], incoming: any[]): F5ReachDraft[] {
  const next = [...prev];
  for (let i = 0; i < incoming.length; i++) {
    const row = incoming[i] || {};
    const targetName = normalizeActivityName(row.activity_name);
    let idx = targetName
      ? next.findIndex((r) => normalizeActivityName(r?.activity_name) === targetName)
      : -1;
    if (idx < 0 && i < next.length) idx = i;
    if (idx < 0) {
      next.push({
        ...emptyReachRow(),
        activity_name: row.activity_name ? String(row.activity_name) : '',
        male_count: row.male_count ?? null,
        female_count: row.female_count ?? null,
        under18_male: row.under18_male ?? null,
        under18_female: row.under18_female ?? null,
        people_with_disabilities: row.people_with_disabilities ?? null,
      });
      continue;
    }
    const existing = next[idx] || emptyReachRow();
    next[idx] = {
      ...existing,
      male_count: row.male_count ?? existing.male_count ?? null,
      female_count: row.female_count ?? existing.female_count ?? null,
      under18_male: row.under18_male ?? existing.under18_male ?? null,
      under18_female: row.under18_female ?? existing.under18_female ?? null,
      people_with_disabilities:
        row.people_with_disabilities ?? existing.people_with_disabilities ?? null,
    };
  }
  return next;
}

export default function F5WizardFlow({
  project,
  onReturnToMenu,
  initialFile = null,
  autoStart = false,
  onAutoStartFailed,
  onStepChange,
}: Props) {
  const [step, setStep] = useState<F5WizardFlowStep>(
    autoStart && initialFile ? 'preparing' : 'upload'
  );
  const [file, setFile] = useState<File | null>(initialFile);
  const [error, setError] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState('');

  const [summary, setSummary] = useState<F5SummaryDraft | null>(null);
  const [reach, setReach] = useState<F5ReachDraft[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);

  // wizard
  const [wizardLoading, setWizardLoading] = useState<F5WizardKind | null>(null);
  const [wizardProgress, setWizardProgress] = useState({
    activities: false,
    demographics: false,
    questions: false,
  });
  const [wizardExpanded, setWizardExpanded] = useState(false);
  const [wizardZoom, setWizardZoom] = useState(1);
  const [viewerMode, setViewerMode] = useState<WizardViewerMode>('unsupported');
  const [wizardPages, setWizardPages] = useState<WizardPageEntry[]>([]);
  const [isRenderingPages, setIsRenderingPages] = useState(false);
  const [selectionByKind, setSelectionByKind] =
    useState<Record<F5WizardKind, RegionSelection[]>>(EMPTY_SELECTIONS);
  const [dragging, setDragging] = useState<WizardDragState>(null);

  const autoStarted = useRef(false);
  const saveInFlight = useRef(false);
  const wizardViewerScrollRef = useRef<HTMLDivElement | null>(null);
  const wizardPageWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggingRef = useRef<WizardDragState>(null);

  const expectedKind: F5WizardKind = !wizardProgress.activities
    ? 'activities'
    : !wizardProgress.demographics
      ? 'demographics'
      : 'questions';
  const wizardKindRef = useRef<F5WizardKind>(expectedKind);
  wizardKindRef.current = expectedKind;

  useEffect(() => {
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Parent can restore its normal modal width when this flow goes away
  useEffect(() => {
    return () => onStepChange?.('upload');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  // Local preview URL for rendering (avoids cross-origin fetches)
  useEffect(() => {
    if (!file) {
      setObjectUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const viewerUrl = objectUrl || signedUrl || '';

  useF5WizardViewerPages({
    active: step === 'wizard',
    fileUrl: viewerUrl,
    file,
    tempKey,
    setViewerMode,
    setWizardPages,
    setIsRenderingPages,
  });

  const { startDragOnPage } = useF5WizardDrag({
    active: step === 'wizard',
    wizardKindRef,
    wizardPageWrapRefs,
    wizardViewerScrollRef,
    draggingRef,
    setDragging,
    setSelectionByKind,
  });

  const resetWizardState = () => {
    setSelectionByKind({ activities: [], demographics: [], questions: [] });
    setWizardProgress({ activities: false, demographics: false, questions: false });
    setWizardExpanded(false);
    setWizardZoom(1);
  };

  const runUpload = useCallback(
    async (fileOverride?: File | null) => {
      const selected = fileOverride ?? file;
      if (!selected) {
        setError('Choose a PDF or image first');
        return;
      }
      setFile(selected);
      setError('');
      setStep('preparing');
      try {
        const up = await f5TempUpload(project.id, selected);
        setTempKey(up.file_key_temp);
        setSignedUrl(up.signed_url);
        setSummary(emptySummary());
        setReach([]);
        resetWizardState();
        setIsRenderingPages(true);
        setStep('wizard');
      } catch (e: any) {
        console.error(e);
        const msg = e?.message || 'Upload failed';
        setError(msg);
        if (autoStart && onAutoStartFailed) {
          onAutoStartFailed(msg);
          return;
        }
        setStep('upload');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, project.id, autoStart, onAutoStartFailed]
  );

  useEffect(() => {
    if (!autoStart || !initialFile || autoStarted.current) return;
    autoStarted.current = true;
    void runUpload(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialFile]);

  const parseSnips = async (kind: F5WizardKind, files: File[]) => {
    if (kind !== expectedKind) return;
    if (!files.length) {
      setError('Highlight at least one region first.');
      return;
    }
    setError('');
    setWizardLoading(kind);
    try {
      const form = new FormData();
      form.append('kind', kind);
      form.append('project_id', project.id);
      files.forEach((f) => form.append('files', f));

      const json = await f5ParseSnips(form);

      if (kind === 'activities') {
        const rows = Array.isArray(json.reach) ? (json.reach as any[]) : [];
        setReach(
          rows.map((r) => ({
            activity_name: r.activity_name != null ? String(r.activity_name) : '',
            activity_goal: r.activity_goal != null ? String(r.activity_goal) : '',
            category: r.category != null ? String(r.category) : null,
            location: r.location != null ? String(r.location) : '',
            start_date: r.start_date != null ? String(r.start_date) : '',
            end_date: r.end_date != null ? String(r.end_date) : '',
            individual_count: r.individual_count != null ? Number(r.individual_count) : null,
            household_count: r.household_count != null ? Number(r.household_count) : null,
            male_count: null,
            female_count: null,
            under18_male: null,
            under18_female: null,
            people_with_disabilities: null,
            is_draft: true,
          }))
        );
        setWizardProgress((p) => ({ ...p, activities: true }));
      } else if (kind === 'demographics') {
        const rows = Array.isArray(json.reach) ? (json.reach as any[]) : [];
        setReach((prev) => mergeDemographicsIntoReach(prev, rows));
        setWizardProgress((p) => ({ ...p, demographics: true }));
      } else {
        setSummary((prev) => {
          const base = prev || emptySummary();
          const pick = (v: unknown, fallback: string) =>
            v != null && String(v).trim() !== '' ? String(v) : fallback;
          return {
            ...base,
            positive_changes: pick(json.positive_changes, base.positive_changes),
            negative_results: pick(json.negative_results, base.negative_results),
            unexpected_results: pick(json.unexpected_results, base.unexpected_results),
            lessons_learned: pick(json.lessons_learned, base.lessons_learned),
            suggestions: pick(json.suggestions, base.suggestions),
            reporting_person: pick(json.reporting_person, base.reporting_person),
          };
        });
        setWizardProgress((p) => ({ ...p, questions: true }));
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Could not read the selected regions. Try again.');
    } finally {
      setWizardLoading(null);
    }
  };

  const runWizardStep = async (kind: F5WizardKind) => {
    try {
      const files = await buildSnippetFilesFromSelections(
        kind,
        wizardPages,
        selectionByKind[kind] ?? []
      );
      await parseSnips(kind, files);
    } catch (e: any) {
      setError(e?.message || 'Could not prepare the selected regions');
    }
  };

  // ---- review helpers ----
  const updateReach = (index: number, patch: Partial<F5ReachDraft>) =>
    setReach((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const addReach = () => setReach((prev) => [...prev, emptyReachRow()]);

  const removeReach = (index: number) =>
    setReach((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!summary || saveInFlight.current) return;
    if (!summary.report_date) {
      setError('Report date is required');
      return;
    }
    setError('');
    saveInFlight.current = true;
    setStep('saving');
    try {
      const out = await f5Save({
        project_id: project.id,
        summary,
        reach,
        file_key_temp: tempKey,
      });
      setReportId(out.report_id != null ? String(out.report_id) : null);
      setStep('done');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Save failed');
      setStep('review');
    } finally {
      saveInFlight.current = false;
    }
  };

  const startOver = () => {
    setStep('upload');
    setSummary(null);
    setReach([]);
    setTempKey('');
    setSignedUrl(null);
    setWizardPages([]);
    resetWizardState();
    setError('');
  };

  // ---------------- render ----------------
  const errorBox = error ? (
    <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
      {error}
    </div>
  ) : null;

  if (step === 'done') {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-lg font-bold text-white mb-1">F5 report submitted</p>
        <p className="text-sm text-[#a8b6cc]">
          {reportId != null ? 'Program report created for this project.' : 'Report saved.'}
        </p>
        <button type="button" onClick={onReturnToMenu} className={primaryBtn}>
          Back
        </button>
      </div>
    );
  }

  if (step === 'preparing' || step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#a8b6cc]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
        <p className="text-sm">
          {step === 'preparing' ? 'Uploading your file…' : 'Saving report…'}
        </p>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div>
          <p className="app-section-label mb-1">F5 · Guided upload</p>
          <h3 className="text-lg font-bold text-white mb-1">Upload program report</h3>
          <p className="text-sm text-[#a8b6cc] mb-0">
            Upload your report, highlight the activities, demographics and questions, then review
            and submit.
          </p>
        </div>
        {errorBox}
        <input
          type="file"
          accept="image/*,.pdf,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-[#a8b6cc] file:mr-3 file:rounded-lg file:border-0 file:bg-brand-orange file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#152238]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void runUpload()}
            disabled={!file}
            className={primaryBtn}
          >
            Upload & scan
          </button>
          <button type="button" onClick={onReturnToMenu} className={ghostBtn}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'wizard') {
    const pills: WizardStepPill[] = [
      {
        id: 'activities',
        label: '1) Activities',
        completed: wizardProgress.activities,
        isCurrent: expectedKind === 'activities',
      },
      {
        id: 'demographics',
        label: '2) Demographics',
        completed: wizardProgress.demographics,
        isCurrent: expectedKind === 'demographics',
      },
      {
        id: 'questions',
        label: '3) Questions',
        completed: wizardProgress.questions,
        isCurrent: expectedKind === 'questions',
      },
    ];
    return (
      <WizardFullscreenShell
        title="F5 program report"
        steps={pills}
        expectedStepId={expectedKind}
        expectedStepLabel={STEP_LABEL[expectedKind]}
        selectionCount={selectionByKind[expectedKind].length}
        wizardLoading={wizardLoading != null}
        processDisabled={
          selectionByKind[expectedKind].length === 0 ||
          (expectedKind === 'demographics' && reach.length === 0)
        }
        clearDisabled={selectionByKind[expectedKind].length === 0}
        onProcess={() => void runWizardStep(expectedKind)}
        onClearSelections={() =>
          setSelectionByKind((prev) => ({ ...prev, [expectedKind]: [] }))
        }
        toolbarExtra={
          expectedKind !== 'activities' ? (
            <span className="text-[11px] text-[#8a97ab] whitespace-nowrap">
              Rows: {reach.length}
            </span>
          ) : undefined
        }
        expanded={wizardExpanded}
        onExpandedChange={setWizardExpanded}
        zoom={wizardZoom}
        onZoomChange={setWizardZoom}
        viewerMode={viewerMode}
        isRenderingPages={isRenderingPages}
        wizardPages={wizardPages}
        currentSelections={selectionByKind[expectedKind]}
        dragging={dragging}
        startDragOnPage={startDragOnPage}
        wizardViewerScrollRef={wizardViewerScrollRef}
        wizardPageWrapRefs={wizardPageWrapRefs}
        errorBanner={errorBox}
        unsupportedBanner={
          viewerMode === 'unsupported' && !isRenderingPages ? (
            <div className="shrink-0 text-sm text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
              This file type cannot be shown for highlighting. Please upload a PDF or image.
            </div>
          ) : undefined
        }
        onBack={() => {
          setWizardExpanded(false);
          onReturnToMenu();
        }}
        backLabel="Cancel"
        onContinue={() => {
          setWizardExpanded(false);
          setError('');
          setStep('review');
        }}
        continueDisabled={
          !wizardProgress.activities || !wizardProgress.demographics || !wizardProgress.questions
        }
      />
    );
  }

  // review
  if (!summary) return null;

  const reviewActions = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!summary.report_date}
        className={`${primaryBtn} w-full`}
      >
        Submit report
      </button>
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setError('');
            setStep('wizard');
          }}
          className={`${ghostBtn} px-1.5 py-2 text-xs leading-tight`}
        >
          Back to highlighting
        </button>
        <button
          type="button"
          onClick={startOver}
          className={`${ghostBtn} px-1.5 py-2 text-xs leading-tight`}
        >
          Start over
        </button>
        <button
          type="button"
          onClick={onReturnToMenu}
          className={`${ghostBtn} px-1.5 py-2 text-xs leading-tight`}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const numCell = (
    row: F5ReachDraft,
    i: number,
    key:
      | 'individual_count'
      | 'household_count'
      | 'male_count'
      | 'female_count'
      | 'under18_male'
      | 'under18_female'
      | 'people_with_disabilities'
  ) => (
    <td className="px-2 py-1.5">
      <input
        type="number"
        min={0}
        value={row[key] ?? ''}
        onChange={(e) => updateReach(i, { [key]: numOrNull(e.target.value) })}
        className={`${cellInputCls} w-20`}
      />
    </td>
  );

  return (
    <div className="space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div>
        <p className="app-section-label mb-1">F5 · Review</p>
        <h3 className="text-lg font-bold text-white mb-1">Check the extracted details</h3>
        <p className="text-sm text-[#a8b6cc] mb-0">Edit fields as needed, then submit.</p>
      </div>

      {/* Keep primary actions visible without scrolling behind the bottom nav */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-[#122038]/95 backdrop-blur-sm border-b border-white/10">
        {reviewActions}
      </div>

      {errorBox}

      {signedUrl && (
        <a
          href={signedUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-semibold text-brand-orange hover:underline"
        >
          Open original file
        </a>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-[#8a97ab]">
          Report date *
          <input
            type="date"
            value={summary.report_date || ''}
            max={todayIso()}
            onChange={(e) => setSummary({ ...summary, report_date: e.target.value })}
            className={inputCls}
          />
        </label>
        <label className="block text-xs text-[#8a97ab]">
          Reporting person
          <input
            value={summary.reporting_person || ''}
            onChange={(e) => setSummary({ ...summary, reporting_person: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between bg-[#1c2d48] px-3 py-2">
          <p className="text-xs font-semibold text-[#a8b6cc] mb-0">Activities</p>
          <button type="button" onClick={addReach} className="text-xs font-semibold text-brand-orange">
            + Add row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1280px]">
            <thead className="text-[#8a97ab]">
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 text-start">Activity</th>
                <th className="px-2 py-2 text-start">Goal</th>
                <th className="px-2 py-2 text-start">Location</th>
                <th className="px-2 py-2 text-start">Start</th>
                <th className="px-2 py-2 text-start">End</th>
                <th className="px-2 py-2 text-start">Individuals</th>
                <th className="px-2 py-2 text-start">Families</th>
                <th className="px-2 py-2 text-start">Male</th>
                <th className="px-2 py-2 text-start">Female</th>
                <th className="px-2 py-2 text-start">Under 18 M</th>
                <th className="px-2 py-2 text-start">Under 18 F</th>
                <th className="px-2 py-2 text-start">Disabilities</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {reach.map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-2 py-1.5">
                    <input
                      value={row.activity_name || ''}
                      onChange={(e) => updateReach(i, { activity_name: e.target.value })}
                      className={`${cellInputCls} w-40`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.activity_goal || ''}
                      onChange={(e) => updateReach(i, { activity_goal: e.target.value })}
                      className={`${cellInputCls} w-40`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.location || ''}
                      onChange={(e) => updateReach(i, { location: e.target.value })}
                      className={`${cellInputCls} w-32`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.start_date || ''}
                      onChange={(e) => updateReach(i, { start_date: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className={`${cellInputCls} w-28`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.end_date || ''}
                      onChange={(e) => updateReach(i, { end_date: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className={`${cellInputCls} w-28`}
                    />
                  </td>
                  {numCell(row, i, 'individual_count')}
                  {numCell(row, i, 'household_count')}
                  {numCell(row, i, 'male_count')}
                  {numCell(row, i, 'female_count')}
                  {numCell(row, i, 'under18_male')}
                  {numCell(row, i, 'under18_female')}
                  {numCell(row, i, 'people_with_disabilities')}
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeReach(i)}
                      className="text-[#8a97ab] hover:text-red-300"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {reach.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-4 text-center text-[#8a97ab]">
                    No activity rows yet. Add one manually or go back and re-run the activities
                    step.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(
        [
          ['positive_changes', 'Positive changes'],
          ['negative_results', 'Negative results'],
          ['unexpected_results', 'Unexpected results'],
          ['lessons_learned', 'Lessons learned'],
          ['suggestions', 'Suggestions'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-xs text-[#8a97ab]">
          {label}
          <textarea
            value={summary[key] || ''}
            onChange={(e) => setSummary({ ...summary, [key]: e.target.value })}
            rows={3}
            className={inputCls}
          />
        </label>
      ))}

    </div>
  );
}
