import { describe, it, expect } from 'vitest';
import {
  calculateMaxDrawdown,
  calculateDrawdownSeries,
  calculateUlcerIndex,
  findDrawdownEpisodes
} from '../src/analytics/drawdowns';

describe('Drawdowns Engine', () => {
  it('calculates exact analytical max drawdown', () => {
    // Peak is 120, trough is 80 -> Drawdown = (80 - 120) / 120 = -40 / 120 = -0.333333
    const values = [100, 120, 90, 80, 110, 130];
    const mdd = calculateMaxDrawdown(values);
    expect(mdd).toBeCloseTo(-1 / 3, 6);
  });

  it('tracks underwater series correctly', () => {
    const dates = ['T0', 'T1', 'T2', 'T3'];
    const values = [100, 120, 90, 120];
    const series = calculateDrawdownSeries(dates, values);

    expect(series[0].drawdown).toBe(0);
    expect(series[1].drawdown).toBe(0); // New high
    expect(series[2].drawdown).toBeCloseTo(-0.25, 4); // (90 - 120) / 120 = -25%
    expect(series[3].drawdown).toBe(0); // Recovered
  });

  it('identifies drawdown episodes and recovery', () => {
    const dates = ['2007-10', '2008-01', '2009-03', '2012-05'];
    const values = [100, 85, 50, 105]; // GFC style: Peak 100, trough 50 (-50%), recovers at 105
    const episodes = findDrawdownEpisodes(dates, values, 5);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].depth).toBeCloseTo(-0.50, 4);
    expect(episodes[0].peakDate).toBe('2007-10');
    expect(episodes[0].troughDate).toBe('2009-03');
    expect(episodes[0].recoveryDate).toBe('2012-05');
    expect(episodes[0].isRecovered).toBe(true);
  });

  it('calculates Ulcer Index for drawdowns', () => {
    const dds = [0, -0.10, -0.20, 0];
    const ui = calculateUlcerIndex(dds);
    // sqrt((0^2 + 10^2 + 20^2 + 0^2) / 4) = sqrt(500 / 4) = sqrt(125) = 11.1803
    expect(ui).toBeCloseTo(Math.sqrt(125), 4);
  });
});
