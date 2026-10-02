export interface BaseEntity {
  id: string; // UUID
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // Soft delete timestamp
  archived: boolean;
}

export type AssetType = 'STOCK' | 'BOND';
export type TransactionType = 'BUY' | 'SELL';

export interface TransactionDTO extends BaseEntity {
  portfolioId: string; // UUID
  symbol: string;
  assetType: AssetType;
  quantity: number;
  price: number;
  type: TransactionType;
  transactionDate: string; // ISO format date string (YYYY-MM-DD)
  lotId?: string; // Optional UUID linking sell transactions back to buy lots
  notes?: string; // Source/audit note, e.g. STOCK_DIVIDEND:<eventId>
}

export type BondStatus = 'ACTIVE' | 'SOLD' | 'MATURED';

export interface BondLedgerDTO extends BaseEntity {
  name: string;
  issuer: string;
  faceValue: number;
  quantity: number;
  purchaseDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  couponRate: number; // Annual interest rate in percentage, e.g. 8.5 for 8.5%
  couponFrequency: number; // Frequency in months, e.g. 3, 6, 12
  status: BondStatus;
  notes?: string;
}

export interface IncomeStatement {
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
}

export interface BalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashAndEquivalents: number;
  inventory?: number;
}

export interface CashFlow {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  freeCashFlow: number;
}

export interface FinancialRatios {
  roe?: number;
  roa?: number;
  eps?: number;
  pe?: number;
  grossMargin?: number;
  netMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
}

export interface FinancialReportDTO extends BaseEntity {
  symbol: string;
  source?: string;
  fetchedAt?: string;
  year: number;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2' | 'FY';
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlow;
  ratios: FinancialRatios;
}

export type ThesisRecommendation = 'BUY' | 'HOLD' | 'SELL' | 'WATCH';

export interface JournalRevision {
  version: number;
  updatedAt: string;
  investmentThesis: string;
  recommendation: ThesisRecommendation;
  targetPrice?: number;
}

export interface JournalEntryDTO extends BaseEntity {
  reportId?: string; // UUID linking to a specific financial report
  symbol: string; // Stock symbol this note applies to
  investmentThesis: string; // Markdown supported
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  managementComments?: string;
  recommendation: ThesisRecommendation;
  targetPrice?: number;
  confidence: number; // 1 to 5 scale
  tags: string[];
  attachments: string[]; // URLs or file paths to documents
  lastAutosavedAt?: string;
  revisions: JournalRevision[];
}

export type DividendType = 'CASH' | 'STOCK';

export interface DividendEventDTO extends BaseEntity {
  symbol: string;
  recordDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD
  dividendRate: number; // Ratio or actual cash amount per share
  type: DividendType;
}

export interface DividendReceivedDTO extends BaseEntity {
  transactionId: string; // Link to buy lot transaction
  dividendEventId: string;
  amountReceived: number; // Cash received or stock added
  type: DividendType;
}

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT';
  date: string;
  read: boolean;
}
