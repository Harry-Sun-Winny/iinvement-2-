export type PillarKey = "fundamental" | "technical" | "quantitative" | "sentiment";
export type IndustryKey = string; // Now dynamic based on GICS
export type CountryKey = string; // Now dynamic

export const PILLAR_LABEL: Record<PillarKey, string> = {
  fundamental: "Cơ bản",
  technical: "Kỹ thuật",
  quantitative: "Định lượng",
  sentiment: "Tâm lý",
};

// Key metrics labeled per industry for each of the 4 pillars
export const PILLAR_METRICS: Record<IndustryKey, Record<PillarKey, string>> = {
  BANKING: {
    fundamental: "NIM > 3.5%, NPL < 2%, CAR > 12%, CASA > 30%, P/B",
    technical: "Trend xu hướng, Điểm BOS/CHoCH, Volume VSA",
    quantitative: "Chính sách lãi suất vĩ mô, Tăng trưởng tín dụng",
    sentiment: "Chỉ số hoảng loạn VIX, Put/Call ratio, Khối lượng giao dịch ngoại",
  },
  TECH: {
    fundamental: "Tăng trưởng Doanh thu > 20%, Biên LN gộp > 40%, Rule of 40, PEG",
    technical: "Momentum giá mạnh, Breakout đỉnh, VWAP, Bollinger Bands",
    quantitative: "Factor momentum, Định lượng hồi quy, Tương quan lãi suất",
    sentiment: "Kỳ vọng tăng trưởng AI/Cloud, Sentiment đám đông hưng phấn",
  },
  REALESTATE: {
    fundamental: "Quỹ đất sạch, Presales, Backlog lớn, Nợ vay/Vốn CSH < 1x",
    technical: "Vùng hỗ trợ/kháng cự dài hạn, Điểm đảo chiều Wyckoff",
    quantitative: "Lãi suất cho vay mua nhà, Nới room tín dụng BĐS",
    sentiment: "Tâm lý thị trường giao dịch BĐS thực, Insider buying",
  },
  ENERGY: {
    fundamental: "Break-even cost, Reserve replacement, CapEx cycle",
    technical: "Vùng cung cầu (Supply/Demand Zones), Ichimoku Cloud",
    quantitative: "Giá dầu Brent/WTI, Tương quan giá hàng hóa toàn cầu",
    sentiment: "Vị thế Speculative Traders (COT report), Mức mở hợp đồng tương lai OI",
  },
  CONSUMER_STAPLES: {
    fundamental: "Same-Store Sales Growth (SSSG) > 5%, Biên LN gộp ổn định, Cổ tức",
    technical: "Mô hình tích lũy đáy Wyckoff, Bollinger Bands Squeeze",
    quantitative: "Sức mua người tiêu dùng, Tương quan lạm phát CPI",
    sentiment: "Insider buying, Quỹ ngoại mua ròng dòng tiền phòng thủ",
  },
  CONSUMER_DISCRETIONARY: {
    fundamental: "Vòng quay hàng tồn kho, Biên LN gộp xu hướng tăng, Thị phần",
    technical: "Cấu trúc thị trường HH/HL, Điểm quét thanh khoản Liquidity Grab",
    quantitative: "Chỉ số niềm tin tiêu dùng (CCI), Tương quan GDP",
    sentiment: "Tâm lý chi tiêu mua sắm, Margin debt đỉnh/đáy",
  },
  HEALTHCARE: {
    fundamental: "Pipeline rNPV, Patent expiry timeline, R&D Spend / Revenue",
    technical: "Kênh giá tích lũy dài hạn, Khối lượng stopping volume",
    quantitative: "Xác suất phê duyệt FDA Phase I/II/III, Peak sales models",
    sentiment: "Tin tức thử nghiệm lâm sàng, Catalyst-driven sentiment",
  },
  OTHER: {
    fundamental: "Doanh thu & Lợi nhuận ổn định, Biên LN ròng > 8%, P/E",
    technical: "Hỗ trợ và Kháng cự, Đường trung bình động MA50/MA200",
    quantitative: "Chỉ số PMI sản xuất > 50, Tăng trưởng kinh tế",
    sentiment: "Chỉ số sợ hãi & tham lam, Dòng tiền quỹ ETF lớn",
  },
};

// Top 3 priority metrics for each industry
export const PRIORITY_METRICS: Record<IndustryKey, string[]> = {
  BANKING: ["NIM > 3.5% & NPL < 2%", "CAR > 12% & CASA > 30%", "Lãi suất vĩ mô hạ"],
  TECH: ["Tăng trưởng Doanh thu > 20%", "Biên LN gộp > 40%", "Rule of 40 đạt chuẩn"],
  REALESTATE: ["Nợ vay/Vốn CSH < 1x", "Presales tăng trưởng dương", "Hạ lãi suất cho vay"],
  ENERGY: ["Break-even cost cực thấp", "Reserve Replacement Rate > 100%", "WTI/Brent xu hướng tăng"],
  CONSUMER_STAPLES: ["SSSG > 5% cùng cửa hàng", "Biên LN gộp ổn định", "Cổ tức tiền mặt đều đặn"],
  CONSUMER_DISCRETIONARY: ["Chỉ số niềm tin tiêu dùng CCI tăng", "Vòng quay tồn kho nhanh", "Biên LN gộp tăng"],
  HEALTHCARE: ["Xác suất duyệt FDA cao", "Patent Expiry an toàn", "R&D Spend / Revenue > 15%"],
  OTHER: ["Biên lợi nhuận ròng > 8%", "ROIC > WACC (ROIC > 12%)", "PMI sản xuất > 50"],
};

