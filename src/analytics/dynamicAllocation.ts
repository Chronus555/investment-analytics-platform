/**
 * Dynamic Asset Allocation & Lifecycle Glide Path Engine
 * Inspired by Portfolio Visualizer Dynamic Allocation Backtesting (PV 1.3).
 * Age-based target-date glide paths, multi-phase regime switching,
 * phase-by-phase risk attribution, and time-varying allocation tracking.
 */

import { calculateCAGRFromReturns } from './returns';
import { calculateStandardDeviation } from './statistics';
import { calculateMaxDrawdown } from './drawdowns';
import { calculateSharpeRatio } from './risk';

export type RebalanceSchedule = 'monthly' | 'quarterly' | 'annually' | 'drift';

export interface AssetAllocationWeight {
  symbol: string;
  weightShare: number; // Share of the asset class (e.g. 0.7 for 70% of equities)
}

export interface TargetDateConfig {
  startAge: number;
  retirementAge: number;
  initialEquityWeight: number; // e.g. 0.90 for 90%
  terminalEquityWeight: number; // e.g. 0.40 for 40%
  growthAssets: AssetAllocationWeight[];
  safetyAssets: AssetAllocationWeight[];
}

export interface PhaseConfig {
  id: string;
  name: string;
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM
  weights: Record<string, number>; // symbol -> target weight
}

export interface DynamicPeriodResult {
  date: string;
  value: number;
  return: number;
  drawdown: number;
  weights: Record<string, number>;
}

export interface PhaseMetrics {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  months: number;
  startBalance: number;
  endBalance: number;
  totalReturn: number;
  cagr: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  benchmarkCAGR: number;
}

export interface DynamicAllocationResult {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  cagr: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  periods: DynamicPeriodResult[];
  phases: PhaseMetrics[];
  benchmarkPeriods: { date: string; value: number }[]; // 100% SPY
  benchmark6040Periods: { date: string; value: number }[]; // 60/40 SPY/BND
}

/**
 * Computes target asset weights at period index t out of totalPeriods T for an age-based glide path.
 */
export function getGlidePathWeights(
  config: TargetDateConfig,
  periodIndex: number,
  totalPeriods: number
): Record<string, number> {
  const progress = totalPeriods > 1 ? Math.min(1.0, Math.max(0.0, periodIndex / (totalPeriods - 1))) : 0;
  // Linear transition from initialEquity to terminalEquity
  const currentEquityWeight =
    config.initialEquityWeight + (config.terminalEquityWeight - config.initialEquityWeight) * progress;
  const currentSafetyWeight = 1.0 - currentEquityWeight;

  const weights: Record<string, number> = {};

  // Normalize growth asset shares
  const growthSum = config.growthAssets.reduce((sum, a) => sum + a.weightShare, 0) || 1;
  for (const asset of config.growthAssets) {
    weights[asset.symbol] = (weights[asset.symbol] || 0) + (asset.weightShare / growthSum) * currentEquityWeight;
  }

  // Normalize safety asset shares
  const safetySum = config.safetyAssets.reduce((sum, a) => sum + a.weightShare, 0) || 1;
  for (const asset of config.safetyAssets) {
    weights[asset.symbol] = (weights[asset.symbol] || 0) + (asset.weightShare / safetySum) * currentSafetyWeight;
  }

  return weights;
}

/**
 * Runs a dynamic asset allocation backtest across historical returns.
 */
