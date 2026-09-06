/**
 * Quantitative Risk Parity Engine
 * Equal Risk Contribution (ERC), Custom Risk Budgeting, and Risk Attribution.
 */

export interface AssetRiskContribution {
  symbol: string;
  weight: number;
  volatility: number;
  marginalRisk: number; // MCR
  riskContribution: number; // Absolute RC
  percentRiskContribution: number; // % RC (0 to 1)
  targetRiskContribution?: number;
}

export interface RiskParityResult {
  weights: Record<string, number>;
  portfolioVolatility: number;
  assets: AssetRiskContribution[];
}

/**
 * Computes risk breakdown for any given portfolio weights and covariance matrix
 */
export function calculateRiskContributions(
  symbols: string[],
  weights: number[],
  covMatrix: number[][],
  frequency: number = 12
): AssetRiskContribution[] {
  const n = symbols.length;
  // Annualize covariance
  const annCov: number[][] = covMatrix.map((row) => row.map((val) => val * frequency));

  let variance = 0;
  const covW: number[] = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      covW[i] += annCov[i][j] * weights[j];
    }
    variance += weights[i] * covW[i];
  }

  const portVol = Math.sqrt(Math.max(1e-8, variance));
  const results: AssetRiskContribution[] = [];

  for (let i = 0; i < n; i++) {
    const assetVol = Math.sqrt(annCov[i][i]);
    const mcr = portVol > 0 ? covW[i] / portVol : 0;
    const rc = weights[i] * mcr;
    const pctRc = portVol > 0 ? rc / portVol : 1 / n;

    results.push({
      symbol: symbols[i],
      weight: weights[i],
      volatility: assetVol,
      marginalRisk: mcr,
      riskContribution: rc,
      percentRiskContribution: pctRc,
    });
  }

  return results;
}

/**
 * Solves for Equal Risk Contribution (ERC) or Custom Risk Budget weights
 * Uses Cyclical Coordinate Descent on the convex risk budgeting objective:
 * min 0.5 * y^T * Sigma * y - sum( b_i * ln(y_i) )
 * where w_i = y_i / sum(y)
 */
export function solveRiskParity(
  symbols: string[],
  covMatrix: number[][],
  riskBudgets?: number[], // Optional target % risk budgets (must sum to 1, default equal)
  frequency: number = 12,
  maxIterations: number = 500,
  tolerance: number = 1e-7
): RiskParityResult {
  const n = symbols.length;
  if (n === 0) throw new Error('At least one asset required');
  if (n === 1) {
    const vol = Math.sqrt(covMatrix[0][0] * frequency);
    return {
      weights: { [symbols[0]]: 1.0 },
      portfolioVolatility: vol,
      assets: [
        {
          symbol: symbols[0],
          weight: 1.0,
          volatility: vol,
          marginalRisk: vol,
          riskContribution: vol,
          percentRiskContribution: 1.0,
        },
      ],
    };
  }

  // Target risk budgets b_i (default 1/n)
  const b = riskBudgets && riskBudgets.length === n
    ? riskBudgets.map((val) => val / riskBudgets.reduce((x, y) => x + y, 0))
    : Array(n).fill(1 / n);

  // Annualized covariance matrix
  const annCov: number[][] = covMatrix.map((row) => row.map((val) => val * frequency));

  // Initial y vector based on inverse volatility
  let y: number[] = symbols.map((_, i) => 1 / Math.sqrt(Math.max(1e-6, annCov[i][i])));

  // Cyclical Coordinate Descent
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxDiff = 0;

    for (let i = 0; i < n; i++) {
      // sigma_ii * y_i^2 + (sum_{j != i} sigma_ij * y_j) * y_i - b_i = 0
      const sigma_ii = annCov[i][i];
      let crossTerm = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          crossTerm += annCov[i][j] * y[j];
        }
      }

      // Solve quadratic: a * y_i^2 + crossTerm * y_i - b_i = 0
      // y_i = (-crossTerm + sqrt(crossTerm^2 + 4 * sigma_ii * b_i)) / (2 * sigma_ii)
      const discriminant = Math.pow(crossTerm, 2) + 4 * sigma_ii * b[i];
      const nextYi = (-crossTerm + Math.sqrt(discriminant)) / (2 * sigma_ii);

      const diff = Math.abs(nextYi - y[i]);
      if (diff > maxDiff) maxDiff = diff;
      y[i] = Math.max(1e-8, nextYi);
    }

    if (maxDiff < tolerance) break;
  }

  // Normalize y to get weights w = y / sum(y)
  const ySum = y.reduce((acc, val) => acc + val, 0);
  const weights = y.map((val) => val / ySum);

  const weightMap: Record<string, number> = {};
  symbols.forEach((sym, i) => {
    weightMap[sym] = Math.round(weights[i] * 10000) / 10000;
  });

  const contributions = calculateRiskContributions(symbols, weights, covMatrix, frequency);
  contributions.forEach((c, i) => {
    c.targetRiskContribution = b[i];
  });

  let portVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portVariance += weights[i] * weights[j] * annCov[i][j];
    }
  }

  return {
    weights: weightMap,
    portfolioVolatility: Math.sqrt(portVariance),
    assets: contributions,
  };
}
