/**
 * Market Valuation-Based Tactical Asset Allocation Engine (Discipline 6.6)
 * Backtests counter-cyclical tactical allocation guided by structural valuation metrics:
 * 1. Shiller Cyclically Adjusted Price-to-Earnings (CAPE) ratio.
 * 2. Equity Risk Premium (ERP / Fed Model): Earnings Yield (1/CAPE) - 10Y Treasury Yield.
 */

import { calculateCAGR } from './returns';
import { calculateMaxDrawdown } from './drawdowns';
import { calculateAnnualizedVolatility } from './statistics';

export type ValuationMetric = 'shiller_cape' | 'equity_risk_premium';
export type ValuationRegime = 'undervalued' | 'fair_value' | 'overvalued';

export interface ValuationSignal {
  date: string;
  cape: number;
  treasury10Y: number;
  earningsYield: number; // 1 / cape
  erp: number; // earningsYield - treasury10Y
  metricValue: number;
  percentileRank: number; // 0.0 to 1.0 within historical series to date
  regime: ValuationRegime;
  targetEquityWeight: number; // 0.0 to 1.0
  targetSafeWeight: number; // 1.0 - targetEquityWeight
}

export interface ValuationBacktestConfig {
  metric: ValuationMetric;
  upperThreshold: number; // e.g. 30.0 for CAPE, or 0.01 (1.0%) for ERP
  lowerThreshold: number; // e.g. 20.0 for CAPE, or 0.035 (3.5%) for ERP
  minEquityWeight: number; // e.g. 0.30
  riskyAsset: string; // default 'SPY'
  safeAsset: string; // default 'BND'
  rebalanceFrequency?: 'monthly' | 'quarterly' | 'annual';
}

export interface ValuationBacktestResult {
  strategyGrowth: { date: string; value: number }[];
  benchmarkGrowth: { date: string; value: number }[];
  classic6040Growth: { date: string; value: number }[];
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  benchmarkCAGR: number;
  benchmarkVol: number;
  benchmarkSharpe: number;
  benchmarkMDD: number;
  annualTurnover: number;
  percentTimeDeRisked: number;
  signals: ValuationSignal[];
  allocations: { date: string; equity: number; safe: number }[];
  tradeLog: {
    date: string;
    action: string;
    equityWeight: number;
    safeWeight: number;
    metricValue: number;
    regime: ValuationRegime;
  }[];
}

// 229 monthly historical Shiller CAPE points (2007-01 to 2026-01)
export const HISTORICAL_SHILLER_CAPE: number[] = [27.18,26.85,26.54,27.2,27.6,27.42,27.28,26.68,27.02,27.35,26.15,25.96,24.02,23.36,22.42,23.11,23.47,22.38,21.49,21.68,19.33,16.42,14.88,15.38,15.17,13.32,13.78,15.17,16.19,16.74,17.75,18.98,19.53,19.88,20.04,20.25,20.53,20.2,21.22,22.06,20.48,19.64,19.78,19.82,20.89,21.43,21.32,22.31,22.78,23.38,22.95,23.49,23.23,22.56,22.84,20.67,19.85,20.82,20.65,20.98,21.38,22.12,22.69,22.42,21.21,21.57,21.73,22.25,22.78,22.51,22.35,22.62,23.25,23.47,23.95,24.18,24.95,24.52,25.18,24.62,25.04,25.75,26.31,26.74,26.02,26.38,26.57,26.65,27.02,27.28,26.95,27.35,27.08,26.82,27.51,27.42,26.85,27.48,27.25,27.38,27.52,26.98,27.12,25.82,25.04,26.25,26.38,25.85,24.21,24.15,25.28,25.55,25.82,26.05,26.88,26.95,26.82,26.54,27.35,28.06,28.52,29.35,29.48,29.62,30.05,30.22,30.74,30.85,31.42,31.95,32.48,32.96,33.31,32.42,32.18,31.85,32.32,32.25,32.84,33.25,33.12,30.98,30.75,28.32,28.65,29.72,30.15,31.02,29.85,30.82,31.25,30.64,30.98,31.42,32.25,32.78,32.54,30.82,24.82,27.25,28.95,29.82,31.15,32.85,31.98,31.52,33.42,34.25,34.85,35.62,36.25,37.42,37.15,37.85,38.25,38.74,38.05,38.92,39.65,38.82,37.15,35.82,36.42,33.85,32.65,30.25,31.25,31.02,27.52,27.15,28.62,28.32,29.54,29.85,30.22,30.65,30.42,31.85,32.62,31.95,30.54,29.82,31.54,32.65,33.25,34.52,35.15,34.62,35.54,36.25,36.54,36.32,36.95,37.42,38.15,37.82,37.25,36.85,36.42,36.75,37.12,37.54,37.82,37.95,37.62,37.45,37.28,37.15,37.4];

