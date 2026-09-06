/**
 * Quantitative Retirement Goals & Withdrawal Strategy Lab
 * Multi-stage lifecycle modeling, Guyton-Klinger guardrails, dynamic withdrawal rules,
 * social security, and Monte Carlo decumulation survival simulation.
 */

export type WithdrawalStrategy =
  | 'fixed_real'
  | 'fixed_nominal'
  | 'percentage'
  | 'guyton_klinger'
  | 'floor_and_ceiling';

export interface RetirementGoalConfig {
  currentAge: number;
  retirementAge: number;
  lifeExpectancyAge: number;
  currentPortfolio: number;
  annualSavings: number; // Pre-retirement annual contribution
  desiredAnnualSpending: number; // In retirement
  strategy: WithdrawalStrategy;
  socialSecurityAge?: number;
  socialSecurityAnnual?: number;
  pensionAnnual?: number;
  inflationRate?: number; // e.g. 0.025
  floorSpending?: number;
  ceilingSpending?: number;
}

export interface YearFinancialState {
  age: number;
  portfolioStart: number;
  portfolioEnd: number;
  spending: number;
  outsideIncome: number;
  netWithdrawal: number;
  return: number;
}

export interface RetirementSimulationResult {
  success: boolean;
  depletionAge?: number;
  endingWealth: number;
  states: YearFinancialState[];
}

export interface PercentileAgePoint {
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloRetirementResult {
  totalPaths: number;
  successRate: number; // 0.0 to 1.0
  medianEndingWealth: number;
  tenthPercentileEndingWealth: number;
  ninetiethPercentileEndingWealth: number;
  worstDepletionAge?: number;
  averageAnnualSpending: number;
  averageNetAnnualWithdrawal: number;
  percentileTrajectories: PercentileAgePoint[];
  deterministicSchedule: YearFinancialState[];
}

export interface SWRRatePoint {
  rate: number; // 0.03
  rateLabel: string; // "3.0%"
  annualSpending: number;
  successRate: number; // 0.0 to 1.0
  medianLegacy: number;
  status: 'safe' | 'moderate' | 'risky';
}

/**
 * Deterministic PRNG for reproducible Monte Carlo simulation
 */
class SeededRNG {
  private state: number;

  constructor(seed: number = 12345) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  nextNormal(mean: number = 0, std: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-7) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }
}

/**
 * Simulates a single lifecycle path under specified withdrawal rules
 */
