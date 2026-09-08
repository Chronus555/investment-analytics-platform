import { describe, it, expect } from 'vitest';
import {
  calculateMomentumScores,
  computeSampleCovarianceMatrix,
  calculateAdaptiveWeights,
  runAdaptiveAllocationBacktest,
} from '../src/analytics/adaptiveAllocation';

describe('Adaptive Tactical Asset Allocation Engine', () => {
  it('correctly ranks assets by momentum over lookback window', () => {
    const prices = {
      SPY: [100, 105, 110, 120],
      GLD: [100, 102, 104, 105],
      TLT: [100, 98, 95, 90],
    };

    const scores = calculateMomentumScores(prices, ['SPY', 'GLD', 'TLT'], 3, 3);

    expect(scores).toHaveLength(3);
    expect(scores[0].symbol).toBe('SPY');
    expect(scores[0].score).toBeCloseTo(0.20, 2);
    expect(scores[1].symbol).toBe('GLD');
    expect(scores[1].score).toBeCloseTo(0.05, 2);
    expect(scores[2].symbol).toBe('TLT');
    expect(scores[2].score).toBeCloseTo(-0.10, 2);
  });

  it('calculates sample covariance matrix with diagonal regularization', () => {
    const returns = {
      A: [0.01, 0.02, -0.01, 0.03, 0.00],
      B: [0.00, 0.01, -0.02, 0.02, -0.01],
    };

    const cov = computeSampleCovarianceMatrix(returns, ['A', 'B'], 4, 5);

    expect(cov).toHaveLength(2);
    expect(cov[0]).toHaveLength(2);
    expect(cov[0][1]).toBeCloseTo(cov[1][0], 6);
    expect(cov[0][0]).toBeGreaterThan(0);
    expect(cov[1][1]).toBeGreaterThan(0);
  });

  it('weights assets inversely to volatility under inv_vol method', () => {
    const returns = {
      LowVol: [0.01, -0.01, 0.01, -0.01, 0.01],
      HighVol: [0.08, -0.08, 0.08, -0.08, 0.08],
    };

    const weights = calculateAdaptiveWeights(['LowVol', 'HighVol'], returns, 4, 5, 'inv_vol');

    expect(weights['LowVol']).toBeGreaterThan(weights['HighVol']);
    expect(weights['LowVol'] + weights['HighVol']).toBeCloseTo(1.0, 4);
  });

  it('calculates valid weights summing to 1.0 for risk_parity, min_variance, and equal_weight', () => {
    const returns = {
      SPY: [0.02, -0.01, 0.03, 0.01, -0.02, 0.04],
      TLT: [-0.01, 0.02, -0.02, 0.03, 0.01, -0.01],
      GLD: [0.01, 0.01, -0.01, 0.00, 0.02, 0.01],
    };

    const symbols = ['SPY', 'TLT', 'GLD'];

    ['equal_weight', 'inv_vol', 'risk_parity', 'min_variance'].forEach((method) => {
      const w = calculateAdaptiveWeights(symbols, returns, 5, 6, method);
      const sum = symbols.reduce((acc, s) => acc + (w[s] || 0), 0);
      expect(sum).toBeCloseTo(1.0, 3);
      symbols.forEach((s) => {
        expect(w[s]).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('runs complete multi-year backtest and triggers cash hurdle during downturns', () => {
    const dates = Array.from({ length: 24 }, (_, i) => '2022-' + String(i + 1).padStart(2, '0') + '-01');

    const returnsA = [];
    const returnsB = [];
    const safeReturns = Array(24).fill(0.002);

    for (let i = 0; i < 24; i++) {
      if (i < 12) {
        returnsA.push(0.03);
        returnsB.push(0.02);
      } else {
        returnsA.push(-0.06);
        returnsB.push(-0.04);
      }
    }

    const pricesA = [100];
    const pricesB = [100];
    const pricesSafe = [100];
    for (let i = 0; i < 24; i++) {
      pricesA.push(pricesA[i] * (1 + returnsA[i]));
      pricesB.push(pricesB[i] * (1 + returnsB[i]));
      pricesSafe.push(pricesSafe[i] * (1 + safeReturns[i]));
    }

    const prices = { A: pricesA.slice(1), B: pricesB.slice(1), BIL: pricesSafe.slice(1) };
    const returns = { A: returnsA, B: returnsB, BIL: safeReturns, SPY: returnsA };

    const result = runAdaptiveAllocationBacktest(
      dates,
      returns,
      prices,
      {
        universe: ['A', 'B'],
        momentumLookbackMonths: 3,
        volatilityLookbackMonths: 3,
        topN: 2,
        weightingMethod: 'inv_vol',
        useAbsoluteHurdle: true,
        safeAsset: 'BIL',
      },
      'SPY'
    );

    expect(result.signals.length).toBe(21);
    expect(result.strategyGrowth.length).toBe(22);

    const lateSignal = result.signals[result.signals.length - 1];
    expect(lateSignal.cashWeight).toBeGreaterThan(0);
    expect(lateSignal.selectedAssets['BIL']).toBeGreaterThan(0);

    expect(result.turnover).toBeGreaterThanOrEqual(0);
    expect(result.cagr).toBeDefined();
    expect(result.volatility).toBeGreaterThan(0);
  });
});