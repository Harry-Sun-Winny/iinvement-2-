export type IndustryProfileId =
  | "banking"
  | "securities"
  | "insurance"
  | "real-estate"
  | "construction"
  | "materials"
  | "steel"
  | "oil-gas"
  | "utilities"
  | "retail"
  | "consumer-staples"
  | "food-beverage"
  | "healthcare"
  | "technology"
  | "telecom"
  | "manufacturing"
  | "logistics"
  | "aviation-tourism"
  | "agriculture"
  | "chemicals";

export interface IndustryDecisionProfile {
  id: IndustryProfileId;
  label: string;
  thesisLens: string;
  topFactors: string[];
  redFlags: string[];
  regimeNote: string;
}

export const INDUSTRY_DECISION_PROFILES: IndustryDecisionProfile[] = [
  { id: "banking", label: "Ngân hàng", thesisLens: "Đọc chất lượng tài sản, NIM, vốn và chu kỳ tín dụng.", topFactors: ["NPL / nợ xấu", "NIM", "CAR", "tăng trưởng tín dụng"], redFlags: ["nợ xấu tăng nhanh", "dự phòng thấp hơn rủi ro", "thanh khoản căng"], regimeNote: "Suy thoái: tăng trọng số tài sản và thanh khoản." },
  { id: "securities", label: "Chứng khoán", thesisLens: "Đọc thanh khoản thị trường, margin, tự doanh và phí môi giới.", topFactors: ["dư nợ margin", "thanh khoản", "thị phần môi giới", "tự doanh"], redFlags: ["margin call", "tự doanh tập trung", "chi phí vốn tăng"], regimeNote: "Thị trường hưng phấn: kiểm tra chất lượng lợi nhuận." },
  { id: "insurance", label: "Bảo hiểm", thesisLens: "Đọc combined ratio, chất lượng đầu tư và dự phòng.", topFactors: ["combined ratio", "dự phòng", "tỷ lệ tái tục", "lợi suất danh mục"], redFlags: ["under-reserving", "bồi thường tăng", "duration mismatch"], regimeNote: "Lãi suất cao: kiểm tra duration và định giá danh mục." },
  { id: "real-estate", label: "Bất động sản", thesisLens: "Đọc pháp lý, backlog, dòng tiền dự án và đòn bẩy.", topFactors: ["pháp lý dự án", "presales", "backlog", "net debt"], redFlags: ["pháp lý chưa sạch", "đáo hạn trái phiếu", "dòng tiền âm kéo dài"], regimeNote: "Siết tín dụng: cổng pháp lý và thanh khoản không được bù trừ." },
  { id: "construction", label: "Xây dựng", thesisLens: "Đọc backlog, biên hợp đồng, thu tiền và năng lực thi công.", topFactors: ["backlog", "order margin", "DSO", "on-time delivery"], redFlags: ["công nợ chủ đầu tư", "trượt giá vật liệu", "bảo lãnh lớn"], regimeNote: "Phục hồi: backlog tốt nhưng phải kiểm tra biên thực." },
  { id: "materials", label: "Vật liệu xây dựng", thesisLens: "Đọc spread giá bán - chi phí, công suất và nhu cầu xây dựng.", topFactors: ["price-cost spread", "utilization", "năng lượng", "cung cầu"], redFlags: ["công suất dư thừa", "chi phí đầu vào tăng", "nợ cao"], regimeNote: "Lạm phát đầu vào: tăng trọng số pass-through." },
  { id: "steel", label: "Thép", thesisLens: "Đọc spread thép-quặng-than, tồn kho và phòng vệ thương mại.", topFactors: ["metal spread", "inventory", "utilization", "cash cost"], redFlags: ["tồn kho phình", "dumping", "đòn bẩy"], regimeNote: "Phục hồi đầu chu kỳ: operating leverage là biến dẫn dắt." },
  { id: "oil-gas", label: "Dầu khí", thesisLens: "Đọc giá thực nhận, trữ lượng, lifting cost và capex.", topFactors: ["realized price", "reserve life", "breakeven", "production"], redFlags: ["reserve replacement thấp", "decommissioning", "đòn bẩy"], regimeNote: "Giá hàng hóa biến động: dùng kịch bản thay vì một điểm dự báo." },
  { id: "utilities", label: "Điện / tiện ích", thesisLens: "Đọc hợp đồng, availability, nhiên liệu và giấy phép.", topFactors: ["PPA/offtake", "availability", "input cost", "debt duration"], redFlags: ["bên mua yếu", "giấy phép", "lỗ tỷ giá"], regimeNote: "Phòng thủ tốt hơn khi dòng tiền hợp đồng ổn định." },
  { id: "retail", label: "Bán lẻ", thesisLens: "Đọc SSSG, biên gộp, vòng quay tồn kho và payback cửa hàng.", topFactors: ["SSSG", "gross margin", "inventory turns", "store ROI"], redFlags: ["markdown cao", "cannibalization", "đốt tiền"], regimeNote: "Thu nhập giảm: ưu tiên sức mua và tồn kho." },
  { id: "consumer-staples", label: "Hàng tiêu dùng thiết yếu", thesisLens: "Đọc pricing power, volume, thương hiệu và FCF.", topFactors: ["price/mix", "volume", "gross margin", "distribution"], redFlags: ["mất thị phần", "khuyến mại tăng", "FCF yếu"], regimeNote: "Lạm phát: pass-through phải đi trước volume." },
  { id: "food-beverage", label: "Thực phẩm & đồ uống", thesisLens: "Đọc an toàn chất lượng, spread nguyên liệu và chuỗi lạnh.", topFactors: ["food safety", "input spread", "brand", "inventory"], redFlags: ["recall", "hao hụt", "phụ thuộc nhà cung cấp"], regimeNote: "Cờ đỏ chất lượng là loại trừ, không bù bằng tăng trưởng." },
  { id: "healthcare", label: "Y tế & dược phẩm", thesisLens: "Đọc pipeline, GMP, phê duyệt và biên sản phẩm.", topFactors: ["pipeline", "GMP/GDP", "approval", "product margin"], redFlags: ["rủi ro phê duyệt", "reimbursement", "API concentration"], regimeNote: "Ưu tiên chất lượng bằng chứng và rủi ro pháp lý." },
  { id: "technology", label: "Công nghệ & phần mềm", thesisLens: "Đọc ARR, NRR, gross margin, LTV/CAC và an ninh hệ thống.", topFactors: ["ARR growth", "NRR", "gross margin", "LTV/CAC"], redFlags: ["churn tăng", "platform dependency", "burn rate"], regimeNote: "Tăng trưởng sớm: runway và retention quan trọng hơn P/E." },
  { id: "telecom", label: "Viễn thông", thesisLens: "Đọc ARPU, thuê bao, capex, chất lượng mạng và phổ tần.", topFactors: ["ARPU", "net adds/churn", "capex", "coverage"], redFlags: ["churn", "capex quá cao", "nợ phổ tần"], regimeNote: "Tăng trưởng phải chuyển thành FCF, không chỉ thuê bao." },
  { id: "manufacturing", label: "Công nghiệp chế tạo", thesisLens: "Đọc backlog, biên đơn hàng, OEE và vốn lưu động.", topFactors: ["book-to-bill", "order margin", "utilization", "OEE"], redFlags: ["defect/warranty", "CCC kéo dài", "khách hàng tập trung"], regimeNote: "Phục hồi: backlog cần đi kèm biên và thu tiền." },
  { id: "logistics", label: "Logistics / cảng biển", thesisLens: "Đọc sản lượng, yield, utilization và kết nối hậu phương.", topFactors: ["throughput", "yield", "utilization", "concession life"], redFlags: ["phụ thuộc khách hàng", "tắc nghẽn", "trade exposure"], regimeNote: "Chu kỳ thương mại: dùng throughput dẫn dắt, không chỉ giá cước." },
  { id: "aviation-tourism", label: "Hàng không & du lịch", thesisLens: "Đọc load factor, yield, fuel cost và lease-adjusted leverage.", topFactors: ["load factor", "RevPAR/yield", "fuel cost", "bookings"], redFlags: ["nợ thuê", "dịch bệnh", "FX mismatch"], regimeNote: "Sốc sự kiện cần kịch bản phòng thủ trước dự báo tăng trưởng." },
  { id: "agriculture", label: "Nông nghiệp & thủy sản", thesisLens: "Đọc giá bán, chi phí thức ăn, năng suất và dịch bệnh.", topFactors: ["realized price", "feed cost", "yield", "biosecurity"], redFlags: ["mortality", "SPS/tariff", "thời tiết"], regimeNote: "Rủi ro khí hậu là tail risk; cần biên an toàn vốn." },
  { id: "chemicals", label: "Hóa chất & phân bón", thesisLens: "Đọc spread sản phẩm - nguyên liệu, công suất và giá năng lượng.", topFactors: ["product spread", "feedstock cost", "utilization", "demand"], redFlags: ["giá khí tăng", "công suất dư", "tuân thủ môi trường"], regimeNote: "Lạm phát đầu vào: pass-through và tồn kho quyết định." },
];

export const REGIME_OPTIONS = [
  { id: "recovery", label: "Phục hồi đầu chu kỳ", multiplier: "1.10-1.35" },
  { id: "expansion", label: "Tăng trưởng mở rộng", multiplier: "1.00-1.20" },
  { id: "inflation", label: "Lạm phát / giá đầu vào tăng", multiplier: "1.15-1.40" },
  { id: "recession", label: "Suy thoái / siết tín dụng", multiplier: "1.20-1.50" },
  { id: "euphoria", label: "Thị trường hưng phấn", multiplier: "0.60-1.40" },
];

export function getIndustryProfile(id: IndustryProfileId) {
  return INDUSTRY_DECISION_PROFILES.find((profile) => profile.id === id) ?? INDUSTRY_DECISION_PROFILES[0];
}

