/**
 * Quantitative Retirement Goals & Withdrawal Strategy Lab
 * Guyton-Klinger guardrails, dynamic withdrawal rules, social security, and asset-liability simulation.
 */

export type WithdrawalStrategy = 'fixed_real' | 'fixed_nominal' | 'percentage' | 'guyton_klinger';

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

  const totalYears = endAge - currentAge;
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
