export function buildPrompt({ mode, symbol, question, positions, prices, marketData }: any) {

  if (mode === 'single' && symbol) {
    const { quote, rsi, macd, bb, news, profile } = marketData
    const pos = positions.find((p: any) => p.symbol === symbol)
    const rsiVal = rsi?.rsi?.at(-1)?.toFixed(1) ?? 'N/A'
    const macdVal = macd?.macd?.at(-1)?.toFixed(2) ?? 'N/A'
    const macdSig = macd?.signal?.at(-1)?.toFixed(2) ?? 'N/A'
    const bbU = bb?.upperband?.at(-1)?.toFixed(2) ?? 'N/A'
    const bbL = bb?.lowerband?.at(-1)?.toFixed(2) ?? 'N/A'
    const newsText = (news ?? [])
      .map((n: any) => `- ${n.headline} (${n.source})`)
      .join('\n')

    return `Phân tích cổ phiếu ${symbol} — ${profile?.name ?? ''} cho tôi.

## DỮ LIỆU THỰC TẾ:

### Thông tin trong danh mục:
- Giá mua vào: $${pos?.avgCost ?? 'N/A'}
- Số lượng: ${pos?.quantity ?? 'N/A'}
- Lợi nhuận hiện tại: ${pos?.pnl ?? 'N/A'}

### Giá thị trường:
- Giá hiện tại: $${quote?.c ?? 'N/A'}
- Thay đổi hôm nay: ${quote?.dp?.toFixed(2) ?? 'N/A'}%
- High/Low ngày: $${quote?.h ?? 'N/A'} / $${quote?.l ?? 'N/A'}

### Chỉ số kỹ thuật:
- RSI(14): ${rsiVal}
- MACD: ${macdVal} | Signal: ${macdSig}
- BB Upper: $${bbU} | BB Lower: $${bbL}

### Thông tin công ty:
- Vốn hoá: $${profile?.marketCapitalization?.toFixed(0) ?? 'N/A'}M
- P/E: ${profile?.peRatio ?? 'N/A'}
- Ngành: ${profile?.finnhubIndustry ?? 'N/A'}

### Tin tức 7 ngày qua:
${newsText || 'Không có tin tức mới'}

## YÊU CẦU PHÂN TÍCH:
1. **Nhận định tổng quan** — cổ phiếu đang ở giai đoạn nào?
2. **Phân tích kỹ thuật** — RSI, MACD, BB nói lên điều gì?
3. **Rủi ro cần chú ý** — top 3 rủi ro cụ thể
4. **Khuyến nghị** — Mua thêm / Giữ / Bán một phần / Chốt lời
5. **Mức giá tham chiếu** — vùng mua tốt và stop-loss gợi ý`
  }

  if (mode === 'portfolio') {
    const positionsSummary = (marketData.tickers ?? [])
      .map(({ symbol, quote, rsi }: any) => {
        const pos = positions.find((p: any) => p.symbol === symbol)
        const rsiVal = rsi?.rsi?.at(-1)?.toFixed(1) ?? 'N/A'
        return `| ${symbol} | $${quote?.c ?? 'N/A'} | ${quote?.dp?.toFixed(1) ?? '?'}% | RSI:${rsiVal} | P&L: ${pos?.pnlPct ?? 'N/A'}% |`
      }).join('\n')

    return `Phân tích toàn bộ danh mục đầu tư của tôi.

## DANH MỤC HIỆN TẠI:
| Ticker | Giá | Thay đổi | RSI | P&L |
|--------|-----|----------|-----|-----|
${positionsSummary}

## YÊU CẦU:
1. **Sức khoẻ tổng thể** — danh mục đang tốt hay xấu?
2. **Cổ phiếu cần chú ý ngay** — top 2-3 cần hành động
3. **Rủi ro tập trung** — có quá tập trung ngành/cổ phiếu nào không?
4. **Cơ hội** — tín hiệu tốt nào đang xuất hiện?
5. **Hành động ưu tiên** — 3 việc cụ thể cần làm tuần này`
  }

  if (mode === 'question') {
    return `Người dùng hỏi về danh mục đầu tư:

Câu hỏi: ${question}

Danh mục hiện tại:
${positions.map((p: any) => `- ${p.symbol}: ${p.quantity} cổ, giá mua $${p.avgCost}`).join('\n')}

Hãy trả lời trực tiếp, cụ thể, có số liệu thực tế.`
  }

  return 'Hãy phân tích danh mục này.'
}
