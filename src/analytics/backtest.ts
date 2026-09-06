/**
 * Professional Portfolio Backtest Engine
 * Multi-asset compounding, calendar & threshold rebalancing, cash flows, inflation, fee drag, and comprehensive metrics.
 */

import { calculateCAGR, calculateTotalReturn } from './returns';
import { calculateAnnualizedVolatility, calculateMean, calculateStandardDeviation } from './statistics';
import { calculateDrawdownSeries, calculateMaxDrawdown, calculateUlcerIndex, findDrawdownEpisodes, DrawdownEpisode } from './drawdowns';
import {
  calculateDownsideDeviation,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCalmarRatio,
  calculateHistoricalVaR,
  calculateHistoricalCVaR,
  calculateBeta,
  calculateAlpha,
  calculateTrackingError,
  calculateInformationRatio,
  calculateCaptureRatios,
  calculateTreynorRatio,
} from './risk';

export type RebalanceFrequency = 'never' | 'monthly' | 'quarterly' | 'semiannually' | 'annually' | 'threshold';

export type CashFlowType = 'none' | 'contribute' | 'withdraw' | 'percentage_withdraw';

export interface CashFlowConfig {
  type: CashFlowType;
  amount: number; // Dollar amount or decimal percentage
  frequency: 'monthly' | 'quarterly' | 'annually';
  adjustForInflation: boolean;
  annualInflationRate: number; // e.g. 0.025 for 2.5%
}

export interface PortfolioAssetInput {
  symbol: string;
  weight: number; // 0 to 1 (must sum to 1)
  expenseRatio?: number; // Annual expense ratio in decimal (e.g. 0.0003 for 3 bps)
}

export interface BacktestOptions {
  startDate?: string;
  endDate?: string;
  initialBalance?: number;
  rebalanceFrequency?: RebalanceFrequency;
  rebalanceThreshold?: number; // Decimal (e.g. 0.05 for 5% absolute drift)
  cashFlow?: CashFlowConfig;
  annualFee?: number; // Advisory fee in decimal (e.g. 0.005 for 50 bps)
  riskFreeRate?: number; // Annual risk-free rate (e.g. 0.04)
  reinvestDividends?: boolean;
}

export interface AssetPeriodReturn {
  date: string;
  returns: Record<string, number>; // symbol -> period decimal return
}

export interface BacktestPeriodResult {
  date: string;
  portfolioValue: number;
  portfolioReturn: number;
  cashFlow: number;
  drawdown: number;
  assetWeights: Record<string, number>;
}

export interface AnnualReturnRecord {
  year: number;
  return: number;
  benchmarkReturn?: number;
  endingBalance: number;
}

export interface MonthlyReturnRecord {
  year: number;
  months: (number | null)[]; // 12 entries Jan..Dec
  total: number;
}

export interface BacktestSummaryMetrics {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  cagr: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  ulcerIndex: number;
  bestYear: { year: number; return: number };
  worstYear: { year: number; return: number };
  bestMonth: { date: string; return: number };
  worstMonth: { date: string; return: number };
  positiveMonths: number;
  negativeMonths: number;
  var95: number;
  cvar95: number;
  downsideDeviation: number;
  
  // Benchmark comparison
  beta?: number;
  alpha?: number;
  correlation?: number;
  trackingError?: number;
  informationRatio?: number;
  treynorRatio?: number;
  upCapture?: number;
  downCapture?: number;
}

export type PortfolioMetrics = BacktestSummaryMetrics;

export interface BacktestResult {
  summary: BacktestSummaryMetrics;
  history: BacktestPeriodResult[];
  annualReturns: AnnualReturnRecord[];
  monthlyMatrix: MonthlyReturnRecord[];
  drawdownEpisodes: DrawdownEpisode[];
}

/**
 * Runs a deterministic backtest on historical period return series.
 */
