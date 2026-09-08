/**
 * Custom Macro Scenario Stress-Testing Engine
 * Implements multi-factor macroeconomic shock propagation:
 * - Interest rate shocks (bps) with bond duration & convexity modeling
 * - Equity market crash (%) with multi-factor beta sensitivities
 * - Crude oil / commodity supply shocks (%)
 * - Credit spread widening (bps)
 * - Inflation / CPI surprise shocks (%)
 *
 * Provides historical crisis analog presets (1973 Stagflation, 1987 Black Monday,
 * 2000 Dot-com, 2008 GFC, 2020 COVID, 2022 Fed Rate Shock), interactive factor sliders,
 * asset loss waterfall attribution, and portfolio resilience scoring.
 */

export interface MacroFactorShock {
  equityShockPct: number;      // e.g. -0.30 for -30% equity crash
  rateShockBps: number;        // e.g. +250 for +250 bps rate hike
  creditSpreadBps: number;     // e.g. +300 for +300 bps credit widening
  oilShockPct: number;         // e.g. +0.50 for +50% oil spike
  inflationShockPct: number;   // e.g. +0.04 for +4% CPI surge
}

export interface FactorSensitivities {
  equityBeta: number;          // Sensitivity to broad equity market
  durationYears: number;       // Effective duration (for rate shocks)
  convexity: number;           // Bond price convexity adjustment
  creditSpreadBeta: number;    // Sensitivity to credit spread widening
  oilBeta: number;             // Sensitivity to crude oil shocks
  inflationBeta: number;       // Sensitivity to unexpected inflation
}

export interface MacroScenarioPreset {
  id: string;
  name: string;
  period: string;
  category: 'Stagflation' | 'Market Crash' | 'Credit Crisis' | 'Rate Shock' | 'Pandemic';
  description: string;
  shock: MacroFactorShock;
}

/**
 * Standard asset sensitivities across major asset classes and liquid ETFs
 */
export const ASSET_FACTOR_SENSITIVITIES: Record<string, FactorSensitivities> = {
  // Equities
  SPY: { equityBeta: 1.00, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.15, oilBeta: -0.05, inflationBeta: -0.20 },
  QQQ: { equityBeta: 1.25, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.18, oilBeta: -0.08, inflationBeta: -0.35 },
  AVUV: { equityBeta: 1.22, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.30, oilBeta: 0.10, inflationBeta: 0.10 },
  VTI: { equityBeta: 1.02, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.18, oilBeta: -0.04, inflationBeta: -0.20 },
  IWM: { equityBeta: 1.20, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.35, oilBeta: 0.05, inflationBeta: -0.15 },
  VEA: { equityBeta: 0.95, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.20, oilBeta: -0.05, inflationBeta: -0.22 },
  VWO: { equityBeta: 1.05, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.35, oilBeta: 0.15, inflationBeta: 0.05 },
  VNQ: { equityBeta: 0.85, durationYears: 4.5, convexity: 0.2, creditSpreadBeta: 0.40, oilBeta: -0.10, inflationBeta: 0.15 },

  // Fixed Income
  BND: { equityBeta: 0.05, durationYears: 6.2, convexity: 0.4, creditSpreadBeta: 0.25, oilBeta: -0.02, inflationBeta: -0.25 },
  AGG: { equityBeta: 0.05, durationYears: 6.2, convexity: 0.4, creditSpreadBeta: 0.25, oilBeta: -0.02, inflationBeta: -0.25 },
  TLT: { equityBeta: -0.15, durationYears: 16.8, convexity: 3.9, creditSpreadBeta: -0.10, oilBeta: -0.05, inflationBeta: -0.55 },
  IEF: { equityBeta: -0.08, durationYears: 7.4, convexity: 0.7, creditSpreadBeta: -0.05, oilBeta: -0.03, inflationBeta: -0.30 },
  SHY: { equityBeta: 0.01, durationYears: 1.9, convexity: 0.05, creditSpreadBeta: 0.02, oilBeta: -0.01, inflationBeta: -0.08 },
  LQD: { equityBeta: 0.25, durationYears: 8.5, convexity: 0.9, creditSpreadBeta: 0.75, oilBeta: -0.04, inflationBeta: -0.30 },
  HYG: { equityBeta: 0.60, durationYears: 3.8, convexity: 0.2, creditSpreadBeta: 1.20, oilBeta: 0.12, inflationBeta: -0.15 },
  TIP: { equityBeta: 0.05, durationYears: 6.8, convexity: 0.6, creditSpreadBeta: 0.10, oilBeta: 0.08, inflationBeta: 0.45 },

  // Real Assets & Commodities
  GLD: { equityBeta: 0.05, durationYears: -1.5, convexity: 0.0, creditSpreadBeta: -0.15, oilBeta: 0.25, inflationBeta: 0.65 },
  IAU: { equityBeta: 0.05, durationYears: -1.5, convexity: 0.0, creditSpreadBeta: -0.15, oilBeta: 0.25, inflationBeta: 0.65 },
  DBC: { equityBeta: 0.35, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.10, oilBeta: 0.85, inflationBeta: 0.70 },
  USO: { equityBeta: 0.30, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.15, oilBeta: 1.00, inflationBeta: 0.60 },

  // Cash / Cash Equivalents
  CASH: { equityBeta: 0.0, durationYears: 0.1, convexity: 0.0, creditSpreadBeta: 0.0, oilBeta: 0.0, inflationBeta: -0.02 },
  BIL: { equityBeta: 0.0, durationYears: 0.2, convexity: 0.0, creditSpreadBeta: 0.0, oilBeta: 0.0, inflationBeta: -0.02 },
};

