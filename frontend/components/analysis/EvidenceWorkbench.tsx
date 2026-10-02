"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, FileCheck2, Plus, Trash2, WandSparkles } from "lucide-react";

export type EvidenceRow = {
  id: string;
  branch: "macro" | "asset" | "behavior" | "personal" | "market" | "legal";
  claim: string;
  value: string;
  unit: string;
  period: string;
  source: string;
  locator: string;
  asOf: string;
  knownAt: string;
  quality: "primary" | "secondary" | "estimate";
  stance: "support" | "counter" | "conflict" | "neutral";
  reviewStatus: "pending" | "reviewed" | "disputed";
};

type Props = { isVi: boolean; assetClass?: string; onChange: (rows: EvidenceRow[]) => void; onDocumentText: (text: string) => void };

type AssetDocumentTemplate = {
  label: string;
  requiredDocuments: string[];
  requiredMetrics: string[];
  specialist: string;
  example: string;
};

const assetDocumentTemplates: Record<string, AssetDocumentTemplate> = {
  stock: { label: "Cổ phiếu", requiredDocuments: ["BCTC kiểm toán 3-5 năm", "BCTC quý gần nhất", "Báo cáo thường niên", "Thuyết minh và tài liệu ĐHĐCĐ"], requiredMetrics: ["Doanh thu, EBIT/EBITDA, LNST", "CFO, CAPEX, FCF", "Tiền, nợ vay, số cổ phiếu pha loãng", "Biên lợi nhuận, ROIC/ROE, P/E, EV/EBITDA"], specialist: "Kế toán/analyst xác nhận số điều chỉnh; AI chỉ trích bảng và chỉ rõ trang.", example: "asset | FCF_TTM | 1250000000000 | VND | FY2025 | BCTC kiểm toán | trang 42 | 2026-03-31 | primary" },
  etf: { label: "ETF / chỉ số", requiredDocuments: ["Factsheet mới nhất", "Danh mục holdings", "Prospectus", "Báo cáo tracking error"], requiredMetrics: ["AUM và NAV/CCQ", "Expense ratio", "Tracking difference/error", "Top holdings, concentration, spread"], specialist: "Fund analyst hoặc đơn vị quản lý quỹ xác nhận NAV, tracking và cơ chế tạo/lập quỹ.", example: "asset | tracking_error_1y | 0.42 | % | 1Y | factsheet | trang 2 | 2026-06-30 | primary" },
  crypto: { label: "Crypto", requiredDocuments: ["Whitepaper/technical docs", "Tokenomics và lịch unlock", "Audit smart contract", "Dữ liệu on-chain và exchange liquidity"], requiredMetrics: ["Circulating/total supply", "Unlock 12 tháng", "TVL, fees/revenue, active users", "Top-holder concentration, volume, custody risk"], specialist: "Blockchain analyst kiểm tra contract/on-chain; luật sư xác nhận pháp lý và quyền sở hữu.", example: "asset | token_unlock_12m | 18.5 | % circulating | 12M | vesting dashboard | URL | 2026-07-01 | primary" },
  commodity: { label: "Hàng hóa", requiredDocuments: ["Chuỗi spot/futures", "Báo cáo cung cầu", "Tồn kho", "COT/positioning và chi phí sản xuất"], requiredMetrics: ["Sản lượng, tiêu thụ, tồn kho", "Curve contango/backwardation", "Marginal cost", "Open interest và net positioning"], specialist: "Chuyên viên hàng hóa xác nhận đơn vị, contract month và seasonality.", example: "market | inventory_weekly | 432.1 | million barrels | week | EIA | table 1 | 2026-07-03 | primary" },
  gold: { label: "Vàng", requiredDocuments: ["Giá XAU/USD và tỷ giá", "Bảng giá SJC/vàng nhẫn", "Dự trữ/ETF flows", "Chính sách và hóa đơn/chứng nhận"], requiredMetrics: ["Giá thế giới quy đổi", "Premium trong nước", "Real yield, DXY", "Spread mua-bán và chi phí lưu giữ"], specialist: "Đơn vị kinh doanh vàng xác nhận tuổi vàng/chứng từ; analyst kiểm tra công thức quy đổi.", example: "asset | domestic_premium | 14.2 | % | spot | SJC + Kitco + FX | URLs | 2026-07-12 | calculated" },
  bond: { label: "Trái phiếu", requiredDocuments: ["Prospectus/điều khoản phát hành", "BCTC tổ chức phát hành", "Covenant", "Tài sản bảo đảm và xếp hạng tín nhiệm"], requiredMetrics: ["Coupon, YTM, duration", "Lịch đáo hạn và DSCR", "Covenant headroom", "Recovery/LTV tài sản bảo đảm"], specialist: "Luật sư đọc covenant; credit analyst xác nhận dòng tiền trả nợ và recovery.", example: "legal | covenant_dscr | 1.35 | x | FY2025 | bond prospectus | điều 8.2 | 2026-03-31 | primary" },
  real_estate: { label: "Bất động sản", requiredDocuments: ["Sổ/GCN và hồ sơ quy hoạch", "Hợp đồng mua bán/thuê", "Chứng thư thẩm định", "Dòng tiền, thuế phí và ảnh hiện trạng"], requiredMetrics: ["Diện tích pháp lý/sử dụng", "Giá/m² và 3-5 tài sản so sánh", "NOI, cap rate, occupancy", "LTV, lãi vay, thời gian thanh khoản"], specialist: "Luật sư đất đai xác minh pháp lý; thẩm định viên xác nhận so sánh và hiện trạng.", example: "asset | comparable_price_m2 | 68500000 | VND/m2 | 3 comps | chứng thư thẩm định | trang 12 | 2026-06-15 | primary" },
  reit: { label: "REIT", requiredDocuments: ["BCTC và supplemental report", "Danh mục bất động sản", "Lease maturity", "NAV appraisal"], requiredMetrics: ["NOI, FFO/AFFO", "Occupancy và WALE", "Debt/EBITDA, maturity", "NAV, cap rate và discount/premium"], specialist: "REIT analyst xác nhận FFO adjustments; thẩm định viên kiểm tra NAV/cap rate.", example: "asset | affo_per_share | 4.82 | USD/share | FY2025 | supplemental | trang 18 | 2026-02-28 | primary" },
  forex: { label: "Ngoại hối", requiredDocuments: ["Chuỗi tỷ giá spot/forward", "Lãi suất hai đồng tiền", "BOP/dự trữ ngoại hối", "Bản đồ dòng tiền theo tiền tệ"], requiredMetrics: ["Vị thế ròng từng đồng tiền", "Forward points/carry", "Volatility/correlation", "Hedge ratio và kỳ hạn"], specialist: "Treasury/FX analyst xác nhận vị thế ròng, settlement và hedge accounting.", example: "macro | net_usd_exposure_6m | -250000 | USD | 6M | treasury ledger | sheet FX | 2026-07-12 | primary" },
  fund: { label: "Quỹ đầu tư", requiredDocuments: ["Prospectus", "Factsheet", "Báo cáo danh mục", "Báo cáo phí và benchmark"], requiredMetrics: ["NAV/AUM", "Return và drawdown", "Sharpe/volatility", "Phí, turnover, concentration"], specialist: "Fund analyst xác minh benchmark, survivorship bias và phương pháp tính lợi nhuận.", example: "asset | max_drawdown_3y | -18.4 | % | 3Y | fund report | trang 4 | 2026-06-30 | primary" },
  private_asset: { label: "Tài sản tư nhân", requiredDocuments: ["Cap table/quyền sở hữu", "BCTC và bank statements", "Hợp đồng trọng yếu", "Term sheet và due-diligence report"], requiredMetrics: ["Revenue/EBITDA/FCF", "Net debt", "Dilution và liquidation preference", "Comparable transactions và exit assumptions"], specialist: "Kế toán forensic, luật sư và chuyên viên ngành cùng xác nhận; không chỉ dựa pitch deck.", example: "legal | fully_diluted_ownership | 6.8 | % | post-money | cap table signed | sheet 1 | 2026-07-01 | primary" },
  other: { label: "Tài sản khác", requiredDocuments: ["Chứng từ quyền sở hữu", "Chứng thư thẩm định", "Lịch sử giao dịch", "Chi phí nắm giữ/bảo hiểm"], requiredMetrics: ["Giá tham chiếu và phương pháp", "Thanh khoản/thời gian bán", "Chi phí toàn phần", "Rủi ro mất mát/pháp lý"], specialist: "Chuyên gia đúng ngành xác nhận tính xác thực và phương pháp thẩm định.", example: "asset | appraised_value | 1500000000 | VND | current | appraisal certificate | trang 1 | 2026-07-01 | primary" },
};

