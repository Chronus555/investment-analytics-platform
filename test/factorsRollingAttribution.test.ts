import { describe, it, expect } from 'vitest';
import {
  runMultipleRegression,
  computeRollingFactorRegression,
  computeFactorAttribution,
} from '../src/analytics/factors';

describe('Rolling Factor Regression & Performance Attribution Engine', () => {
  // Generate synthetic multi-factor dataset
  const N = 60; // 5 years of monthly data
  const dates: string[] = [];
  const factorNames = ['MKT-RF', 'SMB', 'HML'];
  const xMatrix: number[][] = [];
  const y: number[] = [];

  const trueAlpha = 0.002; // 0.2% monthly = 2.4% annualized
  const trueBetaMkt = 1.1;
  const trueBetaSmb = 0.4;
  const trueBetaHml = -0.3;

  for (let i = 0; i < N; i++) {
    const year = 2020 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, '0');
    dates.push(`${year}-${month}`);

    // Deterministic periodic factor returns
    const mkt = 0.01 + 0.03 * Math.sin(i * 0.4);
    const smb = 0.002 + 0.015 * Math.cos(i * 0.5);
    const hml = -0.001 + 0.02 * Math.sin(i * 0.7);

    xMatrix.push([mkt, smb, hml]);

    // Exact linear combination + small deterministic noise
    const noise = 0.0005 * Math.sin(i * 1.5);
    const assetRet = trueAlpha + trueBetaMkt * mkt + trueBetaSmb * smb + trueBetaHml * hml + noise;
    y.push(assetRet);
  }

  it('correctly executes full-period OLS regression recovering true parameters', () => {
    const res = runMultipleRegression(y, xMatrix, factorNames);
    expect(res.observations).toBe(60);
    expect(res.annualizedAlpha).toBeCloseTo(trueAlpha * 12, 1);
    expect(res.betas['MKT-RF']).toBeCloseTo(trueBetaMkt, 1);
    expect(res.betas['SMB']).toBeCloseTo(trueBetaSmb, 1);
    expect(res.betas['HML']).toBeCloseTo(trueBetaHml, 1);
    expect(res.rSquared).toBeGreaterThan(0.95);
  });

  it('correctly computes rolling factor regression across 24-month and 36-month windows', () => {
    const rolling24 = computeRollingFactorRegression(dates, y, xMatrix, factorNames, 24);
    expect(rolling24.length).toBe(N - 24 + 1); // 60 - 24 + 1 = 37 points
    expect(rolling24[0].date).toBe(dates[23]);
    expect(rolling24[rolling24.length - 1].date).toBe(dates[dates.length - 1]);

    const rolling36 = computeRollingFactorRegression(dates, y, xMatrix, factorNames, 36);
    expect(rolling36.length).toBe(N - 36 + 1); // 60 - 36 + 1 = 25 points
    expect(rolling36[0].date).toBe(dates[35]);

    // Check that betas are reasonably bounded around true parameters
    rolling36.forEach((pt) => {
      expect(pt.betas['MKT-RF']).toBeGreaterThan(0.8);
      expect(pt.betas['MKT-RF']).toBeLessThan(1.4);
      expect(pt.rSquared).toBeGreaterThan(0.9);
      expect(pt.residualVolatility).toBeGreaterThan(0);
    });
  });

  it('validates mathematical identity of factor performance attribution decomposition', () => {
    const reg = runMultipleRegression(y, xMatrix, factorNames);
    const attr = computeFactorAttribution(y, xMatrix, factorNames, reg);

    expect(attr.items.length).toBe(3);
    expect(attr.items[0].factor).toBe('MKT-RF');
    expect(attr.items[1].factor).toBe('SMB');
    expect(attr.items[2].factor).toBe('HML');

    // Total explained = annualizedAlpha + sum(contributions)
    const sumContrib = attr.items.reduce((s, it) => s + it.annualizedContribution, 0);
    expect(attr.totalFactorContribution).toBeCloseTo(sumContrib, 6);

    // Identity: totalExcessReturn = annualizedAlpha + totalFactorContribution + residualReturn
    const reconstructed = attr.annualizedAlpha + attr.totalFactorContribution + attr.residualReturn;
    expect(reconstructed).toBeCloseTo(attr.totalExcessReturn, 6);

    // Check that MKT contribution is positive and significant
    expect(attr.items[0].annualizedContribution).toBeGreaterThan(0);
  });
});
