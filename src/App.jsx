import React, { useState } from 'react';

export default function DayTradingApp() {
  const [ticker, setTicker] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [lastClosePrice, setLastClosePrice] = useState(null);
  const [tickerFetchInProgress, setTickerFetchInProgress] = useState(false);
  const [strikePrice, setStrikePrice] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [accountSize, setAccountSize] = useState(50000);
  const [userThesis, setUserThesis] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState('1');
  const [optionType, setOptionType] = useState('call');

  const handleTickerInput = (newTicker) => {
    setTicker(newTicker.toUpperCase());
  };

  const handleCheckPrice = async () => {
    const upperTicker = ticker.toUpperCase();
    if (!upperTicker) {
      setError('Please enter a ticker');
      return;
    }
    setTickerFetchInProgress(true);
    setError('');
    try {
      const res = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: upperTicker, getPrice: true }),
      });
      const data = await res.json();
      if (data.ticker === upperTicker && data.currentPrice > 1) {
        setCurrentPrice(data.currentPrice);
        setLastClosePrice(data.lastClose);
      } else {
        setError('Invalid price received');
      }
    } catch (err) {
      setError(`Price fetch failed: ${err.message}`);
    } finally {
      setTickerFetchInProgress(false);
    }
  };

  const handleAnalyze = async () => {
    if (!strikePrice || !optionPrice || !currentPrice) {
      setError('Please fill all required fields');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    try {
      const dataResponse = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, strikePrice, daysToExpiry, optionPrice, optionType, currentPrice }),
      });
      const realData = await dataResponse.json();

      const rsiScore = Math.round(parseFloat(realData.rsi14 || 50));
      const stochasticK = Math.round(parseFloat(realData.stochasticK || 50));
      const ivPercentile = Math.round(parseFloat(realData.ivPercentile || 50));
      const strikeNum = parseFloat(strikePrice);
      const optionPriceNum = parseFloat(optionPrice);
      const currentPriceNum = currentPrice;
      const daysNum = parseInt(daysToExpiry);

      // Simple Greeks calculation
      const moneyness = currentPriceNum / strikeNum;
      const T = Math.max(daysNum / 365, 0.01);
      const sigma = Math.sqrt(ivPercentile / 100) || 0.25;

      let delta, gamma, theta, vega;
      if (optionType === 'call') {
        delta = Math.max(0, Math.min(1, 0.4 + 0.4 * Math.log(moneyness) / (sigma * Math.sqrt(T))));
      } else {
        delta = Math.min(0, Math.max(-1, -0.6 + 0.4 * Math.log(moneyness) / (sigma * Math.sqrt(T))));
      }

      gamma = (Math.exp(-Math.pow(Math.log(moneyness), 2) / (2 * sigma * sigma * T))) / (currentPriceNum * sigma * Math.sqrt(2 * Math.PI * T));
      theta = (-currentPriceNum * gamma * sigma) / (2 * Math.sqrt(T)) / 365;
      vega = currentPriceNum * Math.sqrt(T) * gamma / 100;

      const maxRiskPerContract = optionPriceNum;
      const estimatedGainOn5DollarMove = Math.abs(delta * 5);
      const maxGainPerContract = Math.min(estimatedGainOn5DollarMove, optionPriceNum * 2);
      const riskRewardRatio = maxRiskPerContract > 0 ? (maxGainPerContract / maxRiskPerContract).toFixed(2) : 0;

      const breakEvenPrice = optionType === 'call' 
        ? strikeNum + optionPriceNum 
        : strikeNum - optionPriceNum;
      const priceMove = Math.abs(breakEvenPrice - currentPriceNum);
      const priceMovePercent = ((priceMove / currentPriceNum) * 100).toFixed(2);

      const maxAccountRisk = accountSize * 0.02;
      const contractsToTrade = Math.floor(maxAccountRisk / maxRiskPerContract);
      const totalMaxRisk = contractsToTrade * maxRiskPerContract;
      const totalMaxGain = contractsToTrade * maxGainPerContract;

      const technicalSummary = rsiScore > 70 
        ? `RSI is ${rsiScore} (overbought) - pullback likely. Supports bearish trades.`
        : rsiScore < 30 
        ? `RSI is ${rsiScore} (oversold) - bounce likely. Supports bullish trades.`
        : `RSI is ${rsiScore} (neutral) - no clear bias.`;

      const riskRewardSummary = riskRewardRatio >= 2
        ? `R/R of 1:${riskRewardRatio} is excellent.`
        : riskRewardRatio >= 1
        ? `R/R of 1:${riskRewardRatio} is fair.`
        : `R/R of 1:${riskRewardRatio} is poor.`;

      const dteSummary = daysNum <= 7
        ? `${daysNum} days - short-term. Fast decay.`
        : `${daysNum} days - longer timeframe. More time for thesis.`;

      const ivCrushImpact = [
        { ivChange: -20, label: 'Moderate (-20%)', newPrice: (optionPriceNum + vega * -20).toFixed(2) },
        { ivChange: -40, label: 'Significant (-40%)', newPrice: (optionPriceNum + vega * -40).toFixed(2) },
        { ivChange: -60, label: 'Severe (-60%)', newPrice: (optionPriceNum + vega * -60).toFixed(2) }
      ];

      let thesisAnalysis = userThesis || 'No thesis provided';

      let thesisStatement = `${riskRewardRatio >= 2 ? '✅ STRONG' : riskRewardRatio >= 1 ? '⚠️ FAIR' : '❌ WEAK'} SETUP`;

      let plainEnglishVerdict = `This is a ${optionType.toUpperCase()} option (${optionType === 'call' ? 'profit if UP' : 'profit if DOWN'}). `;
      plainEnglishVerdict += `With a $5 stock move, you could make ~$${maxGainPerContract.toFixed(2)}. `;
      plainEnglishVerdict += `You have ${daysNum} day(s), so time is ${daysNum <= 1 ? 'running out FAST.' : daysNum <= 7 ? 'limited.' : 'on your side.'}`;

      const liquidityScore = 85;
      const riskRewardScore = riskRewardRatio >= 2 ? 85 : riskRewardRatio >= 1 ? 70 : 45;
      const technicalScore = rsiScore > 70 || rsiScore < 30 ? 75 : 60;
      const overallScore = Math.round((liquidityScore + riskRewardScore + technicalScore) / 3);

      setAnalysisResult({
        ticker, optionType, strikePrice: strikeNum, optionPrice: optionPriceNum, daysToExpiry: daysNum, lastClose: currentPriceNum,
        rsiScore, stochasticK, macdSignal: realData.macdSignal || 'Neutral', ivPercentile,
        liquidityScore, riskRewardScore, technicalScore, overallScore,
        delta: delta.toFixed(2), gamma: gamma.toFixed(4), theta: theta.toFixed(4), vega: vega.toFixed(3),
        maxRiskPerContract: maxRiskPerContract.toFixed(2), maxGainPerContract: maxGainPerContract.toFixed(2), riskRewardRatio,
        breakEvenPrice: breakEvenPrice.toFixed(2), priceMove: priceMove.toFixed(2), priceMovePercent, contractsToTrade,
        totalMaxRisk: totalMaxRisk.toFixed(2), totalMaxGain: totalMaxGain.toFixed(2),
        thesisStatement, plainEnglishVerdict, userThesis, thesisAnalysis, ivCrushImpact,
        technicalSummary, riskRewardSummary, dteSummary,
        weeklyEvents: `📅 ECONOMIC CALENDAR:\n🔴 CPI - Wednesday 8:30 AM\n🟠 Jobless Claims - Thursday 8:30 AM\n\n💼 EARNINGS:\n📊 NVDA - Aug 26 | MSFT - Jul 29 | TSLA - Jul 21`
      });
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setStrikePrice('');
    setOptionPrice('');
    setExpiryDate('');
    setDaysToExpiry('1');
    setUserThesis('');
    setAnalysisResult(null);
    setError('');
  };

  const generateClaudeUrl = (question) => {
    const tradeData = `TRADE: ${analysisResult.ticker} ${analysisResult.optionType.toUpperCase()} | Strike: $${analysisResult.strikePrice} | Current: $${analysisResult.lastClose} | Price: $${analysisResult.optionPrice} | DTE: ${analysisResult.daysToExpiry} | R/R: 1:${analysisResult.riskRewardRatio} | Score: ${analysisResult.overallScore}\n\n${question}`;
    return `https://claude.ai?prompt=${encodeURIComponent(tradeData)}`;
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #f0f8ff 100%)', minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>⚡ Vega Day Trading Analyzer</h1>
        {!analysisResult ? (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>⚠️ INFORMATION: This tool provides analytical information. It is not financial advice.</p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Ticker</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="text" value={ticker} onChange={(e) => handleTickerInput(e.target.value)} placeholder="QQQ, SPY, TSLA" style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <button onClick={handleCheckPrice} disabled={tickerFetchInProgress} style={{ padding: '0.75rem 1.5rem', background: '#ff8c42', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  {tickerFetchInProgress ? '⏳' : '💵 Check Price'}
                </button>
              </div>
              {(currentPrice && currentPrice > 1) && (
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', background: '#fef3c7', padding: '1rem', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><div style={{ fontSize: '0.7rem', color: '#6b7280' }}>💵 Current</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>${currentPrice.toFixed(2)}</div></div>
                  {lastClosePrice && <div><div style={{ fontSize: '0.7rem', color: '#6b7280' }}>📊 Last Close</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>${lastClosePrice.toFixed(2)}</div></div>}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setOptionType('call')} style={{ padding: '0.75rem', background: optionType === 'call' ? '#00c8c8' : '#e0f2fe', color: optionType === 'call' ? 'white' : '#0369a1', border: '2px solid #00c8c8', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>📈 CALL</button>
              <button onClick={() => setOptionType('put')} style={{ padding: '0.75rem', background: optionType === 'put' ? '#00c8c8' : '#e0f2fe', color: optionType === 'put' ? 'white' : '#0369a1', border: '2px solid #00c8c8', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>📉 PUT</button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Strike Price ($)</label>
              <input type="number" value={strikePrice} onChange={(e) => setStrikePrice(e.target.value)} placeholder="740" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Option Price ($)</label>
              <input type="number" value={optionPrice} onChange={(e) => setOptionPrice(e.target.value)} step="0.01" placeholder="28.25" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Expiration Date</label>
              <input type="date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); const d = Math.max(1, Math.ceil((new Date(e.target.value) - new Date()) / (1000 * 60 * 60 * 24))); setDaysToExpiry(d.toString()); }} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Days: {daysToExpiry}</div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Account Size ($)</label>
              <input type="number" value={accountSize} onChange={(e) => setAccountSize(parseFloat(e.target.value) || 50000)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Your Thesis</label>
              <textarea value={userThesis} onChange={(e) => setUserThesis(e.target.value)} placeholder="Why are you trading this?" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '60px' }} />
            </div>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>⚠️ {error}</div>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleAnalyze} disabled={isAnalyzing} style={{ flex: 1, padding: '0.75rem', background: '#00c8c8', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                {isAnalyzing ? '⏳ Analyzing...' : '🚀 ANALYZE'}
              </button>
              <button onClick={reset} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>↻ RESET</button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setAnalysisResult(null)} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', marginBottom: '1.5rem', cursor: 'pointer' }}>← Back</button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Analysis Results</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Type</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysisResult.optionType === 'call' ? '📈' : '📉'}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Ticker</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysisResult.ticker}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Strike</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.strikePrice.toFixed(2)}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Current</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.lastClose.toFixed(2)}</div></div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📊 Technical</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem' }}>RSI</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.rsiScore}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem' }}>IV Percentile</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.ivPercentile}%</div></div>
            </div>
            <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
              <strong>📚 What This Means:</strong> {analysisResult.technicalSummary}
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>💰 Risk/Reward</h3>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Max Risk</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>${analysisResult.maxRiskPerContract}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Max Gain</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>${analysisResult.maxGainPerContract}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>R/R Ratio</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>1:{analysisResult.riskRewardRatio}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Breakeven</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>${analysisResult.breakEvenPrice}</div></div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>⚡ The Greeks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem' }}>Delta</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.delta}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>$1 move = ${analysisResult.delta} gain</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem' }}>Theta</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.theta}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Daily decay</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem' }}>Gamma</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.gamma}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Delta acceleration</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem' }}>Vega</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.vega}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>IV impact</div></div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>💡 Verdict</h3>
            <div style={{ background: analysisResult.overallScore > 75 ? '#ecfdf5' : analysisResult.overallScore > 60 ? '#fffbeb' : '#fef2f2', border: `2px solid ${analysisResult.overallScore > 75 ? '#10b981' : analysisResult.overallScore > 60 ? '#f59e0b' : '#ef4444'}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>{analysisResult.thesisStatement}</p>
              <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid', borderColor: analysisResult.overallScore > 75 ? '#86efac' : analysisResult.overallScore > 60 ? '#fcd34d' : '#fca5a5', borderRadius: '6px', padding: '1rem' }}>
                <strong>In Plain English:</strong> {analysisResult.plainEnglishVerdict}
              </div>
            </div>

            <div style={{ background: '#f0f9ff', border: '2px solid #00c8c8', borderRadius: '8px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>🤖 Ask Claude AI</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <a href={generateClaudeUrl('Should I take this trade?')} target="_blank" rel="noopener noreferrer" style={{ padding: '0.75rem', background: '#00c8c8', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>💬 Take or Wait?</a>
                <a href={generateClaudeUrl('What should my exit strategy be?')} target="_blank" rel="noopener noreferrer" style={{ padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>🛑 Exit Strategy</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
