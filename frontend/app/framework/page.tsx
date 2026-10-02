"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "@/components/providers/I18nProvider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { Badge } from "@/components/ui/badge";
import { useTableTheme } from "../lib/table-theme";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import AutoSizedChart from "@/components/charts/AutoSizedChart";
import {
  BookOpen,
  PieChart as PieIcon,
  Activity,
  Layers,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Info
} from "lucide-react";

type ActiveTab = "overview" | "details" | "psychology" | "stepper";

interface IndustryData {
  key: string;
  name: string;
  fundamental: number;
  technical: number;
  quantitative: number;
  sentiment: number;
  priorityMetrics: string[];
  metricsDetail: {
    fundamental: string;
    technical: string;
    quantitative: string;
    sentiment: string;
  };
  signals: {
    buy: string;
    sell: string;
  };
}

const INDUSTRIES_DATA: IndustryData[] = [
  {
    key: "BANKING",
    name: "Ngân hàng & Tài chính",
    fundamental: 50,
    technical: 20,
    quantitative: 20,
    sentiment: 10,
    priorityMetrics: ["NIM > 3.5% & NPL < 2%", "CAR > 12% & CASA > 30%", "Lãi suất vĩ mô hạ"],
    metricsDetail: {
      fundamental: "Biên lãi thuần NIM > 3.5%, Tỷ lệ nợ xấu NPL < 2%, Tỷ lệ an toàn vốn CAR > 12%, CASA > 30%, Định giá P/B",
      technical: "Trend xu hướng dài hạn, Điểm phá vỡ cấu trúc BOS/CHoCH, Khối lượng VSA",
      quantitative: "Chính sách lãi suất vĩ mô, Tăng trưởng tín dụng hệ thống, Thanh khoản ngân hàng",
      sentiment: "Chỉ số hoảng loạn VIX, Tỷ lệ Put/Call, Khối lượng giao dịch của khối ngoại",
    },
    signals: {
      buy: "NIM mở rộng + Nợ xấu có xu hướng tạo đáy + Vĩ mô hạ lãi suất thúc đẩy tín dụng.",
      sell: "NIM thu hẹp dưới 3% + Nợ xấu tăng nhanh + Ngân hàng trung ương thắt chặt tiền tệ đột ngột."
    }
  },
  {
    key: "TECH",
    name: "Công nghệ & Phần mềm",
    fundamental: 35,
    technical: 25,
    quantitative: 15,
    sentiment: 25,
    priorityMetrics: ["Tăng trưởng Doanh thu > 20%", "Biên LN gộp > 40%", "Rule of 40 đạt chuẩn"],
    metricsDetail: {
      fundamental: "Tăng trưởng Doanh thu > 20%, Biên LN gộp > 40%, Rule of 40 (Tăng trưởng + Biên LN > 40%), Định giá PEG",
      technical: "Sức mạnh giá RS, Breakout nền giá lớn, Đường trung bình VWAP, Bollinger Bands",
      quantitative: "Factor momentum, Hồi quy định lượng tương quan, Biến động chu kỳ công nghệ",
      sentiment: "Kỳ vọng dòng tiền AI/Cloud, Tâm lý hưng phấn đầu cơ tăng trưởng, Tin tức công nghệ mới",
    },
    signals: {
      buy: "Biên lợi nhuận tăng trưởng mạnh mẽ + Có làn sóng công nghệ mới kích thích dòng tiền đầu cơ.",
      sell: "Tăng trưởng chậm lại dưới 15% + Rule of 40 vi phạm + P/E vượt quá 3 lần độ lệch chuẩn lịch sử."
    }
  },
  {
    key: "REALESTATE",
    name: "Bất động sản (Developers & REITs)",
    fundamental: 45,
    technical: 20,
    quantitative: 25,
    sentiment: 10,
    priorityMetrics: ["Nợ vay/Vốn CSH < 1x", "Presales tăng trưởng dương", "Hạ lãi suất cho vay"],
    metricsDetail: {
      fundamental: "Quỹ đất sạch pháp lý, Presales (Bán trước) tăng trưởng, Backlog lớn, Nợ ròng/Vốn chủ sở hữu < 1x",
      technical: "Vùng hỗ trợ/kháng cự dài hạn, Điểm đảo chiều Wyckoff (LPS, Spring)",
      quantitative: "Lãi suất cho vay mua nhà, Tăng trưởng room tín dụng BĐS, Tốc độ phê duyệt dự án",
      sentiment: "Tâm lý thị trường giao dịch BĐS thực tế, Giao dịch của cổ đông nội bộ (Insider Buying)",
    },
    signals: {
      buy: "Hạ lãi suất cho vay + Pháp lý dự án được tháo gỡ + Presales ghi nhận doanh số đột biến.",
      sell: "Tỷ lệ nợ/vốn CSH vượt 1.5x + Dòng tiền hoạt động âm kéo dài + Đóng băng room tín dụng."
    }
  },
  {
    key: "ENERGY",
    name: "Năng lượng & Hàng hóa cơ bản",
    fundamental: 30,
    technical: 20,
    quantitative: 35,
    sentiment: 15,
    priorityMetrics: ["Break-even cost cực thấp", "Reserve Replacement Rate > 100%", "WTI/Brent xu hướng tăng"],
    metricsDetail: {
      fundamental: "Giá hòa vốn Break-even cost, Tỷ lệ bù đắp trữ lượng (Reserve Replacement Rate) > 100%, Chu kỳ CapEx",
      technical: "Vùng cung cầu quan trọng (Supply/Demand Zones), Chỉ báo Ichimoku Cloud",
      quantitative: "Giá dầu Brent/WTI, Tương quan giá hàng hóa toàn cầu, Chỉ số lạm phát",
      sentiment: "Báo cáo vị thế Speculative Traders (COT report), Mức mở hợp đồng tương lai OI",
    },
    signals: {
      buy: "Nhu cầu toàn cầu hồi phục làm giá dầu Brent vượt điểm hòa vốn + Trữ lượng mới tăng.",
      sell: "Cung vượt cầu đột biến + Giá hàng hóa thế giới gãy trend dài hạn + CapEx toàn ngành chạm đỉnh."
    }
  },
  {
    key: "CONSUMER_STAPLES",
    name: "Tiêu dùng thiết yếu (Staples)",
    fundamental: 50,
    technical: 20,
    quantitative: 20,
    sentiment: 10,
    priorityMetrics: ["SSSG > 5% cùng cửa hàng", "Biên LN gộp ổn định", "Cổ tức tiền mặt đều đặn"],
    metricsDetail: {
      fundamental: "Tăng trưởng doanh thu cùng cửa hàng (SSSG) > 5%, Biên LN gộp ổn định, Tỷ lệ chi trả cổ tức tiền mặt",
      technical: "Mô hình tích lũy đáy Wyckoff dài hạn, Bollinger Bands bóp chặt (Squeeze)",
      quantitative: "Sức mua người tiêu dùng, Tương quan lạm phát CPI, Chỉ số bán lẻ hàng tháng",
      sentiment: "Insider buying, Quỹ ngoại mua ròng dòng tiền phòng thủ, Chỉ số sợ hãi tăng cao",
    },
    signals: {
      buy: "SSSG tăng trưởng ổn định + Lạm phát hạ nhiệt giúp hồi phục biên lợi nhuận + Nhu cầu phòng thủ cao.",
      sell: "Chi phí nguyên liệu đầu vào tăng phi mã không thể chuyển giao sang người tiêu dùng + SSSG âm."
    }
  },
  {
    key: "CONSUMER_DISCRETIONARY",
    name: "Tiêu dùng tùy ý (Discretionary)",
    fundamental: 30,
    technical: 25,
    quantitative: 15,
    sentiment: 30,
    priorityMetrics: ["Chỉ số niềm tin tiêu dùng CCI tăng", "Vòng quay tồn kho nhanh", "Biên LN gộp tăng"],
    metricsDetail: {
      fundamental: "Vòng quay hàng tồn kho, Biên LN gộp xu hướng tăng, Tỷ lệ nợ vay, Thị phần nội địa",
      technical: "Cấu trúc xu hướng tăng HH/HL, Điểm quét thanh khoản Liquidity Grab",
      quantitative: "Chỉ số niềm tin tiêu dùng (CCI), Tương quan GDP, Thu nhập khả dụng thực tế",
      sentiment: "Tâm lý chi tiêu mua sắm, Dư nợ Margin toàn thị trường đỉnh/đáy",
    },
    signals: {
      buy: "Niềm tin tiêu dùng CCI tăng mạnh + Thu nhập thực tế hồi phục + Vòng quay tồn kho đẩy nhanh.",
      sell: "Lạm phát tăng làm bào mòn thu nhập khả dụng + Hàng tồn kho ứ đọng kéo dài hơn 90 ngày."
    }
  },
  {
    key: "HEALTHCARE",
    name: "Y tế & Dược phẩm",
    fundamental: 45,
    technical: 10,
    quantitative: 25,
    sentiment: 20,
    priorityMetrics: ["Xác suất duyệt FDA cao", "Patent Expiry an toàn", "R&D Spend / Revenue > 15%"],
    metricsDetail: {
      fundamental: "Danh mục thuốc đang phát triển (Pipeline rNPV), Thời hạn bảo hộ sáng chế (Patent Expiry), R&D / Doanh thu > 15%",
      technical: "Kênh giá tích lũy dài hạn, Khối lượng chặn đứng đà rơi (Stopping Volume)",
      quantitative: "Xác suất phê duyệt của FDA qua các Phase, Mô hình dự báo đỉnh doanh thu (Peak Sales)",
      sentiment: "Tin tức thử nghiệm lâm sàng, Tâm lý thị trường xoay quanh chất xúc tác (Catalyst-driven)",
    },
    signals: {
      buy: "Thuốc chủ lực được phê duyệt FDA Phase III + Sở hữu sáng chế mới bảo vệ dòng tiền dài hạn.",
      sell: "Sáng chế cốt lõi hết hạn độc quyền + Pipeline thử nghiệm lâm sàng thất bại diện rộng."
    }
  }
];

