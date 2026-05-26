export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker, strikePrice, daysToExpiry, optionPrice, expiryDate, fetchChain } = req.body;

  const polygonKey = process.env.POLYGON_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!polygonKey) {
    return res.status(500).json({ error: 'Missing POLYGON_API_KEY' });
  }

  try {
    // ========== FETCH OPTIONS CHAIN ==========
    if (fetchChain && ticker && expiryDate) {
      console.log(`[Polygon] Fetching options chain for ${ticker} expiring ${expiryDate}`);
      
      // Get quote first
      const quoteRes = await fetch(
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/ticker/${ticker}?apikey=${polygonKey}`
      );
      const quoteData = await quoteRes.json();
      const currentPrice = quoteData.results?.last_quote?.ask || quoteData.results?.last_trade?.price || 0;

      // Format expiry date for Polygon (YYYY-MM-DD)
      const expiryFormatted = new Date(expiryDate).toISOString().split('T')[0];

      // Fetch options chain
      const chainRes = await fetch(
        `https://api.polygon.io/v3/snapshot/options/chains/${ticker}?expiration_date=${expiryFormatted}&apikey=${polygonKey}`
      );
      
      if (!chainRes.ok) {
        console.log(`[Polygon] Chain fetch failed (${chainRes.status}), returning empty chain`);
        return res.status(200).json({
          optionsChain: [],
          currentPrice,
          ticker,
          expiryDate,
          message: 'Could not fetch options chain. Please enter manually.'
        });
      }

      const chainData = await chainRes.json();
      const results = chainData.results || [];

      // Parse strikes with bid/ask
      const optionsChain = results
        .filter(opt => opt.details && opt.details.strike_price)
        .map(opt => ({
          strike: opt.details.strike_price,
          bid: opt.bid || 0,
          ask: opt.ask || 0,
          mid: ((opt.bid || 0) + (opt.ask || 0)) / 2,
          iv: opt.iv || 0,
          delta: opt.delta || 0,
          type: opt.details.contract_type === 'call' ? 'CALL' : 'PUT'
        }))
        .sort((a, b) => a.strike - b.strike);

      console.log(`[Polygon] ✅ Got ${optionsChain.length} strikes for ${ticker}`);

      return res.status(200).json({
        optionsChain,
        currentPrice,
        ticker,
        expiryDate,
        dataSource: 'polygon'
      });
    }

    // ========== ANALYZE TRADE (existing logic) ==========
    if (!strikePrice || !optionPrice) {
      return res.status(400).json({ error: 'Strike price and option price required' });
    }

    // Get real stock data
    const quoteRes = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/ticker/${ticker}?apikey=${polygonKey}`
    );
    
    if (!quoteRes.ok) {
      console.log(`[Polygon] Quote fetch failed, using fallback data`);
      return res.status(200).json({
        ticker,
        lastClose: parseFloat(strikePrice) || 100,
        rsi14: 50,
        rsiInterpretation: 'Neutral',
        stochasticK: 50,
        macdSignal: 'Neutral',
        ivPercentile: 50,
        dataSource: 'fallback'
      });
    }

    const quoteData = await quoteRes.json();
    const lastClose = quoteData.results?.last_quote?.ask || quoteData.results?.last_trade?.price || 100;

    let data = {
      ticker,
      lastClose,
      rsi14: 50,
      rsiInterpretation: 'Neutral',
      stochasticK: 50,
      macdSignal: 'Neutral',
      ivPercentile: 50,
      dataSource: 'fallback'
    };

    // Try Polygon RSI
    try {
      const rsiRes = await fetch(
        `https://api.polygon.io/v1/indicators/rsi/${ticker}?timespan=day&window=14&series_type=close&long_window=26&short_window=12&signal_window=9&apikey=${polygonKey}`
      );

      if (rsiRes.ok) {
        const rsiData = await rsiRes.json();
        if (rsiData.results && rsiData.results.values && rsiData.results.values.length > 0) {
          const latestRSI = rsiData.results.values[0].value;
          data.rsi14 = Math.round(latestRSI);
          data.rsiInterpretation = latestRSI > 70 ? 'Overbought' : latestRSI < 30 ? 'Oversold' : 'Neutral';
          data.dataSource = 'polygon';
          console.log(`[Polygon] ✅ Got RSI: ${data.rsi14}`);
        }
      }
    } catch (err) {
      console.log(`[Polygon] RSI fetch error, continuing with fallback`);
    }

    // Try Polygon MACD
    try {
      const macdRes = await fetch(
        `https://api.polygon.io/v1/indicators/macd/${ticker}?timespan=day&short_window=12&long_window=26&signal_window=9&apikey=${polygonKey}`
      );

      if (macdRes.ok) {
        const macdData = await macdRes.json();
        if (macdData.results && macdData.results.values && macdData.results.values.length > 0) {
          const latest = macdData.results.values[0];
          data.macdSignal = latest.value > latest.signal ? 'Bullish Crossover' : 'Bearish Crossover';
          console.log(`[Polygon] ✅ Got MACD: ${data.macdSignal}`);
        }
      }
    } catch (err) {
      console.log(`[Polygon] MACD fetch error, continuing with fallback`);
    }

    // Stochastic estimate based on RSI
    data.stochasticK = Math.round((data.rsi14 + 50) / 2);
    data.ivPercentile = 50;

    res.status(200).json(data);
  } catch (err) {
    console.error('[Error]', err);
    res.status(500).json({ error: err.message });
  }
}
