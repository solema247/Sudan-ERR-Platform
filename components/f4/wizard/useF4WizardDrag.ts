import { useEffect, useRef } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { WizardKind, RegionSelection } from './types';

export type WizardDragState = {
  pageIndex: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
} | null;

type Params = {
  /** True while the wizard viewer is on screen */
  active: boolean;
  wizardKindRef: MutableRefObject<WizardKind>;
  wizardPageWrapRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  wizardViewerScrollRef: React.RefObject<HTMLDivElement | null>;
  draggingRef: MutableRefObject<WizardDragState>;
  setDragging: Dispatch<SetStateAction<WizardDragState>>;
  setSelectionByKind: Dispatch<SetStateAction<Record<WizardKind, RegionSelection[]>>>;
};

type DragPointerEvent = {
  clientX: number;
  clientY: number;
  button?: number;
  pointerId?: number;
  pointerType?: string;
  preventDefault: () => void;
  currentTarget: EventTarget & HTMLDivElement;
};

/** Fixed edge bands (px). Percent-based zones made tiny moves scroll the whole page. */
const EDGE_Y_TOUCH = 56;
const EDGE_Y_MOUSE = 44;
const EDGE_X_TOUCH = 48;
const EDGE_X_MOUSE = 40;
const STEP_TOUCH = 12;
const STEP_MOUSE = 10;
/** Ignore edge scroll until the pointer has moved at least this far (px). */
const EDGE_SCROLL_MOVE_THRESHOLD = 28;

