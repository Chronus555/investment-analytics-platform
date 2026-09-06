import { describe, it, expect } from 'vitest';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCalmarRatio,
  calculateHistoricalVaR,
  calculateHistoricalCVaR,
  calculateBeta,
  calculateAlpha,
  calculateDownsideDeviation
} from '../src/analytics/risk';

describe('Risk & Performance Metrics', () => {
  it('calculates Sharpe ratio correctly', () => {
    // Return = 10%, Volatility = 15%, Risk-free = 4%
    // Sharpe = (0.10 - 0.04) / 0.15 = 0.06 / 0.15 = 0.40
    const sharpe = calculateSharpeRatio(0.10, 0.15, 0.04);
    expect(sharpe).toBeCloseTo(0.40, 6);
  });

  it('calculates Calmar ratio correctly', () => {
    // Return = 12%, Max Drawdown = -24% -> Calmar = 0.12 / 0.24 = 0.50
    const calmar = calculateCalmarRatio(0.12, -0.24);
    expect(calmar).toBeCloseTo(0.50, 6);
  });

  it('calculates downside deviation and Sortino ratio', () => {
    const returns = [0.05, 0.02, -0.04, -0.02, 0.03, -0.01];
    const dd = calculateDownsideDeviation(returns, 0, 12);
    expect(dd).toBeGreaterThan(0);

    const sortino = calculateSortinoRatio(0.10, dd, 0.04);
    expect(sortino).toBeCloseTo((0.10 - 0.04) / dd, 6);
  });

  it('computes historical VaR and CVaR at 95% confidence', () => {
    // 20 observations, sorted worst to best
    const returns = [
      -0.10, -0.08, -0.05, -0.02, -0.01,
      0.00, 0.01, 0.02, 0.02, 0.03,
      0.03, 0.04, 0.04, 0.05, 0.06,
      0.07, 0.08, 0.09, 0.10, 0.12
    ];
    // 5% of 20 is index 1 (-0.08 -> 8% loss)
    const var95 = calculateHistoricalVaR(returns, 0.95);
    expect(var95).toBeCloseTo(0.08, 2);

    const cvar95 = calculateHistoricalCVaR(returns, 0.95);
    // Tail is worst observation(s)
    expect(cvar95).toBeGreaterThanOrEqual(var95);
  });

  it('computes regression Beta and Jensen Alpha', () => {
    // Perfect 1.5x levered benchmark: Rp = 1.5 * Rb
    const rb = [0.02, -0.01, 0.03, -0.04, 0.01];
    const rp = rb.map((r) => r * 1.5);

    const beta = calculateBeta(rp, rb);
    expect(beta).toBeCloseTo(1.5, 6);

    // Alpha when CAGR matches CAPM should be 0
    const alpha = calculateAlpha(0.15, 0.10, 1.5, 0.0);
    // 0.15 - (0 + 1.5 * 0.10) = 0
    expect(alpha).toBeCloseTo(0.0, 6);
  });
});
