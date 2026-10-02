"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, ListChecks, ShieldAlert } from "lucide-react";

type BranchId = "macro" | "asset" | "behavior" | "personal" | "market" | "legal";
type Status = "missing" | "verify" | "evidence";
type Factor = { id: string; label: string; signal: string; source: string };

const BRANCHES: Array<{ id: BranchId; label: string; weight: number; factors: Factor[] }> = [
  { id: "macro", label: "Vĩ mô", weight: 20, factors: [
    ["policy-rate", "Lãi suất điều hành & lãi suất thực", "Kiểm tra chi phí vốn và định giá", "NHNN/Fed"], ["inflation", "CPI & kỳ vọng lạm phát", "Phân biệt thực tế và kỳ vọng", "GSO/BLS"], ["fx", "USD/VND, DXY & dòng vốn", "Tách doanh thu, nợ và hedge theo tiền tệ", "NHNN/Yahoo"], ["cycle", "GDP, PMI & vị trí chu kỳ", "Nhìn xu hướng 3 tháng, không chỉ 1 kỳ", "GSO/S&P Global"], ["yield", "Đường cong lợi suất & credit spread", "Cảnh báo suy thoái/thắt chặt thanh khoản", "Treasury/HNX"], ["liquidity", "M2, điều kiện tài chính & tín dụng", "Đo sức khỏe thanh khoản hệ thống", "NHTW/BIS"], ["geopolitics", "Rủi ro địa chính trị & chính sách", "Lập phương án phòng thủ thay vì dự báo chắc chắn", "GPR/EPU"], ["fiscal", "Tài khóa, nợ công & đầu tư công", "Đánh giá độ bền tăng trưởng", "IMF/Bộ Tài chính"]
  ].map(([id, label, signal, source]) => ({ id, label, signal, source })) },
  { id: "asset", label: "Tài sản", weight: 25, factors: [
    ["earnings", "Doanh thu, lợi nhuận & biên", "So với chu kỳ, ngành và hướng dẫn", "BCTC"], ["cashflow", "Dòng tiền hoạt động & FCF", "Kiểm tra chất lượng lợi nhuận", "BCTC"], ["valuation", "P/E, P/B, EV/EBITDA & DCF", "Định giá theo nhiều phương pháp", "BCTC/Peers"], ["balance", "Nợ, thanh khoản & lịch đáo hạn", "Stress test lãi suất và refinancing", "BCTC"], ["moat", "Lợi thế cạnh tranh & thị phần", "Xác minh bằng số liệu ngành", "Báo cáo ngành"], ["management", "Quản trị, phân bổ vốn & insider", "Kiểm tra giao dịch liên quan", "Công bố DN"], ["liquidity-asset", "Thanh khoản giao dịch & free float", "Tính khả năng thoát vị thế", "Sở GDCK"], ["catalyst", "Catalyst, rủi ro và thời điểm", "Có ngày, trigger và luận điểm đảo chiều", "IR/News"]
  ].map(([id, label, signal, source]) => ({ id, label, signal, source })) },
  { id: "behavior", label: "Hành vi", weight: 15, factors: [
    ["fomo", "FOMO & câu chuyện thị trường", "Có mua chỉ vì giá đang tăng không?", "Nhật ký"], ["anchoring", "Neo giá & giá vốn", "Giá vốn không phải giá trị nội tại", "Nhật ký"], ["confirmation", "Thiên kiến xác nhận", "Yêu cầu phản biện độc lập", "Red-team"], ["overconfidence", "Tự tin quá mức", "Ghi xác suất và kịch bản sai", "Checklist"], ["loss-aversion", "Ngại cắt lỗ", "Xác định ngưỡng vô hiệu luận điểm", "Kế hoạch"], ["herding", "Tâm lý bầy đàn", "Kiểm tra dữ liệu trước truyền thông", "News/Volume"], ["recency", "Thiên kiến gần đây", "So sánh 3-5 năm thay vì vài phiên", "History"], ["discipline", "Kỷ luật giải ngân", "Xác định tỷ trọng và số lần mua", "Kế hoạch"]
  ].map(([id, label, signal, source]) => ({ id, label, signal, source })) },
  { id: "personal", label: "Cá nhân", weight: 15, factors: [
    ["horizon", "Mục tiêu & thời hạn", "Khớp tài sản với thời điểm cần tiền", "Người dùng"], ["liquidity-need", "Nhu cầu tiền mặt", "Không dùng vốn ngắn hạn cho tài sản rủi ro", "Người dùng"], ["risk-budget", "Ngân sách rủi ro", "Mức lỗ tối đa chấp nhận", "Người dùng"], ["concentration", "Tập trung danh mục", "Kiểm tra tỷ trọng mã/ngành/tiền tệ", "Danh mục"], ["leverage", "Margin & đòn bẩy", "Stress test call margin", "Tài khoản"], ["tax", "Thuế, phí & chi phí cơ hội", "Dùng lợi nhuận sau phí", "Biểu phí"], ["currency", "Phơi nhiễm ngoại tệ", "Tách tài sản và nghĩa vụ theo tiền tệ", "Danh mục"], ["exit-plan", "Kế hoạch thoát vị thế", "Điều kiện chốt lời/cắt lỗ", "Kế hoạch"]
  ].map(([id, label, signal, source]) => ({ id, label, signal, source })) },
  { id: "market", label: "Thị trường", weight: 15, factors: [
    ["trend", "Xu hướng MA50/MA200", "Dùng xác nhận, không thay thế định giá", "Giá"], ["relative", "Sức mạnh tương đối ngành", "So với benchmark và peers", "Giá"], ["volume", "Khối lượng & dòng tiền", "Kiểm tra xác nhận của volume", "Sở GDCK"], ["volatility", "ATR, drawdown & VaR", "Xác định vị thế phù hợp biến động", "Giá"], ["structure", "Hỗ trợ, kháng cự & cấu trúc", "Định nghĩa điểm vào/vô hiệu", "Biểu đồ"], ["breadth", "Độ rộng thị trường", "Đánh giá môi trường risk-on/off", "Chỉ số"], ["ownership", "Tổ chức, nước ngoài & short interest", "Không suy diễn từ một nhóm nhà đầu tư", "Công bố"], ["event-risk", "Sự kiện giá: KQKD, họp, lock-up", "Gắn lịch và khoảng trống giá", "Lịch DN"]
  ].map(([id, label, signal, source]) => ({ id, label, signal, source })) },
  { id: "legal", label: "Pháp lý & rủi ro", weight: 10, factors: [
    ["ownership", "Quyền sở hữu & cấu trúc pháp nhân", "Xác minh chủ thể và quyền lợi", "Hồ sơ pháp lý"], ["disclosure", "Công bố thông tin & kiểm toán", "Kiểm tra ngoại trừ kiểm toán", "BCTC"], ["litigation", "Kiện tụng, điều tra & xử phạt", "Không bù hard-stop bằng điểm cao", "Cơ quan quản lý"], ["related-party", "Giao dịch bên liên quan", "Kiểm tra định giá và điều khoản", "Công bố DN"], ["regulation", "Rủi ro quy định & giấy phép", "Phân tích tác động đến mô hình kinh doanh", "Cơ quan quản lý"], ["counterparty", "Đối tác, nhà cung cấp & khách hàng", "Đánh giá tập trung và đứt gãy", "BCTC"], ["tail-risk", "Tail risk & gian lận", "Có kịch bản mất vốn vĩnh viễn", "Red-team"], ["data-quality", "Chất lượng dữ liệu & ngày quan sát", "Không dùng dữ liệu cũ như hiện tại", "Sổ bằng chứng"]
  ].map(([id, label, signal, source]) => ({ id, label, signal, source })) },
];

