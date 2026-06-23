import { NextRequest, NextResponse } from "next/server";

type AnalysisMessage = { role: "user"; content: string };
type AnalysisRequest = { analysisContext?: Record<string, unknown>; messages?: unknown[] };
type GroqResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnalysisMessage(value: unknown): value is AnalysisMessage {
  return isRecord(value) && value.role === "user" && typeof value.content === "string";
}

const SYSTEM_PROMPT = `Bạn là Senior Portfolio Risk Analyst phục vụ nhà đầu tư chuyên nghiệp.

NGUYÊN TẮC PHÂN TÍCH:
1. Chỉ sử dụng số liệu trong ANALYSIS_CONTEXT. Không tự tạo giá, tỷ trọng, beta, ngành hoặc dữ liệu thị trường.
2. Mọi nhận định quan trọng phải viện dẫn ít nhất một con số hoặc mã tài sản cụ thể.
3. Phân biệt rõ: dữ kiện, suy luận và dữ liệu còn thiếu.
4. Không đưa ra lệnh mua/bán tuyệt đối, giá mục tiêu hoặc bảo đảm lợi nhuận.
5. Các hành động phải có điều kiện, ví dụ: "Nếu tỷ trọng vượt X%..." hoặc "Nếu drawdown vượt Y%...".
6. Không gọi P/L chưa thực hiện là lợi nhuận đã chốt.
7. Dùng portfolio.returnPercent làm tỷ suất sinh lời theo giá vốn; không tự tính lại bằng P/L chia market value.
8. Không so sánh với thị trường hoặc benchmark nếu context không cung cấp dữ liệu benchmark.
9. Khi marketIntelligence có dữ liệu, phải liên kết vị thế với return 1M/3M/1Y, MA50/MA200, volume, fundamentals và recentNews.
10. Chỉ gọi tin tức là catalyst tiềm năng; không khẳng định quan hệ nhân quả giữa headline và biến động giá.
11. Nếu dataCoverage thấp hoặc không có news, phải nói rõ thay vì suy đoán.
12. Trả lời bằng tiếng Việt, súc tích nhưng đủ chiều sâu.

FORMAT BẮT BUỘC:
Không được bỏ bất kỳ mục nào dưới đây. Mỗi mục ưu tiên số liệu hơn diễn giải dài.
## 1. Executive Summary
3-5 câu, nêu tổng giá trị, return, risk score và vấn đề quan trọng nhất.

## 2. Portfolio Diagnostics
Bảng Markdown gồm: Metric | Value | Interpretation. Phải có concentration HHI, largest position, best/worst position.

## 3. Key Risk Signals
3-5 rủi ro, mỗi rủi ro gồm Evidence, Why it matters, Severity (Low/Medium/High).

## 4. Market Context & Catalysts
Với tối đa 5 vị thế lớn nhất, nêu xu hướng kỹ thuật, fundamentals mới nhất và tối đa 2 catalyst tin tức có timestamp/source. Chỉ nêu catalyst thực sự liên quan.

## 5. Stress Scenarios
Phân tích hai stress test có trong context và diễn giải tác động theo tiền và % danh mục.

## 6. Conditional Actions
3-5 hành động có điều kiện, có thứ tự ưu tiên và ngưỡng kiểm soát rõ ràng. Không dùng câu chung chung như "hãy đa dạng hóa" nếu không chỉ ra vị thế/tỷ trọng liên quan.

## 7. Data Gaps
Nêu dữ liệu còn thiếu và điều gì không thể kết luận vì thiếu dữ liệu.

Kết thúc bằng đúng câu: "Thông tin chỉ mang tính tham khảo, không phải lời khuyên đầu tư."`;

