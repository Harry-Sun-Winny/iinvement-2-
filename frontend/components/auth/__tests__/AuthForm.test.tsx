import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthForm from "../AuthForm";
import * as api from "@/app/lib/api";

vi.mock("@/components/providers/I18nProvider", () => ({
  useTranslation: () => ({ language: "vi" }),
}));

vi.mock("@/app/lib/api", () => {
  class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      Object.setPrototypeOf(this, ApiError.prototype);
    }
  }

  return {
    ApiError,
    login: vi.fn(),
    register: vi.fn(),
    storeAuthSession: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/login");
});

afterEach(() => {
  cleanup();
});

describe("AuthForm", () => {
  it("submits login credentials and allows password visibility to be toggled", async () => {
    const onAuthenticated = vi.fn();
    vi.mocked(api.login).mockResolvedValue({ token: "login-token", tokenType: "Bearer" });
    render(<AuthForm mode="login" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    const password = screen.getByLabelText("Mật khẩu");
    fireEvent.change(password, { target: { value: "very-secure-password" } });

    expect(password.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(password.getAttribute("type")).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith(
        "user@example.com",
        "very-secure-password",
        expect.any(AbortSignal),
      );
      expect(api.storeAuthSession).toHaveBeenCalledWith({ token: "login-token", tokenType: "Bearer" });
      expect(onAuthenticated).toHaveBeenCalledOnce();
    });
  });

  it("submits the registration fields in their existing order", async () => {
    const onAuthenticated = vi.fn();
    vi.mocked(api.register).mockResolvedValue({ token: "register-token", tokenType: "Bearer" });
    window.history.replaceState({}, "", "/register");
    render(<AuthForm mode="register" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Nguyễn Minh Anh" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "a-secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith(
        "new@example.com",
        "a-secure-password",
        "Nguyễn Minh Anh",
        expect.any(AbortSignal),
      );
      expect(onAuthenticated).toHaveBeenCalledOnce();
    });
  });

  it("shows a localized message for invalid login credentials", async () => {
    vi.mocked(api.login).mockRejectedValue(new api.ApiError(401, "Unauthorized"));
    render(<AuthForm mode="login" />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByText("Email hoặc mật khẩu không đúng.")).toBeTruthy();
  });
});