interface CycleStage {
  name: string;
  zone: "green" | "red";
  description: string;
  signs: string[];
  action: string;
}

const PSYCHOLOGY_STAGES: CycleStage[] = [
  {
    name: "Tích lũy (Accumulation)",
    zone: "green",
    description: "Thị trường đi ngang chán nản sau một đợt sụt giảm mạnh. Thanh khoản cạn kiệt, các nhà đầu tư nhỏ lẻ đã bán cắt lỗ gần hết. Tin tức vĩ mô vẫn tiêu cực nhưng giá cổ phiếu không còn giảm thêm nữa.",
    signs: [
      "Thanh khoản thị trường chạm mức thấp kỷ lục.",
      "Tin xấu ra liên tục nhưng các cổ phiếu đầu ngành không giảm thêm.",
      "Dòng tiền thông minh (Smart Money) âm thầm mua gom cổ phiếu có định giá rẻ."
    ],
    action: "Mua gom dần các cổ phiếu có nền tảng cơ bản cực mạnh (NIM cao, nợ thấp) với tầm nhìn trung và dài hạn."
  },
  {
    name: "Tham lam (Greed)",
    zone: "red",
    description: "Thị trường bước vào pha tăng giá rõ rệt. Dòng tiền F0 đổ vào ồ ạt, margin của các công ty chứng khoán tăng mạnh. Các tin tức tích cực về kết quả kinh doanh xuất hiện liên tục trên truyền thông.",
    signs: [
      "Thanh khoản bùng nổ, thị trường ghi nhận các phiên tăng điểm diện rộng.",
      "Nhà đầu tư cá nhân bắt đầu thảo luận sôi nổi về cổ phiếu ở mọi nơi.",
      "Tỷ lệ sử dụng đòn bẩy Margin đạt mức cao."
    ],
    action: "Giữ chặt danh mục, hạn chế mua đuổi giá cao (FOMO), thiết lập mức chặn lãi tự động (Trailing Stop)."
  },
  {
    name: "Euphoria (Hưng phấn tột độ)",
    zone: "red",
    description: "Đỉnh cao của chu kỳ bong bóng. Nhà đầu tư tin rằng 'lần này sẽ khác' và giá cổ phiếu sẽ tăng mãi mãi. Tất cả các lời khuyên thận trọng đều bị gạt đi. Các định giá P/E, P/B vượt quá giới hạn thông thường.",
    signs: [
      "Các dự báo thị trường cực kỳ lạc quan, định giá phi thực tế.",
      "Cổ phiếu rác (Penny) tăng trần hàng loạt bất chấp kết quả kinh doanh thua lỗ.",
      "Nhà đầu tư thế chấp tài sản để gia tăng quy mô mua cổ phiếu."
    ],
    action: "Bán chốt lời quyết liệt, đưa tỷ lệ Margin về 0, chuyển danh mục sang tiền mặt hoặc các tài sản phòng thủ."
  },
  {
    name: "Phân phối (Distribution)",
    zone: "red",
    description: "Giá cổ phiếu bắt đầu biến động cực mạnh quanh vùng đỉnh nhưng không thể bứt phá lên tiếp. Khối lượng giao dịch rất lớn nhưng giá không tăng (nỗ lực lớn nhưng kết quả ít).",
    signs: [
      "Xuất hiện các phiên giảm điểm biên độ rộng đi kèm volume cực lớn.",
      "Nhà đầu tư lớn bán dần vị thế ra, trong khi nhỏ lẻ hưng phấn hấp thụ.",
      "Tin tức tốt nhất của doanh nghiệp công bố nhưng giá cổ phiếu không phản ứng tăng."
    ],
    action: "Thoát hoàn toàn các cổ phiếu có tính chu kỳ cao, nâng tỷ trọng tiền mặt lên trên 70% danh mục."
  },
  {
    name: "Hoảng loạn (Panic)",
    zone: "green",
    description: "Các tin tức xấu bắt đầu xuất hiện dồn dập. Lệnh bán tháo giải chấp (Force Sell/Call Margin) diễn ra diện rộng làm giá cổ phiếu rơi tự do không có lực đỡ.",
    signs: [
      "Bán tháo bằng lệnh MP/ATC trắng bên mua ở hàng loạt cổ phiếu.",
      "Thanh khoản đột biến ở các phiên sụp đổ sâu do lệnh margin call ép buộc bán.",
      "Tâm lý hoang mang tột độ, nhà đầu tư cắt lỗ bất chấp định giá."
    ],
    action: "Đứng ngoài thị trường quan sát, tuyệt đối không bắt dao rơi khi chưa có tín hiệu ngừng rơi và tạo đáy."
  },
  {
    name: "Tuyệt vọng (Despair)",
    zone: "green",
    description: "Đáy sâu nhất của tâm lý. Nhà đầu tư chán nản cùng cực, thề không bao giờ quay lại thị trường chứng khoán. Định giá rẻ mạt nhưng không một ai dám mua vì sợ thị trường sẽ sụp đổ hoàn toàn.",
    signs: [
      "Khối lượng giao dịch mất hút, thị trường buồn ngủ đi ngang.",
      "Các diễn đàn đầu tư thưa thớt, truyền thông chuyển sang đưa tin về các kênh tài sản khác.",
      "Nhiều doanh nghiệp tốt có lượng tiền mặt lớn hơn cả vốn hóa thị trường."
    ],
    action: "Mua mạnh tay cổ phiếu định giá rẻ lịch sử. Đây là cơ hội tích lũy tài sản lớn nhất của một chu kỳ mới."
  }
];

