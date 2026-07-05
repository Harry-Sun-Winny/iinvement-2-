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

const SYSTEM_PROMPT = `Báº¡n lÃ  Senior Portfolio Risk Analyst phá»¥c vá»¥ nhÃ  Ä‘áº§u tÆ° chuyÃªn nghiá»‡p.

NGUYÃŠN Táº®C PHÃ‚N TÃCH:
1. Chá»‰ sá»­ dá»¥ng sá»‘ liá»‡u trong ANALYSIS_CONTEXT. KhÃ´ng tá»± táº¡o giÃ¡, tá»· trá»ng, beta, ngÃ nh hoáº·c dá»¯ liá»‡u thá»‹ trÆ°á»ng.
2. Má»i nháº­n Ä‘á»‹nh quan trá»ng pháº£i viá»‡n dáº«n Ã­t nháº¥t má»™t con sá»‘ hoáº·c mÃ£ tÃ i sáº£n cá»¥ thá»ƒ.
3. PhÃ¢n biá»‡t rÃµ: dá»¯ kiá»‡n, suy luáº­n vÃ  dá»¯ liá»‡u cÃ²n thiáº¿u.
4. KhÃ´ng Ä‘Æ°a ra lá»‡nh mua/bÃ¡n tuyá»‡t Ä‘á»‘i, giÃ¡ má»¥c tiÃªu hoáº·c báº£o Ä‘áº£m lá»£i nhuáº­n.
5. CÃ¡c hÃ nh Ä‘á»™ng pháº£i cÃ³ Ä‘iá»u kiá»‡n, vÃ­ dá»¥: "Náº¿u tá»· trá»ng vÆ°á»£t X%..." hoáº·c "Náº¿u drawdown vÆ°á»£t Y%...".
6. KhÃ´ng gá»i P/L chÆ°a thá»±c hiá»‡n lÃ  lá»£i nhuáº­n Ä‘Ã£ chá»‘t.
7. DÃ¹ng portfolio.returnPercent lÃ m tá»· suáº¥t sinh lá»i theo giÃ¡ vá»‘n; khÃ´ng tá»± tÃ­nh láº¡i báº±ng P/L chia market value.
8. KhÃ´ng so sÃ¡nh vá»›i thá»‹ trÆ°á»ng hoáº·c benchmark náº¿u context khÃ´ng cung cáº¥p dá»¯ liá»‡u benchmark.
9. Khi marketIntelligence cÃ³ dá»¯ liá»‡u, pháº£i liÃªn káº¿t vá»‹ tháº¿ vá»›i return 1M/3M/1Y, MA50/MA200, volume, fundamentals vÃ  recentNews.
10. Chá»‰ gá»i tin tá»©c lÃ  catalyst tiá»m nÄƒng; khÃ´ng kháº³ng Ä‘á»‹nh quan há»‡ nhÃ¢n quáº£ giá»¯a headline vÃ  biáº¿n Ä‘á»™ng giÃ¡.
11. Náº¿u dataCoverage tháº¥p hoáº·c khÃ´ng cÃ³ news, pháº£i nÃ³i rÃµ thay vÃ¬ suy Ä‘oÃ¡n.
12. Tráº£ lá»i báº±ng tiáº¿ng Viá»‡t, sÃºc tÃ­ch nhÆ°ng Ä‘á»§ chiá»u sÃ¢u.

FORMAT Báº®T BUá»˜C:
KhÃ´ng Ä‘Æ°á»£c bá» báº¥t ká»³ má»¥c nÃ o dÆ°á»›i Ä‘Ã¢y. Má»—i má»¥c Æ°u tiÃªn sá»‘ liá»‡u hÆ¡n diá»…n giáº£i dÃ i.
## 1. Executive Summary
3-5 cÃ¢u, nÃªu tá»•ng giÃ¡ trá»‹, return, risk score vÃ  váº¥n Ä‘á» quan trá»ng nháº¥t.

## 2. Portfolio Diagnostics
Báº£ng Markdown gá»“m: Metric | Value | Interpretation. Pháº£i cÃ³ concentration HHI, largest position, best/worst position.

## 3. Key Risk Signals
3-5 rá»§i ro, má»—i rá»§i ro gá»“m Evidence, Why it matters, Severity (Low/Medium/High).

## 4. Market Context & Catalysts
Vá»›i tá»‘i Ä‘a 5 vá»‹ tháº¿ lá»›n nháº¥t, nÃªu xu hÆ°á»›ng ká»¹ thuáº­t, fundamentals má»›i nháº¥t vÃ  tá»‘i Ä‘a 2 catalyst tin tá»©c cÃ³ timestamp/source. Chá»‰ nÃªu catalyst thá»±c sá»± liÃªn quan.

## 5. Stress Scenarios
PhÃ¢n tÃ­ch hai stress test cÃ³ trong context vÃ  diá»…n giáº£i tÃ¡c Ä‘á»™ng theo tiá»n vÃ  % danh má»¥c.

## 6. Conditional Actions
3-5 hÃ nh Ä‘á»™ng cÃ³ Ä‘iá»u kiá»‡n, cÃ³ thá»© tá»± Æ°u tiÃªn vÃ  ngÆ°á»¡ng kiá»ƒm soÃ¡t rÃµ rÃ ng. KhÃ´ng dÃ¹ng cÃ¢u chung chung nhÆ° "hÃ£y Ä‘a dáº¡ng hÃ³a" náº¿u khÃ´ng chá»‰ ra vá»‹ tháº¿/tá»· trá»ng liÃªn quan.

## 7. Data Gaps
NÃªu dá»¯ liá»‡u cÃ²n thiáº¿u vÃ  Ä‘iá»u gÃ¬ khÃ´ng thá»ƒ káº¿t luáº­n vÃ¬ thiáº¿u dá»¯ liá»‡u.

Káº¿t thÃºc báº±ng Ä‘Ãºng cÃ¢u: "ThÃ´ng tin chá»‰ mang tÃ­nh tham kháº£o, khÃ´ng pháº£i lá»i khuyÃªn Ä‘áº§u tÆ°."`;