/**
 * Fallback sensitivities for unknown assets based on asset class heuristics
 */
export function getAssetSensitivities(symbol: string): FactorSensitivities {
  const upper = symbol.toUpperCase().trim();
  if (ASSET_FACTOR_SENSITIVITIES[upper]) {
    return ASSET_FACTOR_SENSITIVITIES[upper];
  }

  // Asset class keyword fallbacks
  if (upper.includes('BOND') || upper.includes('TREASURY') || upper.includes('FIXED')) {
    return { equityBeta: 0.05, durationYears: 6.5, convexity: 0.5, creditSpreadBeta: 0.20, oilBeta: -0.02, inflationBeta: -0.25 };
  }
  if (upper.includes('GOLD') || upper.includes('SILVER') || upper.includes('PRECIOUS')) {
    return { equityBeta: 0.05, durationYears: -1.0, convexity: 0.0, creditSpreadBeta: -0.10, oilBeta: 0.20, inflationBeta: 0.60 };
  }
  if (upper.includes('COMMODITY') || upper.includes('OIL') || upper.includes('ENERGY')) {
    return { equityBeta: 0.40, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.10, oilBeta: 0.80, inflationBeta: 0.65 };
  }
  if (upper.includes('CASH') || upper.includes('MONEY') || upper.includes('SHORT')) {
    return { equityBeta: 0.0, durationYears: 0.2, convexity: 0.0, creditSpreadBeta: 0.0, oilBeta: 0.0, inflationBeta: -0.02 };
  }

  // Default to standard equity beta
  return { equityBeta: 1.00, durationYears: 0.0, convexity: 0.0, creditSpreadBeta: 0.18, oilBeta: -0.05, inflationBeta: -0.20 };
}

/**
 * Historical Macro Scenarios & Analogs
 */
export const MACRO_HISTORICAL_PRESETS: MacroScenarioPreset[] = [
  {
    id: 'stagflation_1973',
    name: '1973 Great Stagflation (OPEC Embargo)',
    period: '1973 - 1974',
    category: 'Stagflation',
    description: 'Quadrupled oil prices trigger double-digit CPI inflation and aggressive interest rate hikes, causing simultaneous severe equity and bond losses while gold and commodities surge.',
    shock: {
      equityShockPct: -0.42,
      rateShockBps: 350,
      creditSpreadBps: 260,
      oilShockPct: 1.30,
      inflationShockPct: 0.085,
    },
  },
  {
    id: 'black_monday_1987',
    name: '1987 Black Monday Flash Crash',
    period: 'October 1987',
    category: 'Market Crash',
    description: 'Cascading portfolio insurance selling causes single-day 22.6% equity crash; flight-to-safety drives Treasury yields down as credit spreads spike.',
    shock: {
      equityShockPct: -0.28,
      rateShockBps: -75,
      creditSpreadBps: 160,
      oilShockPct: -0.15,
      inflationShockPct: -0.005,
    },
  },
  {
    id: 'dotcom_2000',
    name: '2000 Dot-Com Tech Bubble Collapse',
    period: '2000 - 2002',
    category: 'Market Crash',
    description: 'Valuation deflation in technology and telecommunications triggers broad equity bear market; Fed slashes interest rates while high-grade Treasuries rally.',
    shock: {
      equityShockPct: -0.44,
      rateShockBps: -175,
      creditSpreadBps: 280,
      oilShockPct: -0.25,
      inflationShockPct: -0.012,
    },
  },
  {
    id: 'gfc_2008',
    name: '2008 Global Financial Crisis (Lehman)',
    period: '2007 - 2009',
    category: 'Credit Crisis',
    description: 'Systemic banking insolvency and subprime mortgage collapse freeze global credit; emergency rate cuts to zero lower bound and flight to Treasuries.',
    shock: {
      equityShockPct: -0.52,
      rateShockBps: -250,
      creditSpreadBps: 550,
      oilShockPct: -0.58,
      inflationShockPct: -0.025,
    },
  },
  {
    id: 'covid_2020',
    name: '2020 COVID-19 Liquidity Freeze',
    period: 'Feb - Mar 2020',
    category: 'Pandemic',
    description: 'Unprecedented global pandemic lockdowns trigger fastest 30% equity drop in history, severe oil crash, and massive central bank emergency liquidity injections.',
    shock: {
      equityShockPct: -0.34,
      rateShockBps: -125,
      creditSpreadBps: 380,
      oilShockPct: -0.65,
      inflationShockPct: -0.010,
    },
  },
  {
    id: 'fed_shock_2022',
    name: '2022 Fed Rate Shock & Inflation',
    period: '2022 Full Year',
    category: 'Rate Shock',
    description: 'Fastest Federal Reserve rate hike campaign in 40 years combined with 9% CPI inflation destroys 60/40 diversification as stocks and bonds drop together.',
    shock: {
      equityShockPct: -0.22,
      rateShockBps: 425,
      creditSpreadBps: 180,
      oilShockPct: 0.40,
      inflationShockPct: 0.068,
    },
  },
];

