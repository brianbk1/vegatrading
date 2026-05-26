export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker, strikePrice, daysToExpiry, optionPrice, expiryDate, fetchChain } = req.body;
  const polygonKey = process.env.POLYGON_API_KEY;

  if (!polygonKey) {
    return res.status(500).json({ error: 'Missing POLYGON_API_KEY' });
  }

  try {
    // ========== FETCH OPTIONS CHAIN (Polygon) ==========
    if (fetchChain && ticker && expiryDate) {
      console.log(`[Polygon] Fetching options chain for ${ticker} expiring ${expiryDate}`);
      
      let currentPrice = 100;
      try {
        const priceRes = await fetch(
          `https://api.polygon.io/v1/open-close/${ticker}/2026-05-26?apikey=${polygonKey}`
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          currentPrice = priceData.close || 100;
        }
      } catch (err) {
        console.log('[Polygon] Price fetch failed');
      }

      let optionsChain = [];
      
      // Try different Polygon endpoints for options
      try {
        console.log(`[Polygon] Trying /v3/snapshot/options/chains endpoint`);
        const chainRes = await fetch(
          `https://api.polygon.io/v3/snapshot/options/chains/${ticker}?expiration_date=${expiryDate}&limit=250&apikey=${polygonKey}`
        );
        
        console.log(`[Polygon] Response status: ${chainRes.status}`);
        
        if (chainRes.ok) {
          const chainData = await chainRes.json();
          console.log(`[Polygon] Response keys:`, Object.keys(chainData));
          console.log(`[Polygon] Full response (first 500 chars):`, JSON.stringify(chainData).substring(0, 500));
          
          if (chainData.results && Array.isArray(chainData.results) && chainData.results.length > 0) {
            console.log(`[Polygon] Found ${chainData.results.length} results`);
            console.log(`[Polygon] First result:`, JSON.stringify(chainData.results[0]));
            
            optionsChain = chainData.results
              .map(opt => ({
                strike: opt.details?.strike_price || opt.strike_price || 0,
                bid: opt.bid_price || opt.bid || 0,
                ask: opt.ask_price || opt.ask || 0,
                mid: ((opt.bid_price || opt.bid || 0) + (opt.ask_price || opt.ask || 0)) / 2,
                iv: opt.implied_volatility || opt.impliedVolatility || 0,
                delta: opt.delta || 0,
                type: opt.details?.contract_type === 'call' ? 'CALL' : 'PUT'
              }))
              .filter(opt => opt.strike > 0)
              .sort((a, b) => a.strike - b.strike);
            
            console.log(`[Polygon] ✅ Parsed ${optionsChain.length} strikes`);
          } else {
            console.log(`[Polygon] No results array found in response`);
          }
        } else {
          const errText = await chainRes.text();
          console.log(`[Polygon] Request failed - Status ${chainRes.status}: ${errText.substring(0, 300)}`);
        }
      } catch (err) {
        console.log('[Polygon] Chain fetch error:', err.message);
      }

      // Try /v1/snapshot/options endpoint as fallback
      if (optionsChain.length === 0) {
        try {
          console.log(`[Polygon] Trying /v1/snapshot/options fallback`);
          const fallbackRes = await fetch(
            `https://api.polygon.io/v1/snapshot/options/${ticker}?apikey=${polygonKey}`
          );
          
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            console.log(`[Polygon] Fallback response:`, Object.keys(fallbackData));
            
            if (fallbackData.results && Array.isArray(fallbackData.results)) {
              optionsChain = fallbackData.results
                .filter(opt => opt.expiration_date === expiryDate)
                .map(opt => ({
                  strike: opt.strike_price || 0,
                  bid: opt.bid || 0,
                  ask: opt.ask || 0,
                  mid: ((opt.bid || 0) + (opt.ask || 0)) / 2,
                  iv: opt.implied_volatility || 0,
                  delta: opt.delta || 0,
                  type: opt.contract_type
                }))
                .filter(opt => opt.strike > 0)
                .sort((a, b) => a.strike - b.strike);
              
              if (optionsChain.length > 0) {
                console.log(`[Polygon] ✅ Fallback got ${optionsChain.length} strikes`);
              }
            }
          }
        } catch (err) {
          console.log('[Polygon] Fallback error:', err.message);
        }
      }

      console.log(`[Polygon] Final result: ${optionsChain.length} strikes`);
      return res.status(200).json({
        optionsChain,
        currentPrice,
        ticker,
        expiryDate,
        dataSource: optionsChain.length > 0 ? 'polygon' : 'fallback'
      });
    }

    // ========== ANALYZE TRADE ==========
    if (!strikePrice || !optionPrice) {
      return res.status(400).json({ error: 'Strike price and option price required' });
    }

    let lastClose = 100;
    try {
      const priceRes = await fetch(
        `https://api.polygon.io/v1/open-close/${ticker}/2026-05-26?apikey=${polygonKey}`
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        lastClose = priceData.close || 100;
      }
    } catch (err) {
      console.log('[Polygon] Price fetch failed');
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
      console.log('[Polygon] RSI fetch error');
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
      console.log('[Polygon] MACD fetch error');
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
