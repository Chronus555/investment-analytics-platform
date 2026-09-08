/**
 * Modern Portfolio Theory Optimization Engine
 * Efficient Frontier, Mean-Variance Optimization, Tangency / Max Sharpe, Min Volatility, and Box Constraints.
 */

import { calculateCovarianceMatrix, calculateMean } from './statistics';

export interface OptimizationConstraint {
  minWeight?: number; // default 0.0 (long-only)
  maxWeight?: number; // default 1.0
  assetMinWeights?: Record<string, number>;
  assetMaxWeights?: Record<string, number>;
}

export interface OptimizedPortfolioResult {
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  diversificationRatio?: number;
  cvar95?: number;
}

export interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  sharpeRatio: number;
  weights: Record<string, number>;
}

/**
 * Calculates portfolio expected return: w^T * mu
 */
export function calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
  return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
}

/**
 * Calculates portfolio annualized volatility: sqrt(w^T * Sigma * w)
 */
export function calculatePortfolioVolatility(weights: number[], covMatrix: number[][], frequency: number = 12): number {
  const n = weights.length;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return Math.sqrt(Math.max(0, variance * frequency));
}

/**
 * Calculates Choueifaty Diversification Ratio:
 * DR(w) = (sum_i w_i * sigma_i) / sigma_p
 */
export function calculateDiversificationRatio(
  weights: number[],
  covMatrix: number[][],
  frequency: number = 12
): number {
  const n = weights.length;
  let weightedVolSum = 0;
  for (let i = 0; i < n; i++) {
    const assetVol = Math.sqrt(Math.max(0, covMatrix[i][i] * frequency));
    weightedVolSum += weights[i] * assetVol;
  }
  const portVol = calculatePortfolioVolatility(weights, covMatrix, frequency);
  if (portVol <= 1e-8) return 1.0;
  return weightedVolSum / portVol;
}

/**
 * Calculates Historical Conditional Value-at-Risk (CVaR / Expected Shortfall)
 * at the given confidence level (e.g. 0.95 = average loss in the worst 5% months)
 */
export function calculatePortfolioCVaR(
  weights: number[],
  periodReturns: number[][], // [T x N] returns
  alpha: number = 0.95
): number {
  const T = periodReturns.length;
  if (T === 0) return 0;
  const n = weights.length;

  const portReturns: number[] = [];
  for (let t = 0; t < T; t++) {
    let r = 0;
    for (let i = 0; i < n; i++) {
      r += weights[i] * (periodReturns[t][i] || 0);
    }
    portReturns.push(r);
  }

  // Losses L_t = -R_p,t
  const losses = portReturns.map((r) => -r).sort((a, b) => a - b);
  const varIndex = Math.min(losses.length - 1, Math.floor(alpha * losses.length));
  const tailLosses = losses.slice(varIndex);
  if (tailLosses.length === 0) return losses[varIndex];
  const sumTail = tailLosses.reduce((sum, l) => sum + l, 0);
  return sumTail / tailLosses.length;
}

/**
 * Calculates Sortino Ratio: (E[R] - R_f) / DownsideDeviation
 */
