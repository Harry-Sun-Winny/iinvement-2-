"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

export type AlertVariant = "error" | "warning" | "success" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  error: {
    bg: "var(--alert-error-bg)",
    border: "border-red-500/20",
    text: "text-red-400",
    icon: AlertCircle,
  },
  warning: {
    bg: "var(--alert-warning-bg)",
    border: "border-amber-500/20",
    text: "text-amber-400",
    icon: AlertTriangle,
  },
  success: {
    bg: "var(--alert-success-bg)",
    border: "border-emerald-500/20",
    text: "text-emerald-450",
    icon: CheckCircle2,
  },
  info: {
    bg: "var(--alert-info-bg)",
    border: "border-blue-500/20",
    text: "text-blue-400",
    icon: Info,
  },
};

export default function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`border rounded-[14px] flex items-start gap-3 w-full transition-all ${DESIGN_TOKENS.spacingClasses.p.lg} ${config.border} ${className}`}
      style={{ backgroundColor: config.bg }}
      role="alert"
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.text}`} />
      <div className="flex-1 space-y-1">
        {title && (
          <h5 className={`font-bold tracking-wide text-sm ${config.text}`}>
            {title}
          </h5>
        )}
        <div className={`text-xs md:text-sm font-medium ${config.text}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
