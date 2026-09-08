/**
 * Tax-Aware Portfolio Backtest Engine
 * Lot-level cost basis accounting (HIFO, FIFO, LIFO), short-term vs long-term capital gains,
 * dividend tax drag, capital loss offsetting, and tax drag quantification.
 */

import { AssetPeriodReturn, RebalanceFrequency } from './backtest';

export type CostBasisMethod = 'HIFO' | 'FIFO' | 'LIFO';

export interface TaxLot {
  id: string;
  symbol: string;
  date: string;
  monthIndex: number;
  shares: number;
  costBasisPerShare: number;
  totalCostBasis: number;
}

export interface TaxBacktestOptions {
  initialBalance?: number;
  isTaxable?: boolean;
  ordinaryTaxRate?: number; // For STCG (<12M) & ordinary income (default 0.24)
  ltcgTaxRate?: number; // For LTCG (>=12M) (default 0.15)
  dividendTaxRate?: number; // For qualified dividends (default 0.15)
  costBasisMethod?: CostBasisMethod; // default 'HIFO'
  rebalanceFrequency?: RebalanceFrequency; // default 'annually'
  rebalanceThreshold?: number; // default 0.05
  reinvestDividends?: boolean; // default true
  carryForwardLosses?: boolean; // default true
}

export interface AnnualTaxRecord {
  year: number;
  preTaxReturn: number;
  afterTaxReturn: number;
  preTaxEndBalance: number;
  afterTaxEndBalance: number;
  realizedSTCG: number;
  realizedLTCG: number;
  capitalLossesUsed: number;
  dividendIncome: number;
  taxPaid: number;
  annualTaxDragBps: number;
}

export interface TaxBacktestPeriodPoint {
  date: string;
  monthIndex: number;
  preTaxBalance: number;
  afterTaxBalance: number;
  cumulativeTaxPaid: number;
  cumulativeTaxDragBps: number;
}

export interface RebalanceTaxComparison {
  buyAndHoldAfterTaxCAGR: number;
  annualRebalanceAfterTaxCAGR: number;
  monthlyRebalanceAfterTaxCAGR: number;
  rebalanceTaxFrictionBps: number;
}

export interface TaxBacktestResult {
  preTaxCAGR: number;
  afterTaxCAGR: number;
  annualizedTaxDragBps: number;
  preTaxEndingBalance: number;
  afterTaxEndingBalance: number;
  totalTaxPaid: number;
  dividendTaxPaid: number;
  capitalGainsTaxPaid: number;
  taxEfficiencyRatio: number;
  totalRealizedGains: number;
  totalRealizedLosses: number;
  unrealizedGainsRemaining: number;
  timeSeries: TaxBacktestPeriodPoint[];
  annualTaxBreakdown: AnnualTaxRecord[];
  rebalanceTaxComparison: RebalanceTaxComparison;
}

interface InternalAssetInput {
  symbol: string;
  targetWeight: number;
  dividendYield: number;
}

const DEFAULT_DIV_YIELDS: Record<string, number> = {
  SPY: 0.015,
  QQQ: 0.006,
  VTI: 0.015,
  BND: 0.032,
  AGG: 0.031,
  TLT: 0.034,
  GLD: 0.000,
  VNQ: 0.039,
  VXUS: 0.029,
  EFA: 0.028,
  EEM: 0.024,
  BIL: 0.035,
  AVUV: 0.018,
  IWM: 0.013,
};

