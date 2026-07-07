import * as XLSX from "xlsx";

export interface ExportSummary {
  portfolioName: string;
  generatedTime: string;
  totalValue: string;
  totalInvested: string;
  totalPnl: string;
  totalReturnPct: string;
  sharpeRatio: string;
  sortinoRatio: string;
  valueAtRisk: string;
  volatility: string;
  maxDrawdown: string;
}

export interface ExportDetailRow {
  date: string;
  value: number;
  cost: number;
  dailyReturn: number | string;
}

export function exportToCSV(
  summary: ExportSummary,
  details: ExportDetailRow[]
) {
  const rows = [
    ["Báo cáo Phân tích Hiệu suất & Rủi ro Danh mục"],
    ["Tên danh mục", summary.portfolioName],
    ["Thời gian tạo", summary.generatedTime],
    ["Tổng giá trị tài sản", summary.totalValue],
    ["Tổng vốn đầu tư", summary.totalInvested],
    ["Tổng Lãi/Lỗ", summary.totalPnl],
    ["Tỷ suất sinh lời tổng", summary.totalReturnPct],
    ["Chỉ số Sharpe", summary.sharpeRatio],
    ["Chỉ số Sortino", summary.sortinoRatio],
    ["Chỉ số VaR (95%)", summary.valueAtRisk],
    ["Độ biến động (Volatility)", summary.volatility],
    ["Sụt giảm tối đa (Max Drawdown)", summary.maxDrawdown],
    [],
    ["Lịch sử biến động tài sản"],
    ["Ngày", "Giá trị tài sản (Value)", "Giá vốn đầu tư (Cost)", "Tỷ suất sinh lời ngày (%)"]
  ];

  details.forEach(d => {
    rows.push([
      d.date,
      typeof d.value === "number" ? d.value.toFixed(2) : d.value,
      typeof d.cost === "number" ? d.cost.toFixed(2) : d.cost,
      typeof d.dailyReturn === "number" ? d.dailyReturn.toFixed(2) : d.dailyReturn
    ]);
  });

  const csvContent = "\uFEFF" + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Bao_cao_danh_muc_${summary.portfolioName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(
  summary: ExportSummary,
  details: ExportDetailRow[]
) {
  const wb = XLSX.utils.book_new();
  
  const summaryRows = [
    { Indicator: "Tên danh mục", Value: summary.portfolioName },
    { Indicator: "Thời gian tạo", Value: summary.generatedTime },
    { Indicator: "Tổng giá trị tài sản", Value: summary.totalValue },
    { Indicator: "Tổng vốn đầu tư", Value: summary.totalInvested },
    { Indicator: "Tổng Lãi/Lỗ", Value: summary.totalPnl },
    { Indicator: "Tỷ suất sinh lời tổng", Value: summary.totalReturnPct },
    { Indicator: "Chỉ số Sharpe", Value: summary.sharpeRatio },
    { Indicator: "Chỉ số Sortino", Value: summary.sortinoRatio },
    { Indicator: "Chỉ số VaR (95%)", Value: summary.valueAtRisk },
    { Indicator: "Độ biến động (Volatility)", Value: summary.volatility },
    { Indicator: "Sụt giảm tối đa (Max Drawdown)", Value: summary.maxDrawdown }
  ];

  const rows = [
    ["Báo cáo Phân tích Hiệu suất & Rủi ro Danh mục"],
    [],
    ["TỔNG QUAN CHỈ SỐ"],
    ...summaryRows.map(r => [r.Indicator, r.Value]),
    [],
    ["CHI TIẾT LỊCH SỬ BIẾN ĐỘNG"],
    ["Ngày", "Giá trị tài sản (Value)", "Giá vốn đầu tư (Cost)", "Tỷ suất sinh lời ngày (%)"],
    ...details.map(d => [
      d.date, 
      d.value, 
      d.cost, 
      typeof d.dailyReturn === "number" ? d.dailyReturn : d.dailyReturn
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");

  XLSX.writeFile(wb, `Bao_cao_danh_muc_${summary.portfolioName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
