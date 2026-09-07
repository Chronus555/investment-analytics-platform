import { describe, it, expect } from 'vitest';
import { runAssetClassBacktest } from '../src/analytics/assetClassBacktest';
import { ASSET_ALLOCATION_PRESETS } from '../src/data/assetClassData';

describe('Multi-Decade Asset Class Backtesting Engine', () => {
  it('simulates 54 years of historical compounding (1972-2025) with exact annual progression', () => {
    const p6040 = ASSET_ALLOCATION_PRESETS.find((p) => p.id === 'classic_60_40')!;

    const result = runAssetClassBacktest({
      portfolios: [
        {
          id: 'p1',
          name: p6040.name,
          weights: p6040.weights,
        },
      ],
      startYear: 1972,
      endYear: 2025,
      initialAmount: 10000,
      rebalancing: 'annual',
    });

    expect(result.years.length).toBe(54);
    expect(result.portfolios[0].annualSeries.length).toBe(54);
    expect(result.portfolios[0].annualSeries[0].year).toBe(1972);
    expect(result.portfolios[0].annualSeries[53].year).toBe(2025);

    // Initial $10k must compound into a substantial terminal balance over 54 years
    const finalNom = result.portfolios[0].kpis.finalNominalBalance;
    expect(finalNom).toBeGreaterThan(500000); // 60/40 historically grows >$500k from $10k
    expect(result.portfolios[0].kpis.nominalCagr).toBeGreaterThan(0.08); // >8% CAGR
    expect(result.portfolios[0].kpis.annualVolatility).toBeGreaterThan(0.08);
  });

  it('mathematically verifies Fisher equation for real inflation-adjusted wealth', () => {
    const result = runAssetClassBacktest({
      portfolios: [
        {
          id: 'p1',
          name: 'US Large Cap',
          weights: { US_LARGE_CAP: 1.0 },
        },
      ],
      startYear: 1972,
      endYear: 2025,
      initialAmount: 10000,
    });

    const series = result.portfolios[0].annualSeries;
    const cpiSeries = result.cpiSeries;

    for (let i = 0; i < series.length; i++) {
      const nom = series[i].nominalWealth;
      const real = series[i].realWealth;
      const factor = cpiSeries[i].cumulativeInflationFactor;

      // realWealth must equal nominalWealth / factor
      expect(real).toBeCloseTo(nom / factor, 1);
    }

    // Real CAGR should be lower than Nominal CAGR due to positive historical inflation
    expect(result.portfolios[0].kpis.realCagr).toBeLessThan(result.portfolios[0].kpis.nominalCagr);
    expect(result.portfolios[0].kpis.realCagr).toBeGreaterThan(0.04);
  });

  it('accurately isolates historical crisis performance across macroeconomic regimes', () => {
    const allWeather = ASSET_ALLOCATION_PRESETS.find((p) => p.id === 'all_weather')!;

    const result = runAssetClassBacktest({
      portfolios: [
        {
          id: 'us_stock',
          name: '100% US Equities',
          weights: { US_LARGE_CAP: 1.0 },
        },
        {
          id: 'all_weather',
          name: 'All Weather',
          weights: allWeather.weights,
        },
      ],
      startYear: 1972,
      endYear: 2025,
    });

    const stockCrises = result.portfolios[0].crises;
    const awCrises = result.portfolios[1].crises;

    // 1973-1974 Stagflation: Equities suffered severely while All Weather with gold/commodities had buffer
    const stagStock = stockCrises.find((c) => c.crisisId === 'stagflation_1973')!;
    const stagAw = awCrises.find((c) => c.crisisId === 'stagflation_1973')!;

    expect(stagStock.periodReturn).toBeLessThan(-0.30); // S&P dropped > 35% nominal
    expect(stagAw.periodReturn).toBeGreaterThan(stagStock.periodReturn);

    // 2008 GFC: All Weather held Long Treasuries and was heavily cushioned
    const gfcStock = stockCrises.find((c) => c.crisisId === 'gfc_2008')!;
    const gfcAw = awCrises.find((c) => c.crisisId === 'gfc_2008')!;

    expect(gfcStock.maxDrawdown).toBeLessThan(-0.30);
    expect(gfcAw.maxDrawdown).toBeGreaterThan(gfcStock.maxDrawdown);
  });

  it('computes exact decade attribution matrices across 6 secular decades', () => {
    const result = runAssetClassBacktest({
      portfolios: [
        {
          id: 'p1',
          name: '60/40',
          weights: { US_LARGE_CAP: 0.60, TOTAL_BOND: 0.40 },
        },
      ],
      startYear: 1972,
      endYear: 2025,
    });

    const decades = result.portfolios[0].decades;
    expect(decades.length).toBe(6);

    const decadeNames = decades.map((d) => d.decadeName);
    expect(decadeNames[0]).toContain('1970s');
    expect(decadeNames[1]).toContain('1980s');
    expect(decadeNames[2]).toContain('1990s');
    expect(decadeNames[3]).toContain('2000s');
    expect(decadeNames[4]).toContain('2010s');
    expect(decadeNames[5]).toContain('2020s');

    // 1980s and 1990s were explosive bull markets (>12% CAGR for 60/40)
    expect(decades[1].cagr).toBeGreaterThan(0.12);
    expect(decades[2].cagr).toBeGreaterThan(0.12);
  });

  it('confirms risk reduction in Permanent Portfolio vs 100% Equities', () => {
    const perm = ASSET_ALLOCATION_PRESETS.find((p) => p.id === 'permanent_portfolio')!;

    const result = runAssetClassBacktest({
      portfolios: [
        {
          id: 'p_equity',
          name: '100% US Equities',
          weights: { US_LARGE_CAP: 1.0 },
        },
        {
          id: 'p_perm',
          name: 'Permanent Portfolio',
          weights: perm.weights,
        },
      ],
      startYear: 1972,
      endYear: 2025,
    });

    const eqKpi = result.portfolios[0].kpis;
    const permKpi = result.portfolios[1].kpis;

    // Permanent portfolio volatility must be dramatically lower (~7-9% vs ~16-18%)
    expect(permKpi.annualVolatility).toBeLessThan(eqKpi.annualVolatility * 0.65);

    // Permanent portfolio max drawdown must be substantially less severe than pure equities (-15% to -20% vs -50%)
    expect(permKpi.maxDrawdownNominal).toBeGreaterThan(eqKpi.maxDrawdownNominal);
  });
});
