export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker, strikePrice, daysToExpiry, optionPrice, expiryDate, fetchChain } = req.body;

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const polygonKey = process.env.POLYGON_API_KEY;

  if (!finnhubKey && !polygonKey) {
    return res.status(500).json({ error: 'Missing API keys' });
  }

  try {
    // ========== FETCH OPTIONS CHAIN (Finnhub) ==========
    if (fetchChain && ticker && expiryDate) {
      console.log(`[Finnhub] Fetching options chain for ${ticker} expiring ${expiryDate}`);
      
      // Get current stock price first
      let currentPrice = 100;
      try {
        const priceRes = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          currentPrice = priceData.c || 100;
        }
      } catch (err) {
        console.log('[Finnhub] Price fetch failed, using fallback');
      }

      // Fetch options data from Finnhub
      try {
        const chainRes = await fetch(
          `https://finnhub.io/api/v1/stock/option-chain?symbol=${ticker}&from=${expiryDate}&to=${expiryDate}&token=${finnhubKey}`
        );

        if (chainRes.ok) {
          const chainData = await chainRes.json();
          
          if (chainData.data && chainData.data.length > 0) {
            // Parse Finnhub options chain format
            const optionsChain = chainData.data
              .map(opt => ({
                strike: opt.strike,
                bid: opt.bid || 0,
                ask: opt.ask || 0,
                mid: ((opt.bid || 0) + (opt.ask || 0)) / 2,
                iv: opt.impliedVolatility || 0,
                delta: opt.delta || 0,
                type: opt.type || 'PUT'
              }))
              .filter(opt => opt.bid > 0 && opt.ask > 0)
              .sort((a, b) => a.strike - b.strike);

            if (optionsChain.length > 0) {
              console.log(`[Finnhub] ✅ Got ${optionsChain.length} strikes for ${ticker}`);
              return res.status(200).json({
                optionsChain,
                currentPrice,
                ticker,
                expiryDate,
                dataSource: 'finnhub'
              });
            }
          }
        }
      } catch (err) {
        console.log('[Finnhub] Chain fetch error:', err.message);
      }

      // Fallback: Return empty chain
      console.log(`[Finnhub] No chain data found, returning empty`);
      return res.status(200).json({
        optionsChain: [],
        currentPrice,
        ticker,
        expiryDate,
        message: 'Could not fetch options chain. Please enter manually.',
        dataSource: 'fallback'
      });
    }

    // ========== ANALYZE TRADE (existing logic) ==========
    if (!strikePrice || !optionPrice) {
      return res.status(400).json({ error: 'Strike price and option price required' });
    }

    // Get real stock data from Finnhub
    let lastClose = 100;
    try {
      const priceRes = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        lastClose = priceData.c || 100;
      }
    } catch (err) {
      console.log('[Finnhub] Price fetch failed');
    }

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
    if (polygonKey) {
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
