"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react";

export type GovernanceGateStatus = "ready" | "conditional" | "blocked";

type Metric = { label: string; value: string; detail?: string };
type GateCheck = { label: string; done: boolean; critical?: boolean };

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  status: GovernanceGateStatus;
  statusLabel: string;
  metrics: Metric[];
  checks: GateCheck[];
  isVi: boolean;
};

const tone = {
  ready: {
    shell: "border-emerald-300/18 bg-emerald-300/[0.035]",
    badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
    Icon: CheckCircle2,
  },
  conditional: {
    shell: "border-amber-300/18 bg-amber-300/[0.035]",
    badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    Icon: AlertTriangle,
  },
  blocked: {
    shell: "border-rose-300/18 bg-rose-300/[0.035]",
    badge: "border-rose-300/25 bg-rose-300/10 text-rose-200",
    Icon: ShieldAlert,
  },
};

export function GovernanceGatePanel({ eyebrow, title, description, status, statusLabel, metrics, checks, isVi }: Props) {
  const current = tone[status];
  const StatusIcon = current.Icon;
  const completeCount = checks.filter((check) => check.done).length;

  return (
    <section className={`rounded-2xl border p-5 ${current.shell}`}>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
              <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${current.badge}`}>
              <StatusIcon className="h-4 w-4" />
              {statusLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-white/[0.07] bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{metric.label}</p>
                <p className="mt-1.5 truncate text-lg font-black text-white">{metric.value}</p>
                {metric.detail && <p className="mt-1 text-[10px] leading-4 text-slate-500">{metric.detail}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-slate-950/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-white">{isVi ? "Cổng bắt buộc" : "Mandatory gates"}</p>
            <span className="font-mono text-[10px] text-slate-500">{completeCount}/{checks.length}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {checks.map((check) => (
              <div key={check.label} className="flex items-start gap-2 text-xs leading-5">
                {check.done ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                ) : (
                  <CircleDashed className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${check.critical ? "text-rose-300" : "text-amber-300"}`} />
                )}
                <span className={check.done ? "text-slate-300" : check.critical ? "text-rose-100" : "text-slate-500"}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

