/**
 * Rolling Out-of-Sample Walk-Forward Portfolio Optimization Engine
 * 
 * In classical Mean-Variance Optimization, evaluating a portfolio on the same data
 * used to optimize weights creates severe look-ahead bias and overfitting.
 * 
 * Walk-Forward Optimization splits history into:
 * 1. In-Sample (IS) Training Window: [t - W_in, t) to solve optimal weights.
 * 2. Out-of-Sample (OOS) Testing Window: [t, t + W_out) where weights are applied forward.
 * 
 * Evaluates real-world empirical performance, tracking the Sharpe Decay Factor
 * (OOS Sharpe / IS Expected Sharpe), rebalance turnover friction, and dynamic weight drift.
 */

import { calculateCovarianceMatrix, calculateMean, calculateStandardDeviation } from './statistics';
import { solveOptimization, calculatePortfolioReturn, calculatePortfolioVolatility, OptimizationConstraint } from './optimization';
import { solveRiskParity } from './riskParity';

export type WalkForwardModel = 'max_sharpe' | 'min_variance' | 'risk_parity';

export interface WalkForwardConfig {
  symbols: string[];
  returnsMap: Record<string, number[]>;
  dates: string[];
  model: WalkForwardModel;
  inSampleMonths: number; // e.g. 12, 24, 36, 60
  outOfSampleMonths: number; // e.g. 1, 3, 6, 12
  minWeight?: number; // default 0.0
  maxWeight?: number; // default 1.0 (or 0.40)
  riskFreeRate?: number; // default 0.04
}

export interface RebalanceEvent {
  rebalanceIndex: number;
  date: string;
  lookbackStartDate: string;
  lookbackEndDate: string;
  weights: Record<string, number>;
  inSampleReturn: number;
  inSampleVol: number;
  inSampleSharpe: number;
  outOfSampleReturn: number; // Realized compound return over holding period
  outOfSampleVol: number;
  outOfSampleSharpe: number;
  turnover: number; // Single-sided portfolio turnover (0 to 1)
}

export interface OutOfSampleMonthPoint {
  date: string;
  monthIndex: number;
  return: number;
  wealth: number;
  drawdown: number;
  weights: Record<string, number>;
}

export interface BenchmarkSeriesResult {
  name: string;
  series: { date: string; wealth: number; return: number; drawdown: number }[];
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  weights?: Record<string, number>;
}

export interface WalkForwardResult {
  outOfSampleSeries: OutOfSampleMonthPoint[];
  rebalanceEvents: RebalanceEvent[];
  kpis: {
    cagr: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    avgTurnover: number;
    inSampleAvgSharpe: number;
    sharpeDecay: number; // Realized OOS Sharpe / IS Sharpe
    totalMonths: number;
    rebalanceCount: number;
  };
  benchmarks: {
    equalWeight: BenchmarkSeriesResult;
    benchmark6040: BenchmarkSeriesResult;
    inSampleOverfit: BenchmarkSeriesResult;
  };
}

/**
 * Computes CAGR, Volatility, Sharpe, and Max Drawdown from monthly returns
 */
function computeSeriesMetrics(
  returns: number[],
  wealthSeries: number[],
  riskFreeRate: number = 0.04
): { cagr: number; volatility: number; sharpeRatio: number; maxDrawdown: number } {
  const n = returns.length;
  if (n === 0) {
    return { cagr: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0 };
  }

  const finalWealth = wealthSeries[wealthSeries.length - 1];
  const initialWealth = 10000;
  const years = n / 12;
  const cagr = years > 0 ? Math.pow(finalWealth / initialWealth, 1 / years) - 1 : 0;

  const std = calculateStandardDeviation(returns);
  const volatility = std * Math.sqrt(12);

  const sharpeRatio = volatility > 0 ? (cagr - riskFreeRate) / volatility : 0;

  // Max drawdown
  let peak = initialWealth;
  let maxDd = 0;
  for (const w of wealthSeries) {
    if (w > peak) peak = w;
    const dd = peak > 0 ? (w - peak) / peak : 0;
    if (dd < maxDd) maxDd = dd;
  }

  return { cagr, volatility, sharpeRatio, maxDrawdown: maxDd };
}

/**
 * Executes a Walk-Forward Optimization across the provided return series.
 */
