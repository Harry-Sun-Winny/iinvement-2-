import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const displayMessage = message || (isVi ? "Lỗi tải dữ liệu. Vui lòng thử lại sau." : "Error loading data. Please try again later.");

  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-rose-500/10 bg-rose-500/[0.03] px-4 py-12 text-center">
      <div className="mb-3 rounded-full bg-rose-500/10 p-3 text-rose-300">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
        {isVi ? "Lỗi kết nối" : "Connection error"}
      </h3>
      <p className="mb-4 max-w-sm text-sm leading-6 text-rose-200/80">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
        >
          {isVi ? "Thử lại" : "Retry"}
        </button>
      )}
    </div>
  );
}
