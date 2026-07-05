import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  TransactionDTO, 
  BondLedgerDTO, 
  FinancialReportDTO, 
  JournalEntryDTO, 
  DividendEventDTO,
  NotificationDTO,
  ThesisRecommendation
} from '../../../types/ledger';

// Helper to generate UUIDs
const uuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface LedgerState {
  transactions: TransactionDTO[];
  bonds: BondLedgerDTO[];
  reports: FinancialReportDTO[];
  journals: JournalEntryDTO[];
  dividendEvents: DividendEventDTO[];
  notifications: NotificationDTO[];
  searchQuery: string;
  
  // Transaction Actions
  addTransaction: (tx: Omit<TransactionDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => void;
  updateTransaction: (id: string, tx: Partial<TransactionDTO>) => void;
  deleteTransaction: (id: string, soft?: boolean) => void;
  restoreTransaction: (id: string) => void;
  setTransactions: (txs: TransactionDTO[]) => void;

  // Bond Actions
  addBond: (bond: Omit<BondLedgerDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => void;
  updateBond: (id: string, bond: Partial<BondLedgerDTO>) => void;
  deleteBond: (id: string, soft?: boolean) => void;
  restoreBond: (id: string) => void;
  archiveBond: (id: string, archive: boolean) => void;

  // Report Actions
  addReport: (report: Omit<FinancialReportDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => boolean; // returns false if duplicate
  updateReport: (id: string, report: Partial<FinancialReportDTO>) => void;
  deleteReport: (id: string, soft?: boolean) => void;
  restoreReport: (id: string) => void;
  setReports: (reports: FinancialReportDTO[]) => void;

  // Journal Actions
  saveJournalEntry: (entry: Omit<JournalEntryDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived' | 'revisions'>) => void;
  autosaveJournalEntry: (symbol: string, reportId: string | undefined, thesis: string) => void;
  deleteJournalEntry: (id: string) => void;

  // Dividend Event Actions
  addDividendEvent: (event: Omit<DividendEventDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>) => void;
  setDividendEvents: (events: DividendEventDTO[]) => void;

  // Notification Actions
  addNotification: (notification: Omit<NotificationDTO, 'id' | 'date' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Global Actions
  setSearchQuery: (query: string) => void;
  importBackup: (jsonData: string) => boolean;
  exportBackup: () => string;
  resetToDefaultMockData: () => void;
  clearMockData: () => void;
}

// ----------------------------------------------------
// HISTORICAL MOCK DATASET (2010 - PRESENT)
// ----------------------------------------------------

const initialMockTransactions = (): TransactionDTO[] => {
  const data: Omit<TransactionDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>[] = [
    // FPT Giao dịch (2010 - nay)
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 500, price: 12000, type: 'BUY', transactionDate: '2010-03-15' },
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 300, price: 15500, type: 'BUY', transactionDate: '2012-08-20' },
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 200, price: 25000, type: 'SELL', transactionDate: '2015-05-10' },
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 400, price: 35000, type: 'BUY', transactionDate: '2018-11-12' },
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 200, price: 55000, type: 'BUY', transactionDate: '2020-04-15' },
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 300, price: 80000, type: 'SELL', transactionDate: '2022-09-05' },
    { portfolioId: 'p1', symbol: 'FPT', assetType: 'STOCK', quantity: 500, price: 95000, type: 'BUY', transactionDate: '2024-06-10' },

    // HPG Giao dịch (2011 - nay)
    { portfolioId: 'p1', symbol: 'HPG', assetType: 'STOCK', quantity: 2000, price: 8000, type: 'BUY', transactionDate: '2011-05-10' },
    { portfolioId: 'p1', symbol: 'HPG', assetType: 'STOCK', quantity: 1500, price: 12000, type: 'BUY', transactionDate: '2013-10-22' },
    { portfolioId: 'p1', symbol: 'HPG', assetType: 'STOCK', quantity: 1000, price: 18000, type: 'SELL', transactionDate: '2016-04-18' },
    { portfolioId: 'p1', symbol: 'HPG', assetType: 'STOCK', quantity: 2000, price: 15000, type: 'BUY', transactionDate: '2018-07-15' },
    { portfolioId: 'p1', symbol: 'HPG', assetType: 'STOCK', quantity: 1000, price: 45000, type: 'SELL', transactionDate: '2021-06-01' },
    { portfolioId: 'p1', symbol: 'HPG', assetType: 'STOCK', quantity: 1500, price: 22000, type: 'BUY', transactionDate: '2023-03-20' },

    // VCB Giao dịch (2015 - nay)
    { portfolioId: 'p1', symbol: 'VCB', assetType: 'STOCK', quantity: 1000, price: 32000, type: 'BUY', transactionDate: '2015-02-25' },
    { portfolioId: 'p1', symbol: 'VCB', assetType: 'STOCK', quantity: 800, price: 45000, type: 'BUY', transactionDate: '2017-09-12' },
    { portfolioId: 'p1', symbol: 'VCB', assetType: 'STOCK', quantity: 500, price: 75000, type: 'SELL', transactionDate: '2020-01-15' },
    { portfolioId: 'p1', symbol: 'VCB', assetType: 'STOCK', quantity: 1000, price: 62000, type: 'BUY', transactionDate: '2021-11-30' },
    { portfolioId: 'p1', symbol: 'VCB', assetType: 'STOCK', quantity: 500, price: 88000, type: 'BUY', transactionDate: '2024-02-18' },

    // AAPL Giao dịch (2016 - nay)
    { portfolioId: 'p1', symbol: 'AAPL', assetType: 'STOCK', quantity: 100, price: 95, type: 'BUY', transactionDate: '2016-05-18' },
    { portfolioId: 'p1', symbol: 'AAPL', assetType: 'STOCK', quantity: 50, price: 140, type: 'BUY', transactionDate: '2018-03-12' },
    { portfolioId: 'p1', symbol: 'AAPL', assetType: 'STOCK', quantity: 40, price: 170, type: 'SELL', transactionDate: '2020-08-25' },
    { portfolioId: 'p1', symbol: 'AAPL', assetType: 'STOCK', quantity: 100, price: 130, type: 'BUY', transactionDate: '2022-06-15' },
    { portfolioId: 'p1', symbol: 'AAPL', assetType: 'STOCK', quantity: 50, price: 180, type: 'BUY', transactionDate: '2024-10-05' },

    // MSFT Giao dịch (2018 - nay)
    { portfolioId: 'p1', symbol: 'MSFT', assetType: 'STOCK', quantity: 50, price: 105, type: 'BUY', transactionDate: '2018-06-20' },
    { portfolioId: 'p1', symbol: 'MSFT', assetType: 'STOCK', quantity: 40, price: 150, type: 'BUY', transactionDate: '2020-03-10' },
    { portfolioId: 'p1', symbol: 'MSFT', assetType: 'STOCK', quantity: 30, price: 230, type: 'SELL', transactionDate: '2021-09-18' },
    { portfolioId: 'p1', symbol: 'MSFT', assetType: 'STOCK', quantity: 50, price: 320, type: 'BUY', transactionDate: '2023-11-05' }
  ];

  return data.map(d => ({
    ...d,
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    archived: false
  }));
};

