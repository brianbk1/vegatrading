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
  const [useManualGreeks, setUseManualGreeks] = useState(false);
  const [manualDelta, setManualDelta] = useState('');
  const [manualTheta, setManualTheta] = useState('');

  const handleTickerInput = (newTicker) => {
    setTicker(newTicker.toUpperCase());
    console.log(`📝 TYPED: ${newTicker.toUpperCase()}`);
  };

  const handleCheckPrice = async () => {
    const upperTicker = ticker.toUpperCase();
    console.log(`🔍 CHECK PRICE clicked for: "${upperTicker}"`);
    
    if (!upperTicker || upperTicker.length === 0) {
      setError('Please enter a ticker first');
      return;
    }
    
    setTickerFetchInProgress(true);
    setError('');
    console.log(`🔍 FETCHING price for ticker: "${upperTicker}"`);
    try {
      const payload = { ticker: upperTicker, getPrice: true };
      console.log(`🔍 SENDING payload:`, JSON.stringify(payload));
      const res = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log(`🔍 RECEIVED response:`, data);
      
      if (data.ticker === upperTicker && data.currentPrice && data.currentPrice > 1) {
        console.log(`🔍 SETTING prices - current: $${data.currentPrice}, lastClose: $${data.lastClose}`);
        setCurrentPrice(data.currentPrice);
        setLastClosePrice(data.lastClose);
      } else if (data.ticker !== upperTicker) {
        console.log(`🔍 IGNORING response: ticker mismatch (expected ${upperTicker}, got ${data.ticker})`);
        setError(`Price fetch returned wrong ticker: ${data.ticker}`);
      } else {
        console.log(`🔍 INVALID price in response:`, data.currentPrice);
        setError('Invalid price received');
      }
    } catch (err) {
      console.log('🔍 FETCH FAILED:', err.message);
      setError(`Price fetch failed: ${err.message}`);
    } finally {
      setTickerFetchInProgress(false);
    }
  };

  const handleAnalyze = async () => {
    if (!strikePrice || !optionPrice) {
      setError('Please enter Strike Price and Option Price');
      return;
    }
    if (!currentPrice) {
      setError('Please enter Current Price');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    console.log(`🚀 ANALYZING with currentPrice=${currentPrice}`);
    try {
      const dataResponse = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, strikePrice, daysToExpiry, optionPrice, optionType, currentPrice }),
      });
      console.log(`🚀 Response received`);
      if (!dataResponse.ok) throw new Error('API error');
      const realData = await dataResponse.json();
      console.log(`🚀 Data back from API:`, realData);
      
      const rsiScore = Math.round(parseFloat(realData.rsi14 || 50));
      const stochasticK = Math.round(parseFloat(realData.stochasticK || 50));
      const ivPercentile = Math.round(parseFloat(realData.ivPercentile || 50));
      const strikeNum = parseFloat(strikePrice);
      const currentPriceNum = currentPrice;
      const daysNum = parseInt(daysToExpiry);
      const volatility = ivPercentile / 100;
      const optionPriceNum = parseFloat(optionPrice);
      
      let delta, theta;
      if (useManualGreeks && manualDelta && manualTheta) {
        delta = parseFloat(manualDelta);
        theta = parseFloat(manualTheta);
      } else {
        delta = Math.min(0.95, Math.max(0.05, 0.5 + (currentPriceNum - strikeNum) / strikeNum * 0.5));
        theta = -(optionPriceNum / (daysNum || 1)) * 0.1;
      }
      
      const gamma = Math.exp(-Math.pow((currentPriceNum - strikeNum) / strikeNum, 2) / 2) / (strikeNum * volatility * Math.sqrt(Math.max(1, daysNum / 365)));
      const vega = (strikeNum * gamma * Math.sqrt(Math.max(1, daysNum / 365))) / 100;
      
      const maxRiskPerContract = optionPriceNum;
      const maxGainPerContract = optionType === 'call' 
        ? Math.max(currentPriceNum - strikeNum - optionPriceNum, 0)
        : Math.max(strikeNum - currentPriceNum - optionPriceNum, 0);
      
      const riskRewardRatio = maxRiskPerContract > 0 ? (maxGainPerContract / maxRiskPerContract).toFixed(2) : 0;
      const breakEvenPrice = strikeNum + optionPriceNum;
      const priceMove = Math.abs(breakEvenPrice - currentPriceNum);
      const priceMovePercent = ((priceMove / currentPriceNum) * 100).toFixed(2);
      
      const maxAccountRisk = accountSize * 0.02;
      const contractsToTrade = Math.floor(maxAccountRisk / maxRiskPerContract);
      const totalMaxRisk = contractsToTrade * maxRiskPerContract;
      const totalMaxGain = contractsToTrade * maxGainPerContract;
      
      // EXIT STRATEGY
      const profitTargetPriceMove = 5; // $5 move target
      const profitTargetDollarAmount = Math.abs(delta * profitTargetPriceMove * 100); // Delta * Price Move * 100 shares
      const stopLoss = optionPriceNum * 0.20;
      const stopLossDollarAmount = stopLoss * 100; // Per contract
      const thetaDailyDecay = Math.abs(theta * 100); // Per contract per day
      const daysUntilReassess = Math.max(3, Math.floor(daysNum * 0.15));
      const reassessDate = new Date();
      reassessDate.setDate(reassessDate.getDate() + daysUntilReassess);
      
      const targetPrice = (optionType === 'call' 
        ? currentPriceNum + profitTargetPriceMove 
        : currentPriceNum - profitTargetPriceMove).toFixed(2);
      
      let exitStrategy = [
        {
          rule: '🎯 PROFIT TARGET',
          trigger: `${ticker} moves to $${targetPrice} (${optionType === 'call' ? 'up' : 'down'} $${profitTargetPriceMove})`,
          plainEnglish: `When ${ticker} reaches $${targetPrice}, your option contract will be worth approximately $${profitTargetDollarAmount.toFixed(0)} more. That's your profit target.`,
          action: 'SELL immediately and lock in the profit. Do not wait for more gains.',
          priority: 'PRIMARY'
        },
        {
          rule: '🛑 STOP LOSS',
          trigger: `Your option loses $${stopLossDollarAmount.toFixed(0)} (20% of premium paid)`,
          plainEnglish: `If your option drops to $${(optionPriceNum - stopLoss).toFixed(2)} or lower, you've lost 20% of what you paid. That's your maximum loss threshold.`,
          action: 'CLOSE the trade immediately. Do not hope it comes back—cut losses here.',
          priority: 'CRITICAL'
        },
        {
          rule: '⏰ REASSESS BY DATE',
          trigger: `${reassessDate.toLocaleDateString()} (${daysUntilReassess} days from now)`,
          plainEnglish: `If your trade isn't profitable by ${reassessDate.toLocaleDateString()}, close it and step back. You can re-enter after a pullback if the thesis is still valid.`,
          action: 'If not in profit: EXIT and reassess. If in profit: Still consider taking it.',
          priority: 'IMPORTANT'
        }
      ];
      
      if (thetaDailyDecay > 0.05) {
        exitStrategy.push({
          rule: '⚡ THETA DECAY WARNING',
          trigger: `You lose ~$${thetaDailyDecay.toFixed(0)} per contract every day (time decay)`,
          plainEnglish: `Every single day that passes, your option loses $${thetaDailyDecay.toFixed(0)} in value—even if the stock doesn't move. The closer to expiration, the faster you lose money.`,
          action: 'Do NOT hold this option into the final week. If you\'re not profitable soon, exit and move on.',
          priority: 'WATCH'
        });
      }
      
      // Rest of analysis
      const technicalSummary = rsiScore > 70 
        ? `RSI is ${rsiScore} (overbought) - asset may be due for a pullback. This SUPPORTS bearish trades.`
        : rsiScore < 30 
        ? `RSI is ${rsiScore} (oversold) - asset may bounce higher. This SUPPORTS bullish trades.`
        : `RSI is ${rsiScore} (neutral) - no clear directional bias from momentum.`;
      
      const riskRewardSummary = riskRewardRatio >= 2
        ? `R/R of 1:${riskRewardRatio} is excellent - you can win twice what you risk. This STRONGLY SUPPORTS the trade.`
        : riskRewardRatio >= 1.5
        ? `R/R of 1:${riskRewardRatio} is good - solid risk/reward balance.`
        : riskRewardRatio >= 1
        ? `R/R of 1:${riskRewardRatio} is fair - winning equals risking. Marginal setup.`
        : `R/R of 1:${riskRewardRatio} is poor - you risk more than you can win. This OPPOSES the trade.`;
      
      const dteSummary = daysNum <= 1
        ? `${daysNum} day(s) to expiry - extremely limited time. Fast theta decay helps put sellers, hurts buyers.`
        : daysNum <= 7
        ? `${daysNum} days to expiry - short-term play. Theta decay accelerating.`
        : daysNum <= 30
        ? `${daysNum} days to expiry - standard monthly expiration. Balanced theta decay.`
        : `${daysNum} days to expiry - longer timeframe. More time for your thesis to play out.`;
      
      const contractsSummary = contractsToTrade > 0
        ? `Position sizing: ${contractsToTrade} contract(s) risk $${totalMaxRisk.toFixed(0)} total (2% rule).`
        : `Position size: ${contractsToTrade} (premium too high relative to account).`;
      
      const dteSummaryFull = `${dteSummary} ${contractsSummary}`;
      
      const ivCrushSummary = vega > 0.05
        ? `High vega (${vega.toFixed(3)}) - IV changes will significantly impact your P&L. If IV drops 40%, you lose ~$${(vega * 40).toFixed(2)} per contract.`
        : `Low vega (${vega.toFixed(3)}) - IV changes have minimal impact on position.`;
      
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
      
      let plainEnglishVerdict = `This is a ${optionType.toUpperCase()} option (${optionType === 'call' ? 'you profit if stock GOES UP' : 'you profit if stock GOES DOWN'}). `;
      
      if (riskRewardRatio >= 2) {
        plainEnglishVerdict += `This is a GOOD trade setup. You could make $${maxGainPerContract} for every $${maxRiskPerContract} you risk—that's a 2:1 payoff. `;
        if (rsiScore > 70 || rsiScore < 30) {
          plainEnglishVerdict += `The technicals also look strong (RSI is extreme), so this could be a nice win if the stock moves as expected. Just watch your break-even point.`;
        } else {
          plainEnglishVerdict += `The technicals are neutral, so make sure your catalyst is solid.`;
        }
      } else if (riskRewardRatio >= 1) {
        plainEnglishVerdict += `This is a FAIR trade setup. You risk $${maxRiskPerContract} to make $${maxGainPerContract}—basically breakeven odds. Only take this if you have a really strong reason to believe the stock will move your way. `;
        if (rsiScore > 70 || rsiScore < 30) {
          plainEnglishVerdict += `The RSI is extreme, which helps your case.`;
        } else {
          plainEnglishVerdict += `The technicals don't strongly support you, so be extra careful.`;
        }
      } else {
        // OTM option - for day traders, focus on move potential not expiration value
        if (optionType === 'call' && strikeNum > currentPriceNum) {
          plainEnglishVerdict = `This is an OTM ${optionType.toUpperCase()} option—you're buying it cheap ($${maxRiskPerContract}) betting on ${ticker} to rally. Max profit at expiration is $0, BUT every dollar it moves toward your strike = $${Math.abs(delta * 100).toFixed(0)} gain. Use the "Day Trading Profit Potential" chart above to see your real profit if the move happens. ${rsiScore > 70 ? `RSI is overbought (${rsiScore})—wait for a pullback.` : `RSI is neutral—good entry if thesis is solid.`} You have ${daysNum} days—plenty of time for your move.`;
        } else if (optionType === 'put' && strikeNum < currentPriceNum) {
          plainEnglishVerdict = `This is an OTM ${optionType.toUpperCase()} option—you're buying it cheap ($${maxRiskPerContract}) betting on ${ticker} to drop. Max profit at expiration is $0, BUT every dollar it moves down toward your strike = $${Math.abs(delta * 100).toFixed(0)} gain. Use the "Day Trading Profit Potential" chart above to see your real profit if the move happens. ${rsiScore < 30 ? `RSI is oversold (${rsiScore})—wait for a bounce first.` : `RSI is neutral—good entry if thesis is solid.`} You have ${daysNum} days—plenty of time for your move.`;
        } else {
          plainEnglishVerdict = `This is a WEAK trade setup. You're risking $${maxRiskPerContract} but can only make $${maxGainPerContract}—that's losing money. Unless you have a very specific catalyst (earnings, major news), skip this and wait for a better opportunity.`;
        }
      }
      plainEnglishVerdict += ` Exit by ${reassessDate.toLocaleDateString()} or reassess.`;
      
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
        ticker, optionType, strikePrice: strikeNum, optionPrice: optionPriceNum, daysToExpiry: daysNum, lastClose: currentPriceNum,
        priceFound: realData.lastClose !== strikePrice.toString(), rsiScore, rsiInterpretation: realData.rsiInterpretation || 'Neutral',
        stochasticK, macdSignal: realData.macdSignal || 'Neutral', ivPercentile, liquidityScore, riskRewardScore, technicalScore, overallScore,
        delta: delta.toFixed(2), gamma: gamma.toFixed(4), theta: theta.toFixed(4), vega: vega.toFixed(3),
        maxRiskPerContract: maxRiskPerContract.toFixed(2), maxGainPerContract: maxGainPerContract.toFixed(2), riskRewardRatio,
        breakEvenPrice: breakEvenPrice.toFixed(2), priceMove: priceMove.toFixed(2), priceMovePercent, contractsToTrade,
        totalMaxRisk: totalMaxRisk.toFixed(2), totalMaxGain: totalMaxGain.toFixed(2), thesisStatement, plainEnglishVerdict, userThesis, thesisAnalysis, ivCrushImpact,
        technicalSummary, riskRewardSummary, dteSummaryFull, ivCrushSummary,
        exitStrategy, reassessDate: reassessDate.toLocaleDateString(),
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
    setExpiryDate('');
    setDaysToExpiry('1');
    setUserThesis('');
    setAnalysisResult(null);
    setError('');
    setManualDelta('');
    setManualTheta('');
  };

  const generateClaudeUrl = (question) => {
    const tradeData = `I'm analyzing an options trade and need your help. Here's my trade:\n\nTICKER: ${analysisResult.ticker}\nTYPE: ${analysisResult.optionType.toUpperCase()}\nSTRIKE: $${analysisResult.strikePrice.toFixed(2)}\nCURRENT PRICE: $${analysisResult.lastClose.toFixed(2)}\nOPTION PRICE: $${analysisResult.optionPrice}\nDAYS TO EXPIRY: ${analysisResult.daysToExpiry}\nRSI: ${analysisResult.rsiScore}\nRISK/REWARD: 1:${analysisResult.riskRewardRatio}\nMAX RISK: $${analysisResult.maxRiskPerContract}\nMAX GAIN: $${analysisResult.maxGainPerContract}\nOVERALL SCORE: ${analysisResult.overallScore}/100\nVERDICT: ${analysisResult.plainEnglishVerdict}\n\n${question}`;
    return `https://claude.ai?prompt=${encodeURIComponent(tradeData)}`;
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Ticker</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="text" value={ticker} onChange={(e) => handleTickerInput(e.target.value)} placeholder="e.g., QQQ, SPY, TSLA" style={{ flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
                <button
                  onClick={handleCheckPrice}
                  disabled={tickerFetchInProgress}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#ff8c42',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: tickerFetchInProgress ? 'not-allowed' : 'pointer',
                    opacity: tickerFetchInProgress ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tickerFetchInProgress ? '⏳ Checking...' : '💵 Check Price'}
                </button>
              </div>
              {(currentPrice && currentPrice > 1) || (lastClosePrice && lastClosePrice > 1) ? (
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600, background: '#fef3c7', padding: '1rem', borderRadius: '6px', border: '1px solid #fcd34d', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {currentPrice && currentPrice > 1 && (
                    <div style={{ color: '#047857' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem' }}>💵 Current</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>${currentPrice.toFixed(2)}</div>
                    </div>
                  )}
                  {lastClosePrice && lastClosePrice > 1 && (
                    <div style={{ color: '#047857' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem' }}>📊 Last Close</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>${lastClosePrice.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setOptionType('call')}
                style={{
                  padding: '0.75rem',
                  background: optionType === 'call' ? '#00c8c8' : '#e0f2fe',
                  color: optionType === 'call' ? 'white' : '#0369a1',
                  border: '2px solid #00c8c8',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                📈 CALL (Bullish)
              </button>
              <button
                onClick={() => setOptionType('put')}
                style={{
                  padding: '0.75rem',
                  background: optionType === 'put' ? '#00c8c8' : '#e0f2fe',
                  color: optionType === 'put' ? 'white' : '#0369a1',
                  border: '2px solid #00c8c8',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                📉 PUT (Bearish)
              </button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Strike Price ($)</label>
              <input type="number" value={strikePrice} onChange={(e) => setStrikePrice(e.target.value)} placeholder="e.g., 545.50" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
              {strikePrice && currentPrice && (
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: optionType === 'call' && parseFloat(strikePrice) > currentPrice ? '#fef3c7' : optionType === 'put' && parseFloat(strikePrice) < currentPrice ? '#fef3c7' : '#ecfdf5' }}>
                  {optionType === 'call' && parseFloat(strikePrice) > currentPrice ? (
                    <span style={{ color: '#92400e' }}>⚠️ For a CALL: Strike should be BELOW current price (${currentPrice.toFixed(2)}) for profit potential</span>
                  ) : optionType === 'put' && parseFloat(strikePrice) < currentPrice ? (
                    <span style={{ color: '#92400e' }}>⚠️ For a PUT: Strike should be ABOVE current price (${currentPrice.toFixed(2)}) for profit potential</span>
                  ) : (
                    <span style={{ color: '#047857' }}>✅ Good strike selection for this option type</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Option Price ($)</label>
              <input type="number" value={optionPrice} onChange={(e) => setOptionPrice(e.target.value)} step="0.01" placeholder="e.g., 2.45" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Expiration Date</label>
              <input 
                type="date" 
                value={expiryDate} 
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  const today = new Date();
                  const expiry = new Date(e.target.value);
                  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                  setDaysToExpiry(Math.max(1, daysLeft).toString());
                }}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Days to expiry: {daysToExpiry}</div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, margin: 0 }}>Account Size ($)</label>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: '#3b82f6', color: 'white', borderRadius: '50%', fontSize: '12px', fontWeight: 'bold', cursor: 'help', flexShrink: 0 }} title="Max Risk = Account Size × 2%. Ensures you never risk more than 2% per trade.">?</span>
              </div>
              <input type="number" value={accountSize} onChange={(e) => setAccountSize(parseFloat(e.target.value) || 50000)} min="1000" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }} />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>💡 Max Risk = Account × 2%</div>
            </div>
            <div style={{ marginBottom: '1.5rem', background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={useManualGreeks} onChange={(e) => setUseManualGreeks(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                ⚙️ Use Manual Greeks (Advanced)
              </label>
              {useManualGreeks && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280' }}>Delta (e.g., 0.25)</label>
                    <input type="number" value={manualDelta} onChange={(e) => setManualDelta(e.target.value)} step="0.01" placeholder="0.25" style={{ width: '100%', padding: '0.5rem', border: '1px solid #bfdbfe', borderRadius: '4px', marginTop: '0.25rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280' }}>Theta (e.g., -0.05)</label>
                    <input type="number" value={manualTheta} onChange={(e) => setManualTheta(e.target.value)} step="0.01" placeholder="-0.05" style={{ width: '100%', padding: '0.5rem', border: '1px solid #bfdbfe', borderRadius: '4px', marginTop: '0.25rem' }} />
                  </div>
                </div>
              )}
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
              <p style={{ margin: '0 0 0.75rem 0' }}><strong>Enter your data:</strong> Ticker, strike, option price (from your broker), and expiration date.</p>
              <p style={{ margin: '0 0 0.75rem 0' }}><strong>Add your thesis:</strong> Explain why you're making this trade (earnings, technicals, thesis, etc.).</p>
              <p style={{ margin: '0 0 0.75rem 0' }}><strong>Get your score:</strong> Above 75 = institutional-grade, 60-74 = tradeable, below 60 = caution.</p>
              <p style={{ margin: 0 }}><strong>Verify:</strong> Always cross-check data on <a href="https://finviz.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00c8c8', textDecoration: 'underline' }}>Finviz.com</a> before trading.</p>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
            <button onClick={() => setAnalysisResult(null)} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', marginBottom: '1.5rem', cursor: 'pointer', fontWeight: 600, position: 'sticky', top: 0 }}>
              ← Back to Form
            </button>

            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>
                ⚠️ INFORMATION: This tool provides analytical information about options trades. It is not financial advice, and you are solely responsible for your trading decisions. Always verify data with your broker before executing any trades.
              </p>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #ff8c42', paddingBottom: '0.5rem' }}>🎯 EXIT STRATEGY</h2>
            {analysisResult.exitStrategy && analysisResult.exitStrategy.map((rule, idx) => (
              <div key={idx} style={{ background: rule.priority === 'CRITICAL' ? '#fee2e2' : rule.priority === 'PRIMARY' ? '#ecfdf5' : rule.priority === 'IMPORTANT' ? '#fffbeb' : '#f0f9ff', border: `2px solid ${rule.priority === 'CRITICAL' ? '#dc2626' : rule.priority === 'PRIMARY' ? '#10b981' : rule.priority === 'IMPORTANT' ? '#f59e0b' : '#3b82f6'}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: rule.priority === 'CRITICAL' ? '#dc2626' : rule.priority === 'PRIMARY' ? '#047857' : rule.priority === 'IMPORTANT' ? '#92400e' : '#1e40af' }}>{rule.rule}</h4>
                <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid', borderColor: rule.priority === 'CRITICAL' ? '#fca5a5' : rule.priority === 'PRIMARY' ? '#86efac' : rule.priority === 'IMPORTANT' ? '#fcd34d' : '#bfdbfe', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#374151' }}><strong>When:</strong> {rule.trigger}</p>
                  {rule.plainEnglish && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', lineHeight: '1.5', color: '#1f2937', fontStyle: 'italic' }}>💬 <strong>In other words:</strong> {rule.plainEnglish}</p>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: rule.priority === 'CRITICAL' ? '#7f1d1d' : rule.priority === 'PRIMARY' ? '#065f46' : rule.priority === 'IMPORTANT' ? '#78350f' : '#1e3a8a' }}><strong>Your action:</strong> {rule.action}</p>
              </div>
            ))}

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '2rem', borderBottom: '2px solid #ff8c42', paddingBottom: '0.5rem' }}>💰 Day Trading Profit Potential</h2>
            <div style={{ background: '#f0f9ff', border: '2px solid #00c8c8', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>📊 Slide to see your expected profit based on when the stock moves. This is YOUR real profit potential for day trading.</p>
              <WhatIfSimulator analysisResult={analysisResult} />
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '2rem', borderBottom: '2px solid #ff8c42', paddingBottom: '0.5rem' }}>⚡ IV Crush Impact (Volatility Risk) - THEORETICAL</h2>
            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400e' }}>
              <strong>⚠️ IMPORTANT:</strong> These are <strong>theoretical calculations based on estimated Vega</strong>, NOT real broker data. Vega is estimated from our formula, not from actual market volatility surfaces. Your actual losses may differ significantly. <strong>Always verify with your broker's Greeks before trading.</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {analysisResult.ivCrushImpact.map((scenario, idx) => (
                <div key={idx} style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '6px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.5rem' }}>If IV drops {scenario.label.match(/\(.*\)/)[0]}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>${scenario.newPrice}</div>
                  <div style={{ fontSize: '0.75rem', color: '#7c2d12' }}>Theoretical loss: ${scenario.loss}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1rem', marginBottom: '2rem', fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.6' }}>
              <strong>💡 What This Means for You:</strong> {analysisResult.ivCrushSummary} This is <strong>one of the biggest risks for option buyers</strong>. If implied volatility collapses after earnings or major news, your option loses value even if the stock moves in your direction. Watch for earnings dates and Fed announcements!
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '2rem', borderBottom: '2px solid #ff8c42', paddingBottom: '0.5rem' }}>Analysis Results</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Type</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: analysisResult.optionType === 'call' ? '#10b981' : '#ef4444' }}>{analysisResult.optionType === 'call' ? '📈 CALL' : '📉 PUT'}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ticker</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysisResult.ticker}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Strike</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.strikePrice.toFixed(2)}</div></div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>💵 Price at Analysis</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857' }}>${analysisResult.lastClose.toFixed(2)}</div></div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>💰 Risk/Reward Analysis</h3>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Max Risk/Contract</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${analysisResult.maxRiskPerContract}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Max Gain/Contract</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>${analysisResult.maxGainPerContract}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Risk/Reward Ratio</div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: analysisResult.riskRewardRatio >= 2 ? '#10b981' : analysisResult.riskRewardRatio >= 1 ? '#f59e0b' : '#ef4444' }}>1:{analysisResult.riskRewardRatio}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Breakeven Price</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.breakEvenPrice}</div></div>
              </div>
            </div>

            <div style={{ background: analysisResult.overallScore > 75 ? '#ecfdf5' : analysisResult.overallScore > 60 ? '#fffbeb' : '#fef2f2', border: `2px solid ${analysisResult.overallScore > 75 ? '#10b981' : analysisResult.overallScore > 60 ? '#f59e0b' : '#ef4444'}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: analysisResult.overallScore > 75 ? '#065f46' : analysisResult.overallScore > 60 ? '#92400e' : '#7f1d1d' }}>💡 Overall Trade Verdict</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', lineHeight: '1.7', fontWeight: 600, color: analysisResult.overallScore > 75 ? '#047857' : analysisResult.overallScore > 60 ? '#b45309' : '#991b1b' }}>{analysisResult.thesisStatement}</p>
              <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid', borderColor: analysisResult.overallScore > 75 ? '#86efac' : analysisResult.overallScore > 60 ? '#fcd34d' : '#fca5a5', borderRadius: '6px', padding: '1rem', marginTop: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.7', color: analysisResult.overallScore > 75 ? '#047857' : analysisResult.overallScore > 60 ? '#b45309' : '#991b1b' }}>
                  <strong>In Plain English:</strong> {analysisResult.plainEnglishVerdict}
                </p>
              </div>
            </div>

            <div style={{ background: '#f0f9ff', border: '2px solid #00c8c8', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>🤖 Ask Claude AI About This Trade</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#374151' }}>Click below to ask Claude detailed questions about your trade. Your trade data is automatically included:</p>
              
              <div style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#374151', lineHeight: '1.6' }}>
                <strong>Trade Summary Being Sent:</strong><br/>
                • Ticker: {analysisResult.ticker}<br/>
                • Strike: ${analysisResult.strikePrice.toFixed(2)} | Current: ${analysisResult.lastClose.toFixed(2)}<br/>
                • Option Price: ${analysisResult.optionPrice} | DTE: {analysisResult.daysToExpiry} days<br/>
                • RSI: {analysisResult.rsiScore} | R/R: 1:{analysisResult.riskRewardRatio} | Score: {analysisResult.overallScore}<br/>
                • Max Risk: ${analysisResult.maxRiskPerContract} | Max Gain: ${analysisResult.maxGainPerContract}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <a 
                  href={generateClaudeUrl('My question:')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.75rem',
                    background: '#00c8c8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  💬 Ask a Question
                </a>
                
                <a 
                  href={generateClaudeUrl('Should I take this trade or wait for a better setup?')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.75rem',
                    background: '#ff8c42',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  ⚡ Take This Trade or Wait?
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <a 
                  href={generateClaudeUrl('What if I pick a different strike price? How would that change the R/R?')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.75rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  🎯 Try Different Strike?
                </a>
                
                <a 
                  href={generateClaudeUrl('How do I manage this trade if it goes against me? What is my exit strategy?')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.75rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  🛑 Exit Strategy Help?
                </a>
              </div>
              <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Click any button to open Claude with your trade data pre-filled. Then type your specific question.</p>
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

function WhatIfSimulator({ analysisResult }) {
  const [simulatedPrice, setSimulatedPrice] = React.useState(analysisResult.lastClose);
  const [simulatedDaysLeft, setSimulatedDaysLeft] = React.useState(analysisResult.daysToExpiry);
  
  const delta = parseFloat(analysisResult.delta);
  const theta = parseFloat(analysisResult.theta);
  const currentPrice = analysisResult.lastClose;
  const optionPrice = analysisResult.optionPrice;
  
  const priceMove = simulatedPrice - currentPrice;
  const daysDecayed = analysisResult.daysToExpiry - simulatedDaysLeft;
  
  const deltaGain = delta * priceMove;
  const thetaLoss = theta * daysDecayed;
  const expectedGain = deltaGain + thetaLoss;
  const newOptionPrice = optionPrice + expectedGain;
  const profitLoss = newOptionPrice - optionPrice;
  const profitLossPercent = ((profitLoss / optionPrice) * 100).toFixed(1);
  
  const isProfit = profitLoss > 0;
  
  return (
    <div style={{ background: '#f0f9ff', border: '2px solid #00c8c8', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#1e40af' }}>Slide to simulate different stock prices and dates to see expected returns using Delta & Theta:</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e40af' }}>Stock Price Target ($)</label>
          <input 
            type="range" 
            value={simulatedPrice} 
            onChange={(e) => setSimulatedPrice(parseFloat(e.target.value))}
            min={currentPrice * 0.9}
            max={currentPrice * 1.1}
            step="0.5"
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem' }}>
            <span style={{ color: '#00c8c8' }}>${simulatedPrice.toFixed(2)}</span>
            <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>({priceMove > 0 ? '+' : ''}${priceMove.toFixed(2)})</span>
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e40af' }}>Days Remaining</label>
          <input 
            type="range" 
            value={simulatedDaysLeft} 
            onChange={(e) => setSimulatedDaysLeft(parseInt(e.target.value))}
            min="0"
            max={analysisResult.daysToExpiry}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.5rem' }}>
            <span style={{ color: '#ef4444' }}>{simulatedDaysLeft} days</span>
            <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>({daysDecayed} decayed)</span>
          </div>
        </div>
      </div>
      
      <div style={{ background: isProfit ? '#ecfdf5' : '#fef2f2', border: `2px solid ${isProfit ? '#10b981' : '#ef4444'}`, borderRadius: '8px', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>DELTA GAIN</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: deltaGain >= 0 ? '#10b981' : '#ef4444' }}>
              ${deltaGain.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>δ {delta.toFixed(2)} × ${priceMove.toFixed(2)}</div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>THETA LOSS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: thetaLoss >= 0 ? '#10b981' : '#ef4444' }}>
              ${thetaLoss.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>θ {theta.toFixed(4)} × {daysDecayed}d</div>
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${isProfit ? '#86efac' : '#fca5a5'}`, borderRadius: '6px', padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>Option Price</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#374151' }}>${newOptionPrice.toFixed(2)}</div>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>was ${optionPrice}</div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>P&L</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isProfit ? '#10b981' : '#ef4444' }}>
              {isProfit ? '+' : ''}{profitLoss.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{isProfit ? '+' : ''}{profitLossPercent}%</div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>ROI</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isProfit ? '#10b981' : '#ef4444' }}>
              {isProfit ? '+' : ''}{profitLossPercent}%
            </div>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>1 contract</div>
          </div>
        </div>
      </div>
    </div>
  );
}