const STATUS_META: Record<Status, { label: string; className: string }> = {
  missing: { label: "Thiếu", className: "border-slate-600/40 bg-slate-700/20 text-slate-400" },
  verify: { label: "Cần kiểm chứng", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  evidence: { label: "Có bằng chứng", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
};

export function FactorMatrixPanel({ compact = false, onContextChange }: { compact?: boolean; onContextChange?: (value: string) => void }) {
  const [branchId, setBranchId] = useState<BranchId>("asset");
  const [statusById, setStatusById] = useState<Record<string, Status>>({});
  const branch = BRANCHES.find((item) => item.id === branchId) ?? BRANCHES[0];
  const statusCount = useMemo(() => {
    const values = Object.values(statusById);
    const evidence = values.filter((status) => status === "evidence").length;
    const verify = values.filter((status) => status === "verify").length;
    return { missing: 48 - evidence - verify, verify, evidence };
  }, [statusById]);

  useEffect(() => {
    if (!onContextChange) return;
    const rows = BRANCHES.flatMap((item) => item.factors.map((factor) => `${item.label} (${item.weight}%): ${factor.label} | ${statusById[factor.id] ?? "missing"} | kiểm tra: ${factor.signal} | nguồn: ${factor.source}`));
    onContextChange(rows.join("\n"));
  }, [onContextChange, statusById]);

  return <section className="antigravity-panel overflow-hidden rounded-2xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.05),rgba(15,23,42,0.38))]">
    <div className="flex flex-col gap-4 border-b border-white/8 p-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2 text-cyan-100"><ListChecks className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold uppercase tracking-[0.2em]">Ma trận yếu tố 10.0</h2></div><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">48 yếu tố lõi đại diện cho thư viện 2.049 yếu tố. Chọn trạng thái từng yếu tố để biết hồ sơ thiếu gì và đưa trực tiếp vào prompt AI.</p></div><div className="flex gap-2 text-[10px] font-bold"><span className="rounded-full border border-emerald-400/20 px-2 py-1 text-emerald-200">{statusCount.evidence} có bằng chứng</span><span className="rounded-full border border-amber-400/20 px-2 py-1 text-amber-200">{statusCount.verify} cần kiểm chứng</span></div></div>
    <div className="flex gap-2 overflow-x-auto border-b border-white/8 px-5 py-3">{BRANCHES.map((item) => <button key={item.id} type="button" onClick={() => setBranchId(item.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition active:translate-y-px ${branchId === item.id ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"}`}>{item.label} <span className="ml-1 font-mono text-cyan-300">{item.weight}%</span></button>)}</div>
    <div className={`grid gap-3 p-5 ${compact ? "md:grid-cols-2" : "lg:grid-cols-2"}`}>{branch.factors.map((factor, index) => { const status = statusById[factor.id] ?? "missing"; const meta = STATUS_META[status]; return <article key={factor.id} className="rounded-xl border border-white/7 bg-slate-950/55 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-mono text-cyan-300">{String(index + 1).padStart(2, "0")}</p><p className="mt-1 text-sm font-semibold text-white">{factor.label}</p></div><button type="button" onClick={() => setStatusById((previous) => ({ ...previous, [factor.id]: status === "missing" ? "verify" : status === "verify" ? "evidence" : "missing" }))} className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${meta.className}`}>{status === "evidence" ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : <CircleDashed className="mr-1 inline h-3 w-3" />}{meta.label}</button></div><p className="mt-3 text-xs leading-5 text-slate-400">{factor.signal}</p><p className="mt-2 text-[10px] text-slate-500">Nguồn gợi ý: {factor.source}</p></article> })}</div>
    {!compact && <div className="flex items-start gap-2 border-t border-white/8 bg-amber-400/[0.035] px-5 py-3 text-xs leading-5 text-amber-100/90"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Hard-stop pháp lý, gian lận hoặc rủi ro mất vốn vĩnh viễn không được bù bằng điểm cao ở nhánh khác.</div>}
  </section>;
}
