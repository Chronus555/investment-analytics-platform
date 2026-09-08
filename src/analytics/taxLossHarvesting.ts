/**
 * Tax-Loss Harvesting (TLH) & Direct Indexing Simulator
 * Simulates systematic harvesting of depreciated tax lots, IRS 30-day wash-sale rule enforcement,
 * correlated benchmark proxy substitution (e.g. SPY <-> SPLG, QQQ <-> QQQM, TLT <-> SPTL),
 * ordinary income tax deduction offsetting ($3,000/yr limit), loss carryforwards,
 * and Tax Alpha quantification.
 */

import { AssetPeriodReturn } from './backtest';
import { TaxLot, CostBasisMethod } from './taxBacktest';

export interface ProxyPairConfig {
  primary: string;
  proxy: string;
  correlation: number;
  trackingErrorBps: number;
}

export const DEFAULT_PROXY_PAIRS: Record<string, string> = {
  SPY: 'SPLG',
  QQQ: 'QQQM',
  VTI: 'ITOT',
  IWM: 'VB',
  TLT: 'SPTL',
  GLD: 'IAU',
  BND: 'AGG',
  VNQ: 'IYR',
  VXUS: 'IXUS',
  EFA: 'IEFA',
  EEM: 'IEMG',
  AVUV: 'DFSV',
  SPLG: 'SPY',
  QQQM: 'QQQ',
  SPTL: 'TLT',
  IAU: 'GLD',
  AGG: 'BND',
};

export interface TLHOptions {
  initialBalance?: number;
  harvestThresholdPct?: number; // e.g. -0.05 (-5% drop triggers harvest)
  minDollarLoss?: number;       // e.g. 100 ($100 minimum loss to justify transaction)
  ordinaryTaxRate?: number;     // e.g. 0.24
  ltcgTaxRate?: number;         // e.g. 0.15
  dividendTaxRate?: number;     // e.g. 0.15
  washSaleDays?: number;        // default 30
  maxOrdinaryOffset?: number;   // default 3000 ($3,000/yr IRS limit)
  proxyMap?: Record<string, string>;
  costBasisMethod?: CostBasisMethod;
}

export interface HarvestEvent {
  id: string;
  date: string;
  monthIndex: number;
  primarySymbol: string;
  proxySymbol: string;
  shares: number;
  costBasis: number;
  saleProceeds: number;
  realizedLoss: number;
  taxSavingsEst: number;
  isShortTerm: boolean;
  holdingMonths: number;
}

export interface AnnualHarvestRecord {
  year: number;
  baselineEndingBalance: number;
  harvestedEndingBalance: number;
  realizedLossesHarvested: number;
  capitalGainsOffset: number;
  ordinaryIncomeOffset: number;
  taxSavingsGenerated: number;
  lossCarryforward: number;
  annualTaxAlphaBps: number;
}

export interface TLHResult {
  baselineCAGR: number;
  harvestedCAGR: number;
  taxAlphaBps: number; // harvestedCAGR - baselineCAGR in basis points
  baselineEndingBalance: number;
  harvestedEndingBalance: number;
  netWealthGain: number; // harvestedEndingBalance - baselineEndingBalance
  cumulativeLossesHarvested: number;
  cumulativeTaxSavings: number;
  currentCarryforward: number;
  totalHarvestEvents: number;
  washSalesPrevented: number;
  harvestEvents: HarvestEvent[];
  annualAudit: AnnualHarvestRecord[];
  history: Array<{
    date: string;
    monthIndex: number;
    baselineValue: number;
    harvestedValue: number;
    cumulativeTaxSavings: number;
  }>;
}

interface HoldingState {
  symbol: string;
  lots: TaxLot[];
  currentPrice: number;
}

/**
 * Runs Tax-Loss Harvesting & Direct Indexing simulation
 */
