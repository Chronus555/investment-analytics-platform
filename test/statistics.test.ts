import { describe, it, expect } from 'vitest';
import {
  calculateMean,
  calculateVariance,
  calculateStandardDeviation,
  calculateAnnualizedVolatility,
  calculateCovariance,
  calculateCorrelation,
  calculateCorrelationMatrix,
  calculateAutocorrelation
} from '../src/analytics/statistics';

describe('Statistics Engine', () => {
  const sample = [2, 4, 4, 4, 5, 5, 7, 9];

  it('calculates exact mean and sample variance', () => {
    // Mean = 40 / 8 = 5.0
    expect(calculateMean(sample)).toBe(5.0);

    // Sum of squared diffs: (2-5)^2 + 3*(4-5)^2 + 2*(5-5)^2 + (7-5)^2 + (9-5)^2 = 9 + 3 + 0 + 4 + 16 = 32
    // Sample variance = 32 / (8 - 1) = 32 / 7 = 4.57142857
    expect(calculateVariance(sample, true)).toBeCloseTo(32 / 7, 6);
    expect(calculateStandardDeviation(sample, true)).toBeCloseTo(Math.sqrt(32 / 7), 6);
  });

  it('annualizes monthly volatility with sqrt(12)', () => {
    const monthlyReturns = [0.02, -0.01, 0.03, 0.01, -0.02, 0.04];
    const std = calculateStandardDeviation(monthlyReturns, true);
    const annVol = calculateAnnualizedVolatility(monthlyReturns, 12);
    expect(annVol).toBeCloseTo(std * Math.sqrt(12), 6);
  });

  it('verifies covariance and correlation symmetry', () => {
    const x = [0.01, 0.03, -0.02, 0.04, 0.02];
    const y = [0.02, 0.05, -0.01, 0.06, 0.03];

    const covXY = calculateCovariance(x, y, true);
    const covYX = calculateCovariance(y, x, true);
    expect(covXY).toBeCloseTo(covYX, 8);

    const corrXY = calculateCorrelation(x, y);
    expect(corrXY).toBeGreaterThan(0.9); // Positively correlated
    expect(calculateCorrelation(x, x)).toBeCloseTo(1.0, 6);
  });

  it('generates symmetric NxN correlation matrix with 1.0 on diagonal', () => {
    const s1 = [0.01, 0.02, -0.01];
    const s2 = [-0.01, -0.02, 0.01];
    const matrix = calculateCorrelationMatrix([s1, s2]);

    expect(matrix[0][0]).toBe(1.0);
    expect(matrix[1][1]).toBe(1.0);
    expect(matrix[0][1]).toBeCloseTo(-1.0, 6); // Perfectly negatively correlated
    expect(matrix[1][0]).toBeCloseTo(matrix[0][1], 6);
  });

  it('calculates autocorrelation correctly', () => {
    const series = [0.01, 0.02, 0.01, 0.02, 0.01, 0.02, 0.01, 0.02];
    const ac = calculateAutocorrelation(series, 2);
    expect(ac).toHaveLength(2);
  });
});