export function runWalkForwardOptimization(config: WalkForwardConfig): WalkForwardResult {
  const {
    symbols,
    returnsMap,
    dates,
    model,
    inSampleMonths,
    outOfSampleMonths,
    minWeight = 0.0,
    maxWeight = 0.40,
    riskFreeRate = 0.04,
  } = config;

  const totalPeriods = dates.length;
  if (symbols.length === 0) throw new Error('At least one asset symbol is required.');
  if (totalPeriods <= inSampleMonths) {
    throw new Error(`Data length (${totalPeriods} months) must be greater than in-sample window (${inSampleMonths} months).`);
  }

  const constraints: OptimizationConstraint = {
    minWeight,
    maxWeight,
  };

  const rebalanceEvents: RebalanceEvent[] = [];
  const outOfSampleSeries: OutOfSampleMonthPoint[] = [];

  let currentWealth = 10000;
  let peakWealth = 10000;
  let driftedWeights: Record<string, number> = {};

  let t = inSampleMonths;
  let rebalIdx = 0;

  while (t < totalPeriods) {
    // 1. Extract In-Sample Window: [t - inSampleMonths, t)
    const isStart = t - inSampleMonths;
    const isEnd = t; // exclusive

    const isReturnsList: number[][] = symbols.map((sym) => {
      const series = returnsMap[sym] || [];
      return series.slice(isStart, isEnd);
    });

    // In-Sample annualized mean returns and monthly covariance
    const expReturns = isReturnsList.map((s) => {
      const mean = calculateMean(s);
      return Math.pow(1 + mean, 12) - 1;
    });
    const covMatrix = calculateCovarianceMatrix(isReturnsList);

    // 2. Solve Optimal Weights
    let optWeights: Record<string, number> = {};
    let isExpRet = 0;
    let isExpVol = 0;
    let isExpSharpe = 0;

    if (model === 'risk_parity') {
      const rpRes = solveRiskParity(symbols, covMatrix);
      optWeights = rpRes.weights;
      // Calculate expected metrics with these weights
      const wArray = symbols.map((s) => optWeights[s] || 0);
      isExpRet = calculatePortfolioReturn(wArray, expReturns);
      isExpVol = calculatePortfolioVolatility(wArray, covMatrix, 12);
      isExpSharpe = isExpVol > 0 ? (isExpRet - riskFreeRate) / isExpVol : 0;
    } else {
      // 'max_sharpe' or 'min_variance'
      const optRes = solveOptimization(
        symbols,
        expReturns,
        covMatrix,
        model,
        undefined,
        riskFreeRate,
        constraints
      );
      optWeights = optRes.weights;
      isExpRet = optRes.expectedReturn;
      isExpVol = optRes.volatility;
      isExpSharpe = optRes.sharpeRatio;
    }

    // 3. Calculate Turnover
    let turnover = 0;
    if (rebalIdx === 0) {
      turnover = 1.0; // Initial portfolio construction
    } else {
      let sumDiff = 0;
      for (const s of symbols) {
        const wNew = optWeights[s] || 0;
        const wOld = driftedWeights[s] || 0;
        sumDiff += Math.abs(wNew - wOld);
      }
      turnover = Math.round((sumDiff / 2) * 10000) / 10000;
    }

    // 4. Step Out-of-Sample Forward: [t, min(t + outOfSampleMonths, totalPeriods))
    const oosEnd = Math.min(t + outOfSampleMonths, totalPeriods);
    let activeWeights = { ...optWeights };
    const windowStartWealth = currentWealth;
    const windowReturns: number[] = [];

    for (let m = t; m < oosEnd; m++) {
      // Portfolio realized return for month m
      let monthRet = 0;
      for (const s of symbols) {
        const w = activeWeights[s] || 0;
        const r = returnsMap[s]?.[m] || 0;
        monthRet += w * r;
      }

      windowReturns.push(monthRet);
      currentWealth *= 1 + monthRet;
      if (currentWealth > peakWealth) peakWealth = currentWealth;
      const dd = peakWealth > 0 ? (currentWealth - peakWealth) / peakWealth : 0;

      outOfSampleSeries.push({
        date: dates[m],
        monthIndex: m,
        return: monthRet,
        wealth: currentWealth,
        drawdown: dd,
        weights: { ...activeWeights },
      });

      // Drift weights forward for next month
      const denom = 1 + monthRet;
      const nextWeights: Record<string, number> = {};
      for (const s of symbols) {
        const w = activeWeights[s] || 0;
        const r = returnsMap[s]?.[m] || 0;
        nextWeights[s] = denom !== 0 ? (w * (1 + r)) / denom : w;
      }
      activeWeights = nextWeights;
    }

    // Drifted weights at end of window for next rebalance comparison
    driftedWeights = { ...activeWeights };

    // Realized metrics for this specific window
    const windowCumRet = windowStartWealth > 0 ? (currentWealth - windowStartWealth) / windowStartWealth : 0;
    const windowStd = calculateStandardDeviation(windowReturns);
    const windowVol = windowStd * Math.sqrt(12);
    const windowMonths = oosEnd - t;
    const windowAnnRet = windowMonths > 0 ? Math.pow(1 + windowCumRet, 12 / windowMonths) - 1 : 0;
    const windowSharpe = windowVol > 0 ? (windowAnnRet - riskFreeRate) / windowVol : 0;

    rebalanceEvents.push({
      rebalanceIndex: rebalIdx + 1,
      date: dates[t],
      lookbackStartDate: dates[isStart],
      lookbackEndDate: dates[isEnd - 1],
      weights: { ...optWeights },
      inSampleReturn: isExpRet,
      inSampleVol: isExpVol,
      inSampleSharpe: isExpSharpe,
      outOfSampleReturn: windowCumRet,
      outOfSampleVol: windowVol,
      outOfSampleSharpe: windowSharpe,
      turnover,
    });

    rebalIdx++;
    t += outOfSampleMonths;
  }

  // Calculate Overall Walk-Forward Out-of-Sample KPIs
  const allOosReturns = outOfSampleSeries.map((p) => p.return);
  const allOosWealth = outOfSampleSeries.map((p) => p.wealth);
  const { cagr, volatility, sharpeRatio, maxDrawdown } = computeSeriesMetrics(
    allOosReturns,
    allOosWealth,
    riskFreeRate
  );

  const avgTurnover =
    rebalanceEvents.length > 1
      ? rebalanceEvents.slice(1).reduce((sum, e) => sum + e.turnover, 0) / (rebalanceEvents.length - 1)
      : 1.0;

  const inSampleAvgSharpe =
    rebalanceEvents.length > 0
      ? rebalanceEvents.reduce((sum, e) => sum + e.inSampleSharpe, 0) / rebalanceEvents.length
      : 0;

  const sharpeDecay = inSampleAvgSharpe !== 0 ? sharpeRatio / inSampleAvgSharpe : 0;

  // -------------------------------------------------------------
  // BENCHMARKS (Evaluated over the exact same out-of-sample dates)
  // -------------------------------------------------------------
  const oosStartIndex = inSampleMonths;

  // 1. Equal Weight (1/N) benchmark rebalanced every outOfSampleMonths
  let eqWealth = 10000;
  let eqPeak = 10000;
  const eqSeries: { date: string; wealth: number; return: number; drawdown: number }[] = [];
  const eqReturns: number[] = [];

  for (let step = oosStartIndex; step < totalPeriods; step += outOfSampleMonths) {
    const stepEnd = Math.min(step + outOfSampleMonths, totalPeriods);
    let eqActiveW: Record<string, number> = {};
    symbols.forEach((s) => (eqActiveW[s] = 1 / symbols.length));

    for (let m = step; m < stepEnd; m++) {
      let rMonth = 0;
      for (const s of symbols) {
        rMonth += (eqActiveW[s] || 0) * (returnsMap[s]?.[m] || 0);
      }
      eqReturns.push(rMonth);
      eqWealth *= 1 + rMonth;
      if (eqWealth > eqPeak) eqPeak = eqWealth;
      const dd = eqPeak > 0 ? (eqWealth - eqPeak) / eqPeak : 0;
      eqSeries.push({ date: dates[m], wealth: eqWealth, return: rMonth, drawdown: dd });

      // drift
      const denom = 1 + rMonth;
      const nextW: Record<string, number> = {};
      for (const s of symbols) {
        nextW[s] = denom !== 0 ? ((eqActiveW[s] || 0) * (1 + (returnsMap[s]?.[m] || 0))) / denom : eqActiveW[s];
      }
      eqActiveW = nextW;
    }
  }

  const eqMetrics = computeSeriesMetrics(eqReturns, eqSeries.map((s) => s.wealth), riskFreeRate);
  const equalWeightBenchmark: BenchmarkSeriesResult = {
    name: 'Equal Weight (1/N)',
    series: eqSeries,
    cagr: eqMetrics.cagr,
    volatility: eqMetrics.volatility,
    sharpeRatio: eqMetrics.sharpeRatio,
    maxDrawdown: eqMetrics.maxDrawdown,
  };

  // 2. 60/40 Equity/Bond (SPY/BND) Benchmark
  const eqSym = returnsMap['SPY'] ? 'SPY' : symbols[0];
  const bondSym = returnsMap['BND'] ? 'BND' : returnsMap['AGG'] ? 'AGG' : symbols[1] || symbols[0];

  let b6040Wealth = 10000;
  let b6040Peak = 10000;
  const b6040Series: { date: string; wealth: number; return: number; drawdown: number }[] = [];
  const b6040Returns: number[] = [];

  for (let step = oosStartIndex; step < totalPeriods; step += outOfSampleMonths) {
    const stepEnd = Math.min(step + outOfSampleMonths, totalPeriods);
    let wEq = 0.60;
    let wBond = 0.40;

    for (let m = step; m < stepEnd; m++) {
      const rEq = returnsMap[eqSym]?.[m] || 0;
      const rBond = returnsMap[bondSym]?.[m] || 0;
      const rMonth = wEq * rEq + wBond * rBond;

      b6040Returns.push(rMonth);
      b6040Wealth *= 1 + rMonth;
      if (b6040Wealth > b6040Peak) b6040Peak = b6040Wealth;
      const dd = b6040Peak > 0 ? (b6040Wealth - b6040Peak) / b6040Peak : 0;
      b6040Series.push({ date: dates[m], wealth: b6040Wealth, return: rMonth, drawdown: dd });

      // drift
      const denom = 1 + rMonth;
      if (denom !== 0) {
        wEq = (wEq * (1 + rEq)) / denom;
        wBond = (wBond * (1 + rBond)) / denom;
      }
    }
  }

  const b6040Metrics = computeSeriesMetrics(b6040Returns, b6040Series.map((s) => s.wealth), riskFreeRate);
  const benchmark6040: BenchmarkSeriesResult = {
    name: '60/40 Equity/Bond',
    series: b6040Series,
    cagr: b6040Metrics.cagr,
    volatility: b6040Metrics.volatility,
    sharpeRatio: b6040Metrics.sharpeRatio,
    maxDrawdown: b6040Metrics.maxDrawdown,
  };

  // 3. Static In-Sample Overfit Portfolio (Look-Ahead Bias Trap)
  // Solve optimization once on the ENTIRE history [0, totalPeriods)
  const fullReturnsList = symbols.map((s) => returnsMap[s] || []);
  const fullExpRets = fullReturnsList.map((s) => Math.pow(1 + calculateMean(s), 12) - 1);
  const fullCov = calculateCovarianceMatrix(fullReturnsList);

  let overfitWeights: Record<string, number> = {};
  if (model === 'risk_parity') {
    overfitWeights = solveRiskParity(symbols, fullCov).weights;
  } else {
    overfitWeights = solveOptimization(
      symbols,
      fullExpRets,
      fullCov,
      model,
      undefined,
      riskFreeRate,
      constraints
    ).weights;
  }

  let ofWealth = 10000;
  let ofPeak = 10000;
  const ofSeries: { date: string; wealth: number; return: number; drawdown: number }[] = [];
  const ofReturns: number[] = [];

  for (let step = oosStartIndex; step < totalPeriods; step += outOfSampleMonths) {
    const stepEnd = Math.min(step + outOfSampleMonths, totalPeriods);
    let ofActiveW = { ...overfitWeights };

    for (let m = step; m < stepEnd; m++) {
      let rMonth = 0;
      for (const s of symbols) {
        rMonth += (ofActiveW[s] || 0) * (returnsMap[s]?.[m] || 0);
      }
      ofReturns.push(rMonth);
      ofWealth *= 1 + rMonth;
      if (ofWealth > ofPeak) ofPeak = ofWealth;
      const dd = ofPeak > 0 ? (ofWealth - ofPeak) / ofPeak : 0;
      ofSeries.push({ date: dates[m], wealth: ofWealth, return: rMonth, drawdown: dd });

      const denom = 1 + rMonth;
      const nextW: Record<string, number> = {};
      for (const s of symbols) {
        nextW[s] = denom !== 0 ? ((ofActiveW[s] || 0) * (1 + (returnsMap[s]?.[m] || 0))) / denom : ofActiveW[s];
      }
      ofActiveW = nextW;
    }
  }

  const ofMetrics = computeSeriesMetrics(ofReturns, ofSeries.map((s) => s.wealth), riskFreeRate);
  const inSampleOverfit: BenchmarkSeriesResult = {
    name: 'In-Sample Overfit (Look-Ahead)',
    series: ofSeries,
    cagr: ofMetrics.cagr,
    volatility: ofMetrics.volatility,
    sharpeRatio: ofMetrics.sharpeRatio,
    maxDrawdown: ofMetrics.maxDrawdown,
    weights: overfitWeights,
  };

  return {
    outOfSampleSeries,
    rebalanceEvents,
    kpis: {
      cagr,
      volatility,
      sharpeRatio,
      maxDrawdown,
      avgTurnover,
      inSampleAvgSharpe,
      sharpeDecay,
      totalMonths: outOfSampleSeries.length,
      rebalanceCount: rebalanceEvents.length,
    },
    benchmarks: {
      equalWeight: equalWeightBenchmark,
      benchmark6040,
      inSampleOverfit,
    },
  };
}
