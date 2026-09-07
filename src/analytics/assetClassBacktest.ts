/**
 * Multi-Decade Asset Class Historical Backtesting Engine (1972 - Present)
 * 
 * Simulates portfolio compounding over 54 calendar years across secular macro regimes.
 * Supports nominal vs real (CPI-U adjusted) purchasing power, decade breakdown matrices,
 * and historical crisis stress testing.
 */

import {
  ASSET_CLASSES,
  ASSET_CLASS_YEARS,
  ASSET_CLASS_ANNUAL_RETURNS,
  CPI_U_ANNUAL,
  AssetClassMeta,
} from '@/data/assetClassData';
import { calculateStandardDeviation, calculateMean } from './statistics';

export interface PortfolioAllocationInput {
  id: string;
  name: string;
  weights: Record<string, number>; // assetClassId -> weight (0 to 1)
  color?: string;
}

export interface YearPoint {
  year: number;
  nominalWealth: number;
  realWealth: number;
  nominalReturn: number;
  realReturn: number;
  cpi: number;
  drawdownNominal: number;
  drawdownReal: number;
  driftedWeights: Record<string, number>;
}

export interface DecadeAttribution {
  decadeName: string;
  startYear: number;
  endYear: number;
  yearsCount: number;
  periodReturn: number;
  cagr: number;
  realCagr: number;
  volatility: number;
  maxDrawdown: number;
}

export interface CrisisAttribution {
  crisisId: string;
  name: string;
  period: string;
  startYear: number;
  endYear: number;
  description: string;
  periodReturn: number;
  realReturn: number;
  maxDrawdown: number;
}

export interface AssetClassPortfolioResult {
  id: string;
  name: string;
  color: string;
  weights: Record<string, number>;
  annualSeries: YearPoint[];
  kpis: {
    finalNominalBalance: number;
    finalRealBalance: number;
    nominalCagr: number;
    realCagr: number;
    annualVolatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdownNominal: number;
    maxDrawdownReal: number;
    bestYear: { year: number; return: number };
    worstYear: { year: number; return: number };
    positiveYearsPct: number;
  };
  decades: DecadeAttribution[];
  crises: CrisisAttribution[];
}

export interface AssetClassBacktestConfig {
  portfolios: PortfolioAllocationInput[];
  startYear?: number; // default 1972
  endYear?: number; // default 2025
  initialAmount?: number; // default 10,000
  rebalancing?: 'annual' | 'none';
  benchmarkId?: string; // e.g. 'classic_60_40' or 'us_total_equity'
}

export interface AssetClassBacktestResult {
  portfolios: AssetClassPortfolioResult[];
  benchmark: AssetClassPortfolioResult;
  years: number[];
  cpiSeries: { year: number; cpi: number; cumulativeInflationFactor: number }[];
}

const HISTORICAL_CRISES_DEFINITIONS = [
  {
    crisisId: 'stagflation_1973',
    name: 'Great Stagflation & Oil Embargo',
    period: '1973 - 1974',
    startYear: 1973,
    endYear: 1974,
    description: 'Double-digit CPI inflation paired with severe equity bear market (-48% real S&P drop) and gold rally.',
  },
  {
    crisisId: 'volcker_shock_1980',
    name: 'Volcker 20% Interest Rate Shock',
    period: '1980 - 1982',
    startYear: 1980,
    endYear: 1982,
    description: 'Aggressive Fed rate hikes to crush inflation triggering a severe double-dip industrial recession.',
  },
  {
    crisisId: 'black_monday_1987',
    name: 'Black Monday Market Crash',
    period: '1987',
    startYear: 1987,
    endYear: 1987,
    description: 'Single largest one-day stock crash in history with subsequent Treasury bond flight to safety.',
  },
  {
    crisisId: 'dot_com_bust_2000',
    name: 'Dot-Com Bust & Tech Crash',
    period: '2000 - 2002',
    startYear: 2000,
    endYear: 2002,
    description: '3 consecutive years of equity losses; massive rotation into Small Value, Treasuries, and Gold.',
  },
  {
    crisisId: 'gfc_2008',
    name: 'Global Financial Crisis (GFC)',
    period: '2007 - 2009',
    startYear: 2007,
    endYear: 2009,
    description: 'Systemic subprime mortgage contagion, Lehman collapse, and global liquidity freezing.',
  },
  {
    crisisId: 'covid_2020',
    name: 'COVID-19 Pandemic Shock & Stimulus',
    period: '2020',
    startYear: 2020,
    endYear: 2020,
    description: 'Unprecedented global lockdowns followed by historic fiscal stimulus and monetary liquidity injection.',
  },
  {
    crisisId: 'fed_tightening_2022',
    name: 'Fed 500bps Rate Hikes & Inflation Shock',
    period: '2022',
    startYear: 2022,
    endYear: 2022,
    description: 'Worst year for traditional 60/40 portfolios in 50 years as stocks and bonds crashed concurrently.',
  },
];