export interface AssetStressAttribution {
  symbol: string;
  weight: number;
  sensitivities: FactorSensitivities;
  equityContribution: number;
  ratesContribution: number;
  creditContribution: number;
  oilContribution: number;
  inflationContribution: number;
  assetTotalReturn: number;
  weightedPortfolioReturn: number;
  hedgeStatus: 'hedged' | 'loss_driver' | 'neutral';
}

export interface FactorStressDecomposition {
  equityFactorPct: number;
  ratesFactorPct: number;
  creditFactorPct: number;
  oilFactorPct: number;
  inflationFactorPct: number;
  totalStressPct: number;
}

export interface MacroStressResult {
  shock: MacroFactorShock;
  portfolioShockReturn: number;
  benchmarkShockReturn: number;
  resilienceAlpha: number;          // portfolioShockReturn - benchmarkShockReturn
  estimatedDollarLoss: number;
  endingPortfolioBalance: number;
  projectedRecoveryMonths: number;
  resilienceScore: number;          // 0 to 100
  resilienceGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  factorDecomposition: FactorStressDecomposition;
  assetAttributions: AssetStressAttribution[];
}

/**
 * Calculates asset return response to macro factor shocks using duration-convexity
 * and multi-factor linear beta sensitivities.
 */
export function calculateAssetStressReturn(
  sensitivities: FactorSensitivities,
  shock: MacroFactorShock
): {
  assetReturn: number;
  equityImpact: number;
  ratesImpact: number;
  creditImpact: number;
  oilImpact: number;
  inflationImpact: number;
} {
  // 1. Equity impact: Beta * Delta S
  const equityImpact = sensitivities.equityBeta * shock.equityShockPct;

  // 2. Interest rate impact: -Duration * Delta y + 0.5 * Convexity * (Delta y)^2
  // Delta y in decimals: 100 bps = 0.01
  const dy = shock.rateShockBps / 10000;
  const ratesImpact = -sensitivities.durationYears * dy + 0.5 * sensitivities.convexity * Math.pow(dy, 2);

  // 3. Credit spread impact: -CreditBeta * (Delta Spread / 10000) * 6.0
  const dSpread = shock.creditSpreadBps / 10000;
  const creditImpact = -sensitivities.creditSpreadBeta * dSpread * 6.0;

  // 4. Oil shock impact: OilBeta * Delta Oil
  const oilImpact = sensitivities.oilBeta * shock.oilShockPct;

  // 5. Inflation surprise impact: InflationBeta * Delta Inflation
  const inflationImpact = sensitivities.inflationBeta * shock.inflationShockPct;

  const assetReturn = equityImpact + ratesImpact + creditImpact + oilImpact + inflationImpact;

  return {
    assetReturn,
    equityImpact,
    ratesImpact,
    creditImpact,
    oilImpact,
    inflationImpact,
  };
}

/**
 * Runs the full macroeconomic scenario stress test on a multi-asset portfolio.
 */
