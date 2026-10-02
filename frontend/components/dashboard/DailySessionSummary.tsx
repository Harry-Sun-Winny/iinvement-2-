"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, Check, Clock3, Loader2, Minus, X } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";
import { fmtCompactMoney, fmtQuantity as fmtCompactNumber, fmtCompactSignedMoney, fmtMoney } from "@/app/lib/finance/currency";
import { DailySessionSummary as Summary } from "@/app/lib/finance/daily-session";
import AutoSizedChart from "@/components/charts/AutoSizedChart";

interface PortfolioOption {
  id: string;
  name: string;
}

export interface MonthlyTrendPoint {
  date: string;
  value: number;
  valueChange: number;
  changePercent: number;
}

interface Props {
  summary: Summary;
  currency: string;
  tradingDate?: string | null;
  collapsible?: boolean;
  portfolios?: PortfolioOption[];
  monthlyTrend?: MonthlyTrendPoint[];
  onTransferPosition?: (
    sourcePortfolioId: string,
    targetPortfolioId: string,
    symbol: string,
  ) => Promise<{ transactionCount: number }>;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatTradingDate(value: string, locale: "vi-VN" | "en-US") {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function DailySessionSummary({
  summary,
  currency,
  tradingDate,
  collapsible = false,
  portfolios = [],
  monthlyTrend = [],
  onTransferPosition,
}: Props) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const numberLocale = isVi ? "vi-VN" : "en-US";
  const positive = summary.valueChange >= 0;
  const hasData = summary.advancing + summary.declining + summary.unchanged > 0;
  const [moveOpenKey, setMoveOpenKey] = useState<string | null>(null);
  const [targetByKey, setTargetByKey] = useState<Record<string, string>>({});
  const [movingKey, setMovingKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const monthlyLast = monthlyTrend.at(-1);
  const formattedTradingDate = tradingDate
    ? formatTradingDate(tradingDate, isVi ? "vi-VN" : "en-US")
    : null;

  const positionKey = (position: Summary["contributors"][number]) =>
    `${position.portfolioId ?? "unknown"}:${position.symbol}`;

  async function submitTransfer(position: Summary["contributors"][number]) {
    if (!position.portfolioId || !onTransferPosition) return;
    const key = positionKey(position);
    const targetPortfolioId = targetByKey[key];
    if (!targetPortfolioId) {
      setActionMessage({ tone: "error", text: isVi ? "Hãy chọn danh mục đích." : "Select a target portfolio." });
      return;
    }

    setMovingKey(key);
    setActionMessage(null);
    try {
      const result = await onTransferPosition(position.portfolioId, targetPortfolioId, position.symbol);
      const targetName = portfolios.find(portfolio => portfolio.id === targetPortfolioId)?.name ?? "";
      setActionMessage({
        tone: "success",
        text: isVi
          ? `Đã chuyển ${position.symbol} sang ${targetName}. ${result.transactionCount} giao dịch lịch sử đã được cập nhật.`
          : `${position.symbol} moved to ${targetName}. ${result.transactionCount} historical transaction(s) updated.`,
      });
      setMoveOpenKey(null);
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : (isVi ? "Không thể chuyển cổ phiếu." : "Could not move the position."),
      });
    } finally {
      setMovingKey(null);
    }
  }

