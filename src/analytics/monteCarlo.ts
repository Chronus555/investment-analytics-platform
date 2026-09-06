/**
 * Quantitative Monte Carlo Simulation Engine
 * Historical bootstrap, parametric Gaussian, Student's t, fan chart percentiles, and ruin probability.
 */

export type SimulationMethod = 'bootstrap' | 'parametric_normal' | 'parametric_lognormal' | 'fat_tailed';

export interface MonteCarloConfig {
  numSimulations: number; // e.g. 1000 to 5000
  horizonYears: number; // e.g. 30
  initialBalance: number; // e.g. 1,000,000
  annualContribution?: number;
  annualWithdrawal?: number;
  inflationRate?: number; // e.g. 0.025
  adjustCashFlowForInflation?: boolean;
  method?: SimulationMethod;
  seed?: number;
}

export interface MonteCarloPercentiles {
  p5: number;
  p10: number;
  p25: number;
  p50: number; // Median
  p75: number;
  p90: number;
  p95: number;
  mean: number;
}

export interface FanChartYearPoint {
  year: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface MonteCarloResult {
  survivalRate: number; // 0 to 1
  probabilityOfRuin: number; // 0 to 1
  medianEndingValue: number;
  meanEndingValue: number;
  percentiles: MonteCarloPercentiles;
  fanChart: FanChartYearPoint[];
  safeWithdrawalRate?: number; // Estimated 95% survival initial withdrawal rate
}

/**
 * Deterministic Linear Congruential Generator (LCG) for reproducible simulations
 */
class SeededRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  /**
   * Standard normal variable using Box-Muller transform
   */
  nextGaussian(): number {
    const u1 = Math.max(1e-10, this.next());
    const u2 = this.next();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Student's t distribution with degrees of freedom df
   */
  nextStudentT(df: number = 5): number {
    const z = this.nextGaussian();
    // Chi-square with df degrees of freedom: sum of df standard normals squared
    let chi2 = 0;
    for (let i = 0; i < df; i++) {
      chi2 += Math.pow(this.nextGaussian(), 2);
    }
    return z / Math.sqrt(chi2 / df);
  }
}

function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Runs a Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  historicalReturns: number[], // Historical portfolio annual returns (decimals)
  config: MonteCarloConfig,
  expectedMean?: number,
  expectedVol?: number
): MonteCarloResult {
  const numSims = config.numSimulations ?? 1000;
  const horizon = config.horizonYears ?? 30;
  const initial = config.initialBalance ?? 100000;
  const contrib = config.annualContribution ?? 0;
  const withdraw = config.annualWithdrawal ?? 0;
  const inflation = config.inflationRate ?? 0.025;
  const adjustInflation = config.adjustCashFlowForInflation ?? true;
  const method = config.method ?? 'bootstrap';
  const rng = new SeededRNG(config.seed ?? 12345);

  const mean = expectedMean ?? (historicalReturns.length > 0
    ? historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length
    : 0.08);

  const variance = historicalReturns.length > 1
    ? historicalReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (historicalReturns.length - 1)
    : 0.0225;
  const vol = expectedVol ?? Math.sqrt(variance);

  // Store paths: paths[sim][year]
  const paths: number[][] = Array.from({ length: numSims }, () => Array(horizon + 1).fill(0));
  let survivedCount = 0;

  for (let s = 0; s < numSims; s++) {
    let balance = initial;
    paths[s][0] = balance;
    let inflFactor = 1.0;

    for (let yr = 1; yr <= horizon; yr++) {
      if (balance <= 0) {
        paths[s][yr] = 0;
        continue;
      }

      // Draw return based on method
      let r = 0;
      if (method === 'bootstrap' && historicalReturns.length > 0) {
        const randIdx = Math.floor(rng.next() * historicalReturns.length);
        r = historicalReturns[randIdx];
      } else if (method === 'parametric_lognormal') {
        const z = rng.nextGaussian();
        const muLog = Math.log(1 + mean) - 0.5 * Math.pow(vol, 2);
        r = Math.exp(muLog + vol * z) - 1;
      } else if (method === 'fat_tailed') {
        const t = rng.nextStudentT(5);
        r = mean + vol * (t / Math.sqrt(5 / 3)); // Normalized t-dist
      } else {
        // Parametric normal
        const z = rng.nextGaussian();
        r = mean + vol * z;
      }

      // Grow balance
      balance = balance * (1 + r);

      // Apply cash flows
      if (adjustInflation) {
        inflFactor *= (1 + inflation);
      }
      const netCF = (contrib - withdraw) * inflFactor;
      balance += netCF;

      if (balance < 0) balance = 0;
      paths[s][yr] = balance;
    }

    if (paths[s][horizon] > 0) {
      survivedCount++;
    }
  }

  // Calculate fan chart percentiles for each year
  const fanChart: FanChartYearPoint[] = [];
  for (let yr = 0; yr <= horizon; yr++) {
    const yearValues: number[] = [];
    for (let s = 0; s < numSims; s++) {
      yearValues.push(paths[s][yr]);
    }
    yearValues.sort((a, b) => a - b);

    fanChart.push({
      year: yr,
      p5: getPercentile(yearValues, 5),
      p10: getPercentile(yearValues, 10),
      p25: getPercentile(yearValues, 25),
      p50: getPercentile(yearValues, 50),
      p75: getPercentile(yearValues, 75),
      p90: getPercentile(yearValues, 90),
      p95: getPercentile(yearValues, 95),
    });
  }

  const finalValues: number[] = [];
  let sumFinal = 0;
  for (let s = 0; s < numSims; s++) {
    const fVal = paths[s][horizon];
    finalValues.push(fVal);
    sumFinal += fVal;
  }
  finalValues.sort((a, b) => a - b);

  const survivalRate = survivedCount / numSims;
  const p50 = getPercentile(finalValues, 50);

  return {
    survivalRate,
    probabilityOfRuin: 1 - survivalRate,
    medianEndingValue: p50,
    meanEndingValue: sumFinal / numSims,
    percentiles: {
      p5: getPercentile(finalValues, 5),
      p10: getPercentile(finalValues, 10),
      p25: getPercentile(finalValues, 25),
      p50,
      p75: getPercentile(finalValues, 75),
      p90: getPercentile(finalValues, 90),
      p95: getPercentile(finalValues, 95),
      mean: sumFinal / numSims,
    },
    fanChart,
    safeWithdrawalRate: initial > 0 && withdraw > 0 ? (withdraw / initial) * (survivalRate >= 0.95 ? 1 : survivalRate / 0.95) : 0.04,
  };
}
