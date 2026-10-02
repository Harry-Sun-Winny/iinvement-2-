"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { useTranslation } from "@/components/providers/I18nProvider";
import { ApiError, login, register, storeAuthSession } from "@/app/lib/api";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
  onAuthenticated?: () => void;
}

function redirectToDashboard() {
  window.location.replace("/");
}

function getAuthError(error: unknown, mode: AuthMode, isVi: boolean) {
  const fallback = isVi
    ? `${mode === "login" ? "Đăng nhập" : "Đăng ký"} thất bại. Vui lòng thử lại.`
    : `${mode === "login" ? "Sign in" : "Registration"} failed. Please try again.`;

  if (!(error instanceof ApiError)) return fallback;

  if ((error.status === 401 || error.status === 403) && mode === "login") {
    return isVi ? "Email hoặc mật khẩu không đúng." : "The email or password is incorrect.";
  }
  if (error.status === 409 && mode === "register") {
    return isVi ? "Email này đã được sử dụng." : "This email is already in use.";
  }
  if (error.status === 408) {
    return isVi
      ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút."
      : "The server took too long to respond. Please try again in a few minutes.";
  }
  if (error.status === 0) {
    return isVi
      ? "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại."
      : "Could not connect to the server. Check your network and try again.";
  }

  return error.message && !error.message.includes("?") ? error.message : fallback;
}

export default function AuthForm({ mode, onAuthenticated = redirectToDashboard }: AuthFormProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const isRegister = mode === "register";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const copy = isVi
    ? {
        fullName: "Họ và tên",
        fullNamePlaceholder: "Nguyễn Minh Anh",
        email: "Email",
        emailPlaceholder: "ban@example.com",
        password: "Mật khẩu",
        loginPasswordHelp: "Nhập mật khẩu của tài khoản.",
        registerPasswordHelp: "Sử dụng từ 12 đến 128 ký tự.",
        showPassword: "Hiện mật khẩu",
        hidePassword: "Ẩn mật khẩu",
        submit: isRegister ? "Tạo tài khoản" : "Đăng nhập",
        submitting: isRegister ? "Đang tạo tài khoản..." : "Đang đăng nhập...",
        alternatePrompt: isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?",
        alternateAction: isRegister ? "Đăng nhập" : "Đăng ký",
        invalidName: "Họ và tên phải có ít nhất 2 ký tự.",
        longer: "Máy chủ đang khởi động. Quá trình này có thể mất thêm một chút thời gian.",
      }
    : {
        fullName: "Full name",
        fullNamePlaceholder: "Alex Nguyen",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Password",
        loginPasswordHelp: "Enter the password for your account.",
        registerPasswordHelp: "Use between 12 and 128 characters.",
        showPassword: "Show password",
        hidePassword: "Hide password",
        submit: isRegister ? "Create account" : "Sign in",
        submitting: isRegister ? "Creating account..." : "Signing in...",
        alternatePrompt: isRegister ? "Already have an account?" : "New to Antigravity?",
        alternateAction: isRegister ? "Sign in" : "Create an account",
        invalidName: "Your full name must contain at least 2 characters.",
        longer: "The server is starting up. This may take a little longer.",
      };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (mode === "login" && new URLSearchParams(window.location.search).get("reason") === "session-expired") {
      setError(isVi ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Your session has expired. Please sign in again.");
    }
  }, [isVi, mode]);

  useEffect(() => {
    if (!loading) {
      setTakingLonger(false);
      return;
    }
    const timer = window.setTimeout(() => setTakingLonger(true), 2500);
    return () => window.clearTimeout(timer);
  }, [loading]);

  function clearError() {
    if (error) setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (isRegister && fullName.trim().length < 2) {
      setError(copy.invalidName);
      return;
    }

    setError("");
    setLoading(true);
    const controller = new AbortController();
    activeRequest.current = controller;

    try {
      const session = isRegister
        ? await register(email, password, fullName, controller.signal)
        : await login(email, password, controller.signal);
      storeAuthSession(session);
      // A full navigation avoids a stale App Router manifest returning the
      // custom 404 while the large dashboard route is compiling in dev mode.
      onAuthenticated();
    } catch (requestError) {
      if (!controller.signal.aborted && mounted.current) {
        setError(getAuthError(requestError, mode, isVi));
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-5" aria-busy={loading}>
        {isRegister && (
          <div className="grid gap-2">
            <label htmlFor="auth-full-name" className="text-sm font-semibold text-slate-200">
              {copy.fullName}
            </label>
            <input
              id="auth-full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder={copy.fullNamePlaceholder}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                clearError();
              }}
              minLength={2}
              maxLength={160}
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-600 bg-[#080d17] px-4 py-3.5 text-[15px] text-slate-100 outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        )}

        <div className="grid gap-2">
          <label htmlFor="auth-email" className="text-sm font-semibold text-slate-200">
            {copy.email}
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError();
            }}
            disabled={loading}
            required
            className="w-full rounded-xl border border-slate-600 bg-[#080d17] px-4 py-3.5 text-[15px] text-slate-100 outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="auth-password" className="text-sm font-semibold text-slate-200">
            {copy.password}
          </label>
          <div className="relative">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              minLength={isRegister ? 12 : undefined}
              maxLength={128}
              aria-describedby="auth-password-help"
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-600 bg-[#080d17] py-3.5 pl-4 pr-12 text-[15px] text-slate-100 outline-none transition placeholder:text-slate-400 hover:border-slate-500 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={loading}
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p id="auth-password-help" className="text-xs leading-5 text-slate-400">
            {isRegister ? copy.registerPasswordHelp : copy.loginPasswordHelp}
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {takingLonger && !error && (
          <Alert variant="warning">{copy.longer}</Alert>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          <span>{loading ? copy.submitting : copy.submit}</span>
          {!loading && <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {copy.alternatePrompt}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-bold text-[var(--accent)] underline decoration-transparent underline-offset-4 transition hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {copy.alternateAction}
        </Link>
      </p>
    </>
  );
}
