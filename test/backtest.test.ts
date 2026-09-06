import { describe, it, expect } from 'vitest';
import { runBacktest, AssetPeriodReturn } from '../src/analytics/backtest';
import { runMonteCarloSimulation } from '../src/analytics/monteCarlo';

describe('Backtest & Monte Carlo Engine', () => {
  it('runs backtest on 2-asset portfolio with annual rebalance', () => {
    const assets = [
      { symbol: 'SPY', weight: 0.6 },
      { symbol: 'BND', weight: 0.4 },
    ];

    const periods: AssetPeriodReturn[] = [
      { date: '2020-01-01', returns: { SPY: 0.05, BND: 0.01 } },
      { date: '2020-02-01', returns: { SPY: -0.08, BND: 0.02 } },
      { date: '2020-03-01', returns: { SPY: -0.12, BND: -0.01 } },
      { date: '2020-04-01', returns: { SPY: 0.12, BND: 0.01 } },
    ];

    const res = runBacktest(assets, periods, undefined, {
      initialBalance: 10000,
      rebalanceFrequency: 'annually',
    });

    expect(res.history).toHaveLength(4);
    expect(res.summary.initialBalance).toBe(10000);
    expect(res.summary.finalBalance).toBeGreaterThan(0);
    expect(res.summary.maxDrawdown).toBeLessThan(0);
  });

  it('runs Monte Carlo with deterministic seed and checks percentile hierarchy', () => {
    const historicalReturns = [0.15, -0.05, 0.20, 0.08, -0.12, 0.10, 0.25, 0.04];
    const mc = runMonteCarloSimulation(historicalReturns, {
      numSimulations: 500,
      horizonYears: 10,
      initialBalance: 100000,
      annualWithdrawal: 4000,
      seed: 42,
    });

    expect(mc.survivalRate).toBeGreaterThan(0.9);
    expect(mc.percentiles.p95).toBeGreaterThanOrEqual(mc.percentiles.p75);
    expect(mc.percentiles.p75).toBeGreaterThanOrEqual(mc.percentiles.p50);
    expect(mc.percentiles.p50).toBeGreaterThanOrEqual(mc.percentiles.p25);
    expect(mc.percentiles.p25).toBeGreaterThanOrEqual(mc.percentiles.p5);
    expect(mc.fanChart).toHaveLength(11); // Year 0 to 10
  });
});
