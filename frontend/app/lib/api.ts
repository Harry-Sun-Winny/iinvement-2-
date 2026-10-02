const BASE_URL = "/api/backend";
const DEFAULT_TIMEOUT_MS = 30_000;
const AUTH_TIMEOUT_MS = 180_000;
const MARKET_PRICE_TIMEOUT_MS = 15_000;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export interface AuthSession { token: string; tokenType: string; }

let refreshInFlight: Promise<AuthSession> | null = null;

export function storeAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", session.token);
  // Remove the legacy browser-readable refresh token after an upgrade.
  localStorage.removeItem("refreshToken");
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
  localStorage.removeItem("refreshToken");
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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const send = (accessToken: string | null) => fetch(`${BASE_URL}${path}`, {
    ...options,
    signal,
    credentials: "same-origin",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(!authRequest && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  let res: Response;

  try {
    res = await send(token);
    if (res.status === 401 && !authRequest && token) {
      const session = await renewSession();
      storeAuthSession(session);
      res = await send(session.token);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 && !authRequest) clearSessionAndRedirect();
      throw error;
    }
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
  return await res.json();
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
    return await request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new ApiError(error.status, "Email hoặc mật khẩu không đúng.");
    }
    throw error;
  }
}

export const register = (email: string, password: string, fullName: string, signal?: AbortSignal) =>
  request<AuthSession>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
    }),
    signal,
  });

export const refreshSession = () => request<AuthSession>("/api/v1/auth/refresh", { method: "POST" });

async function renewSession(): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function logout() {
  try {
    return await request<void>("/api/v1/auth/logout", { method: "POST" });
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
  }
}

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

export interface ResearchObservation {
  parameterCode: string; moduleId: string; baseWeight: number; rawValue: number | null;
  normalizedScore: number | null; state: "ACTIVE" | "WATCH" | "DORMANT" | "DEPRECATED" | "REACTIVATED";
  evidenceStatus: "VERIFIED" | "ESTIMATED" | "PROXY" | "MISSING" | "CONFLICTED";
  dataQuality: number; effectiveWeight: number; warnings: string[];
  citation?: { sourceName: string; sourceUrl: string | null; observedAt: string | null; sourceFields: string[] };
}
export interface ResearchResult {
  symbol: string; asOf: string; methodologyVersion: string; dataVersion: string;
  coverage: number; confidence: number; status: string; warnings: string[]; vetoes: string[];
  parameterResults: ResearchObservation[];
  stockScore: { qualityScore: number | null; valuationScore: number | null; resilienceScore: number | null;
    overallScore: number | null; confidence: number; coverage: number; vetoStatus: string;
    finalClassification: string; governanceStatus: string; };
}
export interface RecordedResearchRun { runId: string; response: ResearchResult; }
export interface ResearchCatalogImportSummary {
  importedEntries: number; methodologyVersion: string; importedAt: string; catalogStatus: string;
}
export const getResearchScore = (symbol: string) =>
  request<ResearchResult>(`/api/v1/research/${encodeURIComponent(symbol)}/score`);
export const getResearchParameters = (symbol: string) =>
  request<ResearchResult>(`/api/v1/research/${encodeURIComponent(symbol)}/parameters`);
export const createResearchRun = (symbol: string) =>
  request<RecordedResearchRun>(`/api/v1/research/${encodeURIComponent(symbol)}/runs`, { method: "POST" });
export const importResearchCatalog = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<ResearchCatalogImportSummary>("/api/v1/research/catalog/import", { method: "POST", body: form });
};
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
export const transferPortfolioPosition = (sourcePortfolioId: string, targetPortfolioId: string, symbol: string) =>
  request<TransferPositionResult>(`/api/v1/portfolios/${sourcePortfolioId}/transactions/positions/${encodeURIComponent(symbol)}/transfer`, {
    method: "PATCH",
    body: JSON.stringify({ targetPortfolioId }),
  });

export interface TransactionImportRow {
  assetSymbol: string;
  assetName: string;
  type: string;
  quantity: number;
  price: number;
  currency: string;
  transactionDate: string;
  notes?: string;
  fee?: number;
}

export interface TransactionImportIssue {
  row: number;
  field: string;
  message: string;
}

export interface TransactionImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: TransactionImportRow[];
  issues: TransactionImportIssue[];
  readyToImport: boolean;
}

export const previewTransactionImport = (portfolioId: string, rows: TransactionImportRow[]) =>
  request<TransactionImportPreview>(`/api/v1/portfolios/${portfolioId}/transactions/import/preview`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });

export const commitTransactionImport = (portfolioId: string, rows: TransactionImportRow[]) =>
  request<Transaction[]>(`/api/v1/portfolios/${portfolioId}/transactions/import/commit`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });

export interface Portfolio { id: string; userId: string; name: string; baseCurrency: string; type: string; createdAt: string; updatedAt: string; }
export interface Watchlist { id: string; userId: string; name: string; createdAt: string; }
export interface Goal { id: string; userId: string; name: string; targetAmount: number; currentAmount: number; currency: string; targetDate: string; status: string; createdAt: string; }
export interface Transaction { id: string; portfolioId: string; assetSymbol: string; assetName: string; type: string; quantity: number; price: number; currency: string; transactionDate: string; notes: string; createdAt: string; fee?: number; }
export interface CreateTransactionDto { assetSymbol: string; assetName: string; type: string; quantity: number; price: number; currency: string; transactionDate: string; notes?: string; fee?: number; }
export interface TransferPositionResult { sourcePortfolioId: string; targetPortfolioId: string; symbol: string; transactionCount: number; }
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

export interface StockPriceQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  currency?: string | null;
  asOf?: string | null;
  tradingDate?: string | null;
  requestedSymbol?: string;
  resolvedSymbol?: string | null;
}

