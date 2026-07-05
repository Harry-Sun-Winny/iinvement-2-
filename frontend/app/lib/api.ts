const BASE_URL = "/api/backend";
const DEFAULT_TIMEOUT_MS = 30_000;
const AUTH_TIMEOUT_MS = 180_000;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function isAuthRequest(path: string) {
  return path.startsWith("/api/v1/auth/");
}

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  if (window.location.pathname !== "/login") {
    window.location.replace("/login?reason=session-expired");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const authRequest = isAuthRequest(path);
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    authRequest ? AUTH_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
  );
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(!authRequest && token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw new ApiError(499, "Y?u c?u ?? ???c h?y.");
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "M?y ch? ph?n h?i qu? l?u. Vui l?ng th? l?i sau v?i gi?y.");
    }
    throw new ApiError(0, "Kh?ng th? k?t n?i m?y ch?. Vui l?ng ki?m tra m?ng v? th? l?i.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    const errorText = await getErrorText(res);
    const message = errorText || `${res.status} ${res.statusText}`;
    if (res.status === 401 && !authRequest && token) {
      clearSessionAndRedirect();
      throw new ApiError(res.status, "Phi?n ??ng nh?p ?? h?t h?n. Vui l?ng ??ng nh?p l?i.");
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function getErrorText(res: Response) {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return data?.message || data?.error || text;
  } catch {
    return text;
  }
}

export async function login(email: string, password: string, signal?: AbortSignal) {
  try {
    return await request<{ token: string; tokenType: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new ApiError(error.status, "Email ho?c m?t kh?u kh?ng ??ng");
    }
    throw error;
  }
}

export const register = (email: string, password: string, fullName: string, signal?: AbortSignal) =>
  request<{ token: string; tokenType: string }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
    }),
    signal,
  });

export const getPortfolios = () => request<Portfolio[]>("/api/v1/portfolios");
export const createPortfolio = (name: string, baseCurrency: string, type?: string) =>
  request<Portfolio>("/api/v1/portfolios", {
    method: "POST",
    body: JSON.stringify({ name, baseCurrency, type }),
  });
export const deletePortfolio = (id: string) =>
  request<void>(`/api/v1/portfolios/${id}`, { method: "DELETE" });

