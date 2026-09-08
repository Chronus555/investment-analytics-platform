import { describe, it, expect } from 'vitest';
import {
  computeCorrelationMatrix,
  computeCorrelationDistanceMatrix,
  computeEuclideanDistanceOfDistances,
  buildHierarchicalTree,
  quasiDiagonalize,
  recursiveBisection,
  solveHierarchicalRiskParity,
} from '../src/analytics/hrp';

describe('Hierarchical Risk Parity (HRP) Engine', () => {
  // 4-asset sample covariance matrix
  const symbols = ['SPY', 'QQQ', 'TLT', 'GLD'];
  const covMatrix = [
    [0.0225, 0.0240, -0.0030, 0.0020], // SPY
    [0.0240, 0.0361, -0.0040, 0.0015], // QQQ
    [-0.0030, -0.0040, 0.0196, 0.0040], // TLT
    [0.0020, 0.0015, 0.0040, 0.0225],  // GLD
  ];
  const expectedReturns = [0.10, 0.12, 0.04, 0.06];

  it('computes correlation and correlation distance matrices correctly', () => {
    const corr = computeCorrelationMatrix(covMatrix);
    expect(corr.length).toBe(4);
    expect(corr[0][0]).toBeCloseTo(1.0, 5);
    expect(corr[0][1]).toBeGreaterThan(0.7); // SPY and QQQ high correlation

    const dist = computeCorrelationDistanceMatrix(corr);
    expect(dist[0][0]).toBe(0);
    expect(dist[0][1]).toBeLessThan(dist[0][2]); // SPY-QQQ distance < SPY-TLT distance
    expect(dist[0][1]).toBeGreaterThanOrEqual(0);
    expect(dist[0][1]).toBeLessThanOrEqual(1.0);
  });

  it('builds a valid hierarchical agglomerative tree and quasi-diagonalizes leaves', () => {
    const corr = computeCorrelationMatrix(covMatrix);
    const dist = computeCorrelationDistanceMatrix(corr);
    const euclideanDist = computeEuclideanDistanceOfDistances(dist);

    const tree = buildHierarchicalTree(euclideanDist, symbols);
    expect(tree).toBeDefined();
    expect(tree.elements.length).toBe(4);
    expect(tree.isLeaf).toBe(false);

    const orderedIndices = quasiDiagonalize(tree);
    expect(orderedIndices.length).toBe(4);
    // All 4 unique asset indices present
    const unique = new Set(orderedIndices);
    expect(unique.size).toBe(4);

    // Closely correlated SPY (0) and QQQ (1) should be clustered together
    const spyIdx = orderedIndices.indexOf(0);
    const qqqIdx = orderedIndices.indexOf(1);
    expect(Math.abs(spyIdx - qqqIdx)).toBe(1);
  });

  it('computes positive weights summing strictly to 1.0 via recursive bisection', () => {
    const result = solveHierarchicalRiskParity(symbols, covMatrix, expectedReturns);
    expect(result).toBeDefined();

    const sumWeights = Object.values(result.weights).reduce((a, b) => a + b, 0);
    expect(sumWeights).toBeCloseTo(1.0, 6);

    symbols.forEach((sym) => {
      expect(result.weights[sym]).toBeGreaterThan(0);
      expect(result.weights[sym]).toBeLessThan(1.0);
    });

    expect(result.volatility).toBeGreaterThan(0);
    expect(result.sharpeRatio).toBeDefined();
    expect(result.diversificationRatio).toBeGreaterThan(1.0);
  });

  it('gracefully handles ill-conditioned / singular covariance matrices where matrix inversion fails', () => {
    // 3 assets where asset 2 is almost an exact duplicate of asset 1 (collinear)
    const singularCov = [
      [0.04, 0.039999, 0.001],
      [0.039999, 0.04, 0.001],
      [0.001, 0.001, 0.02],
    ];
    const singularSymbols = ['ASSET_A', 'ASSET_B', 'ASSET_C'];

    // HRP must succeed without throw or NaN
    const hrp = solveHierarchicalRiskParity(singularSymbols, singularCov);
    expect(hrp).toBeDefined();

    const sumW = Object.values(hrp.weights).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 6);
    expect(Number.isNaN(hrp.weights['ASSET_A'])).toBe(false);
    expect(Number.isNaN(hrp.weights['ASSET_B'])).toBe(false);
    expect(Number.isNaN(hrp.weights['ASSET_C'])).toBe(false);
  });

  it('allocates higher weight to lower-variance uncorrelated sub-clusters', () => {
    // 2 high vol equities, 1 low vol treasury
    const testCov = [
      [0.09, 0.08, 0.0],
      [0.08, 0.09, 0.0],
      [0.0, 0.0, 0.01], // TLT: 10% vol vs 30% vol
    ];
    const testSyms = ['EQ1', 'EQ2', 'BOND'];
    const hrp = solveHierarchicalRiskParity(testSyms, testCov);

    // Bond should receive the largest individual weight due to low variance & zero correlation
    expect(hrp.weights['BOND']).toBeGreaterThan(hrp.weights['EQ1']);
    expect(hrp.weights['BOND']).toBeGreaterThan(hrp.weights['EQ2']);
  });
});
