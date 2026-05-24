# Vega Trading - Institutional Options Analyzer

Professional day trading platform for options analysis. Institutional-grade metrics including Greeks, IV analysis, risk/reward ratios, position sizing, and market catalysts.

## Features

- **11 Tradeable Symbols**: QQQ, SPY, IWM, XLF, GLD, TLT, USO, TSLA, NVDA, AMD, VIX
- **Options Greeks**: Delta, Gamma, Theta, Vega
- **Momentum Indicators**: RSI, Stochastic
- **Volatility Analysis**: IV Percentile, IV Rank, Expected Move
- **Technical Analysis**: Bollinger Bands, MACD, Trend Analysis
- **Position Management**: Risk/Reward Ratios, Break-even Levels, Position Sizing
- **IV Crush Impact**: Post-event price estimation
- **Economic Calendar**: Upcoming market catalysts with dates
- **Historical Charts**: Today, 1-month, 1-year price action
- **Trade Quality Scoring**: 0-100 institutional-grade scoring with justification

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
```

## Deployment

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Vercel auto-deploys on every push

### Option 2: GitHub Desktop + Vercel

1. Install [GitHub Desktop](https://desktop.github.com)
2. Clone this repository
3. Make changes and commit
4. Push to GitHub
5. Vercel auto-deploys

## Connect Custom Domain (vegatrading.ai)

In Vercel Dashboard:
1. Settings → Domains
2. Add your domain
3. Update nameservers at your registrar to Vercel's nameservers
4. Wait 24-48 hours for DNS propagation

## Project Structure

```
vega-trading/
├── src/
│   ├── App.jsx          (Main trading app component)
│   └── main.jsx         (React entry point)
├── public/
│   └── index.html       (HTML template)
├── package.json         (Dependencies)
├── vite.config.js       (Vite configuration)
└── README.md            (This file)
```

## Technology Stack

- **Frontend**: React 18
- **Build Tool**: Vite
- **UI Components**: Lucide React Icons
- **Deployment**: Vercel

## Usage

1. **Select Ticker**: Choose from 11 professional trading symbols
2. **Option Type**: Call or Put
3. **Strike Price**: Entry level (e.g., 425.50)
4. **Days to Expiry**: 1 DTE through 120 DTE
5. **Trading Thesis**: Explain your directional view
6. **Analyze**: Get institutional-grade metrics

## Metrics Explained

- **Trade Quality Score**: 0-100 based on liquidity, risk/reward, and technicals
- **Greeks**: Directional exposure, acceleration, time decay, vol sensitivity
- **Win Probability**: Estimated probability of profitable trade
- **Risk/Reward Ratio**: Max loss vs. max gain payoff
- **IV Crush**: Estimated volatility impact post-event
- **Position Size**: Contracts to trade at 2% account risk

## Market Catalysts

Real-time economic calendar with Fed announcements, earnings, CPI, jobs reports, and geopolitical context.

## License

MIT

## Support

For issues or feature requests, create a GitHub issue.

---

Built for professional options traders. Made with React + Vite.
