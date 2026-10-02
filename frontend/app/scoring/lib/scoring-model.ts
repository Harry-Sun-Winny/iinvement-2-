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

export const INDUSTRY_OPTIONS: IndustryOption[] = INDUSTRY_DECISION_PROFILES.map((profile) => ({
  id: profile.id,
  label: profile.label,
  note: `${profile.thesisLens} ${profile.regimeNote}`,
}));

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
  if (score >= 85) return { label: "Mua mạnh ngay", tone: "buy" as const };
  if (score >= 70) return { label: "Mua thêm", tone: "buy" as const };
  if (score >= 50) return { label: "Giữ", tone: "hold" as const };
  if (score >= 30) return { label: "Giảm tỷ trọng", tone: "sell" as const };
  return { label: "Bán ngay", tone: "sell" as const };
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
  evidenceDossier?: string;
  decisionContext?: string;
}) {
  const pillarLines = PILLAR_DEFINITIONS.map((pillar) => {
    const branches = pillar.branches
      .map((branch) => `${branch.label}: ${Math.round(args.branchScores[branch.id] ?? 0)}/100`)
      .join("; ");
    return `- ${pillar.label}: ${args.pillarScores[pillar.id].toFixed(1)}/100. ${branches}.`;
  }).join("\n");

  const evidenceRules = [
    args.decisionContext || "BỐI CẢNH SAU MUA: chưa xác định.",
    "KHUNG 6 NHÁNH: vĩ mô 20%, tài sản cụ thể 25%, tâm lý & hành vi 15%, tài chính cá nhân/mục tiêu 15%, thị trường & kỹ thuật 15%, pháp lý-rủi ro-thông tin 10%. Chỉ ưu tiên yếu tố tác động cao × xác suất cao × có thể dự đoán; không cộng điểm cơ học các yếu tố trùng lặp.",
    "HỒ SƠ CHỨNG CỨ NGƯỜI DÙNG CUNG CẤP:",
    args.evidenceDossier || "Không có tài liệu người dùng cung cấp.",
    "QUY TẮC: tách rõ [Dữ kiện] / [Suy luận] / [Thiếu dữ liệu]; nêu nguồn và kỳ dữ liệu khi có; không bịa số liệu; mọi kết luận phải có điều kiện đảo chiều.",
    "BỔ SUNG ĐẦU RA: Bull/Base/Bear với điều kiện kích hoạt, chỉ báo theo dõi và điều kiện vô hiệu hóa; ma trận 3-5 yếu tố gồm Tác động | Xác suất | Khả năng dự đoán | Dữ kiện nguồn | Hành động theo điều kiện; khoảng trống dữ liệu cần bổ sung.",
  ].join("\\n");

  return [
    "VAI TRÒ: Bạn là người chấm điểm đầu tư độc lập, không phải người bảo vệ một kết luận có sẵn.",
    `ĐỐI TƯỢNG: ${args.symbol || "Mã đang xem"} · ngành ${args.industryLabel}.`,
    "MỤC TIÊU: Chấm chất lượng thông tin và tín hiệu đầu tư trên thang 0–100. Đây không phải khuyến nghị mua/bán cá nhân.",
    "",
    "QUY TẮC BẮT BUỘC:",
    "- Không dùng, không suy ngược và không neo theo điểm tổng hợp hoặc điểm nhánh đã có trong ứng dụng. Hãy tự chấm từ bằng chứng.",
    "- Mỗi điểm phải có dữ kiện cụ thể, nguồn/URL hoặc tên tài liệu, và kỳ dữ liệu/ngày quan sát. Không có bằng chứng thì ghi INSUFFICIENT_DATA, không tự gán 60/100.",
    "- Tách rõ [FACT] dữ kiện, [INFERENCE] suy luận và [GAP] dữ liệu còn thiếu. Không bịa số liệu, nguồn hoặc mức độ chắc chắn.",
    "- Nếu dùng dữ liệu ngoài hồ sơ, nêu nguồn chính thống và ngày truy cập. Nếu không thể kiểm chứng trực tiếp, chỉ liệt kê dữ liệu cần tra cứu.",
    "- Điểm không phải hành động: rủi ro pháp lý/gian lận hoặc dữ liệu không đủ có quyền trả NO-DECISION dù điểm tiềm năng cao.",
    "",
    "THANG ĐIỂM CHUNG: 0–24 = bằng chứng xấu/rủi ro nghiêm trọng; 25–49 = yếu; 50–69 = trung tính hoặc bằng chứng hỗn hợp; 70–84 = tốt, được nhiều dữ kiện xác nhận; 85–100 = rất mạnh, nhất quán và có lợi thế rõ. Không làm tròn để che khoảng trống dữ liệu.",
    "",
    "RUBRIC 4 TRỤ CỘT VÀ TRỌNG SỐ NHÁNH:",
    PILLAR_DEFINITIONS.map((pillar) => `- ${pillar.label} (trọng số ${pillar.overallWeight}%): ${pillar.branches.map((branch) => `${branch.label} ${branch.weight}% [${branch.promptHint}]`).join("; ")}.`).join("\n"),
    "",
    "HỒ SƠ CHỨNG CỨ ĐƯỢC CUNG CẤP:",
    args.evidenceDossier || "Không có tài liệu. Không được tạo điểm tổng hợp; hãy trả NO-DECISION và nêu bộ tài liệu tối thiểu cần có.",
    "",
    "ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:",
    "1. coverage: nguồn đã dùng, kỳ dữ liệu, tỷ lệ nhánh đủ chứng cứ và các GAP quan trọng.",
    "2. Bảng từng nhánh: trụ cột | nhánh | trọng số | điểm hoặc INSUFFICIENT_DATA | FACT + nguồn/kỳ | INFERENCE | lý do chấm.",
    "3. Chỉ khi tất cả nhánh trọng yếu có chứng cứ: tính điểm mỗi trụ cột theo trọng số nhánh, rồi tính quality_score theo trọng số 4 trụ cột. Nếu thiếu, ghi quality_score: NOT_CALCULATED — không thay bằng điểm giả định.",
    "4. confidence 0–100 phải dựa trên độ phủ, độ mới và chất lượng nguồn; không trộn confidence vào quality_score.",
    "5. 3 bull case, 3 bear case, bull/base/bear với điều kiện kích hoạt và điều kiện vô hiệu hóa.",
    "6. decision_status: chỉ chọn ELIGIBLE_FOR_POLICY_REVIEW, WATCH_RESEARCH hoặc NO-DECISION; kèm rủi ro/hard-stop có thể chặn quyết định.",
    "7. Kết thúc bằng next_evidence_to_collect: tối đa 5 tài liệu/chỉ số cần bổ sung, ưu tiên theo mức ảnh hưởng.",
    "",
    "Không nêu Mua/Bán/Bán mạnh. Policy Engine của hệ thống sẽ quyết định hành động sau khi nhận kết quả chấm độc lập này.",
  ].join("\n");

  /* Legacy anchored-score prompt kept only for source-history reference.
  return [
    `Hãy đóng vai AI analyst cấp senior và phân tích cổ phiếu ${args.symbol || "đang xem"} trong ngành ${args.industryLabel}.`,
    `Điểm tổng hợp hiện tại là ${args.totalScore.toFixed(1)}/100, xếp loại ${args.verdictLabel}.`,
    "Phân tích theo đúng 4 trụ cột đầu tư:",
    pillarLines,
    evidenceRules,
    "Yêu cầu đầu ra:",
    "1. Nêu 3 luận điểm bull case và 3 bear case rõ ràng.",
    "2. Chỉ ra trụ cột nào đang mạnh nhất và yếu nhất, vì sao.",
    "3. Kiểm tra riêng phần tâm lý theo hướng contrarian: thị trường đang sợ hãi hay hưng phấn quá mức.",
    "4. Đưa ra hành động đề xuất: Mua mạnh / Mua / Giữ / Bán / Bán mạnh, kèm điều kiện để đổi view.",
    "5. Viết ngắn gọn, thực chiến, tránh nói chung chung.",
  ].join("\n");
  */
}
import { INDUSTRY_DECISION_PROFILES } from "@/lib/industry-decision-profiles";
