export type PillarKey = "fundamental" | "technical" | "quantitative" | "sentiment";

export type IndustryOption = {
  id: string;
  label: string;
  note: string;
};

export type ScoreBranch = {
  id: string;
  label: string;
  weight: number;
  promptHint: string;
  description: string;
  inverse?: boolean;
};

export type PillarDefinition = {
  id: PillarKey;
  label: string;
  question: string;
  overallWeight: number;
  branches: ScoreBranch[];
};

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  { id: "BIG_TECH", label: "Big Tech", note: "Ưu tiên PEG, tăng trưởng và chất lượng lợi nhuận." },
  { id: "BANKING", label: "Ngân hàng & Tài chính", note: "Không dùng D/E như ngành thường; tập trung ROE, P/B, chất lượng tài sản." },
  { id: "SEMICONDUCTOR", label: "Bán dẫn", note: "Biến động chu kỳ lớn, cần chú ý tăng trưởng và momentum." },
  { id: "PHARMA", label: "Dược phẩm / Y tế", note: "Tách bạch Big Pharma và biotech đầu cơ khi chấm điểm." },
  { id: "ENERGY", label: "Năng lượng", note: "Điểm chịu ảnh hưởng rõ bởi chu kỳ hàng hóa và D/E đảo chiều." },
  { id: "RETAIL", label: "Bán lẻ / Tiêu dùng", note: "Theo dõi P/B, same-store sales và biên lợi nhuận." },
];

export const PILLAR_DEFINITIONS: PillarDefinition[] = [
  {
    id: "fundamental",
    label: "Cơ bản",
    question: "Doanh nghiệp này có đáng mua không?",
    overallWeight: 35,
    branches: [
      { id: "valuation", label: "Định giá", weight: 25, promptHint: "P/E, P/B, PEG, EV/EBITDA", description: "So với trung vị ngành, có xét z-score và đảo chiều khi cần." },
      { id: "profitability", label: "Khả năng sinh lời", weight: 25, promptHint: "ROE, ROA, biên lợi nhuận ròng", description: "Percentile trong ngành, top 10% gần mức tối đa." },
      { id: "balance_sheet", label: "Sức khỏe tài chính", weight: 20, promptHint: "D/E, current ratio, interest coverage", description: "Ngưỡng an toàn theo từng ngành, đặc biệt chú ý ngoại lệ ngân hàng." },
      { id: "growth", label: "Tăng trưởng", weight: 20, promptHint: "CAGR doanh thu, EPS growth 3-5 năm", description: "Tăng trưởng bền vững cao được thưởng mạnh." },
      { id: "governance", label: "Quản trị", weight: 10, promptHint: "Insider ownership, buyback, cổ tức", description: "Định tính nhưng phải phản ánh minh bạch và phân bổ vốn." },
    ],
  },
  {
    id: "technical",
    label: "Kỹ thuật",
    question: "Khi nào nên mua/bán?",
    overallWeight: 25,
    branches: [
      { id: "trend", label: "Xu hướng", weight: 30, promptHint: "MA50, MA200, ADX", description: "Trên cả hai MA và ADX khỏe thì điểm rất cao." },
      { id: "momentum", label: "Động lượng", weight: 25, promptHint: "RSI, MACD", description: "Ưu tiên RSI 40-70 và MACD cắt lên; quá mua bị trừ điểm." },
      { id: "volume", label: "Khối lượng", weight: 20, promptHint: "Volume trend, OBV", description: "Giá tăng cùng khối lượng xác nhận xu hướng tốt." },
      { id: "volatility", label: "Biến động", weight: 15, promptHint: "ATR, Bollinger Band", description: "Biến động vừa phải phù hợp xu hướng sẽ đẹp hơn biến động sốc." },
      { id: "structure", label: "Cấu trúc giá", weight: 10, promptHint: "Hỗ trợ / kháng cự", description: "Gần hỗ trợ mạnh hoặc chuẩn bị breakout sẽ hấp dẫn hơn." },
    ],
  },
  {
    id: "quantitative",
    label: "Định lượng",
    question: "Rủi ro/lợi nhuận ra sao?",
    overallWeight: 25,
    branches: [
      { id: "risk_adjusted_return", label: "Lợi nhuận điều chỉnh rủi ro", weight: 35, promptHint: "Sharpe, Sortino", description: "Sharpe > 2 là vùng điểm rất mạnh." },
      { id: "downside_risk", label: "Rủi ro giảm giá", weight: 30, promptHint: "Max Drawdown, VaR 95%", description: "Drawdown nhỏ và ổn định giúp điểm cao." },
      { id: "beta_correlation", label: "Beta & tương quan", weight: 20, promptHint: "Beta, correlation với danh mục", description: "Đa dạng hóa tốt sẽ được cộng điểm." },
      { id: "factor", label: "Factor score", weight: 15, promptHint: "Value, Momentum, Quality, Low-vol", description: "Lấy trung bình có trọng số từ mô hình đa yếu tố." },
    ],
  },
  {
    id: "sentiment",
    label: "Tâm lý",
    question: "Mình có đang đủ tỉnh táo không?",
    overallWeight: 15,
    branches: [
      { id: "market_sentiment", label: "Tâm lý thị trường", weight: 35, promptHint: "Fear & Greed, VIX, Put/Call", description: "Đây là chỉ số contrarian: sợ hãi cực độ có thể là cơ hội.", inverse: true },
      { id: "stock_sentiment", label: "Tâm lý riêng cổ phiếu", weight: 30, promptHint: "News sentiment, social buzz", description: "Hưng phấn quá mức bị hạ điểm dù tin tức đang nóng.", inverse: true },
      { id: "cycle_position", label: "Vị trí trong chu kỳ", weight: 20, promptHint: "Chu kỳ tích lũy → hưng phấn → hoảng loạn", description: "Gần hoảng loạn/tuyệt vọng thì điểm contrarian tăng.", inverse: true },
      { id: "self_discipline", label: "Kỷ luật cá nhân", weight: 15, promptHint: "Checklist FOMO / kế hoạch", description: "Phần này lấy trực tiếp từ checklist hành vi của nhà đầu tư." },
    ],
  },
];

