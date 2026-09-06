/**
 * Quantitative Black-Litterman Asset Allocation Model
 * Combines CAPM market equilibrium with subjective investor views to produce stable expected returns.
 */

export interface BlackLittermanView {
  description: string;
  assets: { symbol: string; weight: number }[]; // Pick vector P row (e.g. +1 for SPY, -1 for EFA)
  expectedExcessReturn: number; // View Q (e.g. 0.02 for +2%)
  confidence: number; // 0 to 1 (scales Omega error variance)
}

export interface BlackLittermanResult {
  impliedEquilibriumReturns: Record<string, number>; // Pi
  posteriorReturns: Record<string, number>; // E(R)
  optimalWeights: Record<string, number>;
}

/**
 * Calculates Implied Market Equilibrium Returns: Pi = delta * Sigma * w_mkt
 */
export function calculateEquilibriumReturns(
  symbols: string[],
  marketCapWeights: number[],
  covMatrix: number[][],
  riskAversion: number = 2.5,
  frequency: number = 12
): Record<string, number> {
  const n = symbols.length;
  const annCov = covMatrix.map((row) => row.map((v) => v * frequency));
  const pi: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += annCov[i][j] * marketCapWeights[j];
    }
    pi[symbols[i]] = riskAversion * sum;
  }
  return pi;
}

/**
 * Solves Black-Litterman master formula for posterior returns
 */
export function solveBlackLitterman(
  symbols: string[],
  marketCapWeights: number[],
  covMatrix: number[][],
  views: BlackLittermanView[],
  tau: number = 0.05,
  riskAversion: number = 2.5,
  frequency: number = 12
): BlackLittermanResult {
  const n = symbols.length;
  const k = views.length;
  const annCov = covMatrix.map((row) => row.map((v) => v * frequency));

  // 1. Implied returns Pi
  const piMap = calculateEquilibriumReturns(symbols, marketCapWeights, covMatrix, riskAversion, frequency);
  const piVector: number[] = symbols.map((s) => piMap[s]);

  if (k === 0) {
    // Without views, posterior = equilibrium
    const weights: Record<string, number> = {};
    symbols.forEach((s, i) => (weights[s] = marketCapWeights[i]));
    return {
      impliedEquilibriumReturns: piMap,
      posteriorReturns: piMap,
      optimalWeights: weights,
    };
  }

  // 2. Build P (K x N) and Q (K x 1)
  const P: number[][] = Array.from({ length: k }, () => Array(n).fill(0));
  const Q: number[] = views.map((v) => v.expectedExcessReturn);

  views.forEach((view, row) => {
    view.assets.forEach((a) => {
      const col = symbols.indexOf(a.symbol);
      if (col !== -1) {
        P[row][col] = a.weight;
      }
    });
  });

  // 3. Tau * Sigma
  const tauSigma = annCov.map((row) => row.map((v) => v * tau));

  // 4. View uncertainty Omega: diag(P * (tau * Sigma) * P^T) / confidence
  const omega: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (let r = 0; r < k; r++) {
    let pTauSigmaP = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        pTauSigmaP += P[r][i] * tauSigma[i][j] * P[r][j];
      }
    }
    const conf = Math.max(0.01, Math.min(1.0, views[r].confidence));
    omega[r][r] = pTauSigmaP / conf;
  }

  // Linear algebra update: E(R) = Pi + tau*Sigma * P^T * (P * tau*Sigma * P^T + Omega)^(-1) * (Q - P*Pi)
  // Let M = P * tauSigma * P^T + Omega  (K x K)
  const M: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (let r1 = 0; r1 < k; r1++) {
    for (let r2 = 0; r2 < k; r2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sum += P[r1][i] * tauSigma[i][j] * P[r2][j];
        }
      }
      M[r1][r2] = sum + omega[r1][r2];
    }
  }

  // Invert M
  const invM = invertSimpleMatrix(M);

  // Q - P * Pi (K x 1)
  const pPi: number[] = Array(k).fill(0);
  for (let r = 0; r < k; r++) {
    for (let c = 0; c < n; c++) {
      pPi[r] += P[r][c] * piVector[c];
    }
  }
  const qMinusPPi = Q.map((q, i) => q - pPi[i]);

  // temp = invM * (Q - P*Pi)  (K x 1)
  const temp: number[] = Array(k).fill(0);
  for (let r = 0; r < k; r++) {
    for (let c = 0; c < k; c++) {
      temp[r] += invM[r][c] * qMinusPPi[c];
    }
  }

  // delta_ret = tauSigma * P^T * temp  (N x 1)
  const posterior: number[] = [...piVector];
  for (let i = 0; i < n; i++) {
    let adj = 0;
    for (let r = 0; r < k; r++) {
      let tauSigmaPT = 0;
      for (let j = 0; j < n; j++) {
        tauSigmaPT += tauSigma[i][j] * P[r][j];
      }
      adj += tauSigmaPT * temp[r];
    }
    posterior[i] += adj;
  }

  const postMap: Record<string, number> = {};
  symbols.forEach((s, i) => (postMap[s] = posterior[i]));

  // Optimal weights w* = (1 / delta) * inv(Sigma) * E(R)
  const invCov = invertSimpleMatrix(annCov);
  const rawW: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rawW[i] += (1 / riskAversion) * invCov[i][j] * posterior[j];
    }
  }

  // Normalize positive weights
  const nonNegW = rawW.map((w) => Math.max(0, w));
  const wSum = nonNegW.reduce((a, b) => a + b, 0);
  const optWeights: Record<string, number> = {};
  symbols.forEach((s, i) => {
    optWeights[s] = wSum > 0 ? nonNegW[i] / wSum : 1 / n;
  });

  return {
    impliedEquilibriumReturns: piMap,
    posteriorReturns: postMap,
    optimalWeights: optWeights,
  };
}

function invertSimpleMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    }
    const temp = aug[col];
    aug[col] = aug[maxRow];
    aug[maxRow] = temp;

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) {
      // Fallback pseudo-identity
      return matrix.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
    }

    for (let c = 0; c < 2 * n; c++) aug[col][c] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = aug[r][col];
        for (let c = 0; c < 2 * n; c++) aug[r][c] -= factor * aug[col][c];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}
