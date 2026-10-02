"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { AI_PROMPT_VERSION } from "@/lib/ai-analysis-protocol";

interface Props {
  isVi: boolean;
}

export function FourPointZeroProtocol({ isVi }: Props) {
  return (
    <div className="antigravity-panel rounded-[28px] border border-cyan-500/10 bg-gradient-to-r from-slate-950/80 via-cyan-950/20 to-slate-950/80 p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
              Active Framework Status
            </p>
          </div>
          <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            {isVi ? "Giao thức Thẩm định Tài sản 4.0" : "Asset Due Diligence Protocol 4.0"}
          </h2>
          <p className="text-xs leading-5 text-slate-400">
            {isVi
              ? "Hệ thống tự động đồng bộ hóa dữ liệu danh mục thô, đối chiếu 1.029 yếu tố định lượng và chuẩn hóa trọng số theo các Regime thị trường thực tế."
              : "System dynamically synchronizes raw portfolio ledgers, resolves 1,029 quantitative factors, and normalizes scoring weights across active market regimes."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <div className="rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2.5 text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isVi ? "Phiên bản" : "Version"}</p>
            <p className="mt-0.5 text-xs font-black text-cyan-300 font-mono">{AI_PROMPT_VERSION}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2.5 text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isVi ? "Trạng thái" : "Status"}</p>
            <p className="mt-0.5 text-xs font-black text-emerald-400 uppercase tracking-wider">{isVi ? "Đã khóa" : "Locked"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
