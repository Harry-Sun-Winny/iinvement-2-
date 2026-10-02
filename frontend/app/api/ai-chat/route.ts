import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, readJsonBody, rejectCrossSiteRequest } from "../_lib/request-guard";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `Báº¡n lÃ  trá»£ lÃ½ phÃ¢n tÃ­ch Ä‘áº§u tÆ° tÃ i chÃ­nh chuyÃªn nghiá»‡p.
YÃªu cáº§u:
- Tráº£ lá»i báº±ng tiáº¿ng Viá»‡t, rÃµ rÃ ng vÃ  sÃºc tÃ­ch.
- CÃ³ thá»ƒ giáº£i thÃ­ch chá»‰ sá»‘, tÃ³m táº¯t bÃ¡o cÃ¡o vÃ  phÃ¢n tÃ­ch tÃ¡c Ä‘á»™ng cá»§a tin tá»©c.
- PhÃ¢n biá»‡t dá»¯ kiá»‡n, giáº£ Ä‘á»‹nh vÃ  nháº­n Ä‘á»‹nh.
- KhÃ´ng Ä‘Æ°a ra chá»‰ dáº«n mua hoáº·c bÃ¡n tuyá»‡t Ä‘á»‘i.
- KhÃ´ng báº£o Ä‘áº£m lá»£i nhuáº­n hoáº·c dá»± Ä‘oÃ¡n cháº¯c cháº¯n.`;

const DISCLAIMER = "\n\nLÆ°u Ã½: ThÃ´ng tin chá»‰ mang tÃ­nh tham kháº£o, khÃ´ng pháº£i lá»i khuyÃªn Ä‘áº§u tÆ° vÃ  khÃ´ng khuyáº¿n nghá»‹ mua/bÃ¡n tuyá»‡t Ä‘á»‘i.";

export async function POST(request: NextRequest) {
  try {
    const crossSite = rejectCrossSiteRequest(request);
    if (crossSite) return crossSite;
    const rateLimited = enforceRateLimit(request, { key: "ai-chat", limit: 12, windowMs: 10 * 60_000 });
    if (rateLimited) return rateLimited;
    const parsedBody = await readJsonBody<{ messages?: unknown }>(request, 80_000);
    if ("response" in parsedBody) return parsedBody.response;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh trÃªn mÃ¡y chá»§." }, { status: 503 });
    }

    const body = parsedBody.body;
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Danh sÃ¡ch tin nháº¯n khÃ´ng há»£p lá»‡." }, { status: 400 });
    }

    const rawMessages: unknown[] = body.messages;
    const messages: ChatMessage[] = rawMessages
      .slice(-20)
      .filter((message: unknown): message is ChatMessage => {
        if (!message || typeof message !== "object") return false;
        const item = message as Record<string, unknown>;
        return (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim().length > 0;
      })
      .map(message => ({ role: message.role, content: message.content.trim().slice(0, 12_000) }));

    if (!messages.length) {
      return NextResponse.json({ error: "Tin nháº¯n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1024,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const data = await response.json();
    if (!response.ok) {
      const quotaExceeded = response.status === 429 && data?.error?.code === "insufficient_quota";
      const providerMessage = quotaExceeded
        ? "OpenAI API key Ä‘Ã£ háº¿t quota hoáº·c chÆ°a kÃ­ch hoáº¡t thanh toÃ¡n. HÃ£y kiá»ƒm tra OpenAI Platform > Billing."
        : data?.error?.message || "OpenAI API khÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u.";
      const status = response.status === 429 ? 429 : 502;
      return NextResponse.json({ error: providerMessage }, { status });
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ error: "OpenAI khÃ´ng tráº£ vá» ná»™i dung." }, { status: 502 });

    return NextResponse.json({ content: `${content}${DISCLAIMER}` });
  } catch (error: unknown) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "OpenAI pháº£n há»“i quÃ¡ thá»i gian cho phÃ©p."
      : "KhÃ´ng thá»ƒ káº¿t ná»‘i OpenAI API.";
    console.error("OpenAI Chat Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
