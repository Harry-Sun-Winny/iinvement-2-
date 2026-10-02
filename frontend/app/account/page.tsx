"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/components/providers/I18nProvider";
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
  const { language } = useTranslation();
  const isVi = language === "vi";
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
    setEmailOtpEnabled(false);
    setTotpEnabled(false);
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
      <main className="w-[820px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {/* Profile Details Panel */}
          <div className="antigravity-panel antigravity-float-slow overflow-hidden">
            <div className="border-b border-white/5 p-6 bg-white/[0.01]">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">{isVi ? "Thông tin tài khoản" : "Account Information"}</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-white/5">
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider w-1/3">Email Workspace</td>
                      <td className="py-4 font-semibold text-white">{email || (isVi ? "Đọc từ JWT" : "Read from JWT")}</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider">{isVi ? "Họ tên" : "Full Name"}</td>
                      <td className="py-4 font-semibold text-slate-350">{isVi ? "Người dùng hệ thống" : "System User"}</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider">{isVi ? "Quốc gia / Múi giờ" : "Country / Timezone"}</td>
                      <td className="py-4 font-semibold text-slate-350">VN · Asia/Saigon (GMT+7)</td>
                    </tr>
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-4 font-bold text-slate-400 uppercase tracking-wider">{isVi ? "Gói dịch vụ" : "Subscription Plan"}</td>
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
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">{isVi ? "Nhật ký hoạt động & bảo mật" : "Activity & Security Log"}</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 pb-3 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 w-1/3">{isVi ? "Hoạt động" : "Activity"}</th>
                      <th className="pb-3 w-1/3">{isVi ? "Chi tiết" : "Details"}</th>
                      <th className="pb-3 text-right">{isVi ? "Thời gian" : "Time"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {securityEvents.map((event, index) => (
                      <tr key={`${event.action}-${index}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-bold text-white uppercase tracking-wide">{event.action}</td>
                        <td className="py-4 text-slate-350">{event.detail}</td>
                        <td className="py-4 text-right text-slate-500 font-medium">
                          {event.time ? new Date(event.time).toLocaleString(isVi ? "vi-VN" : "en-US") : "—"}
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
        
        {/* Right Analytics Workspace */}
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 z-10">
          {/* Workspace Statistics widgets */}
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{isVi ? "Thống kê không gian làm việc" : "Workspace Statistics"}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isVi ? "Danh mục" : "Portfolios"}</p>
                <p className="text-2xl font-black text-white mt-1">{portfolios.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isVi ? "Theo dõi" : "Watchlists"}</p>
                <p className="text-2xl font-black text-white mt-1">{watchlists.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isVi ? "Mục tiêu" : "Goals"}</p>
                <p className="text-2xl font-black text-white mt-1">{goals.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isVi ? "Hội thoại AI" : "AI Conversations"}</p>
                <p className="text-2xl font-black text-white mt-1">{aiConversations.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isVi ? "Giao dịch" : "Transactions"}</p>
                <p className="text-2xl font-black text-white mt-1">{transactions.length}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isVi ? "Cảnh báo" : "Alerts"}</p>
                <p className="text-2xl font-black text-white mt-1">{notifications.length}</p>
              </div>
            </div>
          </div>

          {/* MFA / 2FA Security Health Card */}
          <div className="antigravity-panel p-5 space-y-3 bg-transparent">
            <div className="border-b border-white/5 pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{isVi ? "Chỉ số bảo mật tài khoản" : "Account Security Score"}</h3>
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Email OTP:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${emailOtpEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                  {isVi ? "CHƯA CẤU HÌNH SERVER" : "SERVER SETUP REQUIRED"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Authenticator TOTP:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${totpEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                  {isVi ? "CHƯA CẤU HÌNH SERVER" : "SERVER SETUP REQUIRED"}
                </span>
              </div>
              
              <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{isVi ? "Đánh giá chung:" : "Overall Rating:"}</span>
                <span className={`text-xs font-black ${emailOtpEnabled && totpEnabled ? "text-emerald-400" : "text-amber-400"}`}>
                  {isVi ? "Chưa thể đánh giá cho đến khi có MFA thật" : "Cannot be rated until real MFA is configured"}
                </span>
              </div>
            </div>
          </div>
        </div>
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
            <p className="mt-1 text-xs text-slate-500">{enabled && isTotp ? "Cần xác minh từ máy chủ" : detail}</p>
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
            Tính năng này chưa bảo vệ đăng nhập cho tới khi backend xác minh và lưu cấu hình MFA.
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
