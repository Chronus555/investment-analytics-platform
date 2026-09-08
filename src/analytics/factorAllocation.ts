/**
 * Quantitative Risk Factor Allocation & Target Factor Matching Engine
 * Reverse-solves long-only asset weights to match user-defined systematic factor exposures.
 * Portfolio Visualizer Discipline 5.2 (Risk Factor Allocation).
 */

import { runMultipleRegression } from './factors';
import { projectSimplexWithBounds } from './optimization';
import { calculateCAGR } from './returns';
import { calculateAnnualizedVolatility } from './statistics';
import { calculateMaxDrawdown } from './drawdowns';
import { calculateSharpeRatio } from './risk';

export interface TargetFactorExposures {
  mkt: number; // Market Beta
  smb: number; // Size Beta (Small minus Big)
  hml: number; // Value Beta (High minus Low)
  mom: number; // Momentum Beta
}

export interface FactorMatchedResult {
  weights: Record<string, number>;
  achievedBetas: TargetFactorExposures;
  targetBetas: TargetFactorExposures;
  errors: Record<string, number>;
  meanAbsoluteError: number;
  rSquared: number;
}

export interface FactorPortfolioSimulation {
  growthSeries: { date: string; value: number }[];
  benchmarkSeries: { date: string; value: number }[];
  cagr: number;
  benchCagr: number;
  volatility: number;
  benchVol: number;
  sharpe: number;
  benchSharpe: number;
  maxDrawdown: number;
  benchMaxDrawdown: number;
}

/**
 * Builds the factor loadings matrix B (K x N) across the universe of assets
 * using multi-factor regression against MKT, SMB, HML, MOM.
 */
export function extractUniverseFactorLoadings(
  returns: Record<string, number[]>,
  universe: string[],
  rfSymbol: string = 'BIL',
  mktSymbol: string = 'SPY',
  smallSymbol: string = 'IWM',
  valueSymbol: string = 'AVUV',
  techSymbol: string = 'QQQ'
): { symbols: string[]; factorMatrix: number[][]; factorNames: string[] } {
  const mkt = returns[mktSymbol] || [];
  const rf = returns[rfSymbol] || Array(mkt.length).fill(0.002);
  const small = returns[smallSymbol] || [];
  const val = returns[valueSymbol] || [];
  const tech = returns[techSymbol] || [];

  const nObs = mkt.length;
  const factorNames = ['MKT', 'SMB', 'HML', 'MOM'];

  // Construct [T x 4] matrix of factor returns
  const xMatrix: number[][] = [];
  for (let t = 0; t < nObs; t++) {
    const mktRf = mkt[t] - (rf[t] || 0);
    const smb = (small[t] || 0) - mkt[t];
    const hml = 0.5 * ((val[t] || 0) - (tech[t] || 0));
    const mom = (tech[t] || 0) - mkt[t];
    xMatrix.push([mktRf, smb, hml, mom]);
  }

  // Factor loadings matrix: 4 rows (factors), N columns (assets)
  const factorMatrix: number[][] = Array.from({ length: 4 }, () => []);

  for (const sym of universe) {
    const assetRets = returns[sym] || mkt;
    const yExcess = assetRets.map((r, t) => r - (rf[t] || 0));

    try {
      const reg = runMultipleRegression(yExcess, xMatrix, factorNames);
      factorMatrix[0].push(reg.betas['MKT'] ?? 1.0);
      factorMatrix[1].push(reg.betas['SMB'] ?? 0.0);
      factorMatrix[2].push(reg.betas['HML'] ?? 0.0);
      factorMatrix[3].push(reg.betas['MOM'] ?? 0.0);
    } catch {
      factorMatrix[0].push(1.0);
      factorMatrix[1].push(0.0);
      factorMatrix[2].push(0.0);
      factorMatrix[3].push(0.0);
    }
  }

  return { symbols: universe, factorMatrix, factorNames };
}

/**
 * Solves constrained reverse optimization to match target factor exposures:
 * min_w 0.5 * || B * w - beta_target ||^2 + 0.5 * lambda * w^T * Sigma * w
 * subject to sum(w) = 1, 0 <= w_i <= maxWeight
 */
