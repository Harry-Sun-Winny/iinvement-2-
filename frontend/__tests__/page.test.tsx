import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "../app/page";
import AnalysisPage from "../app/analysis/page";
import LoginPage from "../app/login/page";
import MarketPage from "../app/market/page";
import PortfolioPage from "../app/portfolio/[id]/page";
import * as api from "../app/lib/api";
import AppSidebar from "../components/AppSidebar";
import { ThemeProvider } from "../components/providers/ThemeProvider";

vi.mock("../components/providers/I18nProvider", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "sidebar.dashboard") return "Dashboard";
      if (key === "sidebar.watchlist") return "Watchlist";
      if (key === "sidebar.holdings") return "Holdings";
      if (key === "sidebar.market") return "Market";
      if (key === "sidebar.analysis") return "AI Analysis";
      
      if (key === "dashboard.goals") return "Goals";
      if (key === "dashboard.news") return "News";
      if (key === "dashboard.create") return "Create";
      
      if (key === "dashboard.addTransaction" || key === "portfolio.addTx") return "+ Thêm GD";
      if (key === "common.add") return "Add";
      if (key === "portfolio.create") return "Create";
      if (key === "common.create") return "Create";
      
      if (key === "dashboard.portfolioName") return "Portfolio name";
      if (key === "dashboard.watchlistName") return "Watchlist name";
      if (key === "dashboard.goalName") return "Goal name";
      return key;
    },
    language: "vi",
  }),
}));

