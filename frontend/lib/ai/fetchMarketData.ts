const FINNHUB = 'https://finnhub.io/api/v1'
const KEY = process.env.FINNHUB_API_KEY

async function get(path: string) {
  const res = await fetch(`${FINNHUB}${path}&token=${KEY}`, {
    next: { revalidate: 300 } // cache 5 phút
  })
  return res.json()
}

export async function fetchMarketData({
  mode, symbol, positions
}: { mode: string; symbol?: string; positions: any[] }) {

  if (mode === 'single' && symbol) {
    // Fetch đầy đủ cho 1 cổ phiếu
    const [quote, rsi, macd, bb, news, profile] = await Promise.all([
      get(`/quote?symbol=${symbol}`),
      get(`/indicator?symbol=${symbol}&resolution=D&indicator=rsi&timeperiod=14`),
      get(`/indicator?symbol=${symbol}&resolution=D&indicator=macd&fastperiod=12&slowperiod=26&signalperiod=9`),
      get(`/indicator?symbol=${symbol}&resolution=D&indicator=bbands&timeperiod=20`),
      get(`/company-news?symbol=${symbol}&from=${daysAgo(7)}&to=${today()}`),
      get(`/stock/profile2?symbol=${symbol}`)
    ])
    return { quote, rsi, macd, bb, news: news.slice(0,5), profile }
  }

  if (mode === 'portfolio') {
    // Fetch RSI + quote cho tất cả tickers trong danh mục
    const tickers = positions.map(p => p.symbol)
    const results = await Promise.all(
      tickers.map(async (t) => ({
        symbol: t,
        quote: await get(`/quote?symbol=${t}`),
        rsi:   await get(`/indicator?symbol=${t}&resolution=D&indicator=rsi&timeperiod=14`),
      }))
    )
    return { tickers: results }
  }

  return {}
}

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
