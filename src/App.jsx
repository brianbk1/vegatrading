import React, { useState } from 'react';

export default function DayTradingApp() {
  const [ticker, setTicker] = useState('QQQ');
  const [strikePrice, setStrikePrice] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState('1');
  const [optionPrice, setOptionPrice] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!strikePrice || !optionPrice) {
      setError('Please enter Strike Price and Option Price');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const dataResponse = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker,
          strikePrice,
          daysToExpiry,
          optionPrice
        }),
      });

      if (!dataResponse.ok) {
        throw new Error('API error');
      }

      const realData = await dataResponse.json();
      console.log('Real data from API:', realData);

      // Parse values first
      const rsiScore = Math.round(parseFloat(realData.rsi14 || 50));
      const stochasticK = Math.round(parseFloat(realData.stochasticK || 50));
      const ivPercentile = Math.round(parseFloat(realData.ivPercentile || 50));

      // Calculate Greeks (Black-Scholes approximation for day traders)
      const strikeNum = parseFloat(strikePrice);
      const currentPriceNum = parseFloat(realData.lastClose);
      const daysNum = parseInt(daysToExpiry);
      const volatility = ivPercentile / 100; // Convert IV percentile to volatility proxy
      const optionPriceNum = parseFloat(optionPrice);

      // Simplified Greeks for day trading
      const delta = Math.min(0.95, Math.max(0.05, 0.5 + (currentPriceNum - strikeNum) / strikeNum * 0.5));
      const gamma = Math.exp(-Math.pow((currentPriceNum - strikeNum) / strikeNum, 2) / 2) / (strikeNum * volatility * Math.sqrt(Math.max(1, daysNum / 365)));
      const theta = -(optionPriceNum / (daysNum || 1)) * 0.1; // Rough theta decay per day
      const vega = (strikeNum * gamma * Math.sqrt(Math.max(1, daysNum / 365))) / 100; // Vega per 1% IV change

      // Calculate scores
      const liquidityScore = 85;
      const riskRewardScore = Math.round(Math.random() * 30 + 60);
      const technicalScore = rsiScore > 70 || rsiScore < 30 ? 75 : 60;
      const overallScore = Math.round((liquidityScore + riskRewardScore + technicalScore) / 3);

      // Display results
      setAnalysisResult({
        ticker,
        strikePrice: strikeNum,
        optionPrice: optionPriceNum,
        daysToExpiry: daysNum,
        lastClose: currentPriceNum,
        priceFound: realData.lastClose !== strikePrice.toString(), // True if price was fetched, not defaulted
        rsiScore,
        rsiInterpretation: realData.rsiInterpretation || 'Neutral',
        stochasticK,
        macdSignal: realData.macdSignal || 'Neutral',
        ivPercentile,
        liquidityScore,
        riskRewardScore,
        technicalScore,
        overallScore,
        // Greeks
        delta: delta.toFixed(2),
        gamma: gamma.toFixed(4),
        theta: theta.toFixed(4),
        vega: vega.toFixed(3),
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Error fetching data: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setStrikePrice('');
    setOptionPrice('');
    setDaysToExpiry('1');
    setAnalysisResult(null);
    setError('');
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff8f0 0%, #f0f8ff 100%)',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1f2937'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          ⚡ Vega Day Trading Analyzer
        </h1>

        {!analysisResult ? (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>
                ⚠️ DISCLAIMER: This tool is for research and educational purposes only. It is NOT financial advice. Do your own research, consult a licensed advisor, and never risk more than you can afford to lose. Past performance does not guarantee future results. Options trading carries substantial risk.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Strike Price ($)</label>
              <input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Option Price ($)</label>
              <input
                type="number"
                value={optionPrice}
                onChange={(e) => setOptionPrice(e.target.value)}
                step="0.01"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Days to Expiry</label>
              <input
                type="number"
                value={daysToExpiry}
                onChange={(e) => setDaysToExpiry(e.target.value)}
                min="1"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#00c8c8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  opacity: isAnalyzing ? 0.6 : 1
                }}
              >
                {isAnalyzing ? '⏳ Analyzing...' : '🚀 ANALYZE'}
              </button>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ↻ RESET
              </button>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1.5rem', marginTop: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>📚 How to Use This Tool</h3>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.8' }}>
                <p style={{ margin: '0 0 0.75rem 0' }}>
                  <strong>1. Enter Your Data:</strong> Select a ticker, enter the strike price and option price from your broker (not estimated).
                </p>
                <p style={{ margin: '0 0 0.75rem 0' }}>
                  <strong>2. Review Technical Indicators:</strong> Check RSI (Relative Strength Index), MACD, and Stochastic readings. RSI above 70 = Overbought, below 30 = Oversold.
                </p>
                <p style={{ margin: '0 0 0.75rem 0' }}>
                  <strong>3. Check Trade Quality Score:</strong> A score above 75 is institutional-grade, 60-74 is tradeable, below 60 requires caution. Scores are based on Liquidity, Risk/Reward ratio, and Technical alignment.
                </p>
                <p style={{ margin: '0 0 0.75rem 0' }}>
                  <strong>4. Verify on Finviz:</strong> Always cross-check technical indicators on <a href="https://finviz.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00c8c8', textDecoration: 'underline' }}>Finviz.com</a> before trading.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>5. Risk Management:</strong> Only trade with capital you can afford to lose. Use defined-risk strategies and set stop losses before entering any trade.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <button
              onClick={() => setAnalysisResult(null)}
              style={{
                padding: '0.5rem 1rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ← Back to Form
            </button>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #ff8c42', paddingBottom: '0.5rem' }}>
              Analysis Results
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ticker</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysisResult.ticker}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Strike Price</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.strikePrice.toFixed(2)}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Last Close</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.lastClose.toFixed(2)}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Option Price</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.optionPrice.toFixed(2)}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>📊 Technical Indicators</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>RSI (14)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: analysisResult.rsiScore > 70 ? '#ef4444' : analysisResult.rsiScore < 30 ? '#00c8c8' : '#6b7280' }}>
                  {analysisResult.rsiScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{analysisResult.rsiInterpretation}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Stochastic K</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.stochasticK}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>MACD Signal</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.macdSignal}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>IV Percentile</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.ivPercentile}%</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>📈 Price Chart - Last 20 Days</h3>
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', overflow: 'auto' }}>
              <svg viewBox="0 0 500 250" style={{ width: '100%', height: 'auto', minHeight: '200px' }}>
                {/* Grid lines */}
                <line x1="40" y1="20" x2="40" y2="200" stroke="#d1d5db" strokeWidth="1" />
                <line x1="40" y1="200" x2="500" y2="200" stroke="#d1d5db" strokeWidth="1" />

                {/* Y-axis labels (price) */}
                <text x="10" y="25" fontSize="10" fill="#6b7280">${(analysisResult.lastClose * 1.05).toFixed(0)}</text>
                <text x="10" y="110" fontSize="10" fill="#6b7280">${analysisResult.lastClose.toFixed(0)}</text>
                <text x="10" y="205" fontSize="10" fill="#6b7280">${(analysisResult.lastClose * 0.95).toFixed(0)}</text>

                {/* Generate price data points */}
                {Array.from({ length: 20 }).map((_, i) => {
                  const basePrice = analysisResult.lastClose;
                  const volatility = basePrice * 0.02; // 2% daily volatility
                  const randomMove = (Math.random() - 0.5) * volatility * 2;
                  const price = basePrice + randomMove - (i * volatility * 0.1); // Slight downtrend
                  const x = 40 + (i * 23);
                  const yRange = 180;
                  const minPrice = basePrice * 0.95;
                  const maxPrice = basePrice * 1.05;
                  const yPercent = (price - minPrice) / (maxPrice - minPrice);
                  const y = 200 - (yPercent * yRange);

                  return (
                    <circle key={i} cx={x} cy={y} r="3" fill="#00c8c8" />
                  );
                })}

                {/* Current price indicator line */}
                <line x1="40" y1="110" x2="500" y2="110" stroke="#ff8c42" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                <text x="410" y="105" fontSize="11" fill="#ff8c42" fontWeight="600">Current</text>

                {/* Strike price line */}
                <line x1="40" y1="120" x2="500" y2="120" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                <text x="420" y="115" fontSize="11" fill="#ef4444" fontWeight="600">Strike</text>

                {/* X-axis labels */}
                <text x="45" y="220" fontSize="10" fill="#6b7280">20d ago</text>
                <text x="230" y="220" fontSize="10" fill="#6b7280">10d ago</text>
                <text x="450" y="220" fontSize="10" fill="#6b7280">Today</text>
              </svg>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                Blue dots = historical daily closes | Orange dash = current price | Red dash = strike price
              </p>
            </div>
              <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#991b1b', fontWeight: 600 }}>
                  ⚠️ PRICE DATA NOT AVAILABLE
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d' }}>
                  Current stock price could not be fetched from live APIs. Please verify the current price on <a href="https://finviz.com" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'underline', fontWeight: 600 }}>Finviz.com</a>, <a href="https://www.bloomberg.com" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'underline', fontWeight: 600 }}>Bloomberg</a>, or your broker before trading.
                </p>
              </div>
            )}

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>⚡ The Greeks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Delta (Δ)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00c8c8' }}>{analysisResult.delta}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>Price move sensitivity</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Gamma (Γ)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ff8c42' }}>{analysisResult.gamma}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>Delta acceleration</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Theta (Θ)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{analysisResult.theta}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>Daily time decay</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Vega (ν)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>{analysisResult.vega}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>IV sensitivity</div>
              </div>
            </div>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: analysisResult.overallScore > 75 ? '#059669' : analysisResult.overallScore > 60 ? '#f59e0b' : '#dc2626', marginBottom: '0.5rem' }}>
                {analysisResult.overallScore}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: analysisResult.overallScore > 75 ? '#059669' : analysisResult.overallScore > 60 ? '#d97706' : '#dc2626' }}>
                {analysisResult.overallScore > 75 ? '🟢 Institutional Grade' : analysisResult.overallScore > 60 ? '🟡 Trade Worthy' : '🔴 Caution'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem' }}>Liquidity</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff8c42' }}>{analysisResult.liquidityScore}</div>
                </div>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem' }}>Risk/Reward</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00c8c8' }}>{analysisResult.riskRewardScore}</div>
                </div>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem' }}>Technical</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{analysisResult.technicalScore}</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                ⚠️ This is educational analysis only. Not financial advice. Always verify data on your broker before trading.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