const STOCK_SYSTEM_PROMPT = `Báº¡n lÃ  Senior Equity Research Analyst phá»¥c vá»¥ nhÃ  Ä‘áº§u tÆ° chuyÃªn nghiá»‡p.

NGUYÃŠN Táº®C:
1. Chá»‰ dÃ¹ng dá»¯ liá»‡u trong ANALYSIS_CONTEXT; khÃ´ng bá»‹a giÃ¡, tin tá»©c, fundamentals, ngÃ nh, beta hoáº·c valuation.
2. Tráº£ lá»i trá»±c tiáº¿p USER_REQUEST trÆ°á»›c, sau Ä‘Ã³ má»›i má»Ÿ rá»™ng phÃ¢n tÃ­ch.
3. Má»—i nháº­n Ä‘á»‹nh pháº£i gáº¯n vá»›i sá»‘ liá»‡u, má»‘c thá»i gian hoáº·c headline/source cá»¥ thá»ƒ.
4. PhÃ¢n biá»‡t dá»¯ kiá»‡n, suy luáº­n vÃ  dá»¯ liá»‡u thiáº¿u. Tin tá»©c chá»‰ lÃ  catalyst tiá»m nÄƒng, khÃ´ng máº·c Ä‘á»‹nh lÃ  nguyÃªn nhÃ¢n biáº¿n Ä‘á»™ng giÃ¡.
5. DÃ¹ng return 1M/3M/1Y, MA50/MA200, volume vÃ  khoáº£ng cÃ¡ch 52 tuáº§n Ä‘á»ƒ xÃ¡c Ä‘á»‹nh technical regime.
6. Fundamentals chá»‰ Ä‘Æ°á»£c so sÃ¡nh theo thá»i gian khi context cÃ³ nhiá»u ká»³; khÃ´ng suy ra tÄƒng trÆ°á»Ÿng tá»« má»™t ká»³ duy nháº¥t.
7. KhÃ´ng Ä‘Æ°a lá»‡nh mua/bÃ¡n, giÃ¡ má»¥c tiÃªu hay báº£o Ä‘áº£m lá»£i nhuáº­n.

FORMAT Báº®T BUá»˜C:
## 1. Direct Answer
Tráº£ lá»i tháº³ng yÃªu cáº§u cá»§a ngÆ°á»i dÃ¹ng trong 3-5 cÃ¢u.
## 2. Stock Snapshot
Báº£ng Metric | Value | Interpretation: vá»‹ tháº¿ trong danh má»¥c, return, MA50/MA200, 52W range, volume, market cap.
## 3. Technical Regime
Xu hÆ°á»›ng, Ä‘á»™ng lÆ°á»£ng, cÃ¡c ngÆ°á»¡ng cáº§n theo dÃµi tá»« dá»¯ liá»‡u cÃ³ sáºµn.
## 4. Fundamentals
Revenue, EBITDA, Net Income vÃ  giá»›i háº¡n Ä‘á»™ phá»§ dá»¯ liá»‡u.
## 5. News & Catalysts
Tá»‘i Ä‘a 2 catalyst liÃªn quan, cÃ³ source/timestamp; loáº¡i bá» headline khÃ´ng liÃªn quan.
## 6. Bull / Base / Bear Scenarios
Ba ká»‹ch báº£n cÃ³ Ä‘iá»u kiá»‡n, khÃ´ng gÃ¡n xÃ¡c suáº¥t náº¿u context khÃ´ng cÃ³ mÃ´ hÃ¬nh xÃ¡c suáº¥t.
## 7. Risk Checklist
3-5 rá»§i ro cá»¥ thá»ƒ vÃ  dá»¯ liá»‡u cáº§n bá»• sung.

Káº¿t thÃºc báº±ng Ä‘Ãºng cÃ¢u: "ThÃ´ng tin chá»‰ mang tÃ­nh tham kháº£o, khÃ´ng pháº£i lá»i khuyÃªn Ä‘áº§u tÆ°."`;

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
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh." }, { status: 503 });

    const rawBody: unknown = await request.json();
    const body: AnalysisRequest = isRecord(rawBody) ? rawBody : {};
    const analysisContext = body.analysisContext;
    const isStockAnalysis = analysisContext?.analysisType === "stock";
    const hasAnalysisData = analysisContext
      && isRecord(analysisContext.portfolio)
      && (isStockAnalysis ? isRecord(analysisContext.stock) : Array.isArray(analysisContext.positions));
    if (!hasAnalysisData) {
      return NextResponse.json({ error: "Thiáº¿u dá»¯ liá»‡u danh má»¥c cÃ³ cáº¥u trÃºc Ä‘á»ƒ phÃ¢n tÃ­ch." }, { status: 400 });
    }

    const userRequest = Array.isArray(body.messages)
      ? body.messages.filter(isAnalysisMessage).at(-1)?.content
      : "PhÃ¢n tÃ­ch rá»§i ro danh má»¥c.";
    const compactSchema = isStockAnalysis
      ? "SCHEMA: stock={symbol,quantity,avgPrice,price,value,weightPct,pnl,returnPct}; market[].tech={price,r1m,r3m,r1y,ma50,ma200,trend,fromHigh52wPct,volumeDeltaPct}; market[].financials={period,revenue,ebitda,netIncome}; market[].news={summary,source,time}."
      : "SCHEMA: portfolio={totalValue,totalCost,unrealizedPnl,returnPct,riskScore,concentrationHhi,leaders,stress}; positions[]={symbol,value,weightPct,pnl,returnPct}; market uses the same compact tech, financials and news fields as stock analysis.";
    const prompt = `${compactSchema}\n\nANALYSIS_CONTEXT:\n${JSON.stringify(analysisContext)}\n\nUSER_REQUEST:\n${userRequest || "PhÃ¢n tÃ­ch rá»§i ro danh má»¥c."}`;
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
      return NextResponse.json({ error: data?.error?.message || "Groq khÃ´ng thá»ƒ phÃ¢n tÃ­ch danh má»¥c." }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ error: "AI khÃ´ng tráº£ vá» ná»™i dung phÃ¢n tÃ­ch." }, { status: 502 });
    return NextResponse.json({ content: [{ text }], model: data.model });
  } catch (error: unknown) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "KhÃ´ng thá»ƒ káº¿t ná»‘i AI Analyst." }, { status: 500 });
  }
}
