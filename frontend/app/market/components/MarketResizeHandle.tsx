import React from "react";

interface MarketResizeHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onLostPointerCapture: (e: React.PointerEvent) => void;
  leftWidth: number;
  minVal: number;
  maxVal: number;
}

export default function MarketResizeHandle({
  onPointerDown,
  onKeyDown,
  onLostPointerCapture,
  leftWidth,
  minVal,
  maxVal,
}: MarketResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize market panels"
      aria-valuemin={minVal}
      aria-valuemax={maxVal}
      aria-valuenow={Math.round(leftWidth)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onLostPointerCapture={onLostPointerCapture}
      className="group relative h-full w-1.5 shrink-0 cursor-col-resize select-none bg-[var(--market-border)] transition-all hover:w-2 hover:bg-[var(--market-accent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--market-accent)]"
      title="Drag left/right or use Home/End/Left/Right arrows to resize"
    >
      <div className="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 bg-[var(--market-border-strong)] group-hover:bg-[var(--market-accent-hover)]" />
      
      {/* Centered drag handle control */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-8 w-4 items-center justify-center rounded-md border border-[var(--market-border-strong)] bg-[var(--market-surface-elevated)] shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all group-hover:border-[var(--market-accent)] group-hover:bg-[var(--market-surface-hover)]">
        <div className="flex flex-col gap-0.5">
          <div className="h-0.5 w-1.5 rounded-full bg-[var(--market-text-muted)] group-hover:bg-[var(--market-accent)]" />
          <div className="h-0.5 w-1.5 rounded-full bg-[var(--market-text-muted)] group-hover:bg-[var(--market-accent)]" />
          <div className="h-0.5 w-1.5 rounded-full bg-[var(--market-text-muted)] group-hover:bg-[var(--market-accent)]" />
        </div>
      </div>
    </div>
  );
}
