"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Save, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
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

const DEFAULT_BRANCH_SCORES: Record<string, number> = Object.fromEntries(
  PILLAR_DEFINITIONS.flatMap((pillar) => pillar.branches.map((branch) => [branch.id, 60])),
);

const DEFAULT_SELF_CHECKS = [true, true, false, true];

export default function ScoringPage() {
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

  const displayScore = useMemo(() => toFivePointScale(totalScore), [totalScore]);
  const verdict = useMemo(() => classifyScore(totalScore), [totalScore]);

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

  const autoPrompt = useMemo(
    () =>
      buildAutoPrompt({
        symbol: symbol.trim().toUpperCase(),
        industryLabel: selectedIndustryMeta.label,
        totalScore,
        verdictLabel: verdict.label,
        pillarScores,
        branchScores: { ...branchScores, self_discipline: selfDisciplineScore },
      }),
    [branchScores, pillarScores, selectedIndustryMeta.label, selfDisciplineScore, symbol, totalScore, verdict.label],
  );

  const handleBranchScoreChange = (branchId: string, value: number) => {
    setBranchScores((prev) => ({ ...prev, [branchId]: value }));
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(autoPrompt);
      toast.success("Đã sao chép prompt tự động");
    } catch {
      toast.error("Không thể sao chép prompt");
    }
  };

  const handleSave = () => {
    const record: SavedScore = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase() || "STOCK",
      industry: selectedIndustry,
      branchScores: { ...branchScores, self_discipline: selfDisciplineScore },
      pillarScores,
      totalScore,
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
    toast.success(`Đã lưu kết quả cho ${record.symbol}`);
  };

  const handleDelete = (id: string) => {
    const updated = savedScores.filter((record) => record.id !== id);
    setSavedScores(updated);
    localStorage.setItem("saved_stock_scores", JSON.stringify(updated));
    toast.success("Đã xóa bản chấm điểm");
  };

  const handleLoadScore = (record: SavedScore) => {
    setSelectedIndustry(record.industry);
    setSymbol(record.symbol);
    setBranchScores({ ...DEFAULT_BRANCH_SCORES, ...record.branchScores });
    if (typeof record.branchScores.self_discipline === "number") {
      const filled = Math.round((record.branchScores.self_discipline / 100) * disciplineChecks.length);
      setDisciplineChecks(disciplineChecks.map((_, index) => index < filled));
    }
    toast.success(`Đã tải bản chấm điểm của ${record.symbol}`);
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <main className="h-full w-[820px] shrink-0 space-y-6 overflow-y-auto border-r border-white/5 p-6">
        <header className="mb-7">
          <p className="text-sm font-medium text-[#54a0ff]">Khung đánh giá đa chiều</p>
          <h2 className="mt-2 text-3xl font-black rainbow-text">Chấm điểm cổ phiếu chuyên sâu</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            Bản này thay 4 thanh chấm điểm thô bằng chấm điểm chi tiết theo từng nhánh trong 4 trụ cột:
            cơ bản chọn cổ phiếu, kỹ thuật chọn thời điểm, định lượng đo rủi ro, tâm lý giữ kỷ luật.
          </p>
        </header>

        <Card className="antigravity-panel border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Thiết lập phân tích</CardTitle>
            <CardDescription>
              Chọn mã, nhóm ngành và tinh chỉnh từng nhánh theo đúng logic chấm điểm bạn đưa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative space-y-2" ref={suggestRef}>
                <label className="text-xs font-bold uppercase text-slate-400">Mã cổ phiếu</label>
                <Input
                  value={symbol}
                  placeholder="Nhập mã hoặc tên công ty"
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => symbol && setShowSuggestions(true)}
                  className="border-white/10 bg-slate-950/70 font-mono uppercase text-white placeholder:text-slate-500"
                />
                {showSuggestions && (searchLoading || suggestions.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/5 bg-[#0b0c10] shadow-2xl">
                    {searchLoading && <div className="px-4 py-2.5 text-xs text-slate-400">Đang tìm kiếm...</div>}
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
                <label className="text-xs font-bold uppercase text-slate-400">Nhóm ngành phân tích</label>
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
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Điểm tổng hợp</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{totalScore.toFixed(1)}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-400">/100</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Tương đương {displayScore.toFixed(2)} / 5.0 trên thang tóm tắt.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Xếp loại</p>
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
                  Công thức tổng: 35% Cơ bản, 25% Kỹ thuật, 25% Định lượng, 15% Tâm lý.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {PILLAR_DEFINITIONS.map((pillar) => (
          <Card key={pillar.id} className="antigravity-panel border-white/5 bg-white/[0.015]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-white">{pillar.label}</CardTitle>
                  <CardDescription className="mt-2">{pillar.question}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Trọng số</p>
                  <p className="mt-1 text-xl font-black text-cyan-300">{pillar.overallWeight}%</p>
                  <p className="text-xs text-slate-400">Điểm trụ cột {pillarScores[pillar.id].toFixed(1)}/100</p>
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
                        <p className="mt-1 text-xs text-slate-500">Gợi ý dữ liệu: {branch.promptHint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Điểm nhánh</p>
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
                          <span>0 = rất yếu</span>
                          <span>50 = trung bình ngành</span>
                          <span>100 = xuất sắc</span>
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
              Tạo prompt tự động cho AI chat
            </CardTitle>
            <CardDescription>
              Dùng prompt này để chat sâu hơn với AI ngoài phần chấm điểm chỉ số đầu vào.
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
                Sao chép prompt
              </Button>
              <Button onClick={handleSave} variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">
                <Save className="mr-2 h-4 w-4" />
                Lưu bản chấm điểm
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="antigravity-panel border-white/5 bg-white/[0.01]">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Ghi chú triển khai z-score theo ngành</CardTitle>
            <CardDescription>
              Các lưu ý này bám theo khung chuẩn hóa ngành và logic contrarian cho trụ cột tâm lý.
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
              <CardTitle className="text-lg font-bold text-white">Lịch sử chấm điểm</CardTitle>
              <CardDescription>Lưu để so sánh các lần đánh giá và dùng tiếp cho timeline/catalyst.</CardDescription>
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
                        title="Xóa bản chấm điểm"
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
          score={displayScore}
          verdict={verdict}
          symbol={symbol}
          name={symbol ? undefined : "Chọn mã để phân tích"}
          data={dashboardData}
        />
        <WaterfallAttribution scores={radarScores} weights={radarWeights} data={dashboardData} />
        <BenchmarkingGrid industry={selectedIndustryMeta.label} data={dashboardData} />
        <CatalystTimeline data={dashboardData} />
        <Card className="antigravity-panel border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Khung diễn giải 4 trụ cột</CardTitle>
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
                    <p className="text-xs text-slate-500">Điểm</p>
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
