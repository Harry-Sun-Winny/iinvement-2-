"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { FileCheck2, FileText, Loader2, Trash2, Upload } from "lucide-react";

export type EvidenceDocument = { id: string; name: string; type: string; size: number; extractedText: string; note: string; addedAt: string };
type Props = { storageKey: string; onChange?: (documents: EvidenceDocument[]) => void; isVi: boolean };
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 12_000;
const compactText = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

async function extractText(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (["txt", "md", "csv", "json"].includes(extension ?? "")) return compactText(await file.text());
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    return compactText((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value);
  }
  if (["xlsx", "xls"].includes(extension ?? "")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return compactText(workbook.SheetNames.slice(0, 3).map((name) => `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join("\n\n"));
  }
  return "";
}

export function documentEvidenceForPrompt(documents: EvidenceDocument[]) {
  if (!documents.length) return "Không có tài liệu người dùng cung cấp.";
  return documents.map((document, index) => [`[Tài liệu ${index + 1}: ${document.name}; thêm ${document.addedAt}]`, document.note ? `Ghi chú người dùng: ${document.note}` : "Ghi chú người dùng: không có.", document.extractedText ? `Nội dung trích xuất: ${document.extractedText}` : "Không trích xuất được nội dung; chỉ dùng ghi chú người dùng và không suy diễn phần còn thiếu."].join("\n")).join("\n\n");
}

export function DocumentEvidencePanel({ storageKey, onChange, isVi }: Props) {
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { try { const saved = localStorage.getItem(storageKey); if (saved) setDocuments(JSON.parse(saved)); } catch { localStorage.removeItem(storageKey); } }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(documents)); onChange?.(documents); }, [documents, onChange, storageKey]);
  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []); if (!files.length) return; setLoading(true);
    try { const additions = await Promise.all(files.slice(0, 3).map(async (file): Promise<EvidenceDocument> => ({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, name: file.name, type: file.type || "unknown", size: file.size, extractedText: file.size <= MAX_FILE_SIZE ? await extractText(file) : "", note: "", addedAt: new Date().toLocaleDateString("vi-VN") }))); setDocuments((current) => [...current, ...additions].slice(-6)); }
    finally { setLoading(false); event.target.value = ""; }
  };
  return <section className="antigravity-panel rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-cyan-100"><FileCheck2 className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold uppercase tracking-[0.2em]">{isVi ? "Hồ sơ chứng cứ cho AI" : "AI evidence dossier"}</h2></div><p className="mt-3 text-sm leading-6 text-slate-300">{isVi ? "Thêm báo cáo, BCTC, ghi chú luận điểm hoặc bảng dữ liệu. DOCX/XLSX/TXT/CSV được trích xuất cục bộ trên trình duyệt; PDF cần ghi chú tóm tắt để AI không suy diễn nội dung chưa đọc được." : "Add reports, financial statements, thesis notes, or data tables. DOCX/XLSX/TXT/CSV are extracted locally in the browser; add a summary for PDFs so the AI does not infer unread content."}</p><p className="mt-2 text-xs leading-5 text-slate-500">{isVi ? "Tối đa 6 tài liệu, 8 MB/tài liệu, chỉ đưa phần trích xuất và ghi chú vào prompt." : "Up to 6 documents, 8 MB each; only extracted text and notes enter the prompt."}</p></div><button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{isVi ? "Thêm tài liệu" : "Add documents"}</button><input ref={inputRef} className="hidden" type="file" multiple accept=".docx,.xlsx,.xls,.csv,.txt,.md,.json,.pdf" onChange={handleFiles} /></div>{documents.length > 0 && <div className="mt-5 space-y-3">{documents.map((document) => <div key={document.id} className="rounded-xl border border-white/7 bg-slate-950/65 p-4"><div className="flex gap-3"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="truncate text-sm font-semibold text-white">{document.name}</p><button type="button" onClick={() => setDocuments((items) => items.filter((item) => item.id !== document.id))} className="text-slate-500 hover:text-rose-300" aria-label={isVi ? "Xóa tài liệu" : "Remove document"}><Trash2 className="h-4 w-4" /></button></div><p className="mt-1 text-xs text-slate-500">{document.extractedText ? `${document.extractedText.length.toLocaleString()} ${isVi ? "ký tự đã trích xuất" : "characters extracted"}` : isVi ? "Chưa có nội dung trích xuất — cần ghi chú" : "No extracted content — add a note"}</p><textarea value={document.note} onChange={(event) => setDocuments((items) => items.map((item) => item.id === document.id ? { ...item, note: event.target.value.slice(0, 2000) } : item))} placeholder={isVi ? "Ghi chú: nguồn, kỳ dữ liệu, luận điểm cần kiểm chứng, giả định..." : "Notes: source, data period, thesis to verify, assumptions..."} className="mt-3 min-h-18 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-300/40 focus:outline-none" /></div></div></div>)}</div>}</section>;
}
