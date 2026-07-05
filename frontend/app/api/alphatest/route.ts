import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    const res = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=AAPL&apikey=${apiKey}`
    );

    const data = await res.json();

    return NextResponse.json({
        sector: data.Sector,
        industry: data.Industry,
    });
}
