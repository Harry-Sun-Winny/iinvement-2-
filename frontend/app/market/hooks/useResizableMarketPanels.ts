import { useEffect, useRef, useState, useCallback } from "react";
import {
  MIN_LEFT_WIDTH,
  MIN_RIGHT_WIDTH,
  RESIZE_HANDLE_WIDTH,
  DEFAULT_LEFT_RATIO,
  canUseMarketSplit,
  clampLeftPanelWidth,
  getInitialLeftPanelWidth,
  adjustWidthFromKeyboard,
} from "../utils/sizing";

const RATIO_STORAGE_KEY = "market:left-panel-ratio";

export function useResizableMarketPanels(containerRef: React.RefObject<HTMLElement | null>) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [leftWidth, setLeftWidth] = useState<number>(0);
  
  const isDraggingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastRatioRef = useRef<number>(DEFAULT_LEFT_RATIO);

  // Measure container using ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const newWidth = entry.contentRect.width;
      setContainerWidth(newWidth);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  // Read preferred ratio from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(RATIO_STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (Number.isFinite(parsed) && parsed > 0 && parsed < 1) {
        lastRatioRef.current = parsed;
      }
    }
  }, []);

  // Update left panel width when container size or preference changes
  useEffect(() => {
    if (containerWidth <= 0) return;
    const initialWidth = getInitialLeftPanelWidth(containerWidth, lastRatioRef.current);
    setLeftWidth(initialWidth);
  }, [containerWidth]);

  const persistCurrentRatio = useCallback(() => {
    if (containerWidth <= 0) return;
    const distributableWidth = containerWidth - RESIZE_HANDLE_WIDTH;
    if (distributableWidth > 0) {
      const ratio = leftWidth / distributableWidth;
      lastRatioRef.current = ratio;
      localStorage.setItem(RATIO_STORAGE_KEY, String(ratio));
    }
  }, [leftWidth, containerWidth]);

  const cancelPendingFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const restoreDocumentCursor = useCallback(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const finishDragging = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    cancelPendingFrame();
    restoreDocumentCursor();
    persistCurrentRatio();
  }, [cancelPendingFrame, restoreDocumentCursor, persistCurrentRatio]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!canUseMarketSplit(containerWidth)) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [containerWidth]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    cancelPendingFrame();

    frameRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      const desiredWidth = e.clientX - rect.left;
      const clamped = clampLeftPanelWidth(desiredWidth, containerWidth);
      setLeftWidth(clamped);
    });
  }, [containerWidth, containerRef, cancelPendingFrame]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;
    const target = e.target as HTMLElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {}
    finishDragging();
  }, [finishDragging]);

  const handlePointerCancel = useCallback((e: PointerEvent) => {
    finishDragging();
  }, [finishDragging]);

  const handleLostPointerCapture = useCallback((e: Event) => {
    finishDragging();
  }, [finishDragging]);

  // Hook global pointer listeners safely
  useEffect(() => {
    const move = (e: PointerEvent) => handlePointerMove(e);
    const up = (e: PointerEvent) => handlePointerUp(e);
    const cancel = (e: PointerEvent) => handlePointerCancel(e);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      cancelPendingFrame();
    };
  }, [handlePointerMove, handlePointerUp, handlePointerCancel, cancelPendingFrame]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!canUseMarketSplit(containerWidth)) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        e.preventDefault();
        const adjusted = adjustWidthFromKeyboard(leftWidth, e.key, e.shiftKey, containerWidth);
        setLeftWidth(adjusted);
        
        // Persist keyboard adjustments immediately
        const distributableWidth = containerWidth - RESIZE_HANDLE_WIDTH;
        if (distributableWidth > 0) {
          const ratio = adjusted / distributableWidth;
          lastRatioRef.current = ratio;
          localStorage.setItem(RATIO_STORAGE_KEY, String(ratio));
        }
      }
    },
    [leftWidth, containerWidth]
  );

  const isSplitLayout = canUseMarketSplit(containerWidth);

  return {
    leftWidth,
    containerWidth,
    isSplitLayout,
    handlePointerDown,
    handleKeyDown,
    handleLostPointerCapture,
    minLeftWidth: MIN_LEFT_WIDTH,
    maxLeftWidth: containerWidth - MIN_RIGHT_WIDTH - RESIZE_HANDLE_WIDTH,
  };
}