const DECADE_DEFINITIONS = [
  { name: '1970s (The Great Stagflation)', startYear: 1972, endYear: 1979 },
  { name: '1980s (The Disinflation Boom)', startYear: 1980, endYear: 1989 },
  { name: '1990s (The Tech Expansion)', startYear: 1990, endYear: 1999 },
  { name: '2000s (The Lost Decade)', startYear: 2000, endYear: 2009 },
  { name: '2010s (The ZIRP Bull Market)', startYear: 2010, endYear: 2019 },
  { name: '2020s (Inflation Resurgence)', startYear: 2020, endYear: 2025 },
];

/**
 * Simulates a single portfolio across the 54-year dataset
 */
function simulateSinglePortfolio(
  pInput: PortfolioAllocationInput,
  startYear: number,
  endYear: number,
  initialAmount: number,
  rebalancing: 'annual' | 'none',
  defaultColor: string
): AssetClassPortfolioResult {
  const startIdx = ASSET_CLASS_YEARS.indexOf(startYear);
  const endIdx = ASSET_CLASS_YEARS.indexOf(endYear);

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new Error(`Invalid year range: ${startYear} to ${endYear}`);
  }

  // Normalize weights
  const rawWeights = pInput.weights;
  const weightSum = Object.values(rawWeights).reduce((a, b) => a + b, 0);
  const normWeights: Record<string, number> = {};
  if (weightSum > 0) {
    for (const [k, v] of Object.entries(rawWeights)) {
      normWeights[k] = v / weightSum;
    }
  } else {
    normWeights['US_LARGE_CAP'] = 1.0;
  }

  const annualSeries: YearPoint[] = [];
  let curNominalWealth = initialAmount;
  let curRealWealth = initialAmount;
  let peakNominalWealth = initialAmount;
  let peakRealWealth = initialAmount;
  let cumInflation = 1.0;

  let activeWeights = { ...normWeights };

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const year = ASSET_CLASS_YEARS[idx];
    const cpi = CPI_U_ANNUAL[idx] || 0.025;
    cumInflation *= 1 + cpi;

    if (rebalancing === 'annual') {
      activeWeights = { ...normWeights };
    }

    // Portfolio nominal annual return
    let nomRet = 0;
    for (const [assetId, w] of Object.entries(activeWeights)) {
      const r = ASSET_CLASS_ANNUAL_RETURNS[assetId]?.[idx] || 0;
      nomRet += w * r;
    }

    // Real return (Fisher equation: (1 + R) / (1 + i) - 1)
    const realRet = (1 + nomRet) / (1 + cpi) - 1;

    curNominalWealth *= 1 + nomRet;
    curRealWealth = curNominalWealth / cumInflation;

    if (curNominalWealth > peakNominalWealth) peakNominalWealth = curNominalWealth;
    if (curRealWealth > peakRealWealth) peakRealWealth = curRealWealth;

    const ddNom = peakNominalWealth > 0 ? (curNominalWealth - peakNominalWealth) / peakNominalWealth : 0;
    const ddReal = peakRealWealth > 0 ? (curRealWealth - peakRealWealth) / peakRealWealth : 0;

    annualSeries.push({
      year,
      nominalWealth: curNominalWealth,
      realWealth: curRealWealth,
      nominalReturn: nomRet,
      realReturn: realRet,
      cpi,
      drawdownNominal: ddNom,
      drawdownReal: ddReal,
      driftedWeights: { ...activeWeights },
    });

    // Drift weights forward for next year if 'none'
    if (rebalancing === 'none') {
      const denom = 1 + nomRet;
      const nextW: Record<string, number> = {};
      for (const [assetId, w] of Object.entries(activeWeights)) {
        const r = ASSET_CLASS_ANNUAL_RETURNS[assetId]?.[idx] || 0;
        nextW[assetId] = denom !== 0 ? (w * (1 + r)) / denom : w;
      }
      activeWeights = nextW;
    }
  }

  // Calculate KPIs
  const numYears = endIdx - startIdx + 1;
  const nomCagr = Math.pow(curNominalWealth / initialAmount, 1 / numYears) - 1;
  const realCagr = Math.pow(curRealWealth / initialAmount, 1 / numYears) - 1;

  const nomReturns = annualSeries.map((p) => p.nominalReturn);
  const annVol = calculateStandardDeviation(nomReturns);

  // Average Cash return over this exact window as risk-free rate proxy
  const cashReturns = ASSET_CLASS_ANNUAL_RETURNS['CASH'].slice(startIdx, endIdx + 1);
  const avgRf = calculateMean(cashReturns);

  const sharpeRatio = annVol > 0 ? (nomCagr - avgRf) / annVol : 0;

  // Downside deviation for Sortino (threshold Rf)
  const downsideDiffs = nomReturns.map((r) => Math.min(0, r - avgRf));
  const downsideDev = Math.sqrt(
    downsideDiffs.reduce((sum, d) => sum + d * d, 0) / nomReturns.length
  );
  const sortinoRatio = downsideDev > 0 ? (nomCagr - avgRf) / downsideDev : 0;

  let maxDdNom = 0;
  let maxDdReal = 0;
  annualSeries.forEach((p) => {
    if (p.drawdownNominal < maxDdNom) maxDdNom = p.drawdownNominal;
    if (p.drawdownReal < maxDdReal) maxDdReal = p.drawdownReal;
  });

  let bestYear = { year: startYear, return: -999 };
  let worstYear = { year: startYear, return: 999 };
  let posCount = 0;

  annualSeries.forEach((p) => {
    if (p.nominalReturn > bestYear.return) bestYear = { year: p.year, return: p.nominalReturn };
    if (p.nominalReturn < worstYear.return) worstYear = { year: p.year, return: p.nominalReturn };
    if (p.nominalReturn >= 0) posCount++;
  });

  // Calculate Decade Attributions
  const decades: DecadeAttribution[] = [];
  for (const dDef of DECADE_DEFINITIONS) {
    const dStart = Math.max(startYear, dDef.startYear);
    const dEnd = Math.min(endYear, dDef.endYear);
    if (dStart <= dEnd) {
      const dPoints = annualSeries.filter((p) => p.year >= dStart && p.year <= dEnd);
      const dYears = dPoints.length;
      if (dYears > 0) {
        let dNomProd = 1;
        let dRealProd = 1;
        const dRets: number[] = [];
        let dMaxDd = 0;
        let dPeak = 1;

        dPoints.forEach((p) => {
          dNomProd *= 1 + p.nominalReturn;
          dRealProd *= 1 + p.realReturn;
          dRets.push(p.nominalReturn);

          if (dNomProd > dPeak) dPeak = dNomProd;
          const dd = (dNomProd - dPeak) / dPeak;
          if (dd < dMaxDd) dMaxDd = dd;
        });

        const dCagr = Math.pow(dNomProd, 1 / dYears) - 1;
        const dRealCagr = Math.pow(dRealProd, 1 / dYears) - 1;
        const dVol = calculateStandardDeviation(dRets);

        decades.push({
          decadeName: dDef.name,
          startYear: dStart,
          endYear: dEnd,
          yearsCount: dYears,
          periodReturn: dNomProd - 1,
          cagr: dCagr,
          realCagr: dRealCagr,
          volatility: dVol,
          maxDrawdown: dMaxDd,
        });
      }
    }
  }

  // Calculate Crisis Stress Testing Attributions
  const crises: CrisisAttribution[] = [];
  for (const cDef of HISTORICAL_CRISES_DEFINITIONS) {
    if (cDef.startYear >= startYear && cDef.endYear <= endYear) {
      const cPoints = annualSeries.filter((p) => p.year >= cDef.startYear && p.year <= cDef.endYear);
      if (cPoints.length > 0) {
        let cNomProd = 1;
        let cRealProd = 1;
        let cMaxDd = 0;
        let cPeak = 1;

        cPoints.forEach((p) => {
          cNomProd *= 1 + p.nominalReturn;
          cRealProd *= 1 + p.realReturn;
          if (cNomProd > cPeak) cPeak = cNomProd;
          const dd = (cNomProd - cPeak) / cPeak;
          if (dd < cMaxDd) cMaxDd = dd;
        });

        crises.push({
          crisisId: cDef.crisisId,
          name: cDef.name,
          period: cDef.period,
          startYear: cDef.startYear,
          endYear: cDef.endYear,
          description: cDef.description,
          periodReturn: cNomProd - 1,
          realReturn: cRealProd - 1,
          maxDrawdown: cMaxDd,
        });
      }
    }
  }

  return {
    id: pInput.id,
    name: pInput.name,
    color: pInput.color || defaultColor,
    weights: normWeights,
    annualSeries,
    kpis: {
      finalNominalBalance: curNominalWealth,
      finalRealBalance: curRealWealth,
      nominalCagr: nomCagr,
      realCagr,
      annualVolatility: annVol,
      sharpeRatio,
      sortinoRatio,
      maxDrawdownNominal: maxDdNom,
      maxDrawdownReal: maxDdReal,
      bestYear,
      worstYear,
      positiveYearsPct: posCount / numYears,
    },
    decades,
    crises,
  };
}

