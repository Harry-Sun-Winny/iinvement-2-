"use client";

import React, { useState } from "react";
import FundamentalAnalysis from "./FundamentalAnalysis";
import TechnicalAnalysis from "./TechnicalAnalysis";
import SentimentAnalysis from "./SentimentAnalysis";
import VSAAnalysis from "./VSAAnalysis";

import type { PositionSummary } from "@/types/analysis";

type TabId = "fa" | "ta" | "sa" | "vsa";

export default function AnalysisTabs({ positions }: { positions: PositionSummary[] }) {
  const [activeTab, setActiveTab] = useState<TabId>("fa");

  const tabs = [
    { id: "fa", label: "Phân tích cơ bản", color: "bg-emerald-400" },
    { id: "ta", label: "Phân tích kỹ thuật", color: "bg-blue-400" },
    { id: "sa", label: "Tâm lý thị trường", color: "bg-amber-400" },
    { id: "vsa", label: "Phân tích dòng tiền (VSA)", color: "bg-purple-400" },
  ] as const;

  return (
    <div className="w-full space-y-6">
      <div className="flex gap-2 border-b border-white/5 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-all flex items-center gap-2 ${
              activeTab === tab.id 
                ? "bg-white/[0.04] text-white border-x border-t border-white/5" 
                : "text-slate-400 hover:text-white hover:bg-white/[0.015]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tab.color}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="py-4">
        {activeTab === "fa" && <FundamentalAnalysis positions={positions} />}
        {activeTab === "ta" && <TechnicalAnalysis positions={positions} />}
        {activeTab === "sa" && <SentimentAnalysis positions={positions} />}
        {activeTab === "vsa" && <VSAAnalysis positions={positions} />}
      </div>
    </div>
  );
}