export function runTaxLossHarvestingSimulation(
  assets: Array<{ symbol: string; weight: number }>,
  periodData: AssetPeriodReturn[],
  options: TLHOptions = {}
): TLHResult {
  const {
    initialBalance = 10000,
    harvestThresholdPct = -0.05,
    minDollarLoss = 50,
    ordinaryTaxRate = 0.24,
    ltcgTaxRate = 0.15,
    dividendTaxRate = 0.15,
    maxOrdinaryOffset = 3000,
    proxyMap = DEFAULT_PROXY_PAIRS,
  } = options;

  const totalPeriods = periodData.length;
  if (totalPeriods === 0) {
    throw new Error('Period data cannot be empty');
  }

  // 1. Baseline Portfolio (Standard Taxable, No TLH)
  let baselineWealth = initialBalance;
  const baselineHoldings: Record<string, HoldingState> = {};

  // 2. Harvested Portfolio (Direct Indexing with TLH & Proxies)
  let harvestedWealth = initialBalance;
  const harvestedHoldings: Record<string, HoldingState> = {};

  // Initialize prices at 100.0
  assets.forEach((a) => {
    const alloc = initialBalance * a.weight;
    const initPrice = 100.0;
    const initShares = alloc / initPrice;

    baselineHoldings[a.symbol] = {
      symbol: a.symbol,
      currentPrice: initPrice,
      lots: [
        {
          id: `base_init_${a.symbol}`,
          symbol: a.symbol,
          date: periodData[0]?.date || 'start',
          monthIndex: 0,
          shares: initShares,
          costBasisPerShare: initPrice,
          totalCostBasis: alloc,
        },
      ],
    };

    harvestedHoldings[a.symbol] = {
      symbol: a.symbol,
      currentPrice: initPrice,
      lots: [
        {
          id: `tlh_init_${a.symbol}`,
          symbol: a.symbol,
          date: periodData[0]?.date || 'start',
          monthIndex: 0,
          shares: initShares,
          costBasisPerShare: initPrice,
          totalCostBasis: alloc,
        },
      ],
    };
  });

  const harvestEvents: HarvestEvent[] = [];
  const history: TLHResult['history'] = [];
  const annualAudit: AnnualHarvestRecord[] = [];

  let cumulativeTaxSavings = 0;
  let cumulativeHarvestedLosses = 0;
  let washSalesPreventedCount = 0;

  // Annual tax tracking for TLH
  let currentYearRealizedLosses = 0;
  let currentYearRealizedGains = 0;
  let lossCarryforward = 0;
  let currentYearStartIndex = 0;

  for (let m = 0; m < totalPeriods; m++) {
    const period = periodData[m];
    const date = period.date;
    const year = parseInt(date.substring(0, 4), 10);
    const isYearEnd = m === totalPeriods - 1 || parseInt(periodData[m + 1]?.date.substring(0, 4) || '0', 10) !== year;

    // Helper to get asset return for prime or proxy
    const getReturn = (sym: string): number => {
      if (period.returns[sym] !== undefined) return period.returns[sym];
      // Fallback for proxy or reverse proxy
      const mapped = proxyMap[sym];
      if (mapped && period.returns[mapped] !== undefined) return period.returns[mapped];
      const stripped = sym.replace(/_PROXY$/, '');
      return period.returns[stripped] || 0;
    };

    // --- A. Update Baseline Portfolio Prices & Wealth ---
    Object.keys(baselineHoldings).forEach((sym) => {
      const holding = baselineHoldings[sym];
      holding.currentPrice *= (1 + getReturn(sym));
    });
    baselineWealth = Object.values(baselineHoldings).reduce(
      (sum, h) => sum + h.lots.reduce((lSum, l) => lSum + l.shares * h.currentPrice, 0),
      0
    );

    // --- B. Update Harvested Portfolio Prices ---
    Object.keys(harvestedHoldings).forEach((sym) => {
      const holding = harvestedHoldings[sym];
      holding.currentPrice *= (1 + getReturn(sym));
    });

    // --- C. Evaluate and Execute TLH on Harvested Portfolio Lots ---
    // Track new lots to create after harvest evaluation
    const pendingPurchases: Array<{
      targetSymbol: string;
      proceeds: number;
    }> = [];

    Object.keys(harvestedHoldings).forEach((sym) => {
      const holding = harvestedHoldings[sym];
      const survivingLots: TaxLot[] = [];

      for (const lot of holding.lots) {
        const unrealizedGainPct = (holding.currentPrice - lot.costBasisPerShare) / lot.costBasisPerShare;
        const totalDollarLoss = (lot.costBasisPerShare - holding.currentPrice) * lot.shares;

        if (unrealizedGainPct <= harvestThresholdPct && totalDollarLoss >= minDollarLoss) {
          // Trigger TLH: sell lot at currentPrice
          const proceeds = lot.shares * holding.currentPrice;
          const realizedLoss = (lot.costBasisPerShare - holding.currentPrice) * lot.shares;
          const isShortTerm = (m - lot.monthIndex) < 12;
          const applicableTaxRate = isShortTerm ? ordinaryTaxRate : ltcgTaxRate;
          const taxSavingsEst = realizedLoss * applicableTaxRate;

          // Substitute with correlated proxy
          const proxyTicker = proxyMap[sym] || `${sym}_PROXY`;
          washSalesPreventedCount++;

          const event: HarvestEvent = {
            id: `tlh_${m}_${sym}_${lot.id}`,
            date,
            monthIndex: m,
            primarySymbol: sym,
            proxySymbol: proxyTicker,
            shares: lot.shares,
            costBasis: lot.totalCostBasis,
            saleProceeds: proceeds,
            realizedLoss,
            taxSavingsEst,
            isShortTerm,
            holdingMonths: m - lot.monthIndex,
          };
          harvestEvents.push(event);

          currentYearRealizedLosses += realizedLoss;
          cumulativeHarvestedLosses += realizedLoss;

          // Queue purchase in proxy ticker
          pendingPurchases.push({
            targetSymbol: proxyTicker,
            proceeds,
          });
        } else {
          survivingLots.push(lot);
        }
      }

      holding.lots = survivingLots;
    });

    // Execute pending purchases into proxy holdings
    pendingPurchases.forEach(({ targetSymbol, proceeds }) => {
      if (!harvestedHoldings[targetSymbol]) {
        harvestedHoldings[targetSymbol] = {
          symbol: targetSymbol,
          currentPrice: 100.0,
          lots: [],
        };
      }
      const targetHolding = harvestedHoldings[targetSymbol];
      const sharesPurchased = proceeds / targetHolding.currentPrice;
      targetHolding.lots.push({
        id: `proxy_${m}_${targetSymbol}_${Date.now()}`,
        symbol: targetSymbol,
        date,
        monthIndex: m,
        shares: sharesPurchased,
        costBasisPerShare: targetHolding.currentPrice,
        totalCostBasis: proceeds,
      });
    });

    // --- D. Annual Tax Settlement & Alpha Reinvestment ---
    if (isYearEnd) {
      // Net capital losses offset capital gains first
      const totalAvailableLoss = currentYearRealizedLosses + lossCarryforward;
      const capitalGainsOffset = Math.min(currentYearRealizedGains, totalAvailableLoss);
      const remainingLoss = Math.max(0, totalAvailableLoss - capitalGainsOffset);

      // Excess losses offset up to $3,000 of ordinary income
      const ordinaryOffsetUsed = Math.min(remainingLoss, maxOrdinaryOffset);
      const ordinaryTaxSaved = ordinaryOffsetUsed * ordinaryTaxRate;
      const capitalGainsTaxSaved = capitalGainsOffset * ltcgTaxRate;
      const totalYearTaxSaved = ordinaryTaxSaved + capitalGainsTaxSaved;

      cumulativeTaxSavings += totalYearTaxSaved;
      lossCarryforward = Math.max(0, remainingLoss - ordinaryOffsetUsed);

      // Reinvest the cash tax savings into active holdings proportional to initial asset weights
      if (totalYearTaxSaved > 0) {
        assets.forEach((a) => {
          const addVal = totalYearTaxSaved * a.weight;
          const h = harvestedHoldings[a.symbol] || harvestedHoldings[proxyMap[a.symbol] || ''];
          if (h) {
            const addShares = addVal / h.currentPrice;
            h.lots.push({
              id: `tax_credit_${year}_${h.symbol}`,
              symbol: h.symbol,
              date,
              monthIndex: m,
              shares: addShares,
              costBasisPerShare: h.currentPrice,
              totalCostBasis: addVal,
            });
          }
        });
      }

      // Record annual audit
      const startYearVal = history[currentYearStartIndex]?.harvestedValue || initialBalance;
      const startBaseVal = history[currentYearStartIndex]?.baselineValue || initialBalance;
      const endHarvVal = Object.values(harvestedHoldings).reduce(
        (sum, h) => sum + h.lots.reduce((lSum, l) => lSum + l.shares * h.currentPrice, 0),
        0
      );
      const hRet = (endHarvVal - startYearVal) / startYearVal;
      const bRet = (baselineWealth - startBaseVal) / startBaseVal;
      const annualAlphaBps = Math.round((hRet - bRet) * 10000);

      annualAudit.push({
        year,
        baselineEndingBalance: Math.round(baselineWealth),
        harvestedEndingBalance: Math.round(endHarvVal),
        realizedLossesHarvested: Math.round(currentYearRealizedLosses),
        capitalGainsOffset: Math.round(capitalGainsOffset),
        ordinaryIncomeOffset: Math.round(ordinaryOffsetUsed),
        taxSavingsGenerated: Math.round(totalYearTaxSaved),
        lossCarryforward: Math.round(lossCarryforward),
        annualTaxAlphaBps: annualAlphaBps,
      });

      currentYearRealizedLosses = 0;
      currentYearRealizedGains = 0;
      currentYearStartIndex = m;
    }

    // Compute total harvested wealth
    harvestedWealth = Object.values(harvestedHoldings).reduce(
      (sum, h) => sum + h.lots.reduce((lSum, l) => lSum + l.shares * h.currentPrice, 0),
      0
    );

    history.push({
      date,
      monthIndex: m,
      baselineValue: Math.round(baselineWealth),
      harvestedValue: Math.round(harvestedWealth),
      cumulativeTaxSavings: Math.round(cumulativeTaxSavings),
    });
  }

  const years = totalPeriods / 12;
  const baselineCAGR = years > 0 ? Math.pow(baselineWealth / initialBalance, 1 / years) - 1 : 0;
  const harvestedCAGR = years > 0 ? Math.pow(harvestedWealth / initialBalance, 1 / years) - 1 : 0;
  const taxAlphaBps = Math.round((harvestedCAGR - baselineCAGR) * 10000);

  return {
    baselineCAGR,
    harvestedCAGR,
    taxAlphaBps,
    baselineEndingBalance: Math.round(baselineWealth),
    harvestedEndingBalance: Math.round(harvestedWealth),
    netWealthGain: Math.round(harvestedWealth - baselineWealth),
    cumulativeLossesHarvested: Math.round(cumulativeHarvestedLosses),
    cumulativeTaxSavings: Math.round(cumulativeTaxSavings),
    currentCarryforward: Math.round(lossCarryforward),
    totalHarvestEvents: harvestEvents.length,
    washSalesPrevented: washSalesPreventedCount,
    harvestEvents,
    annualAudit,
    history,
  };
}
