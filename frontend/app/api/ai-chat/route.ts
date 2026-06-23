import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `Bạn là trợ lý phân tích đầu tư tài chính chuyên nghiệp.
Yêu cầu:
- Trả lời bằng tiếng Việt, rõ ràng và súc tích.
- Có thể giải thích chỉ số, tóm tắt báo cáo và phân tích tác động của tin tức.
- Phân biệt dữ kiện, giả định và nhận định.
- Không đưa ra chỉ dẫn mua hoặc bán tuyệt đối.
- Không bảo đảm lợi nhuận hoặc dự đoán chắc chắn.`;

const DISCLAIMER = "\n\nLưu ý: Thông tin chỉ mang tính tham khảo, không phải lời khuyên đầu tư và không khuyến nghị mua/bán tuyệt đối.";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY chưa được cấu hình trên máy chủ." }, { status: 503 });
    }

    const body = await request.json();
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Danh sách tin nhắn không hợp lệ." }, { status: 400 });
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
      return NextResponse.json({ error: "Tin nhắn không được để trống." }, { status: 400 });
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
        ? "OpenAI API key đã hết quota hoặc chưa kích hoạt thanh toán. Hãy kiểm tra OpenAI Platform > Billing."
        : data?.error?.message || "OpenAI API không thể xử lý yêu cầu.";
      const status = response.status === 429 ? 429 : 502;
      return NextResponse.json({ error: providerMessage }, { status });
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ error: "OpenAI không trả về nội dung." }, { status: 502 });

    return NextResponse.json({ content: `${content}${DISCLAIMER}` });
  } catch (error: unknown) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "OpenAI phản hồi quá thời gian cho phép."
      : "Không thể kết nối OpenAI API.";
    console.error("OpenAI Chat Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