const DEFAULT_PORTFOLIO_COLORS = ['#2563EB', '#059669', '#7C3AED', '#D97706'];

export function runAssetClassBacktest(config: AssetClassBacktestConfig): AssetClassBacktestResult {
  const {
    portfolios,
    startYear = 1972,
    endYear = 2025,
    initialAmount = 10000,
    rebalancing = 'annual',
    benchmarkId = 'classic_60_40',
  } = config;

  if (!portfolios || portfolios.length === 0) {
    throw new Error('At least one portfolio allocation is required');
  }

  // Benchmark Portfolio (Default 60/40)
  const bWeights: Record<string, number> =
    benchmarkId === 'us_total_equity'
      ? { US_LARGE_CAP: 1.0 }
      : { US_LARGE_CAP: 0.60, TOTAL_BOND: 0.40 };

  const benchmarkInput: PortfolioAllocationInput = {
    id: 'benchmark_60_40',
    name: benchmarkId === 'us_total_equity' ? '100% US Equities' : 'Classic 60/40 Benchmark',
    weights: bWeights,
    color: '#64748B', // Neutral Slate
  };

  const simulatedBenchmark = simulateSinglePortfolio(
    benchmarkInput,
    startYear,
    endYear,
    initialAmount,
    rebalancing,
    '#64748B'
  );

  const simulatedPortfolios = portfolios.map((p, idx) =>
    simulateSinglePortfolio(
      p,
      startYear,
      endYear,
      initialAmount,
      rebalancing,
      DEFAULT_PORTFOLIO_COLORS[idx % DEFAULT_PORTFOLIO_COLORS.length]
    )
  );

  // Filter years range
  const startIdx = ASSET_CLASS_YEARS.indexOf(startYear);
  const endIdx = ASSET_CLASS_YEARS.indexOf(endYear);
  const years = ASSET_CLASS_YEARS.slice(startIdx, endIdx + 1);

  let cumInf = 1.0;
  const cpiSeries = years.map((y, idx) => {
    const rawIdx = startIdx + idx;
    const cpi = CPI_U_ANNUAL[rawIdx] || 0.025;
    cumInf *= 1 + cpi;
    return { year: y, cpi, cumulativeInflationFactor: cumInf };
  });

  return {
    portfolios: simulatedPortfolios,
    benchmark: simulatedBenchmark,
    years,
    cpiSeries,
  };
}
