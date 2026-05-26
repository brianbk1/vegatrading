import React, { useState } from 'react';
export default function DayTradingApp() {
  const [ticker, setTicker] = useState('QQQ');
  const [strikePrice, setStrikePrice] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [accountSize, setAccountSize] = useState(50000);
  const [userThesis, setUserThesis] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [entryMode, setEntryMode] = useState('manual');
  
  // Fetch mode state
  const [expirations, setExpirations] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [optionsChain, setOptionsChain] = useState([]);
  const [isFetchingExpirations, setIsFetchingExpirations] = useState(false);
  const [isFetchingStrikes, setIsFetchingStrikes] = useState(false);
  const [daysToExpiry, setDaysToExpiry] = useState('1');

  const handleFetchExpirations = async () => {
    if (!ticker) {
      setError('Please enter Ticker');
      return;
    }
    setIsFetchingExpirations(true);
    setError('');
    try {
      const res = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, fetchExpirations: true }),
      });
      const data = await res.json();
      if (data.expirations && data.expirations.length > 0) {
        setExpirations(data.expirations);
        setSelectedExpiry('');
        setOptionsChain([]);
      } else {
        setError('No expirations found for this ticker. Try manual entry.');
      }
    } catch (err) {
      setError('Failed to fetch expirations.');
    } finally {
      setIsFetchingExpirations(false);
    }
  };

  const handleFetchStrikes = async () => {
    if (!selectedExpiry) {
      setError('Please select an expiration date');
      return;
    }
    setIsFetchingStrikes(true);
    setError('');
    try {
      const res = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, expiryDate: selectedExpiry, fetchStrikes: true }),
      });
      const data = await res.json();
      if (data.optionsChain && data.optionsChain.length > 0) {
        setOptionsChain(data.optionsChain);
        // Calculate days to expiry
        const today = new Date();
        const expiry = new Date(selectedExpiry);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        setDaysToExpiry(Math.max(1, daysLeft).toString());
      } else {
        setError('No strike data found for this expiration.');
      }
    } catch (err) {
      setError('Failed to fetch strikes.');
    } finally {
      setIsFetchingStrikes(false);
    }
  };

  const handleSelectStrike = (chain) => {
    setStrikePrice(chain.strike.toString());
    setOptionPrice(chain.mid.toFixed(2));
    setError('');
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
        body: JSON.stringify({ ticker, strikePrice, daysToExpiry, optionPrice }),
      });
      if (!dataResponse.ok) throw new Error('API error');
      const realData = await dataResponse.json();
      const rsiScore = Math.round(parseFloat(realData.rsi14 || 50));
      const stochasticK = Math.round(parseFloat(realData.stochasticK || 50));
      const ivPercentile = Math.round(parseFloat(realData.ivPercentile || 50));
      const strikeNum = parseFloat(strikePrice);
      const currentPriceNum = parseFloat(realData.lastClose);
      const daysNum = parseInt(daysToExpiry);
      const volatility = ivPercentile / 100;
      const optionPriceNum = parseFloat(optionPrice);
      const delta = Math.min(0.95, Math.max(0.05, 0.5 + (currentPriceNum - strikeNum) / strikeNum * 0.5));
      const gamma = Math.exp(-Math.pow((currentPriceNum - strikeNum) / strikeNum, 2) / 2) / (strikeNum * volatility * Math.sqrt(Math.max(1, daysNum / 365)));
      const theta = -(optionPriceNum / (daysNum || 1)) * 0.1;
      const vega = (strikeNum * gamma * Math.sqrt(Math.max(1, daysNum / 365))) / 100;
      const maxRiskPerContract = optionPriceNum;
      const maxGainPerContract = Math.max(currentPriceNum - strikeNum - optionPriceNum, 0);
      const riskRewardRatio = maxRiskPerContract > 0 ? (maxGainPerContract / maxRiskPerContract).toFixed(2) : 0;
      const breakEvenPrice = strikeNum + optionPriceNum;
      const priceMove = Math.abs(breakEvenPrice - currentPriceNum);
      const priceMovePercent = ((priceMove / currentPriceNum) * 100).toFixed(2);
      const maxAccountRisk = accountSize * 0.02;
      const contractsToTrade = Math.floor(maxAccountRisk / maxRiskPerContract);
      const totalMaxRisk = contractsToTrade * maxRiskPerContract;
      const totalMaxGain = contractsToTrade * maxGainPerContract;
      let thesisAnalysis = '';
      if (userThesis && userThesis.trim().length > 0) {
        const thesisLower = userThesis.toLowerCase();
        let catalystFound = '';
        if (thesisLower.includes('iran') || thesisLower.includes('war') || thesisLower.includes('geopolitical')) {
          catalystFound = 'Geopolitical Risk (Iran/War)';
        } else if (thesisLower.includes('earn')) {
          catalystFound = 'Earnings Report';
        } else if (thesisLower.includes('fed') || thesisLower.includes('fomc')) {
          catalystFound = 'Federal Reserve Decision';
        } else if (thesisLower.includes('cpi') || thesisLower.includes('inflation')) {
          catalystFound = 'Inflation Data';
        } else if (thesisLower.includes('dividend')) {
          catalystFound = 'Dividend Announcement';
        } else if (thesisLower.includes('acquisition') || thesisLower.includes('merger')) {
          catalystFound = 'M&A Activity';
        } else {
          catalystFound = 'Custom Catalyst';
        }
        let impactAnalysis = `📍 **Catalyst:** ${catalystFound}\n`;
        if (catalystFound === 'Earnings Report') {
          impactAnalysis += `✅ IV will spike before earnings\n✅ IV will crush after earnings\n⚠️ Check earnings date vs. expiration\n⚠️ Gap risk if ${ticker} moves 5%+`;
        } else if (catalystFound === 'Federal Reserve Decision') {
          impactAnalysis += `✅ Rate cuts = bullish for equities\n✅ Rate hikes = bearish for growth\n⚠️ Forward guidance is critical`;
        } else {
          impactAnalysis += `✅ Identified catalyst\n✅ Consider timing\n⚠️ DTE (${daysNum} days) sufficient for move`;
        }
        impactAnalysis += `\n\nRisk Check:\n• Price: $${currentPriceNum.toFixed(2)} | Strike: $${strikeNum.toFixed(2)}\n• Required Move: ${priceMovePercent}%\n• R/R: 1:${riskRewardRatio}`;
        thesisAnalysis = impactAnalysis;
      } else {
        thesisAnalysis = '⚠️ No trade thesis provided. Explain your reasoning before trading.';
      }
      let thesisStatement = `${riskRewardRatio >= 2 ? '✅ STRONG' : riskRewardRatio >= 1 ? '⚠️ FAIR' : '❌ WEAK'} SETUP: `;
      if (rsiScore > 70) {
        thesisStatement += `RSI overbought (${rsiScore}). `;
      } else if (rsiScore < 30) {
        thesisStatement += `RSI oversold (${rsiScore}). `;
      } else {
        thesisStatement += `RSI neutral (${rsiScore}). `;
      }
      thesisStatement += `${delta > 0.7 ? 'High delta—large moves needed. ' : delta < 0.3 ? 'Low delta—wide moves needed. ' : ''}${theta < -0.05 ? 'High theta decay. ' : 'Moderate decay. '}`;
      if (riskRewardRatio >= 2 && (rsiScore > 70 || rsiScore < 30)) {
        thesisStatement += 'Good R/R + extreme RSI = monitor break-even.';
      } else if (riskRewardRatio >= 1) {
        thesisStatement += 'Fair setup. Set stop loss at break-even.';
      } else {
        thesisStatement += 'Poor R/R. Wait for better setup.';
      }
      const ivCrushImpact = [
        { ivChange: -20, label: 'Moderate (-20%)', newPrice: (optionPriceNum + (vega * -20)).toFixed(2), loss: (Math.max(0, optionPriceNum - (optionPriceNum + (vega * -20)))).toFixed(2) },
        { ivChange: -40, label: 'Significant (-40%)', newPrice: (optionPriceNum + (vega * -40)).toFixed(2), loss: (Math.max(0, optionPriceNum - (optionPriceNum + (vega * -40)))).toFixed(2) },
        { ivChange: -60, label: 'Severe (-60%)', newPrice: (optionPriceNum + (vega * -60)).toFixed(2), loss: (Math.max(0, optionPriceNum - (optionPriceNum + (vega * -60)))).toFixed(2) }
      ];
      const liquidityScore = 85;
      const riskRewardScore = riskRewardRatio >= 2 ? 85 : riskRewardRatio >= 1 ? 70 : 45;
      const technicalScore = rsiScore > 70 || rsiScore < 30 ? 75 : 60;
      const overallScore = Math.round((liquidityScore + riskRewardScore + technicalScore) / 3);
      setAnalysisResult({
        ticker, strikePrice: strikeNum, optionPrice: optionPriceNum, daysToExpiry: daysNum, lastClose: currentPriceNum,
        priceFound: realData.lastClose !== strikePrice.toString(), rsiScore, rsiInterpretation: realData.rsiInterpretation || 'Neutral',
        stochasticK, macdSignal: realData.macdSignal || 'Neutral', ivPercentile, liquidityScore, riskRewardScore, technicalScore, overallScore,
        delta: delta.toFixed(2), gamma: gamma.toFixed(4), theta: theta.toFixed(4), vega: vega.toFixed(3),
        maxRiskPerContract: maxRiskPerContract.toFixed(2), maxGainPerContract: maxGainPerContract.toFixed(2), riskRewardRatio,
        breakEvenPrice: breakEvenPrice.toFixed(2), priceMove: priceMove.toFixed(2), priceMovePercent, contractsToTrade,
        totalMaxRisk: totalMaxRisk.toFixed(2), totalMaxGain: totalMaxGain.toFixed(2), thesisStatement, userThesis, thesisAnalysis, ivCrushImpact,
        weeklyEvents: `📅 ECONOMIC CALENDAR:\n🔴 CPI - Wednesday 8:30 AM\n🟠 Jobless Claims - Thursday 8:30 AM\n🟠 Retail Sales - Friday 8:30 AM\n\n💼 EARNINGS:\n📊 NVDA - Aug 26 (After Hours)\n📊 MSFT - Jul 29 (After Hours)\n📊 TSLA - Jul 21 (After Hours)\n📊 META - Jul 30 (After Hours)\n📊 AAPL - Aug 1 (After Hours)\n📊 GOOGL - Jul 29 (After Hours)`
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
    setDaysToExpiry('1');
    setUserThesis('');
    setAnalysisResult(null);
    setError('');
    setExpirations([]);
    setSelectedExpiry('');
    setOptionsChain([]);
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #fff8f0 0%, #f0f8ff 100%)', minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>⚡ Vega Day Trading Analyzer</h1>
        {!analysisResult ? (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>
                ⚠️ INFORMATION: This tool provides analytical information about options trades. It is not financial advice, and you are solely responsible for your trading decisions. Always verify data with your broker before executing any trades.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <button
                onClick={() => { setEntryMode('manual'); setExpirations([]); setSelectedExpiry(''); setOptionsChain([]); }}
                style={{
                  padding: '1rem',
                  background: entryMode === 'manual' ? '#00c8c8' : '#e0f2fe',
                  color: entryMode === 'manual' ? 'white' : '#0369a1',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ✍️ Manual Entry
              </button>
              <button
                onClick={() => setEntryMode('fetch')}
                style={{
                  padding: '1rem',
                  background: entryMode === 'fetch' ? '#ff8c42' : '#fef3c7',
                  color: entryMode === 'fetch' ? 'white' : '#92400e',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                📡 Fetch from Polygon
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Ticker</label>
              <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
            </div>

            {entryMode === 'manual' && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Strike Price ($)</label>
                  <input type="number" value={strikePrice} onChange={(e) => setStrikePrice(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Option Price ($)</label>
                  <input type="number" value={optionPrice} onChange={(e) => setOptionPrice(e.target.value)} step="0.01" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Days to Expiry</label>
                  <input type="number" value={daysToExpiry} onChange={(e) => setDaysToExpiry(e.target.value)} min="1" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
                </div>
              </>
            )}

            {entryMode === 'fetch' && (
              <>
                <button
                  onClick={handleFetchExpirations}
                  disabled={isFetchingExpirations || !ticker}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isFetchingExpirations ? '#d1d5db' : '#ff8c42',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: isFetchingExpirations || !ticker ? 'not-allowed' : 'pointer',
                    marginBottom: '1rem'
                  }}
                >
                  {isFetchingExpirations ? '⏳ Loading Expirations...' : '📅 Fetch Expirations'}
                </button>

                {expirations.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Select Expiration Date</label>
                    <select 
                      value={selectedExpiry} 
                      onChange={(e) => {
                        setSelectedExpiry(e.target.value);
                        setOptionsChain([]);
                        const today = new Date();
                        const expiry = new Date(e.target.value);
                        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                        setDaysToExpiry(Math.max(1, daysLeft).toString());
                      }}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
                    >
                      <option value="">-- Choose an expiration --</option>
                      {expirations.map((exp, idx) => (
                        <option key={idx} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedExpiry && (
                  <button
                    onClick={handleFetchStrikes}
                    disabled={isFetchingStrikes}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: isFetchingStrikes ? '#d1d5db' : '#00c8c8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: isFetchingStrikes ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem'
                    }}
                  >
                    {isFetchingStrikes ? '⏳ Loading Strikes...' : '🎯 Fetch Strikes'}
                  </button>
                )}

                {optionsChain.length > 0 && (
                  <div style={{ background: '#f0f9ff', border: '2px solid #00c8c8', borderRadius: '8px', padding: '1rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                    <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>Click a strike to select:</h5>
                    {optionsChain.slice(0, 30).map((chain, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectStrike(chain)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          margin: '0.25rem 0',
                          background: 'white',
                          border: '1px solid #00c8c8',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace'
                        }}
                      >
                        ${chain.strike.toFixed(2).padStart(7)} | B:{chain.bid.toFixed(2).padStart(6)} | A:{chain.ask.toFixed(2).padStart(6)} | M:{chain.mid.toFixed(2).padStart(6)}
                      </button>
                    ))}
                  </div>
                )}

                {strikePrice && optionPrice && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#047857' }}>
                    ✅ Strike: ${strikePrice} | Price: ${optionPrice} | DTE: {daysToExpiry}
                  </div>
                )}
              </>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, margin: 0 }}>Account Size ($)</label>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: '#3b82f6', color: 'white', borderRadius: '50%', fontSize: '12px', fontWeight: 'bold', cursor: 'help', flexShrink: 0 }} title="Max Risk = Account Size × 2%. Ensures you never risk more than 2% per trade.">?</span>
              </div>
              <input type="number" value={accountSize} onChange={(e) => setAccountSize(parseFloat(e.target.value) || 50000)} min="1000" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>💡 Max Risk = Account × 2%</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>📝 Your Trade Thesis</label>
              <textarea value={userThesis} onChange={(e) => setUserThesis(e.target.value)} placeholder="e.g., QQQ overbought (RSI 71), expecting pullback to $715 support..." style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'monospace', minHeight: '60px', resize: 'vertical' }} />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Be specific about your reasoning</div>
            </div>

            {error && (<div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>⚠️ {error}</div>)}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleAnalyze} disabled={isAnalyzing} style={{ flex: 1, padding: '0.75rem', background: '#00c8c8', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: isAnalyzing ? 'not-allowed' : 'pointer', opacity: isAnalyzing ? 0.6 : 1 }}>
                {isAnalyzing ? '⏳ Analyzing...' : '🚀 ANALYZE'}
              </button>
              <button onClick={reset} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                ↻ RESET
              </button>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1.5rem', marginTop: '2rem', fontSize: '0.85rem', color: '#374151', lineHeight: '1.8' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>📚 How to Use</h3>
              <p style={{ margin: '0 0 0.75rem 0' }}><strong>Manual:</strong> Enter strike & option price from your broker directly.</p>
              <p style={{ margin: '0 0 0.75rem 0' }}><strong>Fetch:</strong> Enter ticker → select expiration → click strike to auto-fill like Schwab.</p>
              <p style={{ margin: '0 0 0.75rem 0' }}><strong>Score:</strong> Above 75 = institutional-grade, 60-74 = tradeable, below 60 = caution.</p>
              <p style={{ margin: 0 }}><strong>Verify:</strong> Always cross-check data on <a href="https://finviz.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00c8c8', textDecoration: 'underline' }}>Finviz.com</a> before trading.</p>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setAnalysisResult(null)} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', marginBottom: '1.5rem', cursor: 'pointer', fontWeight: 600 }}>
              ← Back to Form
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #ff8c42', paddingBottom: '0.5rem' }}>Analysis Results</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ticker</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysisResult.ticker}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Strike</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.strikePrice.toFixed(2)}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Price</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.lastClose.toFixed(2)}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Option Price</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.optionPrice.toFixed(2)}</div></div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📊 Technical Indicators</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>RSI (14)</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: analysisResult.rsiScore > 70 ? '#ef4444' : analysisResult.rsiScore < 30 ? '#00c8c8' : '#6b7280' }}>{analysisResult.rsiScore}</div><div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{analysisResult.rsiInterpretation}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Stochastic K</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.stochasticK}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>MACD</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.macdSignal}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>IV Percentile</div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.ivPercentile}%</div></div>
            </div>

            <div style={{ background: analysisResult.riskRewardRatio >= 2 ? '#ecfdf5' : analysisResult.riskRewardRatio >= 1 ? '#fffbeb' : '#fef2f2', border: `2px solid ${analysisResult.riskRewardRatio >= 2 ? '#10b981' : analysisResult.riskRewardRatio >= 1 ? '#f59e0b' : '#ef4444'}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: analysisResult.riskRewardRatio >= 2 ? '#065f46' : analysisResult.riskRewardRatio >= 1 ? '#92400e' : '#7f1d1d' }}>💡 Trade Thesis</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.7', color: analysisResult.riskRewardRatio >= 2 ? '#047857' : analysisResult.riskRewardRatio >= 1 ? '#b45309' : '#991b1b' }}>{analysisResult.thesisStatement}</p>
            </div>

            {analysisResult.userThesis && (
              <div style={{ background: '#f3f4f6', border: '2px solid #9ca3af', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>📌 Your Thesis</h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#4b5563', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{analysisResult.userThesis}</p>
                <div style={{ background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}>Catalyst Analysis</h4>
                  <div style={{ fontSize: '0.85rem', color: '#374151', whiteSpace: 'pre-wrap' }}>{analysisResult.thesisAnalysis}</div>
                </div>
              </div>
            )}

            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>📰 This Week's Events</h3>
              <div style={{ fontSize: '0.85rem', color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{analysisResult.weeklyEvents}</div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>💰 Position Setup</h3>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Max Risk/Contract</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${analysisResult.maxRiskPerContract}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Max Gain/Contract</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>${analysisResult.maxGainPerContract}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Risk/Reward Ratio</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: analysisResult.riskRewardRatio >= 2 ? '#10b981' : analysisResult.riskRewardRatio >= 1 ? '#f59e0b' : '#ef4444' }}>1:{analysisResult.riskRewardRatio}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Breakeven Price</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.breakEvenPrice}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Contracts (2%)</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff8c42' }}>{analysisResult.contractsToTrade}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Risk</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${analysisResult.totalMaxRisk}</div></div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>⚡ IV Crush Impact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              {analysisResult.ivCrushImpact.map((scenario, idx) => (
                <div key={idx} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '6px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.5rem' }}>{scenario.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>${scenario.newPrice}</div>
                  <div style={{ fontSize: '0.75rem', color: '#7c2d12' }}>Loss: ${scenario.loss}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>⚡ The Greeks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Delta</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00c8c8' }}>{analysisResult.delta}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Gamma</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ff8c42' }}>{analysisResult.gamma}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Theta</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{analysisResult.theta}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Vega</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>{analysisResult.vega}</div></div>
            </div>

            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: analysisResult.overallScore > 75 ? '#059669' : analysisResult.overallScore > 60 ? '#f59e0b' : '#dc2626', marginBottom: '0.5rem' }}>{analysisResult.overallScore}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: analysisResult.overallScore > 75 ? '#059669' : analysisResult.overallScore > 60 ? '#d97706' : '#dc2626' }}>
                {analysisResult.overallScore > 75 ? '🟢 Institutional Grade' : analysisResult.overallScore > 60 ? '🟡 Trade Worthy' : '🔴 Caution'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '6px' }}><div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>Liquidity</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ff8c42' }}>{analysisResult.liquidityScore}</div></div>
                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '6px' }}><div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>Risk/Reward</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00c8c8' }}>{analysisResult.riskRewardScore}</div></div>
                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '6px' }}><div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>Technical</div><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{analysisResult.technicalScore}</div></div>
              </div>
            </div>

            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>⚠️ Information provided for analysis only. Verify all data with your broker before trading.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
