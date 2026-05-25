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
    // METHOD 1: Try Finnhub for real option data
    console.log(`\n[Finnhub] Attempting to fetch option data...`);
    try {
      const finnhubKey = process.env.FINNHUB_API_KEY;
      console.log(`[Finnhub] API Key present: ${finnhubKey ? 'YES' : 'NO'}`);
      
      if (finnhubKey && strikePrice && expiryDate) {
        // Parse expiry date to get unix timestamp
        const expiryTime = new Date(expiryDate).getTime() / 1000;
        console.log(`[Finnhub] Expiry timestamp: ${expiryTime}`);
        
        console.log(`[Finnhub] Fetching quote for ${ticker}...`);
        const finnhubRes = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`
        );
        
        console.log(`[Finnhub] Quote response status: ${finnhubRes.status}`);
        
        if (finnhubRes.ok) {
          const quoteData = await finnhubRes.json();
          console.log(`[Finnhub] Quote data:`, JSON.stringify(quoteData));
          
          if (quoteData.c) {
            data.lastClose = quoteData.c;
            data.currentPrice = quoteData.c;
            console.log(`[Finnhub] ✅ Got stock price: $${quoteData.c}`);
            
            // Now try to get option chain
            console.log(`[Finnhub] Fetching option chain...`);
            const optionRes = await fetch(
              `https://finnhub.io/api/v1/stock/option-chain?symbol=${ticker}&token=${finnhubKey}`
            );
            
            console.log(`[Finnhub] Option chain response status: ${optionRes.status}`);
            
            if (optionRes.ok) {
              const optionData = await optionRes.json();
              console.log(`[Finnhub] Option chain data length:`, optionData.data?.length || 0);
              
              // Find the matching strike and expiry
              if (optionData.data && Array.isArray(optionData.data)) {
                console.log(`[Finnhub] Searching for strike ${strikePrice} expiring near ${expiryDate}...`);
                
                for (const contract of optionData.data) {
                  if (
                    contract.strike === parseFloat(strikePrice) &&
                    Math.abs(contract.expirationDate - expiryTime) < 86400 // Within 1 day
                  ) {
                    console.log(`[Finnhub] Found matching contract:`, JSON.stringify(contract));
                    
                    if (contract.call && contract.call.lastPrice) {
                      data.optionPrice = contract.call.lastPrice.toFixed(2);
                      data.dataSource = "finnhub";
                      console.log(`[Finnhub] ✅ Got option price: $${data.optionPrice}`);
                      console.log(`[Finnhub] Data source: ${data.dataSource}`);
                      return res.status(200).json(data);
                    }
                  }
                }
                console.log(`[Finnhub] ❌ No matching contract found`);
              } else {
                console.log(`[Finnhub] ❌ No option data array`);
              }
            } else {
              console.log(`[Finnhub] ❌ Option chain request failed`);
            }
          } else {
            console.log(`[Finnhub] ❌ No closing price in response`);
          }
        } else {
          console.log(`[Finnhub] ❌ Quote request failed`);
        }
      } else {
        console.log(`[Finnhub] ❌ Missing: Key=${!!finnhubKey}, Strike=${!!strikePrice}, Expiry=${!!expiryDate}`);
      }
    } catch (finnhubErr) {
      console.log(`[Finnhub] ❌ Error:`, finnhubErr.message);
    }

    // METHOD 2: Try Yahoo Finance for real closing price
    console.log(`\n[Yahoo] Attempting to fetch stock price...`);
    try {
      const yahooRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );
      
      console.log(`[Yahoo] Response status: ${yahooRes.status}`);
      
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json();
        if (yahooData.chart?.result?.[0]?.regularMarketPrice) {
          const price = yahooData.chart.result[0].regularMarketPrice;
          data.lastClose = price;
          data.currentPrice = price;
          data.dataSource = "yahoo";
          console.log(`[Yahoo] ✅ Got price: $${price}`);
        } else {
          console.log(`[Yahoo] ❌ No price in response`);
        }
      }
    } catch (yahooErr) {
      console.log(`[Yahoo] ❌ Error:`, yahooErr.message);
    }

    // METHOD 3: Use Claude API for technical indicators
    console.log(`\n[Claude] Attempting to fetch technical data...`);
    try {
      const claudeKey = process.env.ANTHROPIC_API_KEY;
      console.log(`[Claude] API Key present: ${claudeKey ? 'YES' : 'NO'}`);
      
      const client = new Anthropic({
        apiKey: claudeKey,
      });

      const expiryInfo = expiryDate ? `expiring on ${expiryDate}` : "";
      const strikeInfo = strikePrice ? `with a ${strikePrice} strike call option` : "";

      console.log(`[Claude] Sending request for ${ticker} ${strikeInfo} ${expiryInfo}...`);

      const message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Return ONLY valid JSON with realistic technical indicators for ${ticker} ${strikeInfo} ${expiryInfo}. 

Generate varied, realistic values (not always 50 for RSI):

{
  "rsi14": ${35 + Math.floor(Math.random() * 40)},
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
      
      if (!data.dataSource.includes("finnhub")) {
        if (data.dataSource === "yahoo") {
          data.dataSource = "yahoo + claude";
        } else {
          data.dataSource = "claude";
        }
      }
      
      console.log(`[Claude] ✅ Got RSI: ${data.rsi14}`);
      console.log(`[Claude] Data source: ${data.dataSource}`);
      return res.status(200).json(data);
    } catch (claudeErr) {
      console.log(`[Claude] ❌ Error:`, claudeErr.message);
    }

    // METHOD 4: Return with available data
    console.log(`\n[Fallback] Using fallback data, source: ${data.dataSource}`);
    console.log(`[Fallback] Final data:`, JSON.stringify(data));
    return res.status(200).json(data);

  } catch (error) {
    console.error("[ERROR] Unhandled error:", error);
    data.dataSource = "error-fallback";
    return res.status(200).json(data);
  }
}
