import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticker, strikePrice, expiryDate } = req.body;

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a financial data provider. Return ONLY a valid JSON object (no markdown, no explanation) with current technical indicators and option pricing for ${ticker}${strikePrice ? ` with a ${strikePrice} strike` : ""}${expiryDate ? ` expiring on ${expiryDate}` : ""}.

Use REALISTIC values based on current market conditions. For RSI, return actual technical momentum (not always 50). For option prices, estimate based on strike distance and time to expiry.

{
  "ticker": "${ticker}",
  "lastClose": <current_or_last_closing_price>,
  "rsi14": <0-100, use realistic value based on momentum>,
  "rsiInterpretation": "<Overbought|Oversold|Neutral>",
  "macdSignal": "<Bullish Crossover|Bearish Crossover>",
  "stochasticK": <0-100>,
  "stochasticD": <0-100>,
  "bollingerUpper": <number>,
  "bollingerLower": <number>,
  "bbPosition": "<Near Upper Band|Near Lower Band|Middle>",
  "ivPercentile": <0-100>,
  ${strikePrice && expiryDate ? `"optionPrice": <realistic option premium for ${strikePrice} strike expiring ${expiryDate}>,` : ""}
  "currentPrice": <current_price>
}

Return ONLY valid JSON. Make RSI values vary naturally (not always 50). If option price requested, estimate based on strike distance and time value.`,
        },
      ],
    });

    const responseText = message.content[0].text;
    const data = JSON.parse(responseText);

    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch data", details: error.message });
  }
}
