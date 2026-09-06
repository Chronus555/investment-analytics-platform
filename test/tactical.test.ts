import { describe, it, expect } from 'vitest';
import { runMovingAverageStrategy, runDualMomentumStrategy, calculateSMA } from '../src/analytics/tactical';
import { simulateRetirementPath } from '../src/analytics/retirement';

describe('Tactical Strategy Lab', () => {
  it('computes simple moving averages', () => {
    const prices = [10, 12, 14, 16, 18];
    const sma = calculateSMA(prices, 3);
    expect(isNaN(sma[0])).toBe(true);
    expect(isNaN(sma[1])).toBe(true);
    expect(sma[2]).toBe(12); // (10 + 12 + 14)/3
    expect(sma[3]).toBe(14); // (12 + 14 + 16)/3
    expect(sma[4]).toBe(16); // (14 + 16 + 18)/3
  });

  it('generates defensive cash signal when price falls below SMA', () => {
    const dates = ['2020-01', '2020-02', '2020-03', '2020-04', '2020-05'];
    const prices = {
      SPY: [100, 102, 104, 85, 80], // Sharp decline below 3-month SMA
    };
    const signals = runMovingAverageStrategy(dates, prices, 3, 'CASH');
    // At T=4, price 80 is below SMA of (104, 85, 80)/3 = 89.67 -> Cash signal
    const lastSig = signals[signals.length - 1];
    expect(lastSig.cashWeight).toBe(1.0);
    expect(lastSig.selectedAssets['CASH']).toBe(1.0);
  });

  it('selects top momentum asset in dual momentum', () => {
    const dates = ['T0', 'T1', 'T2'];
    // Lookback 1
    const prices = {
      AssetA: [100, 110, 120], // +10%
      AssetB: [100, 95, 90],   // -5%
      BND: [100, 101, 102],
    };
    const signals = runDualMomentumStrategy(dates, prices, 1, 1, 'BND');
    // AssetA outperformed AssetB and is positive -> AssetA selected
    expect(signals[0].selectedAssets['AssetA']).toBe(1.0);
  });
});

describe('Retirement Lab', () => {
  it('simulates retirement decumulation and respects social security', () => {
    const returns = [0.06, 0.08, -0.04, 0.12, 0.05];
    const sim = simulateRetirementPath(returns, {
      currentAge: 60,
      retirementAge: 65,
      lifeExpectancyAge: 85,
      currentPortfolio: 1000000,
      annualSavings: 30000,
      desiredAnnualSpending: 60000,
      strategy: 'guyton_klinger',
      socialSecurityAge: 67,
      socialSecurityAnnual: 28000,
    });

    expect(sim.success).toBe(true);
    expect(sim.endingWealth).toBeGreaterThan(0);
    expect(sim.states.length).toBe(25);
  });
});