// 229 monthly historical 10-Year US Treasury Yields (2007-01 to 2026-01)
export const HISTORICAL_TREASURY_10Y: number[] = [0.0476,0.0472,0.0456,0.0469,0.0475,0.051,0.0503,0.0467,0.0452,0.0453,0.0415,0.041,0.0374,0.0374,0.0351,0.0368,0.0388,0.041,0.0401,0.0389,0.0369,0.0386,0.0353,0.0242,0.0252,0.0287,0.0282,0.0293,0.0329,0.0372,0.0356,0.0359,0.034,0.0339,0.0342,0.0359,0.0373,0.0369,0.0373,0.0385,0.0342,0.032,0.0301,0.027,0.0265,0.0254,0.0276,0.0329,0.0339,0.0358,0.0341,0.0346,0.0317,0.03,0.03,0.023,0.0198,0.0215,0.0201,0.0198,0.0197,0.0197,0.0217,0.0205,0.018,0.0162,0.0153,0.0167,0.0172,0.0175,0.0165,0.0172,0.0191,0.0198,0.0196,0.0176,0.0193,0.023,0.0258,0.0274,0.0281,0.0262,0.0275,0.029,0.0286,0.0271,0.0272,0.0271,0.0256,0.026,0.0254,0.0242,0.0253,0.023,0.0233,0.0221,0.0188,0.0198,0.0204,0.0194,0.0214,0.0236,0.0232,0.0217,0.0217,0.0207,0.0226,0.0224,0.0209,0.0178,0.0189,0.0181,0.0181,0.0164,0.015,0.0156,0.0163,0.0176,0.0214,0.0249,0.0243,0.0242,0.0248,0.023,0.023,0.0219,0.0232,0.0221,0.022,0.0236,0.0235,0.024,0.0258,0.0286,0.0284,0.0287,0.0298,0.0291,0.0286,0.0289,0.03,0.0315,0.0312,0.0283,0.0271,0.0268,0.0257,0.0253,0.024,0.0207,0.0206,0.0163,0.017,0.0171,0.0181,0.0186,0.0176,0.015,0.0087,0.0066,0.0067,0.0073,0.0062,0.0065,0.0068,0.0079,0.0087,0.0093,0.0108,0.0126,0.0161,0.0164,0.0162,0.0152,0.0132,0.0128,0.0137,0.0158,0.0156,0.0147,0.0176,0.0193,0.0213,0.0275,0.029,0.0314,0.029,0.029,0.0352,0.0398,0.0389,0.0362,0.0353,0.0375,0.0366,0.0346,0.0357,0.0375,0.039,0.0417,0.0438,0.048,0.045,0.0391,0.0406,0.0421,0.0421,0.0454,0.0448,0.0428,0.0418,0.0387,0.0372,0.0408,0.044,0.0435,0.0452,0.0448,0.0435,0.0428,0.0432,0.0438,0.0441,0.0445,0.0439,0.0432,0.0428,0.0425,0.043];

/**
 * Computes monthly valuation signals and target asset allocations with strict zero look-ahead bias.
 */
