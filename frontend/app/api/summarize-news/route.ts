import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title, summary } = await req.json();
  const content = summary ? `${title}. ${summary}` : title;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `TÃ³m táº¯t tin tá»©c sau thÃ nh 2 dÃ²ng: 1 dÃ²ng tiáº¿ng Anh, 1 dÃ²ng tiáº¿ng Viá»‡t. Chá»‰ tráº£ vá» Ä‘Ãºng 2 dÃ²ng, khÃ´ng thÃªm gÃ¬ khÃ¡c.\n\n${content}`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const lines = text.trim().split("\n").filter(Boolean);
    return NextResponse.json({ en: lines[0] ?? title, vi: lines[1] ?? "" });
  } catch {
    return NextResponse.json({ en: title, vi: "" });
  }
}