export function runTaxAwareBacktest(
  assets: Array<{ symbol: string; weight: number }>,
  periodData: AssetPeriodReturn[],
  options: TaxBacktestOptions = {}
): TaxBacktestResult {
  const {
    initialBalance = 10000,
    isTaxable = true,
    ordinaryTaxRate = 0.24,
    ltcgTaxRate = 0.15,
    dividendTaxRate = 0.15,
    costBasisMethod = 'HIFO',
    rebalanceFrequency = 'annually',
    rebalanceThreshold = 0.05,
    reinvestDividends = true,
    carryForwardLosses = true,
  } = options;

  if (!periodData || periodData.length === 0 || !assets || assets.length === 0) {
    return createEmptyTaxResult(initialBalance);
  }

  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0) || 1;
  const normalizedAssets: InternalAssetInput[] = assets.map((a) => ({
    symbol: a.symbol,
    targetWeight: a.weight / totalWeight,
    dividendYield: DEFAULT_DIV_YIELDS[a.symbol] ?? 0.015,
  }));

  const runEngine = (freq: RebalanceFrequency, taxable: boolean) => {
    let currentLots: TaxLot[] = [];
    let lotCounter = 1;

    const assetPrices: Record<string, number> = {};
    normalizedAssets.forEach((a) => {
      assetPrices[a.symbol] = 100.0;
    });

    normalizedAssets.forEach((a) => {
      const allocatedDollars = initialBalance * a.targetWeight;
      const initialPrice = assetPrices[a.symbol];
      const shares = allocatedDollars / initialPrice;
      currentLots.push({
        id: 'lot_' + (lotCounter++),
        symbol: a.symbol,
        date: periodData[0]?.date || 'Start',
        monthIndex: 0,
        shares,
        costBasisPerShare: initialPrice,
        totalCostBasis: allocatedDollars,
      });
    });

    let cumulativeTaxPaid = 0;
    let cumulativeDivTax = 0;
    let cumulativeCgTax = 0;
    let totalRealizedGains = 0;
    let totalRealizedLosses = 0;
    let carriedLoss = 0;

    const timeSeries: TaxBacktestPeriodPoint[] = [];
    const annualBreakdown: AnnualTaxRecord[] = [];

    let yearStartBalance = initialBalance;
    let yearSTCG = 0;
    let yearLTCG = 0;
    let yearSTLoss = 0;
    let yearLTLoss = 0;
    let yearDivIncome = 0;
    let yearDivTax = 0;
    let currentYear = parseInt(periodData[0]?.date.split('-')[0] || '2007', 10);

    for (let t = 0; t < periodData.length; t++) {
      const period = periodData[t];
      const periodYear = parseInt(period.date.split('-')[0] || '2007', 10);

      if (periodYear !== currentYear && taxable) {
        const netST = yearSTCG - yearSTLoss;
        const netLT = yearLTCG - yearLTLoss;

        let taxableST = 0;
        let taxableLT = 0;
        let totalNetCG = netST + netLT;

        if (totalNetCG < 0) {
          if (carryForwardLosses) {
            carriedLoss += Math.abs(totalNetCG);
          }
        } else {
          if (carriedLoss > 0) {
            const lossApplied = Math.min(carriedLoss, totalNetCG);
            totalNetCG -= lossApplied;
            carriedLoss -= lossApplied;
          }
          taxableST = Math.max(0, netST);
          taxableLT = Math.max(0, netLT);
        }

        const cgTax = taxableST * ordinaryTaxRate + taxableLT * ltcgTaxRate;
        const totalYearTax = cgTax + yearDivTax;

        cumulativeTaxPaid += totalYearTax;
        cumulativeCgTax += cgTax;

        if (cgTax > 0 && currentLots.length > 0) {
          const totalVal = currentLots.reduce((s, l) => s + l.shares * assetPrices[l.symbol], 0);
          if (totalVal > 0) {
            const retentionFactor = Math.max(0.001, (totalVal - cgTax) / totalVal);
            currentLots.forEach((l) => {
              l.shares *= retentionFactor;
              l.totalCostBasis *= retentionFactor;
            });
          }
        }

        const currentVal = currentLots.reduce((s, l) => s + l.shares * assetPrices[l.symbol], 0);
        const yearReturn = yearStartBalance > 0 ? (currentVal + totalYearTax - yearStartBalance) / yearStartBalance : 0;
        const afterTaxReturn = yearStartBalance > 0 ? (currentVal - yearStartBalance) / yearStartBalance : 0;

        annualBreakdown.push({
          year: currentYear,
          preTaxReturn: yearReturn,
          afterTaxReturn,
          preTaxEndBalance: currentVal + cumulativeTaxPaid,
          afterTaxEndBalance: currentVal,
          realizedSTCG: Math.max(0, yearSTCG),
          realizedLTCG: Math.max(0, yearLTCG),
          capitalLossesUsed: yearSTLoss + yearLTLoss,
          dividendIncome: yearDivIncome,
          taxPaid: totalYearTax,
          annualTaxDragBps: Math.max(0, (yearReturn - afterTaxReturn) * 10000),
        });

        yearStartBalance = currentVal;
        yearSTCG = 0;
        yearLTCG = 0;
        yearSTLoss = 0;
        yearLTLoss = 0;
        yearDivIncome = 0;
        yearDivTax = 0;
        currentYear = periodYear;
      }

      normalizedAssets.forEach((a) => {
        const totalRet = period.returns[a.symbol] ?? 0;
        const monthlyDivYield = a.dividendYield / 12;
        const priceRet = totalRet - monthlyDivYield;
        assetPrices[a.symbol] *= 1 + priceRet;
      });

      normalizedAssets.forEach((a) => {
        const monthlyDivYield = a.dividendYield / 12;
        const assetLots = currentLots.filter((l) => l.symbol === a.symbol);
        const assetValue = assetLots.reduce((s, l) => s + l.shares * assetPrices[a.symbol], 0);
        const divAmount = assetValue * monthlyDivYield;

        if (divAmount > 0) {
          yearDivIncome += divAmount;
          const divTax = taxable ? divAmount * dividendTaxRate : 0;
          yearDivTax += divTax;
          cumulativeDivTax += divTax;
          cumulativeTaxPaid += divTax;

          const netDiv = divAmount - divTax;
          if (reinvestDividends && netDiv > 0) {
            const p = assetPrices[a.symbol];
            const newShares = netDiv / p;
            currentLots.push({
              id: 'lot_' + (lotCounter++),
              symbol: a.symbol,
              date: period.date,
              monthIndex: t,
              shares: newShares,
              costBasisPerShare: p,
              totalCostBasis: netDiv,
            });
          }
        }
      });

      const shouldRebalance = checkRebalanceTrigger(
        t,
        freq,
        rebalanceThreshold,
        currentLots,
        assetPrices,
        normalizedAssets
      );

      if (shouldRebalance) {
        const totalVal = currentLots.reduce((s, l) => s + l.shares * assetPrices[l.symbol], 0);

        normalizedAssets.forEach((a) => {
          const targetVal = totalVal * a.targetWeight;
          const currentAssetVal = currentLots
            .filter((l) => l.symbol === a.symbol)
            .reduce((s, l) => s + l.shares * assetPrices[a.symbol], 0);

          const diff = currentAssetVal - targetVal;
          const p = assetPrices[a.symbol];

          if (diff > 1.0) {
            let sharesToSell = diff / p;
            const symbolLots = currentLots.filter((l) => l.symbol === a.symbol);
            sortLots(symbolLots, costBasisMethod);

            for (const lot of symbolLots) {
              if (sharesToSell <= 0.000001) break;

              const sharesFromLot = Math.min(lot.shares, sharesToSell);
              const gainPerShare = p - lot.costBasisPerShare;
              const totalGain = sharesFromLot * gainPerShare;
              const isLongTerm = t - lot.monthIndex >= 12;

              if (totalGain >= 0) {
                totalRealizedGains += totalGain;
                if (isLongTerm) {
                  yearLTCG += totalGain;
                } else {
                  yearSTCG += totalGain;
                }
              } else {
                const loss = Math.abs(totalGain);
                totalRealizedLosses += loss;
                if (isLongTerm) {
                  yearLTLoss += loss;
                } else {
                  yearSTLoss += loss;
                }
              } 

              lot.shares -= sharesFromLot;
              lot.totalCostBasis -= sharesFromLot * lot.costBasisPerShare;
              sharesToSell -= sharesFromLot;
            }

            currentLots = currentLots.filter((l) => l.shares > 0.000001);
          } else if (diff < -1.0) {
            const dollarsToBuy = Math.abs(diff);
            const sharesToBuy = dollarsToBuy / p;
            currentLots.push({
              id: 'lot_' + (lotCounter++),
              symbol: a.symbol,
              date: period.date,
              monthIndex: t,
              shares: sharesToBuy,
              costBasisPerShare: p,
              totalCostBasis: dollarsToBuy,
            });
          }
        });
      }

      const totalPortfolioVal = currentLots.reduce((s, l) => s + l.shares * assetPrices[l.symbol], 0);

      timeSeries.push({
        date: period.date,
        monthIndex: t,
        preTaxBalance: totalPortfolioVal + (taxable ? cumulativeTaxPaid : 0),
        afterTaxBalance: totalPortfolioVal,
        cumulativeTaxPaid,
        cumulativeTaxDragBps: 0,
      });
    }

    if (taxable && (yearSTCG > 0 || yearLTCG > 0 || yearDivTax > 0)) {
      const netST = yearSTCG - yearSTLoss;
      const netLT = yearLTCG - yearLTLoss;
      const cgTax = Math.max(0, netST) * ordinaryTaxRate + Math.max(0, netLT) * ltcgTaxRate;
      const totalYearTax = cgTax + yearDivTax;
      cumulativeTaxPaid += totalYearTax;
      cumulativeCgTax += cgTax;

      const currentVal = currentLots.reduce((s, l) => s + l.shares * assetPrices[l.symbol], 0);
      annualBreakdown.push({
        year: currentYear,
        preTaxReturn: yearStartBalance > 0 ? (currentVal + totalYearTax - yearStartBalance) / yearStartBalance : 0,
        afterTaxReturn: yearStartBalance > 0 ? (currentVal - yearStartBalance) / yearStartBalance : 0,
        preTaxEndBalance: currentVal + cumulativeTaxPaid,
        afterTaxEndBalance: currentVal,
        realizedSTCG: Math.max(0, yearSTCG),
        realizedLTCG: Math.max(0, yearLTCG),
        capitalLossesUsed: yearSTLoss + yearLTLoss,
        dividendIncome: yearDivIncome,
        taxPaid: totalYearTax,
        annualTaxDragBps: 0,
      });
    }

    const finalBalance = currentLots.reduce((s, l) => s + l.shares * assetPrices[l.symbol], 0);
    const months = periodData.length;
    const years = months / 12;

    const afterTaxCAGR = years > 0 ? Math.pow(finalBalance / initialBalance, 1 / years) - 1 : 0;
    const preTaxCAGR = years > 0 ? Math.pow((finalBalance + cumulativeTaxPaid) / initialBalance, 1 / years) - 1 : 0;
    const taxDragBps = Math.max(0, (preTaxCAGR - afterTaxCAGR) * 10000);

    const unrealizedGains = currentLots.reduce((s, l) => {
      const currentVal = l.shares * assetPrices[l.symbol];
      return s + Math.max(0, currentVal - l.totalCostBasis);
    }, 0);

    timeSeries.forEach((pt) => {
      const m = pt.monthIndex + 1;
      const y = m / 12;
      if (y > 0) {
        const ptPreCAGR = Math.pow(pt.preTaxBalance / initialBalance, 1 / y) - 1;
        const ptAfterCAGR = Math.pow(pt.afterTaxBalance / initialBalance, 1 / y) - 1;
        pt.cumulativeTaxDragBps = Math.max(0, (ptPreCAGR - ptAfterCAGR) * 10000);
      }
    });

    return {
      preTaxCAGR,
      afterTaxCAGR,
      annualizedTaxDragBps: taxDragBps,
      preTaxEndingBalance: finalBalance + cumulativeTaxPaid,
      afterTaxEndingBalance: finalBalance,
      totalTaxPaid: cumulativeTaxPaid,
      dividendTaxPaid: cumulativeDivTax,
      capitalGainsTaxPaid: cumulativeCgTax,
      taxEfficiencyRatio: (finalBalance + cumulativeTaxPaid) > 0 ? finalBalance / (finalBalance + cumulativeTaxPaid) : 1,
      totalRealizedGains,
      totalRealizedLosses,
      unrealizedGainsRemaining: unrealizedGains,
      timeSeries,
      annualTaxBreakdown: annualBreakdown,
    };
  };

  const primaryResult = runEngine(rebalanceFrequency, isTaxable);
  const buyAndHoldResult = runEngine('never', isTaxable);
  const annualRebalResult = runEngine('annually', isTaxable);
  const monthlyRebalResult = runEngine('monthly', isTaxable);

  const rebalanceFrictionBps = Math.max(
    0,
    (buyAndHoldResult.afterTaxCAGR - annualRebalResult.afterTaxCAGR) * 10000
  );

  return {
    ...primaryResult,
    rebalanceTaxComparison: {
      buyAndHoldAfterTaxCAGR: buyAndHoldResult.afterTaxCAGR,
      annualRebalanceAfterTaxCAGR: annualRebalResult.afterTaxCAGR,
      monthlyRebalanceAfterTaxCAGR: monthlyRebalResult.afterTaxCAGR,
      rebalanceTaxFrictionBps: rebalanceFrictionBps,
    },
  };
}

