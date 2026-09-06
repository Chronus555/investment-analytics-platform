import { describe, it } from 'vitest';
import { runBacktest, AssetPeriodReturn } from '../src/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '../src/data/curatedData';

const ALIGNED_PERIOD_DATA: AssetPeriodReturn[] = CURATED_DATES.map((date, idx) => {
  const returns: Record<string, number> = {};
  Object.keys(CURATED_RETURNS).forEach((sym) => {
    returns[sym] = CURATED_RETURNS[sym][idx] || 0;
  });
  return { date, returns };
});

describe('Validation Benchmark Run', () => {
  it('runs Portfolio A, B, C validation against PV benchmarks', () => {
    // Portfolio A: SPY 60%, BND 40%
    const portA = [
      { symbol: 'SPY', weight: 0.60 },
      { symbol: 'BND', weight: 0.40 },
    ];
    // Portfolio B: QQQ 100%
    const portB = [
      { symbol: 'QQQ', weight: 1.00 },
    ];
    // Portfolio C: SPY 40%, QQQ 20%, IWM 10%, TLT 20%, GLD 10%
    const portC = [
      { symbol: 'SPY', weight: 0.40 },
      { symbol: 'QQQ', weight: 0.20 },
      { symbol: 'IWM', weight: 0.10 },
      { symbol: 'TLT', weight: 0.20 },
      { symbol: 'GLD', weight: 0.10 },
    ];

    const resA = runBacktest(portA, ALIGNED_PERIOD_DATA, CURATED_RETURNS['SPY'], { initialBalance: 10000, rebalanceFrequency: 'annually' });
    const resB = runBacktest(portB, ALIGNED_PERIOD_DATA, CURATED_RETURNS['SPY'], { initialBalance: 10000, rebalanceFrequency: 'annually' });
    const resC = runBacktest(portC, ALIGNED_PERIOD_DATA, CURATED_RETURNS['SPY'], { initialBalance: 10000, rebalanceFrequency: 'annually' });

    console.log('PORTFOLIO_VALIDATION_RESULTS:', JSON.stringify({
      PortfolioA: {
        CAGR: (resA.summary.cagr * 100).toFixed(2) + '%',
        Volatility: (resA.summary.annualizedVolatility * 100).toFixed(2) + '%',
        Sharpe: resA.summary.sharpeRatio.toFixed(2),
        MaxDrawdown: (resA.summary.maxDrawdown * 100).toFixed(2) + '%',
        FinalBalance: '$' + Math.round(resA.summary.finalBalance).toLocaleString(),
      },
      PortfolioB: {
        CAGR: (resB.summary.cagr * 100).toFixed(2) + '%',
        Volatility: (resB.summary.annualizedVolatility * 100).toFixed(2) + '%',
        Sharpe: resB.summary.sharpeRatio.toFixed(2),
        MaxDrawdown: (resB.summary.maxDrawdown * 100).toFixed(2) + '%',
        FinalBalance: '$' + Math.round(resB.summary.finalBalance).toLocaleString(),
      },
      PortfolioC: {
        CAGR: (resC.summary.cagr * 100).toFixed(2) + '%',
        Volatility: (resC.summary.annualizedVolatility * 100).toFixed(2) + '%',
        Sharpe: resC.summary.sharpeRatio.toFixed(2),
        MaxDrawdown: (resC.summary.maxDrawdown * 100).toFixed(2) + '%',
        FinalBalance: '$' + Math.round(resC.summary.finalBalance).toLocaleString(),
      }
    }, null, 2));
  });
});
