import { NextRequest, NextResponse } from "next/server";

const goals: any[] = [];
let goalId = 1;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(goals);
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
    const { name, targetAmount, currency, targetDate } = body;

    if (!name || !targetAmount || !currency || !targetDate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const goal = {
      id: String(goalId++),
      userId: "user123",
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      currency,
      targetDate,
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
    };

    goals.push(goal);
    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
