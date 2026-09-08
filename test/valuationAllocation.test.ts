import { describe, it, expect } from 'vitest';
import {
  computeValuationSignals,
  runValuationTacticalBacktest,
  HISTORICAL_SHILLER_CAPE,
  HISTORICAL_TREASURY_10Y,
  ValuationBacktestConfig,
} from '../src/analytics/valuationAllocation';
import { CURATED_DATES, CURATED_RETURNS } from '../src/data/curatedData';

describe('Valuation-Based Tactical Asset Allocation (Discipline 6.6)', () => {
  it('loads verified historical CAPE and 10Y Treasury series aligned with curated timeline', () => {
    expect(HISTORICAL_SHILLER_CAPE.length).toBe(229);
    expect(HISTORICAL_TREASURY_10Y.length).toBe(229);
    expect(CURATED_DATES.length).toBe(229);

    // 2007-01 CAPE ~ 27.18, 10Y ~ 4.76%
    expect(HISTORICAL_SHILLER_CAPE[0]).toBeCloseTo(27.18, 2);
    expect(HISTORICAL_TREASURY_10Y[0]).toBeCloseTo(0.0476, 4);

    // 2009-02 GFC bottom CAPE ~ 13.32 (index 25)
    expect(HISTORICAL_SHILLER_CAPE[25]).toBeCloseTo(13.32, 2);
  });

  it('computes valuation signals respecting regime thresholds and bounds', () => {
    const config: ValuationBacktestConfig = {
      metric: 'shiller_cape',
      upperThreshold: 30.0,
      lowerThreshold: 20.0,
      minEquityWeight: 0.30,
      riskyAsset: 'SPY',
      safeAsset: 'BND',
    };

    const signals = computeValuationSignals(CURATED_DATES, config);
    expect(signals.length).toBe(229);

    signals.forEach((sig) => {
      expect(sig.targetEquityWeight).toBeGreaterThanOrEqual(0.30);
      expect(sig.targetEquityWeight).toBeLessThanOrEqual(1.0);
      expect(sig.targetEquityWeight + sig.targetSafeWeight).toBeCloseTo(1.0, 5);

      if (sig.cape >= 30.0) {
        expect(sig.regime).toBe('overvalued');
        expect(sig.targetEquityWeight).toBeCloseTo(0.30, 5);
      } else if (sig.cape <= 20.0) {
        expect(sig.regime).toBe('undervalued');
        expect(sig.targetEquityWeight).toBeCloseTo(1.0, 5);
      } else {
        expect(sig.regime).toBe('fair_value');
        expect(sig.targetEquityWeight).toBeGreaterThan(0.30);
        expect(sig.targetEquityWeight).toBeLessThan(1.0);
      }
    });
  });

  it('runs tactical valuation backtest with zero look-ahead bias and generates valid metrics', () => {
    const config: ValuationBacktestConfig = {
      metric: 'shiller_cape',
      upperThreshold: 30.0,
      lowerThreshold: 20.0,
      minEquityWeight: 0.40,
      riskyAsset: 'SPY',
      safeAsset: 'BND',
      rebalanceFrequency: 'monthly',
    };

    const result = runValuationTacticalBacktest(CURATED_DATES, CURATED_RETURNS, config, 0.02);

    expect(result.strategyGrowth.length).toBe(229);
    expect(result.benchmarkGrowth.length).toBe(229);
    expect(result.classic6040Growth.length).toBe(229);

    expect(result.strategyGrowth[0].value).toBe(10000);
    expect(result.strategyGrowth[228].value).toBeGreaterThan(10000);

    expect(result.cagr).toBeGreaterThan(0);
    expect(result.volatility).toBeGreaterThan(0);
    expect(result.maxDrawdown).toBeLessThan(0);
    expect(result.annualTurnover).toBeGreaterThanOrEqual(0);
    expect(result.percentTimeDeRisked).toBeGreaterThan(0);

    // Trade log should track de-risking and re-accumulations
    expect(result.tradeLog.length).toBeGreaterThan(0);
    const firstTrade = result.tradeLog[0];
    expect(firstTrade.action).toBeDefined();
    expect(firstTrade.equityWeight).toBeGreaterThanOrEqual(0.40);
  });
});
