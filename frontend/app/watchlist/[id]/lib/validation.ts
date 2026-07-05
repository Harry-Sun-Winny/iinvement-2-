import { DashboardError } from "./error-model";

export function validatePriceData(data: any): boolean {
  if (!data) throw new DashboardError("Price payload is empty", "validatePriceData", "high");
  if (typeof data.price !== "number" || isNaN(data.price)) {
    throw new DashboardError("Invalid or missing price field", "validatePriceData", "high");
  }
  return true;
}

export function validateProfileData(data: any): boolean {
  if (!data) throw new DashboardError("Profile payload is empty", "validateProfileData", "high");
  if (!data.name) {
    throw new DashboardError("Missing company name in profile data", "validateProfileData", "medium");
  }
  return true;
}

export function validateHistoryData(data: any): boolean {
  if (!data) throw new DashboardError("History payload is empty", "validateHistoryData", "high");
  if (!Array.isArray(data.points)) {
    throw new DashboardError("Missing or invalid points array in history data", "validateHistoryData", "high");
  }
  return true;
}