export function computeValuationSignals(
  dates: string[],
  config: ValuationBacktestConfig
): ValuationSignal[] {
  const n = Math.min(dates.length, HISTORICAL_SHILLER_CAPE.length);
  const signals: ValuationSignal[] = [];

  for (let t = 0; t < n; t++) {
    const cape = HISTORICAL_SHILLER_CAPE[t];
    const y10 = HISTORICAL_TREASURY_10Y[t];
    const earningsYield = 1.0 / cape;
    const erp = earningsYield - y10;

    const metricVal = config.metric === 'shiller_cape' ? cape : erp;

    // Percentile rank relative to historical observations up to month t (no look-ahead)
    const historyToDate = (config.metric === 'shiller_cape' ? HISTORICAL_SHILLER_CAPE : HISTORICAL_TREASURY_10Y)
      .slice(0, t + 1)
      .map((val, idx) => (config.metric === 'shiller_cape' ? val : 1.0 / HISTORICAL_SHILLER_CAPE[idx] - val));

    const countBelow = historyToDate.filter((v) => v <= metricVal).length;
    const percentileRank = countBelow / historyToDate.length;

    let targetEquity = 1.0;
    let regime: ValuationRegime = 'fair_value';

    if (config.metric === 'shiller_cape') {
      // High CAPE = Overvalued (De-risk)
      // Low CAPE = Undervalued (Full equity)
      if (metricVal >= config.upperThreshold) {
        targetEquity = config.minEquityWeight;
        regime = 'overvalued';
      } else if (metricVal <= config.lowerThreshold) {
        targetEquity = 1.0;
        regime = 'undervalued';
      } else {
        // Continuous linear ramp between lower and upper
        const slope = (1.0 - config.minEquityWeight) / (config.upperThreshold - config.lowerThreshold);
        targetEquity = 1.0 - (metricVal - config.lowerThreshold) * slope;
        regime = 'fair_value';
      }
    } else {
      // Equity Risk Premium (ERP): High ERP = Cheap equities (Full equity)
      // Low ERP = Expensive equities / High bond yield (De-risk)
      if (metricVal <= config.upperThreshold) {
        // Here upperThreshold acts as the low-ERP / dangerous limit
        targetEquity = config.minEquityWeight;
        regime = 'overvalued';
      } else if (metricVal >= config.lowerThreshold) {
        targetEquity = 1.0;
        regime = 'undervalued';
      } else {
        const slope = (1.0 - config.minEquityWeight) / (config.lowerThreshold - config.upperThreshold);
        targetEquity = config.minEquityWeight + (metricVal - config.upperThreshold) * slope;
        regime = 'fair_value';
      }
    }

    // Clamp bounds [minEquityWeight, 1.0]
    targetEquity = Math.max(config.minEquityWeight, Math.min(1.0, targetEquity));
    const targetSafe = Math.max(0.0, 1.0 - targetEquity);

    signals.push({
      date: dates[t],
      cape,
      treasury10Y: y10,
      earningsYield,
      erp,
      metricValue: metricVal,
      percentileRank,
      regime,
      targetEquityWeight: targetEquity,
      targetSafeWeight: targetSafe,
    });
  }

  return signals;
}

/**
 * Backtests the Market Valuation-Based Tactical Asset Allocation strategy.
 */
