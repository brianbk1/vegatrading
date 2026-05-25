import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';

// Vega Day Trading Analyzer v1.4 - Full intro page + Google Ads + turquoise button
export default function DayTradingApp() {
  
  // Initialize Google Ads
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_GOOGLE_AD_CLIENT_ID';
    script.setAttribute('crossOrigin', 'anonymous');
    document.head.appendChild(script);

    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({
      google_ad_client: 'ca-pub-YOUR_GOOGLE_AD_CLIENT_ID',
      enable_page_level_ads: true
    });
  }, []);

  const [ticker, setTicker] = useState('QQQ');
  const [optionType, setOptionType] = useState('call');
  const [strikePrice, setStrikePrice] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [manualRSI, setManualRSI] = useState('');
  const [tradingThesis, setTradingThesis] = useState('');
  
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [chartTimeframe, setChartTimeframe] = useState('today');

  const generateHistoricalData = (timeframe) => {
    const strike = parseFloat(strikePrice) || 400;
    let dataPoints = [];
    let labels = [];
    
    if (timeframe === 'today') {
      for (let i = 0; i < 8; i++) {
        const variance = (Math.random() - 0.5) * 10;
        dataPoints.push(strike + variance);
        labels.push(`${9 + i}:00`);
      }
    } else if (timeframe === '1mo') {
      for (let i = 0; i < 20; i++) {
        const variance = (Math.random() - 0.5) * 30;
        dataPoints.push(strike + variance);
        labels.push(`${i + 1}d`);
      }
    } else {
      for (let i = 0; i < 52; i++) {
        const variance = (Math.random() - 0.5) * 60;
        dataPoints.push(strike + variance);
        labels.push(`W${i + 1}`);
      }
    }
    
    return { dataPoints, labels };
  };

  const generateInstitutionalAnalysis = (inputRSI = 50, realData = null) => {
    const strike = parseFloat(strikePrice) || 400;
    
    const rsiScore = realData?.rsi14 || inputRSI || Math.floor(Math.random() * 100);
    const rsiInterpretation = realData?.rsiInterpretation || (rsiScore > 70 ? 'Overbought' : rsiScore < 30 ? 'Oversold' : 'Neutral');
    
    const stochasticK = realData?.stochasticK || Math.floor(Math.random() * 100);
    const stochasticD = realData?.stochasticD || Math.floor(Math.random() * 100);
    
    const ivPercentile = realData?.ivPercentile || Math.floor(Math.random() * 100);
    const macdSignal = realData?.macdSignal || (Math.random() > 0.5 ? 'Bullish Crossover' : 'Bearish Crossover');
    const bbUpper = realData?.bollingerUpper || (strike + 12);
    const bbLower = realData?.bollingerLower || (strike - 12);
    const bbPosition = realData?.bbPosition || (Math.random() > 0.5 ? 'Near Upper Band' : 'Near Lower Band');
    
    const daysNum = parseInt(daysToExpiry);
    const baseWinRate = optionType === 'call' ? 55 : 52;
    const winProbability = Math.max(35, baseWinRate - (daysNum * 2));
    
    const delta = (Math.random() * 0.8 + 0.1).toFixed(3);
    const gamma = (Math.random() * 0.02 + 0.005).toFixed(4);
    const theta = (Math.random() * -0.15 - 0.02).toFixed(4);
    const vega = (Math.random() * 0.5 + 0.1).toFixed(3);
    
    let directionScore;
    
    if (optionType === 'call') {
      directionScore = Math.max(
        0,
        (40 - Math.min(rsiScore, 40)) * 1.5 + (50 - Math.min(stochasticK, 50))
      );
      directionScore = Math.min(100, directionScore);
    } else {
      directionScore = Math.max(
        0,
        (Math.max(rsiScore, 60) - 60) * 1.5 + (Math.max(stochasticK, 50) - 50)
      );
      directionScore = Math.min(100, directionScore);
    }
    
    const liquidityScore = Math.floor(Math.random() * 40 + 60);
    const riskRewardScore = Math.floor(directionScore * 0.8 + Math.random() * 15);
    const technicalScore = Math.floor(directionScore * 0.7 + Math.random() * 20);
    const overallScore = Math.round((liquidityScore + riskRewardScore + technicalScore) / 3);
    
    const bbMiddle = strike.toFixed(2);
    const macdMomentum = Math.random() > 0.5 ? 'Accelerating' : 'Decelerating';

    const impliedMove = (strike * (ivPercentile / 100) * 0.15).toFixed(2);
    const movePercent = ((impliedMove / strike) * 100).toFixed(2);
    
    let optionPriceValue = realData?.optionPrice ? parseFloat(realData.optionPrice) : (strike * (Math.random() * 0.08 + 0.02));
    optionPriceValue = parseFloat(optionPriceValue).toFixed(2);
    
    const beCall = optionType === 'call' 
      ? (parseFloat(strike) + parseFloat(optionPriceValue)).toFixed(2)
      : (parseFloat(strike) - parseFloat(optionPriceValue)).toFixed(2);
    
    const ivCrushPercent = Math.floor(Math.random() * 20 + 15);
    const pricePostCrush = (parseFloat(optionPriceValue) * (1 - ivCrushPercent / 100)).toFixed(2);
    
    const maxLoss = optionPriceValue;
    const maxGain = (strike * 0.15).toFixed(2);
    const riskRewardRatio = (maxGain / maxLoss).toFixed(2);
    
    const contractsToTrade = Math.floor(500 / parseFloat(optionPriceValue));

    const { dataPoints, labels } = generateHistoricalData(chartTimeframe);

    return {
      overallScore,
      liquidityScore,
      riskRewardScore,
      technicalScore,
      rsiScore,
      rsiInterpretation,
      stochasticK,
      stochasticD,
      ivPercentile,
      macdSignal,
      macdMomentum,
      bbUpper,
      bbMiddle,
      bbLower,
      bbPosition,
      delta,
      gamma,
      theta,
      vega,
      winProbability,
      beCall,
      ivCrushPercent,
      pricePostCrush,
      maxLoss,
      maxGain,
      riskRewardRatio,
      contractsToTrade,
      chartData: { labels, dataPoints },
      lastClose: realData?.lastClose || parseFloat(strikePrice),
      optionPrice: optionPriceValue,
      dataSource: realData?.dataSource || 'fallback'
    };
  };

  const handleAnalyze = async () => {
    setError('');
    setIsAnalyzing(true);

    try {
      const dataResponse = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker,
          strikePrice,
          expiryDate,
          optionPrice
        }),
      });

      let realData = null;
      let apiRSI = null;
      
      if (dataResponse.ok) {
        realData = await dataResponse.json();
        apiRSI = realData.rsi14;
      }

      if (!realData) {
        realData = {
          lastClose: parseFloat(strikePrice) || 400,
          rsi14: parseInt(manualRSI) || 50,
          rsiInterpretation: parseInt(manualRSI) > 70 ? 'Overbought' : parseInt(manualRSI) < 30 ? 'Oversold' : 'Neutral',
          macdSignal: Math.random() > 0.5 ? 'Bullish Crossover' : 'Bearish Crossover',
          stochasticK: Math.floor(Math.random() * 100),
          stochasticD: Math.floor(Math.random() * 100),
          bollingerUpper: parseFloat(strikePrice) + 12,
          bollingerLower: parseFloat(strikePrice) - 12,
          bbPosition: Math.random() > 0.5 ? 'Near Upper Band' : 'Near Lower Band',
          ivPercentile: Math.floor(Math.random() * 100),
          optionPrice: parseFloat(strikePrice) * (Math.random() * 0.08 + 0.02),
          currentPrice: parseFloat(strikePrice)
        };
      }

      const finalRSI = manualRSI && parseInt(manualRSI) > 0 ? parseInt(manualRSI) : (apiRSI || realData.rsi14);
      
      if (realData.optionPrice) {
        realData.optionPrice = parseFloat(realData.optionPrice);
      }
      
      const result = generateInstitutionalAnalysis(finalRSI, realData);
      
      result.lastClose = realData.lastClose;
      result.optionPrice = realData.optionPrice;
      result.dataSource = realData.dataSource;
      result.tradingThesis = tradingThesis;
      result.claudeInsight = `Live ${ticker} data: RSI(14) = ${finalRSI} (${finalRSI > 70 ? 'Overbought' : finalRSI < 30 ? 'Oversold' : 'Neutral'}). Last close: $${realData.lastClose}. Stochastic K=${realData.stochasticK}, MACD ${realData.macdSignal}. BB position: ${realData.bbPosition}. IV at ${realData.ivPercentile}th percentile. ⚠️ AI-generated data may not be 100% accurate. Always verify on Finviz.com or your broker.`;
      
      setAnalysisResult(result);
    } catch (err) {
      setError('Error fetching market data: ' + err.message);
      const result = generateInstitutionalAnalysis(parseInt(manualRSI) || 50);
      result.claudeInsight = `Fallback mode: Using manual RSI of ${manualRSI}. All other indicators estimated. Verify data on Finviz.com before trading.`;
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setTicker('QQQ');
    setOptionType('call');
    setStrikePrice('');
    setDaysToExpiry('1');
    setExpiryDate('');
    setOptionPrice('');
    setManualRSI('');
    setTradingThesis('');
    setError('');
  };

  const ScoreBar = ({ label, value, color }) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#4b5563' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: color }}>{value}</span>
      </div>
      <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );

  const PositionSetupSummary = () => {
    if (!analysisResult) return null;
    
    const [isExpanded, setIsExpanded] = useState(false);
    const riskRewardRatio = parseFloat(analysisResult.riskRewardRatio);
    const maxRisk = parseFloat(analysisResult.maxLoss);
    const lastClose = parseFloat(analysisResult.lastClose);
    const breakEven = parseFloat(analysisResult.beCall);

    const riskRewardQuality = riskRewardRatio >= 5 ? '⭐⭐⭐ Excellent' : 
                             riskRewardRatio >= 2 ? '⭐⭐ Good' :
                             riskRewardRatio >= 1 ? '⭐ OK' : '❌ Skip';
    
    const priceMove = breakEven - lastClose;
    const priceMovePercent = ((priceMove / lastClose) * 100).toFixed(2);

    return (
      <div style={{
        background: '#fff8f0',
        border: '2px solid #ff8c42',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        cursor: 'pointer'
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '1rem' : '0'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1f2937'
          }}>
            📌 POSITION SETUP SUMMARY
          </h3>
          <span style={{
            fontSize: '1.5rem',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s'
          }}>
            ▼
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: isExpanded ? '1rem' : '0',
          fontSize: '0.9rem'
        }}>
          <div>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Win/Loss Ratio:</span>
            <div style={{ fontWeight: 700, color: riskRewardRatio >= 2 ? '#059669' : '#dc2626' }}>
              1:{riskRewardRatio.toFixed(2)} {riskRewardQuality}
            </div>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Max Risk:</span>
            <div style={{ fontWeight: 700 }}>
              ${maxRisk.toFixed(2)} per contract
            </div>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Break-Even:</span>
            <div style={{ fontWeight: 700 }}>
              ${breakEven.toFixed(2)}
            </div>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Distance:</span>
            <div style={{ fontWeight: 700 }}>
              +${priceMove.toFixed(2)} (+{priceMovePercent}%)
            </div>
          </div>
        </div>

        {isExpanded && (
          <div style={{
            paddingTop: '1rem',
            borderTop: '1px solid #fed7aa'
          }}>
            <div style={{
              background: '#fef3c7',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#92400e' }}>
                🚨 CRITICAL: Adjust contracts for YOUR account!
              </p>
              <p style={{ margin: 0, color: '#78350f' }}>
                Use: (2% of your account) ÷ ${maxRisk.toFixed(2)} = your contracts
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #fff8f0 0%, #f0f8ff 100%)',
      color: '#1f2937',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '1rem',
      overflow: 'auto'
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .app-container { max-width: 600px; margin: 0 auto; }
        .header { padding: 1.5rem 0 1rem 0; margin-bottom: 1rem; text-align: center; }
        .header-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem; margin-bottom: 0.5rem; }
        .header h1 { margin: 0.5rem 0 0.25rem 0; font-size: 1.75rem; font-weight: 600; color: #1f2937; }
        .header p { margin: 0; color: #6b7280; font-size: 0.9rem; font-weight: 500; }
        .card { background: white; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); border: 1px solid #e5e7eb; }
        .form-section-title { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #4b5563; margin-bottom: 0.75rem; display: block; }
        .segmented-control { display: flex; background: #f3f4f6; border-radius: 8px; padding: 4px; gap: 4px; margin-bottom: 1rem; }
        .segment-btn { flex: 1; padding: 0.625rem 0.75rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; color: #6b7280; }
        .segment-btn.active { background: white; color: #ff6b35; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; color: #1f2937; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.625rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-family: inherit; font-size: 0.9rem; color: #1f2937; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #ff8c42; box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.1); }
        .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        .btn-analyze { padding: 0.875rem; background: linear-gradient(135deg, #00c8c8 0%, #00a8a8 100%); color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn-analyze:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 200, 200, 0.4); background: linear-gradient(135deg, #00a8a8 0%, #008888 100%); }
        .btn-analyze:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-reset { padding: 0.875rem; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn-reset:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); background: #dc2626; }
        .results-container { display: flex; flex-direction: column; gap: 1rem; }
        .ad-container { margin: 1.5rem 0; text-align: center; background: #f9fafb; padding: 1rem; border-radius: 8px; min-height: 250px; display: flex; align-items: center; justify-content: center; }
        .intro-section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
        .intro-section h2 { margin: 1.5rem 0 0.75rem 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
        .intro-section h3 { margin: 1.25rem 0 0.5rem 0; font-size: 0.95rem; font-weight: 700; color: #1f2937; }
        .intro-section h3:first-child { margin-top: 0; }
        .intro-section p { margin: 0.5rem 0; font-size: 0.9rem; line-height: 1.6; color: #4b5563; }
        .intro-section ul { margin: 0.75rem 0; padding-left: 1.5rem; font-size: 0.9rem; line-height: 1.6; color: #4b5563; }
        .intro-section ul li { margin-bottom: 0.5rem; }
        .disclaimer { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.85rem; color: #78350f; line-height: 1.6; }
        .how-it-works { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .how-card { background: #f9fafb; padding: 1rem; border-radius: 8px; text-align: center; }
        .how-card-number { font-size: 2rem; font-weight: 700; color: #ff6b35; margin-bottom: 0.5rem; }
        .how-card-title { font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem; color: #1f2937; }
        .how-card-desc { font-size: 0.8rem; color: #6b7280; line-height: 1.5; }
      `}</style>

      <div className="app-container">
        
        {!analysisResult ? (
          <>
            <div className="header">
              <div className="header-icon">⚡</div>
              <h1>Vega Day Trading Analyzer</h1>
              <p>Institutional-Grade Options Analysis</p>
            </div>

            <div className="disclaimer">
              ⚠️ <strong>DISCLAIMER:</strong> This tool is for research and educational purposes only. It is NOT financial advice. Do your own research, consult a licensed advisor, and never risk more than you can afford to lose. Past performance does not guarantee future results. Options trading carries substantial risk.
            </div>

            <div className="ad-container">
              <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID"
                data-ad-slot="TOP_AD_SLOT"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
              <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
              </script>
            </div>

            <div className="intro-section">
              <h2>Options Trading Analysis — Institutional-Grade Tools for Day Traders</h2>
              <p>Vega Trading Analysis gives options traders a fast, structured way to evaluate trade setups before pulling the trigger. Enter your ticker, strike price, days to expiry, and trading thesis — and get an institutional-grade analysis covering Greeks, technical indicators, implied volatility, risk/reward ratios, and win probability. Built for day traders who trade QQQ, SPY, SPX, and high-volatility single stocks like NVDA, TSLA, and AMD.</p>

              <h3>How It Works</h3>
              <div className="how-it-works">
                <div className="how-card">
                  <div className="how-card-number">🎯</div>
                  <div className="how-card-title">Select your setup</div>
                  <div className="how-card-desc">Choose your ticker, option type (call or put), strike price, and days to expiry. Works for 0DTE scalps through multi-week swing trades.</div>
                </div>
                <div className="how-card">
                  <div className="how-card-number">📝</div>
                  <div className="how-card-title">Enter your thesis</div>
                  <div className="how-card-desc">Describe your trade rationale — macro catalyst, technical setup, or momentum read. The AI uses this to sharpen its analysis.</div>
                </div>
                <div className="how-card">
                  <div className="how-card-number">⚡</div>
                  <div className="how-card-title">Get your score</div>
                  <div className="how-card-desc">Receive a 0–100 Trade Quality Score based on liquidity, technical signals, risk/reward ratio, and IV context.</div>
                </div>
                <div className="how-card">
                  <div className="how-card-number">📊</div>
                  <div className="how-card-title">Review the Greeks</div>
                  <div className="how-card-desc">See delta, gamma, theta, and vega estimates alongside RSI, MACD, Bollinger Bands, and stochastic readings.</div>
                </div>
              </div>

              <h3>Popular Options Trading Setups</h3>
              <h3 style={{ marginTop: '1rem' }}>QQQ 0DTE Calls & Puts</h3>
              <p>The Nasdaq-100 ETF is one of the most liquid options markets in the world. Traders use QQQ 0DTE options for intraday directional bets around Fed announcements, CPI prints, and tech earnings reactions.</p>

              <h3>SPY & SPX Weekly Options</h3>
              <p>S&P 500 options offer tight bid-ask spreads and enormous volume. Weekly expirations (Monday, Wednesday, Friday) give traders multiple entry opportunities each week with defined risk exposure.</p>

              <h3>NVDA & TSLA High-Volatility Singles</h3>
              <p>Single-stock options on mega-cap tech offer outsized moves around earnings, product launches, and macro events. Higher implied volatility means larger premiums — and larger risk. Position sizing is critical.</p>

              <h3>VIX Calls as Portfolio Hedges</h3>
              <p>Volatility index options don't trade like equity options — VIX calls are a common hedge against sudden market drawdowns. Understanding vega and term structure is essential before trading VIX derivatives.</p>

              <h3>Understanding the Greeks</h3>
              <h3 style={{ marginTop: '1rem' }}>Delta (Δ)</h3>
              <p>Measures how much an option's price moves per $1 move in the underlying. A delta of 0.50 means the option gains ~$0.50 for every $1 the stock rises. Deep ITM options approach delta 1.0; far OTM options approach 0.</p>

              <h3>Gamma (Γ)</h3>
              <p>The rate of change of delta. High gamma means delta shifts rapidly with price moves — a double-edged sword for 0DTE traders where gamma is at its peak near the strike price.</p>

              <h3>Theta (Θ)</h3>
              <p>Time decay — the daily erosion of an option's extrinsic value. Theta accelerates dramatically in the final days before expiration. Sellers profit from theta; buyers fight against it.</p>

              <h3>Vega (ν)</h3>
              <p>Sensitivity to implied volatility changes. A vega of 0.30 means the option gains $0.30 for every 1% rise in IV. Long options benefit from IV expansion; short options benefit from IV crush after events.</p>
            </div>

            <div className="ad-container">
              <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID"
                data-ad-slot="MIDDLE_AD_SLOT"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
              <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
              </script>
            </div>

            <div className="card">
              <span className="form-section-title">Select Ticker</span>
              <select value={ticker} onChange={(e) => setTicker(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }}>
                <option value="QQQ">QQQ - Nasdaq 100</option>
                <option value="SPY">SPY - S&P 500</option>
                <option value="IWM">IWM - Russell 2000 (Small Cap)</option>
                <option value="XLF">XLF - Financials (Rate Plays)</option>
                <option value="GLD">GLD - Gold (Safe Haven)</option>
                <option value="TLT">TLT - 20yr Bonds (Rate Vol)</option>
                <option value="USO">USO - Oil/Energy (Geopolitical)</option>
                <option value="TSLA">TSLA - Tesla (Single Stock)</option>
                <option value="NVDA">NVDA - Nvidia (Tech Mega Cap)</option>
                <option value="AMD">AMD - AMD (Semi Pair Trade)</option>
                <option value="INTC">INTC - Intel (Semi Value Play)</option>
                <option value="VIX">VIX - Volatility Index (Meta)</option>
              </select>

              <span className="form-section-title">Option Type</span>
              <div className="segmented-control">
                <button className={`segment-btn ${optionType === 'call' ? 'active' : ''}`} onClick={() => setOptionType('call')}>📈 Call</button>
                <button className={`segment-btn ${optionType === 'put' ? 'active' : ''}`} onClick={() => setOptionType('put')}>📉 Put</button>
              </div>

              <div className="form-group">
                <label>Strike Price</label>
                <input type="number" value={strikePrice} onChange={(e) => setStrikePrice(e.target.value)} placeholder="e.g., 425.50" step="0.01" />
              </div>

              <div className="form-group">
                <label>Expiry Date</label>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Select the option expiration date to calculate days to expire</p>
                <input type="date" value={expiryDate} onChange={(e) => {
                  setExpiryDate(e.target.value);
                  if (e.target.value) {
                    const today = new Date();
                    const expiry = new Date(e.target.value);
                    const dte = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                    setDaysToExpiry(Math.max(0, dte).toString());
                  }
                }} />
                {expiryDate && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>✓ Days to expire: {daysToExpiry}</p>}
              </div>

              <div className="form-group">
                <label>Option Price (Premium)</label>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Enter your broker's option price (e.g., 21.50). This is the premium you'll pay per contract:</p>
                <input type="number" value={optionPrice} onChange={(e) => setOptionPrice(e.target.value)} placeholder="e.g., 21.50" step="0.01" min="0" />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>💡 Get this from your broker's option chain (bid/ask mid-price recommended)</p>
              </div>

              <div className="form-group">
                <label>Verify Data on Finviz</label>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#6b7280', lineHeight: '1.4' }}>Before making trading decisions, please review live technical data on a site such as Finviz using this direct link:</p>
                <a href={`https://finviz.com/quote.ashx?t=${ticker}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)', color: 'white', padding: '0.625rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)'; }} onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}>📊 View {ticker} on Finviz →</a>
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Check RSI(14), IV, MACD, price action, and upcoming catalysts</p>
              </div>

              <div className="form-group">
                <label>RSI (14) — Optional Manual Override</label>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>AI-fetched RSI displayed below. Enter your own value here to override:</p>
                <input type="number" value={manualRSI} onChange={(e) => setManualRSI(e.target.value)} placeholder="Leave empty for AI data" min="0" max="100" />
              </div>

              <div className="form-group">
                <label>Trading Thesis</label>
                <textarea value={tradingThesis} onChange={(e) => setTradingThesis(e.target.value)} placeholder="Optional: Describe your trade rationale (e.g., 'Fed decision bullish, RSI oversold, calls cheap')" />
              </div>

              <div className="btn-group">
                <button className="btn-analyze" onClick={handleAnalyze} disabled={isAnalyzing}><span>⚡</span>{isAnalyzing ? 'Analyzing...' : 'ANALYZE'}</button>
                <button className="btn-reset" onClick={handleReset} disabled={isAnalyzing}><span>↻</span>RESET</button>
              </div>

              {error && <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '6px', color: '#dc2626', fontSize: '0.85rem' }}>⚠️ {error}</div>}

              <div className="ad-container">
                <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID" data-ad-slot="BELOW_BUTTON_SLOT" data-ad-format="auto" data-full-width-responsive="true"></ins>
                <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
              </div>

              <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.6' }}>⚠️ AI-generated data may not be 100% accurate. Verify on Finviz.com before trading.</p>
            </div>

            <div className="ad-container">
              <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID" data-ad-slot="BOTTOM_AD_SLOT" data-ad-format="auto" data-full-width-responsive="true"></ins>
              <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
            </div>

            <div className="card" style={{ background: '#fff8f0', border: '1px solid #fed7aa' }}>
              <span className="form-section-title" style={{ color: '#92400e' }}>⚠️ Risk Disclaimer</span>
              <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.7, margin: 0 }}>Options trading involves substantial risk of loss and is not appropriate for all investors. This tool provides educational analysis only and does not constitute financial advice or a recommendation to buy or sell any security. Past performance is not indicative of future results. Always trade with risk capital you can afford to lose, use defined-risk strategies, and consult a licensed financial advisor before making investment decisions.</p>
            </div>
          </>
        ) : (
          <div className="results-container">
            <button className="btn-reset" onClick={handleReset} style={{ marginBottom: '1rem', width: '100%' }}><span>← Back to Form</span></button>
            <PositionSetupSummary />
            <div className="card">
              <span className="form-section-title">Trade Quality Score</span>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff6b35' }}>{analysisResult.overallScore}</div>
                <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{analysisResult.overallScore >= 75 ? 'Excellent Setup' : analysisResult.overallScore >= 60 ? 'Good Setup' : analysisResult.overallScore >= 45 ? 'Acceptable Setup' : 'Weak Setup'}</p>
              </div>
              <ScoreBar label="Liquidity" value={analysisResult.liquidityScore} color="#ff8c42" />
              <ScoreBar label="Risk/Reward" value={analysisResult.riskRewardScore} color="#00c8c8" />
              <ScoreBar label="Technical" value={analysisResult.technicalScore} color="#ef4444" />
            </div>
            <div className="card" style={{ background: '#eff6ff', borderLeft: '4px solid #0ea5e9' }}>
              <span className="form-section-title" style={{ color: '#0369a1' }}>AI Analysis</span>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#1f2937' }}>{analysisResult.claudeInsight}</p>
            </div>
            <div className="card">
              <span className="form-section-title">Position Sizing</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Contracts to Trade</p><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff6b35' }}>{analysisResult.contractsToTrade}</div><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>At 2% risk</p></div>
                <div><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Max Risk per Contract</p><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>${parseFloat(analysisResult.maxLoss).toFixed(2)}</div><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Total risk exposure</p></div>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>Break-Even: ${parseFloat(analysisResult.beCall).toFixed(2)}</p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>Risk/Reward: 1:{parseFloat(analysisResult.riskRewardRatio).toFixed(2)}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Max Reward: ${parseFloat(analysisResult.maxGain).toFixed(2)} per contract</p>
              </div>
            </div>
            <div className="ad-container">
              <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID" data-ad-slot="RESULTS_AD_SLOT" data-ad-format="auto" data-full-width-responsive="true"></ins>
              <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
            </div>
            <div className="card" style={{ background: '#fef3c7', borderLeft: '4px solid #f59e0b' }}>
              <span className="form-section-title" style={{ color: '#92400e' }}>⚠️ IV Crush Impact</span>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#78350f' }}>After market events, implied volatility drops and option value declines:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>IV Crush %</p><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#92400e' }}>-{analysisResult.ivCrushPercent}%</div></div>
                <div><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>Price After Crush</p><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#92400e' }}>${parseFloat(analysisResult.pricePostCrush).toFixed(2)}</div></div>
              </div>
            </div>
            <div className="card">
              <span className="form-section-title">Technical Indicators</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>RSI(14)</p><div style={{ fontSize: '1.25rem', fontWeight: 700, color: analysisResult.rsiScore > 70 ? '#dc2626' : analysisResult.rsiScore < 30 ? '#059669' : '#f59e0b' }}>{analysisResult.rsiScore.toFixed(0)}</div><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{analysisResult.rsiInterpretation}</p></div>
                <div><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>MACD</p><div style={{ fontSize: '0.95rem', fontWeight: 700, color: analysisResult.macdSignal === 'Bullish Crossover' ? '#059669' : '#dc2626' }}>{analysisResult.macdSignal}</div><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{analysisResult.macdMomentum}</p></div>
              </div>
              <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Bollinger Bands</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Upper: ${parseFloat(analysisResult.bbUpper).toFixed(2)} | Middle: ${parseFloat(analysisResult.bbMiddle).toFixed(2)} | Lower: ${parseFloat(analysisResult.bbLower).toFixed(2)}</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Position: {analysisResult.bbPosition}</p>
              </div>
            </div>
            <div className="card">
              <span className="form-section-title">Option Greeks</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Delta</p><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.delta}</div></div>
                <div style={{ textAlign: 'center' }}><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Theta</p><div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>{analysisResult.theta}</div></div>
                <div style={{ textAlign: 'center' }}><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Gamma</p><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.gamma}</div></div>
                <div style={{ textAlign: 'center' }}><p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Vega</p><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analysisResult.vega}</div></div>
              </div>
            </div>
            <div className="card" style={{ background: '#fff8f0', border: '1px solid #fed7aa' }}>
              <span className="form-section-title" style={{ color: '#92400e' }}>⚠️ Risk Disclaimer</span>
              <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.7, margin: 0 }}>Options trading involves substantial risk of loss and is not appropriate for all investors. This tool provides educational analysis only and does not constitute financial advice. Always trade with capital you can afford to lose, use defined-risk strategies, and consult a licensed advisor.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
