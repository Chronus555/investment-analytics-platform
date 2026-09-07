/**
 * Manager Performance & Active Risk Attribution
 * Quantitative metrics inspired by Portfolio Visualizer Manager Performance Analysis (PV 1.4).
 * Alpha, Beta, Tracking Error, Information Ratio, Treynor, Modigliani M^2, Up/Down Capture,
 * Batting Average, and Rolling Active Metrics.
 */

import {
  calculateMean,
  calculateVariance,
  calculateCovariance,
  calculateStandardDeviation,
} from './statistics';
import { calculateCAGRFromReturns } from './returns';

export interface ActivePoint {
  date: string;
  managerReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
  managerWealth: number;
  benchmarkWealth: number;
  cumulativeActiveWealth: number;
  activeExcessPercent: number;
}

export interface ActiveMetrics {
  annualizedAlpha: number;
  monthlyAlpha: number;
  beta: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
  modiglianiM2: number;
  managerCAGR: number;
  benchmarkCAGR: number;
  managerVol: number;
  benchmarkVol: number;
  managerSharpe: number;
  benchmarkSharpe: number;
  upCapture: number;
  downCapture: number;
  captureRatio: number;
  battingAverage: number;
  winMonths: number;
  lossMonths: number;
  totalMonths: number;
  avgWinReturn: number;
  avgLossReturn: number;
  winLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  cumulativeActiveSeries: ActivePoint[];
}

export interface RollingActivePoint {
  date: string;
  alpha: number; // Annualized alpha in % (e.g. 3.5 for 3.5%)
  beta: number;
  trackingError: number; // Annualized tracking error in %
  informationRatio: number;
  rSquared: number;
}

/**
 * Calculates comprehensive active management and risk attribution metrics.
 */
