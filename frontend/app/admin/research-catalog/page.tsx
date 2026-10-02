"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, FileUp, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";

import { ApiError, importResearchCatalog, type ResearchCatalogImportSummary } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_CATALOG_SIZE_BYTES = 10 * 1024 * 1024;

export default function ResearchCatalogAdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ResearchCatalogImportSummary | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSummary(null);
    if (!file) return setError("Chọn tệp DOCX từ điển 3.600 tham số trước khi nhập.");
    if (!file.name.toLowerCase().endsWith(".docx")) return setError("Chỉ chấp nhận tệp .docx.");
    if (file.size > MAX_CATALOG_SIZE_BYTES) return setError("Tệp vượt giới hạn 10 MB của màn hình nhập.");

    setIsSubmitting(true);
    try {
      setSummary(await importResearchCatalog(file));
      setFile(null);
      const input = document.getElementById("catalog-file") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) setError("Tài khoản hiện tại không có quyền ADMIN để nhập từ điển.");
      else if (caught instanceof ApiError && caught.status === 401) setError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng tài khoản ADMIN.");
      else setError(caught instanceof Error ? caught.message : "Không thể nhập từ điển vào lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-4" /> Quản trị nghiên cứu</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Nhập từ điển 3.600 tham số</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Dùng tài liệu DOCX đã phê duyệt để cập nhật định nghĩa, điều kiện kích hoạt và vai trò. Hệ thống chỉ chấp nhận đủ chính xác 3.600 mã từ M1-001 đến M12-300.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tệp từ điển được phê duyệt</CardTitle>
          <CardDescription>Chỉ ADMIN có thể thực hiện. Tệp được kiểm tra đầy đủ trước khi ghi nguyên tử vào cơ sở dữ liệu và không được lưu trên máy chủ.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block rounded-xl border border-dashed border-primary/35 bg-primary/5 p-5 transition-colors hover:border-primary/60">
              <span className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><FileUp className="size-5" /></span><span className="min-w-0 space-y-1"><span className="block font-medium">Chọn tệp DOCX</span><span className="block text-xs leading-5 text-muted-foreground">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Tối đa 10 MB"}</span></span></span>
              <input id="catalog-file" className="sr-only" type="file" accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>

            {error && <p role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}</p>}
            {summary && <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><p>Đã nhập {summary.importedEntries.toLocaleString("vi-VN")} mục lúc {new Date(summary.importedAt).toLocaleString("vi-VN")}. Phiên bản phương pháp: {summary.methodologyVersion}.</p></div>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="max-w-md text-xs leading-5 text-muted-foreground">Sáu mã đã có nguồn dữ liệu được ánh xạ lại sau mỗi lần nhập; các mã còn lại vẫn ở trạng thái chờ ánh xạ nguồn.</p>
              <Button type="submit" disabled={isSubmitting || !file}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : <FileUp />}{isSubmitting ? "Đang kiểm tra và nhập" : "Nhập từ điển"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
