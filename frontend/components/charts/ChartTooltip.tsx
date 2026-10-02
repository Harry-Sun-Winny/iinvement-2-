"use client";

import React from "react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  labelFormatter?: (label: any) => string;
  valueFormatter?: (value: any) => string;
}

export default function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (val) => String(val),
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className={`border bg-[var(--panel)] border-white/5 rounded-[12px] p-3 text-slate-100 shadow-xl z-50`}
      style={{
        boxShadow: DESIGN_TOKENS.shadow.lg,
        borderColor: "var(--border)",
      }}
    >
      {label !== undefined && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => (
          <div key={`${item.name || index}`} className="flex items-center gap-2 text-xs">
            {item.color && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-slate-300 font-medium">
              {item.name}:
            </span>
            <span className="text-white font-bold ml-auto">
              {valueFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
