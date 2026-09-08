/**
 * Hierarchical Risk Parity (HRP) Engine
 * Based on Marcos López de Prado (2016): "Building Diversified Portfolios that Outperform Out-of-Sample"
 * and "Advances in Financial Machine Learning" (Chapter 16).
 *
 * Solves the Markowitz "error maximization" problem by replacing quadratic programming
 * matrix inversion with a 3-step machine learning graph-theoretic tree clustering procedure:
 * 1. Tree Clustering (Hierarchical Agglomerative Clustering on correlation distance)
 * 2. Quasi-Diagonalization (Recursive sorting of the covariance matrix)
 * 3. Recursive Bisection (Top-down inverse-variance allocation)
 */

import { calculatePortfolioVolatility, calculatePortfolioReturn, calculateDiversificationRatio } from './optimization';

export interface HRPClusterNode {
  id: number;
  symbol?: string;
  isLeaf: boolean;
  left?: HRPClusterNode;
  right?: HRPClusterNode;
  distance: number;
  elements: number[]; // asset indices in this cluster
  height?: number; // for dendrogram SVG layout
  x?: number;      // for dendrogram SVG layout
  y?: number;      // for dendrogram SVG layout
}

export interface HRPResult {
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  diversificationRatio: number;
  cvar95?: number;
  sortinoRatio?: number;
  // Dendrogram and Heatmap structures
  orderedSymbols: string[];
  orderedIndices: number[];
  tree: HRPClusterNode;
  distMatrix: number[][];
  quasiCorrMatrix: {
    symbols: string[];
    matrix: number[][];
  };
  originalCorrMatrix: {
    symbols: string[];
    matrix: number[][];
  };
  comparisonWeights: {
    hrp: Record<string, number>;
    equalWeight: Record<string, number>;
    inverseVol: Record<string, number>;
  };
}

/**
 * Computes Pearson correlation matrix from covariance matrix:
 * rho_{i,j} = cov_{i,j} / (sigma_i * sigma_j)
 */
export function computeCorrelationMatrix(covMatrix: number[][]): number[][] {
  const n = covMatrix.length;
  const corr: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  const sigmas = covMatrix.map((row, i) => Math.sqrt(Math.max(1e-12, row[i])));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        corr[i][j] = 1.0;
      } else {
        const val = covMatrix[i][j] / (sigmas[i] * sigmas[j]);
        corr[i][j] = Math.max(-1.0, Math.min(1.0, val));
      }
    }
  }
  return corr;
}

/**
 * Computes correlation distance matrix:
 * d_{i,j} = sqrt(0.5 * (1 - rho_{i,j}))
 * where d_{i,j} in [0, 1].
 */
export function computeCorrelationDistanceMatrix(corrMatrix: number[][]): number[][] {
  const n = corrMatrix.length;
  const dist: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        dist[i][j] = 0.0;
      } else {
        const r = Math.max(-1.0, Math.min(1.0, corrMatrix[i][j]));
        dist[i][j] = Math.sqrt(Math.max(0, 0.5 * (1.0 - r)));
      }
    }
  }
  return dist;
}

/**
 * Computes Euclidean distance between distance columns:
 * D~_{i,j} = sqrt( sum_{k} (d_{k,i} - d_{k,j})^2 )
 */
export function computeEuclideanDistanceOfDistances(distMatrix: number[][]): number[][] {
  const n = distMatrix.length;
  const dDist: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sumSq = 0;
      for (let k = 0; k < n; k++) {
        const diff = distMatrix[k][i] - distMatrix[k][j];
        sumSq += diff * diff;
      }
      const d = Math.sqrt(sumSq);
      dDist[i][j] = d;
      dDist[j][i] = d;
    }
  }
  return dDist;
}

/**
 * Stage 1: Tree Clustering using Hierarchical Agglomerative Clustering (Average-Linkage)
 */
