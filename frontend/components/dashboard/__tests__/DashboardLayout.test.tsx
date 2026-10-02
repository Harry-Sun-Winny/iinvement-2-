import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardLayout } from "../DashboardLayout";

afterEach(cleanup);

const props = {
  title: "Tổng quan tài sản",
  description: "Dashboard overview",
  currencyControls: <button>USD</button>,
  metrics: <div>Metrics content</div>,
  session: <section>Session content</section>,
  workspace: <section>Workspace content</section>,
  performance: <section>Performance content</section>,
  allocation: <section>Allocation content</section>,
  activity: <section>Activity content</section>,
  alerts: <section>Alert content</section>,
  loading: false,
  isVi: true,
};

describe("DashboardLayout", () => {
  it("keeps one main landmark and splits dashboard content into two independent panes", () => {
    render(<DashboardLayout {...props} />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("main").getAttribute("aria-labelledby")).toBe("dashboard-title");
    const order = ["Metrics content", "Workspace content", "Session content", "Performance content", "Allocation content", "Activity content", "Alert content"];
    for (let index = 0; index < order.length - 1; index++) {
      expect(screen.getByText(order[index]).compareDocumentPosition(screen.getByText(order[index + 1])) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "USD" })).toBeTruthy();
    const primary = screen.getByRole("region", { name: "Quản lý danh mục" });
    const secondary = screen.getByRole("region", { name: "Phân tích và hoạt động" });
    expect(primary.getAttribute("data-dashboard-pane")).toBe("primary");
    expect(secondary.getAttribute("data-dashboard-pane")).toBe("secondary");
    expect(primary.textContent).toContain("Workspace content");
    expect(secondary.textContent).toContain("Session content");
  });

  it("shows metric skeletons instead of financial values while loading", () => {
    render(<DashboardLayout {...props} loading />);
    const metrics = screen.getByRole("region", { name: "Chỉ số tổng quan" });
    expect(metrics.getAttribute("aria-busy")).toBe("true");
    expect(metrics.children).toHaveLength(4);
    expect(screen.queryByText("Metrics content")).toBeNull();
    expect(screen.queryByText("Session content")).toBeNull();
    expect(screen.getByText("Workspace content")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Quản lý danh mục" }).textContent).toContain("Workspace content");
    expect(screen.getByRole("region", { name: "Phân tích và hoạt động" }).textContent).toBe("");
  });

  it("omits absent analytics and supports English region labels", () => {
    render(<DashboardLayout {...props} performance={null} allocation={null} alerts={null} isVi={false} />);
    expect(screen.queryByRole("region", { name: "Performance and allocation" })).toBeNull();
    expect(screen.getByRole("region", { name: "Activity and alerts" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Portfolio management" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Analysis and activity" })).toBeTruthy();
    expect(screen.getByText("Activity content")).toBeTruthy();
    expect(screen.queryByText("Alert content")).toBeNull();
  });
});
