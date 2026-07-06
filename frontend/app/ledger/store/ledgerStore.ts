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
  clearMockData: () => void;
}

// ----------------------------------------------------
// ZUSTAND STORE CREATION WITH PERSIST MIDDLEWARE
// ----------------------------------------------------

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