export function buildHierarchicalTree(
  euclideanDist: number[][],
  symbols: string[]
): HRPClusterNode {
  const n = symbols.length;
  if (n === 0) {
    throw new Error('Symbols array cannot be empty');
  }

  if (n === 1) {
    return {
      id: 0,
      symbol: symbols[0],
      isLeaf: true,
      distance: 0,
      elements: [0],
    };
  }

  // Active clusters
  let clusters: HRPClusterNode[] = symbols.map((sym, idx) => ({
    id: idx,
    symbol: sym,
    isLeaf: true,
    distance: 0,
    elements: [idx],
  }));

  let nextClusterId = n;

  // Merge until 1 cluster remains
  while (clusters.length > 1) {
    let bestDist = Infinity;
    let bestA = 0;
    let bestB = 1;

    // Find pair of clusters with minimum average linkage distance
    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        const elemA = clusters[a].elements;
        const elemB = clusters[b].elements;
        let sumDist = 0;
        let count = 0;

        for (const i of elemA) {
          for (const j of elemB) {
            sumDist += euclideanDist[i][j];
            count++;
          }
        }
        const avgDist = count > 0 ? sumDist / count : 0;

        if (avgDist < bestDist) {
          bestDist = avgDist;
          bestA = a;
          bestB = b;
        }
      }
    }

    const clusterA = clusters[bestA];
    const clusterB = clusters[bestB];

    const merged: HRPClusterNode = {
      id: nextClusterId++,
      isLeaf: false,
      left: clusterA,
      right: clusterB,
      distance: bestDist,
      elements: [...clusterA.elements, ...clusterB.elements],
    };

    // Remove bestA and bestB (order matters: remove higher index first)
    const remaining = clusters.filter((_, idx) => idx !== bestA && idx !== bestB);
    remaining.push(merged);
    clusters = remaining;
  }

  return clusters[0];
}

/**
 * Stage 2: Quasi-Diagonalization
 * Recursively orders cluster leaves so that closely correlated items are adjacent.
 */
export function quasiDiagonalize(node: HRPClusterNode): number[] {
  if (node.isLeaf) {
    return node.elements;
  }
  const leftOrder = node.left ? quasiDiagonalize(node.left) : [];
  const rightOrder = node.right ? quasiDiagonalize(node.right) : [];
  return [...leftOrder, ...rightOrder];
}

/**
 * Assigns (x, y) coordinates for dendrogram layout
 */
export function layoutDendrogram(node: HRPClusterNode, totalLeaves: number, maxDist: number): void {
  let leafCounter = 0;

  function traverse(n: HRPClusterNode, depth: number): void {
    if (n.isLeaf) {
      n.x = (leafCounter + 0.5) * (100 / totalLeaves);
      leafCounter++;
      n.y = 90; // bottom of chart
      n.height = 0;
      return;
    }

    if (n.left) traverse(n.left, depth + 1);
    if (n.right) traverse(n.right, depth + 1);

    if (n.left && n.right) {
      n.x = ((n.left.x ?? 0) + (n.right.x ?? 0)) / 2;
      const normalizedHeight = maxDist > 0 ? (n.distance / maxDist) : 0.5;
      n.y = Math.max(10, 85 - normalizedHeight * 70);
      n.height = n.distance;
    }
  }

  traverse(node, 0);
}

/**
 * Computes cluster variance: V = w^T * Sigma * w
 * using inverse-variance weights for the cluster elements.
 */
function getClusterVariance(cluster: number[], covMatrix: number[][]): { variance: number; weights: number[] } {
  const k = cluster.length;
  if (k === 1) {
    const idx = cluster[0];
    return { variance: Math.max(1e-12, covMatrix[idx][idx]), weights: [1.0] };
  }

  // Inverse variance of each asset in cluster: 1 / sigma_i^2
  const invVars = cluster.map((idx) => 1.0 / Math.max(1e-12, covMatrix[idx][idx]));
  const sumInv = invVars.reduce((a, b) => a + b, 0);
  const clusterWeights = invVars.map((v) => v / sumInv);

  let variance = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      variance += clusterWeights[i] * clusterWeights[j] * covMatrix[cluster[i]][cluster[j]];
    }
  }

  return { variance: Math.max(1e-12, variance), weights: clusterWeights };
}

/**
 * Stage 3: Recursive Bisection
 * Allocates weights top-down based on inverse cluster variance.
 */
