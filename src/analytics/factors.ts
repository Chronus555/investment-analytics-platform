/**
 * Quantitative Factor Analysis & Multi-Factor OLS Regression Engine
 * CAPM, Fama-French 3 & 5 Factor, Carhart 4 Factor, t-stats, p-values, R², and Attribution.
 */

import { calculateMean } from './statistics';

export interface FactorRegressionResult {
  alpha: number; // Monthly alpha
  annualizedAlpha: number; // Annualized alpha
  alphaTStat: number;
  alphaPValue: number;
  betas: Record<string, number>; // Factor -> Beta loading
  tStats: Record<string, number>;
  pValues: Record<string, number>;
  rSquared: number;
  adjRSquared: number;
  residualVolatility: number;
  observations: number;
}

/**
 * Solves standard OLS regression: Y = X * beta + e
 * where X includes column of 1s for intercept alpha
 */
export function runMultipleRegression(
  y: number[], // Dependent variable (e.g. Asset Excess Return)
  xMatrix: number[][], // [T x K] Independent variables (e.g. Factor Excess Returns)
  factorNames: string[]
): FactorRegressionResult {
  const n = y.length;
  const k = factorNames.length;
  if (n <= k + 1) {
    throw new Error(`Insufficient observations (${n}) for ${k} factors.`);
  }

  // Construct design matrix X with intercept: [T x (K + 1)]
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    X.push([1.0, ...xMatrix[i]]);
  }

  // Compute X^T * X: [(K+1) x (K+1)]
  const p = k + 1;
  const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let r = 0; r < p; r++) {
    for (let c = 0; c < p; c++) {
      let sum = 0;
      for (let t = 0; t < n; t++) {
        sum += X[t][r] * X[t][c];
      }
      XtX[r][c] = sum;
    }
  }

  // Invert XtX using Gauss-Jordan elimination
  const invXtX = invertMatrix(XtX);

  // Compute X^T * Y: [(K+1) x 1]
  const XtY: number[] = Array(p).fill(0);
  for (let r = 0; r < p; r++) {
    let sum = 0;
    for (let t = 0; t < n; t++) {
      sum += X[t][r] * y[t];
    }
    XtY[r] = sum;
  }

  // beta = inv(X^T * X) * (X^T * Y)
  const betaHat: number[] = Array(p).fill(0);
  for (let r = 0; r < p; r++) {
    let sum = 0;
    for (let c = 0; c < p; c++) {
      sum += invXtX[r][c] * XtY[c];
    }
    betaHat[r] = sum;
  }

  // Fitted values and residuals
  const yMean = calculateMean(y);
  let tss = 0;
  let rss = 0;

  for (let t = 0; t < n; t++) {
    let fitted = 0;
    for (let r = 0; r < p; r++) {
      fitted += X[t][r] * betaHat[r];
    }
    const res = y[t] - fitted;
    rss += Math.pow(res, 2);
    tss += Math.pow(y[t] - yMean, 2);
  }

  const dfRes = n - p;
  const s2 = rss / dfRes; // Residual variance
  const resStd = Math.sqrt(s2 * 12); // Annualized residual vol

  // Standard errors, t-stats, and p-values
  const se: number[] = [];
  const tStats: number[] = [];
  const pValues: number[] = [];

  for (let r = 0; r < p; r++) {
    const stdErr = Math.sqrt(Math.max(1e-10, s2 * invXtX[r][r]));
    const t = betaHat[r] / stdErr;
    se.push(stdErr);
    tStats.push(t);
    pValues.push(approximateStudentTPValue(t, dfRes));
  }

  const r2 = tss > 0 ? 1 - rss / tss : 0;
  const adjR2 = tss > 0 ? 1 - (rss / dfRes) / (tss / (n - 1)) : 0;

  const betas: Record<string, number> = {};
  const tStatMap: Record<string, number> = {};
  const pValMap: Record<string, number> = {};

  factorNames.forEach((name, i) => {
    betas[name] = betaHat[i + 1];
    tStatMap[name] = tStats[i + 1];
    pValMap[name] = pValues[i + 1];
  });

  return {
    alpha: betaHat[0],
    annualizedAlpha: betaHat[0] * 12,
    alphaTStat: tStats[0],
    alphaPValue: pValues[0],
    betas,
    tStats: tStatMap,
    pValues: pValMap,
    rSquared: r2,
    adjRSquared: adjR2,
    residualVolatility: resStd,
    observations: n,
  };
}

/**
 * Matrix inversion using Gauss-Jordan with partial pivoting
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const aug: number[][] = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = r;
      }
    }
    const temp = aug[col];
    aug[col] = aug[maxRow];
    aug[maxRow] = temp;

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error('Singular matrix in regression');
    }

    for (let c = 0; c < 2 * n; c++) {
      aug[col][c] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = aug[r][col];
        for (let c = 0; c < 2 * n; c++) {
          aug[r][c] -= factor * aug[col][c];
        }
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

/**
 * Abramowitz and Stegun 7.1.26 complementary error function approximation
 */
function erfcApprox(x: number): number {
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return sign === 1 ? 1 - erf : 1 + erf;
}

/**
 * Accurate two-tailed p-value approximation for Student's t distribution
 */
function approximateStudentTPValue(t: number, df: number): number {
  const absT = Math.abs(t);
  if (df >= 30) {
    const z = absT;
    const pOneTail = 0.5 * erfcApprox(z / Math.SQRT2);
    return Math.min(1.0, Math.max(0.0, 2 * pOneTail));
  }
  const a = 1 - 1 / (4 * df);
  const z = absT * a;
  const pOneTail = 0.5 * erfcApprox(z / Math.SQRT2);
  return Math.min(1.0, Math.max(0.0, 2 * pOneTail));
}