// Trọng số 4 trụ cột cho từng ngành (Tổng = 100%)
// Fallback to a balanced weight if not explicitly defined
const DEFAULT_WEIGHT: Record<PillarKey, number> = { fundamental: 35, technical: 25, quantitative: 20, sentiment: 20 };

export const INDUSTRY_WEIGHTS: Record<string, Record<PillarKey, number>> = {
  "Financials": { fundamental: 50, technical: 20, quantitative: 20, sentiment: 10 },
  "Information Technology": { fundamental: 35, technical: 25, quantitative: 15, sentiment: 25 },
  "Real Estate": { fundamental: 45, technical: 20, quantitative: 25, sentiment: 10 },
  "Energy": { fundamental: 30, technical: 20, quantitative: 35, sentiment: 15 },
  "Consumer Staples": { fundamental: 50, technical: 20, quantitative: 20, sentiment: 10 },
  "Consumer Discretionary": { fundamental: 30, technical: 25, quantitative: 15, sentiment: 30 },
  "Health Care": { fundamental: 45, technical: 10, quantitative: 25, sentiment: 20 },
  "Communication Services": { fundamental: 35, technical: 25, quantitative: 20, sentiment: 20 },
  "Industrials": { fundamental: 40, technical: 20, quantitative: 25, sentiment: 15 },
  "Utilities": { fundamental: 50, technical: 15, quantitative: 20, sentiment: 15 },
  "Materials": { fundamental: 35, technical: 20, quantitative: 30, sentiment: 15 },
  "Other": { fundamental: 40, technical: 25, quantitative: 25, sentiment: 10 },
};

export function getWeightForSector(sector: string): Record<PillarKey, number> {
  return INDUSTRY_WEIGHTS[sector] || DEFAULT_WEIGHT;
}

export const INDUSTRY_LABEL: Record<IndustryKey, string> = {
  BANKING: "Ngân hàng & Tài chính",
  TECH: "Công nghệ & Phần mềm",
  REALESTATE: "Bất động sản (Developers & REITs)",
  ENERGY: "Năng lượng & Hàng hóa cơ bản",
  CONSUMER_STAPLES: "Tiêu dùng thiết yếu (Staples)",
  CONSUMER_DISCRETIONARY: "Tiêu dùng tùy ý (Discretionary)",
  HEALTHCARE: "Y tế & Dược phẩm",
  OTHER: "Khác / Sản xuất",
};

export const COUNTRY_LABEL: Record<CountryKey, string> = {
  VN: "Việt Nam",
  US: "Hoa Kỳ",
  CN: "Trung Quốc",
  JP: "Nhật Bản",
  EU: "Châu Âu",
  OTHER: "Khác",
};

import { normalizeClassification } from "./taxonomy-normalizer";

export function getIndustry(symbol: string, backendSector?: string, backendIndustry?: string): IndustryKey {
  return normalizeClassification(symbol, backendSector, backendIndustry).sector;
}

export function getCountry(symbol: string, backendCountry?: string): CountryKey {
  return normalizeClassification(symbol, undefined, undefined, backendCountry).country;
}

export interface PillarScores {
  fundamental: number;
  technical: number;
  quantitative: number;
  sentiment: number;
}

export function scorePosition(args: {
  returnPct: number;
  totalReturnPct: number;
  weight: number;
  isStalePrice?: boolean;
}): PillarScores {
  const { returnPct, totalReturnPct, weight, isStalePrice } = args;

  // Heuristic logic to score 1-100 based on portfolio performance metrics
  const fundamental = clamp(50 + totalReturnPct * 0.8, 10, 100);
  const technical   = clamp(50 + returnPct * 1.2 - (isStalePrice ? 10 : 0), 10, 100);
  const quantitative = clamp(60 - Math.abs(weight - 10) * 1.5, 10, 100);
  const sentiment    = clamp(50 + returnPct * 0.6, 10, 100);

  return { fundamental, technical, quantitative, sentiment };
}

export function weightedScore(scores: PillarScores, industry: string): number {
  const w = getWeightForSector(industry);
  return (
    scores.fundamental * w.fundamental +
    scores.technical * w.technical +
    scores.quantitative * w.quantitative +
    scores.sentiment * w.sentiment
  ) / 100;
}

// Convert 100-scale score back to 1-5 scale for slider alignment
export function convertTo5Scale(score100: number): number {
  return clamp(1 + (score100 / 100) * 4, 1.0, 5.0);
}

export function recommendation(score: number): { label: string; tone: "buy" | "hold" | "sell" } {
  // Supports either 5-scale or 100-scale
  const actualScore = score > 5 ? score / 20 : score;
  if (actualScore >= 3.5) return { label: "MUA / GIỮ", tone: "buy" };
  if (actualScore >= 2.5) return { label: "TRUNG LẬP", tone: "hold" };
  return { label: "BÁN / NÉ", tone: "sell" };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
