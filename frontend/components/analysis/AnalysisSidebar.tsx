"use client";

import { memo } from "react";
import { BarChart3, Bot, LogOut, User } from "lucide-react";

function AnalysisSidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="app-sidebar fixed flex h-full w-64 flex-col gap-2 p-5">
      <div className="mb-10 px-2">
        <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded rainbow-bg text-xs font-black text-white">↗</span><h1 className="text-xl font-black text-white">Investment</h1></div>
        <p className="mt-1 text-sm text-slate-400">Platform</p>
      </div>
      <button onClick={() => window.location.href = "/"} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-[#54a0ff]"><BarChart3 className="h-4 w-4" />Dashboard</button>
      <button className="flex items-center gap-3 rounded-lg rainbow-bg px-4 py-3 text-sm font-bold text-white"><Bot className="h-4 w-4" />AI Analysis</button>
      <button onClick={() => window.location.href = "/account"} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-[#54a0ff]"><User className="h-4 w-4" />Tài khoản</button>
      <button onClick={onLogout} className="mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400"><LogOut className="h-4 w-4" />Đăng xuất</button>
    </aside>
  );
}

export default memo(AnalysisSidebar);
