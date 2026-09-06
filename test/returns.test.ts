import { describe, it, expect } from 'vitest';
import {
  calculateCAGR,
  calculateTotalReturn,
  calculateSimpleReturns,
  calculateLogReturns,
  calculateWealthIndex,
  calculateRollingReturns,
  calculateRealReturn
} from '../src/analytics/returns';

describe('Returns Analytics', () => {
  it('calculates exact analytical CAGR', () => {
    // ,000 to ,000 over 10 years: 2^(0.1) - 1 = 0.07177346
    const cagr = calculateCAGR(10000, 20000, 10);
    expect(cagr).toBeCloseTo(0.07177346, 6);
  });

  it('calculates total return correctly', () => {
    const total = calculateTotalReturn(10000, 25000);
    expect(total).toBe(1.5); // 150%
  });

  it('calculates simple returns from price array', () => {
    const prices = [100, 110, 99];
    const rets = calculateSimpleReturns(prices);
    expect(rets).toHaveLength(2);
    expect(rets[0]).toBeCloseTo(0.10, 6);
    expect(rets[1]).toBeCloseTo(-0.10, 6);
  });

  it('converts log returns properly', () => {
    const prices = [100, 110];
    const logRet = calculateLogReturns(prices);
    expect(logRet[0]).toBeCloseTo(Math.log(1.1), 6);
  });

  it('calculates cumulative wealth index', () => {
    const series = [
      { date: '2020-01-01', return: 0.10 },
      { date: '2020-02-01', return: -0.05 },
    ];
    const wealth = calculateWealthIndex(series, 1000);
    expect(wealth[0].value).toBe(1000);
    expect(wealth[1].value).toBe(1100);
    expect(wealth[2].value).toBeCloseTo(1045, 2);
  });

  it('computes rolling returns over window', () => {
    const rets = Array(24).fill(0.01); // 1% per month for 2 years
    const rolling = calculateRollingReturns(rets, 12, 12);
    expect(rolling.length).toBe(13);
    // (1.01)^12 - 1 = 0.126825
    expect(rolling[0]).toBeCloseTo(Math.pow(1.01, 12) - 1, 4);
  });

  it('adjusts for inflation via Fisher equation', () => {
    // 10% nominal return with 3% inflation
    const real = calculateRealReturn(0.10, 0.03);
    expect(real).toBeCloseTo(1.10 / 1.03 - 1, 6);
  });
});
