import { describe, it, expect } from 'vitest';
import {
  runTargetVolatilityStrategy,
  runRelativeMomentumStrategy,
  calculateTargetVolatilityWeights,
} from '../src/analytics/tactical';

describe('Tactical Strategy Engine Expansion', () => {
  it('dynamically scales risky exposure inversely with realized volatility', () => {
    // Generate 24 months of synthetic prices
    const dates = Array.from({ length: 24 }, (_, i) => `2020-${String(i + 1).padStart(2, '0')}-01`);

    // High volatility asset: swings +/- 10% each month
    const highVolPrices = [100];
    for (let i = 1; i < 24; i++) {
      const mult = i % 2 === 0 ? 1.10 : 0.90;
      highVolPrices.push(highVolPrices[i - 1] * mult);
    }

    const prices = {
      SPY: highVolPrices,
      BIL: Array(24).fill(100),
    };

    const signals = runTargetVolatilityStrategy(dates, prices, ['SPY'], 0.10, 12, 'BIL', 1.0);

    expect(signals).toHaveLength(12); // 24 - 12 = 12 signals
    // High volatility regime -> risky asset weight should be well below 1.0 (cash buffer > 0)
    const lastSignal = signals[signals.length - 1];
    expect(lastSignal.selectedAssets['SPY']).toBeLessThan(1.0);
    expect(lastSignal.cashWeight).toBeGreaterThan(0);
    expect(lastSignal.selectedAssets['SPY'] + lastSignal.cashWeight).toBeCloseTo(1.0, 4);
  });

  it('selects Top K assets by lookback return in relative momentum rotation', () => {
    const dates = ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07'];

    // Asset A: +50% gain
    const pricesA = [100, 110, 120, 130, 140, 145, 150];
    // Asset B: +20% gain
    const pricesB = [100, 102, 105, 110, 115, 118, 120];
    // Asset C: -10% drop
    const pricesC = [100, 98, 95, 92, 90, 88, 90];

    const prices = { A: pricesA, B: pricesB, C: pricesC };

    // 6-month lookback, top 2
    const signals = runRelativeMomentumStrategy(dates, prices, ['A', 'B', 'C'], 6, 2);

    expect(signals).toHaveLength(1);
    const signal = signals[0];

    // A and B have highest returns, each should receive 50%
    expect(signal.selectedAssets['A']).toBe(0.5);
    expect(signal.selectedAssets['B']).toBe(0.5);
    expect(signal.selectedAssets['C']).toBeUndefined();
    expect(signal.cashWeight).toBe(0);
  });

  it('calculates target volatility weights clamped by max leverage', () => {
    const vols = [0.06, 0.12, 0.24];
    const target = 0.12;
    const weights = calculateTargetVolatilityWeights(vols, target, 1.0);

    // 0.06 -> 0.12 / 0.06 = 2.0 clamped to 1.0
    expect(weights[0]).toBe(1.0);
    // 0.12 -> 0.12 / 0.12 = 1.0
    expect(weights[1]).toBe(1.0);
    // 0.24 -> 0.12 / 0.24 = 0.5
    expect(weights[2]).toBe(0.5);
  });
});