global.ResizeObserver = class ResizeObserverMock {
  constructor(public callback: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

vi.mock("../app/portfolio/[id]/chart", () => ({
  default: () => <div data-testid="portfolio-chart" />,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("../hooks/usePortfolioAnalysis", () => ({
  usePortfolioAnalysis: () => {
    const pos = {
      symbol: "AAPL", name: "Apple", quantity: 10,
      avgPrice: 100, currentPrice: 120, value: 1200,
      pnl: 200, pnlPct: 20, priced: true,
    };
    const derived = {
      positions: [pos],
      pricedPositions: [pos],
      sortedPositions: [pos],
      totalValue: 1200,
      totalPnl: 200,
      totalCost: 1000,
      totalPnlPct: 20,
      riskScore: null,
      risk: { label: "Low", color: "text-green-400", bg: "bg-green-500/10" },
      winner: pos,
      loser: null,
      missingPriceCount: 0,
    };
    return {
      state: {
        portfolios: [{ id: "p1", name: "Growth Portfolio", baseCurrency: "USD", type: "STOCKS" }],
        selectedId: "p1",
        positions: [pos],
        prices: { AAPL: { symbol: "AAPL", price: 120, change: 2, changePercent: 1.7 } },
        aiAnalysis: "",
        analysisLoading: false,
        analysisStatus: "",
        priceLoading: false,
        error: "",
        sortKey: "value",
        sortDir: "desc",
        analysisMode: "portfolio",
        selectedSymbol: "AAPL",
        stockQuestion: "",
      },
      derived,
      actions: {
        selectPortfolio: vi.fn(),
        setMode: vi.fn(),
        selectSymbol: vi.fn(),
        setQuestion: vi.fn(),
        toggleSort: vi.fn(),
        refreshPrices: vi.fn(),
        runAnalysis: async () => {
          await fetch("/api/ai-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positions: [] }),
          });
        },
        logout: vi.fn(),
      },
    };
  },
}));

vi.mock("../hooks/useJournal", () => ({
  useJournal: () => ({
    entries: [],
    symbolCounts: { AAPL: 1 },
    saveAIAnalysis: vi.fn(),
  }),
}));

vi.mock("../app/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
  getPortfolios: vi.fn(),
  getWatchlists: vi.fn(),
  getGoals: vi.fn(),
  createPortfolio: vi.fn(),
  createWatchlist: vi.fn(),
  createGoal: vi.fn(),
  deletePortfolio: vi.fn(),
  deleteWatchlist: vi.fn(),
  deleteGoal: vi.fn(),
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getWatchlistItems: vi.fn(),
  getStockPrice: vi.fn(),
  getStockPrices: vi.fn(),
  getFxRate: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  storeAuthSession: vi.fn((session: { token: string }) => {
    localStorage.setItem("token", session.token);
    localStorage.removeItem("refreshToken");
  }),
}));

const portfolio = {
  id: "p1",
  userId: "u1",
  name: "Growth Portfolio",
  baseCurrency: "USD",
  type: "STOCKS",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

const watchlist = {
  id: "w1",
  userId: "u1",
  name: "Main Watchlist",
  createdAt: "2026-06-01T00:00:00Z",
};

const goal = {
  id: "g1",
  userId: "u1",
  name: "Retirement",
  targetAmount: 10000,
  currentAmount: 2500,
  currency: "USD",
  targetDate: "2030-01-01",
  status: "ACTIVE",
  createdAt: "2026-06-01T00:00:00Z",
};

function mockFetch(responseFor: (input: string, init?: RequestInit) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseFor(String(input), init)),
        text: () => Promise.resolve(""),
      }),
    ),
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "test-token");
  vi.clearAllMocks();
  vi.useRealTimers();

  vi.mocked(api.getPortfolios).mockResolvedValue([portfolio]);
  vi.mocked(api.getWatchlists).mockResolvedValue([watchlist]);
  vi.mocked(api.getGoals).mockResolvedValue([goal]);
  vi.mocked(api.getTransactions).mockResolvedValue([
    {
      id: "t1",
      portfolioId: "p1",
      assetSymbol: "AAPL",
      assetName: "Apple",
      type: "BUY",
      quantity: 10,
      price: 100,
      currency: "USD",
      transactionDate: "2026-06-01",
      notes: "",
      createdAt: "2026-06-01T00:00:00Z",
    },
  ]);
  vi.mocked(api.getStockPrice).mockResolvedValue({
    symbol: "AAPL",
    price: 120,
    change: 2,
    changePercent: 1.7,
    currency: "USD",
  });
  vi.mocked(api.getStockPrices).mockResolvedValue({
    AAPL: {
      symbol: "AAPL",
      requestedSymbol: "AAPL",
      price: 120,
      change: 2,
      changePercent: 1.7,
      dayHigh: 122,
      dayLow: 117,
      currency: "USD",
    },
  });
  vi.mocked(api.getFxRate).mockResolvedValue({
    base: "USD",
    rates: { USD: 1, VND: 25_400 },
    updatedAt: "2026-07-29T00:00:00Z",
    source: "Test",
  });

  mockFetch((input) => {
    if (input.includes("/api/admin-kpi")) {
      return { totalUsers: 3, totalAiConversations: 5, totalNews: 8, totalTransactions: 13 };
    }
    if (input.includes("/api/stock-search")) {
      return [{ symbol: "AAPL", name: "Apple Inc", type: "Equity" }];
    }
    if (input.includes("/api/stock-history")) {
      return {
        points: [
          { date: "2026-06-08", close: 118 },
          { date: "2026-06-09", close: 119 },
          { date: "2026-06-10", close: 117 },
          { date: "2026-06-11", close: 121 },
          { date: "2026-06-12", close: 124 },
          { date: "2026-06-15", close: 125 },
        ],
      };
    }
    if (input.includes("/api/stock-price")) {
      return {
        price: 123.45,
        change: 1.23,
        changePercent: 0.99,
        changeRange: 4.56,
        changePctRange: 3.21,
        volume: 180,
        averageVolume: 100,
        fiftyTwoWeekHigh: 125,
        fiftyTwoWeekLow: 80,
        trailingPE: 16,
        dataQuality: {
          status: "OK",
          checks: [],
          sources: ["Yahoo"],
          primarySource: "Yahoo",
          fallbackUsed: false,
          maxDeviationPercent: null,
        },
      };
    }
    if (input.includes("/api/stock-news")) {
      return [{ symbol: "AAPL", source: "News", title: "Apple update", url: "https://example.com", publishedAt: "2026-06-14T00:00:00Z" }];
    }
    if (input.includes("/api/ai-analysis")) {
      return { content: [{ text: "Portfolio risk is moderate." }] };
    }
    return [];
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("dashboard", () => {
  it("keeps currency and detail controls working in the new layout", async () => {
    render(<Page />);
    await screen.findByText("Growth Portfolio");
    expect(screen.getByRole("img", { name: "Apple logo" })).toBeTruthy();
    const priceChart = await screen.findByRole("img", { name: /Biểu đồ giá AAPL, 5 phiên gần nhất/ });
    expect(priceChart.getAttribute("data-session-count")).toBe("5");
    expect(screen.getByText("1 tháng")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Tổng quan tài sản" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lịch giao dịch" }));
    const transactionHeading = screen.getByRole("heading", { level: 2, name: "Lịch giao dịch" });
    expect(screen.getByRole("region", { name: "Quản lý danh mục" }).contains(transactionHeading)).toBe(true);
    expect(screen.getByRole("region", { name: "Phân tích và hoạt động" }).contains(transactionHeading)).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Holdings" }));
    fireEvent.click(screen.getByRole("button", { name: "VND" }));
    expect(screen.getByRole("button", { name: "VND" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "USD" }).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Chi tiết" }));
    expect(screen.getByRole("button", { name: "Thu gọn" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region", { name: "Chi tiết thu nhập" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xem mã" }));
    expect(screen.getByRole("button", { name: "Thu gọn" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.queryByRole("region", { name: "Chi tiết thu nhập" })).toBeNull();
    expect(document.getElementById("dashboard-today-movers")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn" }));
    expect(document.getElementById("dashboard-today-movers")).toBeNull();
  });

  it("offers portfolio creation directly from the empty workspace", async () => {
    vi.mocked(api.getPortfolios).mockResolvedValue([]);
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "dashboard.createPortfolio" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByPlaceholderText("Portfolio name")).toBeTruthy();
  });

  it("loads portfolio workspace data and shows navigation", async () => {
    render(
      <ThemeProvider>
        <AppSidebar />
        <Page />
      </ThemeProvider>
    );

    expect(await screen.findByText("Growth Portfolio")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Watchlist" })[0]);
    expect(screen.getByText("Main Watchlist")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Goals" })[0]);
    expect(screen.getByText("Retirement")).toBeTruthy();
    expect(screen.getAllByText(/Portfolio/).length).toBeGreaterThan(0);
    expect(screen.getByText("Market")).toBeTruthy();
    expect(screen.getByText("AI Analysis")).toBeTruthy();
  });

  it("creates a portfolio from modal values", async () => {
    vi.mocked(api.createPortfolio).mockResolvedValue({
      ...portfolio,
      id: "p2",
      name: "Crypto Basket",
      type: "CRYPTO",
    });

    render(<Page />);
    await screen.findByText("Growth Portfolio");

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByPlaceholderText("Portfolio name"), { target: { value: "Crypto Basket" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "CRYPTO" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(api.createPortfolio).toHaveBeenCalledWith("Crypto Basket", "USD", "CRYPTO"));
  });
});

describe("market", () => {
  it("loads index prices, switches category, and selects a search suggestion", async () => {
    render(<MarketPage />);

    expect((await screen.findAllByText(/Trending stocks|Cổ phiếu theo xu hướng/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /52-week highs|Mức đỉnh trong 52 tuần/ }));
    expect((await screen.findAllByText(/4 results|4 kết quả/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/below 52-week high|Cách đỉnh 52 tuần/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Indices|Chỉ số/ }));
    fireEvent.click(screen.getByRole("button", { name: /Main indices|Chỉ số chính/ }));
    expect((await screen.findAllByText("S&P 500")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("123.45").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Stock discovery|Khám phá cổ phiếu/ }));
    fireEvent.click(screen.getByRole("button", { name: /Stock screener|Sàng lọc cổ phiếu/ }));
    expect((await screen.findAllByText("Apple")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "apple" } });

    const suggestion = await screen.findByText(/Apple Inc/);
    fireEvent.click(suggestion);

    expect((await screen.findAllByText("Apple Inc")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
  }, 10_000);
});

describe("ai analysis", () => {
  it("builds positions from transactions and renders AI analysis result", async () => {
    render(<AnalysisPage />);

    expect(await screen.findByText("AAPL")).toBeTruthy();
    expect(screen.getByText(/Apple/)).toBeTruthy();
    expect(await screen.findByText("$120.00")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Phân tích rủi ro danh mục/ }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/ai-analysis",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});

describe("portfolio transactions", () => {
  it("shows transaction history and keeps the created transaction visible", async () => {
    vi.mocked(api.getTransactions).mockResolvedValue([
      {
        id: "t1",
        portfolioId: "p1",
        assetSymbol: "INTEL",
        assetName: "Intel",
        type: "BUY",
        quantity: 10,
        price: 22,
        currency: "USD",
        transactionDate: "2025-05-21",
        notes: "",
        createdAt: "2025-05-21T00:00:00Z",
      },
    ]);
    vi.mocked(api.createTransaction).mockResolvedValue({
      id: "t2",
      portfolioId: "p1",
      assetSymbol: "JPM",
      assetName: "JPMorgan Chase & Co.",
      type: "BUY",
      quantity: 2,
      price: 250,
      currency: "USD",
      transactionDate: "2026-06-16",
      notes: "",
      createdAt: "2026-06-16T00:00:00Z",
    });

    const { container } = render(<PortfolioPage />);

    expect((await screen.findAllByText("INTEL")).length).toBeGreaterThan(0);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/stock-price?symbol=INTC", expect.any(Object)));
    fireEvent.click(screen.getByRole("button", { name: "+ Thêm GD" }));

    fireEvent.change(screen.getByPlaceholderText("VD: AAPL, GOOGL, VNM..."), { target: { value: "JPM" } });
    fireEvent.change(screen.getByPlaceholderText("Tự điền hoặc chọn từ gợi ý"), { target: { value: "JPMorgan Chase & Co." } });
    fireEvent.change(container.querySelector("input[placeholder='10']")!, { target: { value: "2" } });
    fireEvent.change(container.querySelector("input[placeholder='150.00']")!, { target: { value: "250" } });

    fireEvent.click(screen.getByRole("button", { name: /Xác nhận giao dịch/ }));

    await waitFor(() => expect(api.createTransaction).toHaveBeenCalled());
    expect((await screen.findAllByText("JPM")).length).toBeGreaterThan(0);
    expect(screen.getByText("JPMorgan Chase & Co.")).toBeTruthy();
  });
});

describe("login", () => {
  it("logs in and stores the returned token", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "new-token", tokenType: "Bearer" });
    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "very-secure-password" } });
    fireEvent.click(container.querySelector("button[type='submit']")!);

    await waitFor(() => expect(api.login).toHaveBeenCalledWith("user@example.com", "very-secure-password", expect.any(AbortSignal)));
    expect(localStorage.getItem("token")).toBe("new-token");
  });
});
