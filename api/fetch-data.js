export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker, strikePrice, daysToExpiry, optionPrice, expiryDate, fetchExpirations, fetchStrikes, getPriceOnly } = req.body;
  const polygonKey = process.env.POLYGON_API_KEY;

  if (!polygonKey) {
    return res.status(500).json({ error: 'Missing POLYGON_API_KEY' });
  }

  try {
    // ========== GET PRICE ONLY ==========
    if (getPriceOnly && ticker) {
      console.log(`[Polygon] Fetching price for ${ticker}`);
      let lastClose = 100;
      try {
        // Try last quote endpoint (real-time)
        const priceRes = await fetch(
          `https://api.polygon.io/v3/quotes/latest?symbols=${ticker}&apikey=${polygonKey}`
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.results && priceData.results[0]) {
            lastClose = priceData.results[0].last_quote?.ask || priceData.results[0].last_price || 100;
            console.log(`[Polygon] Got last price for ${ticker}: $${lastClose}`);
          }
        }
        
        // If last quote didn't work, try previous close dates
        if (lastClose === 100) {
          console.log('[Polygon] Last quote returned $100, trying previous dates');
          for (let daysBack = 0; daysBack <= 7; daysBack++) {
            const date = new Date();
            date.setDate(date.getDate() - daysBack);
            const dateStr = date.toISOString().split('T')[0];
            
            const res2 = await fetch(
              `https://api.polygon.io/v1/open-close/${ticker}/${dateStr}?apikey=${polygonKey}`
            );
            if (res2.ok) {
              const data = await res2.json();
              if (data.close && data.close !== 100) {
                lastClose = data.close;
                console.log(`[Polygon] Got close for ${dateStr}: $${lastClose}`);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.log('[Polygon] Price fetch failed:', err.message);
      }
      return res.status(200).json({ lastClose, ticker });
    }

    // ========== FETCH EXPIRATIONS ==========
    if (fetchExpirations && ticker) {
      console.log(`[Polygon] Fetching expirations for ${ticker}`);
      
      try {
        const res2 = await fetch(
          `https://api.polygon.io/v3/snapshot/options/${ticker}?order=desc&limit=250&apikey=${polygonKey}`
        );
        
        if (res2.ok) {
          const data = await res2.json();
          
          if (data.results && Array.isArray(data.results)) {
            // Extract unique expiration dates
            const expirations = new Set();
            const expirationDates = [];
            
            data.results.forEach(opt => {
              const expiry = opt.details?.expiration_date;
              if (expiry && !expirations.has(expiry)) {
                expirations.add(expiry);
                expirationDates.push(expiry);
              }
            });
            
            console.log(`[Polygon] Found ${expirationDates.length} total unique expirations`);
            console.log(`[Polygon] Sample expirations: ${expirationDates.slice(0, 10).join(', ')}`);
            
            // Filter to next 12 months (more generous)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            oneYearFromNow.setHours(23, 59, 59, 999);
            
            const filteredExpirations = expirationDates.filter(expiry => {
              try {
                // Parse date (could be 2026-05-29 or 20260529)
                let expiryDate;
                if (expiry.includes('-')) {
                  expiryDate = new Date(expiry + 'T00:00:00Z');
                } else {
                  // Format: YYYYMMDD
                  const year = parseInt(expiry.substring(0, 4));
                  const month = parseInt(expiry.substring(4, 6)) - 1;
                  const day = parseInt(expiry.substring(6, 8));
                  expiryDate = new Date(year, month, day);
                }
                
                const isValid = expiryDate >= today && expiryDate <= oneYearFromNow;
                return isValid;
              } catch (e) {
                console.log(`[Polygon] Could not parse date: ${expiry}`);
                return false;
              }
            }).sort();
            
            console.log(`[Polygon] ✅ Filtered to ${filteredExpirations.length} expirations in next 12 months`);
            console.log(`[Polygon] Expirations: ${filteredExpirations.slice(0, 15).join(', ')}`);
            
            return res.status(200).json({
              expirations: filteredExpirations,
              ticker
            });
          }
        }
      } catch (err) {
        console.log('[Polygon] Expirations fetch error:', err.message);
      }
      
      return res.status(200).json({ expirations: [], ticker });
    }

    // ========== FETCH STRIKES FOR EXPIRATION ==========
    if (fetchStrikes && ticker && expiryDate) {
      console.log(`[Polygon] Fetching strikes for ${ticker} expiring ${expiryDate}`);
      
      let optionsChain = [];
      
      try {
        const res2 = await fetch(
          `https://api.polygon.io/v3/snapshot/options/${ticker}?order=desc&limit=250&apikey=${polygonKey}`
        );
        
        if (res2.ok) {
          const data = await res2.json();
          
          if (data.results && Array.isArray(data.results)) {
            console.log(`[Polygon] Got ${data.results.length} total options`);
            
            // Filter by expiration date
            const filtered = data.results.filter(opt => opt.details?.expiration_date === expiryDate);
            console.log(`[Polygon] Filtered to ${filtered.length} options for ${expiryDate}`);
            
            if (filtered.length > 0) {
              optionsChain = filtered
                .map(opt => ({
                  strike: opt.details?.strike_price || 0,
                  bid: opt.bid_price || 0,
                  ask: opt.ask_price || 0,
                  mid: ((opt.bid_price || 0) + (opt.ask_price || 0)) / 2,
                  iv: opt.implied_volatility || 0,
                  delta: opt.greeks?.delta || 0,
                  type: opt.details?.contract_type === 'call' ? 'CALL' : 'PUT'
                }))
                .filter(opt => opt.strike > 0)
                .sort((a, b) => a.strike - b.strike);
              
              console.log(`[Polygon] ✅ Parsed ${optionsChain.length} strikes`);
            }
          }
        }
      } catch (err) {
        console.log('[Polygon] Strikes fetch error:', err.message);
      }
      
      return res.status(200).json({
        optionsChain,
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
      // Try last quote (real-time)
      const priceRes = await fetch(
        `https://api.polygon.io/v3/quotes/latest?symbols=${ticker}&apikey=${polygonKey}`
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        if (priceData.results && priceData.results[0]) {
          lastClose = priceData.results[0].last_quote?.ask || priceData.results[0].last_price || 100;
          console.log(`[Polygon] Got last price for ${ticker}: $${lastClose}`);
        }
      }
      
      // If last quote didn't work, try previous close dates
      if (lastClose === 100) {
        console.log('[Polygon] Last quote returned $100, trying previous dates');
        for (let daysBack = 0; daysBack <= 7; daysBack++) {
          const date = new Date();
          date.setDate(date.getDate() - daysBack);
          const dateStr = date.toISOString().split('T')[0];
          
          const res2 = await fetch(
            `https://api.polygon.io/v1/open-close/${ticker}/${dateStr}?apikey=${polygonKey}`
          );
          if (res2.ok) {
            const data = await res2.json();
            if (data.close && data.close !== 100) {
              lastClose = data.close;
              console.log(`[Polygon] Got close for ${dateStr}: $${lastClose}`);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.log('[Polygon] Price fetch failed:', err.message);
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
