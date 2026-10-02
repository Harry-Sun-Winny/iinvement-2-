import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DividendsModule from '../DividendsModule';
import { calculateReceivedDividends, type CalculatedDividend } from '../../services/calculators/dividendCalculator';

vi.mock('../../services/calculators/dividendCalculator', () => ({
  calculateReceivedDividends: vi.fn(),
}));

// These tests exercise the tables, not SVG layout in jsdom.
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: () => null,
}));

const props = {
  transactions: [],
  dividendEvents: [],
  onAddEvent: vi.fn(),
  onRecordStockDividend: vi.fn(async (_dividend: CalculatedDividend) => {}),
  recordedStockDividendIds: new Set<string>(),
  baseCurrency: 'USD',
};

let dividends: CalculatedDividend[];
const detailsTable = () => screen.getByRole('table', { name: 'Chi tiết các kỳ cổ tức' });
const detailRows = () => within(detailsTable()).getAllByRole('row').slice(1);
const nextPage = () => fireEvent.click(screen.getByRole('button', { name: 'Tiếp theo' }));

beforeEach(() => {
  vi.clearAllMocks();
  dividends = Array.from({ length: 36 }, (_, index) => ({
    id: `event-${index + 1}`,
    symbol: index === 0 ? 'FPT' : `CP${String(index + 1).padStart(2, '0')}`,
    recordDate: '2025-01-01',
    paymentDate: '2025-01-15',
    rate: 2,
    type: index === 35 ? 'STOCK' : 'CASH',
    sharesHeldAtRecord: 500,
    payout: 1000,
    isValid: true,
  }));
  vi.mocked(calculateReceivedDividends).mockReturnValue(dividends);
});

afterEach(cleanup);

