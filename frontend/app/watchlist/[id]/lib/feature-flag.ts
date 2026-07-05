/**
   Feature Flag to toggle the upgraded V2 architecture.
   When set to true, it routes stock details rendering through the Normalizer & Selector layer.
   Set default to true for deployment, can be toggled via console/query parameters at runtime.
 */
const STORAGE_KEY = "feature_enable_stock_analytics_v2";

export function isV2Enabled(): boolean {
  if (typeof window === "undefined") return true;
  const urlParam = new URLSearchParams(window.location.search).get("enable_v2");
  if (urlParam !== null) {
    const val = urlParam === "true";
    localStorage.setItem(STORAGE_KEY, val ? "true" : "false");
    return val;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== "false"; // Default to true unless explicitly disabled
}