/** Window-level drag + continuous edge scroll for wizard region selection (mouse + touch). */
export function useF4WizardDrag({
  active,
  wizardKindRef,
  wizardPageWrapRefs,
  wizardViewerScrollRef,
  draggingRef,
  setDragging,
  setSelectionByKind,
}: Params): {
  startDragOnPage: (pageIndex: number, e: DragPointerEvent) => void;
} {
  const cleanupRef = useRef<(() => void) | null>(null);

  const detach = () => {
    const fn = cleanupRef.current;
    cleanupRef.current = null;
    if (fn) fn();
  };

  useEffect(() => {
    return () => {
      detach();
      draggingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) {
      detach();
      draggingRef.current = null;
      setDragging(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const startDragOnPage = (pageIndex: number, e: DragPointerEvent) => {
    if (!active) return;
    if (typeof e.button === 'number' && e.button !== 0) return;
    e.preventDefault();
    if (cleanupRef.current) {
      detach();
      draggingRef.current = null;
      setDragging(null);
    }
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    const ir = img.getBoundingClientRect();
    const sx = e.clientX - ir.left;
    const sy = e.clientY - ir.top;
    const initial = { pageIndex, sx, sy, cx: sx, cy: sy };
    draggingRef.current = initial;
    setDragging(initial);

    const targetEl = e.currentTarget;
    const pointerId = e.pointerId;
    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (typeof pointerId === 'number' && targetEl.setPointerCapture) {
      try {
        targetEl.setPointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }

    const edgeY = isTouch ? EDGE_Y_TOUCH : EDGE_Y_MOUSE;
    const edgeX = isTouch ? EDGE_X_TOUCH : EDGE_X_MOUSE;
    const maxStep = isTouch ? STEP_TOUCH : STEP_MOUSE;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let lastClientX = e.clientX;
    let lastClientY = e.clientY;
    let movedEnoughForEdgeScroll = false;
    let rafId = 0;

    const clampToImage = (
      clientX: number,
      clientY: number,
      imgEl: HTMLImageElement
    ) => {
      const imgRect = imgEl.getBoundingClientRect();
      const w = imgEl.clientWidth;
      const h = imgEl.clientHeight;
      return {
        cx: Math.min(Math.max(0, clientX - imgRect.left), w),
        cy: Math.min(Math.max(0, clientY - imgRect.top), h),
      };
    };

    const updateDragFromClient = (clientX: number, clientY: number) => {
      const d = draggingRef.current;
      if (!d) return;
      const pageEl = wizardPageWrapRefs.current[d.pageIndex];
      if (!pageEl) return;
      const imgEl = pageEl.querySelector('img');
      if (!imgEl) return;
      const { cx, cy } = clampToImage(clientX, clientY, imgEl);
      const next = { ...d, cx, cy };
      draggingRef.current = next;
      setDragging(next);
    };

    const pointerNearViewerEdge = () => {
      const scrollEl = wizardViewerScrollRef.current;
      if (!scrollEl) return false;
      const sr = scrollEl.getBoundingClientRect();
      if (sr.height < 8 || sr.width < 8) return false;
      const pastBottom = lastClientY > sr.bottom;
      const pastTop = lastClientY < sr.top;
      const pastRight = lastClientX > sr.right;
      const pastLeft = lastClientX < sr.left;
      if (pastBottom || pastTop || pastRight || pastLeft) return true;
      const x = Math.min(Math.max(lastClientX, sr.left), sr.right);
      const y = Math.min(Math.max(lastClientY, sr.top), sr.bottom);
      return (
        y >= sr.bottom - edgeY ||
        y <= sr.top + edgeY ||
        x >= sr.right - edgeX ||
        x <= sr.left + edgeX
      );
    };

    /** Scroll only when near the file-viewer edges; returns true if scrolled. */
    const applyEdgeScroll = () => {
      const scrollEl = wizardViewerScrollRef.current;
      if (!scrollEl || !draggingRef.current) return false;
      if (!movedEnoughForEdgeScroll) return false;
      const sr = scrollEl.getBoundingClientRect();
      if (sr.height < 8 || sr.width < 8) return false;

      const x = Math.min(Math.max(lastClientX, sr.left), sr.right);
      const y = Math.min(Math.max(lastClientY, sr.top), sr.bottom);

      let dy = 0;
      let dx = 0;

      if (y >= sr.bottom - edgeY) {
        const depth = Math.min(1, (y - (sr.bottom - edgeY)) / edgeY);
        dy = Math.ceil(maxStep * (0.35 + 0.65 * depth));
      } else if (y <= sr.top + edgeY) {
        const depth = Math.min(1, (sr.top + edgeY - y) / edgeY);
        dy = -Math.ceil(maxStep * (0.35 + 0.65 * depth));
      }

      if (x >= sr.right - edgeX) {
        const depth = Math.min(1, (x - (sr.right - edgeX)) / edgeX);
        dx = Math.ceil(maxStep * (0.35 + 0.65 * depth));
      } else if (x <= sr.left + edgeX) {
        const depth = Math.min(1, (sr.left + edgeX - x) / edgeX);
        dx = -Math.ceil(maxStep * (0.35 + 0.65 * depth));
      }

      // Finger already past the viewer → keep scrolling that way
      if (lastClientY > sr.bottom) dy = Math.max(dy, maxStep);
      if (lastClientY < sr.top) dy = Math.min(dy, -maxStep);
      if (lastClientX > sr.right) dx = Math.max(dx, maxStep);
      if (lastClientX < sr.left) dx = Math.min(dx, -maxStep);

      if (!dx && !dy) return false;

      const prevTop = scrollEl.scrollTop;
      const prevLeft = scrollEl.scrollLeft;
      if (dy) scrollEl.scrollTop += dy;
      if (dx) scrollEl.scrollLeft += dx;
      const moved =
        scrollEl.scrollTop !== prevTop || scrollEl.scrollLeft !== prevLeft;
      if (moved) {
        // Image shifted under the finger — recompute selection end in page coords
        updateDragFromClient(lastClientX, lastClientY);
      }
      return moved;
    };

    const stopEdgeLoop = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const edgeLoop = () => {
      if (!draggingRef.current) {
        rafId = 0;
        return;
      }
      if (!pointerNearViewerEdge() || !movedEnoughForEdgeScroll) {
        rafId = 0;
        return;
      }
      applyEdgeScroll();
      rafId = window.requestAnimationFrame(edgeLoop);
    };

    const ensureEdgeLoop = () => {
      if (rafId) return;
      if (!movedEnoughForEdgeScroll || !pointerNearViewerEdge()) return;
      rafId = window.requestAnimationFrame(edgeLoop);
    };

    const onMove = (ev: PointerEvent) => {
      if (typeof pointerId === 'number' && ev.pointerId !== pointerId) return;
      if (ev.cancelable) ev.preventDefault();
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      if (!movedEnoughForEdgeScroll) {
        const dist = Math.hypot(
          lastClientX - startClientX,
          lastClientY - startClientY
        );
        if (dist >= EDGE_SCROLL_MOVE_THRESHOLD) {
          movedEnoughForEdgeScroll = true;
        }
      }
      updateDragFromClient(ev.clientX, ev.clientY);
      if (movedEnoughForEdgeScroll && pointerNearViewerEdge()) {
        ensureEdgeLoop();
      } else {
        stopEdgeLoop();
      }
    };

    const finish = (ev: PointerEvent) => {
      if (typeof pointerId === 'number' && ev.pointerId !== pointerId) return;
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      updateDragFromClient(ev.clientX, ev.clientY);

      const current = draggingRef.current;
      detach();
      draggingRef.current = null;
      setDragging(null);
      if (
        typeof pointerId === 'number' &&
        targetEl.releasePointerCapture &&
        targetEl.hasPointerCapture?.(pointerId)
      ) {
        try {
          targetEl.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
      }
      if (!current) return;
      const pageEl = wizardPageWrapRefs.current[current.pageIndex];
      if (!pageEl) return;
      const imgEl = pageEl.querySelector('img');
      if (!imgEl) return;
      const x = Math.min(current.sx, current.cx);
      const y = Math.min(current.sy, current.cy);
      const w = Math.abs(current.cx - current.sx);
      const h = Math.abs(current.cy - current.sy);
      if (w >= 20 && h >= 20) {
        const kind = wizardKindRef.current;
        const refW = imgEl.clientWidth;
        const refH = imgEl.clientHeight;
        setSelectionByKind((prev) => ({
          ...prev,
          [kind]: [
            ...prev[kind],
            { pageIndex: current.pageIndex, x, y, w, h, refW, refH },
          ],
        }));
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);

    cleanupRef.current = () => {
      stopEdgeLoop();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  };

  return { startDragOnPage };
}