function sortLots(lots: TaxLot[], method: CostBasisMethod): void {
  if (method === 'HIFO') {
    lots.sort((a, b) => b.costBasisPerShare - a.costBasisPerShare);
  } else if (method === 'FIFO') {
    lots.sort((a, b) => a.monthIndex - b.monthIndex);
  } else if (method === 'LIFO') {
    lots.sort((a, b) => b.monthIndex - a.monthIndex);
  }
}

function checkRebalanceTrigger(
  monthIndex: number,
  frequency: RebalanceFrequency,
  threshold: number,
  lots: TaxLot[],
  prices: Record<string, number>,
  assets: InternalAssetInput[]
): boolean {
  if (frequency === 'never') return false;
  if (frequency === 'monthly') return true;
  if (frequency === 'quarterly') return (monthIndex + 1) % 3 === 0;
  if (frequency === 'semiannually') return (monthIndex + 1) % 6 === 0;
  if (frequency === 'annually') return (monthIndex + 1) % 12 === 0;

  if (frequency === 'threshold') {
    const totalVal = lots.reduce((s, l) => s + l.shares * prices[l.symbol], 0);
    if (totalVal <= 0) return false;

    for (const a of assets) {
      const assetVal = lots
        .filter((l) => l.symbol === a.symbol)
        .reduce((s, l) => s + l.shares * prices[a.symbol], 0);
      const actualWeight = assetVal / totalVal;
      if (Math.abs(actualWeight - a.targetWeight) >= threshold) {
        return true;
      }
    }
    return false;
  }

  return false;
}

function createEmptyTaxResult(initialBalance: number): TaxBacktestResult {
  return {
    preTaxCAGR: 0,
    afterTaxCAGR: 0,
    annualizedTaxDragBps: 0,
    preTaxEndingBalance: initialBalance,
    afterTaxEndingBalance: initialBalance,
    totalTaxPaid: 0,
    dividendTaxPaid: 0,
    capitalGainsTaxPaid: 0,
    taxEfficiencyRatio: 1.0,
    totalRealizedGains: 0,
    totalRealizedLosses: 0,
    unrealizedGainsRemaining: 0,
    timeSeries: [],
    annualTaxBreakdown: [],
    rebalanceTaxComparison: {
      buyAndHoldAfterTaxCAGR: 0,
      annualRebalanceAfterTaxCAGR: 0,
      monthlyRebalanceAfterTaxCAGR: 0,
      rebalanceTaxFrictionBps: 0,
    },
  };
}
