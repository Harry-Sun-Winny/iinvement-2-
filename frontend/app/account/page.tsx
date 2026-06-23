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
    <div className="app-shell flex">
      <aside className="fixed flex h-full w-56 flex-col gap-2 border-r border-slate-800 bg-slate-900 p-4">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold text-white">💹 Investment</h1>
          <p className="text-xs text-slate-500">Account Center</p>
        </div>
        {[
          ["📊", "Dashboard", "/"],
          ["🌍", "Market", "/market"],
          ["🤖", "AI Analysis", "/analysis"],
          ["👤", "Tài khoản", "/account"],
        ].map(([icon, label, href]) => (
          <button
            key={href}
            onClick={() => (window.location.href = href)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              href === "/account" ? "rainbow-bg text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {icon} {label}
          </button>
        ))}
        <button
          onClick={logout}
          className="mt-auto rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          🚪 Đăng xuất
        </button>
      </aside>

      <main className="ml-56 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-sm text-slate-500">Quản lý hồ sơ, bảo mật, dữ liệu và quyền riêng tư</p>
            <h2 className="text-2xl font-bold text-white">Tài khoản người dùng</h2>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

          <div className="grid grid-cols-4 gap-4">
            <Metric label="Portfolios" value={portfolios.length} tone="blue" />
            <Metric label="Watchlists" value={watchlists.length} tone="purple" />
            <Metric label="Transactions" value={transactions.length} tone="green" />
            <Metric label="AI Chats" value={aiConversations.length} tone="yellow" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-blue">
              <h3 className="mb-4 text-lg font-semibold">👤 Hồ sơ cá nhân</h3>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full rainbow-bg text-xl font-bold">
                  {(email || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{email || "Người dùng"}</p>
                  <p className="text-sm text-slate-500">Việt Nam · Asia/Saigon · Tiếng Việt</p>
                </div>
              </div>
              <InfoRows
                rows={[
                  ["Họ tên", "Chưa có API cập nhật"],
                  ["Email", email || "Đọc từ JWT"],
                  ["Số điện thoại", "Chưa cấu hình"],
                  ["Ảnh đại diện", "Chưa cấu hình"],
                  ["Quốc gia", "VN"],
                  ["Múi giờ", "Asia/Saigon"],
                ]}
              />
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-red">
              <h3 className="mb-4 text-lg font-semibold">🔐 Bảo mật tài khoản</h3>
              <StatusRow label="Email + mật khẩu" status="Đang dùng" ok />
              <StatusRow label="BCrypt password hash" status="Backend đã có" ok />
              <StatusRow label="JWT access token" status="Backend đã có" ok />
              <StatusRow label="Email OTP" status="Chưa triển khai" />
              <StatusRow label="Authenticator TOTP" status="Chưa triển khai" />
              <StatusRow label="Google / Apple Login" status="Chưa triển khai" />
              <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                MVP tiếp theo nên ưu tiên: quên mật khẩu, refresh token, 2FA, đăng xuất toàn bộ thiết bị.
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-violet">
              <h3 className="mb-4 text-lg font-semibold">💳 Gói dịch vụ</h3>
              <InfoRows
                rows={[
                  ["Gói hiện tại", "Free"],
                  ["Ngày đăng ký", "Chưa có billing API"],
                  ["Ngày hết hạn", "Không áp dụng"],
                  ["Tính năng", "Portfolio, Watchlist, AI cơ bản"],
                ]}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {["Free", "Pro", "Enterprise"].map((plan) => (
                  <div key={plan} className={`rounded-lg border p-2 ${plan === "Free" ? "border-[#54a0ff] bg-[#54a0ff]/10 text-[#54a0ff]" : "border-slate-700 text-slate-400"}`}>
                    {plan}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-green">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">📈 Danh mục đầu tư</h3>
                <button onClick={() => (window.location.href = "/")} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
                  Quản lý
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Danh mục" value={portfolios.length} tone="blue" compact />
                <Metric label="Giao dịch" value={transactions.length} tone="green" compact />
                <Metric label="Mục tiêu" value={goals.length} tone="yellow" compact />
              </div>
              <div className="mt-4 space-y-2">
                {portfolios.slice(0, 4).map((portfolio) => (
                  <div key={portfolio.id} className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2 text-sm">
                    <span>{portfolio.name}</span>
                    <span className="text-slate-500">{portfolio.type} · {portfolio.baseCurrency}</span>
                  </div>
                ))}
                {portfolios.length === 0 && <p className="text-sm text-slate-500">Chưa có danh mục.</p>}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-orange">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">👁 Watchlist & cảnh báo</h3>
                <button onClick={() => (window.location.href = "/")} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
                  Mở dashboard
                </button>
              </div>
              <StatusRow label="Watchlist cổ phiếu/ETF/crypto" status={`${watchlists.length} danh sách`} ok={watchlists.length > 0} />
              <StatusRow label="Cảnh báo giá" status="Chưa có API tạo rule" />
              <StatusRow label="Cảnh báo tin tức" status="Chưa có API tạo rule" />
              <div className="mt-4 space-y-2">
                {notifications.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-800/70 px-3 py-2 text-sm">
                    <p className="text-white">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.message}</p>
                  </div>
                ))}
                {notifications.length === 0 && <p className="text-sm text-slate-500">Chưa có thông báo.</p>}
              </div>
            </section>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-yellow">
              <h3 className="mb-4 text-lg font-semibold">🧾 Nhật ký hoạt động & bảo mật</h3>
              <div className="space-y-2">
                {securityEvents.map((event, index) => (
                  <div key={`${event.action}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2 text-sm">
                    <div>
                      <p className="text-white">{event.action}</p>
                      <p className="text-xs text-slate-500">{event.detail}</p>
                    </div>
                    <span className={event.severity === "success" ? "text-green-400 text-xs" : event.severity === "warn" ? "text-yellow-300 text-xs" : "text-slate-500 text-xs"}>
                      {event.time ? formatDate(event.time) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-indigo">
              <h3 className="mb-4 text-lg font-semibold">💻 Thiết bị đăng nhập</h3>
              <div className="overflow-hidden rounded-lg border border-slate-800">
                <div className="grid grid-cols-4 bg-slate-800 px-3 py-2 text-xs text-slate-400">
                  <span>Thiết bị</span><span>IP</span><span>Quốc gia</span><span>Thời gian</span>
                </div>
                <div className="grid grid-cols-4 px-3 py-3 text-sm">
                  <span>Trình duyệt hiện tại</span><span>Local</span><span>VN</span><span className="text-green-400">Hiện tại</span>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                Cần backend session table để đăng xuất thiết bị khác và phát hiện đăng nhập bất thường.
              </div>
            </section>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-violet">
              <h3 className="mb-4 text-lg font-semibold">🤖 AI cá nhân hóa</h3>
              <InfoRows
                rows={[
                  ["Lịch sử chat", `${aiConversations.length} cuộc trò chuyện`],
                  ["Chủ đề quan tâm", interestedTopics.join(", ")],
                  ["Danh mục thường xem", portfolios[0]?.name || "Chưa đủ dữ liệu"],
                ]}
              />
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-blue">
              <h3 className="mb-4 text-lg font-semibold">🛡 Quyền riêng tư</h3>
              <StatusRow label="Xuất dữ liệu cá nhân" status="Chưa triển khai" />
              <StatusRow label="Tải dữ liệu đầu tư" status="Có thể tổng hợp từ portfolio/transaction" ok />
              <StatusRow label="Xóa dữ liệu/tài khoản" status="Chưa triển khai" />
              <StatusRow label="Quản lý cookie" status="Chưa triển khai" />
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 border-l-rainbow-red">
              <h3 className="mb-4 text-lg font-semibold">🛠 Admin overview</h3>
              <StatusRow label="KPI hệ thống" status="Đã có /api/v1/admin/kpi" ok />
              <StatusRow label="Quản lý user" status="Chưa triển khai" />
              <StatusRow label="Khóa/mở tài khoản" status="Chưa triển khai" />
              <StatusRow label="Reset 2FA" status="Chưa triển khai" />
              <StatusRow label="Giám sát API lỗi" status="Chưa triển khai" />
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-lg font-semibold rainbow-text">✅ MVP account roadmap</h3>
            <div className="grid grid-cols-4 gap-2">
              {roadmapItems.map((item) => (
                <div key={item} className="rounded-lg border border-slate-800 bg-slate-950 hover:border-[#54a0ff]/30 transition-colors px-3 py-2 text-xs text-slate-400">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
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