export function runMacroStressTest(
  allocations: Array<{ symbol: string; weight: number }>,
  shock: MacroFactorShock,
  options: {
    initialBalance?: number;
    benchmarkSymbol?: string;
    expectedAnnualReturn?: number; // default 0.07 (7%) for recovery estimation
  } = {}
): MacroStressResult {
  const initialBalance = options.initialBalance || 10000;
  const benchmarkSymbol = options.benchmarkSymbol || 'SPY';
  const expectedAnnualReturn = options.expectedAnnualReturn || 0.07;

  // Normalize weights
  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
  const normalizedAllocations = allocations.map((a) => ({
    symbol: a.symbol,
    weight: totalWeight > 0 ? a.weight / totalWeight : 0,
  }));

  // Benchmark response
  const benchSensitivities = getAssetSensitivities(benchmarkSymbol);
  const benchRes = calculateAssetStressReturn(benchSensitivities, shock);
  const benchmarkShockReturn = benchRes.assetReturn;

  // Asset Attributions
  let portfolioShockReturn = 0;
  let totalEquityFactor = 0;
  let totalRatesFactor = 0;
  let totalCreditFactor = 0;
  let totalOilFactor = 0;
  let totalInflationFactor = 0;

  const assetAttributions: AssetStressAttribution[] = normalizedAllocations.map((a) => {
    const sensitivities = getAssetSensitivities(a.symbol);
    const impact = calculateAssetStressReturn(sensitivities, shock);

    const weightedReturn = impact.assetReturn * a.weight;
    portfolioShockReturn += weightedReturn;

    totalEquityFactor += impact.equityImpact * a.weight;
    totalRatesFactor += impact.ratesImpact * a.weight;
    totalCreditFactor += impact.creditImpact * a.weight;
    totalOilFactor += impact.oilImpact * a.weight;
    totalInflationFactor += impact.inflationImpact * a.weight;

    let hedgeStatus: 'hedged' | 'loss_driver' | 'neutral' = 'neutral';
    if (weightedReturn > 0.005) {
      hedgeStatus = 'hedged';
    } else if (weightedReturn < -0.02) {
      hedgeStatus = 'loss_driver';
    }

    return {
      symbol: a.symbol,
      weight: a.weight,
      sensitivities,
      equityContribution: impact.equityImpact * a.weight,
      ratesContribution: impact.ratesImpact * a.weight,
      creditContribution: impact.creditImpact * a.weight,
      oilContribution: impact.oilImpact * a.weight,
      inflationContribution: impact.inflationImpact * a.weight,
      assetTotalReturn: impact.assetReturn,
      weightedPortfolioReturn: weightedReturn,
      hedgeStatus,
    };
  });

  // Factor Decomposition
  const factorDecomposition: FactorStressDecomposition = {
    equityFactorPct: totalEquityFactor,
    ratesFactorPct: totalRatesFactor,
    creditFactorPct: totalCreditFactor,
    oilFactorPct: totalOilFactor,
    inflationFactorPct: totalInflationFactor,
    totalStressPct: portfolioShockReturn,
  };

  // Financial outcomes
  const estimatedDollarLoss = Math.round(initialBalance * portfolioShockReturn);
  const endingPortfolioBalance = Math.max(0, Math.round(initialBalance * (1 + portfolioShockReturn)));
  const resilienceAlpha = portfolioShockReturn - benchmarkShockReturn;

  // Projected recovery timeline (in months)
  // recovery = -ln(1 + shockReturn) / ln(1 + monthlyExpectedReturn)
  let projectedRecoveryMonths = 0;
  if (portfolioShockReturn < 0) {
    const monthlyRate = Math.pow(1 + expectedAnnualReturn, 1 / 12) - 1;
    const lossMagnitude = Math.abs(portfolioShockReturn);
    projectedRecoveryMonths = Math.min(120, Math.round(lossMagnitude / monthlyRate));
  }

  // Resilience score (0-100)
  // Higher is better: 100 for zero loss or gain, docked for severe drawdowns, bonus for hedge alpha
  let score = 50 + (portfolioShockReturn * 100);
  if (resilienceAlpha > 0) {
    score += resilienceAlpha * 50;
  }
  score = Math.max(5, Math.min(99, Math.round(score)));

  let resilienceGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  if (score >= 85) resilienceGrade = 'A+';
  else if (score >= 75) resilienceGrade = 'A';
  else if (score >= 60) resilienceGrade = 'B';
  else if (score >= 45) resilienceGrade = 'C';
  else if (score >= 30) resilienceGrade = 'D';
  else resilienceGrade = 'F';

  return {
    shock,
    portfolioShockReturn,
    benchmarkShockReturn,
    resilienceAlpha,
    estimatedDollarLoss,
    endingPortfolioBalance,
    projectedRecoveryMonths,
    resilienceScore: score,
    resilienceGrade,
    factorDecomposition,
    assetAttributions,
  };
}
