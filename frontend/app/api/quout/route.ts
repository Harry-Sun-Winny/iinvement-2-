import { NextRequest, NextResponse } from "next/server";

const AV_KEY = process.env.ALPHAVANTAGE_API_KEY ?? "";

export async function GET(req: NextRequest) {
    const symbol = req.nextUrl.searchParams.get("symbol");
    if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

    const url =
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${AV_KEY}`;

    try {
        const res = await fetch(url, { next: { revalidate: 60 } });
        const data = await res.json();
        const q = data["Global Quote"];

        if (!q || !q["05. price"]) {
            return NextResponse.json({ price: null, change: null });
        }

        return NextResponse.json({
            price: Number(q["05. price"]),
            change: Number(q["09. change"]),
        });
    } catch {
        return NextResponse.json({ price: null, change: null });
    }
}
