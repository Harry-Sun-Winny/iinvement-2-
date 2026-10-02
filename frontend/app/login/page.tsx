"use client";

import AuthForm from "@/components/auth/AuthForm";
import AuthLayout from "@/components/ui/AuthLayout";
import { useTranslation } from "@/components/providers/I18nProvider";

export default function LoginPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";

  return (
    <AuthLayout
      title={isVi ? "Ra quyết định với một góc nhìn rõ ràng hơn." : "Make decisions with a clearer view."}
      subtitle={
        isVi
          ? "Theo dõi danh mục, đánh giá rủi ro và lưu lại bối cảnh quyết định trong một nơi."
          : "Track portfolios, assess risk, and keep decision context in one focused workspace."
      }
      formTitle={isVi ? "Chào mừng trở lại" : "Welcome back"}
      formSubtitle={isVi ? "Đăng nhập để tiếp tục vào không gian làm việc." : "Sign in to continue to your workspace."}
    >
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