export function solveTargetFactorAllocation(
  symbols: string[],
  factorMatrix: number[][], // [K x N]
  targetBetas: TargetFactorExposures,
  covMatrix?: number[][],
  maxWeight: number = 0.50,
  lambdaReg: number = 0.01
): FactorMatchedResult {
  const n = symbols.length;
  const k = 4;
  const targetVec = [targetBetas.mkt, targetBetas.smb, targetBetas.hml, targetBetas.mom];

  const minW = Array(n).fill(0.0);
  const maxW = Array(n).fill(Math.max(1 / n, Math.min(1.0, maxWeight)));

  // Initialize equal weights projected to bounds
  let w = projectSimplexWithBounds(Array(n).fill(1 / n), minW, maxW);

  // Gradient descent
  const maxIter = 1200;
  let lr = 0.05;

  for (let iter = 0; iter < maxIter; iter++) {
    // Current portfolio factor exposures: B * w (length K)
    const betaP: number[] = Array(k).fill(0);
    for (let f = 0; f < k; f++) {
      for (let i = 0; i < n; i++) {
        betaP[f] += factorMatrix[f][i] * w[i];
      }
    }

    // Discrepancy: (betaP - targetVec)
    const diff: number[] = betaP.map((val, f) => val - targetVec[f]);

    // Gradient: grad = B^T * diff + lambda * (cov * w)
    const grad: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sumGrad = 0;
      for (let f = 0; f < k; f++) {
        sumGrad += factorMatrix[f][i] * diff[f];
      }
      if (covMatrix && covMatrix[i]) {
        let covTerm = 0;
        for (let j = 0; j < n; j++) {
          covTerm += covMatrix[i][j] * w[j];
        }
        sumGrad += lambdaReg * covTerm;
      }
      grad[i] = sumGrad;
    }

    // Step and project
    const nextW = w.map((wi, i) => wi - lr * grad[i]);
    w = projectSimplexWithBounds(nextW, minW, maxW);

    // Adaptive decay
    if (iter > 0 && iter % 300 === 0) {
      lr *= 0.7;
    }
  }

  // Calculate final achieved exposures
  const achievedVec: number[] = Array(k).fill(0);
  for (let f = 0; f < k; f++) {
    for (let i = 0; i < n; i++) {
      achievedVec[f] += factorMatrix[f][i] * w[i];
    }
  }

  const achievedBetas: TargetFactorExposures = {
    mkt: achievedVec[0],
    smb: achievedVec[1],
    hml: achievedVec[2],
    mom: achievedVec[3],
  };

  const errors: Record<string, number> = {
    MKT: Math.abs(achievedVec[0] - targetVec[0]),
    SMB: Math.abs(achievedVec[1] - targetVec[1]),
    HML: Math.abs(achievedVec[2] - targetVec[2]),
    MOM: Math.abs(achievedVec[3] - targetVec[3]),
  };

  const meanAbsoluteError = (errors.MKT + errors.SMB + errors.HML + errors.MOM) / 4;

  // Fit R^2: 1 - sum(err^2) / sum((target - meanTarget)^2)
  const meanTarget = (targetVec[0] + targetVec[1] + targetVec[2] + targetVec[3]) / 4;
  const ssTot = targetVec.reduce((acc, t) => acc + Math.pow(t - meanTarget, 2), 0);
  const ssRes = diffSumSq(achievedVec, targetVec);
  const rSquared = ssTot > 1e-6 ? Math.max(0, 1 - ssRes / ssTot) : 1.0;

  const weightsMap: Record<string, number> = {};
  symbols.forEach((sym, i) => {
    weightsMap[sym] = Math.round(w[i] * 10000) / 10000;
  });

  return {
    weights: weightsMap,
    achievedBetas,
    targetBetas,
    errors,
    meanAbsoluteError,
    rSquared,
  };
}

function diffSumSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return sum;
}

/**
 * Historical compounding simulation of the factor-matched portfolio
 */
export function simulateFactorMatchedPortfolio(
  dates: string[],
  returns: Record<string, number[]>,
  weights: Record<string, number>,
  benchmarkSymbol: string = 'SPY'
): FactorPortfolioSimulation {
  let stratVal = 10000;
  let benchVal = 10000;

  const growthSeries = [{ date: dates[0] || '2007-01-01', value: stratVal }];
  const benchmarkSeries = [{ date: dates[0] || '2007-01-01', value: benchVal }];
  const stratRets: number[] = [];
  const benchRets: number[] = [];

  for (let t = 0; t < dates.length; t++) {
    let periodRet = 0;
    Object.entries(weights).forEach(([sym, w]) => {
      periodRet += w * (returns[sym]?.[t] || returns['SPY']?.[t] || 0);
    });

    const bRet = returns[benchmarkSymbol]?.[t] || 0;

    stratVal *= 1 + periodRet;
    benchVal *= 1 + bRet;

    growthSeries.push({ date: dates[t], value: stratVal });
    benchmarkSeries.push({ date: dates[t], value: benchVal });

    stratRets.push(periodRet);
    benchRets.push(bRet);
  }

  const durationYears = dates.length / 12;
  const cagr = calculateCAGR(10000, stratVal, durationYears);
  const benchCagr = calculateCAGR(10000, benchVal, durationYears);
  const volatility = calculateAnnualizedVolatility(stratRets, 12);
  const benchVol = calculateAnnualizedVolatility(benchRets, 12);
  const sharpe = calculateSharpeRatio(cagr, volatility, 0.02);
  const benchSharpe = calculateSharpeRatio(benchCagr, benchVol, 0.02);
  const maxDrawdown = calculateMaxDrawdown(growthSeries.map((g) => g.value));
  const benchMaxDrawdown = calculateMaxDrawdown(benchmarkSeries.map((g) => g.value));

  return {
    growthSeries,
    benchmarkSeries,
    cagr,
    benchCagr,
    volatility,
    benchVol,
    sharpe,
    benchSharpe,
    maxDrawdown,
    benchMaxDrawdown,
  };
}