describe('DividendsModule table visibility', () => {
  it('matches every detail cell to its header, including the separate Holding action', () => {
    render(<DividendsModule {...props} />);
    const headers = within(detailsTable()).getAllByRole('columnheader');
    expect(headers).toHaveLength(9);
    expect(headers[5].textContent).toContain('CP tại ngày chốt');
    expect(headers[6].textContent).toContain('Thực Nhận');
    expect(headers[7].textContent).toContain('Trạng Thái');
    expect(headers[8].textContent).toBe('Ghi nhận Holding');
    for (const row of detailRows()) expect(within(row).getAllByRole('cell')).toHaveLength(headers.length);
    const cells = within(detailRows()[0]).getAllByRole('cell');
    expect(cells[5].textContent).toBe('500 CP');
    expect(cells[6].textContent).toBe(`$${(1000).toLocaleString()}`);
    expect(cells[7].textContent).toBe(' Đã nhận');
    expect(cells[8].textContent).toBe('--');
  });

  it('keeps every symbol and full company name inside the summary scroll region', () => {
    render(<DividendsModule {...props} />);
    const region = screen.getByRole('region', { name: 'Cuộn bảng tổng hợp cổ tức' });
    expect(region.tabIndex).toBe(0);
    const summary = within(region).getByRole('table');
    const rows = within(summary).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(36);
    for (const row of rows) expect(within(row).getAllByRole('cell')).toHaveLength(6);
    // Unknown companies correctly repeat the symbol in the company-name column.
    expect(within(summary).getAllByText('CP36')).toHaveLength(2);
    const companyCell = within(summary).getByText('Cổ phần FPT');
    expect(companyCell.className).not.toContain('truncate');
    expect(screen.getByText(/Hiển thị đầy đủ 36 mã/)).toBeTruthy();
  });

  it('exposes all pages and can show all records without clipping the pagination inside the scroller', () => {
    render(<DividendsModule {...props} />);
    expect(detailRows()).toHaveLength(25);
    expect(screen.getByRole('status').textContent).toBe('Hiển thị 1–25 / 36 kỳ cổ tức');
    nextPage();
    expect(detailRows()).toHaveLength(11);
    expect(screen.getByRole('status').textContent).toBe('Hiển thị 26–36 / 36 kỳ cổ tức');
    expect((screen.getByRole('button', { name: 'Tiếp theo' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Số dòng mỗi trang'), { target: { value: 'ALL' } });
    expect(detailRows()).toHaveLength(36);
    expect(screen.getByRole('status').textContent).toBe('Hiển thị 1–36 / 36 kỳ cổ tức');
    expect(screen.getByText('Trang 1 / 1')).toBeTruthy();
    const region = screen.getByRole('region', { name: 'Cuộn bảng chi tiết cổ tức' });
    expect(region.tabIndex).toBe(0);
    expect(region.contains(screen.getByRole('navigation', { name: 'Phân trang cổ tức' }))).toBe(false);
    expect((screen.getByRole('button', { name: 'Trở lại' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('returns to page one when filtering a symbol from a later page', () => {
    render(<DividendsModule {...props} />);
    nextPage();
    fireEvent.change(screen.getByLabelText('Lọc theo mã cổ phiếu'), { target: { value: ' cp36 ' } });
    expect(detailRows()).toHaveLength(1);
    expect(within(detailsTable()).getByText('CP36')).toBeTruthy();
    expect(screen.getByText('Trang 1 / 1')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Hiển thị 1–1 / 1 kỳ cổ tức');
  });

  it('resets the page and scroll position when changing the dividend type', () => {
    render(<DividendsModule {...props} />);
    nextPage();
    const region = screen.getByRole('region', { name: 'Cuộn bảng chi tiết cổ tức' });
    region.scrollTop = 200;
    fireEvent.change(screen.getByLabelText('Lọc theo loại cổ tức'), { target: { value: 'STOCK' } });
    expect(detailRows()).toHaveLength(1);
    expect(within(detailsTable()).getByText('CP36')).toBeTruthy();
    expect(screen.getByText('Trang 1 / 1')).toBeTruthy();
    expect(region.scrollTop).toBe(0);
  });

  it('sorts from the first page using an accessible header button', () => {
    render(<DividendsModule {...props} />);
    nextPage();
    fireEvent.click(within(detailsTable()).getByRole('button', { name: 'Mã CP' }));
    expect(screen.getByText('Trang 1 / 2')).toBeTruthy();
    expect(within(detailRows()[0]).getAllByRole('cell')[0].textContent).toBe('CP02');
    expect(within(detailsTable()).getByRole('columnheader', { name: /Mã CP/ }).getAttribute('aria-sort')).toBe('ascending');
  });

  it('clamps a stale page when refreshed data shrinks and does not restore that stale page later', () => {
    const { rerender } = render(<DividendsModule {...props} />);
    nextPage();
    vi.mocked(calculateReceivedDividends).mockReturnValue(dividends.slice(0, 2));
    rerender(<DividendsModule {...props} dividendEvents={[]} />);
    expect(detailRows()).toHaveLength(2);
    expect(screen.getByText('Trang 1 / 1')).toBeTruthy();
    vi.mocked(calculateReceivedDividends).mockReturnValue(dividends);
    rerender(<DividendsModule {...props} dividendEvents={[]} />);
    expect(screen.getByText('Trang 1 / 2')).toBeTruthy();
    expect(detailRows()).toHaveLength(25);
  });

  it('shows accurate empty-state counts and spans all nine columns', () => {
    vi.mocked(calculateReceivedDividends).mockReturnValue([]);
    render(<DividendsModule {...props} />);
    const cell = within(detailsTable()).getByRole('cell');
    expect(cell.getAttribute('colspan')).toBe('9');
    expect(screen.getByRole('status').textContent).toBe('Hiển thị 0–0 / 0 kỳ cổ tức');
    expect(screen.getByText('Trang 1 / 1')).toBeTruthy();
    expect(screen.getByText('Chưa có kỳ cổ tức đã thanh toán hợp lệ.')).toBeTruthy();
  });

  it('keeps stock-dividend recording in the final column and surfaces callback errors', async () => {
    const onRecordStockDividend = vi.fn().mockRejectedValue(new Error('Không thể ghi nhận lúc này.'));
    const { rerender } = render(<DividendsModule {...props} onRecordStockDividend={onRecordStockDividend} />);
    fireEvent.change(screen.getByLabelText('Lọc theo loại cổ tức'), { target: { value: 'STOCK' } });
    const cells = within(detailRows()[0]).getAllByRole('cell');
    expect(cells[5].textContent).toBe('500 CP');
    expect(cells[6].textContent).toBe(`${(1000).toLocaleString()} CP`);
    fireEvent.click(within(cells[8]).getByRole('button', { name: 'Ghi vào Holding' }));
    expect(onRecordStockDividend).toHaveBeenCalledExactlyOnceWith(dividends[35]);
    expect((await screen.findByRole('alert')).textContent).toBe('Không thể ghi nhận lúc này.');
    rerender(<DividendsModule {...props} recordedStockDividendIds={new Set(['event-36'])} />);
    expect(within(detailsTable()).getByText('Đã ghi nhận')).toBeTruthy();
    expect(within(detailsTable()).queryByRole('button', { name: 'Ghi vào Holding' })).toBeNull();
  });
});
