"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Save, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/providers/I18nProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildAutoPrompt,
  classifyScore,
  computeWeightedAverage,
  INDUSTRY_OPTIONS,
  PILLAR_DEFINITIONS,
  PSYCHOLOGY_CHECKS,
  toFivePointScale,
  type PillarKey,
  ZSCORE_NOTES,
} from "./lib/scoring-model";
import ExecutiveBanner from "./components/ExecutiveBanner";
import WaterfallAttribution from "./components/WaterfallAttribution";
import BenchmarkingGrid from "./components/BenchmarkingGrid";
import CatalystTimeline from "./components/CatalystTimeline";
import type { DashboardData } from "../watchlist/[id]/lib/types";
import { normalizeDashboardData } from "../watchlist/[id]/lib/normalizer";
import { DocumentEvidencePanel, documentEvidenceForPrompt, type EvidenceDocument } from "@/components/analysis/DocumentEvidencePanel";
import { createResearchRun, getPortfolios, getResearchScore, getTransactions, type ResearchResult } from "@/app/lib/api";
import { ResearchWorkflowRail } from "@/components/research/ResearchWorkflowRail";
import { GovernanceGatePanel, type GovernanceGateStatus } from "@/components/research/GovernanceGatePanel";
import { InvestmentParameterWorkbench } from "@/components/research/InvestmentParameterWorkbench";
import {
  deriveValidationStage,
  loadActiveDecisionPacket,
  persistDecisionPacket,
  reviseDecisionPacket,
  type DecisionPacket,
} from "@/lib/decision-packet";
import { getIndustryProfile, type IndustryProfileId } from "@/lib/industry-decision-profiles";

type SavedScore = {
  id: string;
  symbol: string;
  industry: string;
  branchScores: Record<string, number>;
  pillarScores: Record<PillarKey, number>;
  totalScore: number;
  displayScore: number;
  verdict: { label: string; tone: "buy" | "hold" | "sell" };
  autoPrompt: string;
  date: string;
};

type HoldingOption = { symbol: string; name: string; quantity: number };

const DEFAULT_BRANCH_SCORES: Record<string, number> = Object.fromEntries(
  PILLAR_DEFINITIONS.flatMap((pillar) => pillar.branches.map((branch) => [branch.id, 60])),
);

const DEFAULT_SELF_CHECKS = [true, true, false, true];

