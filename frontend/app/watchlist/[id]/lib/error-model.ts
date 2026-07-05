export type DashboardErrorSeverity = "low" | "medium" | "high";

export class DashboardError extends Error {
  severity: DashboardErrorSeverity;
  source: string;
  timestamp: string;

  constructor(message: string, source: string, severity: DashboardErrorSeverity = "medium") {
    super(message);
    this.name = "DashboardError";
    this.source = source;
    this.severity = severity;
    this.timestamp = new Date().toISOString();
  }
}
