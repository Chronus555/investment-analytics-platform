import { describe, it, expect } from 'vitest';
import { solveOptimization } from '../src/analytics/optimization';
import { solveRiskParity } from '../src/analytics/riskParity';

describe('Optimization & Risk Parity Engine', () => {
  it('solves 2-asset analytical minimum variance portfolio', () => {
    const symbols = ['Asset1', 'Asset2'];
    const expectedReturns = [0.10, 0.05];

    // Monthly variances & covariance
    // var1 = 0.04 / 12, var2 = 0.01 / 12, cov12 = 0.005 / 12
    const var1 = 0.04 / 12;
    const var2 = 0.01 / 12;
    const cov12 = 0.005 / 12;
    const covMatrix = [
      [var1, cov12],
      [cov12, var2],
    ];

    // Analytical closed-form minimum variance weight:
    // w1* = (var2 - cov12) / (var1 + var2 - 2*cov12)
    // w1* = (0.01 - 0.005) / (0.04 + 0.01 - 0.01) = 0.005 / 0.04 = 0.125
    // w2* = 1 - 0.125 = 0.875
    const opt = solveOptimization(symbols, expectedReturns, covMatrix, 'min_variance');
    expect(opt.weights['Asset1']).toBeCloseTo(0.125, 2);
    expect(opt.weights['Asset2']).toBeCloseTo(0.875, 2);
  });

  it('solves Equal Risk Contribution (Risk Parity)', () => {
    const symbols = ['Stock', 'Bond'];
    // Stock has 20% vol (var = 0.04/12), Bond has 10% vol (var = 0.01/12), 0 correlation
    const covMatrix = [
      [0.04 / 12, 0],
      [0, 0.01 / 12],
    ];

    // For uncorrelated assets, ERC weights are inversely proportional to volatility:
    // w_Stock * 0.20 = w_Bond * 0.10 => w_Stock = 1/3 (~33.3%), w_Bond = 2/3 (~66.7%)
    const rp = solveRiskParity(symbols, covMatrix);
    expect(rp.weights['Stock']).toBeCloseTo(1 / 3, 2);
    expect(rp.weights['Bond']).toBeCloseTo(2 / 3, 2);

    // Both assets should have 50% percent risk contribution
    expect(rp.assets[0].percentRiskContribution).toBeCloseTo(0.50, 2);
    expect(rp.assets[1].percentRiskContribution).toBeCloseTo(0.50, 2);
  });
});