const labels = {
  macro: "Vĩ mô",
  asset: "Tài sản",
  behavior: "Hành vi",
  personal: "Cá nhân",
  market: "Thị trường",
  legal: "Pháp lý & rủi ro",
};

const newRow = (): EvidenceRow => ({
  id: `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  branch: "asset",
  claim: "",
  value: "",
  unit: "",
  period: "",
  source: "",
  locator: "",
  asOf: "",
  knownAt: new Date().toISOString().slice(0, 10),
  quality: "primary",
  stance: "support",
  reviewStatus: "pending",
});

export function EvidenceWorkbench({ isVi, assetClass = "stock", onChange, onDocumentText }: Props) {
  const [rows, setRows] = useState<EvidenceRow[]>([newRow()]);
  const [documents, setDocuments] = useState<Array<{ name: string; text: string; warning?: string }>>([]);
  const [templateCopied, setTemplateCopied] = useState(false);
  const template = assetDocumentTemplates[assetClass] ?? assetDocumentTemplates.other;
  useEffect(() => onChange(rows), [onChange, rows]);
  useEffect(() => onDocumentText(documents.map((document) => `TÀI LIỆU: ${document.name}\n${document.text}`).join("\n\n").slice(0, 30000)), [documents, onDocumentText]);

  const audit = useMemo(() => {
    const complete = rows.filter((row) => row.claim.trim() && row.value.trim() && row.unit.trim() && row.source.trim() && row.locator.trim() && row.asOf && row.knownAt).length;
    const primary = rows.filter((row) => row.quality === "primary" && row.source.trim()).length;
    const coveredBranches = new Set(rows.filter((row) => row.claim.trim()).map((row) => row.branch)).size;
    return { complete, primary, coveredBranches };
  }, [rows]);
  const standardTemplateText = useMemo(() => `KHUNG HỒ SƠ THẨM ĐỊNH - ${template.label.toUpperCase()}

[01_DINH_DANH]
asset_name:
symbol_or_id:
asset_class: ${assetClass}
currency:
analysis_as_of: YYYY-MM-DD
holding_horizon:
document_owner:
version:

[02_TAI_LIEU_BAT_BUOC]
${template.requiredDocuments.map((item, index) => `${index + 1}. ${item}: [tên file | kỳ | ngày | nguồn | trạng thái]`).join("\n")}

[03_CHI_TIEU_BAT_BUOC]
${template.requiredMetrics.map((item, index) => `${index + 1}. ${item}: [giá trị | đơn vị | kỳ | so sánh | nguồn | trang]`).join("\n")}

[04_BANG_BANG_CHUNG_CSV]
branch,claim,value,unit,period,comparison,source,source_locator,as_of,quality,status
${template.example}

[05_GIA_DINH_VA_PHEP_TINH]
assumption_name | base | bull | bear | rationale | owner
calculation_name | formula | substituted_inputs | result | unit | sanity_check

[06_PHAN_CHUNG_VA_DU_LIEU_THIEU]
counter_thesis | supporting_source | invalidation_trigger | decision_impact
missing_field | required_format | preferred_source | validation_owner | deadline

[07_XAC_NHAN]
Prepared by:
Checked by: ${template.specialist}
Checked date: YYYY-MM-DD
Unresolved warnings:
`, [assetClass, template]);

  async function copyStandardTemplate() {
    await navigator.clipboard.writeText(standardTemplateText);
    setTemplateCopied(true);
    window.setTimeout(() => setTemplateCopied(false), 1800);
  }

  function update(id: string, patch: Partial<EvidenceRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function importDocuments(files: FileList | null) {
    if (!files) return;
    const imported = await Promise.all([...files].map(async (file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      try {
        if (ext === "docx") {
          // @ts-ignore
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          return { name: file.name, text: result.value.trim() || "Không trích xuất được nội dung văn bản." };
        }
        if (["txt", "md", "csv"].includes(ext ?? "")) return { name: file.name, text: (await file.text()).trim() };
        return { name: file.name, text: "", warning: "Định dạng này chưa thể trích xuất trên trình duyệt. Hãy dùng DOCX, TXT, MD hoặc CSV." };
      } catch {
        return { name: file.name, text: "", warning: "Không thể đọc tài liệu này. Hãy thử lưu lại dưới dạng DOCX hoặc TXT." };
      }
    }));
    setDocuments((current) => [...current, ...imported]);
  }

  return <section className="antigravity-panel overflow-hidden rounded-2xl border border-white/8 bg-white/[0.012]">
    <div className="flex flex-col gap-4 border-b border-white/8 p-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-bold text-white">{isVi ? "Sổ bằng chứng kiểm toán được" : "Auditable evidence ledger"}</p>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{isVi ? "Mỗi kết luận quan trọng phải có giá trị quan sát, nguồn, ngày dữ liệu và cấp chất lượng. Những dòng chưa đủ bốn trường không được AI xem là bằng chứng đã xác minh." : "Every material claim needs an observed value, source, as-of date and quality tier. Incomplete rows are not treated as verified evidence."}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/8 px-3 py-2 text-emerald-200">{audit.complete}/{rows.length} {isVi ? "dòng hoàn chỉnh" : "complete"}</span>
        <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/8 px-3 py-2 text-cyan-200">{audit.coveredBranches}/6 {isVi ? "nhánh có bằng chứng" : "branches covered"}</span>
        <span className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-300">{audit.primary} {isVi ? "nguồn sơ cấp" : "primary sources"}</span>
      </div>
    </div>

    <div className="overflow-x-auto">
      <div className="min-w-[2050px]">
        <div className="grid grid-cols-[130px_1.2fr_170px_100px_120px_180px_150px_130px_130px_110px_120px_120px_40px] gap-2 border-b border-white/5 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <span>{isVi ? "Nhánh" : "Branch"}</span><span>{isVi ? "Luận điểm / biến" : "Claim / variable"}</span><span>{isVi ? "Giá trị" : "Value"}</span><span>{isVi ? "Đơn vị" : "Unit"}</span><span>{isVi ? "Kỳ" : "Period"}</span><span>{isVi ? "Nguồn" : "Source"}</span><span>Locator</span><span>Valid as-of</span><span>Known at</span><span>{isVi ? "Chất lượng" : "Quality"}</span><span>{isVi ? "Lập trường" : "Stance"}</span><span>{isVi ? "Review" : "Review"}</span><span />
        </div>
        {rows.map((row) => {
          const complete = Boolean(row.claim.trim() && row.value.trim() && row.unit.trim() && row.source.trim() && row.locator.trim() && row.asOf && row.knownAt);
          const input = "w-full rounded-lg border border-white/8 bg-slate-950/65 px-2.5 py-2 text-xs text-white outline-none focus:border-cyan-300/40";
          return <div key={row.id} className="grid grid-cols-[130px_1.2fr_170px_100px_120px_180px_150px_130px_130px_110px_120px_120px_40px] gap-2 border-b border-white/5 px-5 py-2.5 last:border-b-0">
            <select value={row.branch} onChange={(event) => update(row.id, { branch: event.target.value as EvidenceRow["branch"] })} className={input}>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
            <input value={row.claim} onChange={(event) => update(row.id, { claim: event.target.value })} placeholder={isVi ? "VD: tăng trưởng doanh thu 3 năm" : "e.g. 3-year revenue growth"} className={input} />
            <input value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} placeholder={isVi ? "Giá trị quan sát" : "Observed value"} className={input} />
            <input value={row.unit} onChange={(event) => update(row.id, { unit: event.target.value })} placeholder="VND, %, x" className={input} />
            <input value={row.period} onChange={(event) => update(row.id, { period: event.target.value })} placeholder="FY2025, TTM" className={input} />
            <input value={row.source} onChange={(event) => update(row.id, { source: event.target.value })} placeholder={isVi ? "BCTC, SBV, GSO, URL..." : "Filing, central bank, URL..."} className={input} />
            <input value={row.locator} onChange={(event) => update(row.id, { locator: event.target.value })} placeholder={isVi ? "Trang/bảng/API field" : "Page/table/API field"} className={input} />
            <input type="date" value={row.asOf} onChange={(event) => update(row.id, { asOf: event.target.value })} className={input} />
            <input type="date" value={row.knownAt} onChange={(event) => update(row.id, { knownAt: event.target.value })} className={input} />
            <select value={row.quality} onChange={(event) => update(row.id, { quality: event.target.value as EvidenceRow["quality"] })} className={input}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="estimate">Estimate</option></select>
            <select value={row.stance} onChange={(event) => update(row.id, { stance: event.target.value as EvidenceRow["stance"] })} className={input}><option value="support">Support</option><option value="counter">Counter</option><option value="conflict">Conflict</option><option value="neutral">Neutral</option></select>
            <select value={row.reviewStatus} onChange={(event) => update(row.id, { reviewStatus: event.target.value as EvidenceRow["reviewStatus"] })} className={input}><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="disputed">Disputed</option></select>
            <button type="button" aria-label={isVi ? "Xóa bằng chứng" : "Remove evidence"} onClick={() => setRows((current) => current.length === 1 ? [newRow()] : current.filter((item) => item.id !== row.id))} className="grid place-items-center text-slate-600 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
            <div className={`col-span-13 flex items-center gap-1.5 text-[10px] ${complete ? "text-emerald-300" : "text-amber-300"}`}>{complete ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{complete ? `${isVi ? "Đủ provenance" : "Provenance complete"} · ${row.quality}` : (isVi ? "Thiếu unit, locator hoặc bitemporal fields" : "Missing unit, locator or bitemporal fields")}</div>
          </div>;
        })}
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-white/8 px-5 py-4">
      <p className="text-xs text-slate-500">{isVi ? "Khuyến nghị: tối thiểu một nguồn sơ cấp cho mỗi kết luận có thể thay đổi quyết định." : "Recommendation: at least one primary source for each decision-changing claim."}</p>
      <button type="button" onClick={() => setRows((current) => [...current, newRow()])} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/12 active:translate-y-px"><Plus className="h-3.5 w-3.5" />{isVi ? "Thêm bằng chứng" : "Add evidence"}</button>
    </div>
    <div className="border-t border-white/8 bg-slate-950/35 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-white">{isVi ? "Tài liệu bằng chứng" : "Evidence documents"}</p><p className="mt-1 text-xs text-slate-500">{isVi ? "Tải Word, TXT, Markdown hoặc CSV. Nội dung DOCX sẽ được trích xuất tại máy và đưa vào prompt AI." : "Upload Word, TXT, Markdown or CSV. DOCX text is extracted locally and included in the AI prompt."}</p></div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"><Plus className="h-3.5 w-3.5" />{isVi ? "Thêm tài liệu" : "Add document"}<input type="file" accept=".docx,.txt,.md,.csv" multiple onChange={(event) => void importDocuments(event.target.files)} className="sr-only" /></label>
      </div>
      {documents.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{documents.map((document, index) => <div key={`${document.name}-${index}`} className="rounded-lg border border-white/8 bg-slate-950/60 px-3 py-2.5"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-white">{document.name}</p><button type="button" onClick={() => setDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div><p className={`mt-1 text-[11px] ${document.warning ? "text-amber-300" : "text-emerald-300"}`}>{document.warning ?? `${document.text.length.toLocaleString()} ký tự đã trích xuất`}</p></div>)}</div>}
      <div className="mt-5 rounded-xl border border-cyan-300/20 bg-slate-950/55 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{isVi ? `Khung đầu vào chuẩn: ${template.label}` : `Standard input kit: ${template.label}`}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">{isVi ? "Khung này tự đổi theo loại tài sản đã chọn ở đầu trang. Điền đủ 7 khối, lưu DOCX/TXT/CSV rồi mới tải lên." : "This kit follows the asset type selected above. Complete all seven blocks before upload."}</p>
          </div>
          <button type="button" onClick={() => void copyStandardTemplate()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/15 active:translate-y-px"><Clipboard className="h-3.5 w-3.5" />{templateCopied ? (isVi ? "Đã sao chép khung" : "Template copied") : (isVi ? "Sao chép khung chuẩn" : "Copy standard template")}</button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-slate-950/65 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">A · {isVi ? "Bộ hồ sơ bắt buộc" : "Required document pack"}</p>
            <div className="mt-3 space-y-2">{template.requiredDocuments.map((document, index) => <div key={document} className="flex gap-2 text-xs leading-5 text-slate-300"><span className="font-mono text-slate-500">{String(index + 1).padStart(2, "0")}</span><span>{document}</span></div>)}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/65 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">B · {isVi ? "Chỉ tiêu phải có" : "Required metrics"}</p>
            <div className="mt-3 space-y-2">{template.requiredMetrics.map((metric, index) => <div key={metric} className="flex gap-2 text-xs leading-5 text-slate-300"><span className="font-mono text-slate-500">{String(index + 1).padStart(2, "0")}</span><span>{metric}</span></div>)}</div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/8 bg-slate-950/65 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">C · {isVi ? "Một dòng dữ liệu hợp lệ" : "Valid evidence-row format"}</p>
          <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-slate-300">branch | claim | value | unit | period | source | page/URL | as_of | quality</p>
          <p className="mt-2 overflow-x-auto whitespace-nowrap rounded-lg border border-emerald-300/10 bg-emerald-300/[0.04] px-3 py-2 font-mono text-[11px] text-emerald-200">{template.example}</p>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4"><p className="text-xs font-semibold text-amber-100">{isVi ? "Người xác nhận cuối" : "Final validation owner"}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">{template.specialist}</p></div>
          <div className="rounded-xl border border-white/8 bg-slate-950/65 p-4"><p className="text-xs font-semibold text-white">{isVi ? "7 khối bắt buộc trong file" : "Seven required file sections"}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">01 Định danh · 02 Tài liệu bắt buộc · 03 Chỉ tiêu · 04 Bảng bằng chứng · 05 Giả định & phép tính · 06 Phản chứng & dữ liệu thiếu · 07 Người lập/kiểm tra.</p></div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100"><FileCheck2 className="h-4 w-4 text-cyan-300" />{isVi ? "Tài liệu đạt chuẩn cần có gì?" : "What makes a document usable?"}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[11px] leading-5 text-slate-400">
            <div><p className="font-semibold text-white">1. {isVi ? "Định danh" : "Identity"}</p><p>{isVi ? "Tên tài sản, kỳ báo cáo, đơn vị tiền, ngày chốt dữ liệu và phiên bản tài liệu." : "Asset, period, currency, as-of date and document version."}</p></div>
            <div><p className="font-semibold text-white">2. {isVi ? "Số liệu gốc" : "Raw facts"}</p><p>{isVi ? "Giữ nguyên bảng, đơn vị, chú thích, URL và số trang. Không chỉ gửi phần tóm tắt." : "Keep tables, units, notes, URLs and page numbers, not only summaries."}</p></div>
            <div><p className="font-semibold text-white">3. {isVi ? "Phạm vi" : "Scope"}</p><p>{isVi ? "Ghi rõ dữ liệu lịch sử, dự phóng hay giả định; nêu phần nào chưa kiểm toán." : "Label historical, forecast or assumed data and unaudited sections."}</p></div>
            <div><p className="font-semibold text-white">4. {isVi ? "Phản chứng" : "Counter-evidence"}</p><p>{isVi ? "Kèm ít nhất một nguồn trái chiều hoặc rủi ro có thể làm sai luận điểm." : "Include at least one dissenting source or thesis-breaking risk."}</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white"><WandSparkles className="h-4 w-4 text-cyan-300" />{isVi ? "Đưa cho ai và yêu cầu sửa thế nào?" : "Who should process it and how?"}</div>
          <ol className="mt-3 space-y-2 text-[11px] leading-5 text-slate-400">
            <li><span className="font-mono text-cyan-300">01</span> {isVi ? "Đưa DOCX/CSV cho ChatGPT, Claude hoặc model đọc tài liệu dài; yêu cầu trích nguyên số, đơn vị, kỳ và trang nguồn." : "Send DOCX/CSV to a long-context model and request exact values, units, periods and pages."}</li>
            <li><span className="font-mono text-cyan-300">02</span> {isVi ? "Yêu cầu trả bảng: Nhánh | Luận điểm | Giá trị | Nguồn | Ngày | Chất lượng. Không cho AI tự điền số thiếu." : "Request: Branch | Claim | Value | Source | Date | Quality. Never let AI invent missing values."}</li>
            <li><span className="font-mono text-cyan-300">03</span> {isVi ? "Dán từng dòng vào sổ phía trên; sửa đơn vị và ngày ngay tại đây. Dòng thiếu nguồn chỉ là giả định." : "Paste rows into the ledger above; correct units and dates here. Unsourced rows remain assumptions."}</li>
            <li><span className="font-mono text-cyan-300">04</span> {isVi ? "Sau khi đủ dữ liệu, copy Prompt phân tích. AI sẽ dùng tài liệu và sổ bằng chứng để tính từng nhánh." : "Once complete, copy the analysis prompt so the model can score each branch from the ledger and documents."}</li>
          </ol>
        </div>
      </div>
    </div>
  </section>;
}
