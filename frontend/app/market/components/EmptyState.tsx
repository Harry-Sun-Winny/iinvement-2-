import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  onReset?: () => void;
}

export default function EmptyState({ message = "Không tìm thấy dữ liệu thị trường.", onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/5 bg-white/[0.01] rounded-2xl">
      <div className="rounded-full bg-white/5 p-4 text-slate-400 mb-4 animate-bounce">
        <FolderOpen className="h-8 w-8" />
      </div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">No Data Available</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">{message}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
        >
          Đặt lại bộ lọc
        </button>
      )}
    </div>
  );
}