const initialMockBonds = (): BondLedgerDTO[] => {
  const data: Omit<BondLedgerDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>[] = [
    { name: 'Trái phiếu FPT2015', issuer: 'Tập đoàn FPT', faceValue: 100000000, quantity: 1, purchaseDate: '2015-06-15', maturityDate: '2025-06-15', couponRate: 8.5, couponFrequency: 6, status: 'MATURED', notes: 'Trái phiếu phát hành riêng lẻ lãi suất cố định, đã hoàn tất đáo hạn' },
    { name: 'Trái phiếu VIC2018', issuer: 'Tập đoàn Vingroup', faceValue: 50000000, quantity: 2, purchaseDate: '2018-09-20', maturityDate: '2023-09-20', couponRate: 9.8, couponFrequency: 3, status: 'MATURED', notes: 'Đã đáo hạn nhận đủ gốc lãi' },
    { name: 'Trái phiếu BIDV2020', issuer: 'Ngân hàng BIDV', faceValue: 100000000, quantity: 2, purchaseDate: '2020-11-15', maturityDate: '2030-11-15', couponRate: 7.2, couponFrequency: 6, status: 'ACTIVE', notes: 'Mua trực tiếp từ đại lý phát hành, trả lãi định kỳ tháng 5 và tháng 11 hàng năm' },
    { name: 'Trái phiếu HPG2022', issuer: 'Tập đoàn Hòa Phát', faceValue: 100000000, quantity: 1, purchaseDate: '2022-04-10', maturityDate: '2027-04-10', couponRate: 8.8, couponFrequency: 12, status: 'ACTIVE', notes: 'Lãi suất trả hàng năm cố định' },
    { name: 'Trái phiếu CTG2024', issuer: 'Ngân hàng VietinBank', faceValue: 50000000, quantity: 4, purchaseDate: '2024-07-05', maturityDate: '2029-07-05', couponRate: 6.5, couponFrequency: 3, status: 'ACTIVE', notes: 'Kỳ trả lãi ngắn hạn 3 tháng' }
  ];

  return data.map(d => ({
    ...d,
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    archived: d.status === 'MATURED'
  }));
};

