/**
 * F4 guided upload:
 * temp upload → region wizard (table → questions → receipts) → review → save.
 * Each wizard step sends only the highlighted regions to `/api/f4/parse-snips`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { F4ExpenseDraft, F4SummaryDraft } from '../../lib/f4/mapOcrToDrafts';
import {
  WizardFullscreenShell,
  type WizardStepPill,
} from './WizardFullscreenShell';
import type {
  RegionSelection,
  WizardKind,
  WizardPageEntry,
  WizardViewerMode,
} from './wizard/types';
import { buildSnippetFilesFromSelections } from './wizard/buildSnippetFiles';
import { f4ParseSnips, f4Save, f4TempUpload } from './wizard/f4WizardApi';
import { useF4WizardViewerPages } from './wizard/useF4WizardViewerPages';
import { useF4WizardDrag, type WizardDragState } from './wizard/useF4WizardDrag';

export type F4WizardFlowStep =
  | 'upload'
  | 'preparing'
  | 'wizard'
  | 'review'
  | 'saving'
  | 'done';

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
  onStepChange?: (step: F4WizardFlowStep) => void;
};

type ReceiptRow = {
  reference: string;
  amount_sdg: number | null;
  currency: string;
  missing: boolean;
};

const EMPTY_SELECTIONS: Record<WizardKind, RegionSelection[]> = {
  table: [],
  questions: [],
  receipts: [],
};

const STEP_LABEL: Record<WizardKind, string> = {
  table: 'expense table',
  questions: 'questions',
  receipts: 'receipts',
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

function recalcUsd(rows: F4ExpenseDraft[], rate: number | null): F4ExpenseDraft[] {
  if (!rate || rate <= 0 || !Number.isFinite(rate)) return rows;
  return rows.map((r) => {
    if (typeof r.expense_amount_sdg === 'number' && r.expense_amount_sdg > 0) {
      return { ...r, expense_amount: +(r.expense_amount_sdg / rate).toFixed(2) };
    }
    return r;
  });
}

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export default function F4WizardFlow({
  project,
  onReturnToMenu,
  initialFile = null,
  autoStart = false,
  onAutoStartFailed,
  onStepChange,
}: Props) {
  const [step, setStep] = useState<F4WizardFlowStep>(
    autoStart && initialFile ? 'preparing' : 'upload'
  );
  const [file, setFile] = useState<File | null>(initialFile);
  const [error, setError] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState('');

  const [fxRate, setFxRate] = useState('');
  const [summary, setSummary] = useState<F4SummaryDraft | null>(null);
  const [expenses, setExpenses] = useState<F4ExpenseDraft[]>([]);
  const [summaryId, setSummaryId] = useState<number | null>(null);

  // wizard
  const [wizardLoading, setWizardLoading] = useState<WizardKind | null>(null);
  const [wizardProgress, setWizardProgress] = useState({
    table: false,
    questions: false,
    receipts: false,
  });
  const [wizardExpanded, setWizardExpanded] = useState(false);
  const [wizardZoom, setWizardZoom] = useState(1);
  const [viewerMode, setViewerMode] = useState<WizardViewerMode>('unsupported');
  const [wizardPages, setWizardPages] = useState<WizardPageEntry[]>([]);
  const [isRenderingPages, setIsRenderingPages] = useState(false);
  const [selectionByKind, setSelectionByKind] =
    useState<Record<WizardKind, RegionSelection[]>>(EMPTY_SELECTIONS);
  const [dragging, setDragging] = useState<WizardDragState>(null);
  const [receiptStats, setReceiptStats] = useState<{ total: number; count: number } | null>(null);

  const autoStarted = useRef(false);
  const saveInFlight = useRef(false);
  const wizardViewerScrollRef = useRef<HTMLDivElement | null>(null);
  const wizardPageWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggingRef = useRef<WizardDragState>(null);

  const fx = useMemo(() => {
    const n = parseFloat(fxRate);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [fxRate]);
  const fxRef = useRef<number | null>(null);
  fxRef.current = fx;

  const expectedKind: WizardKind = !wizardProgress.table
    ? 'table'
    : !wizardProgress.questions
      ? 'questions'
      : 'receipts';
  const wizardKindRef = useRef<WizardKind>(expectedKind);
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

  useF4WizardViewerPages({
    active: step === 'wizard',
    fileUrl: viewerUrl,
    file,
    tempKey,
    setViewerMode,
    setWizardPages,
    setIsRenderingPages,
  });

  const { startDragOnPage } = useF4WizardDrag({
    active: step === 'wizard',
    wizardKindRef,
    wizardPageWrapRefs,
    wizardViewerScrollRef,
    draggingRef,
    setDragging,
    setSelectionByKind,
  });

  const resetWizardState = () => {
    setSelectionByKind({ table: [], questions: [], receipts: [] });
    setWizardProgress({ table: false, questions: false, receipts: false });
    setWizardExpanded(false);
    setWizardZoom(1);
    setReceiptStats(null);
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
        const up = await f4TempUpload(project.id, selected);
        setTempKey(up.file_key_temp);
        setSignedUrl(up.signed_url);
        setSummary({
          report_date: todayIso(),
          total_expenses: null,
          total_grant: null,
          total_other_sources: null,
          remainder: null,
          excess_expenses: null,
          surplus_use: null,
          lessons: null,
          training: null,
          beneficiaries: null,
          project_objectives: project.project_objectives || null,
          language: null,
          raw_ocr: null,
          receipt_check: { confirmed: false, receipts: [] },
        });
        setExpenses([]);
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
    [file, project.id, project.project_objectives, autoStart, onAutoStartFailed]
  );

  useEffect(() => {
    if (!autoStart || !initialFile || autoStarted.current) return;
    autoStarted.current = true;
    void runUpload(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialFile]);

  const parseSnips = async (kind: WizardKind, files: File[]) => {
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
      if (kind === 'receipts') {
        const amounts = expenses
          .map((r) => Number(r.expense_amount_sdg))
          .filter((n) => Number.isFinite(n) && n > 0);
        form.append('expense_amounts_sdg', JSON.stringify(amounts));
      }

      const json = await f4ParseSnips(form);

      if (kind === 'table') {
        const rows = Array.isArray(json.expenses) ? (json.expenses as any[]) : [];
        const mapped: F4ExpenseDraft[] = rows.map((ex) => ({
          expense_activity: ex.activity != null ? String(ex.activity).trim() : '',
          expense_description: ex.description != null ? String(ex.description) : '',
          expense_amount_sdg: ex.amount_value != null ? Number(ex.amount_value) : null,
          expense_amount: null,
          payment_date: ex.payment_date != null ? String(ex.payment_date) : '',
          payment_method: ex.payment_method != null ? String(ex.payment_method) : 'Bank Transfer',
          receipt_no: ex.receipt_no != null ? String(ex.receipt_no) : '',
          seller: ex.seller != null ? String(ex.seller) : '',
        }));
        setExpenses(recalcUsd(mapped, fxRef.current));
        setSummary((prev) => ({
          ...(prev as F4SummaryDraft),
          total_expenses: toNum(json.total_expenses_text) ?? prev?.total_expenses ?? null,
          total_grant: toNum(json.total_grant_text) ?? prev?.total_grant ?? null,
          total_other_sources:
            toNum(json.total_other_sources_text) ?? prev?.total_other_sources ?? null,
          remainder: toNum(json.remainder_text) ?? prev?.remainder ?? null,
        }));
        setWizardProgress((p) => ({ ...p, table: true }));
      } else if (kind === 'questions') {
        setSummary((prev) => ({
          ...(prev as F4SummaryDraft),
          excess_expenses: (json.excess_expenses as string | null) ?? prev?.excess_expenses ?? '',
          surplus_use: (json.surplus_use as string | null) ?? prev?.surplus_use ?? '',
          lessons: (json.lessons as string | null) ?? prev?.lessons ?? '',
          training: (json.training as string | null) ?? prev?.training ?? '',
        }));
        setWizardProgress((p) => ({ ...p, questions: true }));
      } else {
        const rec = Array.isArray(json.receipts) ? (json.receipts as any[]) : [];
        const receipts: ReceiptRow[] = rec.map((r, idx) => ({
          reference: r?.reference ? String(r.reference) : `receipt-${idx + 1}`,
          amount_sdg: r?.amount_value != null ? Number(r.amount_value) : null,
          currency: r?.currency ? String(r.currency) : 'SDG',
          missing: r?.amount_value == null,
        }));
        setReceiptStats({
          total: Number(json.receipts_total_sdg) || 0,
          count: Number(json.receipts_detected_count) || 0,
        });
        setSummary((prev) => ({
          ...(prev as F4SummaryDraft),
          receipt_check: { confirmed: false, receipts },
        }));
        setWizardProgress((p) => ({ ...p, receipts: true }));
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Could not read the selected regions. Try again.');
    } finally {
      setWizardLoading(null);
    }
  };

  const runWizardStep = async (kind: WizardKind) => {
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
  const totals = useMemo(() => {
    const sdg = expenses.reduce((s, e) => s + (Number(e.expense_amount_sdg) || 0), 0);
    const usd = expenses.reduce((s, e) => s + (Number(e.expense_amount) || 0), 0);
    return { sdg, usd };
  }, [expenses]);

  const receiptRows: ReceiptRow[] = Array.isArray(summary?.receipt_check?.receipts)
    ? (summary!.receipt_check!.receipts as ReceiptRow[])
    : [];
  const receiptsTotalSdg = receiptRows.reduce(
    (s, r) => (r?.missing ? s : s + (Number(r?.amount_sdg) || 0)),
    0
  );
  const receiptConfirmed = Boolean(summary?.receipt_check?.confirmed);

  const setReceiptRows = (rows: ReceiptRow[]) => {
    setSummary((s) =>
      s
        ? {
            ...s,
            receipt_check: { ...(s.receipt_check || { receipts: [] }), receipts: rows, confirmed: false },
          }
        : s
    );
  };

  const updateExpense = (index: number, patch: Partial<F4ExpenseDraft>) => {
    setExpenses((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, ...patch } : row));
      if (patch.expense_amount_sdg != null && fx) return recalcUsd(next, fx);
      return next;
    });
  };

  const addExpense = () => {
    setExpenses((prev) => [
      ...prev,
      {
        expense_activity: '',
        expense_description: '',
        expense_amount: null,
        expense_amount_sdg: null,
        payment_date: '',
        payment_method: 'Bank Transfer',
        receipt_no: '',
        seller: '',
      },
    ]);
  };

  const removeExpense = (index: number) =>
    setExpenses((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!summary || saveInFlight.current) return;
    if (!summary.report_date) {
      setError('Report date is required');
      return;
    }
    if (!fx) {
      setError('Enter the exchange rate (SDG per 1 USD) before saving');
      return;
    }
    if (!receiptConfirmed) {
      setError('Confirm the receipt check before saving');
      return;
    }
    setError('');
    saveInFlight.current = true;
    setStep('saving');
    try {
      const missingCount = receiptRows.reduce((s, r) => s + (r?.missing ? 1 : 0), 0);
      const payloadSummary = {
        ...summary,
        total_expenses: totals.usd,
        total_expenses_sdg: totals.sdg,
        receipt_check: {
          ...(summary.receipt_check || {}),
          confirmed: true,
          receipts: receiptRows,
          receipts_total_sdg: receiptsTotalSdg,
          receipts_detected_count: receiptRows.length,
          missing_receipts_count: missingCount,
          variance_sdg: totals.sdg - receiptsTotalSdg,
        },
      };
      const out = await f4Save({
        project_id: project.id,
        summary: payloadSummary,
        expenses,
        file_key_temp: tempKey,
      });
      setSummaryId(out.summary_id ?? null);
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
    setExpenses([]);
    setTempKey('');
    setSignedUrl(null);
    setWizardPages([]);
    setFxRate('');
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
        <p className="text-lg font-bold text-white mb-1">F4 report submitted</p>
        <p className="text-sm text-[#a8b6cc]">
          {summaryId != null ? `Summary #${summaryId} created for this project.` : 'Report saved.'}
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
          <p className="app-section-label mb-1">F4 · Guided upload</p>
          <h3 className="text-lg font-bold text-white mb-1">Upload financial report</h3>
          <p className="text-sm text-[#a8b6cc] mb-0">
            Upload your report, highlight the table, questions and receipts, then review and submit.
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
      { id: 'table', label: '1) Expense table', completed: wizardProgress.table, isCurrent: expectedKind === 'table' },
      { id: 'questions', label: '2) Questions', completed: wizardProgress.questions, isCurrent: expectedKind === 'questions' },
      { id: 'receipts', label: '3) Receipts', completed: wizardProgress.receipts, isCurrent: expectedKind === 'receipts' },
    ];
    return (
      <WizardFullscreenShell
        title="F4 financial report"
        steps={pills}
        expectedStepId={expectedKind}
        expectedStepLabel={STEP_LABEL[expectedKind]}
        selectionCount={selectionByKind[expectedKind].length}
        wizardLoading={wizardLoading != null}
        processDisabled={
          selectionByKind[expectedKind].length === 0 ||
          (expectedKind === 'receipts' && expenses.length === 0)
        }
        clearDisabled={selectionByKind[expectedKind].length === 0}
        onProcess={() => void runWizardStep(expectedKind)}
        onClearSelections={() =>
          setSelectionByKind((prev) => ({ ...prev, [expectedKind]: [] }))
        }
        toolbarExtra={
          <>
            {expectedKind !== 'table' && (
              <span className="text-[11px] text-[#8a97ab] whitespace-nowrap">
                Rows: {expenses.length}
              </span>
            )}
            {receiptStats && (
              <span className="text-[11px] text-[#8a97ab] whitespace-nowrap">
                Receipts total (SDG): {receiptStats.total.toLocaleString()} ({receiptStats.count} found)
              </span>
            )}
          </>
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
          !wizardProgress.table || !wizardProgress.questions || !wizardProgress.receipts
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
        disabled={!receiptConfirmed || !summary.report_date || !fx}
        className={primaryBtn}
      >
        Submit report
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setError('');
            setStep('wizard');
          }}
          className={ghostBtn}
        >
          Back to highlighting
        </button>
        <button type="button" onClick={startOver} className={ghostBtn}>
          Start over
        </button>
        <button type="button" onClick={onReturnToMenu} className={ghostBtn}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      <div>
        <p className="app-section-label mb-1">F4 · Review</p>
        <h3 className="text-lg font-bold text-white mb-1">Check the extracted details</h3>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Edit fields as needed, confirm receipts, then submit.
        </p>
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
          <span className="font-bold text-red-300">Exchange rate (SDG per 1 USD) *</span>
          <input
            type="number"
            inputMode="decimal"
            value={fxRate}
            onChange={(e) => {
              setFxRate(e.target.value);
              const n = parseFloat(e.target.value);
              if (Number.isFinite(n) && n > 0) setExpenses((prev) => recalcUsd(prev, n));
            }}
            placeholder="e.g. 2700"
            className={inputCls}
          />
        </label>
        <label className="block text-xs text-[#8a97ab] sm:col-span-2">
          Beneficiaries
          <input
            value={summary.beneficiaries || ''}
            onChange={(e) => setSummary({ ...summary, beneficiaries: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between bg-[#1c2d48] px-3 py-2">
          <p className="text-xs font-semibold text-[#a8b6cc] mb-0">Expenses</p>
          <button type="button" onClick={addExpense} className="text-xs font-semibold text-brand-orange">
            + Add row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[860px]">
            <thead className="text-[#8a97ab]">
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 text-start">Activity</th>
                <th className="px-2 py-2 text-start">Description</th>
                <th className="px-2 py-2 text-start">SDG</th>
                <th className="px-2 py-2 text-start">USD</th>
                <th className="px-2 py-2 text-start">Date</th>
                <th className="px-2 py-2 text-start">Method</th>
                <th className="px-2 py-2 text-start">Receipt no.</th>
                <th className="px-2 py-2 text-start">Seller</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-2 py-1.5">
                    <input
                      value={row.expense_activity || ''}
                      onChange={(e) => updateExpense(i, { expense_activity: e.target.value })}
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.expense_description || ''}
                      onChange={(e) => updateExpense(i, { expense_description: e.target.value })}
                      className={cellInputCls}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={row.expense_amount_sdg ?? ''}
                      onChange={(e) =>
                        updateExpense(i, {
                          expense_amount_sdg: e.target.value === '' ? null : parseFloat(e.target.value),
                        })
                      }
                      className={`${cellInputCls} w-24`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={row.expense_amount ?? ''}
                      onChange={(e) =>
                        updateExpense(i, {
                          expense_amount: e.target.value === '' ? null : parseFloat(e.target.value),
                        })
                      }
                      className={`${cellInputCls} w-24`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.payment_date || ''}
                      onChange={(e) => updateExpense(i, { payment_date: e.target.value })}
                      placeholder="YYYY-MM-DD"
                      className={`${cellInputCls} w-28`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.payment_method || ''}
                      onChange={(e) => updateExpense(i, { payment_method: e.target.value })}
                      className={`${cellInputCls} w-28`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.receipt_no || ''}
                      onChange={(e) => updateExpense(i, { receipt_no: e.target.value })}
                      className={`${cellInputCls} w-24`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.seller || ''}
                      onChange={(e) => updateExpense(i, { seller: e.target.value })}
                      className={`${cellInputCls} w-28`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeExpense(i)}
                      className="text-[#8a97ab] hover:text-red-300"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-[#8a97ab]">
                    No expense rows yet. Add one manually or go back and re-run the table step.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-3 py-2 text-[11px] text-[#8a97ab] mb-0">
          Totals — SDG: {totals.sdg.toLocaleString()} · USD: {totals.usd.toLocaleString()}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ['total_grant', 'Total grant'],
            ['total_other_sources', 'Total other sources'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs text-[#8a97ab]">
            {label}
            <input
              type="number"
              value={(summary as any)[key] ?? ''}
              onChange={(e) =>
                setSummary({
                  ...summary,
                  [key]: e.target.value === '' ? null : parseFloat(e.target.value),
                })
              }
              className={inputCls}
            />
          </label>
        ))}
      </div>

      {(
        [
          ['excess_expenses', 'Excess expenses'],
          ['surplus_use', 'Surplus use'],
          ['lessons', 'Lessons learned'],
          ['training', 'Training needs'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-xs text-[#8a97ab]">
          {label}
          <textarea
            value={(summary as any)[key] || ''}
            onChange={(e) => setSummary({ ...summary, [key]: e.target.value })}
            rows={3}
            className={inputCls}
          />
        </label>
      ))}

      <div className="rounded-xl border border-white/10 bg-[#152238] p-3 space-y-3">
        <p className="text-sm font-semibold text-white mb-0">Receipt check</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-[#8a97ab] text-xs">Expense table total (SDG)</div>
            <div className="font-semibold text-white">{totals.sdg.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#8a97ab] text-xs">Receipts total (SDG)</div>
            <div className="font-semibold text-white">{receiptsTotalSdg.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#8a97ab] text-xs">Variance (SDG)</div>
            <div className="font-semibold text-white">
              {(totals.sdg - receiptsTotalSdg).toLocaleString()}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[#8a97ab] mb-0">
          Edit receipt amounts, add missing receipts manually, or mark unreadable receipts as missing.
        </p>
        {receiptRows.length === 0 ? (
          <p className="text-sm text-[#8a97ab] mb-0">No receipt rows yet. Add rows manually if needed.</p>
        ) : (
          <div className="space-y-2">
            {receiptRows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_auto_auto] gap-2 items-center rounded-lg border border-white/10 p-2"
              >
                <input
                  value={row.reference || ''}
                  onChange={(e) => {
                    const next = [...receiptRows];
                    next[idx] = { ...row, reference: e.target.value };
                    setReceiptRows(next);
                  }}
                  placeholder={`receipt-${idx + 1}`}
                  className={cellInputCls}
                />
                <input
                  type="number"
                  value={row.amount_sdg ?? ''}
                  disabled={row.missing}
                  onChange={(e) => {
                    const next = [...receiptRows];
                    next[idx] = {
                      ...row,
                      amount_sdg: e.target.value === '' ? null : parseFloat(e.target.value),
                    };
                    setReceiptRows(next);
                  }}
                  placeholder="Amount (SDG)"
                  className={`${cellInputCls} disabled:opacity-40`}
                />
                <label className="flex items-center gap-1.5 text-xs text-[#a8b6cc]">
                  <input
                    type="checkbox"
                    checked={Boolean(row.missing)}
                    onChange={(e) => {
                      const next = [...receiptRows];
                      next[idx] = {
                        ...row,
                        missing: e.target.checked,
                        amount_sdg: e.target.checked ? null : row.amount_sdg,
                      };
                      setReceiptRows(next);
                    }}
                  />
                  missing
                </label>
                <button
                  type="button"
                  onClick={() => setReceiptRows(receiptRows.filter((_, i) => i !== idx))}
                  className="text-xs font-semibold text-red-300 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            setReceiptRows([
              ...receiptRows,
              {
                reference: `manual-receipt-${receiptRows.length + 1}`,
                amount_sdg: null,
                currency: 'SDG',
                missing: false,
              },
            ])
          }
          className="text-xs font-semibold text-brand-orange"
        >
          + Add receipt row
        </button>
        <label className="flex items-start gap-2 text-sm text-[#a8b6cc]">
          <input
            type="checkbox"
            checked={receiptConfirmed}
            onChange={(e) =>
              setSummary({
                ...summary,
                receipt_check: {
                  ...(summary.receipt_check || { receipts: [] }),
                  confirmed: e.target.checked,
                },
              })
            }
            className="mt-1"
          />
          I confirm the receipts total has been reviewed against the expense table total.
        </label>
      </div>

      <div className="pt-2 border-t border-white/10">{reviewActions}</div>
    </div>
  );
}
