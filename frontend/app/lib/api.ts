const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
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
      throw new ApiError(499, "Yêu cầu đã được hủy.");
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau vài giây.");
    }
    throw new ApiError(0, "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    const errorText = await getErrorText(res);
    const message = errorText || `${res.status} ${res.statusText}`;
    if (res.status === 401 && !authRequest && token) {
      clearSessionAndRedirect();
      throw new ApiError(res.status, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
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

// Auth
export async function login(email: string, password: string, signal?: AbortSignal) {
  try {
    return await request<{ token: string; tokenType: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new ApiError(error.status, "Email hoặc mật khẩu không đúng");
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

// Portfolios
export const getPortfolios = () => request<Portfolio[]>("/api/v1/portfolios");
export const createPortfolio = (name: string, baseCurrency: string, type?: string) =>
  request<Portfolio>("/api/v1/portfolios", {
    method: "POST",
    body: JSON.stringify({ name, baseCurrency, type }),
  });
export const deletePortfolio = (id: string) =>
  request<void>(`/api/v1/portfolios/${id}`, { method: "DELETE" });

// Watchlists
export const getWatchlists = () => request<Watchlist[]>("/api/v1/watchlists");
export const createWatchlist = (name: string) =>
  request<Watchlist>("/api/v1/watchlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const deleteWatchlist = (id: string) =>
  request<void>(`/api/v1/watchlists/${id}`, { method: "DELETE" });

// Goals
export const getGoals = () => request<Goal[]>("/api/v1/goals");
export const createGoal = (name: string, targetAmount: number, currency: string, targetDate: string) =>
  request<Goal>("/api/v1/goals", {
    method: "POST",
    body: JSON.stringify({ name, targetAmount, currency, targetDate }),
  });
export const deleteGoal = (id: string) =>
  request<void>(`/api/v1/goals/${id}`, { method: "DELETE" });

// Transactions
export const getTransactions = (portfolioId: string) =>
  request<Transaction[]>(`/api/v1/portfolios/${portfolioId}/transactions`);
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

// Types
export interface Portfolio { id: string; userId: string; name: string; baseCurrency: string; type: string; createdAt: string; updatedAt: string; }
export interface Watchlist { id: string; userId: string; name: string; createdAt: string; }
export interface Goal { id: string; userId: string; name: string; targetAmount: number; currentAmount: number; currency: string; targetDate: string; status: string; createdAt: string; }
export interface Transaction { id: string; portfolioId: string; assetSymbol: string; assetName: string; type: string; quantity: number; price: number; currency: string; transactionDate: string; notes: string; createdAt: string; }
export interface CreateTransactionDto { assetSymbol: string; assetName: string; type: string; quantity: number; price: number; currency: string; transactionDate: string; notes?: string; }

// Real-time price
export async function getStockPrice(symbol: string): Promise<{ symbol: string; price: number; change: number; changePercent: number } | null> {
  try {
    const res = await fetch(`/api/stock-price?symbol=${symbol}`);
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}
// Watchlist Items
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

// Notifications
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

// AI conversations
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
