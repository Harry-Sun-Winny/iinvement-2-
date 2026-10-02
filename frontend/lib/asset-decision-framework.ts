import type { PortfolioDeepAnalysis } from "@/app/lib/api";

export type DecisionBranchId = "macro" | "asset" | "behavior" | "personal" | "market" | "legal";
export type DecisionTone = "supportive" | "watch" | "risk" | "manual";
export type DecisionEvidenceStatus = "verified" | "estimated" | "missing";

export interface DecisionFactor {
  id: string;
  title: string;
  threshold: string;
  source: string;
  action: string;
}

export interface DecisionBranch {
  id: DecisionBranchId;
  label: string;
  shortLabel: string;
  weight: number;
  role: string;
  groups: string[];
  factors: DecisionFactor[];
}

export interface EvaluatedFactor extends DecisionFactor {
  score: number | null;
  tone: DecisionTone;
  evidence: string;
  confidence: number;
  status: DecisionEvidenceStatus;
  asOf: string | null;
  isProxy: boolean;
}

export interface EvaluatedBranch extends Omit<DecisionBranch, "factors"> {
  score: number | null;
  displayScore: number;
  tone: DecisionTone;
  connectedCount: number;
  estimatedCount: number;
  missingCount: number;
  confidence: number;
  vetoes: string[];
  factors: EvaluatedFactor[];
}

export interface DecisionRiskGate {
  id: string;
  severity: "hard-stop" | "warning";
  title: string;
  detail: string;
}

export interface AssetDecisionModel {
  score: number | null;
  displayScore: number;
  label: string;
  tone: DecisionTone;
  summary: string;
  confidence: number;
  branches: EvaluatedBranch[];
  topDrivers: EvaluatedFactor[];
  watchList: EvaluatedFactor[];
  nextActions: string[];
  riskGates: DecisionRiskGate[];
  coverage: {
    connectedFactorCount: number;
    verifiedFactorCount: number;
    estimatedFactorCount: number;
    totalFactorCount: number;
    ratio: number;
  };
  sections: Array<{
    id: "portfolio-health" | "decision-readiness" | "risk-posture";
    label: string;
    score: number | null;
    summary: string;
    tone: DecisionTone;
  }>;
}