export default function ScoringPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const [symbol, setSymbol] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRY_OPTIONS[0].id);
  const [branchScores, setBranchScores] = useState<Record<string, number>>(DEFAULT_BRANCH_SCORES);
  const [disciplineChecks, setDisciplineChecks] = useState<boolean[]>(DEFAULT_SELF_CHECKS);
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [evidenceDocuments, setEvidenceDocuments] = useState<EvidenceDocument[]>([]);
  const [showSupportingVisuals, setShowSupportingVisuals] = useState(false);
  const [heldStocks, setHeldStocks] = useState<HoldingOption[]>([]);
  const [macroScore, setMacroScore] = useState(60);
  const [portfolioFitScore, setPortfolioFitScore] = useState(60);
  const [legalGate, setLegalGate] = useState<"clear" | "warning" | "hard-stop">("clear");
  const [confidenceScore, setConfidenceScore] = useState(40);
  const [activePacket, setActivePacket] = useState<DecisionPacket | null>(null);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchSaving, setResearchSaving] = useState(false);
  const [savedResearchRunId, setSavedResearchRunId] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem("saved_stock_scores");
    if (!raw) return;
    try {
      setSavedScores(JSON.parse(raw));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const packet = loadActiveDecisionPacket(symbol || undefined);
    setActivePacket(packet);
    if (!packet) return;
    if (!symbol.trim() && packet.asset.symbol) setSymbol(packet.asset.symbol);
    if (packet.asset.industryId && INDUSTRY_OPTIONS.some((industry) => industry.id === packet.asset.industryId)) setSelectedIndustry(packet.asset.industryId);
    if (packet.policy.confidence > 0) setConfidenceScore(packet.policy.confidence);
    setLegalGate(packet.policy.legalGate);
  }, [mounted, symbol]);

  useEffect(() => {
    let active = true;
    async function loadHeldStocks() {
      try {
        const portfolios = await getPortfolios();
        const transactions = await Promise.all(portfolios.map(async (portfolio) => getTransactions(portfolio.id).catch(() => [])));
        const holdings = new Map<string, HoldingOption>();
        transactions.flat().forEach((transaction) => {
          const symbol = transaction.assetSymbol?.trim().toUpperCase();
          if (!symbol) return;
          const current = holdings.get(symbol) ?? { symbol, name: transaction.assetName || symbol, quantity: 0 };
          const direction = transaction.type === "SELL" ? -1 : 1;
          current.quantity += direction * Number(transaction.quantity || 0);
          holdings.set(symbol, current);
        });
        if (active) setHeldStocks([...holdings.values()].filter((item) => item.quantity > 0).sort((a, b) => a.symbol.localeCompare(b.symbol)));
      } catch (error) {
        console.error("Failed to load held stocks", error);
      }
    }
    void loadHeldStocks();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearchChange = (value: string) => {
    setSymbol(value);
    setShowSuggestions(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/stock-search?q=${encodeURIComponent(value.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  };

  useEffect(() => {
    if (!symbol || symbol.trim().length < 2) {
      setDashboardData(null);
      return;
    }

    const currentSymbol = symbol.trim().toUpperCase();
    let active = true;

    async function fetchData() {
      try {
        const [priceRes, profileRes, historyRes] = await Promise.all([
          fetch(`/api/stock-price?symbol=${encodeURIComponent(currentSymbol)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/stock-profile?symbol=${encodeURIComponent(currentSymbol)}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/stock-history?symbol=${encodeURIComponent(currentSymbol)}&range=Max`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!active) return;
        if (priceRes || profileRes || historyRes) {
          setDashboardData(
            normalizeDashboardData(currentSymbol, priceRes, profileRes, historyRes, null, null, null),
          );
        }
      } catch (error) {
        console.error("Error fetching scoring context:", error);
      }
    }

    const timer = setTimeout(fetchData, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [symbol]);

  useEffect(() => {
    setSavedResearchRunId(null);
    const ticker = symbol.trim().toUpperCase();
    if (ticker.length < 2) {
      setResearchResult(null);
      setResearchError(null);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setResearchLoading(true);
      setResearchError(null);
      void getResearchScore(ticker)
        .then((result) => {
          if (active) setResearchResult(result);
        })
        .catch((error: unknown) => {
          if (active) {
            setResearchResult(null);
            setResearchError(error instanceof Error ? error.message : "Research service is unavailable.");
          }
        })
        .finally(() => {
          if (active) setResearchLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [symbol]);

  const saveResearchSnapshot = useCallback(async () => {
    const ticker = symbol.trim().toUpperCase();
    if (!ticker || researchSaving) return;
    setResearchSaving(true);
    try {
      const saved = await createResearchRun(ticker);
      setResearchResult(saved.response);
      setSavedResearchRunId(saved.runId);
      toast.success(isVi ? "Đã lưu snapshot nghiên cứu riêng tư." : "Private research snapshot saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isVi ? "Không thể lưu snapshot nghiên cứu." : "Could not save research snapshot."));
    } finally {
      setResearchSaving(false);
    }
  }, [isVi, researchSaving, symbol]);

  const selfDisciplineScore = useMemo(() => {
    const positives = disciplineChecks.filter(Boolean).length;
    return (positives / disciplineChecks.length) * 100;
  }, [disciplineChecks]);

  const pillarScores = useMemo(() => {
    return Object.fromEntries(
      PILLAR_DEFINITIONS.map((pillar) => {
        const weightedBranches = pillar.branches.map((branch) => ({
          score: branch.id === "self_discipline" ? selfDisciplineScore : branchScores[branch.id] ?? 0,
          weight: branch.weight,
        }));
        return [pillar.id, computeWeightedAverage(weightedBranches)];
      }),
    ) as Record<PillarKey, number>;
  }, [branchScores, selfDisciplineScore]);

  const totalScore = useMemo(
    () =>
      computeWeightedAverage(
        PILLAR_DEFINITIONS.map((pillar) => ({
          score: pillarScores[pillar.id],
          weight: pillar.overallWeight,
        })),
      ),
    [pillarScores],
  );

  const decisionScore = useMemo(() => {
    const weighted = totalScore * 0.65 + macroScore * 0.2 + portfolioFitScore * 0.15;
    return Math.max(0, Math.min(100, weighted));
  }, [macroScore, portfolioFitScore, totalScore]);
  const displayScore = useMemo(() => toFivePointScale(decisionScore), [decisionScore]);
  const scoreVerdict = useMemo(() => classifyScore(decisionScore), [decisionScore]);
  const usableEvidenceCount = useMemo(
    () => evidenceDocuments.filter((document) => document.extractedText.trim() || document.note.trim()).length,
    [evidenceDocuments],
  );
  const minimumEvidenceMet = Boolean(symbol.trim()) && usableEvidenceCount >= 1;
  const packetEvidenceMet = Boolean(activePacket?.evidence.minimumSetMet && activePacket.review);
  const effectiveMinimumEvidenceMet = minimumEvidenceMet || packetEvidenceMet;
  const validationStage = activePacket ? deriveValidationStage(activePacket) : "RESEARCH";
  const verdict = useMemo((): { label: string; tone: "buy" | "hold" | "sell" } => {
    if (!effectiveMinimumEvidenceMet) return { label: "NO-DECISION", tone: "hold" };
    if (legalGate === "hard-stop") return { label: isVi ? "THOÁT / HARD STOP" : "EXIT / HARD STOP", tone: "sell" };
    if (legalGate === "warning") return { label: "WATCH / NO-TRADE", tone: "hold" };
    if (confidenceScore < 50) return { label: isVi ? "NO-DECISION · CONFIDENCE THẤP" : "NO-DECISION · LOW CONFIDENCE", tone: "hold" };
    if (validationStage === "RESEARCH") return { label: "WATCH / RESEARCH", tone: "hold" };
    if (decisionScore >= 80) return { label: isVi ? "MUA THÊM CÓ GIỚI HẠN" : "ADD WITHIN LIMIT", tone: "buy" };
    if (decisionScore >= 60) return { label: isVi ? "GIỮ & THEO DÕI" : "HOLD & MONITOR", tone: "hold" };
    if (decisionScore >= 40) return { label: isVi ? "GIẢM TỶ TRỌNG" : "REDUCE", tone: "sell" };
    return { label: isVi ? "THOÁT VỊ THẾ" : "EXIT", tone: "sell" };
  }, [confidenceScore, decisionScore, effectiveMinimumEvidenceMet, isVi, legalGate, validationStage]);
  const selectedHolding = useMemo(() => heldStocks.find((holding) => holding.symbol === symbol.trim().toUpperCase()) ?? null, [heldStocks, symbol]);

  const radarScores = useMemo(
    () =>
      Object.fromEntries(
        PILLAR_DEFINITIONS.map((pillar) => [pillar.id, toFivePointScale(pillarScores[pillar.id])]),
      ) as Record<string, number>,
    [pillarScores],
  );

  const radarWeights = useMemo(
    () =>
      Object.fromEntries(PILLAR_DEFINITIONS.map((pillar) => [pillar.id, pillar.overallWeight])) as Record<string, number>,
    [],
  );

  const selectedIndustryMeta = useMemo(
    () => INDUSTRY_OPTIONS.find((industry) => industry.id === selectedIndustry) ?? INDUSTRY_OPTIONS[0],
    [selectedIndustry],
  );
  const selectedIndustryProfile = useMemo(() => getIndustryProfile(selectedIndustryMeta.id as IndustryProfileId), [selectedIndustryMeta.id]);

  const evidenceDossier = useMemo(() => documentEvidenceForPrompt(evidenceDocuments), [evidenceDocuments]);
  const handleEvidenceChange = useCallback((documents: EvidenceDocument[]) => setEvidenceDocuments(documents), []);

  const autoPrompt = useMemo(
    () =>
      buildAutoPrompt({
        symbol: symbol.trim().toUpperCase(),
        industryLabel: selectedIndustryMeta.label,
        totalScore: decisionScore,
        verdictLabel: verdict.label,
        pillarScores,
        branchScores: { ...branchScores, self_discipline: selfDisciplineScore },
        evidenceDossier,
        decisionContext: `BỐI CẢNH SAU MUA: ${selectedHolding ? `đang nắm giữ ${selectedHolding.quantity} cổ phiếu` : "chưa xác nhận vị thế"}. Quality score ${decisionScore.toFixed(1)}/100 (${scoreVerdict.label}); confidence ${confidenceScore}/100; validation ${validationStage}; policy hiện tại: ${verdict.label}; minimum evidence: ${effectiveMinimumEvidenceMet ? "đạt" : "chưa đạt"}; vĩ mô ${macroScore}/100; phù hợp danh mục ${portfolioFitScore}/100; cổng pháp lý/rủi ro: ${legalGate}. PROFILE NGÀNH ${selectedIndustryProfile.label}: ${selectedIndustryProfile.thesisLens}; yếu tố trọng tâm ${selectedIndustryProfile.topFactors.join(", ")}; veto/cờ đỏ ${selectedIndustryProfile.redFlags.join(", ")}; regime note ${selectedIndustryProfile.regimeNote}. Hãy kiểm tra luận điểm ban đầu còn đúng không trước khi đề xuất giữ, mua thêm, giảm tỷ trọng hoặc bán.`, 
      }),
    [branchScores, confidenceScore, decisionScore, effectiveMinimumEvidenceMet, evidenceDossier, legalGate, macroScore, pillarScores, portfolioFitScore, scoreVerdict.label, selectedHolding, selectedIndustryMeta.label, selectedIndustryProfile, selfDisciplineScore, symbol, validationStage, verdict.label],
  );

  const policyGateStatus: GovernanceGateStatus = effectiveMinimumEvidenceMet && confidenceScore >= 50 && validationStage !== "RESEARCH" && legalGate === "clear"
    ? "ready"
    : symbol.trim() || usableEvidenceCount > 0
      ? "conditional"
      : "blocked";

  const handleBranchScoreChange = (branchId: string, value: number) => {
    setBranchScores((prev) => ({ ...prev, [branchId]: value }));
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(autoPrompt);
      toast.success(isVi ? "Đã sao chép prompt tự động" : "Auto prompt copied");
    } catch {
      toast.error(isVi ? "Không thể sao chép prompt" : "Could not copy prompt");
    }
  };

  const handleSave = () => {
    const record: SavedScore = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase() || "STOCK",
      industry: selectedIndustry,
      branchScores: { ...branchScores, self_discipline: selfDisciplineScore },
      pillarScores,
      totalScore: decisionScore,
      displayScore,
      verdict,
      autoPrompt,
      date: new Date().toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    };

    const updated = [record, ...savedScores];
    setSavedScores(updated);
    localStorage.setItem("saved_stock_scores", JSON.stringify(updated));
    if (activePacket) {
      const packet = reviseDecisionPacket(activePacket, {
        stage: effectiveMinimumEvidenceMet ? "POLICY_READY" : activePacket.stage,
        asset: { ...activePacket.asset, industryId: selectedIndustryMeta.id },
        policy: {
          ...activePacket.policy,
          qualityScore: decisionScore,
          confidence: confidenceScore,
          validationStage,
          action: verdict.label,
          legalGate,
          portfolioFit: portfolioFitScore,
          macroScore,
        },
      }, "POLICY_UPDATED", `Policy ${verdict.label} · score ${decisionScore.toFixed(1)}`, "user");
      persistDecisionPacket(packet);
      setActivePacket(packet);
    }
    toast.success(isVi ? `Đã lưu kết quả cho ${record.symbol}` : `Saved score for ${record.symbol}`);
  };

  const handleDelete = (id: string) => {
    const updated = savedScores.filter((record) => record.id !== id);
    setSavedScores(updated);
    localStorage.setItem("saved_stock_scores", JSON.stringify(updated));
    toast.success(isVi ? "Đã xóa bản chấm điểm" : "Score deleted");
  };

  const handleLoadScore = (record: SavedScore) => {
    setSelectedIndustry(record.industry);
    setSymbol(record.symbol);
    setBranchScores({ ...DEFAULT_BRANCH_SCORES, ...record.branchScores });
    if (typeof record.branchScores.self_discipline === "number") {
      const filled = Math.round((record.branchScores.self_discipline / 100) * disciplineChecks.length);
      setDisciplineChecks(disciplineChecks.map((_, index) => index < filled));
    }
    toast.success(isVi ? `Đã tải bản chấm điểm của ${record.symbol}` : `Loaded score for ${record.symbol}`);
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <main className="h-full w-[820px] shrink-0 space-y-6 overflow-y-auto border-r border-white/5 p-6">
        <ResearchWorkflowRail
          stage="policy"
          isVi={isVi}
          states={{ analysis: "complete", review: effectiveMinimumEvidenceMet ? "complete" : "blocked", policy: policyGateStatus === "ready" ? "complete" : "active" }}
        />

        <header className="mb-7">
          <p className="text-sm font-medium text-[#54a0ff]">{isVi ? "Decision Policy Engine · kiểm tra sau mua" : "Decision Policy Engine · post-purchase review"}</p>
          <h2 className="mt-2 text-3xl font-black rainbow-text">{isVi ? "Chấm điểm cổ phiếu đang nắm giữ" : "Score current holdings"}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            {isVi ? "Quality score, confidence, trạng thái kiểm định và portfolio constraints được hiển thị riêng. Chỉ Policy Engine mới tạo hành động; thiếu evidence trả về NO-DECISION và veto có quyền chặn điểm cao." : "Quality score, confidence, validation status and portfolio constraints stay separate. Only the Policy Engine creates an action; missing evidence returns NO-DECISION and a veto can block a high score."}
          </p>
        </header>

        <GovernanceGatePanel
          eyebrow={isVi ? "Cổng G3 · Policy, Sizing & Monitoring" : "Gate G3 · Policy, Sizing & Monitoring"}
          title={isVi ? "Trạng thái policy của vị thế" : "Position policy status"}
          description={isVi ? "Score mô tả chất lượng tín hiệu. Confidence mô tả độ tin cậy của hồ sơ. Validation mô tả mức sẵn sàng sử dụng. Ba lớp này không được gộp thành một con số." : "Score describes signal quality. Confidence describes dossier reliability. Validation describes use readiness. These three layers must not collapse into one number."}
          status={policyGateStatus}
          statusLabel={verdict.label}
          isVi={isVi}
          metrics={[
            { label: "Quality score", value: `${decisionScore.toFixed(1)}/100`, detail: scoreVerdict.label },
            { label: "Confidence", value: `${confidenceScore}/100`, detail: isVi ? "Tách khỏi score" : "Separate from score" },
            { label: "Validation", value: validationStage, detail: isVi ? "Research registry" : "Research registry" },
            { label: isVi ? "Evidence dùng được" : "Usable evidence", value: activePacket ? `${activePacket.evidence.completeRows} rows` : `${usableEvidenceCount} docs`, detail: effectiveMinimumEvidenceMet ? "Minimum set met" : "Minimum set missing" },
          ]}
          checks={[
            { label: isVi ? "Đã định danh mã và vị thế" : "Ticker and position identified", done: Boolean(symbol.trim()), critical: true },
            { label: isVi ? "Đạt minimum evidence set" : "Minimum evidence set met", done: effectiveMinimumEvidenceMet, critical: true },
            { label: isVi ? "Confidence từ 50 trở lên" : "Confidence at least 50", done: confidenceScore >= 50, critical: true },
            { label: isVi ? "Không có legal/risk veto" : "No legal or risk veto", done: legalGate === "clear", critical: true },
          ]}
        />

        <Card className="antigravity-panel border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">{isVi ? "Thiết lập phân tích" : "Analysis Setup"}</CardTitle>
            <CardDescription>
              {isVi ? "Chọn mã, nhóm ngành và tinh chỉnh từng nhánh theo đúng logic chấm điểm bạn đưa." : "Select a ticker, industry group and fine-tune each branch using your scoring logic."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{isVi ? "Kiểm tra sau mua" : "Post-purchase review"}</p><p className="mt-1 text-xs leading-5 text-slate-400">{isVi ? "Chọn cổ phiếu đang giữ để kiểm tra xem luận điểm còn hợp lý không trước khi giữ, mua thêm, giảm tỷ trọng hoặc bán." : "Choose a current holding to test whether the thesis still supports holding, adding, trimming, or selling."}</p></div>
                {selectedHolding && <Badge className="border border-cyan-400/25 bg-cyan-400/10 text-cyan-100">{isVi ? `Đang giữ ${selectedHolding.quantity.toLocaleString()} cổ phiếu` : `Holding ${selectedHolding.quantity.toLocaleString()} shares`}</Badge>}
              </div>
              <select value={selectedHolding?.symbol ?? ""} onChange={(event) => { if (event.target.value) setSymbol(event.target.value); }} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50">
                <option value="">{isVi ? "Chọn mã đang nắm giữ" : "Select a current holding"}</option>
                {heldStocks.map((holding) => <option key={holding.symbol} value={holding.symbol}>{holding.symbol} · {holding.name} · {holding.quantity.toLocaleString()}</option>)}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative space-y-2" ref={suggestRef}>
                <label className="text-xs font-bold uppercase text-slate-400">{isVi ? "Mã cổ phiếu" : "Stock Ticker"}</label>
                <Input
                  value={symbol}
                  placeholder={isVi ? "Nhập mã hoặc tên công ty" : "Enter ticker or company name"}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => symbol && setShowSuggestions(true)}
                  className="border-white/10 bg-slate-950/70 font-mono uppercase text-white placeholder:text-slate-500"
                />
                {showSuggestions && (searchLoading || suggestions.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/5 bg-[#0b0c10] shadow-2xl">
                    {searchLoading && <div className="px-4 py-2.5 text-xs text-slate-400">{isVi ? "Đang tìm kiếm..." : "Searching..."}</div>}
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.symbol}
                        onClick={() => {
                          setSymbol(suggestion.symbol);
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-center justify-between gap-4 border-t border-white/[0.05] px-4 py-2.5 text-left first:border-t-0 hover:bg-white/[0.04]"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">{suggestion.symbol}</span>
                          <span className="max-w-[220px] truncate text-[10px] text-slate-400">{suggestion.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">{isVi ? "Nhóm ngành phân tích" : "Analysis Industry Group"}</label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-[#54a0ff] focus:outline-none"
                >
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <option key={industry.id} value={industry.id} className="bg-slate-950 text-white">
                      {industry.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{selectedIndustryMeta.note}</p>
                <div className="mt-3 grid gap-2 rounded-xl border border-white/7 bg-slate-950/55 p-3 text-[11px] sm:grid-cols-2">
                  <div><p className="font-semibold text-cyan-200">{isVi ? "Driver trọng tâm" : "Core drivers"}</p><p className="mt-1 leading-5 text-slate-400">{selectedIndustryProfile.topFactors.join(" · ")}</p></div>
                  <div><p className="font-semibold text-rose-200">{isVi ? "Veto / cờ đỏ" : "Vetoes / red flags"}</p><p className="mt-1 leading-5 text-slate-400">{selectedIndustryProfile.redFlags.join(" · ")}</p></div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{isVi ? "Điểm tổng hợp" : "Composite Score"}</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{decisionScore.toFixed(1)}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-400">/100</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{isVi ? `Tương đương ${displayScore.toFixed(2)} / 5.0 trên thang tóm tắt.` : `Equivalent to ${displayScore.toFixed(2)} / 5.0 on summary scale.`}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{isVi ? "Kết quả Policy Engine" : "Policy Engine result"}</p>
                <Badge
                  className={`mt-3 px-3 py-1.5 text-sm font-bold ${
                    verdict.tone === "buy"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                      : verdict.tone === "sell"
                      ? "bg-red-500/10 text-red-300 border border-red-500/25"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/25"
                  }`}
                >
                  {verdict.label}
                </Badge>
                <p className="mt-3 text-sm text-slate-400">
                  {isVi ? `Xếp loại score thuần: ${scoreVerdict.label}. Policy còn kiểm tra confidence, evidence, validation và veto.` : `Score-only class: ${scoreVerdict.label}. Policy also checks confidence, evidence, validation and vetoes.`}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white">{isVi ? "Decision Policy Engine V3.2" : "Decision Policy Engine V3.2"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{isVi ? "Quality score = 65% điểm lõi + 20% vĩ mô + 15% phù hợp danh mục. Confidence và legal/risk gate không cộng vào score; chúng kiểm soát quyền hành động." : "Quality score = 65% core + 20% macro + 15% portfolio fit. Confidence and legal/risk gates do not add to the score; they control permission to act."}</p></div><div className={`rounded-xl border px-3 py-2 text-right ${verdict.tone === "buy" ? "border-emerald-400/20 bg-emerald-400/10" : verdict.tone === "sell" ? "border-rose-400/20 bg-rose-400/10" : "border-amber-400/20 bg-amber-400/10"}`}><p className="text-[10px] uppercase tracking-wider text-slate-500">{isVi ? "Hành động policy" : "Policy action"}</p><p className={`mt-1 text-lg font-black ${verdict.tone === "buy" ? "text-emerald-300" : verdict.tone === "sell" ? "text-rose-300" : "text-amber-300"}`}>{verdict.label}</p></div></div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <label className="block"><span className="text-xs font-semibold text-slate-400">{isVi ? "Chế độ vĩ mô" : "Macro regime"}</span><input type="range" min="0" max="100" value={macroScore} onChange={(event) => setMacroScore(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400" /><p className="mt-1 text-xs text-cyan-300">{macroScore}/100</p></label>
                <label className="block"><span className="text-xs font-semibold text-slate-400">{isVi ? "Phù hợp danh mục" : "Portfolio fit"}</span><input type="range" min="0" max="100" value={portfolioFitScore} onChange={(event) => setPortfolioFitScore(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400" /><p className="mt-1 text-xs text-cyan-300">{portfolioFitScore}/100</p></label>
                <label className="block"><span className="text-xs font-semibold text-slate-400">{isVi ? "Confidence hồ sơ" : "Dossier confidence"}</span><input type="range" min="0" max="100" value={confidenceScore} onChange={(event) => setConfidenceScore(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400" /><p className="mt-1 text-xs text-amber-300">{confidenceScore}/100</p></label>
                <div><span className="text-xs font-semibold text-slate-400">{isVi ? "Trạng thái kiểm định" : "Validation stage"}</span><div className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 font-mono text-xs text-cyan-200">{validationStage}</div><p className="mt-1 text-[10px] leading-4 text-slate-600">{isVi ? "Tự suy ra từ packet và validator, không chỉnh tay." : "Derived from packet gates and validator approval."}</p></div>
                <label className="block"><span className="text-xs font-semibold text-slate-400">{isVi ? "Cổng pháp lý/rủi ro" : "Legal/risk gate"}</span><select value={legalGate} onChange={(event) => setLegalGate(event.target.value as "clear" | "warning" | "hard-stop")} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none"><option value="clear">{isVi ? "Không có cờ đỏ" : "No red flag"}</option><option value="warning">{isVi ? "Cảnh báo cần kiểm chứng" : "Warning: verify"}</option><option value="hard-stop">{isVi ? "Hard-stop: chặn mua/giữ" : "Hard-stop: block buy/hold"}</option></select></label>
              </div>
              <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-5 text-slate-500">{isVi ? "RESEARCH chỉ được WATCH. Thiếu evidence hoặc confidence dưới ngưỡng trả NO-DECISION. Warning trả NO-TRADE. Hard-stop có thể yêu cầu thoát vị thế bất kể score." : "RESEARCH is WATCH-only. Missing evidence or low confidence returns NO-DECISION. A warning returns NO-TRADE. A hard stop may require exit regardless of score."}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/15 bg-cyan-400/[0.035]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg text-white">{isVi ? "Nghiên cứu có nguồn · backend" : "Source-mapped research · backend"}</CardTitle>
                <CardDescription className="mt-2">
                  {isVi ? "Đây là lớp dữ liệu và governance độc lập. Nó không thay thế hồ sơ bằng chứng của bạn và không phát hành khuyến nghị mua/bán." : "This is an independent data and governance layer. It does not replace your evidence dossier and does not issue buy/sell recommendations."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {researchResult && <Badge className="border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">{researchResult.status}</Badge>}
                {researchResult && <Button type="button" onClick={saveResearchSnapshot} disabled={researchSaving} className="h-8 border border-cyan-300/25 bg-transparent px-3 text-xs text-cyan-100 hover:bg-cyan-300/10"><Save className="mr-1.5 h-3.5 w-3.5" />{researchSaving ? (isVi ? "Đang lưu" : "Saving") : savedResearchRunId ? (isVi ? "Đã lưu" : "Saved") : (isVi ? "Lưu snapshot" : "Save snapshot")}</Button>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!symbol.trim() && <p className="text-sm text-slate-500">{isVi ? "Nhập mã để tải tham số được ánh xạ từ nguồn thị trường." : "Enter a ticker to load market-source-mapped parameters."}</p>}
            {symbol.trim() && researchLoading && <p className="text-sm text-slate-400">{isVi ? "Đang kiểm tra độ phủ và provenance…" : "Checking coverage and provenance…"}</p>}
            {researchError && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">{researchError}</p>}
            {researchResult && !researchLoading && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isVi ? "Độ phủ" : "Coverage"}</p><p className="mt-1 text-xl font-black text-cyan-200">{(researchResult.coverage * 100).toFixed(0)}%</p></div>
                  <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confidence</p><p className="mt-1 text-xl font-black text-cyan-200">{(researchResult.confidence * 100).toFixed(0)}%</p></div>
                  <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isVi ? "Điểm đã kiểm soát" : "Governed score"}</p><p className="mt-1 text-xl font-black text-white">{researchResult.stockScore.overallScore == null ? "N/A" : researchResult.stockScore.overallScore.toFixed(1)}</p></div>
                  <div className="rounded-xl border border-white/8 bg-slate-950/45 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isVi ? "Phân loại" : "Classification"}</p><p className="mt-1 text-sm font-bold text-white">{researchResult.stockScore.finalClassification}</p></div>
                </div>
                <p className="text-xs text-slate-500">{isVi ? "Nguồn dữ liệu" : "Data version"}: {researchResult.dataVersion} · {isVi ? "Phương pháp" : "Methodology"}: {researchResult.methodologyVersion} · {new Date(researchResult.asOf).toLocaleString()}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {researchResult.parameterResults.map((observation) => (
                    <div key={observation.parameterCode} className="rounded-xl border border-white/[0.07] bg-slate-950/35 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-cyan-200">{observation.parameterCode}</span><span className="text-[10px] font-bold text-slate-400">{observation.evidenceStatus}</span></div>
                      <p className="mt-1 text-xs text-slate-400">{isVi ? "Giá trị" : "Value"}: {observation.rawValue ?? "N/A"} · {isVi ? "Điểm chuẩn hoá" : "Normalized"}: {observation.normalizedScore == null ? "N/A" : observation.normalizedScore.toFixed(1)}</p>
                      {observation.citation && <div className="mt-2 border-t border-white/[0.06] pt-2 text-[10px] leading-4 text-slate-500"><span>{isVi ? "Nguồn" : "Source"}: </span>{observation.citation.sourceUrl ? <a href={observation.citation.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-300/35 underline-offset-2 hover:text-cyan-100">{observation.citation.sourceName}</a> : <span>{observation.citation.sourceName}</span>}{observation.citation.sourceFields.length > 0 && <span> · {observation.citation.sourceFields.join(", ")}</span>}{observation.citation.observedAt && <span> · {new Date(observation.citation.observedAt).toLocaleString()}</span>}</div>}
                      {observation.warnings.map((warning) => <p key={warning} className="mt-1 text-[10px] leading-4 text-amber-200/75">{warning}</p>)}
                    </div>
                  ))}
                </div>
                {researchResult.warnings.map((warning) => <p key={warning} className="text-xs leading-5 text-amber-200/85">{warning}</p>)}
              </div>
            )}
          </CardContent>
        </Card>

        <InvestmentParameterWorkbench symbol={symbol} industry={selectedIndustry} context="scoring" />

        <DocumentEvidencePanel storageKey="scoring-evidence-dossier" onChange={handleEvidenceChange} isVi={isVi} />

        {PILLAR_DEFINITIONS.map((pillar) => (
          <Card key={pillar.id} className="antigravity-panel border-white/5 bg-white/[0.015]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-white">{pillar.label}</CardTitle>
                  <CardDescription className="mt-2">{pillar.question}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isVi ? "Trọng số" : "Weight"}</p>
                  <p className="mt-1 text-xl font-black text-cyan-300">{pillar.overallWeight}%</p>
                  <p className="text-xs text-slate-400">{isVi ? `Điểm trụ cột ${pillarScores[pillar.id].toFixed(1)}/100` : `Pillar score ${pillarScores[pillar.id].toFixed(1)}/100`}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pillar.branches.map((branch) => {
                const scoreValue = branch.id === "self_discipline" ? selfDisciplineScore : branchScores[branch.id] ?? 0;
                return (
                  <div key={branch.id} className="rounded-2xl border border-white/5 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{branch.label}</p>
                          <Badge variant="outline" className="border-white/10 text-slate-300">
                            {branch.weight}%
                          </Badge>
                          {branch.inverse && (
                            <Badge variant="outline" className="border-amber-400/25 text-amber-300">
                              Contrarian
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{branch.description}</p>
                        <p className="mt-1 text-xs text-slate-500">{isVi ? "Gợi ý dữ liệu:" : "Data hint:"} {branch.promptHint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{isVi ? "Điểm nhánh" : "Branch Score"}</p>
                        <p className="mt-1 text-2xl font-black text-cyan-300">{Math.round(scoreValue)}</p>
                      </div>
                    </div>

                    {branch.id === "self_discipline" ? (
                      <div className="mt-4 grid gap-2">
                        {PSYCHOLOGY_CHECKS.map((check, index) => (
                          <label key={check} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={disciplineChecks[index]}
                              onChange={(e) => {
                                setDisciplineChecks((prev) => prev.map((item, itemIndex) => (
                                  itemIndex === index ? e.target.checked : item
                                )));
                              }}
                              className="mt-0.5 h-4 w-4 rounded border-white/10 bg-transparent accent-cyan-400"
                            />
                            <span>{check}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={scoreValue}
                          onChange={(e) => handleBranchScoreChange(branch.id, Number(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-900 accent-[#54a0ff]"
                        />
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{isVi ? "0 = rất yếu" : "0 = very weak"}</span>
                          <span>{isVi ? "50 = trung bình ngành" : "50 = industry avg"}</span>
                          <span>{isVi ? "100 = xuất sắc" : "100 = excellent"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <Card className="antigravity-panel border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
              <Sparkles className="h-5 w-5 text-cyan-300" />
              {isVi ? "Tạo prompt tự động cho AI chat" : "Auto-generate AI Chat Prompt"}
            </CardTitle>
            <CardDescription>
              {isVi ? "Dùng prompt này để chat sâu hơn với AI ngoài phần chấm điểm chỉ số đầu vào." : "Use this prompt to have a deeper AI conversation beyond the scored input metrics."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={autoPrompt}
              readOnly
              className="min-h-[220px] w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 focus:outline-none"
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopyPrompt} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                <Copy className="mr-2 h-4 w-4" />
                {isVi ? "Sao chép prompt" : "Copy Prompt"}
              </Button>
              <Button onClick={handleSave} variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">
                <Save className="mr-2 h-4 w-4" />
                {isVi ? "Lưu bản chấm điểm" : "Save Score"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">{isVi ? "Ghi chú triển khai z-score theo ngành" : "Industry Z-Score Implementation Notes"}</CardTitle>
            <CardDescription>
              {isVi ? "Các lưu ý này bám theo khung chuẩn hóa ngành và logic contrarian cho trụ cột tâm lý." : "These notes follow the industry normalization framework and contrarian logic for the psychology pillar."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {ZSCORE_NOTES.map((note) => (
              <div key={note} className="rounded-2xl border border-white/5 bg-slate-950/35 p-4 text-sm leading-relaxed text-slate-300">
                {note}
              </div>
            ))}
          </CardContent>
        </Card>

        {savedScores.length > 0 && (
          <Card className="antigravity-panel border-white/5 bg-white/[0.015]">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">{isVi ? "Lịch sử chấm điểm" : "Score History"}</CardTitle>
              <CardDescription>{isVi ? "Lưu để so sánh các lần đánh giá và dùng tiếp cho timeline/catalyst." : "Save to compare assessments and reuse for timeline/catalyst analysis."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedScores.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-950/35 p-4 transition-colors hover:bg-white/[0.03]"
                  >
                    <button onClick={() => handleLoadScore(record)} className="text-left">
                      <p className="font-mono text-sm font-black text-white">{record.symbol}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.date}</p>
                    </button>
                    <div className="flex items-center gap-3">
                      <Badge className="border border-white/10 bg-white/5 text-slate-200">
                        {record.totalScore.toFixed(1)}/100
                      </Badge>
                      <Badge
                        className={`${
                          record.verdict.tone === "buy"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : record.verdict.tone === "sell"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {record.verdict.label}
                      </Badge>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="rounded-full p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        title={isVi ? "Xóa bản chấm điểm" : "Delete score"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <div className="h-full flex-1 space-y-6 overflow-y-auto bg-slate-950/20 p-6">
        <ExecutiveBanner
          score={decisionScore}
          verdict={verdict}
          symbol={symbol}
          name={symbol ? undefined : (isVi ? "Chọn mã để phân tích" : "Select a ticker to analyze")}
          data={dashboardData}
        />
        <BenchmarkingGrid industry={selectedIndustryMeta.label} data={dashboardData} />
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.015] px-4 py-3">
          <p className="text-sm text-slate-400">{isVi ? "Chế độ tập trung chỉ giữ biểu đồ so sánh ngành. Mở phần bổ trợ khi cần kiểm tra phân rã điểm và catalyst." : "Focus mode keeps only the industry comparison. Open supporting visuals when you need score attribution and catalysts."}</p>
          <Button type="button" variant="outline" onClick={() => setShowSupportingVisuals((value) => !value)} className="shrink-0 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">{showSupportingVisuals ? (isVi ? "Ẩn bổ trợ" : "Hide support") : (isVi ? "Mở bổ trợ" : "Show support")}</Button>
        </div>
        {showSupportingVisuals && <><WaterfallAttribution scores={radarScores} weights={radarWeights} data={dashboardData} /><CatalystTimeline data={dashboardData} /></>}
        <Card className="antigravity-panel border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">{isVi ? "Khung diễn giải 4 trụ cột" : "4-Pillar Interpretation Framework"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {PILLAR_DEFINITIONS.map((pillar) => (
              <div key={pillar.id} className="rounded-2xl border border-white/5 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{pillar.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{pillar.question}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{isVi ? "Điểm" : "Score"}</p>
                    <p className="text-lg font-black text-cyan-300">{pillarScores[pillar.id].toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

