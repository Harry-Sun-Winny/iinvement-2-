"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { queryOptions, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiService } from "@/services/ai.service";
import { createPortfolioContext, createStockContext, loadMarketIntelligence } from "@/services/analysis.service";
import { marketService } from "@/services/market.service";
import type { AnalysisMode, AnalysisViewModel, MarketIntelligence, SortKey } from "@/types/analysis";
import { selectPortfolioMetrics } from "@/utils/risk";

const INTELLIGENCE_STALE_TIME = 15 * 60_000;

export interface AnalysisState {
  selectedId: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  analysisMode: AnalysisMode;
  selectedSymbol: string;
  stockQuestion: string;
  analysisStatus: string;
  localError: string;
  aiAnalysis: string; // Add this
}

export type AnalysisAction =
  | { type: "SELECT_PORTFOLIO"; payload: string }
  | { type: "SET_SORT"; payload: SortKey }
  | { type: "SET_MODE"; payload: AnalysisMode }
  | { type: "SET_SYMBOL"; payload: string }
  | { type: "SET_QUESTION"; payload: string }
  | { type: "SET_STATUS"; payload: string }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_AI_ANALYSIS"; payload: string }; // Add this

const initialState: AnalysisState = {
  selectedId: "",
  sortKey: "value",
  sortDir: "desc",
  analysisMode: "stock",
  selectedSymbol: "",
  stockQuestion: "Đánh giá xu hướng, catalyst và rủi ro quan trọng nhất của cổ phiếu này trong danh mục của tôi.",
  analysisStatus: "",
  localError: "",
  aiAnalysis: "", // Initialize
};

function reducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case "SELECT_PORTFOLIO": return { ...state, selectedId: action.payload, selectedSymbol: "", localError: "" };
    case "SET_SORT": return action.payload === state.sortKey ? { ...state, sortDir: state.sortDir === "asc" ? "desc" : "asc" } : { ...state, sortKey: action.payload, sortDir: "desc" };
    case "SET_MODE": return { ...state, analysisMode: action.payload, localError: "" };
    case "SET_SYMBOL": return { ...state, selectedSymbol: action.payload, localError: "" };
    case "SET_QUESTION": return { ...state, stockQuestion: action.payload };
    case "SET_STATUS": return { ...state, analysisStatus: action.payload };
    case "SET_ERROR": return { ...state, localError: action.payload };
    case "SET_AI_ANALYSIS": return { ...state, aiAnalysis: action.payload };
    default: return state;
  }
}

const intelligenceQueryOptions = (symbol: string) => queryOptions({
  queryKey: ["analysis", "market-intelligence", symbol] as const,
  queryFn: async (): Promise<MarketIntelligence> => {
    const result = (await loadMarketIntelligence([symbol]))[0];
    if (!result) throw new Error(`Không thể tải market intelligence cho ${symbol}.`);
    return result;
  },
  staleTime: INTELLIGENCE_STALE_TIME,
  gcTime: 60 * 60_000,
  refetchInterval: INTELLIGENCE_STALE_TIME,
  refetchOnWindowFocus: true,
  retry: 2,
});

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Không thể tải dữ liệu phân tích.";

