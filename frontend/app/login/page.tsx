"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";
import { login, register } from "../lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "session-expired") {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      setTakingLonger(false);
      return;
    }
    const timer = window.setTimeout(() => setTakingLonger(true), 2500);
    return () => window.clearTimeout(timer);
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const res = mode === "login"
        ? await login(email, password, controller.signal)
        : await register(email, password, fullName, controller.signal);
      localStorage.setItem("token", res.token);
      window.location.href = "/";
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : `${mode === "login" ? "Đăng nhập" : "Đăng ký"} thất bại`);
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setLoading(false);
    }
  }

  return (
    <main className="app-shell grid min-h-screen place-items-center px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30 md:grid-cols-[1fr_420px]">
        <section className="hidden bg-[radial-gradient(ellipse_at_top_left,rgba(196,77,255,0.2),transparent_30rem),radial-gradient(ellipse_at_bottom_right,rgba(84,160,255,0.15),transparent_28rem),linear-gradient(145deg,#0f1729,#050816)] p-10 md:block">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded rainbow-bg text-sm font-black text-white">↗</span>
            <p className="text-xl font-black text-white">Investment</p>
          </div>
          <h1 className="mt-20 max-w-md text-5xl font-black leading-tight rainbow-text">
            Financial workspace for focused decisions
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
            Portfolio, watchlist, market data and AI analysis in one dark dashboard.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm font-bold rainbow-text">
            <TrendingUp className="h-5 w-5" />
            Orange-first visual system
          </div>
        </section>

        <section className="p-8">
          <p className="text-sm font-bold text-[#54a0ff]">{mode === "login" ? "Welcome back" : "Create workspace"}</p>
          <h2 className="mt-2 text-3xl font-black rainbow-text">{mode === "login" ? "Đăng nhập" : "Đăng ký"}</h2>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            {mode === "register" && (
              <input type="text" autoComplete="name" placeholder="Họ tên" value={fullName} onChange={e => setFullName(e.target.value)} minLength={2} maxLength={160} disabled={loading} required className="app-input rounded-lg px-4 py-3 disabled:opacity-60" />
            )}
            <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required className="app-input rounded-lg px-4 py-3 disabled:opacity-60" />
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mật khẩu (tối thiểu 12 ký tự)" value={password} onChange={e => setPassword(e.target.value)} minLength={mode === "register" ? 12 : undefined} maxLength={128} disabled={loading} required className="app-input rounded-lg px-4 py-3 disabled:opacity-60" />
            {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
            {takingLonger && !error && <p className="text-center text-sm text-slate-400">Máy chủ miễn phí đang khởi động, vui lòng chờ thêm một chút…</p>}
            <button type="submit" disabled={loading} className="mt-2 inline-flex items-center justify-center gap-2 rainbow-btn">
              {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <button type="button" onClick={() => { activeRequest.current?.abort(); setLoading(false); setMode(mode === "login" ? "register" : "login"); setError(""); setPassword(""); }} className="font-black rainbow-text">
              {mode === "login" ? "Đăng ký" : "Đăng nhập"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