export const ASSET_DECISION_BRANCHES: DecisionBranch[] = [
  {
    id: "macro",
    label: "Yếu tố kinh tế vĩ mô",
    shortLabel: "Vĩ mô",
    weight: 20,
    role: "Đọc thời tiết dòng vốn: lãi suất, lạm phát, tỷ giá và chu kỳ kinh tế.",
    groups: ["Lãi suất & chính sách tiền tệ", "Lạm phát & giá cả", "Tỷ giá & dòng vốn", "Tăng trưởng & chu kỳ"],
    factors: [
      {
        id: "macro-policy-rate",
        title: "Lãi suất điều hành của NHNN / Fed",
        threshold: "So sánh lãi suất thực với trung bình 5 năm và điểm đảo chiều chu kỳ.",
        source: "SBV, Fed FOMC, Investing.com, TradingEconomics",
        action: "Tăng tỷ trọng tài sản rủi ro khi chu kỳ chuyển từ thắt chặt sang nới lỏng.",
      },
      {
        id: "macro-inflation",
        title: "Tỷ lệ lạm phát hiện tại & kỳ vọng (CPI)",
        threshold: "CPI trên 4-5%/năm hoặc lãi suất thực âm là vùng cần phòng thủ sức mua.",
        source: "GSO, BLS CPI, TIPS breakeven inflation",
        action: "Nếu lạm phát vượt lãi suất tiết kiệm, ưu tiên tài sản giữ giá hơn tiền mặt nhàn rỗi.",
      },
      {
        id: "macro-fx",
        title: "Tỷ giá USD/VND",
        threshold: "VND mất giá trên 3%/năm là áp lực đáng kể với tài sản định giá theo ngoại tệ.",
        source: "SBV, Vietcombank, Reuters/Bloomberg, DXY",
        action: "Đọc đồng thời sức mạnh USD và áp lực mất giá VND trước khi mua vàng hoặc tài sản ngoại tệ.",
      },
      {
        id: "macro-gdp-cycle",
        title: "Tăng trưởng GDP & vị trí trong chu kỳ kinh tế",
        threshold: "Investment Clock: phục hồi, tăng trưởng nóng, đình lạm hoặc suy thoái.",
        source: "GSO, World Bank, IMF WEO, PMI, Conference Board LEI",
        action: "Ưu tiên nhóm tài sản phù hợp với pha chu kỳ thay vì mua cùng một cách ở mọi giai đoạn.",
      },
      {
        id: "macro-fiscal-debt",
        title: "Nợ công & chính sách tài khóa",
        threshold: "Nợ công/GDP trên 60% ở thị trường mới nổi là vùng IMF thường cảnh báo.",
        source: "Bộ Tài chính, IMF Fiscal Monitor, US Treasury",
        action: "Theo dõi thâm hụt và phát hành trái phiếu vì lợi suất dài hạn tăng có thể ép định giá cổ phiếu.",
      },
      {
        id: "macro-reserves",
        title: "Dự trữ ngoại hối quốc gia",
        threshold: "Dự trữ nên đủ tối thiểu 3 tháng nhập khẩu theo chuẩn tham khảo của IMF.",
        source: "SBV, World Bank International Reserves",
        action: "Dự trữ giảm 3 quý liên tiếp là tín hiệu cần giảm rủi ro tỷ giá.",
      },
      {
        id: "macro-pmi",
        title: "Chỉ số PMI sản xuất",
        threshold: "PMI trên 50 là mở rộng, dưới 50 là thu hẹp; ưu tiên xu hướng 3 tháng.",
        source: "S&P Global/Markit PMI, ISM Manufacturing PMI",
        action: "PMI dưới 50 trong 2 tháng liên tiếp làm yếu luận điểm mua cổ phiếu chu kỳ.",
      },
      {
        id: "macro-yield-curve",
        title: "Đường cong lãi suất (yield curve)",
        threshold: "Đảo ngược 2Y-10Y là cảnh báo suy thoái với độ trễ, không phải tín hiệu tuyệt đối.",
        source: "US Treasury, HNX bond yields",
        action: "Khi đường cong dốc lại sau đảo ngược, chuẩn bị kịch bản suy thoái thật sự bắt đầu.",
      },
    ],
  },
  {
    id: "asset",
    label: "Yếu tố liên quan đến tài sản cụ thể",
    shortLabel: "Tài sản",
    weight: 25,
    role: "Đánh giá chất lượng nội tại, định giá, thanh khoản và đặc thù từng loại tài sản.",
    groups: ["Định giá", "Thanh khoản", "Dòng tiền", "Nguồn cung", "Tài sản thay thế"],
    factors: [
      {
        id: "asset-gold-spread",
        title: "Giá vàng thế giới & chênh lệch giá trong nước-quốc tế",
        threshold: "Chênh lệch vượt 15-18% so với giá thế giới quy đổi là vùng bất thường.",
        source: "Kitco, SJC, giavang.net",
        action: "Không mua đuổi khi chênh lệch giãn rộng vì rủi ro chính sách có thể kéo giá về gần thế giới.",
      },
      {
        id: "asset-real-estate-legal",
        title: "Vị trí, quy hoạch hạ tầng & pháp lý sổ đỏ (BĐS)",
        threshold: "Có sổ riêng, không tranh chấp, không quy hoạch treo, kiểm tra quy hoạch 1/500.",
        source: "Cổng thông tin quy hoạch, Văn phòng đăng ký đất đai",
        action: "Tài sản chưa sạch pháp lý chỉ đáng mua khi chiết khấu đủ lớn để bù rủi ro.",
      },
      {
        id: "asset-earnings-valuation",
        title: "Kết quả kinh doanh & định giá P/E, P/B (cổ phiếu)",
        threshold: "So P/E hiện tại với trung bình 5 năm và trung bình ngành.",
        source: "Báo cáo tài chính, CafeF, Vietstock, Fiingroup",
        action: "Ưu tiên doanh nghiệp ROE ổn định, nợ hợp lý và dòng tiền kinh doanh dương.",
      },
      {
        id: "asset-crypto-regulation",
        title: "Quy định pháp lý về tiền điện tử theo quốc gia",
        threshold: "Theo dõi thay đổi lớn từ SEC, MiCA và định hướng quản lý tài sản số tại Việt Nam.",
        source: "SEC, MiCA, NHNN, Bộ Tài chính, CoinDesk Policy",
        action: "Với crypto, chỉ dùng phần vốn có thể chịu mất toàn bộ và không vay để mua.",
      },
      {
        id: "asset-rental-yield",
        title: "Khả năng cho thuê sinh lời (BĐS)",
        threshold: "Rental yield thấp hơn lãi vay nghĩa là dòng tiền âm nếu dùng đòn bẩy.",
        source: "Batdongsan.com.vn, Chotot Nhà đất",
        action: "Chỉ chấp nhận yield thấp nếu luận điểm tăng giá vốn đủ rõ và chịu được dòng tiền âm.",
      },
      {
        id: "asset-resale-liquidity",
        title: "Thanh khoản khi bán lại (đa tài sản)",
        threshold: "Đọc thời gian bán trung bình, khối lượng 20 phiên hoặc volume 24h.",
        source: "HOSE/HNX, CoinMarketCap, dữ liệu giao dịch khu vực",
        action: "Giữ một phần tài sản thanh khoản cao để tránh phải bán tài sản kém thanh khoản ở đáy.",
      },
      {
        id: "asset-bitcoin-halving",
        title: "Sự kiện halving & thay đổi nguồn cung (Bitcoin)",
        threshold: "Hiệu ứng sau halving có xu hướng giảm biên qua từng chu kỳ.",
        source: "bitcoinhalving.com, Glassnode",
        action: "Không xem halving là công thức chắc chắn; đối chiếu với thanh khoản vĩ mô toàn cầu.",
      },
      {
        id: "asset-bond-spread",
        title: "Lãi suất trái phiếu so với gửi tiết kiệm (tài sản thay thế)",
        threshold: "Credit spread phải đủ bù rủi ro so với trái phiếu chính phủ cùng kỳ hạn.",
        source: "HNX Bond Market, Fiingroup Bond Data, VBMA",
        action: "Tránh trái phiếu lãi cao bất thường nếu thiếu xếp hạng tín nhiệm hoặc tài sản đảm bảo rõ ràng.",
      },
    ],
  },
  {
    id: "behavior",
    label: "Yếu tố tâm lý & hành vi đầu tư",
    shortLabel: "Tâm lý",
    weight: 15,
    role: "Bắt lỗi ra quyết định: FOMO, tự tin thái quá, neo giá và giữ lỗ quá lâu.",
    groups: ["Tâm lý đám đông", "Thiên kiến cá nhân", "Kỷ luật giao dịch"],
    factors: [
      {
        id: "behavior-fear-greed",
        title: "Chỉ số Sợ hãi & Tham lam (Fear & Greed Index)",
        threshold: "0-25 là sợ hãi cực độ, 75-100 là tham lam cực độ.",
        source: "CNN Fear & Greed, Alternative.me Crypto Fear & Greed",
        action: "Dùng như bộ lọc ngược xu hướng, không dùng một mình để mua bán.",
      },
      {
        id: "behavior-fomo",
        title: "Hiệu ứng FOMO (Fear of Missing Out)",
        threshold: "Tìm kiếm và bàn luận đại chúng tăng đột biến sau khi giá đã chạy xa.",
        source: "Google Trends, mạng xã hội, LunarCrush",
        action: "Khi thấy phải mua ngay kẻo lỡ, dừng lại và kiểm tra luận điểm gốc.",
      },
      {
        id: "behavior-overconfidence",
        title: "Thiên kiến tự tin thái quá (Overconfidence bias)",
        threshold: "Tăng size sau chuỗi thắng, bỏ stop-loss hoặc tập trung vốn quá mức.",
        source: "Nhật ký giao dịch cá nhân",
        action: "Giữ quy tắc quản trị vốn cố định bất kể mức tự tin hiện tại.",
      },
      {
        id: "behavior-loss-aversion",
        title: "Ác cảm mất mát khiến giữ tài sản lỗ quá lâu",
        threshold: "Luôn có ngưỡng cắt lỗ hoặc điều kiện phá vỡ luận điểm trước khi mua.",
        source: "Prospect Theory, nhật ký giao dịch",
        action: "Viết điều kiện thoát vị thế trước khi mua để giảm cảm xúc khi lỗ.",
      },
      {
        id: "behavior-confirmation",
        title: "Thiên kiến xác nhận (Confirmation bias)",
        threshold: "Chỉ đọc nguồn cùng phe với vị thế hiện có là tín hiệu nguy hiểm.",
        source: "Steel-manning, nguồn phân tích phản biện",
        action: "Tìm luận điểm mạnh nhất chống lại quyết định mua trước khi giải ngân lớn.",
      },
      {
        id: "behavior-anchoring",
        title: "Hiệu ứng neo giá vào giá mua ban đầu (Anchoring)",
        threshold: "Quyết định bán/mua thêm không được dựa vào giá vốn cũ.",
        source: "Nhật ký giao dịch, định giá lại định kỳ",
        action: "Đánh giá như một quyết định mua mới tại giá hiện tại.",
      },
      {
        id: "behavior-herding",
        title: "Hiệu ứng bầy đàn (Herding behavior)",
        threshold: "Tài khoản mới, volume và truyền thông tăng nóng không đi kèm cải thiện cơ bản.",
        source: "VSD, dữ liệu mở tài khoản, volume thị trường",
        action: "Khi người ngoài thị trường đều bàn chuyện mua, giảm mua đuổi và nâng kỷ luật.",
      },
      {
        id: "behavior-inflation-hedge-motive",
        title: "Mong muốn bảo toàn giá trị tài sản trước lạm phát",
        threshold: "Động lực phòng thủ phải khớp với tài sản ít đầu cơ hơn.",
        source: "Bảng câu hỏi khẩu vị rủi ro",
        action: "Nếu mục tiêu là bảo toàn sức mua, tránh dùng tài sản biến động cao như công cụ chính.",
      },
    ],
  },
  {
    id: "personal",
    label: "Yếu tố tài chính cá nhân & mục tiêu",
    shortLabel: "Cá nhân",
    weight: 15,
    role: "Kiểm tra người mua có đủ sức chịu rủi ro, dòng tiền và khung thời gian hay chưa.",
    groups: ["Dự phòng", "Nợ", "Khẩu vị rủi ro", "Mục tiêu", "Vốn nhàn rỗi"],
    factors: [
      {
        id: "personal-emergency-fund",
        title: "Quỹ dự phòng khẩn cấp đã có",
        threshold: "3-6 tháng chi phí sinh hoạt, giữ ở dạng thanh khoản cao.",
        source: "Bảng chi tiêu cá nhân",
        action: "Chưa đủ quỹ khẩn cấp thì ưu tiên xây quỹ trước khi mua tài sản biến động cao.",
      },
      {
        id: "personal-debt-load",
        title: "Mức độ nợ hiện tại (vay tiêu dùng, thế chấp)",
        threshold: "Tỷ lệ nợ/thu nhập nên dưới 40%; nợ lãi cao thường nên trả trước.",
        source: "Sao kê ngân hàng, hợp đồng vay",
        action: "Không vay để đầu tư khi chưa có dòng tiền ổn định và kỷ luật rủi ro.",
      },
      {
        id: "personal-risk-tolerance",
        title: "Khả năng chịu đựng thua lỗ tạm thời (Risk tolerance)",
        threshold: "Mức lỗ tối đa không khiến phải bán tháo hoặc mất ngủ.",
        source: "Risk profiling questionnaire, nhật ký phản ứng khi thị trường giảm",
        action: "Tỷ trọng tài sản rủi ro cao phải giảm khi sắp cần dùng tiền.",
      },
      {
        id: "personal-goal-horizon",
        title: "Mục tiêu tài chính cụ thể theo khung thời gian",
        threshold: "Dưới 3 năm ưu tiên ổn định; trên 7 năm mới chịu được tài sản tăng trưởng cao.",
        source: "Kế hoạch tài chính cá nhân theo bucket",
        action: "Không dùng tiền mục tiêu ngắn hạn để mua tài sản biến động cao.",
      },
      {
        id: "personal-knowledge",
        title: "Kiến thức & kinh nghiệm đầu tư thực tế",
        threshold: "Hiểu báo cáo tài chính, thanh lý margin và từng trải qua chu kỳ giảm.",
        source: "Checklist kiến thức, chứng chỉ, nhật ký giao dịch",
        action: "Nhà đầu tư mới nên bắt đầu nhỏ và ưu tiên tài sản dễ hiểu.",
      },
      {
        id: "personal-family-duty",
        title: "Trách nhiệm tài chính khi là trụ cột gia đình",
        threshold: "Có người phụ thuộc thì cần bảo hiểm và dự phòng trước khi mạo hiểm.",
        source: "Hợp đồng bảo hiểm, số người phụ thuộc",
        action: "Ưu tiên bảo vệ, quỹ khẩn cấp, trả nợ lãi cao, rồi mới đến đầu tư.",
      },
      {
        id: "personal-idle-capital",
        title: "Quy mô vốn nhàn rỗi thực sự có thể đầu tư",
        threshold: "Vốn đầu tư bằng tài sản lưu động trừ quỹ khẩn cấp và nợ ngắn hạn.",
        source: "Personal balance sheet",
        action: "Chỉ đầu tư phần vốn có thể để yên vài năm mà không ảnh hưởng cuộc sống.",
      },
      {
        id: "personal-diversification",
        title: "Nhu cầu đa dạng hóa danh mục để giảm rủi ro",
        threshold: "Tỷ trọng mục tiêu phải được tái cân bằng định kỳ.",
        source: "Modern Portfolio Theory, phân bổ tài sản cá nhân",
        action: "Tái cân bằng về tỷ trọng mục tiêu để mua thấp bán cao có kỷ luật.",
      },
    ],
  },
  {
    id: "market",
    label: "Yếu tố thị trường & kỹ thuật",
    shortLabel: "Kỹ thuật",
    weight: 15,
    role: "Chọn thời điểm thực thi: xu hướng, thanh khoản, cung cầu và rủi ro đòn bẩy.",
    groups: ["Cung cầu", "Phân tích kỹ thuật", "Thanh khoản", "Chu kỳ giá"],
    factors: [
      {
        id: "market-trend-support",
        title: "Xu hướng giá & các mức hỗ trợ/kháng cự",
        threshold: "Vùng mạnh khi giá kiểm định nhiều lần và có khối lượng xác nhận.",
        source: "TradingView, HOSE/HNX, Binance, giavang.net",
        action: "Chờ test hỗ trợ với xác nhận thay vì mua đuổi xa vùng tích lũy.",
      },
      {
        id: "market-rsi",
        title: "Chỉ báo RSI (Relative Strength Index)",
        threshold: "RSI trên 70 là quá mua, dưới 30 là quá bán; ưu tiên phân kỳ hơn mức đơn lẻ.",
        source: "TradingView, nền tảng phân tích kỹ thuật",
        action: "Giá tạo đỉnh cao hơn nhưng RSI thấp hơn là cảnh báo suy yếu xu hướng tăng.",
      },
      {
        id: "market-volume",
        title: "Khối lượng giao dịch xác nhận xu hướng",
        threshold: "Breakout đáng tin hơn khi volume tăng mạnh cùng hướng giá.",
        source: "Bảng giá HOSE/HNX, Binance, CoinMarketCap",
        action: "Tránh breakout thiếu volume vì dễ là bẫy giá.",
      },
      {
        id: "market-spread-depth",
        title: "Độ sâu thị trường & chênh lệch giá mua-bán (bid-ask spread)",
        threshold: "Spread hẹp là thanh khoản tốt; spread rộng làm tăng chi phí ẩn.",
        source: "Order book, độ sâu bảng giá, Binance",
        action: "Với tài sản mỏng, chia lệnh thành nhiều phần để giảm trượt giá.",
      },
      {
        id: "market-wyckoff",
        title: "Nhận diện giai đoạn trong chu kỳ giá (Wyckoff cycle)",
        threshold: "Tích lũy: đi ngang hẹp, volume thấp, tâm lý bi quan.",
        source: "Phương pháp Wyckoff, biểu đồ dài hạn",
        action: "Tín hiệu mua mạnh hơn khi tích lũy trùng với vùng sợ hãi cực độ.",
      },
      {
        id: "market-supply-demand",
        title: "Tổng cung/cầu tài sản trên thị trường",
        threshold: "Theo dõi tỷ lệ hấp thụ với BĐS hoặc cung lưu thông với tài sản giới hạn.",
        source: "CBRE, Savills, Glassnode",
        action: "Ưu tiên tài sản có nhu cầu hấp thụ bền và nguồn cung mới hạn chế.",
      },
      {
        id: "market-margin-liquidation",
        title: "Rủi ro thanh lý margin/đòn bẩy trên thị trường",
        threshold: "Margin toàn thị trường, funding rate hoặc open interest ở vùng cao lịch sử.",
        source: "UBCKNN, Coinglass",
        action: "Giảm đòn bẩy cá nhân khi đòn bẩy hệ thống ở vùng cao.",
      },
    ],
  },
  {
    id: "legal",
    label: "Yếu tố pháp lý, rủi ro & thông tin",
    shortLabel: "Pháp lý",
    weight: 10,
    role: "Lớp phòng vệ cuối: quyền sở hữu, thuế, tin giả, địa chính trị và rủi ro hệ thống.",
    groups: ["Pháp lý", "Thuế", "Rủi ro hệ thống", "Thông tin", "Địa chính trị"],
    factors: [
      {
        id: "legal-ownership-transfer",
        title: "Quy định pháp luật về sở hữu và chuyển nhượng tài sản",
        threshold: "Không giao dịch khi quyền sở hữu hoặc chuyển nhượng chưa rõ.",
        source: "vanban.chinhphu.vn, luật sư chuyên trách",
        action: "Kiểm tra khung luật hiện hành trước giao dịch giá trị lớn.",
      },
      {
        id: "legal-tax",
        title: "Chính sách thuế tài sản & thuế chuyển nhượng",
        threshold: "So sánh lợi nhuận sau thuế, không dùng lợi nhuận gộp.",
        source: "Tổng cục Thuế, văn bản hướng dẫn thuế",
        action: "Tính trước thuế và phí khi so sánh các kênh đầu tư.",
      },
      {
        id: "legal-systemic-crisis",
        title: "Rủi ro khủng hoảng tài chính toàn cầu / hệ thống",
        threshold: "VIX và credit spread tăng mạnh là tín hiệu căng thẳng hệ thống.",
        source: "CBOE VIX, TED spread, IMF, BIS",
        action: "Khi căng thẳng tăng vọt, ưu tiên tiền mặt và thanh khoản hơn bắt đáy sớm.",
      },
      {
        id: "legal-news-quality",
        title: "Độ chính xác của tin tức & rủi ro tin giả/tin đồn",
        threshold: "Cần ít nhất vài nguồn độc lập uy tín trước khi hành động theo tin lớn.",
        source: "Nguồn tin chính thống, đối chiếu nhiều kênh",
        action: "Không giao dịch bốc đồng ngay sau tin sốc chưa xác minh.",
      },
      {
        id: "legal-geopolitical",
        title: "Rủi ro địa chính trị",
        threshold: "Chỉ đáng tăng trọng số nếu xung đột kéo dài hoặc ảnh hưởng chuỗi cung ứng.",
        source: "Geopolitical Risk Index, Reuters, AP",
        action: "Phân biệt cú sốc trú ẩn ngắn hạn với thay đổi cơ bản dài hạn.",
      },
      {
        id: "legal-retail-protection",
        title: "Bảo vệ pháp lý cho nhà đầu tư nhỏ lẻ",
        threshold: "Chứng khoán niêm yết được bảo vệ tốt hơn trái phiếu riêng lẻ và crypto.",
        source: "UBCKNN, Luật Bảo vệ quyền lợi người tiêu dùng",
        action: "Tài sản có bảo vệ thấp chỉ nên chiếm tỷ trọng nhỏ và dùng tổ chức uy tín.",
      },
    ],
  },
];

