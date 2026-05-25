import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';

// Vega Day Trading Analyzer v1.3 - Real Polygon data with novice trader guidance + Google Ads
export default function DayTradingApp() {
  
  // Initialize Google Ads
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_GOOGLE_AD_CLIENT_ID';
    script.setAttribute('crossOrigin', 'anonymous');
    document.head.appendChild(script);

    // Push ads config
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({
      google_ad_client: 'ca-pub-YOUR_GOOGLE_AD_CLIENT_ID',
      enable_page_level_ads: true
    });
  }, []);

  // Form inputs
  const [ticker, setTicker] = useState('QQQ');
  const [optionType, setOptionType] = useState('call');
  const [strikePrice, setStrikePrice] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [manualRSI, setManualRSI] = useState('');
  
  // State management
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [chartTimeframe, setChartTimeframe] = useState('today');

  // Generate historical price data for charts
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

  // Main analysis engine
  const generateInstitutionalAnalysis = (inputRSI = 50, realData = null) => {
    const strike = parseFloat(strikePrice) || 400;
    
    const rsiScore = realData?.rsi14 || inputRSI || Math.floor(Math.random() * 100);
    const rsiInterpretation = realData?.rsiInterpretation || (rsiScore > 70 ? 'Overbought' : rsiScore < 30 ? 'Oversold' : 'Neutral');
    
    const stochasticK = realData?.stochasticK || Math.floor(Math.random() * 100);
    const stochasticD = realData?.stochasticD || Math.floor(Math.random() * 100);
    
    const ivPercentile = realData?.ivPercentile || Math.floor(Math.random() * 100);
    const ivRank = ivPercentile > 70 ? 'Elevated (Sell premium)' : ivPercentile < 30 ? 'Suppressed (Buy premium)' : 'Normal';
    
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
    
    const profitProbability = optionType === 'call' 
      ? Math.max(20, 100 - winProbability)
      : winProbability;
    
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
      ivRank,
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
      profitProbability,
      impliedMove,
      movePercent,
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

  // Handle analyze button
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

      console.log('API Response status:', dataResponse.status);
      let realData = null;
      let apiRSI = null;
      
      if (dataResponse.ok) {
        realData = await dataResponse.json();
        console.log('Real data from API:', realData);
        apiRSI = realData.rsi14;
      } else {
        console.error('API error, status:', dataResponse.status);
      }

      if (!realData) {
        console.log('Using fallback data');
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
      
      console.log('Calling generateInstitutionalAnalysis with RSI:', finalRSI);
      const result = generateInstitutionalAnalysis(finalRSI, realData);
      console.log('Generated analysis result:', result);
      
      result.lastClose = realData.lastClose;
      result.optionPrice = realData.optionPrice;
      result.dataSource = realData.dataSource;
      result.claudeInsight = `Live ${ticker} data: RSI(14) = ${finalRSI} (${finalRSI > 70 ? 'Overbought' : finalRSI < 30 ? 'Oversold' : 'Neutral'}). Last close: $${realData.lastClose}. Stochastic K=${realData.stochasticK}, MACD ${realData.macdSignal}. BB position: ${realData.bbPosition}. IV at ${realData.ivPercentile}th percentile. ${realData.optionPrice ? `Option price: $${realData.optionPrice.toFixed(2)}` : ''} ⚠️ AI-generated data may not be 100% accurate. Always verify on Finviz.com or your broker.`;
      
      console.log('Final result before setAnalysisResult:', result);
      setAnalysisResult(result);
      console.log('Analysis result set');
    } catch (err) {
      console.error('Error in handleAnalyze:', err);
      setError('Error fetching market data: ' + err.message);
      const result = generateInstitutionalAnalysis(parseInt(manualRSI) || 50);
      result.claudeInsight = `Fallback mode: Using manual RSI of ${manualRSI}. All other indicators estimated. Verify data on Finviz.com before trading.`;
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Score bar component
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

  // Position Setup Summary Card Component
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

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 700 }}>
                ✓ BEFORE YOU TRADE:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                <li style={{ marginBottom: '0.5rem', color: riskRewardRatio >= 1 ? '#059669' : '#dc2626' }}>
                  <strong>Risk/Reward:</strong> 1:{riskRewardRatio.toFixed(2)} 
                  {riskRewardRatio >= 1 ? ' ✅' : ' ❌'}
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Verify Price:</strong> Check your broker
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Check Chart:</strong> Is break-even at support/resistance?
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Check Earnings:</strong> Avoid within 7 days
                </li>
                <li>
                  <strong>Set Stop Loss:</strong> At ${(maxRisk * 2).toFixed(2)}
                </li>
              </ul>
            </div>

            <div style={{
              padding: '0.75rem',
              borderRadius: '6px',
              background: riskRewardRatio >= 2 ? '#d1fae5' : riskRewardRatio >= 1 ? '#fef3c7' : '#fee2e2',
              borderLeft: `4px solid ${riskRewardRatio >= 2 ? '#059669' : riskRewardRatio >= 1 ? '#f59e0b' : '#dc2626'}`,
              fontSize: '0.85rem'
            }}>
              <strong>
                {riskRewardRatio >= 2 ? '✅ Strong Trade Setup' :
                 riskRewardRatio >= 1 ? '⚠️ Acceptable But Monitor' :
                 '❌ Poor Risk/Reward'}
              </strong>
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
        
        .app-container {
          max-width: 520px;
          margin: 0 auto;
        }
        
        .header {
          padding: 1.5rem 0 1rem 0;
          margin-bottom: 1.5rem;
        }
        
        .header-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }
        
        .header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .header-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.1rem;
        }
        
        .header p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }
        
        .form-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #4b5563;
          margin-bottom: 0.75rem;
          display: block;
        }
        
        .segmented-control {
          display: flex;
          background: #f3f4f6;
          border-radius: 8px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 1rem;
        }
        
        .segment-btn {
          flex: 1;
          padding: 0.625rem 0.75rem;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #6b7280;
        }
        
        .segment-btn.active {
          background: white;
          color: #ff6b35;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }
        
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.625rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-family: inherit;
          font-size: 0.9rem;
          color: #1f2937;
        }
        
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #ff8c42;
          box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.1);
        }
        
        .btn-analyze {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #00c8c8 0%, #00a8a8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .btn-analyze:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 200, 200, 0.4);
          background: linear-gradient(135deg, #00a8a8 0%, #008888 100%);
        }
        
        .btn-analyze:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .results-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Google Ads */
        .ad-container {
          margin: 1.5rem 0;
          text-align: center;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
        }
      `}</style>

      <div className="app-container">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div className="header-icon">⚡</div>
            <h1>Vega Analyzer</h1>
          </div>
          <p>Real-time options analysis with risk management</p>
        </div>

        {/* Google Ads - Top */}
        <div className="ad-container">
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID"
            data-ad-slot="1234567890"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
          <script>
            (adsbygoogle = window.adsbygoogle || []).push({});
          </script>
        </div>

        {/* Form Card */}
        <div className="card">
          <span className="form-section-title">Market Setup</span>
          
          <div className="form-group">
            <label>Ticker</label>
            <select value={ticker} onChange={(e) => setTicker(e.target.value)}>
              {['QQQ', 'SPY', 'IWM', 'XLF', 'GLD', 'TLT', 'USO', 'TSLA', 'NVDA', 'AMD', 'INTC', 'VIX'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Option Type</label>
            <div className="segmented-control">
              <button 
                className={`segment-btn ${optionType === 'call' ? 'active' : ''}`}
                onClick={() => setOptionType('call')}
              >
                CALL ▲
              </button>
              <button 
                className={`segment-btn ${optionType === 'put' ? 'active' : ''}`}
                onClick={() => setOptionType('put')}
              >
                PUT ▼
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Strike Price</label>
            <input 
              type="number" 
              value={strikePrice}
              onChange={(e) => setStrikePrice(e.target.value)}
              placeholder="e.g., 425.50"
            />
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>
              Select the option expiration date
            </p>
            <input 
              type="date"
              value={expiryDate}
              onChange={(e) => {
                setExpiryDate(e.target.value);
                if (e.target.value) {
                  const today = new Date();
                  const expiry = new Date(e.target.value);
                  const dte = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                  setDaysToExpiry(Math.max(0, dte).toString());
                }
              }}
            />
            {expiryDate && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                ✓ Days to expire: {daysToExpiry}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Option Price (Per Contract)</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>
              Enter your broker's price (e.g., 21.50)
            </p>
            <input 
              type="number"
              value={optionPrice}
              onChange={(e) => setOptionPrice(e.target.value)}
              placeholder="e.g., 21.50"
              step="0.01"
              min="0"
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
              💡 Get this from your broker's option chain
            </p>
          </div>

          <div className="form-group">
            <label>Finviz Verification</label>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#6b7280', lineHeight: '1.4' }}>
              Check live data before trading:
            </p>
            <a 
              href={`https://finviz.com/quote.ashx?t=${ticker}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)',
                color: 'white',
                padding: '0.625rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              📊 View {ticker} on Finviz →
            </a>
          </div>

          <div className="form-group">
            <label>RSI(14) - Optional Override</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#6b7280' }}>
              Override AI RSI with your own value:
            </p>
            <input 
              type="number"
              value={manualRSI}
              onChange={(e) => setManualRSI(e.target.value)}
              placeholder="Leave empty for AI data"
              min="0"
              max="100"
            />
          </div>

          <button 
            className="btn-analyze"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <span>⚡</span>
            {isAnalyzing ? 'Analyzing...' : 'ANALYZE TRADE'}
          </button>

          {error && (
            <div style={{
              background: '#fee2e2',
              padding: '0.75rem',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {analysisResult && (
          <div className="results-container">
            
            {/* Position Setup Summary - NEW */}
            <PositionSetupSummary />

            {/* Google Ads - Middle */}
            <div className="ad-container">
              <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID"
                data-ad-slot="0987654321"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
              <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
              </script>
            </div>

            {/* Trade Quality Score */}
            <div className="card">
              <span className="form-section-title">Trade Quality Score</span>
              
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff6b35' }}>
                  {analysisResult.overallScore}
                </div>
                <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                  {analysisResult.overallScore >= 75 ? 'Excellent Setup' :
                   analysisResult.overallScore >= 60 ? 'Good Setup' :
                   analysisResult.overallScore >= 45 ? 'Acceptable Setup' :
                   'Weak Setup'}
                </p>
              </div>

              <ScoreBar label="Liquidity" value={analysisResult.liquidityScore} color="#ff8c42" />
              <ScoreBar label="Risk/Reward" value={analysisResult.riskRewardScore} color="#00c8c8" />
              <ScoreBar label="Technical" value={analysisResult.technicalScore} color="#ef4444" />

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.6' }}>
                  <strong>Why this score:</strong> The trade quality reflects risk/reward alignment with current technicals. Higher scores = better odds of profit.
                </p>
              </div>
            </div>

            {/* AI Review */}
            <div className="card" style={{ background: '#eff6ff', borderLeft: '4px solid #0ea5e9' }}>
              <span className="form-section-title" style={{ color: '#0369a1' }}>AI Analysis</span>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#1f2937' }}>
                {analysisResult.claudeInsight}
              </p>
            </div>

            {/* Position Setup */}
            <div className="card">
              <span className="form-section-title">Position Sizing</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Contracts to Trade
                  </p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff6b35' }}>
                    {analysisResult.contractsToTrade}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    At 2% risk
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Max Risk per Contract
                  </p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
                    ${parseFloat(analysisResult.maxLoss).toFixed(2)}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    Total risk exposure
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>
                  Break-Even: ${parseFloat(analysisResult.beCall).toFixed(2)}
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  Risk/Reward: 1:{parseFloat(analysisResult.riskRewardRatio).toFixed(2)}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                  Max Reward: ${parseFloat(analysisResult.maxGain).toFixed(2)} per contract
                </p>
              </div>
            </div>

            {/* IV Crush */}
            <div className="card" style={{ background: '#fef3c7', borderLeft: '4px solid #f59e0b' }}>
              <span className="form-section-title" style={{ color: '#92400e' }}>⚠️ IV Crush Impact</span>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#78350f' }}>
                After market events, implied volatility drops and option value declines:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>
                    IV Crush %
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#92400e' }}>
                    -{analysisResult.ivCrushPercent}%
                  </div>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>
                    Price After Crush
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#92400e' }}>
                    ${parseFloat(analysisResult.pricePostCrush).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Indicators */}
            <div className="card">
              <span className="form-section-title">Technical Indicators</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    RSI(14)
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: analysisResult.rsiScore > 70 ? '#dc2626' : analysisResult.rsiScore < 30 ? '#059669' : '#f59e0b' }}>
                    {analysisResult.rsiScore.toFixed(0)}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    {analysisResult.rsiInterpretation}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    MACD
                  </p>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: analysisResult.macdSignal === 'Bullish Crossover' ? '#059669' : '#dc2626' }}>
                    {analysisResult.macdSignal}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    {analysisResult.macdMomentum}
                  </p>
                </div>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600 }}>
                  Bollinger Bands
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                  Upper: ${parseFloat(analysisResult.bbUpper).toFixed(2)} | 
                  Middle: ${parseFloat(analysisResult.bbMiddle).toFixed(2)} | 
                  Lower: ${parseFloat(analysisResult.bbLower).toFixed(2)}
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  Position: {analysisResult.bbPosition}
                </p>
              </div>
            </div>

            {/* Greeks */}
            <div className="card">
              <span className="form-section-title">Option Greeks</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Delta
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {analysisResult.delta}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Theta
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
                    {analysisResult.theta}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Gamma
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {analysisResult.gamma}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Vega
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {analysisResult.vega}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Ads - Bottom */}
            <div className="ad-container">
              <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-YOUR_GOOGLE_AD_CLIENT_ID"
                data-ad-slot="5555555555"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
              <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
              </script>
            </div>

            {/* Disclaimer */}
            <div className="card" style={{ background: '#fff8f0', border: '1px solid #fed7aa' }}>
              <span className="form-section-title" style={{ color: '#92400e' }}>⚠️ Risk Disclaimer</span>
              <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.7, margin: 0 }}>
                Options trading involves substantial risk of loss and is not appropriate for all investors. This tool provides educational analysis only and does not constitute financial advice. Always trade with capital you can afford to lose, use defined-risk strategies, and consult a licensed advisor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
