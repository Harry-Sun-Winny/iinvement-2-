import React from "react";
import { FolderOpen } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";

interface EmptyStateProps {
  message?: string;
  onReset?: () => void;
}

export default function EmptyState({ message, onReset }: EmptyStateProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const displayMessage = message || (isVi ? "Không tìm thấy dữ liệu thị trường." : "Market data not found.");

  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/8 bg-[#0d1721] px-4 py-16 text-center">
      <div className="mb-4 rounded-full bg-white/5 p-4 text-slate-400">
        <FolderOpen className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-white">
        {isVi ? "Không có dữ liệu" : "No data available"}
      </h3>
      <p className="mb-4 max-w-sm text-sm leading-6 text-slate-400">{displayMessage}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {isVi ? "Đặt lại bộ lọc" : "Reset filters"}
        </button>
      )}
    </div>
  );
}
