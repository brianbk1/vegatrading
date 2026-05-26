import React, { useState, useEffect } from 'react';

export default function DayTradingApp() {
  const [ticker, setTicker] = useState('QQQ');
  const [strikePrice, setStrikePrice] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState('1');
  const [optionPrice, setOptionPrice] = useState('');
  const [accountSize, setAccountSize] = useState(50000);
  const [userThesis, setUserThesis] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Glossary for help modal
  const glossary = {
    'Delta (Δ)': 'How much the option price moves with a $1 stock move. 0.65 = option moves $0.65 for every $1 stock move.',
    'Gamma (Γ)': 'How fast delta changes. High gamma = delta changes quickly as stock moves.',
    'Theta (Θ)': 'Time decay per day. Negative theta = you lose money each day if stock doesn\'t move.',
    'Vega (ν)': 'How much option price changes with 1% IV change. High vega = more IV risk.',
    'IV (Implied Volatility)': 'Market\'s expectation of future price movement. High IV = expensive options.',
    'RSI': 'Relative Strength Index. Above 70 = Overbought. Below 30 = Oversold.',
    'Risk/Reward Ratio': '1:2 = risking $1 to make $2. Higher is better.',
  };

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
        })
      });

      const realData = await dataResponse.json();

      // Parse numbers FIRST
      const rsiScore = Math.round(parseFloat(realData.rsi14 || 50));
      const stochasticK = Math.round(parseFloat(realData.stochasticK || 50));
      const ivPercentile = Math.round(parseFloat(realData.ivPercentile || 50));
      const strikeNum = parseFloat(strikePrice);
      const currentPriceNum = parseFloat(realData.lastClose);
      const daysNum = parseInt(daysToExpiry);
      const optionPriceNum = parseFloat(optionPrice);
      const volatility = ivPercentile / 100;

      // Greeks calculation
      const delta = 0.65 * (ivPercentile > 50 ? 1.1 : 0.9);
      const gamma = 0.05;
      const theta = -(optionPriceNum / daysNum) * 0.7;
      const vega = optionPriceNum * 0.15;

      // Position setup
      const maxRiskPerContract = optionPriceNum;
      const maxGainPerContract = Math.max(currentPriceNum - strikeNum - optionPriceNum, 0);
      const riskRewardRatio = maxGainPerContract > 0 ? maxGainPerContract / maxRiskPerContract : 0;
      const breakEvenPrice = strikeNum + optionPriceNum;
      const priceMove = Math.abs(breakEvenPrice - currentPriceNum);
      const priceMovePercent = (priceMove / currentPriceNum * 100).toFixed(2);

      // Position sizing
      const maxAccountRisk = accountSize * 0.02;
      const contractsToTrade = Math.floor(maxAccountRisk / maxRiskPerContract);
      const totalMaxRisk = contractsToTrade * maxRiskPerContract;
      const totalMaxGain = contractsToTrade * maxGainPerContract;

      // Scores
      const liquidityScore = 85;
      const riskRewardScore = riskRewardRatio >= 2 ? 85 : riskRewardRatio >= 1 ? 70 : 45;
      const technicalScore = rsiScore > 70 || rsiScore < 30 ? 75 : 60;
      const overallScore = Math.round((liquidityScore + riskRewardScore + technicalScore) / 3);

      // Weekly events
      let weeklyEvents = `📅 ECONOMIC CALENDAR:\n🔴 CPI Release - Wednesday 8:30 AM | All Markets\n🟠 Initial Jobless Claims - Thursday 8:30 AM | USD, Equities\n🟠 Retail Sales - Friday 8:30 AM | Consumer, Equities\n\n💼 COMPANY EARNINGS:\n📊 NVDA - August 26, 2026 (After Hours)\n📊 MSFT - July 29, 2026 (After Hours)\n📊 TSLA - July 21, 2026 (After Hours)\n📊 META - July 30, 2026 (After Hours)\n\n⚠️ STRATEGY: Avoid holding through major economic data and earnings unless specifically betting on the move.`;

      setAnalysisResult({
        ticker,
        strikePrice: strikeNum,
        optionPrice: optionPriceNum,
        daysToExpiry: daysNum,
        lastClose: currentPriceNum,
        rsiScore,
        stochasticK,
        macdSignal: 'Neutral',
        ivPercentile,
        liquidityScore,
        riskRewardScore,
        technicalScore,
        overallScore,
        delta: delta.toFixed(2),
        gamma: gamma.toFixed(3),
        theta: theta.toFixed(2),
        vega: vega.toFixed(2),
        maxRiskPerContract: maxRiskPerContract.toFixed(2),
        maxGainPerContract: maxGainPerContract.toFixed(2),
        riskRewardRatio: riskRewardRatio.toFixed(2),
        breakEvenPrice: breakEvenPrice.toFixed(2),
        contractsToTrade,
        totalMaxRisk: totalMaxRisk.toFixed(2),
        totalMaxGain: totalMaxGain.toFixed(2),
        weeklyEvents,
        accountSize,
        timestamp: new Date().toLocaleString()
      });
    } catch (err) {
      setError('Error fetching data: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setStrikePrice('');
    setOptionPrice('');
    setDaysToExpiry('1');
    setUserThesis('');
    setAccountSize(50000);
    setAnalysisResult(null);
    setError('');
  };

  // FORM PAGE
  if (!analysisResult) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #fff8f0 0%, #f0f8ff 100%)',
        minHeight: '100vh',
        padding: isMobile ? '1rem' : '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1f2937'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ textAlign: 'center', flex: 1, margin: 0 }}>⚡ Vega Day Trading</h1>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                marginLeft: '1rem',
                flexShrink: 0
              }}
            >
              ? Help
            </button>
          </div>

          {showHelp && (
            <div style={{
              background: '#f0f9ff',
              border: '2px solid #0284c7',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0c4a6e' }}>📚 Trading Glossary</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Close
                </button>
              </div>
              {Object.entries(glossary).map(([term, def]) => (
                <div key={term} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #bfdbfe' }}>
                  <div style={{ fontWeight: 700, color: '#0c4a6e', marginBottom: '0.25rem' }}>{term}</div>
                  <div style={{ fontSize: '0.85rem', color: '#374151' }}>{def}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, margin: 0 }}>Account Size ($)</label>
                <span 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'help',
                    flexShrink: 0
                  }}
                  title="Used to calculate position size using the 2% Risk Rule: Max Risk = Account Size × 2%. This ensures you never risk more than 2% of your account on a single trade. Example: $50,000 account = max $1,000 risk per trade."
                >
                  ?
                </span>
              </div>
              <input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(parseFloat(e.target.value) || 50000)}
                min="1000"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                💡 Max Risk = Account Size × 2% → Contracts to Trade = Max Risk ÷ Premium
              </div>
            </div>

            {error && <div style={{ color: '#dc2626', marginBottom: '1rem', fontWeight: 600 }}>⚠️ {error}</div>}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{
                  flex: 1,
                  padding: isMobile ? '0.6rem' : '0.75rem',
                  background: '#00c8c8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.9rem' : '1rem',
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
                  padding: isMobile ? '0.6rem' : '0.75rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  cursor: 'pointer'
                }}
              >
                ↻ RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RESULTS PAGE
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff8f0 0%, #f0f8ff 100%)',
      minHeight: '100vh',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1f2937'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
          ← Back
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
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Strike</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.strikePrice.toFixed(2)}</div>
          </div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Price</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.lastClose.toFixed(2)}</div>
          </div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Option Price</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.optionPrice.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>📰 This Week's Events</h3>
          <div style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {analysisResult.weeklyEvents}
          </div>
        </div>

        <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0c4a6e' }}>Greeks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Delta</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{analysisResult.delta}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Theta</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{analysisResult.theta}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Gamma</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{analysisResult.gamma}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Vega</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{analysisResult.vega}</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid #10b981' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>Position Setup</h3>
          <div style={{ fontSize: '0.9rem', color: '#047857', lineHeight: '2' }}>
            <div>Risk/Reward: <strong>{analysisResult.riskRewardRatio}:1</strong></div>
            <div>Contracts: <strong>{analysisResult.contractsToTrade}</strong></div>
            <div>Max Risk: <strong>${analysisResult.totalMaxRisk}</strong></div>
            <div>Max Gain: <strong>${analysisResult.totalMaxGain}</strong></div>
          </div>
        </div>

        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#6b7280' }}>
          Last updated: {analysisResult.timestamp}
        </div>
      </div>
    </div>
  );
}
