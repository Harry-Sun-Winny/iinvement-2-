import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:8080/api/v1/admin/kpi", {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error("Backend error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      totalUsers: 0, totalPortfolios: 0, totalTransactions: 0,
      totalWatchlists: 0, totalNews: 0, totalAiConversations: 0, totalGoals: 0,
    });
  }
}