export function buildAssetDecisionModel(analysis: PortfolioDeepAnalysis): AssetDecisionModel {
  const branches = ASSET_DECISION_BRANCHES.map((branch) => {
    const factors = branch.factors.map((factor) => evaluateFactor(factor, analysis));
    const score = weightedAverage(
      factors
        .map((factor) => factor.score)
        .filter((value): value is number => value != null),
    );
    const connectedCount = factors.filter((factor) => factor.status !== "missing").length;
    const estimatedCount = factors.filter((factor) => factor.status === "estimated").length;
    const missingCount = factors.filter((factor) => factor.status === "missing").length;
    const confidence = averageConfidence(factors);
    const vetoes = factors
      .filter((factor) => factor.score != null && factor.score <= 35)
      .map((factor) => factor.title)
      .slice(0, 2);

    return {
      ...branch,
      score,
      displayScore: score ?? 50,
      tone: score == null ? "manual" : toneFromScore(score),
      connectedCount,
      estimatedCount,
      missingCount,
      confidence,
      vetoes,
      factors,
    };
  });

  const scoredBranches = branches.filter((branch) => branch.score != null);
  const connectedWeight = scoredBranches.reduce((sum, branch) => sum + branch.weight, 0);
  const score =
    connectedWeight > 0
      ? clamp(
          scoredBranches.reduce((sum, branch) => sum + (branch.score ?? 0) * branch.weight, 0) /
            connectedWeight,
          0,
          100,
        )
      : null;
  const displayScore = score ?? 50;
  const allFactors = branches.flatMap((branch) => branch.factors);
  const connectedFactorCount = allFactors.filter((factor) => factor.status !== "missing").length;
  const verifiedFactorCount = allFactors.filter((factor) => factor.status === "verified").length;
  const estimatedFactorCount = allFactors.filter((factor) => factor.status === "estimated").length;
  const totalFactorCount = allFactors.length;
  const coverageRatio = totalFactorCount > 0 ? connectedFactorCount / totalFactorCount : 0;
  const confidence = averageConfidence(allFactors);
  const riskGates = buildRiskGates(analysis, coverageRatio);
  const watchList = allFactors
    .filter((factor) => factor.score != null && (factor.tone === "risk" || factor.tone === "watch"))
    .sort((a, b) => (a.score ?? 50) - (b.score ?? 50))
    .slice(0, 5);
  const topDrivers = allFactors
    .filter((factor) => factor.score != null)
    .sort((a, b) => Math.abs((b.score ?? 50) - 50) - Math.abs((a.score ?? 50) - 50))
    .slice(0, 4);

  return {
    score,
    displayScore,
    ...decisionLabel(score, coverageRatio, confidence, riskGates),
    confidence,
    branches,
    topDrivers,
    watchList,
    nextActions: buildNextActions(score, watchList, riskGates, coverageRatio),
    riskGates,
    coverage: {
      connectedFactorCount,
      verifiedFactorCount,
      estimatedFactorCount,
      totalFactorCount,
      ratio: coverageRatio,
    },
    sections: buildDecisionSections(analysis, coverageRatio, confidence, riskGates),
  };
}