export async function getStockPrices(
  symbols: string[],
  signal?: AbortSignal,
): Promise<Record<string, StockPriceQuote | null>> {
  const normalizedSymbols = Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  );
  const result = Object.fromEntries(
    normalizedSymbols.map((symbol) => [symbol, null]),
  ) as Record<string, StockPriceQuote | null>;

  const batches = Array.from(
    { length: Math.ceil(normalizedSymbols.length / 40) },
    (_, index) => normalizedSymbols.slice(index * 40, (index + 1) * 40),
  );

  await Promise.all(batches.map(async (batch) => {
    try {
      const timeoutSignal = AbortSignal.timeout(MARKET_PRICE_TIMEOUT_MS);
      const requestSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;
      const res = await fetch(
        `/api/stock-price?symbols=${encodeURIComponent(batch.join(","))}`,
        { signal: requestSignal },
      );
      if (!res.ok) return;

      const payload = await res.json();
      const quotes = Array.isArray(payload?.quotes) ? payload.quotes : [];
      quotes.forEach((quote: StockPriceQuote) => {
        const requestedSymbol = String(quote?.requestedSymbol || quote?.symbol || "").toUpperCase();
        const symbol = String(quote?.symbol || "").toUpperCase();
        const cleanRequested = requestedSymbol.replace(/[\s.,]+$/, "");
        const cleanSymbol = symbol.replace(/[\s.,]+$/, "");

        if (typeof quote?.price === "number") {
          if (requestedSymbol in result) result[requestedSymbol] = quote;
          if (symbol in result) result[symbol] = quote;
          if (cleanRequested in result) result[cleanRequested] = quote;
          if (cleanSymbol in result) result[cleanSymbol] = quote;
        }
      });
    } catch {
      // Preserve null entries so a partial provider failure does not block the dashboard.
    }
  }));

  return result;
}

export async function getStockPrice(symbol: string): Promise<StockPriceQuote | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const quotes = await getStockPrices([normalizedSymbol]);
  return quotes[normalizedSymbol] ?? null;
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
    return await res.json();
  } catch {
    return null;
  }
}

export async function getMarketDetails(symbol: string): Promise<MarketDetailsResponse | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const backendData = await request<any>(`/api/v1/market/${encodeURIComponent(normalized)}/details`);
    if (backendData) {
      return backendData;
    }
  } catch {}

  const [profile, history, valuation, income, yahooDetails] = await Promise.all([
    fetchLooseJson<any>(`/api/stock-profile?symbol=${encodeURIComponent(normalized)}`),
    fetchLooseJson<any>(`/api/stock-history?symbol=${encodeURIComponent(normalized)}&range=6M`),
    fetchLooseJson<any>(`/api/fmp?symbol=${encodeURIComponent(normalized)}&type=valuation`),
    fetchLooseJson<any>(`/api/fmp?symbol=${encodeURIComponent(normalized)}&type=income`),
    fetchLooseJson<any>(`/api/yahoo-details?symbol=${encodeURIComponent(normalized)}`),
  ]);

  if (!profile && !history && !valuation && !income && !yahooDetails) {
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
    name: yahooDetails?.name || profile?.name,
    sector: profile?.sector,
    country: profile?.country,
    marketCap: typeof profile?.marketCap === "number" ? profile.marketCap : null,
    currency: profile?.currency,
    logo: profile?.logo,
    pe: yahooDetails?.pe ?? (typeof valuation?.peRatio === "number" ? valuation.peRatio : null),
    forwardPe: yahooDetails?.forwardPe ?? (typeof valuation?.peRatio === "number" ? valuation.peRatio : null),
    pb: yahooDetails?.pb ?? (typeof valuation?.pbRatio === "number" ? valuation.pbRatio : null),
    ps: yahooDetails?.ps ?? (typeof valuation?.priceToSalesRatio === "number" ? valuation.priceToSalesRatio : null),
    roe: yahooDetails?.roe ?? null,
    eps: yahooDetails?.eps ?? null,
    beta: yahooDetails?.beta ?? null,
    dividendYield: yahooDetails?.dividendYield ?? null,
    annualDividend: yahooDetails?.annualDividend ?? null,
    recommendation: yahooDetails?.recommendation ?? null,
    buyCount: yahooDetails?.buyCount ?? null,
    holdCount: yahooDetails?.holdCount ?? null,
    sellCount: yahooDetails?.sellCount ?? null,
    targetPrice: yahooDetails?.targetPrice ?? null,
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

export interface FxRateResponse {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string;
  source: string;
  fallback?: boolean;
}

export async function getFxRate(currency: string, signal?: AbortSignal): Promise<FxRateResponse> {
  try {
    const res = await fetch(`/api/fx-rate?currency=${encodeURIComponent(currency)}`, { signal });
    if (!res.ok) {
      throw new Error("Failed to fetch FX rate");
    }
    const data = await res.json();
    return {
      base: "USD",
      rates: {
        USD: 1,
        USDT: 1,
        USDC: 1,
        [currency.toUpperCase()]: (data.rate && data.rate > 0 && !data.error && !(currency.toUpperCase() === 'VND' && data.rate === 1)) ? data.rate : (currency.toUpperCase() === 'VND' ? 25400 : 1),
      },
      updatedAt: new Date().toISOString(),
      source: data.error ? "Fallback (API offline)" : "Yahoo Finance",
      fallback: !!data.error,
    };
  } catch (err) {
    return {
      base: "USD",
      rates: {
        USD: 1,
        USDT: 1,
        USDC: 1,
        [currency.toUpperCase()]: 25400,
      },
      updatedAt: new Date().toISOString(),
      source: "Fallback (Static rate)",
      fallback: true,
    };
  }
}
