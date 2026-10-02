import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./DashboardLayout.module.css";

interface Props {
  title: string;
  description: string;
  currencyControls: ReactNode;
  metrics: ReactNode;
  session: ReactNode;
  workspace: ReactNode;
  performance: ReactNode;
  allocation: ReactNode;
  activity: ReactNode;
  alerts: ReactNode;
  loading: boolean;
  isVi: boolean;
}

/** Layout only: financial state and actions stay in the dashboard page. */
export function DashboardLayout({
  title, description, currencyControls, metrics, session, workspace,
  performance, allocation, activity, alerts, loading, isVi,
}: Props) {
  return (
    <main className={styles.viewport} aria-labelledby="dashboard-title">
      <div className={styles.split}>
        <section
          aria-label={isVi ? "Quản lý danh mục" : "Portfolio management"}
          className={styles.primaryPane}
          data-dashboard-pane="primary"
        >
          <header className={styles.header}>
            <div>
              <h1 id="dashboard-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </div>
            <div className={styles.controls}>
              <span className="text-xs text-slate-400">{isVi ? "Tiền tệ hiển thị" : "Display currency"}</span>
              {currencyControls}
            </div>
          </header>

          <section aria-label={isVi ? "Chỉ số tổng quan" : "Key metrics"} aria-busy={loading} className={styles.metrics}>
            {loading
              ? Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="antigravity-panel space-y-4 p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-36 max-w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))
              : metrics}
          </section>

          <div className={styles.workspace}>{workspace}</div>
        </section>

        <section
          aria-label={isVi ? "Phân tích và hoạt động" : "Analysis and activity"}
          className={styles.secondaryPane}
          data-dashboard-pane="secondary"
        >
          {!loading && session}

          {!loading && (performance || allocation) && (
            <section aria-label={isVi ? "Hiệu suất và phân bổ" : "Performance and allocation"} className={styles.analytics}>
              {performance}
              {allocation}
            </section>
          )}

          {!loading && (activity || alerts) && (
            <section aria-label={isVi ? "Hoạt động và cảnh báo" : "Activity and alerts"} className={styles.activity}>
              {activity}
              {alerts}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
