import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticker } = req.body;

  if (!ticker) {
    return res.status(400).json({ error: "Ticker is required" });
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Return ONLY a valid JSON object (no markdown, no explanation) with current technical indicators for ${ticker}. Use realistic values based on typical market conditions:

{
  "rsi14": <number 0-100>,
  "rsiInterpretation": "<Overbought|Oversold|Neutral>",
  "macdSignal": "<Bullish Crossover|Bearish Crossover>",
  "stochasticK": <number 0-100>,
  "stochasticD": <number 0-100>,
  "bollingerUpper": <number>,
  "bollingerLower": <number>,
  "bbPosition": "<Near Upper Band|Near Lower Band|Middle>",
  "ivPercentile": <number 0-100>
}

Return ONLY valid JSON.`,
        },
      ],
    });

    const responseText = message.content[0].text;
    const data = JSON.parse(responseText);

    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch data", details: error.message });
  }
}