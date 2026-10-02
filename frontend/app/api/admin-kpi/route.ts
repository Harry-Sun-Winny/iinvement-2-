import { NextRequest, NextResponse } from "next/server";

const backendOrigin = process.env.BACKEND_API_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  const adminToken = process.env.ADMIN_KPI_TOKEN;
  const providedToken = request.headers.get("x-admin-kpi-token");

  if (!adminToken || providedToken !== adminToken) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const res = await fetch(`${backendOrigin}/api/v1/admin/kpi`, {
      headers: { "x-admin-kpi-token": adminToken },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error("Backend error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Admin KPI is unavailable." }, { status: 502 });
  }
}