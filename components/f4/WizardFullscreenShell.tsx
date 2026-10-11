import React, {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { scaleSelectionForDisplay } from './wizard/scaleSelectionForDisplay';
import {
  normalizeWizardPage,
  type WizardPageEntry,
  type WizardViewerMode,
} from './wizard/types';

export type WizardStepPill = {
  id: string;
  label: string;
  completed: boolean;
  isCurrent: boolean;
};

export type WizardDragOverlay = {
  pageIndex: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
} | null;

export type WizardRegionSelection = {
  pageIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  refW?: number;
  refH?: number;
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const btnBase =
  'inline-flex items-center justify-center rounded-lg border border-white/15 text-[#a8b6cc] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed';

function pageImageStyle(
  page: WizardPageEntry,
  zoom: number,
  fitToContainer: boolean
): React.CSSProperties {
  const w = page.displayWidth ? Math.round(page.displayWidth * zoom) : undefined;
  return {
    width: w ? `${w}px` : undefined,
    maxWidth: fitToContainer ? '100%' : 'none',
    height: 'auto',
  };
}

function ZoomBar({
  zoom,
  onZoomChange,
  expanded,
  onExpandedChange,
  disabled,
}: {
  zoom: number;
  onZoomChange: (z: number) => void;
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 shrink-0">
      <button
        type="button"
        className={cx(btnBase, 'h-7 w-7')}
        title="Zoom out"
        disabled={disabled || zoom <= ZOOM_MIN}
        onClick={() => onZoomChange(clampZoom(zoom - ZOOM_STEP))}
      >
        <ZoomOut className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Zoom out</span>
      </button>
      <span className="text-[11px] tabular-nums text-[#8a97ab] min-w-[3rem] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        className={cx(btnBase, 'h-7 w-7')}
        title="Zoom in"
        disabled={disabled || zoom >= ZOOM_MAX}
        onClick={() => onZoomChange(clampZoom(zoom + ZOOM_STEP))}
      >
        <ZoomIn className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Zoom in</span>
      </button>
      <button
        type="button"
        className={cx(btnBase, 'h-7 px-2 text-[11px] gap-1')}
        disabled={disabled}
        onClick={() => onExpandedChange(!expanded)}
      >
        {expanded ? (
          <>
            <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            Exit full screen
          </>
        ) : (
          <>
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            Full screen
          </>
        )}
      </button>
    </div>
  );
}

function PageCanvas({
  pageIndex,
  page,
  fitToContainer,
  zoom,
  selections,
  dragging,
  startDragOnPage,
  setWrapRef,
  expanded,
}: {
  pageIndex: number;
  page: WizardPageEntry;
  fitToContainer: boolean;
  zoom: number;
  selections: WizardRegionSelection[];
  dragging: WizardDragOverlay;
  startDragOnPage: (
    pageIndex: number,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  setWrapRef: (el: HTMLDivElement | null) => void;
  expanded: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const update = () => setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => ro.disconnect();
  }, [page.dataUrl, zoom, fitToContainer, page.displayWidth, page.displayHeight]);

  const { w: displayW, h: displayH } = displaySize;

  return (
    <div
      className={cx(
        'border border-white/10 rounded overflow-hidden bg-white',
        expanded && 'shadow-sm',
        !expanded && 'mx-auto w-fit max-w-full'
      )}
    >
      <div
        ref={setWrapRef}
        className={cx(
          'relative inline-block select-none touch-none cursor-crosshair',
          fitToContainer && 'max-w-full'
        )}
        onPointerDown={(e) => startDragOnPage(pageIndex, e)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={page.dataUrl}
          alt={`Page ${pageIndex + 1}`}
          width={page.displayWidth || undefined}
          height={page.displayHeight || undefined}
          className={cx(
            'block h-auto w-auto select-none pointer-events-none',
            fitToContainer ? 'max-w-full' : 'max-w-none'
          )}
          style={pageImageStyle(page, zoom, fitToContainer)}
          onLoad={() => {
            const img = imgRef.current;
            if (img) setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
          }}
        />
        {selections.map((s, idx) => {
          const box = scaleSelectionForDisplay(s, displayW, displayH);
          return (
            <div
              key={`sel-${pageIndex}-${idx}`}
              className="absolute border-2 border-sky-500 bg-sky-300/15 pointer-events-none"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            />
          );
        })}
        {dragging && dragging.pageIndex === pageIndex && (
          <div
            className="absolute border-2 border-orange-500 bg-orange-300/20 pointer-events-none"
            style={{
              left: Math.min(dragging.sx, dragging.cx),
              top: Math.min(dragging.sy, dragging.cy),
              width: Math.abs(dragging.cx - dragging.sx),
              height: Math.abs(dragging.cy - dragging.sy),
            }}
          />
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Page {pageIndex + 1}
        </div>
      </div>
    </div>
  );
}

export type WizardFullscreenShellProps = {
  title: string;
  steps: WizardStepPill[];
  expectedStepId: string;
  expectedStepLabel: string;
  selectionCount: number;
  wizardLoading: boolean;
  processDisabled: boolean;
  clearDisabled: boolean;
  onProcess: () => void;
  onClearSelections: () => void;
  toolbarExtra?: ReactNode;

  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;

  viewerMode: WizardViewerMode;
  isRenderingPages: boolean;
  wizardPages: WizardPageEntry[];
  currentSelections: WizardRegionSelection[];
  dragging: WizardDragOverlay;
  startDragOnPage: (
    pageIndex: number,
    e: React.PointerEvent<HTMLDivElement>
  ) => void;
  wizardViewerScrollRef: RefObject<HTMLDivElement | null>;
  wizardPageWrapRefs: MutableRefObject<(HTMLDivElement | null)[]>;

  unsupportedBanner?: ReactNode;
  errorBanner?: ReactNode;

  onBack: () => void;
  onContinue: () => void;
  backDisabled?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
  backLabel?: string;
};

/** Guided extraction viewer: compact by default, optional full screen + zoom. Dark chatbot theme. */
export function WizardFullscreenShell({
  title,
  steps,
  expectedStepId,
  expectedStepLabel,
  selectionCount,
  wizardLoading,
  processDisabled,
  clearDisabled,
  onProcess,
  onClearSelections,
  toolbarExtra,
  expanded,
  onExpandedChange,
  zoom,
  onZoomChange,
  viewerMode,
  isRenderingPages,
  wizardPages,
  currentSelections,
  dragging,
  startDragOnPage,
  wizardViewerScrollRef,
  wizardPageWrapRefs,
  unsupportedBanner,
  errorBanner,
  onBack,
  onContinue,
  backDisabled,
  continueDisabled,
  continueLabel = 'Continue to review',
  backLabel = 'Cancel',
}: WizardFullscreenShellProps) {
  const fitToContainer = !expanded && zoom <= 1;

  const allStepsDone = steps.every((s) => s.completed);

  const toolbar = (
    <div className="shrink-0 rounded-xl border border-white/10 bg-[#152238] px-3 py-2 space-y-2">
      <p className="text-[11px] leading-snug text-[#8a97ab] pb-1.5 border-b border-white/10">
        Drag with your finger (or mouse) to highlight the section, then run this step. Use zoom or full screen for small text.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {steps.map((step) => (
            <span
              key={step.id}
              className={cx(
                'inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] leading-none',
                step.completed
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                  : step.isCurrent
                    ? 'bg-brand-orange/10 border-brand-orange/40 text-brand-orange'
                    : 'bg-white/5 border-white/10 text-[#8a97ab]'
              )}
            >
              {step.label}
              {step.completed && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-[#8a97ab] whitespace-nowrap">
          · {selectionCount} selection(s)
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {!allStepsDone && (
          <>
            <button
              type="button"
              className="h-8 px-3 rounded-lg bg-brand-orange text-[#152238] text-[11px] font-bold disabled:opacity-40"
              onClick={onProcess}
              disabled={wizardLoading || processDisabled}
            >
              {wizardLoading ? 'Processing…' : `Process ${expectedStepLabel}`}
            </button>
            <button
              type="button"
              className={cx(btnBase, 'h-8 px-2.5 text-[11px]')}
              onClick={onClearSelections}
              disabled={wizardLoading || clearDisabled}
            >
              Clear selections
            </button>
          </>
        )}
        {allStepsDone && (
          <button
            type="button"
            className="h-8 px-3 rounded-lg bg-brand-orange text-[#152238] text-[11px] font-bold disabled:opacity-40"
            onClick={onContinue}
            disabled={continueDisabled || wizardLoading}
          >
            {continueLabel}
          </button>
        )}
        <button
          type="button"
          className={cx(btnBase, 'h-8 px-2.5 text-[11px]')}
          onClick={onBack}
          disabled={backDisabled || wizardLoading}
        >
          {backLabel}
        </button>
        {toolbarExtra}
      </div>
    </div>
  );

  const viewerChrome = (
    <ZoomBar
      zoom={zoom}
      onZoomChange={onZoomChange}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      disabled={wizardLoading}
    />
  );

  const emptyBox = (msg: string, minH: string) => (
    <div
      className={cx(
        'w-full border border-white/10 rounded flex items-center justify-center text-[#8a97ab] text-sm text-center px-4',
        minH
      )}
    >
      {msg}
    </div>
  );

  let pages: ReactNode;
  if (isRenderingPages) {
    pages = emptyBox('Preparing document pages…', expanded ? 'min-h-[50vh]' : 'min-h-[280px]');
  } else if (wizardPages.length === 0) {
    pages = emptyBox(
      viewerMode === 'unsupported'
        ? 'No renderable pages — use a PDF or image file.'
        : 'No renderable pages available',
      expanded ? 'min-h-[40vh]' : 'h-[300px]'
    );
  } else {
    pages = (
      <div className={cx('pb-2', expanded ? 'mx-auto flex w-max max-w-none flex-col gap-6' : 'space-y-4')}>
        {wizardPages.map((raw, pageIndex) => {
          const page = normalizeWizardPage(raw);
          if (!page?.dataUrl) return null;
          const keySuffix = page.dataUrl.length > 32 ? page.dataUrl.slice(0, 32) : page.dataUrl;
          return (
            <PageCanvas
              key={`${pageIndex}-${keySuffix}`}
              pageIndex={pageIndex}
              page={page}
              fitToContainer={fitToContainer}
              zoom={zoom}
              expanded={expanded}
              selections={currentSelections.filter((s) => s.pageIndex === pageIndex)}
              dragging={dragging}
              startDragOnPage={startDragOnPage}
              setWrapRef={(el) => {
                wizardPageWrapRefs.current[pageIndex] = el;
              }}
            />
          );
        })}
      </div>
    );
  }

  const viewerPanel = (
    <div
      className={cx(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f1828]',
        expanded ? 'flex-1' : 'h-[min(52vh,420px)]'
      )}
    >
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#1c2d48] px-3 py-1.5">
        <span className="text-xs font-semibold text-[#a8b6cc]">Document — drag to highlight</span>
        {viewerChrome}
      </div>
      <div
        ref={wizardViewerScrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {pages}
      </div>
    </div>
  );

  const body = (
    <>
      {expanded && (
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 pb-2">
          <h2 className="text-base font-bold text-white mb-0">{title}</h2>
        </div>
      )}
      {toolbar}
      {errorBanner}
      {unsupportedBanner}
      {viewerPanel}
    </>
  );

  if (expanded && typeof document !== 'undefined') {
    return createPortal(
      <div className="fixed inset-0 z-[80] flex flex-col gap-2 bg-[#0f1828] p-3 sm:p-4 text-[#a8b6cc]">
        {body}
      </div>,
      document.body
    );
  }

  return <div className="flex flex-col gap-2 min-h-0">{body}</div>;
}
