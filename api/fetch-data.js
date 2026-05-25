import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticker, strikePrice, expiryDate } = req.body;
  console.log(`\n=== FETCH-DATA REQUEST ===`);
  console.log(`Ticker: ${ticker}`);
  console.log(`Strike: ${strikePrice}`);
  console.log(`Expiry: ${expiryDate}`);

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  let data = {
    ticker: ticker,
    lastClose: strikePrice ? parseFloat(strikePrice) : 725,
    rsi14: 50,
    rsiInterpretation: "Neutral",
    macdSignal: "Neutral",
    stochasticK: 50,
    stochasticD: 50,
    bollingerUpper: strikePrice ? parseFloat(strikePrice) + 15 : 740,
    bollingerLower: strikePrice ? parseFloat(strikePrice) - 15 : 710,
    bbPosition: "Middle",
    ivPercentile: 50,
    optionPrice: strikePrice ? (parseFloat(strikePrice) * 0.075).toFixed(2) : 54,
    currentPrice: strikePrice ? parseFloat(strikePrice) : 725,
    dataSource: "fallback"
  };

  try {
    // METHOD 1: Try Polygon.io for real technical indicators
    console.log(`[Polygon] Attempting to fetch technical data for ${ticker}...`);
    try {
      const polygonKey = process.env.POLYGON_API_KEY;
      console.log(`[Polygon] API Key present: ${polygonKey ? 'YES' : 'NO'}`);
      
      if (polygonKey) {
        // Get stock quote
        console.log(`[Polygon] Fetching quote for ${ticker}...`);
        const quoteRes = await fetch(
          `https://api.polygon.io/v3/quotes/${ticker}?apikey=${polygonKey}`
        );
        
        console.log(`[Polygon] Quote response status: ${quoteRes.status}`);
        
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          console.log(`[Polygon] Quote data:`, JSON.stringify(quoteData.results));
          
          if (quoteData.results?.c) {
            data.lastClose = quoteData.results.c;
            data.currentPrice = quoteData.results.c;
            console.log(`[Polygon] ✅ Got stock price: $${quoteData.results.c}`);
          }
        }
        
        // Get RSI technical indicator
        console.log(`[Polygon] Fetching RSI for ${ticker}...`);
        const rsiRes = await fetch(
          `https://api.polygon.io/v1/indicators/rsi/${ticker}?timespan=minute&window=14&series_type=close&apikey=${polygonKey}`
        );
        
        console.log(`[Polygon] RSI response status: ${rsiRes.status}`);
        
        if (rsiRes.ok) {
          const rsiData = await rsiRes.json();
          console.log(`[Polygon] RSI data:`, JSON.stringify(rsiData.results));
          
          if (rsiData.results?.values && rsiData.results.values.length > 0) {
            const latestRSI = rsiData.results.values[0].value;
            data.rsi14 = Math.round(latestRSI * 100) / 100;
            data.rsiInterpretation = data.rsi14 > 70 ? 'Overbought' : data.rsi14 < 30 ? 'Oversold' : 'Neutral';
            console.log(`[Polygon] ✅ Got RSI: ${data.rsi14}`);
          }
        }
        
        // Get MACD
        console.log(`[Polygon] Fetching MACD for ${ticker}...`);
        const macdRes = await fetch(
          `https://api.polygon.io/v1/indicators/macd/${ticker}?timespan=minute&short_window=12&long_window=26&signal_window=9&series_type=close&apikey=${polygonKey}`
        );
        
        if (macdRes.ok) {
          const macdData = await macdRes.json();
          if (macdData.results?.values && macdData.results.values.length > 0) {
            const latest = macdData.results.values[0];
            data.macdSignal = latest.macd > latest.signal ? 'Bullish Crossover' : 'Bearish Crossover';
            console.log(`[Polygon] ✅ Got MACD: ${data.macdSignal}`);
          }
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
      console.log(`[Claude] Response text:`, responseText.substring(0, 100) + '...');
      
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const claudeData = JSON.parse(cleaned);
      
      console.log(`[Claude] Parsed data:`, JSON.stringify(claudeData));
      
      data.rsi14 = claudeData.rsi14 || data.rsi14;
      data.rsiInterpretation = claudeData.rsiInterpretation || data.rsiInterpretation;
      data.macdSignal = claudeData.macdSignal || data.macdSignal;
      data.stochasticK = claudeData.stochasticK || data.stochasticK;
      data.stochasticD = claudeData.stochasticD || data.stochasticD;
      data.bbPosition = claudeData.bbPosition || data.bbPosition;
      data.ivPercentile = claudeData.ivPercentile || data.ivPercentile;
      
      data.dataSource = "claude";
      console.log(`[Claude] ✅ Data source: ${data.dataSource}`);
      return res.status(200).json(data);
    } catch (claudeErr) {
      console.log(`[Claude] Error:`, claudeErr.message);
    }

    // METHOD 3: Return fallback
    console.log(`[Fallback] Using fallback data`);
    data.dataSource = "fallback";
    return res.status(200).json(data);

  } catch (error) {
    console.error("[ERROR] Unhandled error:", error);
    data.dataSource = "error-fallback";
    return res.status(200).json(data);
  }
}