export const PSYCHOLOGY_CHECKS = [
  "Tôi có kế hoạch mua/bán rõ ràng trước khi vào lệnh.",
  "Tôi không vào lệnh chỉ vì sợ bỏ lỡ cơ hội (FOMO).",
  "Tôi biết chính xác ngưỡng cắt lỗ hoặc giảm tỷ trọng.",
  "Tôi hiểu vì sao cổ phiếu này hợp với danh mục hiện tại.",
];

export const ZSCORE_NOTES = [
  "Winsorize z-score trong khoảng [-3, +3] để tránh outlier phá thang điểm.",
  "Mẫu ngành nhỏ nên fallback sang percentile toàn thị trường.",
  "Với chỉ số thấp hơn là tốt hơn như D/E, một số bối cảnh P/E, hãy đảo chiều điểm.",
  "Cập nhật μ và σ theo quý, không dùng ngưỡng tĩnh cho mọi chu kỳ lãi suất.",
];

export function computeWeightedAverage(items: Array<{ score: number; weight: number }>) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  return items.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
}

export function classifyScore(score: number) {
  if (score >= 80) return { label: "Mua mạnh", tone: "buy" as const };
  if (score >= 60) return { label: "Mua", tone: "buy" as const };
  if (score >= 40) return { label: "Giữ / Theo dõi", tone: "hold" as const };
  if (score >= 20) return { label: "Bán", tone: "sell" as const };
  return { label: "Bán mạnh", tone: "sell" as const };
}

export function toFivePointScale(score: number) {
  return Math.max(0, Math.min(5, score / 20));
}

export function buildAutoPrompt(args: {
  symbol: string;
  industryLabel: string;
  totalScore: number;
  verdictLabel: string;
  pillarScores: Record<PillarKey, number>;
  branchScores: Record<string, number>;
}) {
  const pillarLines = PILLAR_DEFINITIONS.map((pillar) => {
    const branches = pillar.branches
      .map((branch) => `${branch.label}: ${Math.round(args.branchScores[branch.id] ?? 0)}/100`)
      .join("; ");
    return `- ${pillar.label}: ${args.pillarScores[pillar.id].toFixed(1)}/100. ${branches}.`;
  }).join("\n");

  return [
    `Hãy đóng vai AI analyst cấp senior và phân tích cổ phiếu ${args.symbol || "đang xem"} trong ngành ${args.industryLabel}.`,
    `Điểm tổng hợp hiện tại là ${args.totalScore.toFixed(1)}/100, xếp loại ${args.verdictLabel}.`,
    "Phân tích theo đúng 4 trụ cột đầu tư:",
    pillarLines,
    "Yêu cầu đầu ra:",
    "1. Nêu 3 luận điểm bull case và 3 bear case rõ ràng.",
    "2. Chỉ ra trụ cột nào đang mạnh nhất và yếu nhất, vì sao.",
    "3. Kiểm tra riêng phần tâm lý theo hướng contrarian: thị trường đang sợ hãi hay hưng phấn quá mức.",
    "4. Đưa ra hành động đề xuất: Mua mạnh / Mua / Giữ / Bán / Bán mạnh, kèm điều kiện để đổi view.",
    "5. Viết ngắn gọn, thực chiến, tránh nói chung chung.",
  ].join("\n");
}
