import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "../app/page";
import AnalysisPage from "../app/analysis/page";
import LoginPage from "../app/login/page";
import MarketPage from "../app/market/page";
import PortfolioPage from "../app/portfolio/[id]/page";
import * as api from "../app/lib/api";

vi.mock("../app/portfolio/[id]/chart", () => ({
  default: () => <div data-testid="portfolio-chart" />,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1" }),
}));

vi.mock("../app/lib/api", () => ({
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
  login: vi.fn(),
  register: vi.fn(),
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
  });

  mockFetch((input) => {
    if (input.includes("/api/admin-kpi")) {
      return { totalUsers: 3, totalAiConversations: 5, totalNews: 8, totalTransactions: 13 };
    }
    if (input.includes("/api/stock-search")) {
      return [{ symbol: "AAPL", name: "Apple Inc", type: "Equity" }];
    }
    if (input.includes("/api/stock-price")) {
      return {
        price: 123.45,
        change: 1.23,
        changePercent: 0.99,
        changeRange: 4.56,
        changePctRange: 3.21,
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
  it("loads portfolio workspace data and shows navigation", async () => {
    render(<Page />);

    expect(await screen.findByText("Growth Portfolio")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Watchlist" })[0]);
    expect(screen.getByText("Main Watchlist")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Goals" })[0]);
    expect(screen.getByText("Retirement")).toBeTruthy();
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThan(0);
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

    expect(await screen.findByText("S&P 500")).toBeTruthy();
    expect(screen.getAllByText("123.45").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Stocks/ }));
    expect(await screen.findByText("Apple")).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "apple" } });

    const suggestion = await screen.findByText(/Apple Inc/);
    fireEvent.click(suggestion);

    expect(await screen.findByText("Apple Inc")).toBeTruthy();
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
  });
});

describe("ai analysis", () => {
  it("builds positions from transactions and renders AI analysis result", async () => {
    render(<AnalysisPage />);

    expect(await screen.findByText("AAPL")).toBeTruthy();
    expect(screen.getByText(/Apple/)).toBeTruthy();
    expect(await screen.findByText("$120.00")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: /AI Analysis/ })[1]);

    expect(await screen.findByText("Portfolio risk is moderate.")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai-analysis",
      expect.objectContaining({ method: "POST" }),
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

    expect(await screen.findByText("INTEL")).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/stock-price?symbol=INTC"));
    fireEvent.click(screen.getByRole("button", { name: "+ Thêm GD" }));

    fireEvent.change(screen.getByPlaceholderText("VD: AAPL, GOOGL, VNM..."), { target: { value: "JPM" } });
    fireEvent.change(screen.getByPlaceholderText("Tự điền hoặc chọn từ gợi ý"), { target: { value: "JPMorgan Chase & Co." } });
    fireEvent.change(container.querySelector("input[placeholder='10']")!, { target: { value: "2" } });
    fireEvent.change(container.querySelector("input[placeholder='150.00']")!, { target: { value: "250" } });

    fireEvent.click(screen.getByRole("button", { name: /Xác nhận giao dịch/ }));

    await waitFor(() => expect(api.createTransaction).toHaveBeenCalled());
    expect(await screen.findByText("JPM")).toBeTruthy();
    expect(screen.getByText("JPMorgan Chase & Co.")).toBeTruthy();
  });
});

describe("login", () => {
  it("logs in and stores the returned token", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "new-token", tokenType: "Bearer" });
    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(container.querySelector("input[type='password']")!, { target: { value: "very-secure-password" } });
    fireEvent.click(container.querySelector("button[type='submit']")!);

    await waitFor(() => expect(api.login).toHaveBeenCalledWith("user@example.com", "very-secure-password"));
    expect(localStorage.getItem("token")).toBe("new-token");
  });
});