export function runBacktest(
  assets: PortfolioAssetInput[],
  periodData: AssetPeriodReturn[],
  benchmarkReturns?: number[], // Optional aligned benchmark returns
  options: BacktestOptions = {}
): BacktestResult {
  const initialBalance = options.initialBalance ?? 10000;
  const rebalanceFrequency = options.rebalanceFrequency ?? 'annually';
  const rebalanceThreshold = options.rebalanceThreshold ?? 0.05;
  const annualFee = options.annualFee ?? 0;
  const riskFreeRate = options.riskFreeRate ?? 0.04;
  const cashFlow = options.cashFlow ?? {
    type: 'none',
    amount: 0,
    frequency: 'monthly',
    adjustForInflation: false,
    annualInflationRate: 0.025,
  };

  // 1. Normalize initial weights
  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);
  const targetWeights: Record<string, number> = {};
  assets.forEach((a) => {
    targetWeights[a.symbol] = totalWeight > 0 ? a.weight / totalWeight : 0;
  });

  // 2. State tracking
  let currentBalance = initialBalance;
  let assetBalances: Record<string, number> = {};
  assets.forEach((a) => {
    assetBalances[a.symbol] = initialBalance * targetWeights[a.symbol];
  });

  const history: BacktestPeriodResult[] = [];
  const monthlyFeeRate = annualFee / 12;

  let highWaterMark = initialBalance;
  let inflationFactor = 1.0;

  for (let t = 0; t < periodData.length; t++) {
    const period = periodData[t];
    const date = period.date;
    const month = parseInt(date.substring(5, 7), 10) || 1;

    // A. Apply asset returns & expense ratios
    let balanceBeforeCF = 0;
    const newAssetBalances: Record<string, number> = {};

    for (const asset of assets) {
      const sym = asset.symbol;
      const rawReturn = period.returns[sym] ?? 0;
      const expMonthly = (asset.expenseRatio ?? 0) / 12;
      const netReturn = rawReturn - expMonthly;

      const prevBal = assetBalances[sym] || 0;
      const nextBal = prevBal * (1 + netReturn);
      newAssetBalances[sym] = Math.max(0, nextBal);
      balanceBeforeCF += newAssetBalances[sym];
    }

    // Deduct general advisory fee
    balanceBeforeCF = Math.max(0, balanceBeforeCF * (1 - monthlyFeeRate));

    // Portfolio return before cash flows
    const portfolioReturn = currentBalance > 0 ? (balanceBeforeCF - currentBalance) / currentBalance : 0;

    // B. Calculate Periodic Cash Flow
    let cfAmount = 0;
    if (t > 0 && t % 12 === 0 && cashFlow.adjustForInflation) {
      inflationFactor *= (1 + cashFlow.annualInflationRate);
    }

    const isQuarterEnd = month % 3 === 0;
    const isYearEnd = month === 12;

    const cfMatchesFrequency =
      cashFlow.frequency === 'monthly' ||
      (cashFlow.frequency === 'quarterly' && isQuarterEnd) ||
      (cashFlow.frequency === 'annually' && isYearEnd);

    if (cfMatchesFrequency && cashFlow.amount > 0) {
      if (cashFlow.type === 'contribute') {
        cfAmount = cashFlow.amount * (cashFlow.adjustForInflation ? inflationFactor : 1.0);
      } else if (cashFlow.type === 'withdraw') {
        cfAmount = -cashFlow.amount * (cashFlow.adjustForInflation ? inflationFactor : 1.0);
      } else if (cashFlow.type === 'percentage_withdraw') {
        const annualPct = cashFlow.amount;
        const periodsPerYear = cashFlow.frequency === 'monthly' ? 12 : cashFlow.frequency === 'quarterly' ? 4 : 1;
        cfAmount = -balanceBeforeCF * (annualPct / periodsPerYear);
      }
    }

    // Apply cash flow proportionally across assets
    let endingBalance = Math.max(0, balanceBeforeCF + cfAmount);
    if (balanceBeforeCF > 0) {
      const scale = endingBalance / balanceBeforeCF;
      for (const asset of assets) {
        newAssetBalances[asset.symbol] *= scale;
      }
    } else {
      for (const asset of assets) {
        newAssetBalances[asset.symbol] = 0;
      }
    }

    // C. Check Rebalancing Trigger
    let shouldRebalance = false;
    if (rebalanceFrequency === 'monthly') {
      shouldRebalance = true;
    } else if (rebalanceFrequency === 'quarterly' && isQuarterEnd) {
      shouldRebalance = true;
    } else if (rebalanceFrequency === 'semiannually' && (month === 6 || month === 12)) {
      shouldRebalance = true;
    } else if (rebalanceFrequency === 'annually' && isYearEnd) {
      shouldRebalance = true;
    } else if (rebalanceFrequency === 'threshold' && endingBalance > 0) {
      // Check drift
      for (const asset of assets) {
        const currentWeight = newAssetBalances[asset.symbol] / endingBalance;
        const targetW = targetWeights[asset.symbol];
        if (Math.abs(currentWeight - targetW) >= rebalanceThreshold) {
          shouldRebalance = true;
          break;
        }
      }
    }

    if (shouldRebalance && endingBalance > 0) {
      for (const asset of assets) {
        newAssetBalances[asset.symbol] = endingBalance * targetWeights[asset.symbol];
      }
    }

    assetBalances = newAssetBalances;
    currentBalance = endingBalance;

    // High water mark & drawdown
    if (currentBalance > highWaterMark) {
      highWaterMark = currentBalance;
    }
    const currentDrawdown = highWaterMark > 0 ? (currentBalance - highWaterMark) / highWaterMark : 0;

    const currentWeights: Record<string, number> = {};
    for (const asset of assets) {
      currentWeights[asset.symbol] = endingBalance > 0 ? assetBalances[asset.symbol] / endingBalance : 0;
    }

    history.push({
      date,
      portfolioValue: currentBalance,
      portfolioReturn,
      cashFlow: cfAmount,
      drawdown: currentDrawdown,
      assetWeights: currentWeights,
    });
  }

  // 3. Compute High-Level Metrics
  const portfolioReturns = history.map((h) => h.portfolioReturn);
  const values = history.map((h) => h.portfolioValue);
  const dates = history.map((h) => h.date);

  const durationYears = Math.max(0.0833, history.length / 12);
  const finalBalance = history.length > 0 ? history[history.length - 1].portfolioValue : initialBalance;
  const cagr = calculateCAGR(initialBalance, finalBalance, durationYears);
  const totalReturn = calculateTotalReturn(initialBalance, finalBalance);
  const annualizedVolatility = calculateAnnualizedVolatility(portfolioReturns, 12);
  const maxDrawdown = calculateMaxDrawdown(values);
  const ulcerIndex = calculateUlcerIndex(history.map((h) => h.drawdown));
  const downsideDev = calculateDownsideDeviation(portfolioReturns, 0, 12);

  const sharpeRatio = calculateSharpeRatio(cagr, annualizedVolatility, riskFreeRate);
  const sortinoRatio = calculateSortinoRatio(cagr, downsideDev, riskFreeRate);
  const calmarRatio = calculateCalmarRatio(cagr, maxDrawdown);

  // Best / Worst Month
  let bestMonth = { date: '', return: -Infinity };
  let worstMonth = { date: '', return: Infinity };
  let positiveMonths = 0;
  let negativeMonths = 0;

  for (let i = 0; i < history.length; i++) {
    const r = history[i].portfolioReturn;
    const d = history[i].date;
    if (r > bestMonth.return) bestMonth = { date: d, return: r };
    if (r < worstMonth.return) worstMonth = { date: d, return: r };
    if (r > 0) positiveMonths++;
    else if (r < 0) negativeMonths++;
  }
  if (bestMonth.return === -Infinity) bestMonth = { date: 'N/A', return: 0 };
  if (worstMonth.return === Infinity) worstMonth = { date: 'N/A', return: 0 };

  // 4. Annual Returns & Monthly Matrix
  const annualReturns: AnnualReturnRecord[] = [];
  const monthlyMatrixMap: Record<number, (number | null)[]> = {};

  let yearStartBalance = initialBalance;
  let currentYear = parseInt(dates[0]?.substring(0, 4) || '2000', 10);
  let yearReturnComp = 1.0;

  for (let i = 0; i < history.length; i++) {
    const d = history[i].date;
    const yr = parseInt(d.substring(0, 4), 10);
    const m = parseInt(d.substring(5, 7), 10) - 1; // 0-indexed month
    const r = history[i].portfolioReturn;

    if (!monthlyMatrixMap[yr]) {
      monthlyMatrixMap[yr] = Array(12).fill(null);
    }
    monthlyMatrixMap[yr][m] = r;

    if (yr !== currentYear) {
      // Completed previous year
      annualReturns.push({
        year: currentYear,
        return: yearReturnComp - 1,
        endingBalance: history[i - 1].portfolioValue,
      });
      currentYear = yr;
      yearReturnComp = 1.0;
    }
    yearReturnComp *= (1 + r);

    if (i === history.length - 1) {
      annualReturns.push({
        year: currentYear,
        return: yearReturnComp - 1,
        endingBalance: history[i].portfolioValue,
      });
    }
  }

  const monthlyMatrix: MonthlyReturnRecord[] = Object.entries(monthlyMatrixMap)
    .map(([yr, months]) => {
      let comp = 1.0;
      months.forEach((m) => {
        if (m !== null) comp *= (1 + m);
      });
      return {
        year: parseInt(yr, 10),
        months,
        total: comp - 1,
      };
    })
    .sort((a, b) => a.year - b.year);

  let bestYear = { year: 0, return: -Infinity };
  let worstYear = { year: 0, return: Infinity };
  for (const ar of annualReturns) {
    if (ar.return > bestYear.return) bestYear = { year: ar.year, return: ar.return };
    if (ar.return < worstYear.return) worstYear = { year: ar.year, return: ar.return };
  }
  if (bestYear.return === -Infinity) bestYear = { year: 0, return: 0 };
  if (worstYear.return === Infinity) worstYear = { year: 0, return: 0 };

  // 5. Benchmark Metrics (if benchmark provided)
  let beta: number | undefined;
  let alpha: number | undefined;
  let correlation: number | undefined;
  let trackingError: number | undefined;
  let informationRatio: number | undefined;
  let treynorRatio: number | undefined;
  let upCapture: number | undefined;
  let downCapture: number | undefined;

  if (benchmarkReturns && benchmarkReturns.length >= portfolioReturns.length && portfolioReturns.length > 1) {
    const alignedBench = benchmarkReturns.slice(0, portfolioReturns.length);
    const benchCAGR = calculateCAGR(10000, 10000 * alignedBench.reduce((acc, r) => acc * (1 + r), 1), durationYears);

    beta = calculateBeta(portfolioReturns, alignedBench);
    alpha = calculateAlpha(cagr, benchCAGR, beta, riskFreeRate);
    trackingError = calculateTrackingError(portfolioReturns, alignedBench, 12);
    informationRatio = calculateInformationRatio(cagr, benchCAGR, trackingError);
    treynorRatio = calculateTreynorRatio(cagr, beta, riskFreeRate);

    const caps = calculateCaptureRatios(portfolioReturns, alignedBench, 12);
    upCapture = caps.upCapture;
    downCapture = caps.downCapture;
  }

  const drawdownEpisodes = findDrawdownEpisodes(dates, values, 10);

  return {
    summary: {
      initialBalance,
      finalBalance,
      totalReturn,
      cagr,
      annualizedVolatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      ulcerIndex,
      bestYear,
      worstYear,
      bestMonth,
      worstMonth,
      positiveMonths,
      negativeMonths,
      var95: calculateHistoricalVaR(portfolioReturns, 0.95),
      cvar95: calculateHistoricalCVaR(portfolioReturns, 0.95),
      downsideDeviation: downsideDev,
      beta,
      alpha,
      trackingError,
      informationRatio,
      treynorRatio,
      upCapture,
      downCapture,
    },
    history,
    annualReturns,
    monthlyMatrix,
    drawdownEpisodes,
  };
}
