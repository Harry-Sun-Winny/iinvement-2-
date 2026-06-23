"use client";

import { useState } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";
import { register } from "../lib/api";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const data = await register(email, password, username);
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Đăng ký thất bại");
    } finally {
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
          <h1 className="mt-20 max-w-md text-5xl font-black leading-tight rainbow-text">Create your portfolio command center</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Start tracking assets, goals and AI risk notes in the orange dark theme.</p>
          <div className="mt-10 flex items-center gap-3 text-sm font-bold rainbow-text">
            <TrendingUp className="h-5 w-5" />
            Unified UI/UX tone
          </div>
        </section>

        <section className="p-8">
          <p className="text-sm font-bold text-[#54a0ff]">New account</p>
          <h1 className="mt-2 text-3xl font-black rainbow-text">Đăng ký</h1>
          {error && <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
          <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-4">
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="name" placeholder="Họ tên" minLength={2} maxLength={160} disabled={loading} required className="app-input rounded-lg px-4 py-3 disabled:opacity-60" />
            <input value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="Email" type="email" disabled={loading} required className="app-input rounded-lg px-4 py-3 disabled:opacity-60" />
            <input value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mật khẩu (tối thiểu 12 ký tự)" type="password" minLength={12} maxLength={128} disabled={loading} required className="app-input rounded-lg px-4 py-3 disabled:opacity-60" />
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rainbow-btn w-full">
              {loading ? "Đang đăng ký..." : "Đăng ký"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-sm text-slate-400">
              Đã có tài khoản? <a href="/login" className="font-black rainbow-text">Đăng nhập</a>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
