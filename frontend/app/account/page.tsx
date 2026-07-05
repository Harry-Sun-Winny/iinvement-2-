"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AiConversation,
  getAiConversations,
  getGoals,
  getNotifications,
  getPortfolios,
  getTransactions,
  getWatchlists,
  Goal,
  NotificationItem,
  Portfolio,
  Transaction,
  Watchlist,
} from "../lib/api";

import Alert from "@/components/ui/Alert";

type SecurityEvent = {
  action: string;
  detail: string;
  time: string;
  severity: "info" | "warn" | "success";
};

const roadmapItems = [
  "Đổi mật khẩu",
  "Đổi email",
  "Đổi số điện thoại",
  "Email OTP",
  "SMS OTP",
  "Authenticator TOTP",
  "Google Login",
  "Apple Login",
  "Đăng xuất thiết bị khác",
  "Xuất dữ liệu cá nhân",
  "Xóa tài khoản",
  "Quản lý cookie",
];

export default function AccountPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [aiConversations, setAiConversations] = useState<AiConversation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setEmail(readEmailFromJwt(token));
    setSessionStartedAt(new Date().toISOString());
    setEmailOtpEnabled(localStorage.getItem("security.emailOtp") === "enabled");
    setTotpEnabled(localStorage.getItem("security.totp") === "enabled");
    loadAccountData();
  }, []);

  async function loadAccountData() {
    setLoadingAccount(true);
    setError("");
    try {
      const [portfolioData, watchlistData, goalData, notificationData, conversationData] = await Promise.all([
        withTimeout(getPortfolios(), [], 8000),
        withTimeout(getWatchlists(), [], 8000),
        withTimeout(getGoals(), [], 8000),
        withTimeout(getNotifications(), [], 4000),
        withTimeout(getAiConversations(), [], 4000),
      ]);
      setPortfolios(portfolioData);
      setWatchlists(watchlistData);
      setGoals(goalData);
      setNotifications(notificationData);
      setAiConversations(conversationData);
    } catch (err: any) {
      setError(err?.message || "Không tải được dữ liệu tài khoản");
      setLoadingAccount(false);
    }
  }

  useEffect(() => {
    if (portfolios.length === 0) {
      setTransactions([]);
      setLoadingAccount(false);
      return;
    }

    let cancelled = false;
    setLoadingAccount(false);
    setLoadingTransactions(true);
    Promise.all(portfolios.map((portfolio) => withTimeout(getTransactions(portfolio.id), [], 5000)))
      .then((txGroups) => {
        if (!cancelled) setTransactions(txGroups.flat());
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTransactions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [portfolios]);

  const securityEvents = useMemo<SecurityEvent[]>(() => {
    const latestTx = transactions.slice(0, 5).map((tx) => ({
      action: tx.type === "SELL" ? "Bán tài sản" : "Mua tài sản",
      detail: `${tx.assetSymbol} · ${tx.quantity} @ ${tx.price} ${tx.currency}`,
      time: tx.createdAt || tx.transactionDate,
      severity: "info" as const,
    }));

    return [
      {
        action: "Đăng nhập",
        detail: email ? `Phiên hiện tại cho ${email}` : "Phiên hiện tại",
        time: sessionStartedAt,
        severity: "success",
      },
      ...latestTx,
    ];
  }, [email, sessionStartedAt, transactions]);

  const interestedTopics = useMemo(() => {
    const symbols = [...new Set(transactions.map((tx) => tx.assetSymbol).filter(Boolean))].slice(0, 8);
    if (symbols.length === 0) return ["Công nghệ Mỹ", "Crypto", "Vàng"];
    return symbols;
  }, [transactions]);

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  function toggleEmailOtp() {
    const next = !emailOtpEnabled;
    setEmailOtpEnabled(next);
    localStorage.setItem("security.emailOtp", next ? "enabled" : "disabled");
  }

  function toggleTotp() {
    const next = !totpEnabled;
    setTotpEnabled(next);
    localStorage.setItem("security.totp", next ? "enabled" : "disabled");
  }

  return (
    <>

      <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[800px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {/* Profile Details Panel */}
          <div className="antigravity-panel antigravity-float-slow overflow-hidden">
            <div className="border-b border-white/5 p-6 bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">Thông tin tài khoản</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-white/5">
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider w-1/3">Email Workspace</td>
                      <td className="py-4 font-semibold text-white">{email || "Đọc từ JWT"}</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider">Họ tên</td>
                      <td className="py-4 font-semibold text-slate-350">Người dùng hệ thống</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider">Quốc gia / Múi giờ</td>
                      <td className="py-4 font-semibold text-slate-350">VN · Asia/Saigon (GMT+7)</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider">Gói dịch vụ</td>
                      <td className="py-4 font-semibold text-emerald-450"> Rainbow Standard (Free)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Security Log Table Panel */}
          <div className="antigravity-panel antigravity-float-slow overflow-hidden">
            <div className="border-b border-white/5 p-6 bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">Nhật ký hoạt động & bảo mật</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 pb-3 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 w-1/3">Hoạt động</th>
                      <th className="pb-3 w-1/3">Chi tiết</th>
                      <th className="pb-3 text-right">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {securityEvents.map((event, index) => (
                      <tr key={`${event.action}-${index}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-bold text-white uppercase tracking-wide">{event.action}</td>
                        <td className="py-4 text-slate-350">{event.detail}</td>
                        <td className="py-4 text-right text-slate-500 font-medium">
                          {event.time ? new Date(event.time).toLocaleString("vi-VN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Roadmap Table Panel */}
          <div className="antigravity-panel antigravity-float-slower overflow-hidden">
            <div className="border-b border-white/5 p-6 bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">MVP Roadmap Checklist</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roadmapItems.map((item) => (
                  <div key={item} className="border border-white/5 bg-white/[0.01] p-3 rounded-lg flex items-center gap-2 hover:bg-white/[0.02] transition-all">
                    <span className="text-emerald-450 font-bold">✓</span>
                    <span className="text-[11px] font-semibold text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent" />
    </div>
    </>
  );
}

function Metric({ label, value, tone, compact = false }: { label: string; value: number; tone: "blue" | "purple" | "green" | "yellow"; compact?: boolean }) {
  const colors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    green: "text-green-400",
    yellow: "text-yellow-300",
  };
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 ${compact ? "p-3" : "p-4"}`}>
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className={`${compact ? "text-xl" : "text-2xl"} font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function InfoRows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="mt-4 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-sm">
          <span className="text-slate-500">{label}</span>
          <span className="text-right text-slate-200">{value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusRow({ label, status, ok = false }: { label: string; status: string; ok?: boolean }) {
  const isEmailOtp = label === "Email OTP";
  const isTotp = label === "Authenticator TOTP";
  const isOAuth = label.includes("Google") || label.includes("Apple");
  const storageKey = isEmailOtp ? "security.emailOtp" : isTotp ? "security.totp" : "";
  const [enabled, setEnabled] = useState(() => (
    storageKey && typeof window !== "undefined" ? localStorage.getItem(storageKey) === "enabled" : false
  ));

  if (isEmailOtp || isTotp || isOAuth) {
    const detail = isEmailOtp
      ? "Gửi mã xác thực qua email khi đăng nhập"
      : isTotp
        ? "Dùng Google/Microsoft Authenticator"
        : "Cần backend OAuth client trước khi bật thật";

    return (
      <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{enabled && isTotp ? "Secret: INVEST-APP-2026" : detail}</p>
          </div>
          <button
            disabled={isOAuth}
            onClick={() => {
              if (!storageKey) return;
              const next = !enabled;
              setEnabled(next);
              localStorage.setItem(storageKey, next ? "enabled" : "disabled");
            }}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              isOAuth
                ? "cursor-not-allowed bg-slate-800 text-slate-500"
                : enabled
                  ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
            }`}
          >
            {isOAuth ? "Cần API" : enabled ? "Đã bật" : "Bật"}
          </button>
        </div>
        {(isEmailOtp || isTotp) && (
          <p className="mt-2 text-[11px] text-slate-500">
            Trạng thái demo đang lưu localStorage. Production cần API verify và lưu ở backend.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-xs ${ok ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-400"}`}>{status}</span>
    </div>
  );
}

function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function readEmailFromJwt(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload.sub || payload.email || "";
  } catch {
    return "";
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return value;
  }
}
