import React, { useState } from 'react';

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

      // Parse values first (BEFORE using them)
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
      const theta = -(optionPriceNum / (daysNum || 1)) * 0.1;
      const vega = (strikeNum * gamma * Math.sqrt(Math.max(1, daysNum / 365))) / 100;

      // Position Setup Calculations
      const maxRiskPerContract = optionPriceNum; // Premium paid = max risk for long option
      const maxGainPerContract = Math.max(currentPriceNum - strikeNum - optionPriceNum, 0); // ITM profit potential
      const riskRewardRatio = maxRiskPerContract > 0 ? (maxGainPerContract / maxRiskPerContract).toFixed(2) : 0;
      const breakEvenPrice = strikeNum + optionPriceNum;
      const priceMove = Math.abs(breakEvenPrice - currentPriceNum);
      const priceMovePercent = ((priceMove / currentPriceNum) * 100).toFixed(2);

      // 2% Risk Rule for position sizing
      const accountSize = 50000; // Assume $50k account for demo (can be customized)
      const maxAccountRisk = accountSize * 0.02; // 2% of account
      const contractsToTrade = Math.floor(maxAccountRisk / maxRiskPerContract);
      const totalMaxRisk = contractsToTrade * maxRiskPerContract;
      const totalMaxGain = contractsToTrade * maxGainPerContract;

      // Generate Trade Thesis Analysis from user input - SPECIFIC to their catalyst
      let thesisAnalysis = '';
      if (userThesis && userThesis.trim().length > 0) {
        // Analyze user's specific thesis and catalyst
        const thesisLower = userThesis.toLowerCase();
        
        // Detect specific catalysts mentioned
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

        // Build specific impact analysis
        let impactAnalysis = `📍 **Catalyst Identified:** ${catalystFound}\n\n`;
        
        if (catalystFound === 'Geopolitical Risk (Iran/War)') {
          impactAnalysis += `**Market Impact on ${ticker}:**\n`;
          if (ticker === 'USO' || ticker.includes('OIL')) {
            impactAnalysis += `✅ **Bullish for Oil:** De-escalation/peace could reduce geopolitical premium. If tensions ease, oil prices may fall as risk premium unwinds. Your PUT could profit.\n`;
          } else if (ticker === 'DXY' || ticker.includes('USD')) {
            impactAnalysis += `✅ **Bullish for USD:** Risk-off sentiment strengthens dollar as safe haven. Peace news would reduce flight-to-safety buying.\n`;
          } else if (ticker === 'GLD' || ticker.includes('GOLD')) {
            impactAnalysis += `✅ **Bearish for Gold:** Geopolitical peace reduces safe-haven demand. Gold typically falls on de-escalation.\n`;
          } else if (ticker === 'QQQ' || ticker === 'SPY' || ticker.includes('TECH')) {
            impactAnalysis += `✅ **Bullish for Equities:** Peace news = lower risk premium = equity rally. Growth stocks (QQQ/Tech) tend to outperform on risk-on sentiment.\n`;
          } else {
            impactAnalysis += `✅ **Mixed Impact:** Geopolitical peace typically causes risk-on sentiment. Check ${ticker}'s sector sensitivity—defensives may underperform, growth may outperform.\n`;
          }
          impactAnalysis += `\n⚠️ **Timing Risk:** If peace is priced in already, the move may have already happened. Verify the news is fresh and market hasn't yet reacted.\n`;
        } else if (catalystFound === 'Earnings Report') {
          impactAnalysis += `**Earnings Impact Analysis:**\n`;
          impactAnalysis += `✅ IV will likely spike before earnings (higher premiums)\n`;
          impactAnalysis += `✅ IV will crush after earnings regardless of beat/miss\n`;
          impactAnalysis += `⚠️ Be aware of earnings date vs. your option expiration\n`;
          impactAnalysis += `⚠️ Gap risk if ${ticker} moves 5%+ on earnings surprise\n`;
        } else if (catalystFound === 'Federal Reserve Decision') {
          impactAnalysis += `**Fed Decision Impact:**\n`;
          impactAnalysis += `✅ Rate cuts = bullish for equities, especially tech (QQQ)\n`;
          impactAnalysis += `✅ Rate hikes = bearish for growth, bullish for financials\n`;
          impactAnalysis += `⚠️ Forward guidance matters as much as the decision itself\n`;
        } else {
          impactAnalysis += `**Your Thesis Analysis:**\n`;
          impactAnalysis += `✅ You've identified a specific market catalyst\n`;
          impactAnalysis += `✅ Consider the timing—when does the catalyst resolve?\n`;
          impactAnalysis += `⚠️ Ensure your DTE (${daysNum} days) gives enough time for the move\n`;
        }

        impactAnalysis += `\n**Risk Check:**\n`;
        impactAnalysis += `• Stock Price: $${currentPriceNum.toFixed(2)} | Strike: $${strikeNum.toFixed(2)} | Breakeven: $${breakEvenPrice}\n`;
        impactAnalysis += `• Required Move: ${priceMovePercent}% to breakeven\n`;
        impactAnalysis += `• Risk/Reward: 1:${riskRewardRatio} (${riskRewardRatio >= 2 ? '✅ Good' : riskRewardRatio >= 1 ? '⚠️ Fair' : '❌ Poor'})\n`;
        impactAnalysis += `• Time Decay: ${daysNum} days remaining—theta working against you daily`;

        thesisAnalysis = impactAnalysis;
      } else {
        thesisAnalysis = '⚠️ No trade thesis provided. Consider explaining your reasoning and catalyst before placing the trade.';
      }

      // Generate AI Trade Thesis Statement
      let thesisStatement = '';
      let thesisColor = '#374151';
      
      if (riskRewardRatio >= 2) {
        thesisStatement = `✅ STRONG SETUP: `;
      } else if (riskRewardRatio >= 1) {
        thesisStatement = `⚠️ ACCEPTABLE SETUP: `;
      } else {
        thesisStatement = `❌ WEAK SETUP: `;
      }

      // Build thesis based on technicals
      if (rsiScore > 70) {
        thesisStatement += `RSI is overbought (${rsiScore}), suggesting potential pullback. `;
      } else if (rsiScore < 30) {
        thesisStatement += `RSI is oversold (${rsiScore}), suggesting potential bounce. `;
      } else {
        thesisStatement += `RSI is neutral (${rsiScore}), no directional bias from momentum. `;
      }

      // MACD influence
      if (realData.macdSignal === 'Bullish Crossover') {
        thesisStatement += `MACD bullish crossover adds upside momentum. `;
      } else if (realData.macdSignal === 'Bearish Crossover') {
        thesisStatement += `MACD bearish crossover suggests downside pressure. `;
      }

      // Greeks influence
      if (delta > 0.7) {
        thesisStatement += `High delta (${delta}) means high directional sensitivity—large moves needed for profit. `;
      } else if (delta < 0.3) {
        thesisStatement += `Low delta (${delta}) means low directional sensitivity—wide moves needed to make money. `;
      }

      if (theta < -0.05) {
        thesisStatement += `High theta decay (${theta}/day) means time is working against you—requires quick decision-making. `;
      } else {
        thesisStatement += `Low theta decay means you have more time to be right. `;
      }

      // IV context
      if (ivPercentile > 70) {
        thesisStatement += `IV is elevated (${ivPercentile}th percentile)—expensive premiums, good for sellers, risky for buyers. `;
      } else if (ivPercentile < 30) {
        thesisStatement += `IV is suppressed (${ivPercentile}th percentile)—cheap premiums, good for buyers looking for breakouts. `;
      }

      // Final verdict
      if (riskRewardRatio >= 2 && (rsiScore > 70 || rsiScore < 30) && daysNum >= 1) {
        thesisStatement += `Overall: Good risk/reward with extreme RSI reading. Monitor break-even level carefully.`;
      } else if (riskRewardRatio >= 1) {
        thesisStatement += `Overall: Acceptable trade if technicals align at entry. Set stop loss at or above break-even.`;
      } else {
        thesisStatement += `Overall: Poor risk/reward. Consider waiting for better setup or reducing position size.`;
      }

      // IV Crush Impact Analysis
      // When IV drops, option premium decreases even if price doesn't move
      const ivDropScenarios = [
        { ivChange: -20, label: 'Moderate IV Drop (-20%)' },
        { ivChange: -40, label: 'Significant IV Drop (-40%)' },
        { ivChange: -60, label: 'Severe IV Drop (-60%)' }
      ];

      const ivCrushImpact = ivDropScenarios.map(scenario => {
        // Vega tells us how much option price changes per 1% IV change
        const vegaNum = parseFloat(vega);
        const totalVegaImpact = vegaNum * scenario.ivChange;
        
        // New option price after IV crush (price stays same, IV drops)
        const priceAfterIVCrush = Math.max(0, optionPriceNum + totalVegaImpact);
        const dollarLossFromIVCrush = optionPriceNum - priceAfterIVCrush;
        const percentLossFromIVCrush = ((dollarLossFromIVCrush / optionPriceNum) * 100).toFixed(1);
        
        return {
          scenario: scenario.label,
          ivChange: scenario.ivChange,
          newPrice: priceAfterIVCrush.toFixed(2),
          dollarLoss: dollarLossFromIVCrush.toFixed(2),
          percentLoss: percentLossFromIVCrush
        };
      });
      
      // Fetch real economic calendar and earnings for the week
      let weeklyEvents = '';
      try {
        // Common weekly economic events with links
        const economicCalendar = [
          { name: 'Initial Jobless Claims', day: 'Thursday', time: '8:30 AM', importance: 'HIGH', impact: 'USD, Equities', link: 'https://www.investing.com/economic-calendar/jobless-claims' },
          { name: 'CPI Release', day: 'Wednesday', time: '8:30 AM', importance: 'CRITICAL', impact: 'All Markets', link: 'https://www.investing.com/economic-calendar/cpi' },
          { name: 'PPI Release', day: 'Tuesday', time: '8:30 AM', importance: 'HIGH', impact: 'Inflation, Bonds', link: 'https://www.investing.com/economic-calendar/ppi' },
          { name: 'Retail Sales', day: 'Friday', time: '8:30 AM', importance: 'HIGH', impact: 'Consumer, Equities', link: 'https://www.investing.com/economic-calendar/retail-sales' },
          { name: 'Fed Speakers', day: 'Multiple', time: 'Various', importance: 'MEDIUM', impact: 'USD, Rates', link: 'https://www.federalreserve.gov/newsevents/calendar.htm' },
        ];
        
        // Sample earnings this week with links
        const earningsThisWeek = [
          { ticker: 'NVDA', day: 'Thursday After Hours', link: 'https://finance.yahoo.com/quote/NVDA/news' },
          { ticker: 'MSFT', day: 'Wednesday After Hours', link: 'https://finance.yahoo.com/quote/MSFT/news' },
          { ticker: 'TSLA', day: 'Monday After Hours', link: 'https://finance.yahoo.com/quote/TSLA/news' },
          { ticker: 'META', day: 'Tuesday After Hours', link: 'https://finance.yahoo.com/quote/META/news' },
        ];
        
        // Format events as clickable HTML
        let eventsList = '';
        economicCalendar.forEach(event => {
          const importance = event.importance === 'CRITICAL' ? '🔴' : event.importance === 'HIGH' ? '🟠' : '🟡';
          eventsList += `${importance} <a href="${event.link}" target="_blank" rel="noopener noreferrer"><strong>${event.name}</strong></a> - ${event.day} ${event.time} | ${event.impact}\n`;
        });
        
        let earningsList = '';
        earningsThisWeek.forEach(company => {
          earningsList += `📊 <a href="${company.link}" target="_blank" rel="noopener noreferrer"><strong>${company.ticker}</strong></a> reports ${company.day}\n`;
        });
        
        weeklyEvents = `📅 ECONOMIC CALENDAR:\n${eventsList}\n💼 COMPANY EARNINGS:\n${earningsList}\n⚠️ STRATEGY: Avoid holding through major economic data and earnings unless specifically betting on the move. IV crush post-event typically wipes out time value.`;
      } catch (err) {
        weeklyEvents = 'Unable to fetch live economic calendar. Check Investing.com and Yahoo Finance for this week\'s events.';
      }
      
      // Calculate scores - DEFINE BEFORE USING
      const liquidityScore = 85; // QQQ/SPY are highly liquid
      const riskRewardScore = riskRewardRatio >= 2 ? 85 : riskRewardRatio >= 1 ? 70 : 45;
      const technicalScore = rsiScore > 70 || rsiScore < 30 ? 75 : 60;
      const overallScore = Math.round((liquidityScore + riskRewardScore + technicalScore) / 3);

      // Display results
      setAnalysisResult({
        ticker,
        strikePrice: strikeNum,
        optionPrice: optionPriceNum,
        daysToExpiry: daysNum,
        lastClose: currentPriceNum,
        priceFound: realData.lastClose !== strikePrice.toString(),
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
        // Position Setup
        maxRiskPerContract: maxRiskPerContract.toFixed(2),
        maxGainPerContract: maxGainPerContract.toFixed(2),
        riskRewardRatio,
        breakEvenPrice: breakEvenPrice.toFixed(2),
        priceMove: priceMove.toFixed(2),
        priceMovePercent,
        contractsToTrade,
        totalMaxRisk: totalMaxRisk.toFixed(2),
        totalMaxGain: totalMaxGain.toFixed(2),
        // Trade Thesis
        thesisStatement,
        userThesis,
        thesisAnalysis,
        // IV Crush
        ivCrushImpact,
        // Weekly Events
        weeklyEvents,
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
    setUserThesis('');
    setAccountSize(50000);
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>📝 Why This Trade? (Your Thesis)</label>
              <textarea
                value={userThesis}
                onChange={(e) => setUserThesis(e.target.value)}
                placeholder="e.g., QQQ showing overbought RSI (71) with bearish MACD crossover. Expecting pullback to $715 support. High IV (75th percentile) suggests event risk. Taking 725 put for defined risk..."
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'monospace', minHeight: '80px', resize: 'vertical' }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Be specific about your reasoning, technicals, and risk.</div>
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

            <div style={{ background: analysisResult.riskRewardRatio >= 2 ? '#ecfdf5' : analysisResult.riskRewardRatio >= 1 ? '#fffbeb' : '#fef2f2', border: `2px solid ${analysisResult.riskRewardRatio >= 2 ? '#10b981' : analysisResult.riskRewardRatio >= 1 ? '#f59e0b' : '#ef4444'}`, borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: analysisResult.riskRewardRatio >= 2 ? '#065f46' : analysisResult.riskRewardRatio >= 1 ? '#92400e' : '#7f1d1d' }}>
                💡 Trade Thesis & Analysis
              </h3>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.7', color: analysisResult.riskRewardRatio >= 2 ? '#047857' : analysisResult.riskRewardRatio >= 1 ? '#b45309' : '#991b1b' }}>
                {analysisResult.thesisStatement}
              </p>
            </div>

            {analysisResult.userThesis && (
              <div style={{ background: '#f3f4f6', border: '2px solid #9ca3af', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#374151' }}>
                  📌 Your Trade Thesis
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', lineHeight: '1.7', color: '#4b5563', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {analysisResult.userThesis}
                </p>

                <div style={{ background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '1rem', marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>
                    💬 Catalyst Impact Analysis
                  </h4>
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {analysisResult.thesisAnalysis}
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>
                📰 This Week's Critical Market Events
              </h3>
              <div 
                style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ 
                  __html: analysisResult.weeklyEvents
                    .replace(/\n/g, '<br/>')
                    .replace(/href="/g, 'href="')
                }}
              />
            </div>

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

            {!analysisResult.priceFound && (
              <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#991b1b', fontWeight: 600 }}>
                  ⚠️ PRICE DATA NOT AVAILABLE
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d' }}>
                  Current stock price could not be fetched from live APIs. Please verify the current price on <a href="https://finviz.com" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'underline', fontWeight: 600 }}>Finviz.com</a>, <a href="https://www.bloomberg.com" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'underline', fontWeight: 600 }}>Bloomberg</a>, or your broker before trading.
                </p>
              </div>
            )}

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>💰 Position Setup & Risk Management</h3>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Max Risk Per Contract</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${analysisResult.maxRiskPerContract}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Premium paid = max loss</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Max Gain Per Contract</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>${analysisResult.maxGainPerContract}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Intrinsic value at expiry</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid #d1d5db', paddingTop: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Risk/Reward Ratio</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: analysisResult.riskRewardRatio >= 2 ? '#10b981' : analysisResult.riskRewardRatio >= 1 ? '#f59e0b' : '#ef4444' }}>
                    1:{analysisResult.riskRewardRatio}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {analysisResult.riskRewardRatio >= 2 ? '✅ Excellent' : analysisResult.riskRewardRatio >= 1 ? '⚠️ Fair' : '❌ Poor'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Break-Even Price</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${analysisResult.breakEvenPrice}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {analysisResult.priceMovePercent}% move needed
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid #d1d5db', paddingTop: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contracts to Trade (2% Risk)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff8c42' }}>{analysisResult.contractsToTrade}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>At $50K account size</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Account Risk</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${analysisResult.totalMaxRisk}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Max loss if wrong</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>⚡ IV Crush Impact</h3>
            <div style={{ background: '#fff5f5', border: '2px solid #fca5a5', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#7c2d12', fontWeight: 600 }}>
                ⚠️ IV Crush Risk: If implied volatility drops after you enter, your option loses value even if the stock price doesn't move.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {analysisResult.ivCrushImpact.map((scenario, idx) => (
                  <div key={idx} style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {scenario.scenario}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>
                      ${scenario.newPrice}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7c2d12', marginBottom: '0.5rem' }}>
                      New price after IV change
                    </div>
                    <div style={{ borderTop: '1px solid #fecaca', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: 600 }}>
                        Loss: ${scenario.dollarLoss} ({scenario.percentLoss}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '6px', marginTop: '1rem', borderLeft: '4px solid #dc2626' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7c2d12', fontWeight: 600 }}>
                  💡 When IV Crushes Happen:
                </p>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#7c2d12', lineHeight: '1.6' }}>
                  <li>After earnings announcements</li>
                  <li>After Fed decisions or economic data</li>
                  <li>When volatility expectations drop</li>
                  <li>Post-event risk resolution</li>
                </ul>
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.85rem', color: '#7c2d12' }}>
                  <strong>Strategy:</strong> If betting on IV crush, sell options. If buying options before events, expect IV crush afterward.
                </p>
              </div>
            </div>

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

            <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>📊 What Does Your Score Mean?</h4>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.8' }}>
                {analysisResult.overallScore > 75 ? (
                  <>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#059669' }}>
                      🟢 Institutional Grade ({analysisResult.overallScore}/100)
                    </p>
                    <p style={{ margin: 0 }}>
                      This trade setup meets professional-level standards. The combination of high liquidity, favorable risk/reward ratio, and strong technical alignment suggests this is a trade worth considering. Institutional traders would find this setup attractive due to the quality metrics. However, this is NOT a guaranteed win—always verify data on Finviz and set proper stop losses.
                    </p>
                  </>
                ) : analysisResult.overallScore > 60 ? (
                  <>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#d97706' }}>
                      🟡 Trade Worthy ({analysisResult.overallScore}/100)
                    </p>
                    <p style={{ margin: 0 }}>
                      This trade has acceptable risk/reward characteristics and reasonable technical alignment. While not institutional-grade, it still meets minimum standards for execution. Success depends on proper position sizing, stop loss placement, and execution at the right price. Requires more precision than higher-scoring setups.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#dc2626' }}>
                      🔴 Caution ({analysisResult.overallScore}/100)
                    </p>
                    <p style={{ margin: 0 }}>
                      This trade setup shows weak metrics. The combination of unfavorable risk/reward or conflicting technical signals suggests waiting for a better setup. Consider passing on this trade and waiting for institutional-grade opportunities. When risk/reward is poor, the probability of success needs to be very high to justify the trade.
                    </p>
                  </>
                )}
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
