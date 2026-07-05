import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { fetchMarketData } from '@/lib/ai/fetchMarketData'
import { buildPrompt } from '@/lib/ai/buildPrompt'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { positions, prices, mode, symbol, question } = await req.json()

  // 1. Fetch technical data tháº­t tá»« Finnhub
  const marketData = await fetchMarketData({ mode, symbol, positions })

  // 2. Build prompt vá»›i data tháº­t
  const prompt = buildPrompt({ mode, symbol, question, positions, prices, marketData })

  // 3. Gá»i Claude vá»›i streaming
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = await client.messages.stream({
    model: 'claude-3-5-sonnet-latest', // Adjusted to a common correct model name, user can revert if needed
    max_tokens: 2048,
    system: `Báº¡n lÃ  chuyÃªn gia phÃ¢n tÃ­ch chá»©ng khoÃ¡n Viá»‡t Nam vÃ  quá»‘c táº¿.
PhÃ¢n tÃ­ch dá»±a trÃªn dá»¯ liá»‡u thá»±c táº¿ Ä‘Æ°á»£c cung cáº¥p.
Tráº£ lá»i báº±ng tiáº¿ng Viá»‡t, rÃµ rÃ ng, cÃ³ cáº¥u trÃºc.
DÃ¹ng markdown: ## heading, **bold**, bullet points.
LuÃ´n Ä‘Æ°a ra nháº­n Ä‘á»‹nh Cá»¤ THá»‚ (Mua/BÃ¡n/Giá»¯) vá»›i lÃ½ do rÃµ rÃ ng.`,
    messages: [{ role: 'user', content: prompt }]
  })

  // 4. Stream vá» client
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
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