export function calculatePortfolioSortino(
  weights: number[],
  expectedReturn: number,
  periodReturns: number[][],
  riskFreeRate: number = 0.04,
  targetHurdle: number = 0.0,
  frequency: number = 12
): number {
  const T = periodReturns.length;
  if (T === 0) return 0;
  const n = weights.length;

  const hurdleMonthly = targetHurdle / frequency;
  let downsideSumSquares = 0;

  for (let t = 0; t < T; t++) {
    let r = 0;
    for (let i = 0; i < n; i++) {
      r += weights[i] * (periodReturns[t][i] || 0);
    }
    const diff = r - hurdleMonthly;
    if (diff < 0) {
      downsideSumSquares += Math.pow(diff, 2);
    }
  }

  const downsideDeviation = Math.sqrt((downsideSumSquares / T) * frequency);
  if (downsideDeviation <= 1e-8) return 0;
  return (expectedReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Exact projection onto the simplex {w: sum(w) = 1, minW[i] <= w[i] <= maxW[i]}
 * using bisection on the Lagrange multiplier lambda.
 */
export function projectSimplexWithBounds(weights: number[], minW: number[], maxW: number[]): number[] {
  const n = weights.length;
  let low = -10.0;
  let high = 10.0;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Math.min(maxW[i], Math.max(minW[i], weights[i] - mid));
    }
    if (sum > 1.0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const mid = (low + high) / 2;
  const clamped = weights.map((w, i) => Math.min(maxW[i], Math.max(minW[i], w - mid)));
  const sum = clamped.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 1 / n);
  return clamped.map((v) => v / sum);
}

/**
 * Projected Gradient Descent Solver for Constrained Mean-Variance Optimization
 */
export function solveOptimization(
  symbols: string[],
  expectedReturns: number[],
  covMatrix: number[][],
  objective: 'min_variance' | 'max_sharpe' | 'target_return' | 'target_volatility',
  targetParam?: number,
  riskFreeRate: number = 0.04,
  constraints: OptimizationConstraint = {}
): OptimizedPortfolioResult {
  const n = symbols.length;
  if (n === 0) throw new Error('At least one asset required');
  if (n === 1) {
    const vol = Math.sqrt(covMatrix[0][0] * 12);
    const ret = expectedReturns[0];
    const sharpe = vol > 0 ? (ret - riskFreeRate) / vol : 0;
    return {
      weights: { [symbols[0]]: 1.0 },
      expectedReturn: ret,
      volatility: vol,
      sharpeRatio: sharpe,
    };
  }

  // Bounds
  const minW: number[] = symbols.map((s) => constraints.assetMinWeights?.[s] ?? constraints.minWeight ?? 0.0);
  const maxW: number[] = symbols.map((s) => constraints.assetMaxWeights?.[s] ?? constraints.maxWeight ?? 1.0);

  // Initialize equal weights
  let w = Array(n).fill(1 / n);

  // Objective function to minimize
  const evalObjective = (weights: number[]): number => {
    const vol = calculatePortfolioVolatility(weights, covMatrix, 12);
    const ret = calculatePortfolioReturn(weights, expectedReturns);
    const varAnn = Math.pow(vol, 2);

    if (objective === 'min_variance') {
      return varAnn;
    } else if (objective === 'max_sharpe') {
      // Minimize negative Sharpe
      const excess = ret - riskFreeRate;
      if (vol <= 0) return 1000;
      return -excess / vol;
    } else if (objective === 'target_return') {
      const target = targetParam ?? 0.10;
      // Minimize variance + penalty for missing return target
      return varAnn + 500 * Math.pow(ret - target, 2);
    } else if (objective === 'target_volatility') {
      const targetVol = targetParam ?? 0.12;
      // Maximize return subject to target vol
      return -ret + 500 * Math.pow(vol - targetVol, 2);
    }
    return varAnn;
  };

  // Numerical gradient with projected simplex
  const maxIter = 1000;
  let lr = 0.01;
  const eps = 1e-5;

  for (let iter = 0; iter < maxIter; iter++) {
    const grad: number[] = Array(n).fill(0);
    const baseVal = evalObjective(w);

    for (let i = 0; i < n; i++) {
      const wPerturb = [...w];
      wPerturb[i] += eps;
      // Re-normalize sum
      const sum = wPerturb.reduce((a, b) => a + b, 0);
      const normalized = wPerturb.map((val) => val / sum);
      grad[i] = (evalObjective(normalized) - baseVal) / eps;
    }

    // Step in opposite direction of gradient
    const stepW = w.map((val, i) => val - lr * grad[i]);

    // Project onto box bounds and simplex sum(w) = 1 via bisection on Lagrange multiplier
    const nextW = projectSimplexWithBounds(stepW, minW, maxW);

    // Line search / decay
    const nextVal = evalObjective(nextW);
    if (nextVal < baseVal) {
      w = nextW;
      lr *= 1.02; // Accelerate
    } else {
      lr *= 0.5; // Decelerate
    }

    if (lr < 1e-8) break;
  }

  // Final projection to guarantee exact simplex and bound satisfaction
  const normalizedWeights = projectSimplexWithBounds(w, minW, maxW);

  const weightMap: Record<string, number> = {};
  symbols.forEach((sym, i) => {
    weightMap[sym] = Math.round(normalizedWeights[i] * 10000) / 10000;
  });

  const expReturn = calculatePortfolioReturn(normalizedWeights, expectedReturns);
  const volatility = calculatePortfolioVolatility(normalizedWeights, covMatrix, 12);
  const sharpe = volatility > 0 ? (expReturn - riskFreeRate) / volatility : 0;

  return {
    weights: weightMap,
    expectedReturn: expReturn,
    volatility,
    sharpeRatio: sharpe,
  };
}

/**
 * Generates an Efficient Frontier curve tracing optimal portfolios across risk/return spectrum
 */
export function generateEfficientFrontier(
  symbols: string[],
  expectedReturns: number[],
  covMatrix: number[][],
  pointsCount: number = 25,
  riskFreeRate: number = 0.04,
  constraints: OptimizationConstraint = {}
): EfficientFrontierPoint[] {
  // 1. Find Min Variance portfolio
  const minVar = solveOptimization(symbols, expectedReturns, covMatrix, 'min_variance', undefined, riskFreeRate, constraints);
  // 2. Find Max Return (highest return individual asset within max bounds)
  const maxRet = Math.max(...expectedReturns);
  const minRet = minVar.expectedReturn;

  const frontier: EfficientFrontierPoint[] = [];
  const retStep = (maxRet - minRet) / Math.max(1, pointsCount - 1);

  for (let i = 0; i < pointsCount; i++) {
    const target = minRet + i * retStep;
    const opt = solveOptimization(symbols, expectedReturns, covMatrix, 'target_return', target, riskFreeRate, constraints);
    frontier.push({
      return: opt.expectedReturn,
      volatility: opt.volatility,
      sharpeRatio: opt.sharpeRatio,
      weights: opt.weights,
    });
  }

  // Sort by volatility ascending
  frontier.sort((a, b) => a.volatility - b.volatility);
  return frontier;
}

/**
 * Solves for the Most Diversified Portfolio (Choueifaty MDP):
 * Maximizes Diversification Ratio DR(w) subject to simplex box bounds.
 */
export function solveMostDiversifiedPortfolio(
  symbols: string[],
  covMatrix: number[][],
  expectedReturns?: number[],
  constraints: OptimizationConstraint = {}
): OptimizedPortfolioResult {
  const n = symbols.length;
  const assetVols = symbols.map((_, i) => Math.sqrt(Math.max(0, covMatrix[i][i] * 12)));
  const minW = symbols.map((s) => constraints.assetMinWeights?.[s] ?? constraints.minWeight ?? 0.0);
  const maxW = symbols.map((s) => constraints.assetMaxWeights?.[s] ?? constraints.maxWeight ?? 1.0);

  let w = Array(n).fill(1 / n);
  const maxIter = 800;
  let lr = 0.02;
  const eps = 1e-5;

  const evalObj = (weights: number[]) => {
    const portVol = calculatePortfolioVolatility(weights, covMatrix, 12);
    if (portVol <= 1e-8) return -1;
    const weightedVol = weights.reduce((sum, wi, i) => sum + wi * assetVols[i], 0);
    return -(weightedVol / portVol); // minimize negative DR
  };

  for (let iter = 0; iter < maxIter; iter++) {
    const grad: number[] = Array(n).fill(0);
    const baseVal = evalObj(w);

    for (let i = 0; i < n; i++) {
      const wP = [...w];
      wP[i] += eps;
      const sum = wP.reduce((a, b) => a + b, 0);
      const norm = wP.map((v) => v / sum);
      grad[i] = (evalObj(norm) - baseVal) / eps;
    }

    const stepW = w.map((v, i) => v - lr * grad[i]);
    const nextW = projectSimplexWithBounds(stepW, minW, maxW);
    const nextVal = evalObj(nextW);

    if (nextVal < baseVal) {
      w = nextW;
      lr *= 1.02;
    } else {
      lr *= 0.5;
    }
    if (lr < 1e-8) break;
  }

  const normalizedWeights = projectSimplexWithBounds(w, minW, maxW);
  const weightMap: Record<string, number> = {};
  symbols.forEach((s, i) => {
    weightMap[s] = Math.round(normalizedWeights[i] * 10000) / 10000;
  });

  const rets = expectedReturns || symbols.map(() => 0.08);
  const expRet = calculatePortfolioReturn(normalizedWeights, rets);
  const vol = calculatePortfolioVolatility(normalizedWeights, covMatrix, 12);
  const dr = calculateDiversificationRatio(normalizedWeights, covMatrix, 12);

  return {
    weights: weightMap,
    expectedReturn: expRet,
    volatility: vol,
    sharpeRatio: vol > 0 ? (expRet - 0.04) / vol : 0,
    diversificationRatio: dr,
  };
}

/**
 * Solves for Minimum Conditional Value-at-Risk (95% CVaR / Expected Shortfall):
 * Minimizes average tail losses in the worst 5% historical months.
 */
export function solveMinCVaR(
  symbols: string[],
  periodReturns: number[][],
  expectedReturns?: number[],
  covMatrix?: number[][],
  alpha: number = 0.95,
  constraints: OptimizationConstraint = {}
): OptimizedPortfolioResult {
  const n = symbols.length;
  const minW = symbols.map((s) => constraints.assetMinWeights?.[s] ?? constraints.minWeight ?? 0.0);
  const maxW = symbols.map((s) => constraints.assetMaxWeights?.[s] ?? constraints.maxWeight ?? 1.0);

  let w = Array(n).fill(1 / n);
  const maxIter = 600;
  let lr = 0.02;
  const eps = 1e-4;

  const evalObj = (weights: number[]) => {
    return calculatePortfolioCVaR(weights, periodReturns, alpha);
  };

  for (let iter = 0; iter < maxIter; iter++) {
    const grad: number[] = Array(n).fill(0);
    const baseVal = evalObj(w);

    for (let i = 0; i < n; i++) {
      const wP = [...w];
      wP[i] += eps;
      const sum = wP.reduce((a, b) => a + b, 0);
      const norm = wP.map((v) => v / sum);
      grad[i] = (evalObj(norm) - baseVal) / eps;
    }

    const currentLr = lr / (1 + 0.005 * iter);
    const stepW = w.map((v, i) => v - currentLr * grad[i]);
    w = projectSimplexWithBounds(stepW, minW, maxW);
  }

  const normalizedWeights = projectSimplexWithBounds(w, minW, maxW);
  const weightMap: Record<string, number> = {};
  symbols.forEach((s, i) => {
    weightMap[s] = Math.round(normalizedWeights[i] * 10000) / 10000;
  });

  const rets = expectedReturns || symbols.map((_, i) => {
    const assetRets = periodReturns.map((row) => row[i] || 0);
    return calculateMean(assetRets) * 12;
  });
  const expRet = calculatePortfolioReturn(normalizedWeights, rets);
  const cov = covMatrix || calculateCovarianceMatrix(symbols.map((_, i) => periodReturns.map((row) => row[i] || 0)));
  const vol = calculatePortfolioVolatility(normalizedWeights, cov, 12);
  const cvar = calculatePortfolioCVaR(normalizedWeights, periodReturns, alpha);

  return {
    weights: weightMap,
    expectedReturn: expRet,
    volatility: vol,
    sharpeRatio: vol > 0 ? (expRet - 0.04) / vol : 0,
    cvar95: cvar,
  };
}

/**
 * Solves for Maximum Sortino Ratio:
 * Maximizes excess return per unit of downside semi-deviation.
 */
export function solveMaxSortino(
  symbols: string[],
  expectedReturns: number[],
  periodReturns: number[][],
  covMatrix: number[][],
  riskFreeRate: number = 0.04,
  constraints: OptimizationConstraint = {}
): OptimizedPortfolioResult {
  const n = symbols.length;
  const minW = symbols.map((s) => constraints.assetMinWeights?.[s] ?? constraints.minWeight ?? 0.0);
  const maxW = symbols.map((s) => constraints.assetMaxWeights?.[s] ?? constraints.maxWeight ?? 1.0);

  let w = Array(n).fill(1 / n);
  const maxIter = 700;
  let lr = 0.015;
  const eps = 1e-5;

  const evalObj = (weights: number[]) => {
    const ret = calculatePortfolioReturn(weights, expectedReturns);
    const sortino = calculatePortfolioSortino(weights, ret, periodReturns, riskFreeRate, 0.0, 12);
    return -sortino; // minimize negative Sortino
  };

  for (let iter = 0; iter < maxIter; iter++) {
    const grad: number[] = Array(n).fill(0);
    const baseVal = evalObj(w);

    for (let i = 0; i < n; i++) {
      const wP = [...w];
      wP[i] += eps;
      const sum = wP.reduce((a, b) => a + b, 0);
      const norm = wP.map((v) => v / sum);
      grad[i] = (evalObj(norm) - baseVal) / eps;
    }

    const stepW = w.map((v, i) => v - lr * grad[i]);
    const nextW = projectSimplexWithBounds(stepW, minW, maxW);
    const nextVal = evalObj(nextW);

    if (nextVal < baseVal) {
      w = nextW;
      lr *= 1.02;
    } else {
      lr *= 0.5;
    }
    if (lr < 1e-8) break;
  }

  const normalizedWeights = projectSimplexWithBounds(w, minW, maxW);
  const weightMap: Record<string, number> = {};
  symbols.forEach((s, i) => {
    weightMap[s] = Math.round(normalizedWeights[i] * 10000) / 10000;
  });

  const expRet = calculatePortfolioReturn(normalizedWeights, expectedReturns);
  const vol = calculatePortfolioVolatility(normalizedWeights, covMatrix, 12);
  const sortino = calculatePortfolioSortino(normalizedWeights, expRet, periodReturns, riskFreeRate, 0.0, 12);

  return {
    weights: weightMap,
    expectedReturn: expRet,
    volatility: vol,
    sharpeRatio: vol > 0 ? (expRet - riskFreeRate) / vol : 0,
    sortinoRatio: sortino,
  };
}

/**
 * Solves for Kelly Criterion Portfolio (Geometric Growth Optimal):
 * Maximizes expected log utility growth rate G(w) = w^T * mu - (1 / (2*f)) * w^T * Sigma * w * 12
 * with fractional Kelly scaling (default fraction = 0.5 for Half Kelly).
 */
export function solveKellyCriterion(
  symbols: string[],
  expectedReturns: number[],
  covMatrix: number[][],
  fraction: number = 0.5,
  constraints: OptimizationConstraint = {}
): OptimizedPortfolioResult {
  const n = symbols.length;
  const minW = symbols.map((s) => constraints.assetMinWeights?.[s] ?? constraints.minWeight ?? 0.0);
  const maxW = symbols.map((s) => constraints.assetMaxWeights?.[s] ?? constraints.maxWeight ?? 1.0);

  let w = Array(n).fill(1 / n);
  const maxIter = 800;
  let lr = 0.02;
  const eps = 1e-5;

  const evalObj = (weights: number[]) => {
    const ret = calculatePortfolioReturn(weights, expectedReturns);
    const vol = calculatePortfolioVolatility(weights, covMatrix, 12);
    const varAnn = Math.pow(vol, 2);
    const growth = ret - (0.5 / fraction) * varAnn;
    return -growth; // minimize negative growth
  };

  for (let iter = 0; iter < maxIter; iter++) {
    const grad: number[] = Array(n).fill(0);
    const baseVal = evalObj(w);

    for (let i = 0; i < n; i++) {
      const wP = [...w];
      wP[i] += eps;
      const sum = wP.reduce((a, b) => a + b, 0);
      const norm = wP.map((v) => v / sum);
      grad[i] = (evalObj(norm) - baseVal) / eps;
    }

    const stepW = w.map((v, i) => v - lr * grad[i]);
    const nextW = projectSimplexWithBounds(stepW, minW, maxW);
    const nextVal = evalObj(nextW);

    if (nextVal < baseVal) {
      w = nextW;
      lr *= 1.02;
    } else {
      lr *= 0.5;
    }
    if (lr < 1e-8) break;
  }

  const normalizedWeights = projectSimplexWithBounds(w, minW, maxW);
  const weightMap: Record<string, number> = {};
  symbols.forEach((s, i) => {
    weightMap[s] = Math.round(normalizedWeights[i] * 10000) / 10000;
  });

  const expRet = calculatePortfolioReturn(normalizedWeights, expectedReturns);
  const vol = calculatePortfolioVolatility(normalizedWeights, covMatrix, 12);

  return {
    weights: weightMap,
    expectedReturn: expRet,
    volatility: vol,
    sharpeRatio: vol > 0 ? (expRet - 0.04) / vol : 0,
  };
}
