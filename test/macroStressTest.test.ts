import { describe, it, expect } from 'vitest';
import {
  runMacroStressTest,
  calculateAssetStressReturn,
  getAssetSensitivities,
  MACRO_HISTORICAL_PRESETS,
  MacroFactorShock,
} from '@/analytics/macroStressTest';

describe('Custom Macro Scenario Stress-Testing Engine', () => {
  it('loads all 6 historical crisis analog presets with non-zero shocks', () => {
    expect(MACRO_HISTORICAL_PRESETS.length).toBe(6);
    MACRO_HISTORICAL_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.period).toBeDefined();
      expect(preset.shock.equityShockPct).toBeLessThan(0); // All crises feature equity drawdowns
    });
  });

  it('calculates duration and convexity bond price responses to interest rate shocks', () => {
    const tltSens = getAssetSensitivities('TLT');
    const shySens = getAssetSensitivities('SHY');

    expect(tltSens.durationYears).toBeGreaterThan(shySens.durationYears);
    expect(tltSens.convexity).toBeGreaterThan(shySens.convexity);

    // Test a +300 bps rate hike shock
    const rateShock: MacroFactorShock = {
      equityShockPct: 0,
      rateShockBps: 300,
      creditSpreadBps: 0,
      oilShockPct: 0,
      inflationShockPct: 0,
    };

    const tltImpact = calculateAssetStressReturn(tltSens, rateShock);
    const shyImpact = calculateAssetStressReturn(shySens, rateShock);

    // TLT (long duration) must drop substantially more than SHY (short duration)
    expect(tltImpact.ratesImpact).toBeLessThan(shyImpact.ratesImpact);
    expect(tltImpact.ratesImpact).toBeLessThan(-0.40); // ~-48% drop for 16.8 yr duration
    expect(shyImpact.ratesImpact).toBeGreaterThan(-0.10); // ~-5.7% drop for 1.9 yr duration
  });

  it('demonstrates safe-haven flight-to-quality during 2008 GFC liquidity collapse', () => {
    const gfcPreset = MACRO_HISTORICAL_PRESETS.find((p) => p.id === 'gfc_2008')!;
    expect(gfcPreset).toBeDefined();

    // 100% Equity Portfolio
    const equityPortfolio = [{ symbol: 'SPY', weight: 1.0 }];
    const equityResult = runMacroStressTest(equityPortfolio, gfcPreset.shock, {
      initialBalance: 100000,
      benchmarkSymbol: 'SPY',
    });

    // Ray Dalio All Weather Balanced Portfolio (Equities, Long Treasuries, Gold, Commodities)
    const balancedPortfolio = [
      { symbol: 'SPY', weight: 0.30 },
      { symbol: 'TLT', weight: 0.40 },
      { symbol: 'IEF', weight: 0.15 },
      { symbol: 'GLD', weight: 0.075 },
      { symbol: 'DBC', weight: 0.075 },
    ];
    const balancedResult = runMacroStressTest(balancedPortfolio, gfcPreset.shock, {
      initialBalance: 100000,
      benchmarkSymbol: 'SPY',
    });

    // Equity portfolio suffers severe drop (> -50%)
    expect(equityResult.portfolioShockReturn).toBeLessThan(-0.45);
    expect(equityResult.estimatedDollarLoss).toBeLessThan(-45000);

    // Balanced portfolio outperforms equity portfolio due to safe-haven Treasury & Gold surge
    expect(balancedResult.portfolioShockReturn).toBeGreaterThan(equityResult.portfolioShockReturn);
    expect(balancedResult.resilienceAlpha).toBeGreaterThan(0.20); // Outperforms benchmark by >20%
    expect(balancedResult.resilienceScore).toBeGreaterThan(equityResult.resilienceScore);
  });

  it('correctly propagates 1973 Stagflation shocks where Gold cushions equity and bond rout', () => {
    const stagflation = MACRO_HISTORICAL_PRESETS.find((p) => p.id === 'stagflation_1973')!;
    expect(stagflation).toBeDefined();

    const permanentPortfolio = [
      { symbol: 'SPY', weight: 0.25 },
      { symbol: 'TLT', weight: 0.25 },
      { symbol: 'GLD', weight: 0.25 },
      { symbol: 'CASH', weight: 0.25 },
    ];

    const result = runMacroStressTest(permanentPortfolio, stagflation.shock, {
      initialBalance: 50000,
      benchmarkSymbol: 'SPY',
    });

    const gldAttribution = result.assetAttributions.find((a) => a.symbol === 'GLD')!;
    const tltAttribution = result.assetAttributions.find((a) => a.symbol === 'TLT')!;

    // Gold surges under oil and CPI inflation shock
    expect(gldAttribution.assetTotalReturn).toBeGreaterThan(0.10);
    expect(gldAttribution.hedgeStatus).toBe('hedged');

    // Long Treasuries suffer from rate hikes and inflation
    expect(tltAttribution.assetTotalReturn).toBeLessThan(-0.30);
    expect(tltAttribution.hedgeStatus).toBe('loss_driver');

    // Permanent portfolio resilience alpha vs 100% SPY
    expect(result.resilienceAlpha).toBeGreaterThan(0.15);
  });

  it('handles custom user-dialed shocks and computes recovery timeline', () => {
    const customShock: MacroFactorShock = {
      equityShockPct: -0.15,
      rateShockBps: 150,
      creditSpreadBps: 100,
      oilShockPct: 0.20,
      inflationShockPct: 0.02,
    };

    const classic6040 = [
      { symbol: 'SPY', weight: 0.60 },
      { symbol: 'BND', weight: 0.40 },
    ];

    const result = runMacroStressTest(classic6040, customShock, {
      initialBalance: 10000,
      expectedAnnualReturn: 0.07,
    });

    expect(result.portfolioShockReturn).toBeLessThan(0);
    expect(result.estimatedDollarLoss).toBeLessThan(0);
    expect(result.endingPortfolioBalance).toBeLessThan(10000);
    expect(result.projectedRecoveryMonths).toBeGreaterThan(0);
    expect(result.factorDecomposition.totalStressPct).toBeCloseTo(result.portfolioShockReturn, 5);
  });
});
