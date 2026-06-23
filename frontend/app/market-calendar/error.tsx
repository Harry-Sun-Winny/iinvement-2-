"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-screen place-items-center bg-[#050816] p-4"><Card className="max-w-md border-red-500/20 bg-red-500/10"><CardContent className="p-6 text-center"><AlertTriangle className="mx-auto h-9 w-9 text-red-400" /><h1 className="mt-4 text-lg font-semibold text-white">Market Calendar gặp lỗi</h1><p className="mt-2 text-sm text-slate-400">Không thể hiển thị dữ liệu lúc này. Hãy thử tải lại.</p><Button className="mt-5" onClick={reset}>Thử lại</Button></CardContent></Card></div>;
}
