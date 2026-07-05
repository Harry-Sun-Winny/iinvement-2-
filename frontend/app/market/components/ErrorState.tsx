import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Lỗi tải dữ liệu. Vui lòng thử lại sau.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-red-500/10 bg-red-500/[0.02] rounded-2xl">
      <div className="rounded-full bg-red-500/10 p-3 text-red-400 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Connection Error</h3>
      <p className="text-xs text-red-400/80 max-w-sm mb-4 leading-relaxed font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