const initialMockDividendEvents = (): DividendEventDTO[] => {
  const events: Omit<DividendEventDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>[] = [
    // FPT Dividends (2010 - nay)
    { symbol: 'FPT', recordDate: '2010-06-10', paymentDate: '2010-07-15', dividendRate: 1500, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2011-05-20', paymentDate: '2011-06-25', dividendRate: 2000, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2012-05-15', paymentDate: '2012-06-20', dividendRate: 1500, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2013-08-10', paymentDate: '2013-09-12', dividendRate: 0.15, type: 'STOCK' },
    { symbol: 'FPT', recordDate: '2014-05-25', paymentDate: '2014-06-30', dividendRate: 2000, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2016-06-05', paymentDate: '2016-07-10', dividendRate: 2000, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2018-05-18', paymentDate: '2018-06-22', dividendRate: 1500, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2020-06-01', paymentDate: '2020-07-15', dividendRate: 2000, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2021-08-15', paymentDate: '2021-09-20', dividendRate: 0.10, type: 'STOCK' },
    { symbol: 'FPT', recordDate: '2022-05-30', paymentDate: '2022-07-05', dividendRate: 2000, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2023-06-15', paymentDate: '2023-07-20', dividendRate: 2000, type: 'CASH' },
    { symbol: 'FPT', recordDate: '2024-08-25', paymentDate: '2024-09-30', dividendRate: 0.15, type: 'STOCK' },
    { symbol: 'FPT', recordDate: '2025-05-28', paymentDate: '2025-07-02', dividendRate: 2000, type: 'CASH' },
    // Future Expected FPT Dividend
    { symbol: 'FPT', recordDate: '2026-08-10', paymentDate: '2026-09-15', dividendRate: 2500, type: 'CASH' },

    // HPG Dividends
    { symbol: 'HPG', recordDate: '2011-06-20', paymentDate: '2011-07-25', dividendRate: 1000, type: 'CASH' },
    { symbol: 'HPG', recordDate: '2013-05-15', paymentDate: '2013-06-20', dividendRate: 2000, type: 'CASH' },
    { symbol: 'HPG', recordDate: '2015-05-22', paymentDate: '2015-06-30', dividendRate: 0.20, type: 'STOCK' },
    { symbol: 'HPG', recordDate: '2018-06-10', paymentDate: '2018-07-20', dividendRate: 3000, type: 'CASH' },
    { symbol: 'HPG', recordDate: '2020-07-30', paymentDate: '2020-09-10', dividendRate: 0.20, type: 'STOCK' },
    { symbol: 'HPG', recordDate: '2021-05-25', paymentDate: '2021-07-05', dividendRate: 500, type: 'CASH' },
    { symbol: 'HPG', recordDate: '2024-05-24', paymentDate: '2024-06-25', dividendRate: 1000, type: 'CASH' },

    // AAPL Dividends (US stocks pay quarterly)
    { symbol: 'AAPL', recordDate: '2016-08-10', paymentDate: '2016-08-25', dividendRate: 0.57, type: 'CASH' },
    { symbol: 'AAPL', recordDate: '2018-11-08', paymentDate: '2018-11-22', dividendRate: 0.73, type: 'CASH' },
    { symbol: 'AAPL', recordDate: '2020-05-07', paymentDate: '2020-05-21', dividendRate: 0.82, type: 'CASH' },
    { symbol: 'AAPL', recordDate: '2022-11-10', paymentDate: '2022-11-24', dividendRate: 0.23, type: 'CASH' }, // Split-adjusted
    { symbol: 'AAPL', recordDate: '2024-08-09', paymentDate: '2024-08-23', dividendRate: 0.25, type: 'CASH' },
    { symbol: 'AAPL', recordDate: '2026-05-08', paymentDate: '2026-05-22', dividendRate: 0.26, type: 'CASH' }
  ];

  return events.map(e => ({
    ...e,
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    archived: false
  }));
};

const initialMockReports = (): FinancialReportDTO[] => {
  const data: Omit<FinancialReportDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived'>[] = [
    // FPT Lịch sử BCTC
    {
      symbol: 'FPT', year: 2024, period: 'FY',
      incomeStatement: { revenue: 60100000000000, grossProfit: 23500000000000, operatingIncome: 10500000000000, netIncome: 7780000000000 },
      balanceSheet: { totalAssets: 68300000000000, totalLiabilities: 34100000000000, totalEquity: 34200000000000, cashAndEquivalents: 24500000000000 },
      cashFlow: { operatingCashFlow: 8900000000000, investingCashFlow: -6200000000000, financingCashFlow: -2100000000000, freeCashFlow: 2700000000000 },
      ratios: { roe: 24.5, roa: 12.1, eps: 5800, pe: 18.2, grossMargin: 39.1, netMargin: 12.9, debtToEquity: 1.0 }
    },
    {
      symbol: 'FPT', year: 2025, period: 'FY',
      incomeStatement: { revenue: 71200000000000, grossProfit: 28400000000000, operatingIncome: 12800000000000, netIncome: 9450000000000 },
      balanceSheet: { totalAssets: 79500000000000, totalLiabilities: 38200000000000, totalEquity: 41300000000000, cashAndEquivalents: 29800000000000 },
      cashFlow: { operatingCashFlow: 11200000000000, investingCashFlow: -7100000000000, financingCashFlow: -3200000000000, freeCashFlow: 4100000000000 },
      ratios: { roe: 26.2, roa: 13.2, eps: 7010, pe: 17.5, grossMargin: 39.9, netMargin: 13.3, debtToEquity: 0.92 }
    },
    // HPG Lịch sử BCTC
    {
      symbol: 'HPG', year: 2024, period: 'FY',
      incomeStatement: { revenue: 120500000000000, grossProfit: 14800000000000, operatingIncome: 8900000000000, netIncome: 6800000000000 },
      balanceSheet: { totalAssets: 178200000000000, totalLiabilities: 79200000000000, totalEquity: 99000000000000, cashAndEquivalents: 34100000000000 },
      cashFlow: { operatingCashFlow: 12400000000000, investingCashFlow: -18000000000000, financingCashFlow: 6000000000000, freeCashFlow: -5600000000000 },
      ratios: { roe: 6.9, roa: 3.8, eps: 1150, pe: 24.5, grossMargin: 12.2, netMargin: 5.6, debtToEquity: 0.8 }
    },
    {
      symbol: 'HPG', year: 2025, period: 'FY',
      incomeStatement: { revenue: 142300000000000, grossProfit: 21500000000000, operatingIncome: 14800000000000, netIncome: 11400000000000 },
      balanceSheet: { totalAssets: 198500000000000, totalLiabilities: 88100000000000, totalEquity: 110400000000000, cashAndEquivalents: 39200000000000 },
      cashFlow: { operatingCashFlow: 16800000000000, investingCashFlow: -14500000000000, financingCashFlow: -1200000000000, freeCashFlow: 2300000000000 },
      ratios: { roe: 10.7, roa: 6.0, eps: 1950, pe: 14.8, grossMargin: 15.1, netMargin: 8.0, debtToEquity: 0.79 }
    }
  ];

  return data.map(d => ({
    ...d,
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    archived: false
  }));
};

const initialMockJournals = (reports: FinancialReportDTO[]): JournalEntryDTO[] => {
  const fptReport2025 = reports.find(r => r.symbol === 'FPT' && r.year === 2025);
  const hpgReport2025 = reports.find(r => r.symbol === 'HPG' && r.year === 2025);

  const data: Omit<JournalEntryDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'archived' | 'revisions'>[] = [
    {
      symbol: 'FPT',
      reportId: fptReport2025?.id,
      investmentThesis: `### Luận điểm đầu tư FPT 2025-2026\nFPT tiếp tục khẳng định vị thế dẫn đầu trong chuyển đổi số toàn cầu và thị trường CNTT trong nước.\n1. **Khối công nghệ:** Động lực chính từ mảng xuất khẩu phần mềm tại Nhật Bản và Mỹ.\n2. **Hệ sinh thái Giáo dục:** Số lượng học sinh nhập học tăng trưởng liên tục tạo nguồn thu ổn định.\n3. **Cơ hội AI/Bán dẫn:** Quan hệ hợp tác với Nvidia mở ra triển vọng xây dựng nhà máy AI Factory lớn.`,
      strengths: ['Doanh thu xuất khẩu phần mềm tăng trưởng 20%+', 'Mảng giáo dục biên lợi nhuận cao', 'Lượng tiền mặt ròng dồi dào'],
      weaknesses: ['Chi phí R&D công nghệ cao làm chậm biên lợi nhuận ngắn hạn', 'Cạnh tranh nhân sự IT chất lượng cao toàn cầu'],
      risks: ['Rủi ro biến động tỷ giá JPY/VND', 'Suy thoái kinh tế tại các nước EU ảnh hưởng đến nhu cầu outsourcing'],
      managementComments: 'Ban lãnh đạo cam kết giữ tốc độ tăng trưởng doanh thu ở mức 20% mỗi năm trong 3 năm tới.',
      recommendation: 'BUY',
      targetPrice: 155000,
      confidence: 5,
      tags: ['Chuyển đổi số', 'AI Factory', 'Tăng trưởng'],
      attachments: []
    },
    {
      symbol: 'HPG',
      reportId: hpgReport2025?.id,
      investmentThesis: `### Phân tích Hòa Phát (HPG) chu kỳ phục hồi\nHPG bắt đầu ghi nhận hiệu suất tốt nhờ nhu cầu thép xây dựng nội địa phục hồi và đẩy nhanh tiến độ dự án Dung Quất 2.\n- **Dung Quất 2:** Dự kiến chạy thử nghiệm vào Q4/2025 sẽ nâng công suất HRC lên gấp đôi.\n- **Chi phí đầu vào:** Giá quặng sắt và than cốc hạ nhiệt giúp biên lợi nhuận gộp cải thiện tốt lên mức 15.1%.`,
      strengths: ['Thị phần thép xây dựng số 1 Việt Nam (>35%)', 'Chuỗi cung ứng khép kín tối ưu hóa chi phí'],
      weaknesses: ['Đòn bẩy tài chính cao phục vụ dự án Dung Quất 2', 'Phụ thuộc nhiều vào thị trường bất động sản nội địa'],
      risks: ['Áp lực thép giá rẻ từ Trung Quốc nhập khẩu', 'Biến động lãi suất vay ngân hàng'],
      managementComments: 'Chủ tịch Trần Đình Long tin tưởng Dung Quất 2 sẽ là bước ngoặt lớn đưa HPG vào câu lạc bộ thép thế giới.',
      recommendation: 'HOLD',
      targetPrice: 35000,
      confidence: 4,
      tags: ['Thép HRC', 'Phục hồi chu kỳ', 'Dung Quất 2'],
      attachments: []
    }
  ];

  return data.map(d => ({
    ...d,
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    archived: false,
    revisions: []
  }));
};

const initialMockNotifications = (): NotificationDTO[] => [
  { id: uuid(), title: 'Đáo hạn Trái phiếu', message: 'Trái phiếu FPT2015 đã đáo hạn thành công vào ngày 15/06/2025. Hãy cập nhật gốc lãi.', type: 'INFO', date: '2025-06-15', read: true },
  { id: uuid(), title: 'Cổ tức sắp chi trả', message: 'Mã FPT chuẩn bị chốt quyền nhận cổ tức 2,500đ/CP vào ngày 10/08/2026.', type: 'WARNING', date: '2026-07-01', read: false },
  { id: uuid(), title: 'Lãi Coupon Trái phiếu', message: 'Trái phiếu BIDV2020 sắp đến kỳ trả lãi coupon vào ngày 15/11/2026.', type: 'INFO', date: '2026-07-04', read: false }
];

// ----------------------------------------------------
// ZUSTAND STORE CREATION WITH PERSIST MIDDLEWARE
// ----------------------------------------------------

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      transactions: [],
      bonds: [],
      reports: [],
      journals: [],
      dividendEvents: [],
      notifications: [],
      searchQuery: '',

      // Transaction Actions
      addTransaction: (tx) => set((state) => ({
        transactions: [
          ...state.transactions,
          {
            ...tx,
            id: uuid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            archived: false
          }
        ]
      })),

      updateTransaction: (id, updatedFields) => set((state) => ({
        transactions: state.transactions.map(tx => 
          tx.id === id ? { ...tx, ...updatedFields, updatedAt: new Date().toISOString() } : tx
        )
      })),

      deleteTransaction: (id, soft = true) => set((state) => ({
        transactions: soft
          ? state.transactions.map(tx => tx.id === id ? { ...tx, deletedAt: new Date().toISOString() } : tx)
          : state.transactions.filter(tx => tx.id !== id)
      })),

      restoreTransaction: (id) => set((state) => ({
        transactions: state.transactions.map(tx => tx.id === id ? { ...tx, deletedAt: null } : tx)
      })),

      setTransactions: (txs) => set({ transactions: txs }),

      clearMockData: () => set({
        dividendEvents: [],
        reports: [],
        journals: [],
        notifications: []
      }),

      // Bond Actions
      addBond: (bond) => set((state) => ({
        bonds: [
          ...state.bonds,
          {
            ...bond,
            id: uuid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            archived: false
          }
        ]
      })),

      updateBond: (id, updatedFields) => set((state) => ({
        bonds: state.bonds.map(b => 
          b.id === id ? { ...b, ...updatedFields, updatedAt: new Date().toISOString() } : b
        )
      })),

      deleteBond: (id, soft = true) => set((state) => ({
        bonds: soft
          ? state.bonds.map(b => b.id === id ? { ...b, deletedAt: new Date().toISOString() } : b)
          : state.bonds.filter(b => b.id !== id)
      })),

      restoreBond: (id) => set((state) => ({
        bonds: state.bonds.map(b => b.id === id ? { ...b, deletedAt: null } : b)
      })),

      archiveBond: (id, archived) => set((state) => ({
        bonds: state.bonds.map(b => b.id === id ? { ...b, archived, updatedAt: new Date().toISOString() } : b)
      })),

      // Report Actions
      addReport: (report) => {
        const reports = get().reports;
        const exists = reports.some(r => r.symbol === report.symbol && r.year === report.year && r.period === report.period && !r.deletedAt);
        if (exists) return false;

        set((state) => ({
          reports: [
            ...state.reports,
            {
              ...report,
              id: uuid(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              archived: false
            }
          ]
        }));
        return true;
      },

      updateReport: (id, updatedFields) => set((state) => ({
        reports: state.reports.map(r => 
          r.id === id ? { ...r, ...updatedFields, updatedAt: new Date().toISOString() } : r
        )
      })),

      deleteReport: (id, soft = true) => set((state) => ({
        reports: soft
          ? state.reports.map(r => r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r)
          : state.reports.filter(r => r.id !== id)
      })),

      restoreReport: (id) => set((state) => ({
        reports: state.reports.map(r => r.id === id ? { ...r, deletedAt: null } : r)
      })),

      setReports: (reports) => set({ reports: reports }),

      // Journal Actions
      saveJournalEntry: (entry) => set((state) => {
        const exists = state.journals.find(j => j.symbol === entry.symbol && j.reportId === entry.reportId);
        
        if (exists) {
          // Push old state to revisions
          const newRevision = {
            version: (exists.revisions?.length || 0) + 1,
            updatedAt: new Date().toISOString(),
            investmentThesis: exists.investmentThesis,
            recommendation: exists.recommendation,
            targetPrice: exists.targetPrice
          };
          
          return {
            journals: state.journals.map(j => 
              j.id === exists.id ? { 
                ...j, 
                ...entry, 
                updatedAt: new Date().toISOString(),
                revisions: [...(j.revisions || []), newRevision]
              } : j
            )
          };
        } else {
          return {
            journals: [
              ...state.journals,
              {
                ...entry,
                id: uuid(),
                revisions: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
                archived: false
              }
            ]
          };
        }
      }),

      autosaveJournalEntry: (symbol, reportId, thesis) => set((state) => {
        const exists = state.journals.find(j => j.symbol === symbol && j.reportId === reportId);
        if (exists) {
          return {
            journals: state.journals.map(j => 
              j.id === exists.id ? { 
                ...j, 
                investmentThesis: thesis, 
                lastAutosavedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString() 
              } : j
            )
          };
        } else {
          return {
            journals: [
              ...state.journals,
              {
                symbol,
                reportId,
                investmentThesis: thesis,
                strengths: [],
                weaknesses: [],
                risks: [],
                recommendation: 'WATCH',
                confidence: 3,
                tags: [],
                attachments: [],
                revisions: [],
                id: uuid(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastAutosavedAt: new Date().toISOString(),
                deletedAt: null,
                archived: false
              }
            ]
          };
        }
      }),

      deleteJournalEntry: (id) => set((state) => ({
        journals: state.journals.filter(j => j.id !== id)
      })),

      // Dividend Event Actions
      addDividendEvent: (event) => set((state) => ({
        dividendEvents: [
          ...state.dividendEvents,
          {
            ...event,
            id: uuid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            archived: false
          }
        ]
      })),

      setDividendEvents: (events) => set({ dividendEvents: events }),

      // Notification Actions
      addNotification: (noti) => set((state) => ({
        notifications: [
          {
            ...noti,
            id: uuid(),
            date: new Date().toISOString().split('T')[0],
            read: false
          },
          ...state.notifications
        ]
      })),

      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),

      clearAllNotifications: () => set({ notifications: [] }),

      // Global Actions
      setSearchQuery: (query) => set({ searchQuery: query }),

      importBackup: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData);
          if (
            Array.isArray(parsed.transactions) &&
            Array.isArray(parsed.bonds) &&
            Array.isArray(parsed.reports) &&
            Array.isArray(parsed.journals)
          ) {
            set({
              transactions: parsed.transactions,
              bonds: parsed.bonds,
              reports: parsed.reports,
              journals: parsed.journals,
              dividendEvents: parsed.dividendEvents || [],
              notifications: parsed.notifications || []
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      exportBackup: () => {
        const state = get();
        return JSON.stringify({
          transactions: state.transactions,
          bonds: state.bonds,
          reports: state.reports,
          journals: state.journals,
          dividendEvents: state.dividendEvents,
          notifications: state.notifications
        }, null, 2);
      },

      resetToDefaultMockData: () => {
        const mockReports = initialMockReports();
        set({
          transactions: initialMockTransactions(),
          bonds: initialMockBonds(),
          reports: mockReports,
          journals: initialMockJournals(mockReports),
          dividendEvents: initialMockDividendEvents(),
          notifications: initialMockNotifications(),
          searchQuery: ''
        });
      }
    }),
    {
      name: 'enterprise-financial-ledger-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        bonds: state.bonds,
        reports: state.reports,
        journals: state.journals,
        dividendEvents: state.dividendEvents,
        notifications: state.notifications
      }),
    }
  )
);
