"use client";

import React, { useRef, useState } from "react";
import { format } from "date-fns";
import { Download, FileText, Paperclip, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useJournal } from "@/hooks/useJournal";

interface JournalPanelProps {
  symbol?: string;
  portfolioId: string;
  aiResult?: string;
  aiChartImages?: string[];
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
  symbol,
  portfolioId,
  aiResult,
}) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  const { entries, isLoading, createEntry, saveAIAnalysis } = useJournal(portfolioId, symbol);
  const [newEntry, setNewEntry] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveAI = async () => {
    if (!aiResult) return;
    setIsSubmitting(true);
    try {
      await saveAIAnalysis(aiResult, captureRef);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = e.target.files;
    if (nextFiles && nextFiles.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(nextFiles)]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!newEntry.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      await createEntry({
        entry_type: "manual_note",
        title: "Ghi chú thủ công",
        content: newEntry,
        files,
      });
      setNewEntry("");
      setFiles([]);
      toast.success("Đã thêm ghi chú");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sticky top-8 flex h-[600px] flex-col overflow-hidden rounded-xl border border-[#1A2540] bg-[#0D1528] shadow-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-[#1A2540] bg-[#141B30] px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#E7E9EE]">
            {symbol ? `Nhật ký — ${symbol}` : "Nhật ký toàn bộ danh mục"}
          </h2>
        </div>
        {aiResult && (
          <button
            onClick={handleSaveAI}
            disabled={isSubmitting}
            className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            title="Lưu kết quả phân tích AI hiện tại vào nhật ký"
          >
            <Download size={12} />
            Lưu AI
          </button>
        )}
      </div>

      <div ref={captureRef} className="absolute -left-[9999px] top-0 w-[600px] bg-[#0D1528] p-6 text-xs text-[#E7E9EE] whitespace-pre-wrap">
        {aiResult}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <div className="mt-4 text-center text-xs text-[#6B7FA3]">Đang tải...</div>
        ) : entries.length === 0 ? (
          <div className="mt-10 text-center text-xs italic text-[#6B7FA3]">
            Chưa có ghi chú nào...
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-[#1A2540] bg-[#141B30] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-blue-400">{entry.title}</span>
                <span className="text-[10px] text-[#6B7FA3]">
                  {format(new Date(entry.created_at), "dd/MM HH:mm")}
                </span>
              </div>
              <p className="mb-2 whitespace-pre-wrap text-xs text-[#E7E9EE]">{entry.content}</p>
              {entry.attachments && entry.attachments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.attachments.map((attachment) => {
                    const attachmentUrl = attachment.public_url
                      ? attachment.public_url.startsWith("http")
                        ? attachment.public_url
                        : `${apiBaseUrl}${attachment.public_url}`
                      : undefined;
                    const looksLikeImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(attachment.file_name);
                    const isImage = attachmentUrl
                      ? attachmentUrl.startsWith("data:image/") || looksLikeImage
                      : false;

                    return (
                      <div key={attachment.id} className="relative group">
                        {isImage && attachmentUrl ? (
                          <img
                            src={attachmentUrl}
                            alt={attachment.file_name}
                            className="max-h-[80px] max-w-[120px] cursor-pointer rounded border border-[#1A2540] object-cover transition-all hover:border-blue-500"
                            onClick={() => {
                              const w = window.open();
                              if (w) {
                                w.document.write(`<img src="${attachmentUrl}" style="max-width:100%; height:auto;" />`);
                              }
                            }}
                            title="Nhấn để phóng to"
                          />
                        ) : attachmentUrl ? (
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex max-w-[150px] items-center gap-1 truncate rounded border border-[#1A2540] bg-[#0D1528] px-2 py-1 text-[10px] text-blue-400 hover:text-blue-300"
                          >
                            <Paperclip size={10} /> {attachment.file_name}
                          </a>
                        ) : (
                          <div className="flex max-w-[180px] items-center gap-1 truncate rounded border border-[#1A2540] bg-[#0D1528] px-2 py-1 text-[10px] text-[#6B7FA3]">
                            <Paperclip size={10} /> {attachment.file_name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                entry.attachment_count > 0 && (
                  <div className="flex w-fit items-center gap-1 rounded border border-[#1A2540] bg-[#0D1528] px-2 py-1 text-[10px] text-[#6B7FA3]">
                    <Paperclip size={10} /> Đính kèm: {entry.attachment_count} tệp
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-[#1A2540] bg-[#141B30] p-3">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-1 rounded border border-[#1A2540] bg-[#0D1528] px-2 py-1 text-[10px] text-[#E7E9EE]"
              >
                <Paperclip size={10} className="text-[#6B7FA3]" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button onClick={() => removeFile(index)} className="ml-1 text-rose-400 hover:text-rose-500">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mb-0.5 rounded-lg border border-[#1A2540] bg-[#0D1528] p-2 text-[#6B7FA3] transition-colors hover:text-[#E7E9EE]"
            title="Đính kèm file"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Viết ghi chú mới..."
            className="min-h-[60px] max-h-[120px] flex-1 resize-y rounded-lg border border-[#1A2540] bg-[#0D1528] p-2 text-xs text-[#E7E9EE] placeholder-[#6B7FA3] focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!newEntry.trim() && files.length === 0)}
            className="mb-0.5 flex items-center gap-1 rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {isSubmitting && <span className="text-[10px]">...</span>}
          </button>
        </div>
        <div className="mt-2 text-[10px] text-[#6B7FA3]">
          Nhấn Enter để gửi, Shift + Enter để xuống dòng
        </div>
      </div>
    </div>
  );
};
