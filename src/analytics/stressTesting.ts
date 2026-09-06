export interface StressRegime {
  id: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM
  endDate: string;   // YYYY-MM
  category: 'Equities Crash' | 'Rate Shock' | 'Credit Crisis' | 'Geopolitical / Pandemic';
}

export const HISTORICAL_STRESS_REGIMES: StressRegime[] = [
  {
    id: 'gfc_2008',
    name: '2008 Global Financial Crisis',
    description: 'Subprime mortgage collapse, Lehman Brothers bankruptcy, and global credit freeze.',
    startDate: '2007-10',
    endDate: '2009-03',
    category: 'Credit Crisis',
  },
  {
    id: 'euro_2011',
    name: '2011 US Debt Downgrade & Euro Crisis',
    description: 'S&P downgrades US sovereign debt; European sovereign debt crisis escalates.',
    startDate: '2011-05',
    endDate: '2011-10',
    category: 'Credit Crisis',
  },
  {
    id: 'em_oil_2015',
    name: '2015–2016 Oil & Emerging Market Crash',
    description: 'Collapse in crude oil prices, Chinese yuan devaluation, and commodity rout.',
    startDate: '2015-05',
    endDate: '2016-02',
    category: 'Equities Crash',
  },
  {
    id: 'q4_2018',
    name: '2018 Q4 Rate Hike Sell-Off',
    description: 'Federal Reserve rate hikes and trade tensions lead to sharp equity retreat.',
    startDate: '2018-10',
    endDate: '2018-12',
    category: 'Rate Shock',
  },
  {
    id: 'covid_2020',
    name: '2020 COVID-19 Flash Crash',
    description: 'Rapid global pandemic shutdowns, liquidity shock, and extreme equity volatility.',
    startDate: '2020-02',
    endDate: '2020-04',
    category: 'Geopolitical / Pandemic',
  },
  {
    id: 'inflation_2022',
    name: '2022 Fed Rate Shock & Inflation',
    description: 'Fastest Fed rate hike cycle in 40 years; stocks and bonds suffer concurrent double-digit losses.',
    startDate: '2022-01',
    endDate: '2022-12',
    category: 'Rate Shock',
  },
];

export interface StressPeriodResult {
  regime: StressRegime;
  cumulativeReturn: number;
  maxDrawdown: number;
  annualizedVol: number;
  worstMonth: number;
  monthsInCrisis: number;
  monthsToRecover: number | null; // null if not yet recovered
  isRecovered: boolean;
}

/**
 * Analyzes a monthly return series during a specific macroeconomic crisis regime.
 */
export function evaluateStressRegime(
  dates: string[],
  returns: number[],
  regime: StressRegime
): StressPeriodResult | null {
  if (dates.length !== returns.length || dates.length === 0) return null;

  // Format dates as YYYY-MM
  const yyyyMm = dates.map((d) => d.slice(0, 7));

  // Find start and end indices
  const startIdx = yyyyMm.findIndex((d) => d >= regime.startDate);
  if (startIdx === -1) return null;

  let endIdx = yyyyMm.findLastIndex((d) => d <= regime.endDate);
  if (endIdx === -1 || endIdx < startIdx) {
    endIdx = dates.length - 1;
  }

  const crisisReturns = returns.slice(startIdx, endIdx + 1);
  if (crisisReturns.length === 0) return null;

  // 1. Cumulative Return during crisis
  let wealth = 1.0;
  let peak = 1.0;
  let maxDD = 0.0;
  let worstM = 0.0;
  let sumSqDev = 0;
  const meanRet = crisisReturns.reduce((a, b) => a + b, 0) / crisisReturns.length;

  for (let i = 0; i < crisisReturns.length; i++) {
    const r = crisisReturns[i];
    wealth *= (1 + r);
    if (wealth > peak) peak = wealth;
    const dd = (wealth - peak) / peak;
    if (dd < maxDD) maxDD = dd;
    if (r < worstM) worstM = r;
    sumSqDev += Math.pow(r - meanRet, 2);
  }

  const cumulativeReturn = wealth - 1.0;
  const variance = crisisReturns.length > 1 ? sumSqDev / (crisisReturns.length - 1) : 0;
  const annualizedVol = Math.sqrt(variance) * Math.sqrt(12);

  // 2. Recovery tracking: From startIdx, trace when wealth recovers to 1.0
  let recoveryWealth = 1.0;
  let monthsToRecover: number | null = null;
  let isRecovered = false;

  for (let i = startIdx; i < returns.length; i++) {
    recoveryWealth *= (1 + returns[i]);
    if (recoveryWealth >= 1.0 && i >= endIdx) {
      monthsToRecover = i - startIdx + 1;
      isRecovered = true;
      break;
    }
  }

  return {
    regime,
    cumulativeReturn,
    maxDrawdown: maxDD,
    annualizedVol,
    worstMonth: worstM,
    monthsInCrisis: crisisReturns.length,
    monthsToRecover,
    isRecovered,
  };
}

/**
 * Runs stress evaluation across all historical regimes.
 */
export function evaluateAllStressRegimes(
  dates: string[],
  returns: number[]
): StressPeriodResult[] {
  const results: StressPeriodResult[] = [];
  for (const regime of HISTORICAL_STRESS_REGIMES) {
    const res = evaluateStressRegime(dates, returns, regime);
    if (res) results.push(res);
  }
  return results;
}