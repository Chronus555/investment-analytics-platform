import { describe, it, expect } from 'vitest';
import { solveBlackLitterman, calculateEquilibriumReturns } from '../src/analytics/blackLitterman';

describe('Black-Litterman Model', () => {
  it('calculates implied equilibrium returns', () => {
    const symbols = ['US_Eq', 'Bonds'];
    const mktCaps = [0.6, 0.4];
    // Monthly covariance
    const cov = [
      [0.04 / 12, 0.002 / 12],
      [0.002 / 12, 0.01 / 12],
    ];

    const pi = calculateEquilibriumReturns(symbols, mktCaps, cov, 2.5, 12);
    // Pi_1 = 2.5 * (0.04 * 0.6 + 0.002 * 0.4) = 2.5 * (0.024 + 0.0008) = 2.5 * 0.0248 = 0.062
    expect(pi['US_Eq']).toBeCloseTo(0.062, 4);
    // Pi_2 = 2.5 * (0.002 * 0.6 + 0.01 * 0.4) = 2.5 * (0.0012 + 0.004) = 2.5 * 0.0052 = 0.013
    expect(pi['Bonds']).toBeCloseTo(0.013, 4);
  });

  it('adjusts returns when bullish view is expressed', () => {
    const symbols = ['US_Eq', 'Bonds'];
    const mktCaps = [0.6, 0.4];
    const cov = [
      [0.04 / 12, 0],
      [0, 0.01 / 12],
    ];

    // Express view: US_Eq will outperform by 5%
    const views = [
      {
        description: 'US Equity Bullish',
        assets: [{ symbol: 'US_Eq', weight: 1.0 }],
        expectedExcessReturn: 0.12,
        confidence: 0.8,
      },
    ];

    const bl = solveBlackLitterman(symbols, mktCaps, cov, views, 0.05, 2.5, 12);
    expect(bl.posteriorReturns['US_Eq']).toBeGreaterThan(bl.impliedEquilibriumReturns['US_Eq']);
    expect(bl.optimalWeights['US_Eq']).toBeGreaterThan(0.60);
  });
});
