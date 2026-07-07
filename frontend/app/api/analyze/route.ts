import { NextRequest } from 'next/server'
import { fetchMarketData } from '@/lib/ai/fetchMarketData'
import { buildPrompt } from '@/lib/ai/buildPrompt'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { positions, prices, mode, symbol, question } = await req.json()

  // 1. Fetch technical data thật từ Finnhub
  const marketData = await fetchMarketData({ mode, symbol, positions })

  // 2. Build prompt với data thật
  const prompt = buildPrompt({ mode, symbol, question, positions, prices, marketData })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response("GROQ_API_KEY chưa được cấu hình.", { status: 503 })
  }

  // 3. Gọi Groq với streaming
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Bạn là chuyên gia phân tích chứng khoán Việt Nam và quốc tế.
Phân tích dựa trên dữ liệu thực tế được cung cấp.
Trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.
Dùng markdown: ## heading, **bold**, bullet points.
Luôn đưa ra nhận định CỤ THỂ (Mua/Bán/Giữ) với lý do rõ ràng.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.15,
      max_tokens: 2048,
      stream: true
    })
  })

  if (!response.ok) {
    return new Response(await response.text(), { status: response.status })
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  // 4. Stream về client
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const cleaned = line.trim()
            if (!cleaned) continue
            if (cleaned === "data: [DONE]") continue
            if (cleaned.startsWith("data: ")) {
              try {
                const json = JSON.parse(cleaned.slice(6))
                const text = json.choices?.[0]?.delta?.content || ""
                if (text) {
                  controller.enqueue(encoder.encode(text))
                }
              } catch (e) {
                // ignore partial json parsing error
              }
            }
          }
        }

        // flush remaining buffer
        const cleaned = buffer.trim()
        if (cleaned.startsWith("data: ")) {
          try {
            const json = JSON.parse(cleaned.slice(6))
            const text = json.choices?.[0]?.delta?.content || ""
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          } catch (e) {}
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    }
  })
}
