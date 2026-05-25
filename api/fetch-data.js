import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticker, strikePrice, expiryDate, optionPrice } = req.body;
  console.log(`\n=== FETCH-DATA REQUEST ===`);
  console.log(`Ticker: ${ticker}`);
  console.log(`Strike: ${strikePrice}`);
  console.log(`Expiry: ${expiryDate}`);
  console.log(`Option Price: ${optionPrice}`);

  let data = {
    ticker: ticker,
    lastClose: strikePrice ? parseFloat(strikePrice).toFixed(2) : "725.00",
    rsi14: 50,
    rsiInterpretation: "Neutral",
    macdSignal: "Neutral",
    stochasticK: 50,
    stochasticD: 50,
    bollingerUpper: strikePrice ? (parseFloat(strikePrice) + 15).toFixed(2) : "740.00",
    bollingerLower: strikePrice ? (parseFloat(strikePrice) - 15).toFixed(2) : "710.00",
    bbPosition: "Middle",
    ivPercentile: 50,
    optionPrice: optionPrice ? parseFloat(optionPrice).toFixed(2) : "54.00",
    currentPrice: strikePrice ? parseFloat(strikePrice).toFixed(2) : "725.00",
    dataSource: "fallback"
  };

  try {
    // METHOD 1: Try Polygon.io for real technical data
    console.log(`[Polygon] Attempting to fetch technical data for ${ticker}...`);
    try {
      const polygonKey = process.env.POLYGON_API_KEY;
      console.log(`[Polygon] API Key present: ${polygonKey ? 'YES' : 'NO'}`);
      
      if (polygonKey) {
        // Get latest quote using v3 endpoint (more reliable for current prices)
        console.log(`[Polygon] Fetching latest quote for ${ticker}...`);
        const quoteRes = await fetch(
          `https://api.polygon.io/v3/quotes/${ticker}?apikey=${polygonKey}`
        );
        
        console.log(`[Polygon] Quote response status: ${quoteRes.status}`);
        
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          console.log(`[Polygon] Quote response:`, JSON.stringify(quoteData.results));
          
          if (quoteData.results) {
            // Extract the most accurate current price
            const currentPrice = quoteData.results.last_price || 
                               quoteData.results.last?.price ||
                               quoteData.results.c;
            
            if (currentPrice && currentPrice > 0) {
              data.lastClose = parseFloat(currentPrice).toFixed(2);
              data.currentPrice = parseFloat(currentPrice).toFixed(2);
              console.log(`[Polygon] ✅ Got REAL stock price: $${data.lastClose}`);
            }
          }
        } else {
          console.log(`[Polygon] Quote failed (status ${quoteRes.status}), will try RSI...`);
        }
        
        // Get DAILY RSI (not minute RSI)
        console.log(`[Polygon] Fetching DAILY RSI for ${ticker}...`);
        const rsiRes = await fetch(
          `https://api.polygon.io/v1/indicators/rsi/${ticker}?timespan=day&window=14&series_type=close&apikey=${polygonKey}`
        );
        
        console.log(`[Polygon] RSI response status: ${rsiRes.status}`);
        
        if (rsiRes.ok) {
          const rsiData = await rsiRes.json();
          console.log(`[Polygon] RSI data:`, JSON.stringify(rsiData.results?.values?.[0]));
          
          if (rsiData.results?.values && rsiData.results.values.length > 0) {
            const latestRSI = rsiData.results.values[0].value;
            data.rsi14 = Math.round(latestRSI * 100) / 100;
            data.rsiInterpretation = data.rsi14 > 70 ? 'Overbought' : data.rsi14 < 30 ? 'Oversold' : 'Neutral';
            console.log(`[Polygon] ✅ Got DAILY RSI: ${data.rsi14}`);
          }
        }
        
        // Get MACD
        console.log(`[Polygon] Fetching MACD for ${ticker}...`);
        const macdRes = await fetch(
          `https://api.polygon.io/v1/indicators/macd/${ticker}?timespan=day&short_window=12&long_window=26&signal_window=9&series_type=close&apikey=${polygonKey}`
        );
        
        if (macdRes.ok) {
          const macdData = await macdRes.json();
          if (macdData.results?.values && macdData.results.values.length > 0) {
            const latest = macdData.results.values[0];
            data.macdSignal = latest.macd > latest.signal ? 'Bullish Crossover' : 'Bearish Crossover';
            console.log(`[Polygon] ✅ Got MACD: ${data.macdSignal}`);
          }
        }
        
        // Use user's option price if provided
        if (optionPrice) {
          data.optionPrice = parseFloat(optionPrice).toFixed(2);
          console.log(`[Polygon] ✅ Using user-provided option price: $${data.optionPrice}`);
        }
        
        data.dataSource = "polygon";
        console.log(`[Polygon] Data source: ${data.dataSource}`);
        return res.status(200).json(data);
      }
    } catch (polygonErr) {
      console.log(`[Polygon] Error:`, polygonErr.message);
    }

    // METHOD 2: Try Claude for estimation if Polygon fails
    console.log(`\n[Claude] Attempting to fetch technical data...`);
    try {
      const claudeKey = process.env.ANTHROPIC_API_KEY;
      console.log(`[Claude] API Key present: ${claudeKey ? 'YES' : 'NO'}`);
      
      const client = new Anthropic({
        apiKey: claudeKey,
      });

      const message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Return ONLY valid JSON with realistic technical indicators for ${ticker}. Use realistic market values.

{
  "rsi14": ${30 + Math.floor(Math.random() * 50)},
  "rsiInterpretation": "${Math.random() > 0.5 ? 'Bullish' : 'Bearish'}",
  "macdSignal": "${Math.random() > 0.5 ? 'Bullish Crossover' : 'Bearish Crossover'}",
  "stochasticK": ${25 + Math.floor(Math.random() * 60)},
  "stochasticD": ${25 + Math.floor(Math.random() * 60)},
  "bbPosition": "${['Near Upper Band', 'Middle', 'Near Lower Band'][Math.floor(Math.random() * 3)]}",
  "ivPercentile": ${30 + Math.floor(Math.random() * 50)}
}

Return ONLY the JSON object.`,
          },
        ],
      });

      const responseText = message.content[0].text.trim();
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const claudeData = JSON.parse(cleaned);
      
      data.rsi14 = claudeData.rsi14 || data.rsi14;
      data.rsiInterpretation = claudeData.rsiInterpretation || data.rsiInterpretation;
      data.macdSignal = claudeData.macdSignal || data.macdSignal;
      data.stochasticK = claudeData.stochasticK || data.stochasticK;
      data.stochasticD = claudeData.stochasticD || data.stochasticD;
      data.bbPosition = claudeData.bbPosition || data.bbPosition;
      data.ivPercentile = claudeData.ivPercentile || data.ivPercentile;
      
      if (optionPrice) {
        data.optionPrice = parseFloat(optionPrice).toFixed(2);
      }
      
      data.dataSource = "claude";
      console.log(`[Claude] ✅ Data source: ${data.dataSource}`);
      return res.status(200).json(data);
    } catch (claudeErr) {
      console.log(`[Claude] Error:`, claudeErr.message);
    }

    // METHOD 3: Return fallback
    console.log(`[Fallback] Using fallback data`);
    if (optionPrice) {
      data.optionPrice = parseFloat(optionPrice).toFixed(2);
    }
    data.dataSource = "fallback";
    return res.status(200).json(data);

  } catch (error) {
    console.error("[ERROR] Unhandled error:", error);
    data.dataSource = "error-fallback";
    return res.status(200).json(data);
  }
}
