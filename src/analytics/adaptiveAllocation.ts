/**
 * Quantitative Adaptive Tactical Asset Allocation (AAA) Engine
 * Inspired by ReSolve Asset Management (Butler, Philbrick, Gordillo).
 * Combines cross-asset momentum ranking with dynamic covariance risk budgeting.
 */

import { solveRiskParity } from './riskParity';
import { solveOptimization } from './optimization';
import { calculateCAGR } from './returns';
import { calculateMaxDrawdown } from './drawdowns';
import { calculateAnnualizedVolatility } from './statistics';
import { calculateSharpeRatio, calculateSortinoRatio, calculateDownsideDeviation } from './risk';

export type AdaptiveWeightingMethod =
  | 'min_variance'
  | 'risk_parity'
  | 'inv_vol'
  | 'max_sharpe'
  | 'equal_weight';

export interface AdaptiveAllocationConfig {
  universe: string[];
  momentumLookbackMonths: number; // e.g., 1, 3, 6, 12
  volatilityLookbackMonths: number; // e.g., 3, 6, 12
  topN: number; // e.g., 1 to 5
  weightingMethod: AdaptiveWeightingMethod;
  useAbsoluteHurdle?: boolean;
  safeAsset?: string; // e.g., 'BND' or 'BIL'
}

export interface AdaptiveSignal {
  date: string;
  selectedAssets: Record<string, number>; // symbol -> weight
  cashWeight: number;
  rankedMomentum: { symbol: string; score: number; qualified: boolean }[];
}

export interface AdaptiveBacktestResult {
  signals: AdaptiveSignal[];
  strategyReturns: number[];
  benchmarkReturns: number[];
  dates: string[];
  strategyGrowth: { date: string; value: number }[];
  benchmarkGrowth: { date: string; value: number }[];
  drawdowns: number[];
  turnover: number; // Annualized single-sided turnover (%)
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
}

/**
 * Computes momentum score for each symbol at index t over lookback L
 * Score = (Price[t] - Price[t - L]) / Price[t - L]
 */
export function calculateMomentumScores(
  prices: Record<string, number[]>,
  symbols: string[],
  t: number,
  lookback: number
): { symbol: string; score: number }[] {
  const scores: { symbol: string; score: number }[] = [];

  for (const sym of symbols) {
    const p = prices[sym];
    if (!p || t < lookback) continue;
    const pCurrent = p[t];
    const pPast = p[t - lookback];
    if (pPast > 0) {
      scores.push({
        symbol: sym,
        score: (pCurrent - pPast) / pPast,
      });
    }
  }

  // Sort descending by momentum score
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Computes K x K sample covariance matrix of monthly returns over window [t - window + 1 .. t]
 */
export function computeSampleCovarianceMatrix(
  returns: Record<string, number[]>,
  symbols: string[],
  t: number,
  window: number
): number[][] {
  const k = symbols.length;
  const startIdx = t - window + 1;
  const means: number[] = [];

  // Means
  for (let i = 0; i < k; i++) {
    const sym = symbols[i];
    let sum = 0;
    for (let idx = startIdx; idx <= t; idx++) {
      sum += returns[sym]?.[idx] || 0;
    }
    means.push(sum / window);
  }

  // Covariance
  const cov: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  const denom = Math.max(1, window - 1);

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sumProd = 0;
      const symI = symbols[i];
      const symJ = symbols[j];
      for (let idx = startIdx; idx <= t; idx++) {
        const devI = (returns[symI]?.[idx] || 0) - means[i];
        const devJ = (returns[symJ]?.[idx] || 0) - means[j];
        sumProd += devI * devJ;
      }
      cov[i][j] = sumProd / denom;
    }
    // Slight ridge regularization on diagonal to guarantee strictly positive definite
    cov[i][i] += 1e-7;
  }

  return cov;
}

/**
 * Solves for asset weights among selected symbols using chosen risk/covariance method
 */
