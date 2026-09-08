import { describe, it, expect } from 'vitest';
import { calculateXIRR, analyzeCashFlowTiming } from '../src/analytics/xirr';

describe('Exact Numerical XIRR Solver & Cash Flow Timing Engine', () => {
  it('solves exact 10.0% annualized return for a single 1-year deposit', () => {
    const flows = [
      { date: '2023-01-01', amount: -10000 },
      { date: '2024-01-01', amount: 11000 },
    ];

    const res = calculateXIRR(flows);
    expect(res.converged).toBe(true);
    expect(res.xirr).toBeCloseTo(0.10, 2);
  });

  it('converges accurately for multi-period irregular cash flows', () => {
    const flows = [
      { date: '2021-01-01', amount: -10000 },
      { date: '2021-07-01', amount: -2000 },
      { date: '2022-01-01', amount: 1000 },
      { date: '2023-01-01', amount: 13500 },
    ];

    const res = calculateXIRR(flows);
    expect(res.converged).toBe(true);
    expect(res.xirr).toBeGreaterThan(0.05);
    expect(res.xirr).toBeLessThan(0.15);
    expect(res.error).toBeLessThan(1e-4);
  });

  it('identifies favorable cash flow timing when capital is added at market troughs', () => {
    // Asset grew 5% TWR annualized, but user added heavy capital right before a surge
    const intermediate = [
      { date: '2022-06-01', amount: -10000, description: 'Added during dip' },
    ];

    const timing = analyzeCashFlowTiming(
      10000,
      intermediate,
      28000,
      '2023-01-01',
      0.08
    );

    expect(timing.moneyWeightedReturn).toBeGreaterThan(timing.timeWeightedReturn);
    expect(timing.timingAlpha).toBeGreaterThan(0);
    expect(timing.timingEffect).toBe('favorable');
    expect(timing.interpretation).toContain('Favorable cash flow timing');
  });

  it('identifies unfavorable timing when capital is added right before a drawdown', () => {
    const intermediate = [
      { date: '2021-12-01', amount: -20000, description: 'Added at peak' },
    ];

    const timing = analyzeCashFlowTiming(
      10000,
      intermediate,
      22000,
      '2023-01-01',
      0.15
    );

    expect(timing.moneyWeightedReturn).toBeLessThan(timing.timeWeightedReturn);
    expect(timing.timingAlpha).toBeLessThan(0);
    expect(timing.timingEffect).toBe('unfavorable');
    expect(timing.interpretation).toContain('Unfavorable cash flow timing');
  });
});
