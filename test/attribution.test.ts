import { describe, it, expect } from 'vitest';
import {
  calculateActiveMetrics,
  calculateRollingActiveMetrics,
} from '../src/analytics/attribution';

describe('Manager Performance & Active Risk Attribution Engine', () => {
  it('correctly handles identical manager and benchmark series', () => {
    const returns = [0.01, -0.02, 0.03, 0.015, -0.01, 0.02, 0.025, -0.005, 0.01, 0.03, -0.015, 0.02];
    const dates = returns.map((_, i) => `2023-${String(i + 1).padStart(2, '0')}`);

    const metrics = calculateActiveMetrics(returns, returns, dates, 0.04);

    // Beta should be 1.0
    expect(metrics.beta).toBeCloseTo(1.0, 4);
    // Alpha should be 0.0
    expect(metrics.annualizedAlpha).toBeCloseTo(0.0, 4);
    // Tracking error should be 0.0
    expect(metrics.trackingError).toBeCloseTo(0.0, 4);
    // Batting average: no months strictly > benchmark
    expect(metrics.battingAverage).toBe(0);
    // Up & down capture should be 100%
    expect(metrics.upCapture).toBeCloseTo(100, 1);
    expect(metrics.downCapture).toBeCloseTo(100, 1);
    expect(metrics.captureRatio).toBeCloseTo(1.0, 2);
  });

  it('correctly detects pure positive alpha generator (Rp = Rb + 1% per month)', () => {
    const bRets = [0.01, -0.02, 0.03, 0.015, -0.01, 0.02, 0.025, -0.005, 0.01, 0.03, -0.015, 0.02];
    const pRets = bRets.map((r) => r + 0.01);
    const dates = bRets.map((_, i) => `2023-${String(i + 1).padStart(2, '0')}`);

    const metrics = calculateActiveMetrics(pRets, bRets, dates, 0.04);

    // Beta should still be 1.0 (parallel shift)
    expect(metrics.beta).toBeCloseTo(1.0, 4);
    // Monthly alpha is exactly 0.01 -> Annualized ~ (1.01^12 - 1) = 12.68%
    expect(metrics.annualizedAlpha).toBeCloseTo(Math.pow(1.01, 12) - 1, 3);
    // Batting average should be 100%
    expect(metrics.battingAverage).toBe(100);
    expect(metrics.winMonths).toBe(12);
    expect(metrics.lossMonths).toBe(0);
    // Tracking error is zero because diff is constant 0.01
    expect(metrics.trackingError).toBeCloseTo(0, 4);
  });

  it('correctly quantifies levered beta (Rp = 1.5 * Rb)', () => {
    const bRets = [0.02, -0.01, 0.03, -0.02, 0.015, 0.025, -0.015, 0.01, 0.035, -0.005, 0.02, -0.03];
    const pRets = bRets.map((r) => r * 1.5);
    const dates = bRets.map((_, i) => `2023-${String(i + 1).padStart(2, '0')}`);

    const metrics = calculateActiveMetrics(pRets, bRets, dates, 0.0);

    // Beta should be 1.5
    expect(metrics.beta).toBeCloseTo(1.5, 3);
    // R-squared is 1.0
    expect(metrics.rSquared).toBeCloseTo(1.0, 3);
    // Up capture and down capture should both be > 100%
    expect(metrics.upCapture).toBeGreaterThan(120);
    expect(metrics.downCapture).toBeGreaterThan(120);
  });

  it('correctly computes rolling active metrics across lookback windows', () => {
    // Generate 36 months of returns
    const bRets = Array.from({ length: 36 }, (_, i) => Math.sin(i) * 0.03 + 0.008);
    const pRets = bRets.map((r, i) => r + (i % 2 === 0 ? 0.005 : -0.002));
    const dates = Array.from({ length: 36 }, (_, i) => `2021-${String((i % 12) + 1).padStart(2, '0')}`);

    const rolling24 = calculateRollingActiveMetrics(pRets, bRets, dates, 24, 0.04);

    // Window = 24 with 36 points -> 36 - 24 + 1 = 13 points
    expect(rolling24.length).toBe(13);
    expect(rolling24[0].date).toBe(dates[23]);
    expect(rolling24[12].date).toBe(dates[35]);

    for (const pt of rolling24) {
      expect(typeof pt.alpha).toBe('number');
      expect(typeof pt.beta).toBe('number');
      expect(typeof pt.trackingError).toBe('number');
      expect(pt.beta).toBeGreaterThan(0.5);
      expect(pt.beta).toBeLessThan(1.5);
    }
  });
});
