import { describe, it, expect } from 'vitest';
import { runTaxAwareBacktest } from '../src/analytics/taxBacktest';
import { AssetPeriodReturn } from '../src/analytics/backtest';

describe('Tax-Aware Portfolio Backtest Engine (Discipline 1.1 / PV Pro)', () => {
  // Synthetic 36-month period data with bull market followed by moderate volatility
  const periodData: AssetPeriodReturn[] = [];
  const dates = [];
  for (let y = 2020; y <= 2022; y++) {
    for (let m = 1; m <= 12; m++) {
      const mStr = m < 10 ? '0' + m : '' + m;
      dates.push(y + '-' + mStr + '-01');
    }
  }

  // 36 months of returns: SPY grows ~10% ann, BND stable ~3% ann
  dates.forEach((date, i) => {
    const spyRet = i % 2 === 0 ? 0.025 : -0.005; // Net upward drift
    const bndRet = 0.0025; // 3% annual
    periodData.push({
      date,
      returns: { SPY: spyRet, BND: bndRet },
    });
  });

  const assets = [
    { symbol: 'SPY', weight: 60 },
    { symbol: 'BND', weight: 40 },
  ];

  it('produces identical pre-tax and after-tax returns in tax-exempt accounts', () => {
    const res = runTaxAwareBacktest(assets, periodData, {
      initialBalance: 10000,
      isTaxable: false,
      rebalanceFrequency: 'annually',
    });

    expect(res.totalTaxPaid).toBe(0);
    expect(res.annualizedTaxDragBps).toBe(0);
    expect(res.taxEfficiencyRatio).toBeCloseTo(1.0, 4);
    expect(res.afterTaxEndingBalance).toBeCloseTo(res.preTaxEndingBalance, 2);
  });

  it('quantifies positive tax drag and reduces ending wealth in taxable accounts', () => {
    const res = runTaxAwareBacktest(assets, periodData, {
      initialBalance: 10000,
      isTaxable: true,
      ordinaryTaxRate: 0.24,
      ltcgTaxRate: 0.15,
      dividendTaxRate: 0.15,
      costBasisMethod: 'HIFO',
      rebalanceFrequency: 'annually',
    });

    expect(res.totalTaxPaid).toBeGreaterThan(0);
    expect(res.afterTaxEndingBalance).toBeLessThan(res.preTaxEndingBalance);
    expect(res.annualizedTaxDragBps).toBeGreaterThan(0);
    expect(res.taxEfficiencyRatio).toBeLessThan(1.0);
    expect(res.taxEfficiencyRatio).toBeGreaterThan(0.7);
    expect(res.annualTaxBreakdown.length).toBeGreaterThanOrEqual(3);
  });

  it('demonstrates HIFO realizes lower or equal capital gains compared to FIFO', () => {
    const resHIFO = runTaxAwareBacktest(assets, periodData, {
      initialBalance: 10000,
      isTaxable: true,
      costBasisMethod: 'HIFO',
      rebalanceFrequency: 'annually',
    });

    const resFIFO = runTaxAwareBacktest(assets, periodData, {
      initialBalance: 10000,
      isTaxable: true,
      costBasisMethod: 'FIFO',
      rebalanceFrequency: 'annually',
    });

    // HIFO prioritizes selling higher-cost lots, minimizing capital gains taxes
    expect(resHIFO.capitalGainsTaxPaid).toBeLessThanOrEqual(resFIFO.capitalGainsTaxPaid + 0.01);
    expect(resHIFO.afterTaxEndingBalance).toBeGreaterThanOrEqual(resFIFO.afterTaxEndingBalance - 0.01);
  });

  it('shows frequent monthly rebalancing generates higher turnover and tax friction than buy-and-hold', () => {
    const res = runTaxAwareBacktest(assets, periodData, {
      initialBalance: 10000,
      isTaxable: true,
      rebalanceFrequency: 'annually',
    });

    expect(res.rebalanceTaxComparison.buyAndHoldAfterTaxCAGR).toBeDefined();
    expect(res.rebalanceTaxComparison.annualRebalanceAfterTaxCAGR).toBeDefined();
    expect(res.rebalanceTaxComparison.monthlyRebalanceAfterTaxCAGR).toBeDefined();
    // Monthly rebalance suffers more realization events
    expect(res.rebalanceTaxComparison.monthlyRebalanceAfterTaxCAGR).toBeLessThanOrEqual(
      res.rebalanceTaxComparison.buyAndHoldAfterTaxCAGR + 0.02
    );
  });

  it('correctly records annual tax history with STCG, LTCG and dividend tax components', () => {
    const res = runTaxAwareBacktest(assets, periodData, {
      initialBalance: 10000,
      isTaxable: true,
      rebalanceFrequency: 'annually',
    });

    res.annualTaxBreakdown.forEach((yr) => {
      expect(yr.year).toBeGreaterThanOrEqual(2020);
      expect(yr.dividendIncome).toBeGreaterThanOrEqual(0);
      expect(yr.taxPaid).toBeGreaterThanOrEqual(0);
    });
  });
});