export function simulateRetirementPath(
  annualReturns: number[],
  config: RetirementGoalConfig
): RetirementSimulationResult {
  const currentAge = config.currentAge;
  const retAge = config.retirementAge;
  const endAge = config.lifeExpectancyAge;
  const inflation = config.inflationRate ?? 0.025;
  const initialSpending = config.desiredAnnualSpending;
  const ssAge = config.socialSecurityAge ?? 67;
  const ssAmount = config.socialSecurityAnnual ?? 0;
  const pension = config.pensionAnnual ?? 0;

  const totalYears = Math.max(1, endAge - currentAge);
  let balance = config.currentPortfolio;
  let currentSpending = initialSpending;
  const initialWithdrawalRate = balance > 0 ? initialSpending / balance : 0.04;

  const states: YearFinancialState[] = [];
  let isDepleted = false;
  let depletionAge: number | undefined;

  for (let yr = 0; yr < totalYears; yr++) {
    const age = currentAge + yr;
    const r = annualReturns[yr % annualReturns.length] ?? 0.07;
    const startBal = balance;

    if (balance <= 0) {
      if (!isDepleted) {
        isDepleted = true;
        depletionAge = age;
      }
      states.push({
        age,
        portfolioStart: 0,
        portfolioEnd: 0,
        spending: 0,
        outsideIncome: age >= ssAge ? ssAmount + pension : pension,
        netWithdrawal: 0,
        return: r,
      });
      continue;
    }

    if (age < retAge) {
      // Accumulation phase
      balance = (balance + config.annualSavings) * (1 + r);
      states.push({
        age,
        portfolioStart: startBal,
        portfolioEnd: balance,
        spending: 0,
        outsideIncome: 0,
        netWithdrawal: -config.annualSavings,
        return: r,
      });
    } else {
      // Decumulation / Retirement phase
      const outsideInc = (age >= ssAge ? ssAmount : 0) + pension;

      if (config.strategy === 'fixed_real') {
        currentSpending *= (1 + inflation);
      } else if (config.strategy === 'fixed_nominal') {
        currentSpending = initialSpending;
      } else if (config.strategy === 'percentage') {
        currentSpending = startBal * initialWithdrawalRate;
      } else if (config.strategy === 'floor_and_ceiling') {
        const floor = config.floorSpending ?? (initialSpending * 0.85);
        const ceiling = config.ceilingSpending ?? (initialSpending * 1.30);
        const rawSpending = startBal * initialWithdrawalRate;
        currentSpending = Math.max(floor, Math.min(ceiling, rawSpending));
      } else if (config.strategy === 'guyton_klinger') {
        // Guyton-Klinger Guardrails:
        // 1. Inflation rule: only increase for inflation if previous return >= 0
        const prevReturn = yr > 0 ? annualReturns[(yr - 1) % annualReturns.length] : 0.05;
        if (prevReturn >= 0) {
          currentSpending *= (1 + inflation);
        }

        // 2. Capital preservation: if current withdrawal rate > 1.2 * initial, cut spending 10%
        const currentRate = startBal > 0 ? currentSpending / startBal : 1.0;
        if (currentRate > 1.2 * initialWithdrawalRate) {
          currentSpending *= 0.9;
        } else if (currentRate < 0.8 * initialWithdrawalRate) {
          // 3. Prosperity rule: if current rate < 0.8 * initial, boost spending 10%
          currentSpending *= 1.1;
        }
      }

      const netWithdrawal = Math.max(0, currentSpending - outsideInc);
      balance = Math.max(0, (balance - netWithdrawal) * (1 + r));

      if (balance <= 0 && !isDepleted) {
        isDepleted = true;
        depletionAge = age;
      }

      states.push({
        age,
        portfolioStart: startBal,
        portfolioEnd: balance,
        spending: currentSpending,
        outsideIncome: outsideInc,
        netWithdrawal,
        return: r,
      });
    }
  }

  return {
    success: !isDepleted,
    depletionAge,
    endingWealth: balance,
    states,
  };
}

/**
 * Runs a multi-path Monte Carlo retirement simulation
 */
