import { describe, it, expect } from 'vitest';
import {
  getGlidePathWeights,
  runDynamicAllocationBacktest,
  TargetDateConfig,
  PhaseConfig,
} from '../src/analytics/dynamicAllocation';

describe('Dynamic Asset Allocation & Glide Path Engine', () => {
  it('correctly calculates age-based linear glide path weights', () => {
    const config: TargetDateConfig = {
      startAge: 25,
      retirementAge: 65,
      initialEquityWeight: 0.90,
      terminalEquityWeight: 0.40,
      growthAssets: [{ symbol: 'SPY', weightShare: 1.0 }],
      safetyAssets: [{ symbol: 'BND', weightShare: 1.0 }],
    };

    // Period 0 (start)
    const w0 = getGlidePathWeights(config, 0, 100);
    expect(w0['SPY']).toBeCloseTo(0.90, 4);
    expect(w0['BND']).toBeCloseTo(0.10, 4);

    // Period 99 (terminal)
    const wT = getGlidePathWeights(config, 99, 100);
    expect(wT['SPY']).toBeCloseTo(0.40, 4);
    expect(wT['BND']).toBeCloseTo(0.60, 4);

    // Midpoint (approx period 50)
    const wMid = getGlidePathWeights(config, 49.5, 100);
    expect(wMid['SPY']).toBeCloseTo(0.65, 2);
    expect(wMid['BND']).toBeCloseTo(0.35, 2);
  });

  it('runs dynamic glide path backtest and produces monotonically transitioning weights', () => {
    const dates = Array.from({ length: 48 }, (_, i) => `2020-${String((i % 12) + 1).padStart(2, '0')}`);
    const returnsData = {
      SPY: Array.from({ length: 48 }, () => 0.01),
      BND: Array.from({ length: 48 }, () => 0.003),
    };

    const config: TargetDateConfig = {
      startAge: 30,
      retirementAge: 60,
      initialEquityWeight: 0.80,
      terminalEquityWeight: 0.40,
      growthAssets: [{ symbol: 'SPY', weightShare: 1.0 }],
      safetyAssets: [{ symbol: 'BND', weightShare: 1.0 }],
    };

    const res = runDynamicAllocationBacktest(
      dates,
      returnsData,
      'glide_path',
      config,
      undefined,
      'monthly',
      10000,
      0.04
    );

    expect(res.periods.length).toBe(48);
    expect(res.finalBalance).toBeGreaterThan(10000);
    expect(res.phases.length).toBe(3); // 3 lifecycle stages

    // Initial equity weight should be ~80%
    expect(res.periods[0].weights['SPY']).toBeCloseTo(0.80, 2);
    // Terminal equity weight should be ~40%
    expect(res.periods[47].weights['SPY']).toBeCloseTo(0.40, 2);
  });

  it('correctly transitions weights across discrete multi-phase historical regimes', () => {
    const dates = [
      '2018-01', '2018-06', '2018-12',
      '2019-01', '2019-06', '2019-12',
      '2020-01', '2020-06', '2020-12',
    ];
    const returnsData = {
      SPY: [0.02, 0.01, -0.05, 0.03, 0.02, 0.04, -0.10, 0.05, 0.03],
      TLT: [-0.01, 0.00, 0.04, 0.01, 0.03, -0.02, 0.08, -0.01, 0.01],
      GLD: [0.01, -0.02, 0.03, 0.02, 0.04, 0.02, 0.04, 0.02, -0.01],
    };

    const phases: PhaseConfig[] = [
      {
        id: 'phase-1',
        name: 'Aggressive Growth',
        startDate: '2018-01',
        endDate: '2018-12',
        weights: { SPY: 0.80, TLT: 0.20 },
      },
      {
        id: 'phase-2',
        name: 'Core Balanced',
        startDate: '2019-01',
        endDate: '2019-12',
        weights: { SPY: 0.50, TLT: 0.30, GLD: 0.20 },
      },
      {
        id: 'phase-3',
        name: 'Preservation',
        startDate: '2020-01',
        endDate: '2020-12',
        weights: { SPY: 0.20, TLT: 0.50, GLD: 0.30 },
      },
    ];

    const res = runDynamicAllocationBacktest(
      dates,
      returnsData,
      'multi_phase',
      undefined,
      phases,
      'monthly',
      10000,
      0.04
    );

    expect(res.periods.length).toBe(9);
    expect(res.phases.length).toBe(3);

    // Phase 1 (2018) should hold SPY & TLT
    expect(res.periods[0].weights['SPY']).toBeCloseTo(0.80, 2);
    expect(res.periods[0].weights['GLD'] || 0).toBe(0);

    // Phase 2 (2019) should hold GLD
    expect(res.periods[3].weights['GLD']).toBeCloseTo(0.20, 2);

    // Phase 3 (2020) starts at 20% target and drifts to ~17.4% after -10% return
    expect(res.periods[6].weights['SPY']).toBeCloseTo(0.174, 2);
  });

  it('matches static 60/40 benchmark when dynamic weights are fixed at 60/40', () => {
    const dates = ['2021-01', '2021-02', '2021-03', '2021-04'];
    const returnsData = {
      SPY: [0.02, -0.01, 0.03, 0.01],
      BND: [-0.005, 0.002, -0.001, 0.004],
    };

    const phases: PhaseConfig[] = [
      {
        id: 'static-phase',
        name: 'Static 60/40',
        startDate: '2021-01',
        endDate: '2021-04',
        weights: { SPY: 0.60, BND: 0.40 },
      },
    ];

    const res = runDynamicAllocationBacktest(
      dates,
      returnsData,
      'multi_phase',
      undefined,
      phases,
      'monthly',
      10000,
      0.04
    );

    // Should match benchmark6040 ending value closely
    const lastPeriod = res.periods[res.periods.length - 1];
    const lastBench = res.benchmark6040Periods[res.benchmark6040Periods.length - 1];
    expect(lastPeriod.value).toBeCloseTo(lastBench.value, 1);
  });
});
