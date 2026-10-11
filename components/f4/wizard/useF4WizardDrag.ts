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

    // Edge zone is relative to the *file viewer* (scrollport), not the phone chrome.
    // Touch uses a large share of the viewer so scrolling starts as soon as the finger
    // reaches the bottom/top of the document pane.
    const maxStep = isTouch ? 32 : 16;

    let lastClientX = e.clientX;
    let lastClientY = e.clientY;
    let rafId = 0;

    const updateDragFromClient = (clientX: number, clientY: number) => {
      const d = draggingRef.current;
      if (!d) return;
      const pageEl = wizardPageWrapRefs.current[d.pageIndex];
      if (!pageEl) return;
      const imgEl = pageEl.querySelector('img');
      if (!imgEl) return;
      const imgRect = imgEl.getBoundingClientRect();
      const next = {
        ...d,
        cx: clientX - imgRect.left,
        cy: clientY - imgRect.top,
      };
      draggingRef.current = next;
      setDragging(next);
    };

    /** Scroll when the pointer is near the file-viewer edges; returns true if scrolled. */
    const applyEdgeScroll = () => {
      const scrollEl = wizardViewerScrollRef.current;
      if (!scrollEl || !draggingRef.current) return false;
      const sr = scrollEl.getBoundingClientRect();
      if (sr.height < 8 || sr.width < 8) return false;

      // Zone = portion of the viewer pane (not the whole screen / bottom nav)
      const edgeY = Math.max(
        isTouch ? 72 : 48,
        Math.round(sr.height * (isTouch ? 0.38 : 0.22))
      );
      const edgeX = Math.max(
        isTouch ? 56 : 40,
        Math.round(sr.width * (isTouch ? 0.22 : 0.14))
      );

      // Clamp pointer into the viewer for edge math so going past the pane
      // still counts as "at that edge" of the file viewer (not the app chrome).
      const x = Math.min(Math.max(lastClientX, sr.left), sr.right);
      const y = Math.min(Math.max(lastClientY, sr.top), sr.bottom);

      let dy = 0;
      let dx = 0;

      if (y >= sr.bottom - edgeY) {
        const depth = Math.min(1, (y - (sr.bottom - edgeY)) / edgeY);
        dy = Math.ceil(maxStep * (0.4 + 0.6 * depth));
      } else if (y <= sr.top + edgeY) {
        const depth = Math.min(1, (sr.top + edgeY - y) / edgeY);
        dy = -Math.ceil(maxStep * (0.4 + 0.6 * depth));
      }

      if (x >= sr.right - edgeX) {
        const depth = Math.min(1, (x - (sr.right - edgeX)) / edgeX);
        dx = Math.ceil(maxStep * (0.4 + 0.6 * depth));
      } else if (x <= sr.left + edgeX) {
        const depth = Math.min(1, (sr.left + edgeX - x) / edgeX);
        dx = -Math.ceil(maxStep * (0.4 + 0.6 * depth));
      }

      // Finger already past the viewer bottom/top → always scroll that way
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

    const edgeLoop = () => {
      if (!draggingRef.current) {
        rafId = 0;
        return;
      }
      applyEdgeScroll();
      rafId = window.requestAnimationFrame(edgeLoop);
    };

    const ensureEdgeLoop = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(edgeLoop);
    };

    const onMove = (ev: PointerEvent) => {
      if (typeof pointerId === 'number' && ev.pointerId !== pointerId) return;
      if (ev.cancelable) ev.preventDefault();
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      updateDragFromClient(ev.clientX, ev.clientY);
      ensureEdgeLoop();
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
    ensureEdgeLoop();

    cleanupRef.current = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  };

  return { startDragOnPage };
}
