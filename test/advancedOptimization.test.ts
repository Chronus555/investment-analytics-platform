import { describe, it, expect } from 'vitest';
import {
  solveMostDiversifiedPortfolio,
  solveMinCVaR,
  solveMaxSortino,
  solveKellyCriterion,
  calculateDiversificationRatio,
  calculatePortfolioCVaR,
  calculatePortfolioSortino,
} from '../src/analytics/optimization';
import { calculateCovarianceMatrix } from '../src/analytics/statistics';

describe('Advanced Portfolio Optimization Objectives (Discipline 3.1 & 3.2)', () => {
  // 3-Asset synthetic universe: Asset A (Equities), Asset B (Treasuries), Asset C (Commodities)
  const symbols = ['EQ', 'BND', 'COMM'];
  const expectedReturns = [0.10, 0.04, 0.06];

  // Covariance matrix: EQ high vol, BND low vol, COMM moderate vol with low correlation
  const covMatrix = [
    [0.0400, -0.005, 0.0080],
    [-0.005, 0.0049, 0.0010],
    [0.0080, 0.0010, 0.0225],
  ];

  // 60-period return series
  const T = 60;
  const periodReturns: number[][] = [];
  for (let t = 0; t < T; t++) {
    const rEq = 0.008 + 0.05 * Math.sin(t * 0.4);
    const rBnd = 0.003 + 0.015 * Math.cos(t * 0.3);
    const rComm = 0.005 + 0.035 * Math.sin(t * 0.7);
    periodReturns.push([rEq, rBnd, rComm]);
  }

  it('solves Most Diversified Portfolio (MDP) maximizing Choueifaty Diversification Ratio', () => {
    const constraints = { minWeight: 0.0, maxWeight: 0.60 };
    const mdp = solveMostDiversifiedPortfolio(symbols, covMatrix, expectedReturns, constraints);

    expect(mdp.diversificationRatio).toBeDefined();
    expect(mdp.diversificationRatio).toBeGreaterThan(1.0);

    // Equal-weight benchmark DR
    const ewDR = calculateDiversificationRatio([1 / 3, 1 / 3, 1 / 3], covMatrix, 12);
    expect(mdp.diversificationRatio!).toBeGreaterThanOrEqual(ewDR - 0.01);

    // Weights sum to 1.0 and satisfy max bound
    const sumW = Object.values(mdp.weights).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 2);
    Object.values(mdp.weights).forEach((w) => {
      expect(w).toBeGreaterThanOrEqual(-1e-4);
      expect(w).toBeLessThanOrEqual(0.60 + 1e-3);
    });
  });

  it('solves Minimum CVaR (95% Expected Shortfall) reducing tail loss', () => {
    const constraints = { minWeight: 0.0, maxWeight: 0.70 };
    const minCvar = solveMinCVaR(symbols, periodReturns, expectedReturns, covMatrix, 0.95, constraints);

    expect(minCvar.cvar95).toBeDefined();
    expect(minCvar.cvar95).toBeGreaterThan(0);

    // CVaR of 100% Equity portfolio
    const eqCVaR = calculatePortfolioCVaR([1.0, 0.0, 0.0], periodReturns, 0.95);
    // Min CVaR should have substantially lower tail risk than pure equities
    expect(minCvar.cvar95!).toBeLessThan(eqCVaR);

    // Weights sum to 1.0
    const sumW = Object.values(minCvar.weights).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 2);
  });

  it('solves Maximum Sortino Ratio focusing on downside risk efficiency', () => {
    const constraints = { minWeight: 0.0, maxWeight: 0.65 };
    const maxSort = solveMaxSortino(symbols, expectedReturns, periodReturns, covMatrix, 0.03, constraints);

    expect(maxSort.sortinoRatio).toBeDefined();
    expect(maxSort.sortinoRatio).toBeGreaterThan(0);

    // Weights sum to 1.0
    const sumW = Object.values(maxSort.weights).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 2);
    Object.values(maxSort.weights).forEach((w) => {
      expect(w).toBeGreaterThanOrEqual(-1e-4);
      expect(w).toBeLessThanOrEqual(0.65 + 1e-3);
    });
  });

  it('solves Kelly Growth Optimal Portfolio under Half Kelly scaling', () => {
    const constraints = { minWeight: 0.0, maxWeight: 0.50 };
    const kelly = solveKellyCriterion(symbols, expectedReturns, covMatrix, 0.5, constraints);

    expect(kelly.expectedReturn).toBeGreaterThan(0.04);
    expect(kelly.volatility).toBeGreaterThan(0);
    expect(kelly.sharpeRatio).toBeGreaterThan(0);

    // Weights sum to 1.0 and respect 50% max bound
    const sumW = Object.values(kelly.weights).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 2);
    Object.values(kelly.weights).forEach((w) => {
      expect(w).toBeGreaterThanOrEqual(-1e-4);
      expect(w).toBeLessThanOrEqual(0.50 + 1e-3);
    });
  });
});