  return (
    <section className="antigravity-panel border border-white/5 bg-white/[0.02] p-5" aria-label={isVi ? "Tổng kết phiên gần nhất" : "Latest session summary"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="h-4 w-4 text-cyan-300" />
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
              {isVi ? "Tổng kết phiên gần nhất" : "Latest session summary"}
            </h3>
            {formattedTradingDate && (
              <span className="border-l border-white/10 pl-2 text-[11px] font-semibold text-slate-400">
                {isVi ? "Ngày giao dịch" : "Trading date"}{" "}
                <time dateTime={tradingDate ?? undefined} className="font-mono text-slate-200">
                  {formattedTradingDate}
                </time>
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {isVi ? "So với giá đóng cửa phiên giao dịch liền trước." : "Compared with the previous trading session close."}
            {" "}
            {isVi ? "Dữ liệu có thể trễ và chỉ mang tính thông tin." : "Market data may be delayed and is informational only."}
          </p>
        </div>

        {hasData ? (
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-2.5 ${positive ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
              {positive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${positive ? "text-emerald-400" : "text-red-400"}`}>
                {fmtCompactSignedMoney(summary.valueChange, currency, numberLocale)}
              </p>
              <p className={`text-sm font-bold ${positive ? "text-emerald-300" : "text-red-300"}`}>
                {signedPercent(summary.changePercent)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{isVi ? "Chưa có đủ giá phiên để tổng kết." : "Session prices are not available yet."}</p>
        )}
      </div>

      {hasData && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-black/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{isVi ? "Giá trị cuối phiên" : "Latest value"}</p>
            <p className="mt-1 font-bold text-white">{fmtCompactMoney(summary.value, currency, numberLocale)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{isVi ? "Độ rộng danh mục" : "Portfolio breadth"}</p>
            <p className="mt-1 text-sm font-bold">
              <span className="text-emerald-400">{summary.advancing} ↑</span>
              <span className="mx-2 text-red-400">{summary.declining} ↓</span>
              <span className="text-slate-400">{summary.unchanged} <Minus className="inline h-3 w-3" /></span>
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{isVi ? "Đóng góp tốt nhất" : "Best contributor"}</p>
            <p className="mt-1 font-bold text-emerald-400">
              {summary.best ? `${summary.best.symbol} · ${fmtCompactSignedMoney(summary.best.valueChange, currency, numberLocale)}` : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{isVi ? "Đóng góp thấp nhất" : "Lowest contributor"}</p>
            <p className={`mt-1 font-bold ${summary.worst && summary.worst.valueChange < 0 ? "text-red-400" : "text-slate-300"}`}>
              {summary.worst ? `${summary.worst.symbol} · ${fmtCompactSignedMoney(summary.worst.valueChange, currency, numberLocale)}` : "-"}
            </p>
          </div>
        </div>
      )}

      {summary.unavailable > 0 && (
        <p className="mt-3 text-[11px] text-amber-400">
          {isVi
            ? `${summary.unavailable} mã chưa có đủ giá đóng cửa phiên trước nên chưa được tính.`
            : `${summary.unavailable} position(s) were excluded because the previous close is unavailable.`}
        </p>
      )}

      {hasData && summary.contributors.length > 0 && (
        <details open={collapsible ? undefined : true} className="mt-5 border-t border-white/5 pt-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400">
            <span>
              {isVi ? "Chi tiết đóng góp theo mã" : "Position contribution details"}
            </span>
            <span className="ml-2 text-[11px] text-slate-500">({summary.contributors.length})</span>
          </summary>
          <p className="mt-3 text-[11px] text-slate-500">{isVi ? "Xếp theo mức ảnh hưởng" : "Sorted by impact"}</p>

          {actionMessage && (
            <div
              role={actionMessage.tone === "error" ? "alert" : "status"}
              className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                actionMessage.tone === "success"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-400/20 bg-red-500/10 text-red-300"
              }`}
            >
              {actionMessage.tone === "success" ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {monthlyTrend.length > 1 && monthlyLast && (
            <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-400/[0.035] p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">{isVi ? "Diễn biến 1 tháng" : "One-month trend"}</h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    {isVi
                      ? "Ước tính theo biến động giá của lượng cổ phiếu đang nắm giữ, không điều chỉnh dòng tiền trong tháng."
                      : "Estimated from the price movement of current holdings, without monthly cash-flow adjustments."}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`font-mono text-sm font-bold ${monthlyLast.valueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmtCompactSignedMoney(monthlyLast.valueChange, currency, numberLocale)}
                  </p>
                  <p className={`text-[11px] font-semibold ${monthlyLast.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {signedPercent(monthlyLast.changePercent)}
                  </p>
                </div>
              </div>
              <div
                role="img"
                aria-label={isVi ? "Biểu đồ phần trăm thay đổi giá trị trong một tháng" : "One-month portfolio value percentage chart"}
                className="mt-3 h-52 min-w-0"
              >
                <AutoSizedChart>
                  <AreaChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                    <defs>
                      <linearGradient id="monthlySessionTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.09)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      tickFormatter={value => new Date(value).toLocaleDateString(isVi ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit" })}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      dataKey="changePercent"
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      tickFormatter={value => `${Number(value).toFixed(1)}%`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(34,211,238,0.25)" }}
                      contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                      labelFormatter={value => new Date(value).toLocaleDateString(isVi ? "vi-VN" : "en-US")}
                      formatter={(value) => [`${Number(value).toFixed(2)}%`, isVi ? "Thay đổi" : "Change"]}
                    />
                    <Area type="monotone" dataKey="changePercent" stroke="#22d3ee" fill="url(#monthlySessionTrend)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  </AreaChart>
                </AutoSizedChart>
              </div>
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {summary.contributors.map((position) => {
              const isPositive = position.valueChange >= 0;
              const key = positionKey(position);
              const availableTargets = portfolios.filter(portfolio => portfolio.id !== position.portfolioId);
              return (
                <div key={key} className="rounded-xl border border-white/5 bg-black/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-white">{position.symbol}</p>
                      {position.portfolioName && (
                        <p className="mt-1 max-w-[16rem] truncate text-[10px] font-semibold text-cyan-300/80" title={position.portfolioName}>
                          {isVi ? "Danh mục" : "Portfolio"}: {position.portfolioName}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {isVi ? `Nắm giữ ${fmtCompactNumber(position.quantity, numberLocale)}` : `${fmtCompactNumber(position.quantity, numberLocale)} held`}
                      </p>
                    </div>
                    <p className={`text-right text-sm font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtCompactSignedMoney(position.valueChange, currency, numberLocale)} <span className="text-[11px]">{signedPercent(position.changePercent)}</span>
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/5 pt-2 text-[10px] sm:grid-cols-4">
                    <span className="min-w-0 text-slate-500">
                      <span className="block">{isVi ? "Đóng cửa trước" : "Previous close"}</span>
                      <b className="mt-0.5 block truncate font-mono text-slate-300">{position.previousClose == null ? "-" : fmtMoney(position.previousClose, currency)}</b>
                    </span>
                    <span className="min-w-0 text-slate-500">
                      <span className="block">{isVi ? "Hiện tại" : "Current"}</span>
                      <b className="mt-0.5 block truncate font-mono text-slate-300">{position.currentPrice == null ? "-" : fmtMoney(position.currentPrice, currency)}</b>
                    </span>
                    <span className="min-w-0 text-slate-500">
                      <span className="block">{isVi ? "Cao nhất phiên" : "Session high"}</span>
                      <b className="mt-0.5 block truncate font-mono text-emerald-300">{position.sessionHigh == null ? "-" : fmtMoney(position.sessionHigh, currency)}</b>
                    </span>
                    <span className="min-w-0 text-slate-500">
                      <span className="block">{isVi ? "Thấp nhất phiên" : "Session low"}</span>
                      <b className="mt-0.5 block truncate font-mono text-red-300">{position.sessionLow == null ? "-" : fmtMoney(position.sessionLow, currency)}</b>
                    </span>
                  </div>

                  {position.portfolioId && onTransferPosition && availableTargets.length > 0 && (
                    <div className="mt-2 border-t border-white/5 pt-2">
                      {moveOpenKey === key ? (
                        <div className="space-y-2">
                          <p className="text-[10px] leading-4 text-slate-500">
                            {isVi
                              ? "Chuyển toàn bộ lịch sử giao dịch của mã này để giữ nguyên giá vốn."
                              : "Move the full transaction history to preserve cost basis."}
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                              aria-label={isVi ? `Danh mục đích cho ${position.symbol}` : `Target portfolio for ${position.symbol}`}
                              value={targetByKey[key] ?? ""}
                              onChange={event => setTargetByKey(current => ({ ...current, [key]: event.target.value }))}
                              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#10182a] px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50"
                            >
                              <option value="">{isVi ? "Chọn danh mục đích" : "Select target portfolio"}</option>
                              {availableTargets.map(portfolio => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
                            </select>
                            <button
                              type="button"
                              disabled={movingKey === key || !targetByKey[key]}
                              onClick={() => void submitTransfer(position)}
                              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {movingKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              {isVi ? "Xác nhận" : "Confirm"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMoveOpenKey(key);
                            setActionMessage(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-300/10 active:scale-[0.98]"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          {isVi ? "Chuyển danh mục" : "Move portfolio"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