function evaluateFactor(factor: DecisionFactor, analysis: PortfolioDeepAnalysis): EvaluatedFactor {
  const latestValue = finiteNumber(analysis.overview?.latestValue);
  const cashBalance = finiteNumber(analysis.overview?.cashBalance);
  const totalReturnPct = finiteNumber(analysis.overview?.totalReturnPct);
  const netGain = finiteNumber(analysis.overview?.netGain);
  const sharpe = finiteNumber(analysis.riskMetrics?.sharpeRatio);
  const sortino = finiteNumber(analysis.riskMetrics?.sortinoRatio);
  const maxDrawdown = finiteNumber(analysis.riskMetrics?.maxDrawdown);
  const valueAtRisk = finiteNumber(analysis.riskMetrics?.valueAtRisk);
  const snapshotCount = finiteNumber(analysis.overview?.snapshotCount) ?? 0;
  const cashRatio = latestValue && latestValue > 0 && cashBalance != null ? cashBalance / latestValue : null;

  switch (factor.id) {
    case "asset-earnings-valuation":
      return withScore(
        factor,
        clamp(52 + (totalReturnPct ?? 0) * 0.7 + (sharpe ?? 0) * 6, 25, 86),
        `Dữ liệu danh mục: tổng lợi nhuận ${formatPercent(totalReturnPct)} và Sharpe ${formatRatio(sharpe)}.`,
      );
    case "asset-resale-liquidity":
      return withScore(
        factor,
        snapshotCount >= 30 ? 62 : 48,
        snapshotCount >= 30
          ? `Có ${snapshotCount} snapshot để đọc thanh khoản/rủi ro tốt hơn mức tối thiểu.`
          : `Chỉ có ${snapshotCount} snapshot, cần thêm dữ liệu trước khi kết luận mạnh.`,
      );
    case "behavior-fomo":
      return withScore(
        factor,
        totalReturnPct != null && totalReturnPct > 18 ? 44 : 57,
        totalReturnPct != null && totalReturnPct > 18
          ? `Danh mục đã tăng ${formatPercent(totalReturnPct)}, cần tránh mua đuổi theo cảm giác lỡ sóng.`
          : "Chưa thấy tín hiệu mua đuổi từ lợi nhuận danh mục hiện tại.",
      );
    case "behavior-overconfidence":
      return withScore(
        factor,
        sharpe != null && sharpe > 1.5 ? 48 : 56,
        sharpe != null && sharpe > 1.5
          ? `Sharpe ${formatRatio(sharpe)} khá tốt, nên giữ kỷ luật size thay vì tăng rủi ro vì chuỗi thắng.`
          : "Chưa có dấu hiệu tự tin thái quá từ Sharpe hiện tại.",
      );
    case "behavior-loss-aversion":
      return withScore(
        factor,
        netGain != null && netGain < 0 ? 40 : 60,
        netGain != null && netGain < 0
          ? `Danh mục đang lỗ ròng ${formatMoney(netGain)}, cần kiểm tra điều kiện cắt lỗ thay vì neo giá vốn.`
          : "Danh mục không ở trạng thái lỗ ròng, áp lực giữ lỗ thấp hơn.",
      );
    case "behavior-anchoring":
      return withScore(
        factor,
        totalReturnPct != null && totalReturnPct < -8 ? 43 : 55,
        totalReturnPct != null && totalReturnPct < -8
          ? `Tổng lợi nhuận ${formatPercent(totalReturnPct)} có thể kích hoạt neo giá mua ban đầu.`
          : "Chưa có tín hiệu mạnh về neo giá từ hiệu suất tổng thể.",
      );
    case "personal-emergency-fund":
      return withScore(
        factor,
        cashRatio == null ? 50 : cashRatio >= 0.1 ? 72 : cashRatio >= 0.03 ? 56 : 38,
        cashRatio == null
          ? "Chưa có dữ liệu tiền mặt trong danh mục để suy luận lớp dự phòng."
          : `Tiền mặt trong danh mục khoảng ${formatPercent(cashRatio * 100)} giá trị hiện tại; đây chỉ là proxy, chưa thay cho quỹ khẩn cấp cá nhân.`,
      );
    case "personal-risk-tolerance":
      return withScore(
        factor,
        maxDrawdown == null ? 50 : maxDrawdown <= 0.1 ? 70 : maxDrawdown <= 0.25 ? 54 : 34,
        maxDrawdown == null
          ? "Chưa có max drawdown để đối chiếu khẩu vị rủi ro."
          : `Max drawdown ${formatPercent(maxDrawdown * 100)} là mức biến động cần người mua chịu được trước khi tăng vị thế.`,
      );
    case "personal-idle-capital":
      return withScore(
        factor,
        cashRatio == null ? 50 : cashRatio >= 0.08 ? 68 : cashRatio >= 0.02 ? 54 : 42,
        cashRatio == null
          ? "Cần nhập vốn nhàn rỗi và nghĩa vụ ngắn hạn để kết luận."
          : `Tỷ lệ tiền mặt danh mục ${formatPercent(cashRatio * 100)} cho biết còn/thiếu dư địa giải ngân từng phần.`,
      );
    case "personal-diversification":
      return withScore(
        factor,
        maxDrawdown == null ? 50 : maxDrawdown <= 0.12 ? 66 : maxDrawdown <= 0.25 ? 52 : 36,
        maxDrawdown == null
          ? "Cần dữ liệu phân bổ vị thế để đọc đa dạng hóa sâu hơn."
          : `Drawdown ${formatPercent(maxDrawdown * 100)} là tín hiệu kiểm tra lại mức tập trung rủi ro.`,
      );
    case "market-trend-support":
      return withScore(
        factor,
        totalReturnPct == null ? 50 : totalReturnPct > 8 ? 65 : totalReturnPct < -8 ? 40 : 55,
        totalReturnPct == null
          ? "Chưa có dữ liệu xu hướng giá đủ rõ."
          : `Tổng lợi nhuận ${formatPercent(totalReturnPct)} đang được dùng như proxy xu hướng danh mục.`,
      );
    case "market-margin-liquidation":
      return withScore(
        factor,
        valueAtRisk == null ? 50 : valueAtRisk <= 0.02 ? 68 : valueAtRisk <= 0.05 ? 52 : 34,
        valueAtRisk == null
          ? "Chưa có VaR để suy luận rủi ro cú rơi."
          : `VaR 95% hiện khoảng ${formatPercent(valueAtRisk * 100)}, dùng để cảnh báo cú giảm bất lợi trong ngày.`,
      );
    case "legal-systemic-crisis":
      return withScore(
        factor,
        valueAtRisk == null || maxDrawdown == null
          ? 50
          : valueAtRisk > 0.05 || maxDrawdown > 0.3
            ? 36
            : valueAtRisk > 0.025 || maxDrawdown > 0.18
              ? 52
              : 66,
        valueAtRisk == null || maxDrawdown == null
          ? "Cần nối thêm VIX/credit spread để đọc rủi ro hệ thống đúng nghĩa."
          : `Proxy nội bộ: VaR ${formatPercent(valueAtRisk * 100)} và max drawdown ${formatPercent(maxDrawdown * 100)}.`,
      );
    case "market-volume":
      return withScore(
        factor,
        sortino != null && sortino > 1 ? 62 : 50,
        sortino != null
          ? `Sortino ${formatRatio(sortino)} cho biết phần rủi ro giảm giá đang ${sortino > 1 ? "khá ổn" : "cần theo dõi"}.`
          : "Cần dữ liệu volume để xác nhận breakout thật.",
      );
    default:
      return {
        ...factor,
        score: null,
        tone: "manual",
        confidence: 0,
        status: "missing",
        asOf: null,
        isProxy: false,
        evidence: "Chưa nối nguồn dữ liệu tự động. Dùng mục này như checklist cần xác minh trước khi ra quyết định.",
      };
  }
}

