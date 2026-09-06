import { describe, it, expect } from 'vitest';
import { calculateRollingCorrelation } from '../src/analytics/statistics';

describe('Rolling Pairwise Correlation', () => {
  const dates = Array.from({ length: 24 }, (_, i) => '2020-' + String(i + 1).padStart(2, '0'));
  const x = [
    0.02, 0.03, -0.01, 0.04, 0.01, -0.02,
    0.05, -0.03, 0.02, 0.01, 0.03, -0.01,
    0.02, 0.04, -0.02, 0.01, 0.03, 0.00,
    -0.01, 0.02, 0.05, -0.04, 0.01, 0.03
  ];

  it('calculates perfect 1.0 correlation for identical series', () => {
    const rolling = calculateRollingCorrelation(x, x, dates, 12);
    expect(rolling.length).toBe(13); // 24 - 12 + 1
    rolling.forEach((pt) => {
      expect(pt.correlation).toBeCloseTo(1.0, 4);
    });
  });

  it('calculates perfect -1.0 correlation for perfectly inverted series', () => {
    const y = x.map((v) => -v);
    const rolling = calculateRollingCorrelation(x, y, dates, 12);
    expect(rolling.length).toBe(13);
    rolling.forEach((pt) => {
      expect(pt.correlation).toBeCloseTo(-1.0, 4);
    });
  });

  it('returns empty array when series length is shorter than window', () => {
    const rolling = calculateRollingCorrelation(x.slice(0, 5), x.slice(0, 5), dates.slice(0, 5), 12);
    expect(rolling).toEqual([]);
  });

  it('handles custom 24-month window', () => {
    const rolling24 = calculateRollingCorrelation(x, x, dates, 24);
    expect(rolling24.length).toBe(1);
    expect(rolling24[0].date).toBe('2020-24');
    expect(rolling24[0].correlation).toBeCloseTo(1.0, 4);
  });
});
