import { describe, it, expect } from 'vitest';
import {
  simulateRetirementPath,
  simulateRetirementMonteCarlo,
  calculateSWRSchedule,
  RetirementGoalConfig,
} from '../src/analytics/retirement';

describe('Retirement Decumulation & Goals Analytics', () => {
  it('correctly simulates accumulation and fixed real decumulation', () => {
    const config: RetirementGoalConfig = {
      currentAge: 60,
      retirementAge: 65,
      lifeExpectancyAge: 70,
      currentPortfolio: 500000,
      annualSavings: 20000,
      desiredAnnualSpending: 40000,
      strategy: 'fixed_real',
      inflationRate: 0.02,
    };

    const constantReturns = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
    const res = simulateRetirementPath(constantReturns, config);

    expect(res.states).toHaveLength(10);
    expect(res.success).toBe(true);

    // At age 60 (yr 0), accumulation: (500,000 + 20,000) * 1.05 = 546,000
    expect(Math.round(res.states[0].portfolioEnd)).toBe(546000);

    // At age 65 (yr 5), retirement begins, net withdrawal starts
    const retState = res.states[5];
    expect(retState.age).toBe(65);
    expect(retState.spending).toBeGreaterThan(0);
    expect(retState.netWithdrawal).toBeGreaterThan(0);
    expect(res.endingWealth).toBeGreaterThan(500000);
  });

  it('correctly offsets spending with Social Security outside income', () => {
    const config: RetirementGoalConfig = {
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancyAge: 75,
      currentPortfolio: 200000,
      annualSavings: 0,
      desiredAnnualSpending: 30000,
      strategy: 'fixed_nominal',
      socialSecurityAge: 67,
      socialSecurityAnnual: 20000,
    };

    const flatReturns = Array(10).fill(0.0);
    const res = simulateRetirementPath(flatReturns, config);

    // Age 65: SS not active, net withdrawal is 30,000
    expect(res.states[0].outsideIncome).toBe(0);
    expect(res.states[0].netWithdrawal).toBe(30000);

    // Age 67: SS active, net withdrawal is 30,000 - 20,000 = 10,000
    const ssState = res.states.find(s => s.age === 67);
    expect(ssState?.outsideIncome).toBe(20000);
    expect(ssState?.netWithdrawal).toBe(10000);
  });

  it('applies Guyton-Klinger capital preservation guardrail when portfolio drops', () => {
    const config: RetirementGoalConfig = {
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancyAge: 70,
      currentPortfolio: 100000,
      annualSavings: 0,
      desiredAnnualSpending: 5000, // Initial rate 5%
      strategy: 'guyton_klinger',
      inflationRate: 0.02,
    };

    // Severe market drop in year 1: -40%
    const marketShock = [-0.40, 0.02, 0.02, 0.02, 0.02];
    const res = simulateRetirementPath(marketShock, config);

    // After -40% crash, withdrawal rate spikes above 1.2 * initial (6%), triggering 10% spending cut
    const yr2 = res.states[1];
    expect(yr2.spending).toBeLessThan(5000); // Cut applied
  });

  it('clamps spending in floor_and_ceiling strategy', () => {
    const config: RetirementGoalConfig = {
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancyAge: 70,
      currentPortfolio: 100000,
      annualSavings: 0,
      desiredAnnualSpending: 10000,
      strategy: 'floor_and_ceiling',
      floorSpending: 8000,
      ceilingSpending: 12000,
    };

    // Huge bull market +80% in year 1
    const bullMarket = [0.80, 0.05, 0.05, 0.05, 0.05];
    const res = simulateRetirementPath(bullMarket, config);

    // Spending should be capped at ceiling (12,000)
    expect(res.states[1].spending).toBeLessThanOrEqual(12000);
  });

  it('runs Monte Carlo retirement simulation reproducibly', () => {
    const config: RetirementGoalConfig = {
      currentAge: 55,
      retirementAge: 65,
      lifeExpectancyAge: 85,
      currentPortfolio: 400000,
      annualSavings: 15000,
      desiredAnnualSpending: 45000,
      strategy: 'fixed_real',
      inflationRate: 0.025,
      socialSecurityAge: 67,
      socialSecurityAnnual: 24000,
    };

    const market = { meanReturn: 0.07, volatility: 0.12, seed: 42 };
    const sim1 = simulateRetirementMonteCarlo(config, market, 200);
    const sim2 = simulateRetirementMonteCarlo(config, market, 200);

    expect(sim1.totalPaths).toBe(200);
    expect(sim1.successRate).toBeCloseTo(sim2.successRate, 5);
    expect(sim1.medianEndingWealth).toBe(sim2.medianEndingWealth);
    expect(sim1.percentileTrajectories).toHaveLength(30); // 85 - 55 = 30 years
    expect(sim1.successRate).toBeGreaterThan(0.8);
  });

  it('computes Safe Withdrawal Rate (SWR) schedule with status categories', () => {
    const config: RetirementGoalConfig = {
      currentAge: 65,
      retirementAge: 65,
      lifeExpectancyAge: 90,
      currentPortfolio: 1000000,
      annualSavings: 0,
      desiredAnnualSpending: 40000,
      strategy: 'fixed_real',
    };

    const market = { meanReturn: 0.06, volatility: 0.10, seed: 101 };
    const rates = [0.03, 0.04, 0.05, 0.06, 0.07];
    const swr = calculateSWRSchedule(config, market, rates);

    expect(swr).toHaveLength(5);
    // 3% should be safer than 7%
    expect(swr[0].successRate).toBeGreaterThanOrEqual(swr[4].successRate);
    expect(swr[0].status).toBe('safe');
    expect(swr[4].status).toBe('risky');
  });
});
