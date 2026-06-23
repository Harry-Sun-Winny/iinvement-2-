export const aiService = {
  async analyze(analysisContext: unknown, request: string) {
    const response = await fetch("/api/ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisContext, messages: [{ role: "user", content: request }] }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI Analyst không thể xử lý yêu cầu.");
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("AI không trả về nội dung phân tích.");
    return text as string;
  },
};