export function usePortfolioAnalysis() {
  const [ui, dispatch] = useReducer(reducer, initialState);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!localStorage.getItem("token")) window.location.href = "/login";
  }, []);

  const portfoliosQuery = useQuery({
    queryKey: ["analysis", "portfolios"],
    queryFn: marketService.getPortfolios,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });

  useEffect(() => {
    const portfolios = portfoliosQuery.data ?? [];
    if (portfolios.length && !portfolios.some(portfolio => portfolio.id === ui.selectedId)) {
      dispatch({ type: "SELECT_PORTFOLIO", payload: portfolios[0].id });
    }
  }, [portfoliosQuery.data, ui.selectedId]);

  const transactionsQuery = useQuery({
    queryKey: ["analysis", "transactions", ui.selectedId],
    queryFn: () => marketService.getTransactions(ui.selectedId),
    enabled: Boolean(ui.selectedId),
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
    retry: 2,
  });

  const symbols = useMemo(() => [...new Set((transactionsQuery.data ?? []).map(transaction => transaction.assetSymbol))].sort(), [transactionsQuery.data]);
  const pricesQuery = useQuery({
    queryKey: ["analysis", "prices", symbols],
    queryFn: () => marketService.getPrices(symbols),
    enabled: symbols.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  const portfolioMetrics = useMemo(
    () => selectPortfolioMetrics(transactionsQuery.data ?? [], pricesQuery.data ?? {}, ui.sortKey, ui.sortDir),
    [pricesQuery.data, transactionsQuery.data, ui.sortDir, ui.sortKey],
  );

  useEffect(() => {
    if (portfolioMetrics.positions.length && !portfolioMetrics.positions.some(position => position.symbol === ui.selectedSymbol)) {
      dispatch({ type: "SET_SYMBOL", payload: portfolioMetrics.positions[0].symbol });
    }
  }, [portfolioMetrics.positions, ui.selectedSymbol]);

  const intelligenceSymbols = useMemo(() => ui.analysisMode === "stock"
    ? ui.selectedSymbol ? [ui.selectedSymbol] : []
    : [...portfolioMetrics.pricedPositions].sort((a, b) => b.value - a.value).slice(0, 3).map(position => position.symbol),
  [portfolioMetrics.pricedPositions, ui.analysisMode, ui.selectedSymbol]);

  useQueries({ queries: intelligenceSymbols.map(intelligenceQueryOptions) });

  const analysisMutation = useMutation<string, Error, { context: unknown; request: string }>({
    mutationFn: payload => aiService.analyze(payload.context, payload.request),
    retry: 1,
  });
  const resetAnalysis = analysisMutation.reset;
  const analyze = analysisMutation.mutateAsync;
  const refreshPrices = pricesQuery.refetch;

  const getCachedIntelligence = useCallback((requestedSymbols: string[]) => Promise.all(
    requestedSymbols.map(symbol => queryClient.fetchQuery(intelligenceQueryOptions(symbol))),
  ), [queryClient]);

  const runAnalysis = useCallback(async () => {
    if (!portfolioMetrics.positions.length) return;

    dispatch({ type: "SET_AI_ANALYSIS", payload: '' });
    dispatch({ type: "SET_STATUS", payload: 'Đang phân tích...' });
    dispatch({ type: "SET_ERROR", payload: "" });

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:     ui.analysisMode,
          symbol:   ui.selectedSymbol,
          question: ui.stockQuestion,
          positions: portfolioMetrics.positions,
          prices:    pricesQuery.data,
        })
      })

      if (!res.ok) throw new Error(await res.text())

      // ⚡ Đọc stream → cập nhật UI realtime từng chunk
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        fullText += decoder.decode(value, { stream: true })

        // Cập nhật state mỗi chunk → user thấy AI đang "gõ"
        dispatch({ type: "SET_AI_ANALYSIS", payload: fullText });
        dispatch({ type: "SET_STATUS", payload: 'Đang phân tích...' });
      }

      dispatch({ type: "SET_STATUS", payload: 'Hoàn tất' });

    } catch (err: any) {
      dispatch({ type: "SET_ERROR", payload: `Lỗi phân tích: ${err.message}` });
      dispatch({ type: "SET_STATUS", payload: '' });
    }
  }, [ui.analysisMode, ui.selectedSymbol, ui.stockQuestion, portfolioMetrics.positions, pricesQuery.data]);

  const queryError = portfoliosQuery.error ?? transactionsQuery.error ?? pricesQuery.error;
  const state: AnalysisViewModel = {
    portfolios: portfoliosQuery.data ?? [],
    selectedId: ui.selectedId,
    positions: portfolioMetrics.positions,
    prices: pricesQuery.data ?? {},
    aiAnalysis: ui.aiAnalysis,
    analysisLoading: analysisMutation.isPending || Boolean(ui.analysisStatus),
    analysisStatus: ui.analysisStatus,
    priceLoading: transactionsQuery.isLoading || pricesQuery.isLoading || pricesQuery.isFetching,
    error: ui.localError || (analysisMutation.error ? errorMessage(analysisMutation.error) : queryError ? errorMessage(queryError) : ""),
    sortKey: ui.sortKey,
    sortDir: ui.sortDir,
    analysisMode: ui.analysisMode,
    selectedSymbol: ui.selectedSymbol,
    stockQuestion: ui.stockQuestion,
  };

  const actions = useMemo(() => ({
    selectPortfolio: (id: string) => { resetAnalysis(); dispatch({ type: "SELECT_PORTFOLIO", payload: id }); },
    setMode: (mode: AnalysisMode) => { resetAnalysis(); dispatch({ type: "SET_MODE", payload: mode }); },
    selectSymbol: (symbol: string) => { resetAnalysis(); dispatch({ type: "SET_SYMBOL", payload: symbol }); },
    setQuestion: (question: string) => dispatch({ type: "SET_QUESTION", payload: question }),
    toggleSort: (key: SortKey) => dispatch({ type: "SET_SORT", payload: key }),
    refreshPrices: () => void refreshPrices(),
    runAnalysis,
    logout: () => { localStorage.removeItem("token"); window.location.href = "/login"; },
  }), [refreshPrices, resetAnalysis, runAnalysis]);

  return { state, derived: portfolioMetrics, actions };
}
