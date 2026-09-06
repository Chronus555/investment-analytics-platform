import { describe, it, expect } from 'vitest';
import { evaluateAllStressRegimes, evaluateStressRegime, HISTORICAL_STRESS_REGIMES } from '../src/analytics/stressTesting';
import { CURATED_DATES, CURATED_RETURNS } from '../src/data/curatedData';

describe('Historical Stress Regimes Testing', () => {
  it('correctly evaluates 2008 GFC for SPY', () => {
    const spyReturns = CURATED_RETURNS['SPY'];
    const gfcRegime = HISTORICAL_STRESS_REGIMES.find((r) => r.id === 'gfc_2008')!;
    const result = evaluateStressRegime(CURATED_DATES, spyReturns, gfcRegime);

    expect(result).not.toBeNull();
    // 2008 GFC was a major crash (approx -40% to -50% peak-to-trough)
    expect(result!.cumulativeReturn).toBeLessThan(-0.30);
    expect(result!.maxDrawdown).toBeLessThan(-0.40);
    expect(result!.monthsInCrisis).toBe(18);
  });

  it('correctly evaluates 2020 COVID flash crash for SPY', () => {
    const spyReturns = CURATED_RETURNS['SPY'];
    const covidRegime = HISTORICAL_STRESS_REGIMES.find((r) => r.id === 'covid_2020')!;
    const result = evaluateStressRegime(CURATED_DATES, spyReturns, covidRegime);

    expect(result).not.toBeNull();
    expect(result!.maxDrawdown).toBeLessThan(-0.10);
    expect(result!.monthsInCrisis).toBe(3);
  });

  it('runs all regimes across full historical series', () => {
    const spyReturns = CURATED_RETURNS['SPY'];
    const allResults = evaluateAllStressRegimes(CURATED_DATES, spyReturns);

    expect(allResults.length).toBe(HISTORICAL_STRESS_REGIMES.length);
    for (const res of allResults) {
      expect(res.maxDrawdown).toBeLessThanOrEqual(0);
      expect(res.annualizedVol).toBeGreaterThan(0);
    }
  });
});