export function recursiveBisection(orderedIndices: number[], covMatrix: number[][]): number[] {
  const n = covMatrix.length;
  const weights: number[] = Array(n).fill(1.0);

  let clusters: number[][] = [orderedIndices];

  while (clusters.length > 0) {
    const nextClusters: number[][] = [];

    for (const cluster of clusters) {
      if (cluster.length <= 1) continue;

      // Bisect cluster into two roughly equal halves
      const mid = Math.floor(cluster.length / 2);
      const c1 = cluster.slice(0, mid);
      const c2 = cluster.slice(mid);

      const v1 = getClusterVariance(c1, covMatrix).variance;
      const v2 = getClusterVariance(c2, covMatrix).variance;

      // Alpha allocation factor: inverse variance weighting between subclusters
      const alpha = 1.0 - (v1 / (v1 + v2)); // = v2 / (v1 + v2)

      // Scale subcluster 1
      for (const idx of c1) {
        weights[idx] *= alpha;
      }
      // Scale subcluster 2
      for (const idx of c2) {
        weights[idx] *= (1.0 - alpha);
      }

      if (c1.length > 1) nextClusters.push(c1);
      if (c2.length > 1) nextClusters.push(c2);
    }

    clusters = nextClusters;
  }

  // Ensure exact sum to 1.0
  const sumW = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (sumW > 0 ? w / sumW : 1 / n));
}

/**
 * Main Solver: Solves Hierarchical Risk Parity
 */
export function solveHierarchicalRiskParity(
  symbols: string[],
  covMatrix: number[][],
  expectedReturns?: number[],
  riskFreeRate: number = 0.035
): HRPResult {
  const n = symbols.length;
  if (n === 0) throw new Error('Symbols list cannot be empty');

  // Step 1: Correlation & Distance matrices
  const corrMatrix = computeCorrelationMatrix(covMatrix);
  const distMatrix = computeCorrelationDistanceMatrix(corrMatrix);
  const euclideanDist = computeEuclideanDistanceOfDistances(distMatrix);

  // Step 2: Build Hierarchical Tree (Agglomerative Clustering)
  const tree = buildHierarchicalTree(euclideanDist, symbols);

  // Layout tree for SVG visualizer
  let maxTreeDist = 0;
  function findMaxDist(node: HRPClusterNode) {
    if (node.distance > maxTreeDist) maxTreeDist = node.distance;
    if (node.left) findMaxDist(node.left);
    if (node.right) findMaxDist(node.right);
  }
  findMaxDist(tree);
  layoutDendrogram(tree, n, maxTreeDist);

  // Step 3: Quasi-Diagonalization
  const orderedIndices = quasiDiagonalize(tree);
  const orderedSymbols = orderedIndices.map((i) => symbols[i]);

  // Step 4: Recursive Bisection
  const hrpWeightList = recursiveBisection(orderedIndices, covMatrix);
  const hrpWeights: Record<string, number> = {};
  symbols.forEach((sym, i) => {
    hrpWeights[sym] = hrpWeightList[i];
  });

  // Performance & Risk Metrics
  const defaultReturns = symbols.map((_, i) => (covMatrix[i][i] > 0 ? 0.08 : 0.04));
  const returnsVector = expectedReturns && expectedReturns.length === n ? expectedReturns : defaultReturns;

  const portReturn = calculatePortfolioReturn(hrpWeightList, returnsVector);
  const portVol = calculatePortfolioVolatility(hrpWeightList, covMatrix, 12);
  const sharpe = portVol > 0 ? (portReturn - riskFreeRate) / portVol : 0;
  const divRatio = calculateDiversificationRatio(hrpWeightList, covMatrix, 12);

  // Benchmark allocations
  // 1. Equal Weight
  const equalWeight: Record<string, number> = {};
  symbols.forEach((sym) => { equalWeight[sym] = 1 / n; });

  // 2. Inverse Volatility
  const vols = symbols.map((_, i) => Math.sqrt(Math.max(1e-12, covMatrix[i][i] * 12)));
  const invVols = vols.map((v) => 1 / v);
  const sumInvVol = invVols.reduce((a, b) => a + b, 0);
  const inverseVol: Record<string, number> = {};
  symbols.forEach((sym, i) => {
    inverseVol[sym] = invVols[i] / sumInvVol;
  });

  // Quasi-diagonalized correlation matrix
  const quasiMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      quasiMatrix[i][j] = corrMatrix[orderedIndices[i]][orderedIndices[j]];
    }
  }

  return {
    weights: hrpWeights,
    expectedReturn: portReturn,
    volatility: portVol,
    sharpeRatio: sharpe,
    diversificationRatio: divRatio,
    orderedSymbols,
    orderedIndices,
    tree,
    distMatrix,
    quasiCorrMatrix: {
      symbols: orderedSymbols,
      matrix: quasiMatrix,
    },
    originalCorrMatrix: {
      symbols,
      matrix: corrMatrix,
    },
    comparisonWeights: {
      hrp: hrpWeights,
      equalWeight,
      inverseVol,
    },
  };
}
