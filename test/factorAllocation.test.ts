import { describe, it, expect } from 'vitest';
import {
  extractUniverseFactorLoadings,
  solveTargetFactorAllocation,
  simulateFactorMatchedPortfolio,
} from '../src/analytics/factorAllocation';

describe('Risk Factor Allocation & Target Factor Matching Engine', () => {
  const mockReturns = {
    SPY: [0.02, -0.01, 0.03, 0.01, -0.02, 0.04, 0.01, -0.01, 0.02, 0.03, -0.01, 0.02],
    QQQ: [0.03, -0.02, 0.05, 0.02, -0.03, 0.06, 0.02, -0.02, 0.03, 0.04, -0.02, 0.03],
    IWM: [0.01, 0.01, 0.04, -0.01, -0.01, 0.05, 0.03, -0.03, 0.01, 0.05, 0.01, 0.01],
    AVUV: [0.02, 0.02, 0.02, 0.00, -0.01, 0.04, 0.02, -0.01, 0.03, 0.04, 0.02, 0.02],
    TLT: [-0.01, 0.02, -0.02, 0.03, 0.01, -0.01, -0.02, 0.01, -0.01, -0.02, 0.02, -0.01],
    BIL: Array(12).fill(0.002),
  };

  it('extracts 4-factor loadings matrix across candidate universe', () => {
    const universe = ['SPY', 'QQQ', 'IWM', 'TLT'];
    const { factorMatrix, factorNames, symbols } = extractUniverseFactorLoadings(mockReturns, universe);

    expect(symbols).toEqual(universe);
    expect(factorNames).toEqual(['MKT', 'SMB', 'HML', 'MOM']);
    expect(factorMatrix).toHaveLength(4); // 4 factors
    expect(factorMatrix[0]).toHaveLength(4); // 4 assets
  });

  it('reverse-solves optimal weights adhering to simplex sum-to-1 constraint', () => {
    const factorMatrix = [
      [1.0, 1.2, 1.1, 0.2], // MKT
      [0.0, -0.1, 0.8, -0.1], // SMB
      [0.0, -0.4, 0.3, 0.0],  // HML
      [0.0, 0.5, -0.1, -0.1], // MOM
    ];
    const symbols = ['SPY', 'QQQ', 'IWM', 'TLT'];

    const target = {
      mkt: 1.0,
      smb: 0.3,
      hml: 0.1,
      mom: 0.1,
    };

    const result = solveTargetFactorAllocation(symbols, factorMatrix, target, undefined, 0.60);

    // Sum of weights should be 1.0
    const sumWeights = Object.values(result.weights).reduce((a, b) => a + b, 0);
    expect(sumWeights).toBeCloseTo(1.0, 2);

    // All weights should be within bounds
    Object.values(result.weights).forEach((w) => {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(0.6001);
    });

    // Small cap asset IWM should receive substantial weight to fulfill SMB = 0.3 target
    expect(result.weights['IWM']).toBeGreaterThan(0.15);
    expect(result.meanAbsoluteError).toBeLessThan(0.35);
  });

  it('simulates historical performance of the factor-matched portfolio', () => {
    const dates = Array.from({ length: 12 }, (_, i) => '2023-' + String(i + 1).padStart(2, '0') + '-01');
    const weights = { SPY: 0.50, IWM: 0.30, TLT: 0.20 };

    const sim = simulateFactorMatchedPortfolio(dates, mockReturns, weights, 'SPY');

    expect(sim.growthSeries).toHaveLength(13);
    expect(sim.benchmarkSeries).toHaveLength(13);
    expect(sim.cagr).toBeDefined();
    expect(sim.volatility).toBeGreaterThan(0);
    expect(sim.maxDrawdown).toBeLessThanOrEqual(0);
  });
});