export function simulateRetirementMonteCarlo(
  config: RetirementGoalConfig,
  market: { meanReturn: number; volatility: number; seed?: number },
  numSimulations: number = 1000
): MonteCarloRetirementResult {
  const rng = new SeededRNG(market.seed ?? 98765);
  const totalYears = Math.max(1, config.lifeExpectancyAge - config.currentAge);

  const pathsEndingWealth: number[] = [];
  const trajectoriesByAge: number[][] = Array.from({ length: totalYears }, () => []);
  let successfulPaths = 0;
  let worstDepletionAge: number | undefined;

  let totalSpendingSum = 0;
  let totalSpendingCount = 0;
  let totalNetWithdrawalSum = 0;

  for (let s = 0; s < numSimulations; s++) {
    // Generate annual returns for this path
    const annualReturns: number[] = [];
    for (let y = 0; y < totalYears; y++) {
      annualReturns.push(rng.nextNormal(market.meanReturn, market.volatility));
    }

    const res = simulateRetirementPath(annualReturns, config);
    pathsEndingWealth.push(res.endingWealth);

    if (res.success) {
      successfulPaths++;
    } else if (res.depletionAge !== undefined) {
      if (worstDepletionAge === undefined || res.depletionAge < worstDepletionAge) {
        worstDepletionAge = res.depletionAge;
      }
    }

    res.states.forEach((st, idx) => {
      if (idx < totalYears) {
        trajectoriesByAge[idx].push(st.portfolioEnd);
        if (st.age >= config.retirementAge) {
          totalSpendingSum += st.spending;
          totalNetWithdrawalSum += st.netWithdrawal;
          totalSpendingCount++;
        }
      }
    });
  }

  // Calculate percentiles per age
  const percentileTrajectories: PercentileAgePoint[] = trajectoriesByAge.map((bals, idx) => {
    bals.sort((a, b) => a - b);
    const n = bals.length;
    return {
      age: config.currentAge + idx,
      p10: bals[Math.floor(n * 0.1)] ?? 0,
      p25: bals[Math.floor(n * 0.25)] ?? 0,
      p50: bals[Math.floor(n * 0.5)] ?? 0,
      p75: bals[Math.floor(n * 0.75)] ?? 0,
      p90: bals[Math.floor(n * 0.9)] ?? 0,
    };
  });

  pathsEndingWealth.sort((a, b) => a - b);
  const n = pathsEndingWealth.length;
  const p10Ending = pathsEndingWealth[Math.floor(n * 0.1)] ?? 0;
  const p50Ending = pathsEndingWealth[Math.floor(n * 0.5)] ?? 0;
  const p90Ending = pathsEndingWealth[Math.floor(n * 0.9)] ?? 0;

  // Compute deterministic schedule using expected mean return
  const deterministicReturns = Array.from({ length: totalYears }, () => market.meanReturn);
  const detRes = simulateRetirementPath(deterministicReturns, config);

  return {
    totalPaths: numSimulations,
    successRate: successfulPaths / numSimulations,
    medianEndingWealth: p50Ending,
    tenthPercentileEndingWealth: p10Ending,
    ninetiethPercentileEndingWealth: p90Ending,
    worstDepletionAge,
    averageAnnualSpending: totalSpendingCount > 0 ? totalSpendingSum / totalSpendingCount : config.desiredAnnualSpending,
    averageNetAnnualWithdrawal: totalSpendingCount > 0 ? totalNetWithdrawalSum / totalSpendingCount : config.desiredAnnualSpending,
    percentileTrajectories,
    deterministicSchedule: detRes.states,
  };
}

/**
 * Evaluates a schedule of initial withdrawal rates (e.g. 2.5% to 7.0%)
 */
export function calculateSWRSchedule(
  config: RetirementGoalConfig,
  market: { meanReturn: number; volatility: number; seed?: number },
  rates: number[] = [0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06, 0.065]
): SWRRatePoint[] {
  // Estimate accumulated portfolio at retirement age
  const yearsToRetirement = Math.max(0, config.retirementAge - config.currentAge);
  let estPortfolioAtRet = config.currentPortfolio;
  for (let y = 0; y < yearsToRetirement; y++) {
    estPortfolioAtRet = (estPortfolioAtRet + config.annualSavings) * (1 + market.meanReturn);
  }

  return rates.map((rate) => {
    const annualSpending = Math.max(1000, estPortfolioAtRet * rate);
    const testConfig: RetirementGoalConfig = {
      ...config,
      desiredAnnualSpending: annualSpending,
    };

    const sim = simulateRetirementMonteCarlo(testConfig, market, 300);
    const succ = sim.successRate;

    let status: 'safe' | 'moderate' | 'risky' = 'risky';
    if (succ >= 0.90) {
      status = 'safe';
    } else if (succ >= 0.75) {
      status = 'moderate';
    }

    return {
      rate,
      rateLabel: `${(rate * 100).toFixed(1)}%`,
      annualSpending: Math.round(annualSpending),
      successRate: succ,
      medianLegacy: Math.round(sim.medianEndingWealth),
      status,
    };
  });
}
