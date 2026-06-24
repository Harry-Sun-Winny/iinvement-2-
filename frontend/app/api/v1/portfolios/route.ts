import { NextRequest, NextResponse } from "next/server";

const portfolios: any[] = [];
let portfolioId = 1;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(portfolios);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, baseCurrency, type } = body;

    if (!name || !baseCurrency) {
      return NextResponse.json(
        { error: "Name and baseCurrency are required" },
        { status: 400 }
      );
    }

    const portfolio = {
      id: String(portfolioId++),
      userId: "user123",
      name,
      baseCurrency,
      type: type || "STOCKS",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    portfolios.push(portfolio);
    return NextResponse.json(portfolio);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
