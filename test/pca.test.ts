import { describe, it, expect } from 'vitest';
import { runPCA, jacobiEigenvalueDecomposition } from '../src/analytics/pca';

describe('Principal Component Analysis (PCA)', () => {
  it('correctly decomposes a 2x2 identity matrix', () => {
    const I = [
      [1.0, 0.0],
      [0.0, 1.0]
    ];
    const { eigenvalues, eigenvectors } = jacobiEigenvalueDecomposition(I);
    expect(eigenvalues[0]).toBeCloseTo(1.0, 4);
    expect(eigenvalues[1]).toBeCloseTo(1.0, 4);
    // Eigenvectors should be orthogonal
    const dot = eigenvectors[0][0] * eigenvectors[0][1] + eigenvectors[1][0] * eigenvectors[1][1];
    expect(dot).toBeCloseTo(0.0, 4);
  });

  it('decomposes a 2-asset correlated system with analytical eigenvalues', () => {
    const rho = 0.6;
    const corr = [
      [1.0, rho],
      [rho, 1.0]
    ];
    const { eigenvalues } = jacobiEigenvalueDecomposition(corr);
    // Analytical eigenvalues: 1 + rho = 1.6, and 1 - rho = 0.4
    const sorted = [...eigenvalues].sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(1.6, 4);
    expect(sorted[1]).toBeCloseTo(0.4, 4);
  });

  it('runs PCA on asset returns and ensures total variance sums to N', () => {
    const T = 36;
    const dates = Array.from({ length: T }, (_, i) => String(i));
    const rets: Record<string, number[]> = {
      SPY: Array.from({ length: T }, (_, i) => Math.sin(i * 0.5) * 0.04),
      QQQ: Array.from({ length: T }, (_, i) => Math.sin(i * 0.5) * 0.05 + 0.005),
      TLT: Array.from({ length: T }, (_, i) => -Math.sin(i * 0.5) * 0.02 + 0.002),
    };

    const result = runPCA(rets, ['SPY', 'QQQ', 'TLT']);
    expect(result.components.length).toBe(3);
    expect(result.totalVariance).toBeCloseTo(3.0, 3); // Sum of diagonal of 3x3 correlation matrix

    // Cumulative variance of last component must reach 100%
    const lastComp = result.components[result.components.length - 1];
    expect(lastComp.cumulativeVariance).toBeCloseTo(1.0, 4);

    // PC1 must explain the highest variance
    expect(result.components[0].varianceExplained).toBeGreaterThanOrEqual(result.components[1].varianceExplained);
    expect(result.components[1].varianceExplained).toBeGreaterThanOrEqual(result.components[2].varianceExplained);

    // Sum of variance explained must equal 1.0
    const sumVar = result.components.reduce((acc, c) => acc + c.varianceExplained, 0);
    expect(sumVar).toBeCloseTo(1.0, 4);
  });
});
