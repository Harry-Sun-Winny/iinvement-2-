"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { login, register } from "../lib/api";
import AuthLayout from "@/components/ui/AuthLayout";
import Alert from "@/components/ui/Alert";

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
    <AuthLayout
      title={
        mode === "login"
          ? "Workspace chuyên nghiệp cho các quyết định tài chính."
          : "Khởi tạo bảng điều khiển tài chính của riêng bạn."
      }
      subtitle={
        mode === "login"
          ? "Hệ thống hiển thị tối giản"
          : "Hỗ trợ đa tài sản & AI chấm điểm"
      }
      formTitle={mode === "login" ? "Đăng nhập" : "Đăng ký"}
      formSubtitle={
        mode === "login"
          ? "Đăng nhập để tiếp tục làm việc"
          : "Đăng ký tài khoản mới"
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "register" && (
          <input
            type="text"
            autoComplete="name"
            placeholder="Họ tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            minLength={2}
            maxLength={160}
            disabled={loading}
            required
            className="antigravity-input w-full"
          />
        )}
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          className="antigravity-input w-full"
        />
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Mật khẩu (tối thiểu 12 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "register" ? 12 : undefined}
          maxLength={128}
          disabled={loading}
          required
          className="antigravity-input w-full"
        />

        {error && <Alert variant="error">{error}</Alert>}

        {takingLonger && !error && (
          <Alert variant="warning">
            Máy chủ miễn phí đang khởi động, vui lòng chờ thêm một chút…
          </Alert>
        )}

        <button
          type="submit"
          disabled={loading}
          className="antigravity-btn w-full mt-2 flex items-center justify-center gap-2 text-white font-bold"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-4">
        {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <button
          type="button"
          onClick={() => {
            activeRequest.current?.abort();
            setLoading(false);
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setPassword("");
          }}
          className="font-bold underline text-[var(--accent)] hover:text-white transition-colors"
        >
          {mode === "login" ? "Đăng ký ngay" : "Đăng nhập ngay"}
        </button>
      </p>
    </AuthLayout>
  );
}