const STOCK_SYSTEM_PROMPT = `Bạn là Senior Equity Research Analyst phục vụ nhà đầu tư chuyên nghiệp.

NGUYÊN TẮC:
1. Chỉ dùng dữ liệu trong ANALYSIS_CONTEXT; không bịa giá, tin tức, fundamentals, ngành, beta hoặc valuation.
2. Trả lời trực tiếp USER_REQUEST trước, sau đó mới mở rộng phân tích.
3. Mỗi nhận định phải gắn với số liệu, mốc thời gian hoặc headline/source cụ thể.
4. Phân biệt dữ kiện, suy luận và dữ liệu thiếu. Tin tức chỉ là catalyst tiềm năng, không mặc định là nguyên nhân biến động giá.
5. Dùng return 1M/3M/1Y, MA50/MA200, volume và khoảng cách 52 tuần để xác định technical regime.
6. Fundamentals chỉ được so sánh theo thời gian khi context có nhiều kỳ; không suy ra tăng trưởng từ một kỳ duy nhất.
7. Không đưa lệnh mua/bán, giá mục tiêu hay bảo đảm lợi nhuận.

FORMAT BẮT BUỘC:
## 1. Direct Answer
Trả lời thẳng yêu cầu của người dùng trong 3-5 câu.
## 2. Stock Snapshot
Bảng Metric | Value | Interpretation: vị thế trong danh mục, return, MA50/MA200, 52W range, volume, market cap.
## 3. Technical Regime
Xu hướng, động lượng, các ngưỡng cần theo dõi từ dữ liệu có sẵn.
## 4. Fundamentals
Revenue, EBITDA, Net Income và giới hạn độ phủ dữ liệu.
## 5. News & Catalysts
Tối đa 2 catalyst liên quan, có source/timestamp; loại bỏ headline không liên quan.
## 6. Bull / Base / Bear Scenarios
Ba kịch bản có điều kiện, không gán xác suất nếu context không có mô hình xác suất.
## 7. Risk Checklist
3-5 rủi ro cụ thể và dữ liệu cần bổ sung.

Kết thúc bằng đúng câu: "Thông tin chỉ mang tính tham khảo, không phải lời khuyên đầu tư."`;

async function requestGroq(apiKey: string, model: string, prompt: string, systemPrompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 1800,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  return { response, data: await response.json() as GroqResponse };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY chưa được cấu hình." }, { status: 503 });

    const rawBody: unknown = await request.json();
    const body: AnalysisRequest = isRecord(rawBody) ? rawBody : {};
    const analysisContext = body.analysisContext;
    const isStockAnalysis = analysisContext?.analysisType === "stock";
    const hasAnalysisData = analysisContext
      && isRecord(analysisContext.portfolio)
      && (isStockAnalysis ? isRecord(analysisContext.stock) : Array.isArray(analysisContext.positions));
    if (!hasAnalysisData) {
      return NextResponse.json({ error: "Thiếu dữ liệu danh mục có cấu trúc để phân tích." }, { status: 400 });
    }

    const userRequest = Array.isArray(body.messages)
      ? body.messages.filter(isAnalysisMessage).at(-1)?.content
      : "Phân tích rủi ro danh mục.";
    const compactSchema = isStockAnalysis
      ? "SCHEMA: stock={symbol,quantity,avgPrice,price,value,weightPct,pnl,returnPct}; market[].tech={price,r1m,r3m,r1y,ma50,ma200,trend,fromHigh52wPct,volumeDeltaPct}; market[].financials={period,revenue,ebitda,netIncome}; market[].news={summary,source,time}."
      : "SCHEMA: portfolio={totalValue,totalCost,unrealizedPnl,returnPct,riskScore,concentrationHhi,leaders,stress}; positions[]={symbol,value,weightPct,pnl,returnPct}; market uses the same compact tech, financials and news fields as stock analysis.";
    const prompt = `${compactSchema}\n\nANALYSIS_CONTEXT:\n${JSON.stringify(analysisContext)}\n\nUSER_REQUEST:\n${userRequest || "Phân tích rủi ro danh mục."}`;
    const systemPrompt = analysisContext.analysisType === "stock" ? STOCK_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const primaryModel = process.env.GROQ_ANALYSIS_MODEL || "llama-3.3-70b-versatile";
    let result;
    try {
      result = await requestGroq(apiKey, primaryModel, prompt, systemPrompt);
    } catch {
      result = await requestGroq(apiKey, "llama-3.1-8b-instant", prompt, systemPrompt);
    }
    let { response, data } = result;
    if (!response.ok && (response.status === 429 || response.status >= 500) && primaryModel !== "llama-3.1-8b-instant") {
      ({ response, data } = await requestGroq(apiKey, "llama-3.1-8b-instant", prompt, systemPrompt));
    }
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || "Groq không thể phân tích danh mục." }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ error: "AI không trả về nội dung phân tích." }, { status: 502 });
    return NextResponse.json({ content: [{ text }], model: data.model });
  } catch (error: unknown) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "Không thể kết nối AI Analyst." }, { status: 500 });
  }
}