export function runValuationTacticalBacktest(
  dates: string[],
  returns: Record<string, number[]>,
  config: ValuationBacktestConfig,
  riskFreeRate: number = 0.02
): ValuationBacktestResult {
  const signals = computeValuationSignals(dates, config);
  const n = signals.length;

  const riskyReturns = returns[config.riskyAsset] || returns['SPY'] || [];
  const safeReturns = returns[config.safeAsset] || returns['BND'] || [];
  const benchReturns = returns['SPY'] || riskyReturns;

  let stratWealth = 10000;
  let benchWealth = 10000;
  let classicWealth = 10000;

  const strategyGrowth: { date: string; value: number }[] = [{ date: dates[0], value: stratWealth }];
  const benchmarkGrowth: { date: string; value: number }[] = [{ date: dates[0], value: benchWealth }];
  const classic6040Growth: { date: string; value: number }[] = [{ date: dates[0], value: classicWealth }];

  const stratMonthlyReturns: number[] = [];
  const benchMonthlyReturns: number[] = [];
  const allocations: { date: string; equity: number; safe: number }[] = [];
  const tradeLog: ValuationBacktestResult['tradeLog'] = [];

  let totalTurnover = 0;
  let deRiskedMonths = 0;

  let currentEquityWeight = signals[0].targetEquityWeight;
  let currentSafeWeight = signals[0].targetSafeWeight;

  allocations.push({ date: dates[0], equity: currentEquityWeight, safe: currentSafeWeight });

  for (let t = 1; t < n; t++) {
    const prevSignal = signals[t - 1]; // Zero look-ahead bias: signal from previous month-end
    const currDate = dates[t];

    const freq = config.rebalanceFrequency || 'monthly';
    const monthIndex = parseInt(currDate.split('-')[1] || '1', 10);
    const shouldRebalance =
      freq === 'monthly' ||
      (freq === 'quarterly' && (monthIndex - 1) % 3 === 0) ||
      (freq === 'annual' && monthIndex === 1);

    if (shouldRebalance) {
      const newEquity = prevSignal.targetEquityWeight;
      const newSafe = prevSignal.targetSafeWeight;
      const dWeight = Math.abs(newEquity - currentEquityWeight);
      if (dWeight > 0.01) {
        totalTurnover += dWeight;
        tradeLog.push({
          date: currDate,
          action: newEquity > currentEquityWeight ? 'Reaccumulate Equities' : 'De-risk to Safe Haven',
          equityWeight: newEquity,
          safeWeight: newSafe,
          metricValue: prevSignal.metricValue,
          regime: prevSignal.regime,
        });
      }
      currentEquityWeight = newEquity;
      currentSafeWeight = newSafe;
    }

    if (currentEquityWeight < 0.95) {
      deRiskedMonths++;
    }

    // Apply returns for month t
    const rRisky = riskyReturns[t] || 0;
    const rSafe = safeReturns[t] || 0;
    const rBench = benchReturns[t] || 0;

    const rStrat = currentEquityWeight * rRisky + currentSafeWeight * rSafe;
    const r6040 = 0.6 * rBench + 0.4 * (returns['BND']?.[t] || 0);

    stratWealth *= 1 + rStrat;
    benchWealth *= 1 + rBench;
    classicWealth *= 1 + r6040;

    stratMonthlyReturns.push(rStrat);
    benchMonthlyReturns.push(rBench);

    strategyGrowth.push({ date: currDate, value: Math.round(stratWealth * 100) / 100 });
    benchmarkGrowth.push({ date: currDate, value: Math.round(benchWealth * 100) / 100 });
    classic6040Growth.push({ date: currDate, value: Math.round(classicWealth * 100) / 100 });

    allocations.push({
      date: currDate,
      equity: Math.round(currentEquityWeight * 1000) / 1000,
      safe: Math.round(currentSafeWeight * 1000) / 1000,
    });
  }

  const durationYears = (n - 1) / 12;
  const stratCAGR = calculateCAGR(10000, stratWealth, durationYears);
  const benchCAGR = calculateCAGR(10000, benchWealth, durationYears);

  const stratVol = calculateAnnualizedVolatility(stratMonthlyReturns, 12);
  const benchVol = calculateAnnualizedVolatility(benchMonthlyReturns, 12);

  const stratMDD = calculateMaxDrawdown(strategyGrowth.map((g) => g.value));
  const benchMDD = calculateMaxDrawdown(benchmarkGrowth.map((g) => g.value));

  const stratSharpe = stratVol > 0 ? (stratCAGR - riskFreeRate) / stratVol : 0;
  const benchSharpe = benchVol > 0 ? (benchCAGR - riskFreeRate) / benchVol : 0;

  const annualTurnover = durationYears > 0 ? totalTurnover / durationYears : 0;
  const percentTimeDeRisked = (n - 1) > 0 ? deRiskedMonths / (n - 1) : 0;

  return {
    strategyGrowth,
    benchmarkGrowth,
    classic6040Growth,
    cagr: stratCAGR,
    volatility: stratVol,
    sharpeRatio: stratSharpe,
    maxDrawdown: stratMDD,
    benchmarkCAGR: benchCAGR,
    benchmarkVol: benchVol,
    benchmarkSharpe: benchSharpe,
    benchmarkMDD: benchMDD,
    annualTurnover,
    percentTimeDeRisked,
    signals,
    allocations,
    tradeLog,
  };
}
