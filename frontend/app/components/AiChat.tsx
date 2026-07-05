"use client";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    typeof (error as { type?: unknown }).type === "string"
  ) {
    return `Yeu cau bi gian doan (${String((error as { type: string }).type)}).`;
  }

  return "thu lai";
}

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!res.ok) {
        let apiError = "Khong the xu ly yeu cau luc nay";

        try {
          const payload = await res.json();
          if (payload?.error && typeof payload.error === "string") {
            apiError = payload.error;
          }
        } catch {
          // Keep the fallback message when the response body is not JSON.
        }

        throw new Error(apiError);
      }

      const data = await res.json();
      const assistantText = data.error
        ? `Loi: ${data.error}`
        : data.content ?? "Khong co phan hoi";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (error: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Loi ket noi: ${getErrorMessage(error)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rainbow-bg hover:scale-110 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 rainbow-glow"
      >
        {open ? "x" : "AI"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-[var(--panel)] border border-[var(--border)] rounded-[14px] shadow-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--card)] flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg rainbow-bg text-white text-xs font-black">
              AI
            </div>
            <div>
              <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                AI Assistant <span className="text-[10px] uppercase tracking-widest font-black rainbow-text">MEMU</span>
              </p>
              <p className="text-[11px] text-slate-400">Hoi ve dau tu, tai chinh, phan tich co phieu...</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 text-sm pt-12">
                <p className="text-4xl mb-3 animate-bounce">...</p>
                <p className="font-medium text-slate-300">Xin chao!</p>
                <p className="text-xs text-slate-500 mt-1">Toi co the giup gi cho danh muc dau tu cua ban?</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm shadow-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-[#54a0ff] to-[#c44dff] text-white rounded-br-sm font-medium"
                      : "bg-[var(--card)] border border-[var(--border)] text-slate-100 rounded-bl-sm border-l-rainbow-blue"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--card)] border border-[var(--border)] px-4 py-2.5 rounded-[12px] text-sm rounded-bl-sm border-l-rainbow-violet flex items-center gap-2">
                  <span className="text-xs text-slate-400">AI dang phan tich</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#54a0ff] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c44dff] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b6b] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-[var(--border)] bg-[var(--card)] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendMessage()}
              placeholder="Nhap cau hoi..."
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-[12px] px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#54a0ff]/50 transition-colors focus:ring-1 focus:ring-[#54a0ff]/30"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-2 rainbow-btn text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            >
              Gui
            </button>
          </div>
        </div>
      )}
    </>
  );
}