export function runDynamicAllocationBacktest(
  dates: string[],
  returnsData: Record<string, number[]>,
  mode: 'glide_path' | 'multi_phase',
  glidePathConfig?: TargetDateConfig,
  phasesConfig?: PhaseConfig[],
  rebalanceSchedule: RebalanceSchedule = 'annually',
  initialBalance: number = 10000,
  riskFreeRate: number = 0.04
): DynamicAllocationResult {
  const n = dates.length;
  if (n === 0) {
    return {
      initialBalance,
      finalBalance: initialBalance,
      totalReturn: 0,
      cagr: 0,
      annualizedVolatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      periods: [],
      phases: [],
      benchmarkPeriods: [],
      benchmark6040Periods: [],
    };
  }

  // Track holdings: symbol -> current dollar value
  let holdings: Record<string, number> = {};
  let totalPortfolioValue = initialBalance;
  let peakValue = initialBalance;

  const periods: DynamicPeriodResult[] = [];
  const returnsList: number[] = [];

  // Benchmarks ($10,000 initial)
  let benchSpyValue = initialBalance;
  let bench6040Value = initialBalance;
  const benchmarkPeriods: { date: string; value: number }[] = [];
  const benchmark6040Periods: { date: string; value: number }[] = [];

  const spyRets = returnsData['SPY'] || new Array(n).fill(0);
  const bndRets = returnsData['BND'] || new Array(n).fill(0);

  // Helper to determine target weights at given date & index
  function getTargetWeightsForPeriod(index: number, dateStr: string): Record<string, number> {
    if (mode === 'glide_path' && glidePathConfig) {
      return getGlidePathWeights(glidePathConfig, index, n);
    } else if (mode === 'multi_phase' && phasesConfig && phasesConfig.length > 0) {
      // Find matching phase
      const matching = phasesConfig.find((p) => {
        return (!p.startDate || dateStr >= p.startDate) && (!p.endDate || dateStr <= p.endDate);
      });
      if (matching) return matching.weights;
      return phasesConfig[phasesConfig.length - 1].weights;
    }
    return { SPY: 0.6, BND: 0.4 };
  }

  // Initialize holdings based on initial target weights
  const initialWeights = getTargetWeightsForPeriod(0, dates[0]);
  for (const [sym, w] of Object.entries(initialWeights)) {
    holdings[sym] = initialBalance * w;
  }

  // Monthly execution loop
  for (let i = 0; i < n; i++) {
    const date = dates[i];
    const monthIndex = parseInt(date.split('-')[1], 10);

    // 1. Check if rebalancing is scheduled at period start
    let shouldRebalance = false;
    if (i === 0) {
      shouldRebalance = true;
    } else if (rebalanceSchedule === 'monthly') {
      shouldRebalance = true;
    } else if (rebalanceSchedule === 'quarterly' && (monthIndex === 1 || monthIndex === 4 || monthIndex === 7 || monthIndex === 10)) {
      shouldRebalance = true;
    } else if (rebalanceSchedule === 'annually' && monthIndex === 1) {
      shouldRebalance = true;
    }

    if (shouldRebalance) {
      const targetWeights = getTargetWeightsForPeriod(i, date);
      const curTotal = Object.values(holdings).reduce((sum, v) => sum + v, 0);
      holdings = {};
      for (const [sym, w] of Object.entries(targetWeights)) {
        holdings[sym] = curTotal * w;
      }
    }

    // 2. Apply period returns
    let newTotal = 0;
    const currentWeights: Record<string, number> = {};

    for (const [sym, val] of Object.entries(holdings)) {
      const r = returnsData[sym] ? returnsData[sym][i] || 0 : 0;
      const newVal = val * (1 + r);
      holdings[sym] = newVal;
      newTotal += newVal;
    }

    // Record asset weights at period end
    for (const [sym, val] of Object.entries(holdings)) {
      currentWeights[sym] = newTotal > 0 ? val / newTotal : 0;
    }

    const periodRet = totalPortfolioValue > 0 ? (newTotal - totalPortfolioValue) / totalPortfolioValue : 0;
    totalPortfolioValue = newTotal;
    returnsList.push(periodRet);

    if (totalPortfolioValue > peakValue) {
      peakValue = totalPortfolioValue;
    }
    const dd = peakValue > 0 ? (totalPortfolioValue - peakValue) / peakValue : 0;

    periods.push({
      date,
      value: Math.round(totalPortfolioValue * 100) / 100,
      return: periodRet,
      drawdown: Math.round(dd * 10000) / 10000,
      weights: currentWeights,
    });

    // Advance Benchmarks
    benchSpyValue *= 1 + (spyRets[i] || 0);
    bench6040Value *= 1 + (0.6 * (spyRets[i] || 0) + 0.4 * (bndRets[i] || 0));

    benchmarkPeriods.push({
      date,
      value: Math.round(benchSpyValue * 100) / 100,
    });
    benchmark6040Periods.push({
      date,
      value: Math.round(bench6040Value * 100) / 100,
    });
  }

  // Summary Metrics
  const finalBalance = periods[periods.length - 1].value;
  const totalReturn = (finalBalance - initialBalance) / initialBalance;
  const cagr = calculateCAGRFromReturns(returnsList, 12);
  const annualizedVolatility = calculateStandardDeviation(returnsList, true) * Math.sqrt(12);
  const sharpeRatio = calculateSharpeRatio(cagr, annualizedVolatility, riskFreeRate);
  const maxDrawdown = calculateMaxDrawdown(periods.map((p) => p.value));

  // Compute Phase-by-Phase Performance Attribution
  const phases: PhaseMetrics[] = [];

  if (mode === 'multi_phase' && phasesConfig && phasesConfig.length > 0) {
    for (const p of phasesConfig) {
      const pPeriods = periods.filter((pt) => {
        return (!p.startDate || pt.date >= p.startDate) && (!p.endDate || pt.date <= p.endDate);
      });

      if (pPeriods.length > 0) {
        const startVal = pPeriods[0].value / (1 + pPeriods[0].return);
        const endVal = pPeriods[pPeriods.length - 1].value;
        const pTotalRet = (endVal - startVal) / startVal;
        const pRets = pPeriods.map((pt) => pt.return);
        const pCAGR = calculateCAGRFromReturns(pRets, 12);
        const pVol = calculateStandardDeviation(pRets, true) * Math.sqrt(12);
        const pSharpe = calculateSharpeRatio(pCAGR, pVol, riskFreeRate);
        const pMaxDD = calculateMaxDrawdown(pPeriods.map((pt) => pt.value));

        // Benchmark CAGR during this phase
        const spySub = dates
          .map((d, idx) => ({ date: d, r: spyRets[idx] }))
          .filter((pt) => (!p.startDate || pt.date >= p.startDate) && (!p.endDate || pt.date <= p.endDate))
          .map((pt) => pt.r);
        const pBenchCAGR = calculateCAGRFromReturns(spySub, 12);

        phases.push({
          id: p.id,
          name: p.name,
          startDate: pPeriods[0].date,
          endDate: pPeriods[pPeriods.length - 1].date,
          months: pPeriods.length,
          startBalance: Math.round(startVal),
          endBalance: Math.round(endVal),
          totalReturn: Math.round(pTotalRet * 10000) / 100,
          cagr: Math.round(pCAGR * 10000) / 100,
          volatility: Math.round(pVol * 10000) / 100,
          sharpe: Math.round(pSharpe * 100) / 100,
          maxDrawdown: Math.round(pMaxDD * 10000) / 100,
          benchmarkCAGR: Math.round(pBenchCAGR * 10000) / 100,
        });
      }
    }
  } else if (mode === 'glide_path') {
    // Partition into 3 career lifecycle stages: Early Career (first 33%), Mid Career (middle 33%), Pre-Retirement (final 34%)
    const third = Math.floor(n / 3);
    const stages = [
      { name: 'Early Career Accumulation', start: 0, end: third },
      { name: 'Mid Career Transition', start: third, end: 2 * third },
      { name: 'Pre-Retirement Capital Preservation', start: 2 * third, end: n },
    ];

    for (let s = 0; s < stages.length; s++) {
      const stg = stages[s];
      const pPeriods = periods.slice(stg.start, stg.end);
      if (pPeriods.length > 0) {
        const startVal = pPeriods[0].value / (1 + pPeriods[0].return);
        const endVal = pPeriods[pPeriods.length - 1].value;
        const pTotalRet = (endVal - startVal) / startVal;
        const pRets = pPeriods.map((pt) => pt.return);
        const pCAGR = calculateCAGRFromReturns(pRets, 12);
        const pVol = calculateStandardDeviation(pRets, true) * Math.sqrt(12);
        const pSharpe = calculateSharpeRatio(pCAGR, pVol, riskFreeRate);
        const pMaxDD = calculateMaxDrawdown(pPeriods.map((pt) => pt.value));

        const spySub = spyRets.slice(stg.start, stg.end);
        const pBenchCAGR = calculateCAGRFromReturns(spySub, 12);

        phases.push({
          id: `stage-${s + 1}`,
          name: stg.name,
          startDate: pPeriods[0].date,
          endDate: pPeriods[pPeriods.length - 1].date,
          months: pPeriods.length,
          startBalance: Math.round(startVal),
          endBalance: Math.round(endVal),
          totalReturn: Math.round(pTotalRet * 10000) / 100,
          cagr: Math.round(pCAGR * 10000) / 100,
          volatility: Math.round(pVol * 10000) / 100,
          sharpe: Math.round(pSharpe * 100) / 100,
          maxDrawdown: Math.round(pMaxDD * 10000) / 100,
          benchmarkCAGR: Math.round(pBenchCAGR * 10000) / 100,
        });
      }
    }
  }

  return {
    initialBalance,
    finalBalance: Math.round(finalBalance * 100) / 100,
    totalReturn: Math.round(totalReturn * 10000) / 10000,
    cagr: Math.round(cagr * 10000) / 10000,
    annualizedVolatility: Math.round(annualizedVolatility * 10000) / 10000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
    periods,
    phases,
    benchmarkPeriods,
    benchmark6040Periods,
  };
}
