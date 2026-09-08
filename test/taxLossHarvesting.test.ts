import { describe, it, expect } from 'vitest';
import { runTaxLossHarvestingSimulation, DEFAULT_PROXY_PAIRS } from '../src/analytics/taxLossHarvesting';
import { AssetPeriodReturn } from '../src/analytics/backtest';

describe('Tax-Loss Harvesting (TLH) & Direct Indexing Simulator', () => {
  // Synthetic 24-month returns: 12 months down, 12 months up
  const syntheticPeriodData: AssetPeriodReturn[] = [];
  for (let i = 0; i < 24; i++) {
    const year = 2020 + Math.floor(i / 12);
    const month = ((i % 12) + 1).toString().padStart(2, '0');
    const date = `${year}-${month}-01`;
    // First 6 months drop -4% each month (down ~22% cumulative)
    // Then rebound +3% each month
    const spyRet = i < 6 ? -0.04 : 0.03;
    const tltRet = i < 6 ? 0.01 : -0.01;

    syntheticPeriodData.push({
      date,
      returns: {
        SPY: spyRet,
        SPLG: spyRet,
        TLT: tltRet,
        SPTL: tltRet,
      },
    });
  }

  const testAssets = [
    { symbol: 'SPY', weight: 0.60 },
    { symbol: 'TLT', weight: 0.40 },
  ];

  it('triggers tax-loss harvesting when unrealized losses exceed threshold', () => {
    const result = runTaxLossHarvestingSimulation(testAssets, syntheticPeriodData, {
      initialBalance: 10000,
      harvestThresholdPct: -0.05,
      minDollarLoss: 50,
    });

    expect(result).toBeDefined();
    expect(result.totalHarvestEvents).toBeGreaterThan(0);
    expect(result.cumulativeLossesHarvested).toBeGreaterThan(0);
    expect(result.cumulativeTaxSavings).toBeGreaterThan(0);
  });

  it('enforces wash-sale rules by reallocating harvested funds into correlated proxy tickers', () => {
    const result = runTaxLossHarvestingSimulation(testAssets, syntheticPeriodData, {
      initialBalance: 10000,
      harvestThresholdPct: -0.05,
      minDollarLoss: 50,
      proxyMap: { SPY: 'SPLG', TLT: 'SPTL' },
    });

    const spyHarvests = result.harvestEvents.filter((e) => e.primarySymbol === 'SPY');
    expect(spyHarvests.length).toBeGreaterThan(0);
    spyHarvests.forEach((e) => {
      expect(e.proxySymbol).toBe('SPLG');
      expect(e.realizedLoss).toBeGreaterThan(0);
    });

    expect(result.washSalesPrevented).toBe(result.totalHarvestEvents);
  });

  it('generates positive Tax Alpha by reinvesting ordinary income tax offsets', () => {
    const result = runTaxLossHarvestingSimulation(testAssets, syntheticPeriodData, {
      initialBalance: 10000,
      harvestThresholdPct: -0.05,
      minDollarLoss: 50,
      ordinaryTaxRate: 0.24,
      maxOrdinaryOffset: 3000,
    });

    // Reinvesting tax savings should boost final wealth compared to non-harvested baseline
    expect(result.harvestedEndingBalance).toBeGreaterThan(result.baselineEndingBalance);
    expect(result.taxAlphaBps).toBeGreaterThan(0);
    expect(result.netWealthGain).toBeGreaterThan(0);
  });

  it('carries forward excess capital losses when annual loss exceeds ordinary deduction cap', () => {
    const largeDropData: AssetPeriodReturn[] = [
      { date: '2021-01-01', returns: { SPY: -0.40, SPLG: -0.40, TLT: 0.0 } },
      { date: '2021-12-01', returns: { SPY: 0.0, SPLG: 0.0, TLT: 0.0 } },
      { date: '2022-12-01', returns: { SPY: 0.10, SPLG: 0.10, TLT: 0.0 } },
    ];

    const result = runTaxLossHarvestingSimulation(
      [{ symbol: 'SPY', weight: 1.0 }],
      largeDropData,
      {
        initialBalance: 20000, // $8,000 loss on 40% drop
        harvestThresholdPct: -0.10,
        maxOrdinaryOffset: 3000, // only $3,000 used in year 1
      }
    );

    const year1 = result.annualAudit.find((a) => a.year === 2021);
    expect(year1).toBeDefined();
    if (year1) {
      expect(year1.ordinaryIncomeOffset).toBeLessThanOrEqual(3000);
      expect(year1.lossCarryforward).toBeGreaterThan(0);
    }
  });

  it('produces zero harvest events in an uninterrupted bull market where no losses occur', () => {
    const bullData: AssetPeriodReturn[] = [
      { date: '2023-01-01', returns: { SPY: 0.02, SPLG: 0.02 } },
      { date: '2023-02-01', returns: { SPY: 0.03, SPLG: 0.03 } },
      { date: '2023-03-01', returns: { SPY: 0.02, SPLG: 0.02 } },
    ];

    const result = runTaxLossHarvestingSimulation(
      [{ symbol: 'SPY', weight: 1.0 }],
      bullData,
      { harvestThresholdPct: -0.05 }
    );

    expect(result.totalHarvestEvents).toBe(0);
    expect(result.cumulativeLossesHarvested).toBe(0);
    expect(result.taxAlphaBps).toBe(0);
  });
});