function withScore(
  factor: DecisionFactor,
  score: number,
  evidence: string,
  meta?: Partial<Pick<EvaluatedFactor, "confidence" | "status" | "asOf" | "isProxy">>,
): EvaluatedFactor {
  const normalizedScore = clamp(score, 0, 100);

  return {
    ...factor,
    score: normalizedScore,
    tone: toneFromScore(normalizedScore),
    evidence,
    confidence: meta?.confidence ?? 0.55,
    status: meta?.status ?? "estimated",
    asOf: meta?.asOf ?? null,
    isProxy: meta?.isProxy ?? true,
  };
}

function decisionLabel(
  score: number | null,
  coverageRatio: number,
  confidence: number,
  riskGates: DecisionRiskGate[],
): Pick<AssetDecisionModel, "label" | "tone" | "summary"> {
  const hasHardStop = riskGates.some((gate) => gate.severity === "hard-stop");

  if (hasHardStop) {
    return {
      label: "Chưa đủ điều kiện giải ngân",
      tone: "risk",
      summary: "Có cổng rủi ro đang chặn quyết định. Xử lý lớp rủi ro nền trước khi nhìn vào điểm số đẹp hay xấu.",
    };
  }

  if (coverageRatio < 0.2 || score == null) {
    return {
      label: "Chấm điểm sơ bộ",
      tone: "manual",
      summary: "Khung quyết định đã sẵn sàng, nhưng phần lớn yếu tố còn cần nối dữ liệu hoặc xác minh thủ công.",
    };
  }

  if (confidence < 0.45) {
    return {
      label: "Theo dõi, chưa khóa quyết định",
      tone: "manual",
      summary: "Điểm hiện tại còn dựa nhiều vào proxy hơn dữ liệu xác minh. Cần thêm bằng chứng trước khi dùng như một quyết định chính thức.",
    };
  }

  if ((score ?? 0) >= 72) {
    return {
      label: "Có thể mua có điều kiện",
      tone: "supportive",
      summary: "Các tín hiệu đang nghiêng về phía giải ngân, vẫn nên đi từng phần và giữ điều kiện thoát rõ ràng.",
    };
  }

  if (score >= 58) {
    return {
      label: "Chờ vùng mua đẹp hơn",
      tone: "watch",
      summary: "Bức tranh chưa xấu, nhưng chưa đủ sạch để mua mạnh ngay.",
    };
  }

  if (score >= 44) {
    return {
      label: "Chỉ theo dõi",
      tone: "watch",
      summary: "Tín hiệu đang lẫn lộn; ưu tiên bổ sung dữ liệu và chờ xác nhận.",
    };
  }

  return {
    label: "Không mua thêm lúc này",
    tone: "risk",
    summary: "Rủi ro đang lớn hơn phần thưởng kỳ vọng theo các tín hiệu đã nối.",
  };
}

