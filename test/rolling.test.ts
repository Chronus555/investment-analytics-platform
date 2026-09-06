import { describe, it, expect } from 'vitest';
import {
  calculateRollingReturns,
  calculateRollingVolatility,
  calculateRollingSharpe,
  calculateRollingBeta,
} from '../src/analytics/returns';

describe('Rolling Performance Metrics', () => {
  const mockReturns = [
    0.01, 0.02, -0.01, 0.03, 0.02, -0.02,
    0.01, 0.04, -0.03, 0.02, 0.01, 0.03,
    0.02, 0.01, -0.01, 0.02, 0.03, 0.01,
  ];

  it('calculates 12-month rolling returns', () => {
    const rolling12 = calculateRollingReturns(mockReturns, 12, 12);
    expect(rolling12.length).toBe(mockReturns.length - 12 + 1);
    expect(typeof rolling12[0]).toBe('number');
  });

  it('calculates 12-month rolling volatility', () => {
    const rollingVol = calculateRollingVolatility(mockReturns, 12, 12);
    expect(rollingVol.length).toBe(mockReturns.length - 12 + 1);
    expect(rollingVol[0]).toBeGreaterThan(0);
  });

  it('calculates 12-month rolling Sharpe ratio', () => {
    const rollingSharpe = calculateRollingSharpe(mockReturns, 12, 0.04, 12);
    expect(rollingSharpe.length).toBe(mockReturns.length - 12 + 1);
    expect(typeof rollingSharpe[0]).toBe('number');
  });

  it('calculates rolling Beta against benchmark', () => {
    const benchmark = mockReturns.map((r) => r * 0.8 + 0.005);
    const rollingBeta = calculateRollingBeta(mockReturns, benchmark, 12);
    expect(rollingBeta.length).toBe(mockReturns.length - 12 + 1);
    // Should be close to 1.25 since asset = 1.25 * (benchmark - 0.005)
    expect(rollingBeta[0]).toBeGreaterThan(1.0);
    expect(rollingBeta[0]).toBeLessThan(1.5);
  });
});