export const getWatchlists = () => request<Watchlist[]>("/api/v1/watchlists");
export const createWatchlist = (name: string) =>
  request<Watchlist>("/api/v1/watchlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const deleteWatchlist = (id: string) =>
  request<void>(`/api/v1/watchlists/${id}`, { method: "DELETE" });

export const getGoals = () => request<Goal[]>("/api/v1/goals");
export const createGoal = (name: string, targetAmount: number, currency: string, targetDate: string) =>
  request<Goal>("/api/v1/goals", {
    method: "POST",
    body: JSON.stringify({ name, targetAmount, currency, targetDate }),
  });
export const deleteGoal = (id: string) =>
  request<void>(`/api/v1/goals/${id}`, { method: "DELETE" });

export const getTransactions = (portfolioId: string) =>
  request<Transaction[]>(`/api/v1/portfolios/${portfolioId}/transactions`);
export const getPortfolioDeepAnalysis = (portfolioId: string) =>
  request<PortfolioDeepAnalysis>(`/api/v1/portfolios/${portfolioId}/deep-analysis`);
export const triggerPortfolioBackfill = (portfolioId: string) =>
  request<{ status: string; message: string }>(`/api/v1/portfolios/${portfolioId}/backfill`, {
    method: "POST",
  });
export const createTransaction = (portfolioId: string, data: CreateTransactionDto) =>
  request<Transaction>(`/api/v1/portfolios/${portfolioId}/transactions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateTransaction = (portfolioId: string, transactionId: string, data: CreateTransactionDto) =>
  request<Transaction>(`/api/v1/portfolios/${portfolioId}/transactions/${transactionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteTransaction = (portfolioId: string, transactionId: string) =>
  request<void>(`/api/v1/portfolios/${portfolioId}/transactions/${transactionId}`, {
    method: "DELETE",
  });

export interface Portfolio { id: string; userId: string; name: string; baseCurrency: string; type: string; createdAt: string; updatedAt: string; }
export interface Watchlist { id: string; userId: string; name: string; createdAt: string; }
export interface Goal { id: string; userId: string; name: string; targetAmount: number; currentAmount: number; currency: string; targetDate: string; status: string; createdAt: string; }
export interface Transaction { id: string; portfolioId: string; assetSymbol: string; assetName: string; type: string; quantity: number; price: number; currency: string; transactionDate: string; notes: string; createdAt: string; fee?: number; }
export interface CreateTransactionDto { assetSymbol: string; assetName: string; type: string; quantity: number; price: number; currency: string; transactionDate: string; notes?: string; fee?: number; }
export interface PortfolioRiskMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
}
export interface PortfolioDeepAnalysis {
  overview: {
    snapshotCount: number;
    firstSnapshotDate: string | null;
    latestSnapshotDate: string | null;
    latestValue: number;
    netGain: number;
    totalReturnPct: number;
    cashBalance: number;
  };
  riskMetrics: PortfolioRiskMetrics;
  equityCurve: Array<{
    date: string;
    portfolioValue: number;
    investedAmount: number;
    cashBalance: number;
  }>;
  rollingMetrics: Array<{
    date: string;
    sharpeRatio: number;
    sortinoRatio: number;
    valueAtRisk95: number;
    conditionalValueAtRisk95: number;
  }>;
  drawdownSeries: Array<{
    date: string;
    portfolioValue: number;
    runningPeak: number;
    drawdown: number;
  }>;
  methodologyNotes: string[];
}

export async function getStockPrice(symbol: string): Promise<{ symbol: string; price: number; change: number; changePercent: number } | null> {
  try {
    const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data && typeof data.price === "number" ? data : null;
  } catch {
    return null;
  }
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  assetSymbol: string;
  assetName: string;
  addedAt: string;
}

export const getWatchlistItems = (watchlistId: string) =>
  request<WatchlistItem[]>(`/api/v1/watchlists/${watchlistId}/items`);

export const addWatchlistItem = (watchlistId: string, assetSymbol: string, assetName: string) =>
  request<WatchlistItem>(`/api/v1/watchlists/${watchlistId}/items`, {
    method: "POST",
    body: JSON.stringify({ assetSymbol, assetName }),
  });

export const removeWatchlistItem = (watchlistId: string, symbol: string) =>
  request<void>(`/api/v1/watchlists/${watchlistId}/items/${symbol}`, { method: "DELETE" });

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export const getNotifications = () => request<NotificationItem[]>("/api/v1/notifications");
export const markNotificationRead = (id: string) =>
  request<NotificationItem>(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
export const markAllNotificationsRead = () =>
  request<void>("/api/v1/notifications/read-all", { method: "POST" });

export interface AiMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  portfolioId?: string;
  title: string;
  messages?: AiMessage[];
  createdAt: string;
  updatedAt?: string;
}

export const getAiConversations = () => request<AiConversation[]>("/api/v1/ai/conversations");

interface MarketDetailsResponse {
  beta?: number | null;
  pe?: number | null;
  forwardPe?: number | null;
  pb?: number | null;
  ps?: number | null;
  roe?: number | null;
  eps?: number | null;
  dividendYield?: number | null;
  annualDividend?: number | null;
  recommendation?: string | null;
  buyCount?: number | null;
  holdCount?: number | null;
  sellCount?: number | null;
  targetPrice?: number | null;
  historicalPrices?: Array<{ date: string; close: number | null; adjustedClose?: number | null; volume?: number | null }>;
  name?: string;
  sector?: string;
  country?: string;
  marketCap?: number | null;
  currency?: string;
  logo?: string;
}

async function fetchLooseJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getMarketDetails(symbol: string): Promise<MarketDetailsResponse | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  const [profile, history, valuation, income] = await Promise.all([
    fetchLooseJson<any>(`/api/stock-profile?symbol=${encodeURIComponent(normalized)}`),
    fetchLooseJson<any>(`/api/stock-history?symbol=${encodeURIComponent(normalized)}&range=6M`),
    fetchLooseJson<any>(`/api/fmp?symbol=${encodeURIComponent(normalized)}&type=valuation`),
    fetchLooseJson<any>(`/api/fmp?symbol=${encodeURIComponent(normalized)}&type=income`),
  ]);

  if (!profile && !history && !valuation && !income) {
    return null;
  }

  const historicalPrices = Array.isArray(history?.points)
    ? history.points
        .map((point: any) => ({
          date: String(point?.date ?? ""),
          close: typeof point?.close === "number" ? point.close : null,
          adjustedClose: typeof point?.adjustedClose === "number" ? point.adjustedClose : null,
          volume: typeof point?.volume === "number" ? point.volume : null,
        }))
        .filter((point: { date: string }) => point.date)
    : [];

  return {
    historicalPrices,
    name: profile?.name,
    sector: profile?.sector,
    country: profile?.country,
    marketCap: typeof profile?.marketCap === "number" ? profile.marketCap : null,
    currency: profile?.currency,
    logo: profile?.logo,
    pe: typeof valuation?.peRatio === "number" ? valuation.peRatio : null,
    forwardPe: typeof valuation?.peRatio === "number" ? valuation.peRatio : null,
    pb: typeof valuation?.pbRatio === "number" ? valuation.pbRatio : null,
    ps: typeof valuation?.priceToSalesRatio === "number" ? valuation.priceToSalesRatio : null,
    roe: null,
    eps: null,
    beta: null,
    dividendYield: null,
    annualDividend: null,
    recommendation: null,
    buyCount: null,
    holdCount: null,
    sellCount: null,
    targetPrice: null,
  };
}

export interface JournalAttachment {
  id: string;
  storage_key?: string | null;
  public_url?: string | null;
  file_name: string;
  attachment_type: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

export interface JournalAttachmentUploadResponse {
  storage_key: string;
  public_url: string;
  file_name: string;
  attachment_type: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

export interface JournalEntry {
  id: string;
  symbol: string | null;
  entry_type: "ai_analysis" | "manual_note" | "ai_chart" | "external_image";
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  attachment_count: number;
  created_at: string;
  attachments: JournalAttachment[];
}

export interface CreateJournalEntryDto {
  symbol?: string | null;
  entry_type?: "ai_analysis" | "manual_note" | "ai_chart" | "external_image";
  title: string;
  content: string;
  tags?: string[];
  is_pinned?: boolean;
  attachments?: Array<{
    storage_key?: string | null;
    public_url?: string | null;
    file_name: string;
    attachment_type: string;
    mime_type?: string | null;
    size_bytes?: number | null;
  }>;
}

export const getJournalEntries = (portfolioId: string, symbol?: string) => {
  const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  return request<JournalEntry[]>(`/api/v1/portfolios/${portfolioId}/journal${query}`);
};

export const createJournalEntry = (portfolioId: string, data: CreateJournalEntryDto) =>
  request<JournalEntry>(`/api/v1/portfolios/${portfolioId}/journal`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export async function uploadJournalAttachment(file: File, attachmentType: string): Promise<JournalAttachmentUploadResponse> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("attachmentType", attachmentType);

  const targetUrl = `${BASE_URL}/api/v1/journal/attachments/upload`;

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "May chu phan hoi qua lau. Vui long thu lai sau vai giay.");
    }
    throw new ApiError(0, "Khong the ket noi may chu. Vui long kiem tra mang va thu lai.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    const errorText = await getErrorText(res);
    const message = errorText || `${res.status} ${res.statusText}`;
    if (res.status === 401 && token) {
      clearSessionAndRedirect();
      throw new ApiError(res.status, "Phien dang nhap da het han. Vui long dang nhap lai.");
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}