function buildNextActions(
  score: number | null,
  watchList: EvaluatedFactor[],
  riskGates: DecisionRiskGate[],
  coverageRatio: number,
) {
  const actions = [
    "Xác minh các yếu tố đang ở trạng thái cần dữ liệu trước khi giải ngân lớn.",
    "Viết sẵn điều kiện mua thêm, dừng mua và thoát vị thế trước khi bấm lệnh.",
  ];

  if (coverageRatio < 0.25) {
    actions.unshift("Nối thêm dữ liệu vĩ mô, định giá tài sản và checklist tài chính cá nhân để điểm số bớt sơ bộ.");
  }

  if (riskGates.length > 0) {
    actions.unshift(`Gỡ cổng rủi ro trước: ${riskGates[0].title}.`);
  }

  if (watchList.length > 0) {
    actions.unshift(`Ưu tiên xử lý rủi ro: ${watchList[0].title}.`);
  }

  if ((score ?? 0) >= 72) {
    actions.push("Nếu giải ngân, chia lệnh theo từng phần và đặt ngưỡng đánh giá lại sau mỗi snapshot.");
  } else if ((score ?? 0) < 44) {
    actions.push("Chỉ giữ ở watchlist cho đến khi nhánh rủi ro cải thiện rõ ràng.");
  } else {
    actions.push("Chờ thêm xác nhận từ kỹ thuật và dữ liệu vĩ mô trước khi tăng tỷ trọng.");
  }

  return actions.slice(0, 4);
}

