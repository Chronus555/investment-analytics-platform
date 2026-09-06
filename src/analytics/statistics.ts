/**
 * Quantitative Statistics Engine
 * Sample moments, covariance, correlation matrices, autocorrelation, and cointegration.
 */

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateGeometricMean(returns: number[]): number {
  if (returns.length === 0) return 0;
  let prod = 1.0;
  for (const r of returns) {
    prod *= (1 + r);
    if (prod <= 0) return -1.0;
  }
  return Math.pow(prod, 1 / returns.length) - 1;
}

export function calculateVariance(values: number[], isSample: boolean = true): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const sumSq = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  return sumSq / (values.length - (isSample ? 1 : 0));
}

export function calculateStandardDeviation(values: number[], isSample: boolean = true): number {
  return Math.sqrt(calculateVariance(values, isSample));
}

export function calculateAnnualizedVolatility(returns: number[], frequency: number = 12): number {
  return calculateStandardDeviation(returns, true) * Math.sqrt(frequency);
}

/**
 * Sample Skewness (Fisher-Pearson standardized 3rd moment)
 */
export function calculateSkewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const mean = calculateMean(values);
  const std = calculateStandardDeviation(values, true);
  if (std === 0) return 0;

  const m3 = values.reduce((sum, x) => sum + Math.pow(x - mean, 3), 0) / n;
  const s3 = Math.pow(std, 3);
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / s3);
}

/**
 * Sample Excess Kurtosis (Normal distribution = 0)
 */
export function calculateExcessKurtosis(values: number[]): number {
  const n = values.length;
  if (n < 4) return 0;
  const mean = calculateMean(values);
  const s2 = calculateVariance(values, true);
  if (s2 === 0) return 0;

  const sum4 = values.reduce((sum, x) => sum + Math.pow(x - mean, 4), 0);
  const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const term2 = sum4 / Math.pow(s2, 2);
  const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  return term1 * term2 - term3;
}

/**
 * Sample Covariance between two series
 */
export function calculateCovariance(x: number[], y: number[], isSample: boolean = true): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const meanX = calculateMean(x.slice(0, n));
  const meanY = calculateMean(y.slice(0, n));
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - meanX) * (y[i] - meanY);
  }
  return cov / (n - (isSample ? 1 : 0));
}

export interface RollingCorrelationPoint {
  date: string;
  correlation: number;
}

/**
 * Pearson Correlation Coefficient: r = Cov(X, Y) / (sigma_X * sigma_Y)
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const subX = x.slice(0, n);
  const subY = y.slice(0, n);
  const stdX = calculateStandardDeviation(subX, true);
  const stdY = calculateStandardDeviation(subY, true);
  if (stdX === 0 || stdY === 0) return 0;
  return calculateCovariance(subX, subY, true) / (stdX * stdY);
}

/**
 * Computes rolling Pearson correlation between two return series over a rolling window.
 */
export function calculateRollingCorrelation(
  x: number[],
  y: number[],
  dates: string[],
  window: number = 12
): RollingCorrelationPoint[] {
  const n = Math.min(x.length, y.length, dates.length);
  if (n < window || window < 2) return [];

  const results: RollingCorrelationPoint[] = [];

  for (let t = window - 1; t < n; t++) {
    const subX = x.slice(t - window + 1, t + 1);
    const subY = y.slice(t - window + 1, t + 1);
    const r = calculateCorrelation(subX, subY);
    results.push({
      date: dates[t],
      correlation: Number.isFinite(r) ? r : 0,
    });
  }

  return results;
}

/**
 * Computes NxN Covariance Matrix for multiple return series
 */
export function calculateCovarianceMatrix(series: number[][]): number[][] {
  const k = series.length;
  const matrix: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      const cov = calculateCovariance(series[i], series[j], true);
      matrix[i][j] = cov;
      matrix[j][i] = cov;
    }
  }
  return matrix;
}

/**
 * Computes NxN Correlation Matrix for multiple return series
 */
export function calculateCorrelationMatrix(series: number[][]): number[][] {
  const k = series.length;
  const matrix: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    matrix[i][i] = 1.0;
    for (let j = i + 1; j < k; j++) {
      const corr = calculateCorrelation(series[i], series[j]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }
  return matrix;
}

/**
 * Autocorrelation at lag k: corr(R_t, R_{t-k})
 */
export function calculateAutocorrelation(returns: number[], maxLag: number = 12): number[] {
  const n = returns.length;
  if (n <= maxLag) return Array(maxLag).fill(0);
  const mean = calculateMean(returns);
  let denom = 0;
  for (let i = 0; i < n; i++) {
    denom += Math.pow(returns[i] - mean, 2);
  }
  if (denom === 0) return Array(maxLag).fill(0);

  const autocorr: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    let numer = 0;
    for (let t = k; t < n; t++) {
      numer += (returns[t] - mean) * (returns[t - k] - mean);
    }
    autocorr.push(numer / denom);
  }
  return autocorr;
}

/**
 * Simplified Augmented Dickey-Fuller (ADF) regression test for stationarity/cointegration
 * Regresses Delta y_t on y_{t-1}: Delta y_t = alpha + beta * y_{t-1} + e_t
 * Test statistic t = beta / SE(beta)
 */
export function calculateADFTest(series: number[]): { testStat: number; isStationary95: boolean } {
  const n = series.length;
  if (n < 10) return { testStat: 0, isStationary95: false };

  const deltaY: number[] = [];
  const lagY: number[] = [];

  for (let t = 1; t < n; t++) {
    deltaY.push(series[t] - series[t - 1]);
    lagY.push(series[t - 1]);
  }

  // OLS on deltaY = alpha + beta * lagY
  const meanLag = calculateMean(lagY);
  const meanDelta = calculateMean(deltaY);
  let num = 0;
  let den = 0;
  for (let i = 0; i < deltaY.length; i++) {
    num += (lagY[i] - meanLag) * (deltaY[i] - meanDelta);
    den += Math.pow(lagY[i] - meanLag, 2);
  }
  const beta = den !== 0 ? num / den : 0;
  const alpha = meanDelta - beta * meanLag;

  // Residual variance
  let rss = 0;
  for (let i = 0; i < deltaY.length; i++) {
    const fitted = alpha + beta * lagY[i];
    rss += Math.pow(deltaY[i] - fitted, 2);
  }
  const seBeta = Math.sqrt((rss / (deltaY.length - 2)) / (den || 1));
  const testStat = seBeta !== 0 ? beta / seBeta : 0;

  // Critical value for ADF with constant at 95% confidence is ~ -2.86
  return {
    testStat,
    isStationary95: testStat < -2.86,
  };
}
