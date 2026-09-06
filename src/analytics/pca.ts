/**
 * Principal Component Analysis (PCA) & Variance Decomposition Engine
 * Computes exact Jacobi eigenvalue decomposition on covariance / correlation matrices.
 */

import { calculateCorrelationMatrix } from './statistics';

export interface PrincipalComponent {
  component: string;
  eigenvalue: number;
  varianceExplained: number; // 0.0 to 1.0
  cumulativeVariance: number; // 0.0 to 1.0
  loadings: Record<string, number>;
}

export interface PCAResult {
  symbols: string[];
  components: PrincipalComponent[];
  correlationMatrix: number[][];
  totalVariance: number;
  topDrivers: { component: string; dominantAsset: string; loading: number }[];
}

/**
 * Performs Cyclic Jacobi Eigenvalue Decomposition on a symmetric NxN matrix A.
 * Computes eigenvalues and orthogonal eigenvectors such that A * v_k = lambda_k * v_k.
 */
export function jacobiEigenvalueDecomposition(
  matrix: number[][],
  maxSweeps: number = 50,
  epsilon: number = 1e-10
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  // Deep clone matrix A
  const A: number[][] = matrix.map((row) => [...row]);
  // Initialize eigenvectors V as NxN identity
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1.0 : 0.0))
  );

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let maxOffDiag = 0;

    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        maxOffDiag = Math.max(maxOffDiag, Math.abs(apq));

        if (Math.abs(apq) < epsilon) continue;

        const app = A[p][p];
        const aqq = A[q][q];
        const tau = (aqq - app) / (2.0 * apq);
        const t = tau >= 0 ? 1.0 / (tau + Math.sqrt(1.0 + tau * tau)) : -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
        const c = 1.0 / Math.sqrt(1.0 + t * t);
        const s = t * c;

        // Update A[p][p], A[q][q], A[p][q]
        A[p][p] = c * c * app - 2.0 * s * c * apq + s * s * aqq;
        A[q][q] = s * s * app + 2.0 * s * c * apq + c * c * aqq;
        A[p][q] = 0;
        A[q][p] = 0;

        // Update other rows/cols in A
        for (let r = 0; r < n; r++) {
          if (r !== p && r !== q) {
            const arp = A[r][p];
            const arq = A[r][q];
            A[r][p] = c * arp - s * arq;
            A[p][r] = A[r][p];
            A[r][q] = s * arp + c * arq;
            A[q][r] = A[r][q];
          }
        }

        // Update eigenvector columns in V
        for (let r = 0; r < n; r++) {
          const vrp = V[r][p];
          const vrq = V[r][q];
          V[r][p] = c * vrp - s * vrq;
          V[r][q] = s * vrp + c * vrq;
        }
      }
    }

    if (maxOffDiag < epsilon) break;
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => Math.max(0, A[i][i]));
  return { eigenvalues, eigenvectors: V };
}

/**
 * Runs full Principal Component Analysis over multi-asset returns.
 */
export function runPCA(returns: Record<string, number[]>, symbols: string[]): PCAResult {
  const validSymbols = symbols.filter((s) => returns[s] && returns[s].length > 0);
  if (validSymbols.length < 2) {
    return {
      symbols: validSymbols,
      components: [],
      correlationMatrix: [],
      totalVariance: 0,
      topDrivers: [],
    };
  }

  const series = validSymbols.map((s) => returns[s]);
  const corrMatrix = calculateCorrelationMatrix(series);
  const n = validSymbols.length;

  const { eigenvalues, eigenvectors } = jacobiEigenvalueDecomposition(corrMatrix);

  // Pair eigenvalues with their eigenvector column
  const paired = eigenvalues.map((val, idx) => {
    const vec = eigenvectors.map((row) => row[idx]);
    return { eigenvalue: val, vector: vec };
  });

  // Sort descending by eigenvalue (PC1 has largest variance)
  paired.sort((a, b) => b.eigenvalue - a.eigenvalue);

  const totalVariance = paired.reduce((sum, p) => sum + p.eigenvalue, 0);
  let cumVar = 0;

  const components: PrincipalComponent[] = paired.map((p, idx) => {
    const varExp = totalVariance > 0 ? p.eigenvalue / totalVariance : 0;
    cumVar += varExp;

    const loadings: Record<string, number> = {};
    validSymbols.forEach((sym, sIdx) => {
      // Factor loading = eigenvector_i * sqrt(eigenvalue)
      loadings[sym] = p.vector[sIdx] * Math.sqrt(Math.max(0, p.eigenvalue));
    });

    return {
      component: 'PC' + (idx + 1),
      eigenvalue: p.eigenvalue,
      varianceExplained: varExp,
      cumulativeVariance: Math.min(1.0, cumVar),
      loadings,
    };
  });

  // Identify top driver asset for each component
  const topDrivers = components.map((comp) => {
    let bestAsset = validSymbols[0];
    let maxAbs = 0;
    Object.entries(comp.loadings).forEach(([sym, l]) => {
      if (Math.abs(l) > maxAbs) {
        maxAbs = Math.abs(l);
        bestAsset = sym;
      }
    });
    return {
      component: comp.component,
      dominantAsset: bestAsset,
      loading: comp.loadings[bestAsset] || 0,
    };
  });

  return {
    symbols: validSymbols,
    components,
    correlationMatrix: corrMatrix,
    totalVariance,
    topDrivers,
  };
}
