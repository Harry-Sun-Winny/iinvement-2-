"use client";
import { Component, ErrorInfo, ReactNode } from "react";

export default class AnalyticsErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Analytics dashboard failed", error, info); }
  render() {
    return this.state.failed
      ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">Unable to render financial analytics.</div>
      : this.props.children;
  }
}
