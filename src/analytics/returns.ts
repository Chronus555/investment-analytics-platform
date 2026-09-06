/**
 * Quantitative Return Calculations
 * Pure mathematical functions for simple, log, cumulative, and annualized returns.
 */

export interface ReturnSeriesPoint {
  date: string;
  return: number; // Decimal (e.g., 0.05 for 5%)
}

export interface WealthPoint {
  date: string;
  value: number;
}

/**
 * Calculates simple returns from a price series: R_t = (P_t - P_{t-1}) / P_{t-1}
 */
export function calculateSimpleReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    if (prev <= 0) throw new Error(`Invalid price at index ${i - 1}: ${prev}`);
    returns.push((prices[i] - prev) / prev);
  }
  return returns;
}

/**
 * Calculates log returns from prices: r_t = ln(P_t / P_{t-1})
 */
export function calculateLogReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    if (prev <= 0 || prices[i] <= 0) throw new Error('Prices must be strictly positive for log returns.');
    returns.push(Math.log(prices[i] / prev));
  }
  return returns;
}

/**
 * Total Cumulative Return: (V_end - V_start) / V_start
 */
export function calculateTotalReturn(startValue: number, endValue: number): number {
  if (startValue <= 0) throw new Error('Start value must be positive');
  return (endValue - startValue) / startValue;
}

/**
 * Compound Annual Growth Rate (CAGR)
 * @param startValue Initial capital
 * @param endValue Final portfolio capital
 * @param years Total duration in years (e.g. 5.5)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0) throw new Error('Start value must be positive');
  if (years <= 0) throw new Error('Duration in years must be strictly positive');
  if (endValue <= 0) return -1.0; // Total loss
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Compound Annual Growth Rate directly from a return series with specified annual frequency
 * @param returns Array of periodic returns as decimals
 * @param frequency Observations per year (12 for monthly, 252 for daily, 4 for quarterly)
 */
export function calculateCAGRFromReturns(returns: number[], frequency: number = 12): number {
  if (returns.length === 0) return 0;
  let compFactor = 1.0;
  for (const r of returns) {
    compFactor *= (1 + r);
    if (compFactor <= 0) return -1.0; // Portfolio bankrupt
  }
  const years = returns.length / frequency;
  if (years <= 0) return 0;
  return Math.pow(compFactor, 1 / years) - 1;
}

/**
 * Cumulative Wealth Index from returns: W_t = W_0 * product(1 + R_i)
 */
export function calculateWealthIndex(
  returns: ReturnSeriesPoint[],
  initialBalance: number = 10000
): WealthPoint[] {
  if (returns.length === 0) return [];
  const wealth: WealthPoint[] = [];
  let current = initialBalance;
  
  // First point before returns
  wealth.push({ date: returns[0].date, value: current });

  for (const pt of returns) {
    current = current * (1 + pt.return);
    wealth.push({ date: pt.date, value: Math.max(0, current) });
  }
  return wealth;
}

/**
 * Calculates rolling annualized returns over a sliding window
 * @param returns Array of periodic decimal returns
 * @param windowPeriods Number of periods in window (e.g., 36 for 3-year monthly)
 * @param frequency Periods per year (12 for monthly, 252 for daily)
 */
export function calculateRollingReturns(
  returns: number[],
  windowPeriods: number,
  frequency: number = 12
): number[] {
  if (returns.length < windowPeriods || windowPeriods <= 0) return [];
  const rolling: number[] = [];
  const years = windowPeriods / frequency;

  for (let i = windowPeriods - 1; i < returns.length; i++) {
    let comp = 1.0;
    for (let j = i - windowPeriods + 1; j <= i; j++) {
      comp *= (1 + returns[j]);
    }
    const annualized = Math.pow(Math.max(0.00001, comp), 1 / years) - 1;
    rolling.push(annualized);
  }
  return rolling;
}

/**
 * Fisher equation real return adjustment: (1 + R_nominal) / (1 + Inflation) - 1
 */
export function calculateRealReturn(nominalReturn: number, inflationRate: number): number {
  return (1 + nominalReturn) / (1 + inflationRate) - 1;
}