export function calculateAdaptiveWeights(
  symbols: string[],
  returns: Record<string, number[]>,
  t: number,
  window: number,
  method: AdaptiveWeightingMethod
): Record<string, number> {
  const k = symbols.length;
  if (k === 0) return {};
  if (k === 1) return { [symbols[0]]: 1.0 };

  if (method === 'equal_weight') {
    const w: Record<string, number> = {};
    symbols.forEach((sym) => {
      w[sym] = 1 / k;
    });
    return w;
  }

  const covMatrix = computeSampleCovarianceMatrix(returns, symbols, t, window);

  if (method === 'inv_vol') {
    const invVols: number[] = symbols.map((_, i) => {
      const vol = Math.sqrt(Math.max(1e-8, covMatrix[i][i] * 12));
      return 1 / vol;
    });
    const sumInv = invVols.reduce((a, b) => a + b, 0);
    const w: Record<string, number> = {};
    symbols.forEach((sym, i) => {
      w[sym] = invVols[i] / sumInv;
    });
    return w;
  }

  if (method === 'risk_parity') {
    const rp = solveRiskParity(symbols, covMatrix, undefined, 12, 300);
    return rp.weights;
  }

  // Calculate expected annualized returns over the window (used for min_variance dummy or max_sharpe)
  const expectedReturns: number[] = [];
  const startIdx = t - window + 1;
  for (let i = 0; i < k; i++) {
    const sym = symbols[i];
    let sum = 0;
    for (let idx = startIdx; idx <= t; idx++) {
      sum += returns[sym]?.[idx] || 0;
    }
    expectedReturns.push((sum / window) * 12);
  }

  if (method === 'min_variance') {
    const mv = solveOptimization(symbols, expectedReturns, covMatrix, 'min_variance');
    return mv.weights;
  }

  if (method === 'max_sharpe') {
    const ms = solveOptimization(symbols, expectedReturns, covMatrix, 'max_sharpe', undefined, 0.02);
    return ms.weights;
  }

  // Fallback equal weight
  const fallback: Record<string, number> = {};
  symbols.forEach((sym) => {
    fallback[sym] = 1 / k;
  });
  return fallback;
}

/**
 * Runs end-to-end Adaptive Tactical Asset Allocation backtest
 */
