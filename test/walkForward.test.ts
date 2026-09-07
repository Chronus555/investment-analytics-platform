import { describe, it, expect } from 'vitest';
import { runWalkForwardOptimization } from '../src/analytics/walkForwardOptimization';
import { CURATED_RETURNS, CURATED_DATES } from '../src/data/curatedData';

describe('Walk-Forward Optimization Engine', () => {
  const symbols = ['SPY', 'QQQ', 'BND', 'TLT', 'GLD'];
  const testReturns: Record<string, number[]> = {};
  for (const s of symbols) {
    testReturns[s] = CURATED_RETURNS[s];
  }

  it('strictly starts out-of-sample evaluation at inSampleMonths with zero look-ahead bias', () => {
    const inSampleMonths = 36;
    const outOfSampleMonths = 3;

    const result = runWalkForwardOptimization({
      symbols,
      returnsMap: testReturns,
      dates: CURATED_DATES,
      model: 'max_sharpe',
      inSampleMonths,
      outOfSampleMonths,
      minWeight: 0.0,
      maxWeight: 0.40,
      riskFreeRate: 0.04,
    });

    // Verify first OOS point is exactly at index 36
    expect(result.outOfSampleSeries.length).toBe(CURATED_DATES.length - inSampleMonths);
    expect(result.outOfSampleSeries[0].date).toBe(CURATED_DATES[inSampleMonths]);
    expect(result.outOfSampleSeries[0].monthIndex).toBe(inSampleMonths);

    // Verify rebalance event timestamps
    expect(result.rebalanceEvents[0].date).toBe(CURATED_DATES[inSampleMonths]);
    expect(result.rebalanceEvents[0].lookbackStartDate).toBe(CURATED_DATES[0]);
    expect(result.rebalanceEvents[0].lookbackEndDate).toBe(CURATED_DATES[inSampleMonths - 1]);
  });

  it('ensures weights satisfy simplex and boundary constraints across rebalances', () => {
    const minWeight = 0.05;
    const maxWeight = 0.35;

    const result = runWalkForwardOptimization({
      symbols,
      returnsMap: testReturns,
      dates: CURATED_DATES,
      model: 'min_variance',
      inSampleMonths: 24,
      outOfSampleMonths: 6,
      minWeight,
      maxWeight,
      riskFreeRate: 0.03,
    });

    expect(result.rebalanceEvents.length).toBeGreaterThan(0);

    for (const event of result.rebalanceEvents) {
      let weightSum = 0;
      for (const s of symbols) {
        const w = event.weights[s];
        expect(w).toBeDefined();
        expect(w).toBeGreaterThanOrEqual(minWeight - 0.01);
        expect(w).toBeLessThanOrEqual(maxWeight + 0.01);
        weightSum += w;
      }
      expect(weightSum).toBeCloseTo(1.0, 2);
    }
  });

  it('accurately tracks turnover friction and rebalance intervals', () => {
    const result = runWalkForwardOptimization({
      symbols,
      returnsMap: testReturns,
      dates: CURATED_DATES,
      model: 'max_sharpe',
      inSampleMonths: 36,
      outOfSampleMonths: 3,
      minWeight: 0.0,
      maxWeight: 0.40,
    });

    // First rebalance turnover from cash is 1.0 (100%)
    expect(result.rebalanceEvents[0].turnover).toBe(1.0);

    // Subsequent rebalance turnovers should be between 0% and 100%
    for (let i = 1; i < result.rebalanceEvents.length; i++) {
      const to = result.rebalanceEvents[i].turnover;
      expect(to).toBeGreaterThanOrEqual(0.0);
      expect(to).toBeLessThanOrEqual(1.0);
    }

    expect(result.kpis.avgTurnover).toBeGreaterThan(0.0);
    expect(result.kpis.avgTurnover).toBeLessThanOrEqual(1.0);
  });

  it('computes Equal Risk Parity walk-forward optimization correctly', () => {
    const result = runWalkForwardOptimization({
      symbols,
      returnsMap: testReturns,
      dates: CURATED_DATES,
      model: 'risk_parity',
      inSampleMonths: 24,
      outOfSampleMonths: 12,
    });

    expect(result.kpis.cagr).toBeDefined();
    expect(result.kpis.volatility).toBeGreaterThan(0);
    expect(result.kpis.sharpeRatio).toBeDefined();
    expect(result.kpis.sharpeDecay).toBeDefined();

    // Verify benchmark exists
    expect(result.benchmarks.equalWeight.series.length).toBe(result.outOfSampleSeries.length);
    expect(result.benchmarks.benchmark6040.series.length).toBe(result.outOfSampleSeries.length);
    expect(result.benchmarks.inSampleOverfit.series.length).toBe(result.outOfSampleSeries.length);
  });

  it('measures the Sharpe decay factor between in-sample expectations and out-of-sample reality', () => {
    const result = runWalkForwardOptimization({
      symbols,
      returnsMap: testReturns,
      dates: CURATED_DATES,
      model: 'max_sharpe',
      inSampleMonths: 36,
      outOfSampleMonths: 3,
      minWeight: 0.0,
      maxWeight: 0.50,
      riskFreeRate: 0.04,
    });

    expect(result.kpis.inSampleAvgSharpe).toBeGreaterThan(0);
    expect(result.kpis.sharpeDecay).toBeCloseTo(
      result.kpis.sharpeRatio / result.kpis.inSampleAvgSharpe,
      4
    );
  });
});
