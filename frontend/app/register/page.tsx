"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { register } from "../lib/api";
import AuthLayout from "@/components/ui/AuthLayout";
import Alert from "@/components/ui/Alert";

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Khởi tạo bảng điều khiển danh mục quỹ của riêng bạn."
      subtitle="Định dạng hiển thị đồng nhất"
      formTitle="Đăng ký"
      formSubtitle="Tạo tài khoản mới để tiếp tục"
    >
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="name"
          placeholder="Họ tên"
          minLength={2}
          maxLength={160}
          disabled={loading}
          required
          className="antigravity-input w-full"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Email"
          type="email"
          disabled={loading}
          required
          className="antigravity-input w-full"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Mật khẩu (tối thiểu 12 ký tự)"
          type="password"
          minLength={12}
          maxLength={128}
          disabled={loading}
          required
          className="antigravity-input w-full"
        />

        {error && <Alert variant="error">{error}</Alert>}

        <button
          type="submit"
          disabled={loading}
          className="antigravity-btn w-full mt-2 flex items-center justify-center gap-2 text-white font-bold"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-4">
        Đã có tài khoản?{" "}
        <a href="/login" className="font-bold underline text-[var(--accent)] hover:text-white transition-colors">
          Đăng nhập
        </a>
      </p>
    </AuthLayout>
  );
}