export function runAdaptiveAllocationBacktest(
  dates: string[],
  returns: Record<string, number[]>,
  prices: Record<string, number[]>,
  config: AdaptiveAllocationConfig,
  benchmarkSymbol: string = 'SPY'
): AdaptiveBacktestResult {
  const {
    universe,
    momentumLookbackMonths,
    volatilityLookbackMonths,
    topN,
    weightingMethod,
    useAbsoluteHurdle = true,
    safeAsset = 'BND',
  } = config;

  const n = dates.length;
  const warmup = Math.max(momentumLookbackMonths, volatilityLookbackMonths);
  const signals: AdaptiveSignal[] = [];

  for (let t = warmup; t < n; t++) {
    // Step 1: Momentum ranking at time t
    const allScores = calculateMomentumScores(prices, universe, t, momentumLookbackMonths);

    // Step 2: Select top N assets
    const topCandidates = allScores.slice(0, Math.min(topN, allScores.length));

    // Step 3: Absolute hurdle filter (momentum > 0)
    const qualifiedSymbols: string[] = [];
    let cashAllocationCount = 0;

    const rankedAudit = topCandidates.map((c) => {
      const isQualified = useAbsoluteHurdle ? c.score > 0 : true;
      if (isQualified) {
        qualifiedSymbols.push(c.symbol);
      } else {
        cashAllocationCount++;
      }
      return {
        symbol: c.symbol,
        score: c.score,
        qualified: isQualified,
      };
    });

    // Step 4: Calculate weights for qualified risky assets
    const selectedAssets: Record<string, number> = {};
    let cashWeight = 0;

    const riskyProportion = topCandidates.length > 0 ? (topCandidates.length - cashAllocationCount) / topCandidates.length : 0;
    const safeProportion = 1.0 - riskyProportion;

    if (qualifiedSymbols.length > 0) {
      const riskyWeights = calculateAdaptiveWeights(
        qualifiedSymbols,
        returns,
        t,
        volatilityLookbackMonths,
        weightingMethod
      );

      qualifiedSymbols.forEach((sym) => {
        selectedAssets[sym] = (riskyWeights[sym] || 0) * riskyProportion;
      });
    }

    if (safeProportion > 0.001) {
      selectedAssets[safeAsset] = (selectedAssets[safeAsset] || 0) + safeProportion;
      cashWeight = safeProportion;
    }

    signals.push({
      date: dates[t],
      selectedAssets,
      cashWeight,
      rankedMomentum: rankedAudit,
    });
  }

  // Step 5: Simulate compounding wealth over time
  // Note: Signal determined at end of month t executes over month t+1
  const startIdx = dates.length - signals.length;
  let stratVal = 10000;
  let benchVal = 10000;

  const stratGrowth = [{ date: dates[startIdx - 1] || dates[0], value: stratVal }];
  const benchGrowth = [{ date: dates[startIdx - 1] || dates[0], value: benchVal }];
  const stratRets: number[] = [];
  const benchRets: number[] = [];
  const drawdowns: number[] = [];
  let peakVal = 10000;

  // Single-sided turnover tracking
  let totalTurnover = 0;
  let prevWeights: Record<string, number> = {};

  for (let s = 0; s < signals.length; s++) {
    const sig = signals[s];
    const actualIdx = startIdx + s;

    // Turnover relative to prior period
    const allSymbols = new Set([...Object.keys(prevWeights), ...Object.keys(sig.selectedAssets)]);
    let stepDiff = 0;
    allSymbols.forEach((sym) => {
      const wNow = sig.selectedAssets[sym] || 0;
      const wOld = prevWeights[sym] || 0;
      stepDiff += Math.abs(wNow - wOld);
    });
    totalTurnover += stepDiff / 2;
    prevWeights = sig.selectedAssets;

    // Apply return
    let periodStratRet = 0;
    Object.entries(sig.selectedAssets).forEach(([sym, w]) => {
      const r = returns[sym]?.[actualIdx] || returns['SPY']?.[actualIdx] || 0;
      periodStratRet += w * r;
    });

    const bRet = returns[benchmarkSymbol]?.[actualIdx] || 0;

    stratVal *= 1 + periodStratRet;
    benchVal *= 1 + bRet;

    if (stratVal > peakVal) peakVal = stratVal;
    const dd = peakVal > 0 ? (stratVal - peakVal) / peakVal : 0;
    drawdowns.push(dd);

    stratGrowth.push({ date: sig.date, value: stratVal });
    benchGrowth.push({ date: sig.date, value: benchVal });
    stratRets.push(periodStratRet);
    benchRets.push(bRet);
  }

  const durationYears = Math.max(1 / 12, signals.length / 12);
  const cagr = calculateCAGR(10000, stratVal, durationYears);
  const volatility = calculateAnnualizedVolatility(stratRets, 12);
  const downsideDev = calculateDownsideDeviation(stratRets, 0, 12);
  const sharpeRatio = calculateSharpeRatio(cagr, volatility, 0.02);
  const sortinoRatio = calculateSortinoRatio(cagr, downsideDev, 0.02);
  const maxDrawdown = calculateMaxDrawdown(stratGrowth.map((g) => g.value));
  const annualTurnover = durationYears > 0 ? (totalTurnover / durationYears) * 100 : 0;

  let winMonths = 0;
  for (let i = 0; i < stratRets.length; i++) {
    if (stratRets[i] > benchRets[i]) winMonths++;
  }
  const winRate = stratRets.length > 0 ? (winMonths / stratRets.length) * 100 : 0;

  return {
    signals,
    strategyReturns: stratRets,
    benchmarkReturns: benchRets,
    dates: dates.slice(startIdx),
    strategyGrowth: stratGrowth,
    benchmarkGrowth: benchGrowth,
    drawdowns,
    turnover: annualTurnover,
    cagr,
    volatility,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    winRate,
  };
}
