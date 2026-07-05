"use client";

import { useEffect, useState } from "react";

type RecoveryEntry = {
  key: string;
  rawValue: string;
  parsedValue: unknown;
};

const isRecoveryKey = (key: string) =>
  key === "investment-dashboard-cache-v1" ||
  key === "investment-dashboard-cache-v2" ||
  key.startsWith("journal_entries_");

const readRecoveryEntries = (): RecoveryEntry[] =>
  Object.keys(localStorage)
    .filter(isRecoveryKey)
    .sort()
    .map((key) => {
      const rawValue = localStorage.getItem(key) ?? "";

      try {
        return { key, rawValue, parsedValue: JSON.parse(rawValue) };
      } catch {
        return { key, rawValue, parsedValue: rawValue };
      }
    });

export default function RecoverDataPage() {
  const [entries, setEntries] = useState<RecoveryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEntries(readRecoveryEntries());
  }, []);

  const recoveryDocument = {
    exportedAt: new Date().toISOString(),
    sourceOrigin: typeof window === "undefined" ? "" : window.location.origin,
    entries,
  };

  const downloadBackup = () => {
    const content = JSON.stringify(recoveryDocument, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    link.href = url;
    link.download = `portfolio-browser-recovery-${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyBackup = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(recoveryDocument, null, 2),
    );
    setCopied(true);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07101f",
        color: "#e7edf7",
        padding: "48px 20px",
        fontFamily: "Georgia, serif",
      }}
    >
      <section
        style={{
          width: "min(820px, 100%)",
          margin: "0 auto",
          padding: "32px",
          background: "#101a2d",
          border: "1px solid #30405d",
          borderRadius: "18px",
        }}
      >
        <p style={{ color: "#51c7ff", margin: 0 }}>KHÔI PHỤC DANH MỤC</p>
        <h1 style={{ fontSize: "36px", margin: "12px 0" }}>
          Sao lưu dữ liệu còn trong trình duyệt
        </h1>
        <p style={{ color: "#aebbd0", lineHeight: 1.6 }}>
          Trang này chỉ đọc dữ liệu lưu tại địa chỉ hiện tại. Nó không ghi, xóa
          hoặc thay đổi database.
        </p>

        <div
          style={{
            margin: "24px 0",
            padding: "18px",
            borderRadius: "12px",
            background: entries.length ? "#0b2b25" : "#351a22",
            border: `1px solid ${entries.length ? "#1a8d70" : "#a43e59"}`,
          }}
        >
          {entries.length
            ? `Đã tìm thấy ${entries.length} vùng dữ liệu có thể khôi phục.`
            : "Không tìm thấy cache danh mục tại địa chỉ này. Hãy mở đúng localhost:3000/recover-data."}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <button
            type="button"
            onClick={downloadBackup}
            disabled={!entries.length}
            style={{
              padding: "14px 22px",
              border: 0,
              borderRadius: "10px",
              fontWeight: 700,
              cursor: entries.length ? "pointer" : "not-allowed",
              color: "#07101f",
              background: entries.length ? "#ffb347" : "#667085",
            }}
          >
            Tải file khôi phục JSON
          </button>
          <button
            type="button"
            onClick={copyBackup}
            disabled={!entries.length}
            style={{
              padding: "14px 22px",
              border: "1px solid #60708f",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: entries.length ? "pointer" : "not-allowed",
              color: "#e7edf7",
              background: "transparent",
            }}
          >
            {copied ? "Đã sao chép" : "Sao chép toàn bộ"}
          </button>
        </div>

        {entries.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <p style={{ color: "#aebbd0" }}>Các vùng dữ liệu tìm thấy:</p>
            {entries.map((entry) => (
              <div
                key={entry.key}
                style={{
                  marginTop: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "#07101f",
                  overflowWrap: "anywhere",
                }}
              >
                {entry.key} ({entry.rawValue.length.toLocaleString("vi-VN")} ký
                tự)
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
