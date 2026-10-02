"use client";

import AuthForm from "@/components/auth/AuthForm";
import AuthLayout from "@/components/ui/AuthLayout";
import { useTranslation } from "@/components/providers/I18nProvider";

export default function RegisterPage() {
  const { language } = useTranslation();
  const isVi = language === "vi";

  return (
    <AuthLayout
      title={isVi ? "Xây dựng hồ sơ tài sản theo cách của bạn." : "Build your financial record your way."}
      subtitle={
        isVi
          ? "Tập hợp danh mục, giao dịch và phân tích để theo dõi quyết định theo thời gian."
          : "Bring portfolios, transactions, and analysis together to track decisions over time."
      }
      formTitle={isVi ? "Tạo tài khoản" : "Create your account"}
      formSubtitle={isVi ? "Bắt đầu với thông tin cơ bản của bạn." : "Start with your basic account details."}
    >
      <AuthForm mode="register" />
    </AuthLayout>
  );
}