export default function FrameworkPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const { theme, setTheme, themes, textClass } = useTableTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("BANKING");
  const [selectedStage, setSelectedStage] = useState<number>(0);
  const [expandedStep, setExpandedStep] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Grouped data for Tab 1 Chart
  const chartData = useMemo(() => {
    return INDUSTRIES_DATA.map((ind) => ({
      name: ind.name.split(" ")[0], // Tên ngắn để hiển thị đồ thị
      fullName: ind.name,
      "Cơ bản": ind.fundamental,
      "Kỹ thuật": ind.technical,
      "Định lượng": ind.quantitative,
      "Tâm lý": ind.sentiment,
    }));
  }, []);

  const activeInd = useMemo(() => {
    return INDUSTRIES_DATA.find((i) => i.key === selectedIndustry) || INDUSTRIES_DATA[0];
  }, [selectedIndustry]);

  // Format data for Tab 2 Radar Chart
  const radarData = useMemo(() => {
    return [
      { subject: "Cơ bản", weight: activeInd.fundamental },
      { subject: "Kỹ thuật", weight: activeInd.technical },
      { subject: "Định lượng", weight: activeInd.quantitative },
      { subject: "Tâm lý", weight: activeInd.sentiment },
    ];
  }, [activeInd]);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <main className="w-[820px] shrink-0 border-r border-white/5 h-full overflow-y-auto p-6 space-y-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#54a0ff] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={16} /> {isVi ? "Khung phương pháp luận đầu tư" : "Investment Methodology Framework"}
              </p>
              <h2 className="mt-2 text-3xl font-black rainbow-text">Investment Analysis Framework</h2>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 gap-1 shadow-inner shadow-black">
              {[
                { id: "overview", label: isVi ? "Tổng quan vĩ mô" : "Macro Overview" },
                { id: "details", label: isVi ? "Chi tiết 7 Ngành" : "7 Industry Details" },
                { id: "psychology", label: isVi ? "Chu kỳ tâm lý" : "Psychology Cycle" },
                { id: "stepper", label: isVi ? "Quy trình 5 Bước" : "5-Step Process" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-white/10 text-white shadow-sm border-b-2 border-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={16} className="text-blue-400" /> {isVi ? "Phân phối trọng số các ngành" : "Industry Weight Distribution"}
                    </CardTitle>
                    <CardDescription>{isVi ? "Biểu đồ so sánh cơ cấu trọng số 4 trụ cột phân tích trên 7 ngành kinh tế chính." : "Comparison chart of 4-pillar weight structure across 7 major economic sectors."}  </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] pt-4">
                    {mounted && (
                      <AutoSizedChart>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#64748b" unit="%" tick={{ fontSize: 10 }} />
                          <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value}%`} />} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Bar dataKey="Cơ bản" fill="#3b82f6" stackId="a" />
                          <Bar dataKey="Kỹ thuật" fill="#10b981" stackId="a" />
                          <Bar dataKey="Định lượng" fill="#f59e0b" stackId="a" />
                          <Bar dataKey="Tâm lý" fill="#a855f7" stackId="a" />
                        </BarChart>
                      </AutoSizedChart>
                    )}
                  </CardContent>
                </Card>

                <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Info size={16} className="text-emerald-400" /> Framework 4 Trụ Cột (4 Pillars)
                    </CardTitle>
                    <CardDescription>{isVi ? "Lăng kính đa chiều phân tích chất lượng một cổ phiếu trước khi đầu tư." : "A multi-dimensional lens for analyzing stock quality before investing."}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs text-slate-300">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold font-mono">1</span>
                      <div>
                        <p className="font-bold text-white mb-0.5">Trụ cột Cơ bản (Fundamental)</p>
                        <p className="text-slate-400 leading-relaxed">Định giá, dòng tiền, sức mạnh tài chính, tăng trưởng doanh thu và lợi nhuận cốt lõi của doanh nghiệp.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">2</span>
                      <div>
                        <p className="font-bold text-white mb-0.5">Trụ cột Kỹ thuật (Technical)</p>
                        <p className="text-slate-400 leading-relaxed">Cấu trúc thị trường, xu hướng (trend), các mô hình tích lũy/phân phối, chỉ số động lượng và VSA.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">3</span>
                      <div>
                        <p className="font-bold text-white mb-0.5">Trụ cột Định lượng (Quantitative)</p>
                        <p className="text-slate-400 leading-relaxed">Số liệu vĩ mô (lãi suất, lạm phát, CPI, PMI), mối tương quan liên thị trường và phân tích nhân tố (factor modeling).</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <span className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono">4</span>
                      <div>
                        <p className="font-bold text-white mb-0.5">Trụ cột Tâm lý (Sentiment)</p>
                        <p className="text-slate-400 leading-relaxed">Dòng tiền tổ chức/ngoại khối, Put/Call ratio, chỉ báo sợ hãi, tin đồn thị trường và tâm lý của đám đông F0.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table Accent Color Picker */}
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/40 px-4 py-3 rounded-xl border border-white/5 gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-normal min-w-[120px] break-words">{isVi ? "Màu chủ đạo của bảng:" : "Table accent color:"}</span>
                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                  {themes.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setTheme(t.name)}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        theme === t.name ? "scale-125 border-white ring-2 ring-white/20" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: t.hex }}
                      title={t.name}
                    />
                  ))}
                </div>
              </div>

              {/* Heatmap table weights */}
              <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white">{isVi ? "Bảng phân bổ trọng số chi tiết (Heatmap)" : "Detailed Weight Allocation Table (Heatmap)"}</CardTitle>
                  <CardDescription>{isVi ? "Nhấn vào dòng bất kỳ để xem chi tiết các chỉ số cụ thể của ngành đó." : "Click any row to view specific metrics for that industry."}</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-[var(--table)]/50">
                        <th className={`py-4 px-6 ${textClass} font-bold text-xs uppercase tracking-wider`}>{isVi ? "Ngành" : "Industry"}</th>
                        <th className={`py-4 px-6 ${textClass} font-bold text-xs uppercase tracking-wider text-center`}>{isVi ? "Cơ bản" : "Fundamental"}</th>
                        <th className={`py-4 px-6 ${textClass} font-bold text-xs uppercase tracking-wider text-center`}>{isVi ? "Kỹ thuật" : "Technical"}</th>
                        <th className={`py-4 px-6 ${textClass} font-bold text-xs uppercase tracking-wider text-center`}>{isVi ? "Định lượng" : "Quantitative"}</th>
                        <th className={`py-4 px-6 ${textClass} font-bold text-xs uppercase tracking-wider text-center`}>{isVi ? "Tâm lý" : "Sentiment"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {INDUSTRIES_DATA.map((ind) => (
                        <tr
                          key={ind.key}
                          onClick={() => {
                            setSelectedIndustry(ind.key);
                            setActiveTab("details");
                          }}
                          className="hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-white whitespace-normal min-w-[120px] break-words">{ind.name}</td>
                          {/* Heatmap styling using opacity based on weight % */}
                          {[
                            { val: ind.fundamental, bg: "bg-blue-500" },
                            { val: ind.technical, bg: "bg-emerald-500" },
                            { val: ind.quantitative, bg: "bg-amber-500" },
                            { val: ind.sentiment, bg: "bg-purple-500" }
                          ].map((item, idx) => (
                            <td key={idx} className="py-4 px-6 text-center">
                              <div
                                className={`inline-flex items-center justify-center font-mono font-bold text-xs w-12 py-1 rounded-md border ${item.bg}/10`}
                                style={{
                                  backgroundColor: `rgba(255, 255, 255, ${item.val / 150})`,
                                  color: item.val >= 35 ? "#ffffff" : "#94a3b8",
                                  borderColor: `rgba(255, 255, 255, ${item.val / 200})`
                                }}
                              >
                                {item.val}%
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: DETAILED INDUSTRIES */}
          {activeTab === "details" && (
            <div className="grid gap-6 md:grid-cols-[280px_1fr]">
              {/* Sidebar Industry Selector */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Danh sách ngành</p>
                {INDUSTRIES_DATA.map((ind) => (
                  <button
                    key={ind.key}
                    onClick={() => setSelectedIndustry(ind.key)}
                    className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-between ${
                      selectedIndustry === ind.key
                        ? "bg-white/10 text-white border-white/20 shadow-md border-l-4 border-l-blue-400"
                        : "bg-slate-900/30 text-slate-400 border-white/5 hover:bg-slate-900/60 hover:text-white"
                    }`}
                  >
                    <span>{ind.name}</span>
                    <ArrowRight size={14} className={selectedIndustry === ind.key ? "opacity-100" : "opacity-0"} />
                  </button>
                ))}
              </div>

              {/* Detail Content */}
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  {/* Priority metrics card */}
                  <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col justify-between">
                    <CardHeader>
                      <Badge variant="outline" className="w-fit border-blue-500/30 text-blue-400 bg-blue-500/5 mb-1.5">
                        Chỉ số trọng tâm
                      </Badge>
                      <CardTitle className="text-xl font-black text-white">{activeInd.name}</CardTitle>
                      <CardDescription>Các chỉ số tiên quyết cấu thành điểm số ngành.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">3 Chỉ số ưu tiên (Priority Chips)</p>
                        <div className="flex flex-wrap gap-2">
                          {activeInd.priorityMetrics.map((m, i) => (
                            <span key={i} className="bg-slate-950/60 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-white/5 font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tiêu chí chi tiết từng trụ cột</p>
                        <div className="grid gap-2.5 text-xs">
                          <div className="p-2.5 rounded bg-slate-950/40 border border-white/5">
                            <span className="font-bold text-blue-400">Cơ bản:</span> <span className="text-slate-300">{activeInd.metricsDetail.fundamental}</span>
                          </div>
                          <div className="p-2.5 rounded bg-slate-950/40 border border-white/5">
                            <span className="font-bold text-emerald-400">Kỹ thuật:</span> <span className="text-slate-300">{activeInd.metricsDetail.technical}</span>
                          </div>
                          <div className="p-2.5 rounded bg-slate-950/40 border border-white/5">
                            <span className="font-bold text-amber-400">Định lượng:</span> <span className="text-slate-300">{activeInd.metricsDetail.quantitative}</span>
                          </div>
                          <div className="p-2.5 rounded bg-slate-950/40 border border-white/5">
                            <span className="font-bold text-purple-400">Tâm lý:</span> <span className="text-slate-300">{activeInd.metricsDetail.sentiment}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Radar weight chart */}
                  <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col justify-between">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ phân bổ radar</CardTitle>
                      <CardDescription>Cơ cấu tỷ trọng của các trụ cột phân tích đặc thù cho ngành.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[240px] flex items-center justify-center pt-2">
                      {mounted && (
                        <AutoSizedChart>
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 50]} dataKey="weight" tick={{ fill: "#475569", fontSize: 9 }} />
                            <Radar name="Trọng số" dataKey="weight" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                          </RadarChart>
                        </AutoSizedChart>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Signal trigger cards */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="antigravity-panel border-emerald-500/20 bg-emerald-500/[0.015]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp size={14} /> Tín hiệu Mua (Buy Catalyst)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-slate-300 leading-relaxed">
                      {activeInd.signals.buy}
                    </CardContent>
                  </Card>

                  <Card className="antigravity-panel border-red-500/20 bg-red-500/[0.015]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingDown size={14} /> Tín hiệu Bán (Sell/Risk Warning)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-slate-300 leading-relaxed">
                      {activeInd.signals.sell}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PSYCHOLOGY CYCLE */}
          {activeTab === "psychology" && (
            <div className="space-y-6">
              <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-purple-400" /> Động lực chu kỳ tâm lý thị trường
                  </CardTitle>
                  <CardDescription>Trực quan hóa 6 giai đoạn tâm lý kinh điển của đám đông và các quyết định đầu tư tương ứng.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Horizontal visual stepper of cycle */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-6">
                    {PSYCHOLOGY_STAGES.map((stage, index) => {
                      const isActive = selectedStage === index;
                      const isGreenZone = stage.zone === "green";
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedStage(index)}
                          className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-24 ${
                            isActive
                              ? isGreenZone
                                ? "bg-emerald-500/10 border-emerald-500 text-white ring-2 ring-emerald-500/20 scale-105"
                                : "bg-red-500/10 border-red-500 text-white ring-2 ring-red-500/20 scale-105"
                              : "bg-slate-950/60 border-white/5 text-slate-400 hover:bg-slate-950/80 hover:text-white"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-500 font-mono">0{index + 1}</span>
                          <span className="text-xs font-bold leading-tight">{stage.name}</span>
                          <Badge
                            className={`text-[8px] font-black uppercase w-fit tracking-wider px-1.5 py-0 ${
                              isGreenZone
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/25"
                                : "bg-red-500/20 text-red-400 border border-red-500/25"
                            }`}
                          >
                            {isGreenZone ? "BUY ZONE" : "SELL ZONE"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>

                  {/* Stage Detail Card */}
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">
                          {PSYCHOLOGY_STAGES[selectedStage].name}
                        </span>
                        <Badge
                          className={`text-[9px] font-black uppercase px-2.5 py-0.5 border ${
                            PSYCHOLOGY_STAGES[selectedStage].zone === "green"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {PSYCHOLOGY_STAGES[selectedStage].zone === "green" ? "Vùng Tích Lũy / Nắm Giữ" : "Vùng Phân Phối / Thoát Hàng"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đặc điểm nhận diện</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{PSYCHOLOGY_STAGES[selectedStage].description}</p>
                      </div>

                      <div className="space-y-3.5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dấu hiệu nhận biết kỹ thuật</p>
                        <ul className="text-xs text-slate-300 space-y-2">
                          {PSYCHOLOGY_STAGES[selectedStage].signs.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-400 mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-lg bg-white/[0.02] border border-white/5 flex items-start gap-3">
                      <AlertTriangle className={`h-5 w-5 shrink-0 ${PSYCHOLOGY_STAGES[selectedStage].zone === "green" ? "text-emerald-400" : "text-amber-400"}`} />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Khuyến nghị hành động của Quỹ (IPS action)</p>
                        <p className="text-xs text-slate-300 font-semibold">{PSYCHOLOGY_STAGES[selectedStage].action}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: STEPPER */}
          {activeTab === "stepper" && (
            <div className="space-y-6">
              <Card className="antigravity-panel border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-[#54a0ff]" /> Quy trình 5 bước đưa ra quyết định
                  </CardTitle>
                  <CardDescription>Quy trình kiểm soát rủi ro và đánh giá cơ hội trước khi phân bổ dòng vốn lớn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: "Sàng lọc vĩ mô & Chu kỳ (Macro Filters)",
                      desc: "Xác định chu kỳ lớn toàn cầu và nội địa thông qua các chỉ số CPI, GDP, lãi suất trung ương và PMI sản xuất. Tránh đi ngược xu hướng chính sách tiền tệ.",
                      example: "Khi lãi suất tạo đỉnh và SBV bắt đầu nới lỏng tiền tệ trong khi PMI cải thiện vượt 50, hệ thống báo hiệu mở cửa cơ hội mua ròng.",
                    },
                    {
                      step: 2,
                      title: "Phân tích ngành & Trọng số (Industry Weights)",
                      desc: "Lựa chọn các ngành được hưởng lợi trực tiếp từ chu kỳ vĩ mô. Mỗi ngành áp dụng một biểu đồ trọng số đặc thù cho 4 trụ cột để chấm điểm.",
                      example: "Ngành Công nghệ được tăng tỷ trọng cho Kỹ thuật và Tâm lý (50%), trong khi ngành Tiêu dùng thiết yếu dồn 50% cho trụ cột Cơ bản.",
                    },
                    {
                      step: 3,
                      title: "Đánh giá 4 Trụ Cột (4-Pillars Scoring)",
                      desc: "Tiến hành phân tích đa chiều và cho điểm từ 1.0 đến 5.0 đối với các cổ phiếu đầu ngành theo bộ tiêu chí chi tiết của ngành đó.",
                      example: "Đánh giá VCB thuộc nhóm Ngân hàng: NIM = 3.6% (Cơ bản: 4.5/5), trend vượt đỉnh (Kỹ thuật: 4.0/5), nới room (Định lượng: 4.5/5), khối ngoại mua ròng (Tâm lý: 4.0/5).",
                    },
                    {
                      step: 4,
                      title: "Kiểm tra Checklist & Rủi ro (Risk Limits)",
                      desc: "Đối chiếu điểm số với khuyến nghị Mua/Bán. Chạy checklist 5 câu hỏi loại trừ và tính toán quy mô vị thế (position sizing) dựa trên Stop Loss để quản trị rủi ro.",
                      example: "Giới hạn rủi ro mỗi lệnh tối đa 0.5% tài khoản. Nếu khoảng cách Stop Loss là 6%, khối lượng vào lệnh bằng 8.33% tổng tài khoản.",
                    },
                    {
                      step: 5,
                      title: "Nhật ký & Báo cáo (AI Journaling)",
                      desc: "Ghi chép lý do vào lệnh, cập nhật giá định kỳ, viết nhật ký để AI phân tích và rút ra bài học kinh nghiệm nhằm tối ưu hóa phương pháp.",
                      example: "Ghi nhật ký: 'Mua VCB giá 92.5 do đạt chuẩn A+ Setup ngày 27/06. Target 105, Stop Loss 88.0. Lý do: Hạ lãi suất tiền gửi kích thích tăng trưởng tín dụng.'",
                    }
                  ].map((s, idx) => {
                    const isExpanded = expandedStep === idx;
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? "bg-slate-950/50 border-white/20"
                            : "bg-slate-950/20 border-white/5 hover:bg-slate-950/40"
                        }`}
                      >
                        <button
                          onClick={() => setExpandedStep(idx)}
                          className="w-full flex items-center justify-between p-5 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                              isExpanded ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                            }`}>
                              0{s.step}
                            </span>
                            <span className="text-sm font-bold text-white">{s.title}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] border-none ${isExpanded ? "text-blue-400" : "text-slate-500"}`}>
                            {isExpanded ? "Đang xem" : "Click xem chi tiết"}
                          </Badge>
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-3.5">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Mô tả lý thuyết</p>
                              <p className="text-xs text-slate-300 leading-relaxed">{s.desc}</p>
                            </div>
                            <div className="p-3.5 rounded-lg bg-blue-500/[0.02] border border-blue-500/10">
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Ví dụ thực tế áp dụng</p>
                              <p className="text-xs text-slate-200 font-semibold">{s.example}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
      </main>
      
      {/* Right Analytics Workspace */}
      <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 z-10">
        {activeTab === "overview" && (
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chỉ báo Vĩ mô Tham chiếu</h3>
            </div>
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="font-bold text-white mb-1">Chỉ số Lạm phát (CPI)</p>
                <p className="text-slate-400 leading-relaxed">Đo lường mức độ biến động giá tiêu dùng. Lạm phát dưới 4% tạo môi trường thuận lợi để hạ lãi suất.</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="font-bold text-white mb-1">Tăng trưởng GDP</p>
                <p className="text-slate-400 leading-relaxed">Động lực tăng trưởng cốt lõi. Tốc độ trên 6% báo hiệu chu kỳ kinh doanh mở rộng mạnh mẽ.</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="font-bold text-white mb-1">Lại suất Điều hành</p>
                <p className="text-slate-400 leading-relaxed">Công cụ định hướng dòng tiền vĩ mô. Chu kỳ hạ lãi suất là chất xúc tác cực mạnh cho cổ phiếu.</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="font-bold text-white mb-1">Chỉ số Sản xuất (PMI)</p>
                <p className="text-slate-400 leading-relaxed">Sức khỏe ngành sản xuất. PMI &gt; 50 thể hiện sự mở rộng sản xuất thực tế của nền kinh tế.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "details" && (
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trọng số Đánh giá Ngành</h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{activeInd.name}</p>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-white">
                  <span>Cơ bản (Fundamentals):</span>
                  <span>{activeInd.fundamental}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${activeInd.fundamental}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-white">
                  <span>Kỹ thuật (Technicals):</span>
                  <span>{activeInd.technical}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${activeInd.technical}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-white">
                  <span>Định lượng (Quantitative):</span>
                  <span>{activeInd.quantitative}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${activeInd.quantitative}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-white">
                  <span>Tâm lý (Sentiment):</span>
                  <span>{activeInd.sentiment}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${activeInd.sentiment}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3.5 mt-2 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tiêu chí trọng tâm</p>
                <ul className="space-y-1 text-slate-400 leading-relaxed list-disc pl-4">
                  {activeInd.priorityMetrics.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "psychology" && (
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Thông điệp giai đoạn</h3>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-white">{PSYCHOLOGY_STAGES[selectedStage].name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                    PSYCHOLOGY_STAGES[selectedStage].zone === "green" 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {PSYCHOLOGY_STAGES[selectedStage].zone === "green" ? "BUY ZONE" : "SELL ZONE"}
                  </span>
                </div>
                <p className="text-slate-450 leading-relaxed">{PSYCHOLOGY_STAGES[selectedStage].description}</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hành động của Quỹ</h4>
                <p className="font-semibold text-slate-200 leading-relaxed">{PSYCHOLOGY_STAGES[selectedStage].action}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stepper" && (
          <div className="antigravity-panel p-5 space-y-4 bg-transparent">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tóm lược 5 Bước Giao dịch</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <p><span className="font-bold text-white">Bước 1:</span> Sàng lọc vĩ mô toàn cảnh thị trường.</p>
              <p><span className="font-bold text-white">Bước 2:</span> Chọn lọc và áp trọng số ngành phù hợp.</p>
              <p><span className="font-bold text-white">Bước 3:</span> Chấm điểm chi tiết cổ phiếu theo 4 trụ cột.</p>
              <p><span className="font-bold text-white">Bước 4:</span> Kiểm tra quy mô vị thế & quản trị rủi ro.</p>
              <p><span className="font-bold text-white">Bước 5:</span> Lưu nhật ký để AI giám sát tối ưu.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
