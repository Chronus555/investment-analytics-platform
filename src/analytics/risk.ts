/**
 * Quantitative Risk & Performance Analytics
 * Sharpe, Sortino, Calmar, Treynor, VaR, CVaR, Alpha, Beta, Tracking Error, and Capture Ratios.
 */

import { calculateMean, calculateStandardDeviation, calculateCovariance, calculateVariance } from './statistics';
import { calculateCAGRFromReturns } from './returns';

/**
 * Downside Deviation (Semi-deviation below target return tau)
 * @param returns Periodic return series (decimals)
 * @param targetReturn Minimum acceptable return per period (tau, default 0)
 * @param frequency Observations per year (12 for monthly)
 */
export function calculateDownsideDeviation(
  returns: number[],
  targetReturn: number = 0,
  frequency: number = 12
): number {
  if (returns.length < 2) return 0;
  let sumSq = 0;
  for (const r of returns) {
    const diff = Math.min(0, r - targetReturn);
    sumSq += Math.pow(diff, 2);
  }
  const periodicSemiDev = Math.sqrt(sumSq / (returns.length - 1));
  return periodicSemiDev * Math.sqrt(frequency);
}

/**
 * Sharpe Ratio: (CAGR - RiskFreeRate) / AnnualizedVolatility
 */
export function calculateSharpeRatio(
  annualizedReturn: number,
  annualizedVolatility: number,
  riskFreeRate: number = 0.04
): number {
  if (annualizedVolatility <= 0) return 0;
  return (annualizedReturn - riskFreeRate) / annualizedVolatility;
}

/**
 * Sortino Ratio: (CAGR - RiskFreeRate) / DownsideDeviation
 */
export function calculateSortinoRatio(
  annualizedReturn: number,
  downsideDeviation: number,
  riskFreeRate: number = 0.04
): number {
  if (downsideDeviation <= 0) return 0;
  return (annualizedReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Calmar Ratio: CAGR / abs(MaximumDrawdown)
 */
export function calculateCalmarRatio(annualizedReturn: number, maxDrawdown: number): number {
  const absDD = Math.abs(maxDrawdown);
  if (absDD <= 0) return 0;
  return annualizedReturn / absDD;
}

/**
 * Historical Value-at-Risk (VaR)
 * Returns the maximum expected loss at given confidence level (e.g. 0.95 -> 5th percentile)
 * Returned as a positive decimal (e.g., 0.08 means 8% loss)
 */
export function calculateHistoricalVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.max(0, Math.floor((1 - confidence) * sorted.length));
  const worstReturn = sorted[index];
  return worstReturn < 0 ? Math.abs(worstReturn) : 0;
}

/**
 * Conditional Value-at-Risk (CVaR) / Expected Shortfall
 * The average loss among all observations that exceed the VaR threshold.
 */
export function calculateHistoricalCVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoffIndex = Math.max(1, Math.floor((1 - confidence) * sorted.length));
  const tail = sorted.slice(0, cutoffIndex);
  const avgTailLoss = calculateMean(tail);
  return avgTailLoss < 0 ? Math.abs(avgTailLoss) : 0;
}

/**
 * OLS Beta against a benchmark series: Beta = Cov(Rp, Rb) / Var(Rb)
 */
export function calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
  const varB = calculateVariance(benchmarkReturns, true);
  if (varB === 0) return 1.0;
  return calculateCovariance(portfolioReturns, benchmarkReturns, true) / varB;
}

/**
 * Annualized Jensen's Alpha: Alpha = CAGR_p - (Rf + Beta * (CAGR_b - Rf))
 */
export function calculateAlpha(
  portCAGR: number,
  benchCAGR: number,
  beta: number,
  riskFreeRate: number = 0.04
): number {
  return portCAGR - (riskFreeRate + beta * (benchCAGR - riskFreeRate));
}

/**
 * Treynor Ratio: (CAGR - RiskFreeRate) / Beta
 */
export function calculateTreynorRatio(
  annualizedReturn: number,
  beta: number,
  riskFreeRate: number = 0.04
): number {
  if (beta === 0) return 0;
  return (annualizedReturn - riskFreeRate) / beta;
}

/**
 * Tracking Error: Annualized standard deviation of excess returns (R_p - R_b)
 */
export function calculateTrackingError(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  frequency: number = 12
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 0;
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push(portfolioReturns[i] - benchmarkReturns[i]);
  }
  return calculateStandardDeviation(diffs, true) * Math.sqrt(frequency);
}

/**
 * Information Ratio: (CAGR_p - CAGR_b) / TrackingError
 */
export function calculateInformationRatio(
  portCAGR: number,
  benchCAGR: number,
  trackingError: number
): number {
  if (trackingError <= 0) return 0;
  return (portCAGR - benchCAGR) / trackingError;
}

/**
 * Up-Market and Down-Market Capture Ratios
 */
export function calculateCaptureRatios(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  frequency: number = 12
): { upCapture: number; downCapture: number } {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const upPort: number[] = [];
  const upBench: number[] = [];
  const downPort: number[] = [];
  const downBench: number[] = [];

  for (let i = 0; i < n; i++) {
    if (benchmarkReturns[i] > 0) {
      upPort.push(portfolioReturns[i]);
      upBench.push(benchmarkReturns[i]);
    } else if (benchmarkReturns[i] < 0) {
      downPort.push(portfolioReturns[i]);
      downBench.push(benchmarkReturns[i]);
    }
  }

  const cagrUpPort = calculateCAGRFromReturns(upPort, frequency);
  const cagrUpBench = calculateCAGRFromReturns(upBench, frequency);
  const cagrDownPort = calculateCAGRFromReturns(downPort, frequency);
  const cagrDownBench = calculateCAGRFromReturns(downBench, frequency);

  const upCapture = cagrUpBench !== 0 ? (cagrUpPort / cagrUpBench) * 100 : 100;
  const downCapture = cagrDownBench !== 0 ? (cagrDownPort / cagrDownBench) * 100 : 100;

  return { upCapture, downCapture };
}
