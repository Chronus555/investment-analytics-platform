import { describe, it, expect } from 'vitest';
import { runMultipleRegression } from '../src/analytics/factors';

describe('Factor Analysis & OLS Engine', () => {
  it('recovers exact analytical multi-factor regression coefficients', () => {
    // Generate synthetic factors X1, X2
    const xMatrix: number[][] = [];
    const y: number[] = [];
    const factorNames = ['Mkt-RF', 'SMB'];

    for (let t = 0; t < 60; t++) {
      const f1 = 0.01 * Math.sin(t);
      const f2 = 0.01 * Math.cos(t);
      xMatrix.push([f1, f2]);

      // True model: alpha = 0.002 (20 bps / month), beta1 = 1.2, beta2 = -0.5
      const ret = 0.002 + 1.2 * f1 - 0.5 * f2;
      y.push(ret);
    }

    const reg = runMultipleRegression(y, xMatrix, factorNames);
    expect(reg.alpha).toBeCloseTo(0.002, 6);
    expect(reg.annualizedAlpha).toBeCloseTo(0.002 * 12, 6);
    expect(reg.betas['Mkt-RF']).toBeCloseTo(1.2, 5);
    expect(reg.betas['SMB']).toBeCloseTo(-0.5, 5);
    expect(reg.rSquared).toBeCloseTo(1.0, 4);
    expect(reg.residualVolatility).toBeCloseTo(0.0, 4);
  });
});
