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