export function calculateActiveMetrics(
  managerReturns: number[],
  benchmarkReturns: number[],
  dates: string[],
  riskFreeRate: number = 0.04
): ActiveMetrics {
  const n = Math.min(managerReturns.length, benchmarkReturns.length, dates.length);
  if (n < 2) {
    return {
      annualizedAlpha: 0,
      monthlyAlpha: 0,
      beta: 1.0,
      rSquared: 1.0,
      trackingError: 0,
      informationRatio: 0,
      treynorRatio: 0,
      modiglianiM2: riskFreeRate,
      managerCAGR: 0,
      benchmarkCAGR: 0,
      managerVol: 0,
      benchmarkVol: 0,
      managerSharpe: 0,
      benchmarkSharpe: 0,
      upCapture: 100,
      downCapture: 100,
      captureRatio: 1.0,
      battingAverage: 0,
      winMonths: 0,
      lossMonths: 0,
      totalMonths: 0,
      avgWinReturn: 0,
      avgLossReturn: 0,
      winLossRatio: 1.0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      cumulativeActiveSeries: [],
    };
  }

  const pRets = managerReturns.slice(0, n);
  const bRets = benchmarkReturns.slice(0, n);
  const dts = dates.slice(0, n);

  // Periodic risk-free rate (monthly)
  const rfMonthly = Math.pow(1 + riskFreeRate, 1 / 12) - 1;

  // Excess returns over risk-free rate
  const pExcess = pRets.map((r) => r - rfMonthly);
  const bExcess = bRets.map((r) => r - rfMonthly);

  // OLS Regression of (Rp - Rf) on (Rb - Rf)
  const varB = calculateVariance(bExcess, true);
  const varP = calculateVariance(pExcess, true);
  const covPB = calculateCovariance(pExcess, bExcess, true);

  const beta = varB > 1e-12 ? covPB / varB : 1.0;
  const meanPExcess = calculateMean(pExcess);
  const meanBExcess = calculateMean(bExcess);
  const monthlyAlpha = meanPExcess - beta * meanBExcess;
  const annualizedAlpha = Math.pow(1 + monthlyAlpha, 12) - 1;

  const rSquared =
    varP > 1e-12 && varB > 1e-12
      ? Math.min(1.0, Math.max(0.0, Math.pow(covPB, 2) / (varP * varB)))
      : 1.0;

  // Active returns (Rp - Rb)
  const activeRets: number[] = [];
  let winMonths = 0;
  let lossMonths = 0;
  let winSum = 0;
  let lossSum = 0;

  let currentWins = 0;
  let maxConsecutiveWins = 0;
  let currentLosses = 0;
  let maxConsecutiveLosses = 0;

  for (let i = 0; i < n; i++) {
    const diff = pRets[i] - bRets[i];
    activeRets.push(diff);

    if (diff > 1e-6) {
      winMonths++;
      winSum += diff;
      currentWins++;
      currentLosses = 0;
      if (currentWins > maxConsecutiveWins) maxConsecutiveWins = currentWins;
    } else if (diff < -1e-6) {
      lossMonths++;
      lossSum += Math.abs(diff);
      currentLosses++;
      currentWins = 0;
      if (currentLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentLosses;
    } else {
      currentWins = 0;
      currentLosses = 0;
    }
  }

  const battingAverage = n > 0 ? (winMonths / n) * 100 : 0;
  const avgWinReturn = winMonths > 0 ? winSum / winMonths : 0;
  const avgLossReturn = lossMonths > 0 ? lossSum / lossMonths : 0;
  const winLossRatio = avgLossReturn > 1e-8 ? avgWinReturn / avgLossReturn : 1.0;

  // Tracking Error & Information Ratio
  const trackingError = calculateStandardDeviation(activeRets, true) * Math.sqrt(12);
  const meanActiveRet = calculateMean(activeRets);
  const informationRatio = trackingError > 1e-8 ? (meanActiveRet * 12) / trackingError : 0;

  // CAGRs & Volatilities
  const managerCAGR = calculateCAGRFromReturns(pRets, 12);
  const benchmarkCAGR = calculateCAGRFromReturns(bRets, 12);
  const managerVol = calculateStandardDeviation(pRets, true) * Math.sqrt(12);
  const benchmarkVol = calculateStandardDeviation(bRets, true) * Math.sqrt(12);

  const managerSharpe = managerVol > 1e-8 ? (managerCAGR - riskFreeRate) / managerVol : 0;
  const benchmarkSharpe = benchmarkVol > 1e-8 ? (benchmarkCAGR - riskFreeRate) / benchmarkVol : 0;

  const treynorRatio = Math.abs(beta) > 1e-6 ? (managerCAGR - riskFreeRate) / beta : 0;
  const modiglianiM2 = riskFreeRate + managerSharpe * benchmarkVol;

  // Up/Down Market Capture Ratios
  const upPort: number[] = [];
  const upBench: number[] = [];
  const downPort: number[] = [];
  const downBench: number[] = [];

  for (let i = 0; i < n; i++) {
    if (bRets[i] > 0) {
      upPort.push(pRets[i]);
      upBench.push(bRets[i]);
    } else if (bRets[i] < 0) {
      downPort.push(pRets[i]);
      downBench.push(bRets[i]);
    }
  }

  const cagrUpPort = calculateCAGRFromReturns(upPort, 12);
  const cagrUpBench = calculateCAGRFromReturns(upBench, 12);
  const cagrDownPort = calculateCAGRFromReturns(downPort, 12);
  const cagrDownBench = calculateCAGRFromReturns(downBench, 12);

  const upCapture = Math.abs(cagrUpBench) > 1e-6 ? (cagrUpPort / cagrUpBench) * 100 : 100;
  const downCapture = Math.abs(cagrDownBench) > 1e-6 ? (cagrDownPort / cagrDownBench) * 100 : 100;
  const captureRatio = Math.abs(downCapture) > 1e-6 ? upCapture / downCapture : 1.0;

  // Cumulative Active Wealth Series ($10k initial)
  let mWealth = 10000;
  let bWealth = 10000;
  const cumulativeActiveSeries: ActivePoint[] = [];

  for (let i = 0; i < n; i++) {
    mWealth *= 1 + pRets[i];
    bWealth *= 1 + bRets[i];
    const diffWealth = mWealth - bWealth;
    const activeExcessPercent = bWealth > 0 ? (mWealth / bWealth - 1) * 100 : 0;

    cumulativeActiveSeries.push({
      date: dts[i],
      managerReturn: pRets[i],
      benchmarkReturn: bRets[i],
      activeReturn: activeRets[i],
      managerWealth: Math.round(mWealth * 100) / 100,
      benchmarkWealth: Math.round(bWealth * 100) / 100,
      cumulativeActiveWealth: Math.round(diffWealth * 100) / 100,
      activeExcessPercent: Math.round(activeExcessPercent * 100) / 100,
    });
  }

  return {
    annualizedAlpha,
    monthlyAlpha,
    beta,
    rSquared,
    trackingError,
    informationRatio,
    treynorRatio,
    modiglianiM2,
    managerCAGR,
    benchmarkCAGR,
    managerVol,
    benchmarkVol,
    managerSharpe,
    benchmarkSharpe,
    upCapture,
    downCapture,
    captureRatio,
    battingAverage,
    winMonths,
    lossMonths,
    totalMonths: n,
    avgWinReturn,
    avgLossReturn,
    winLossRatio,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    cumulativeActiveSeries,
  };
}

/**
 * Calculates rolling active metrics (Alpha, Beta, Tracking Error, Information Ratio)
 * across a moving lookback window (e.g. 12, 24, 36 months).
 */
export function calculateRollingActiveMetrics(
  managerReturns: number[],
  benchmarkReturns: number[],
  dates: string[],
  window: number = 24,
  riskFreeRate: number = 0.04
): RollingActivePoint[] {
  const n = Math.min(managerReturns.length, benchmarkReturns.length, dates.length);
  if (n < window) return [];

  const results: RollingActivePoint[] = [];
  const rfMonthly = Math.pow(1 + riskFreeRate, 1 / 12) - 1;

  for (let i = window; i <= n; i++) {
    const subP = managerReturns.slice(i - window, i);
    const subB = benchmarkReturns.slice(i - window, i);
    const currentDate = dates[i - 1];

    const subPExcess = subP.map((r) => r - rfMonthly);
    const subBExcess = subB.map((r) => r - rfMonthly);

    const varB = calculateVariance(subBExcess, true);
    const varP = calculateVariance(subPExcess, true);
    const covPB = calculateCovariance(subPExcess, subBExcess, true);

    const beta = varB > 1e-12 ? covPB / varB : 1.0;
    const meanP = calculateMean(subPExcess);
    const meanB = calculateMean(subBExcess);
    const monthlyAlpha = meanP - beta * meanB;
    const annualizedAlpha = (Math.pow(1 + monthlyAlpha, 12) - 1) * 100; // in %

    const rSquared =
      varP > 1e-12 && varB > 1e-12
        ? Math.min(1.0, Math.max(0.0, Math.pow(covPB, 2) / (varP * varB)))
        : 1.0;

    const activeDiffs: number[] = [];
    for (let k = 0; k < window; k++) {
      activeDiffs.push(subP[k] - subB[k]);
    }
    const te = calculateStandardDeviation(activeDiffs, true) * Math.sqrt(12);
    const meanDiff = calculateMean(activeDiffs);
    const ir = te > 1e-8 ? (meanDiff * 12) / te : 0;

    results.push({
      date: currentDate,
      alpha: Math.round(annualizedAlpha * 100) / 100,
      beta: Math.round(beta * 1000) / 1000,
      trackingError: Math.round(te * 10000) / 100, // in %
      informationRatio: Math.round(ir * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
    });
  }

  return results;
}