function toneFromScore(score: number): DecisionTone {
  if (score >= 65) return "supportive";
  if (score >= 48) return "watch";
  return "risk";
}

function weightedAverage(values: number[]) {
  if (values.length === 0) return null;
  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length, 0, 100);
}

function averageConfidence(factors: Array<Pick<EvaluatedFactor, "confidence">>) {
  if (factors.length === 0) return 0;
  return clamp(factors.reduce((sum, factor) => sum + factor.confidence, 0) / factors.length, 0, 1);
}

function buildRiskGates(analysis: PortfolioDeepAnalysis, coverageRatio: number): DecisionRiskGate[] {
  const gates: DecisionRiskGate[] = [];
  const snapshotCount = finiteNumber(analysis.overview?.snapshotCount) ?? 0;
  const latestValue = finiteNumber(analysis.overview?.latestValue);
  const cashBalance = finiteNumber(analysis.overview?.cashBalance);
  const cashRatio = latestValue && latestValue > 0 && cashBalance != null ? cashBalance / latestValue : null;
  const maxDrawdown = finiteNumber(analysis.riskMetrics?.maxDrawdown);
  const valueAtRisk = finiteNumber(analysis.riskMetrics?.valueAtRisk);
  const sharpe = finiteNumber(analysis.riskMetrics?.sharpeRatio);

  if (coverageRatio < 0.2) {
    gates.push({
      id: "coverage",
      severity: "hard-stop",
      title: "Độ phủ dữ liệu quá thấp",
      detail: "Phần lớn yếu tố vẫn là checklist thủ công nên chưa phù hợp để khóa quyết định đầu tư.",
    });
  }

  if (snapshotCount < 20) {
    gates.push({
      id: "history-depth",
      severity: "warning",
      title: "Lịch sử snapshot còn mỏng",
      detail: `Mới có ${snapshotCount} snapshot nên độ tin cậy của các proxy rủi ro còn hạn chế.`,
    });
  }

  if (cashRatio != null && cashRatio < 0.03) {
    gates.push({
      id: "cash-buffer",
      severity: "warning",
      title: "Bộ đệm tiền mặt mỏng",
      detail: `Tiền mặt nội bộ chỉ khoảng ${formatPercent(cashRatio * 100)} giá trị danh mục.`,
    });
  }

  if (maxDrawdown != null && maxDrawdown > 0.3) {
    gates.push({
      id: "drawdown",
      severity: "hard-stop",
      title: "Drawdown đang quá sâu",
      detail: `Max drawdown khoảng ${formatPercent(maxDrawdown * 100)}. Đây là mức cần giảm rủi ro trước khi tăng vị thế.`,
    });
  }

  if (valueAtRisk != null && valueAtRisk > 0.05) {
    gates.push({
      id: "var",
      severity: "warning",
      title: "VaR 95% đang cao",
      detail: `VaR 95% khoảng ${formatPercent(valueAtRisk * 100)} một ngày.`,
    });
  }

  if (sharpe != null && sharpe < 0) {
    gates.push({
      id: "sharpe",
      severity: "warning",
      title: "Hiệu suất điều chỉnh rủi ro đang âm",
      detail: `Sharpe hiện tại ${formatRatio(sharpe)} cho thấy phần thưởng chưa bù đủ rủi ro.`,
    });
  }

  return gates;
}

function buildDecisionSections(
  analysis: PortfolioDeepAnalysis,
  coverageRatio: number,
  confidence: number,
  riskGates: DecisionRiskGate[],
): AssetDecisionModel["sections"] {
  const sharpe = finiteNumber(analysis.riskMetrics?.sharpeRatio);
  const sortino = finiteNumber(analysis.riskMetrics?.sortinoRatio);
  const maxDrawdown = finiteNumber(analysis.riskMetrics?.maxDrawdown);
  const valueAtRisk = finiteNumber(analysis.riskMetrics?.valueAtRisk);
  const portfolioHealthScore =
    sharpe == null || sortino == null || maxDrawdown == null || valueAtRisk == null
      ? null
      : clamp(58 + sharpe * 8 + sortino * 4 - maxDrawdown * 90 - valueAtRisk * 180, 0, 100);
  const decisionReadinessScore = clamp(coverageRatio * 55 + confidence * 45, 0, 100);
  const riskPenalty = riskGates.reduce((sum, gate) => sum + (gate.severity === "hard-stop" ? 24 : 10), 0);
  const riskPostureScore = clamp(78 - riskPenalty, 0, 100);

  return [
    {
      id: "portfolio-health",
      label: "Sức khỏe danh mục",
      score: portfolioHealthScore,
      summary:
        portfolioHealthScore == null
          ? "Chưa đủ dữ liệu để kết luận sức khỏe rủi ro/lợi nhuận."
          : "Đọc từ Sharpe, Sortino, drawdown và VaR hiện tại của danh mục.",
      tone: portfolioHealthScore == null ? "manual" : toneFromScore(portfolioHealthScore),
    },
    {
      id: "decision-readiness",
      label: "Độ sẵn sàng ra quyết định",
      score: decisionReadinessScore,
      summary: "Kết hợp độ phủ dữ liệu với mức tin cậy của các tín hiệu đã nối.",
      tone: toneFromScore(decisionReadinessScore),
    },
    {
      id: "risk-posture",
      label: "Tư thế rủi ro",
      score: riskPostureScore,
      summary:
        riskGates.length === 0
          ? "Chưa có cổng rủi ro nào đang chặn quyết định."
          : `Có ${riskGates.length} cổng rủi ro cần theo dõi hoặc xử lý trước.`,
      tone: toneFromScore(riskPostureScore),
    },
  ];
}

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value.toFixed(digits)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
