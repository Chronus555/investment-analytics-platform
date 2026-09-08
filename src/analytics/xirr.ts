/**
 * Exact Numerical Newton-Raphson XIRR Solver with Bisection Fallback
 * Calculates Money-Weighted Return (MWR) for irregular dated cash flows
 * and compares against Time-Weighted Return (TWR) to quantify Cash Flow Timing Alpha.
 */

export interface CashFlowEntry {
  date: string;
  amount: number; // Negative for deposits/investments, positive for withdrawals/distributions/terminal balance
  description?: string;
}

export interface XirrResult {
  xirr: number; // Annualized rate of return in decimal (e.g. 0.084 for 8.4%)
  converged: boolean;
  iterations: number;
  error: number;
}

export interface CashFlowTimingAnalysis {
  timeWeightedReturn: number;
  moneyWeightedReturn: number;
  timingAlpha: number;
  timingAlphaBps: number;
  timingEffect: 'favorable' | 'unfavorable' | 'neutral';
  interpretation: string;
  totalContributed: number;
  totalWithdrawn: number;
  netCashFlow: number;
  endingValue: number;
}

/**
 * Parses a date string (YYYY-MM-DD or YYYY-MM) to a Date object timestamp in milliseconds.
 */
function parseDateToMs(dateStr: string): number {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1] || '1', 10) - 1;
  const day = parseInt(parts[2] || '1', 10);
  return Date.UTC(year, month, day);
}

/**
 * Exact Numerical Newton-Raphson XIRR solver.
 */
export function calculateXIRR(
  cashFlows: CashFlowEntry[],
  guess = 0.1,
  maxIter = 100,
  tol = 1e-7
): XirrResult {
  if (!cashFlows || cashFlows.length < 2) {
    return { xirr: 0, converged: false, iterations: 0, error: 0 };
  }

  // Ensure at least one positive and one negative cash flow
  let hasPos = false;
  let hasNeg = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPos = true;
    if (cf.amount < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) {
    return { xirr: 0, converged: false, iterations: 0, error: 0 };
  }

  // Sort chronologically
  const sorted = [...cashFlows].sort(
    (a, b) => parseDateToMs(a.date) - parseDateToMs(b.date)
  );

  const d0 = parseDateToMs(sorted[0].date);
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  // Precalculate time offsets in years: t_i = (d_i - d_0) / 365.25
  const cfs = sorted.map((cf) => ({
    amount: cf.amount,
    t: (parseDateToMs(cf.date) - d0) / MS_PER_YEAR,
  }));

  // Objective function f(r) and its derivative f'(r)
  const f = (r: number): number => {
    let sum = 0;
    for (let i = 0; i < cfs.length; i++) {
      sum += cfs[i].amount / Math.pow(1 + r, cfs[i].t);
    }
    return sum;
  };

  const fPrime = (r: number): number => {
    let sum = 0;
    for (let i = 0; i < cfs.length; i++) {
      if (cfs[i].t !== 0) {
        sum -= (cfs[i].amount * cfs[i].t) / Math.pow(1 + r, cfs[i].t + 1);
      }
    }
    return sum;
  };

  // Newton-Raphson iteration
  let r = guess;
  let iter = 0;
  while (iter < maxIter) {
    iter++;
    const y = f(r);
    const dy = fPrime(r);

    if (Math.abs(y) < tol) {
      return { xirr: r, converged: true, iterations: iter, error: Math.abs(y) };
    }

    if (Math.abs(dy) < 1e-12) {
      break; // Slope too flat, jump to bisection
    }

    const nextR = r - y / dy;

    // Prevent stepping into non-physical regime r <= -1
    if (nextR <= -0.9999) {
      r = (r - 0.9999) / 2;
    } else {
      if (Math.abs(nextR - r) < tol) {
        return { xirr: nextR, converged: true, iterations: iter, error: Math.abs(f(nextR)) };
      }
      r = nextR;
    }
  }

  // Bisection fallback on [-0.99, 5.0]
  let a = -0.99;
  let b = 5.0;
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    // Expand search if signs match
    b = 20.0;
    fb = f(b);
  }

  if (fa * fb <= 0) {
    let bIter = 0;
    while (bIter < 100) {
      bIter++;
      const mid = (a + b) / 2;
      const fmid = f(mid);

      if (Math.abs(fmid) < tol || (b - a) / 2 < tol) {
        return { xirr: mid, converged: true, iterations: iter + bIter, error: Math.abs(fmid) };
      }

      if (fa * fmid <= 0) {
        b = mid;
        fb = fmid;
      } else {
        a = mid;
        fa = fmid;
      }
    }
    return { xirr: (a + b) / 2, converged: true, iterations: iter + 100, error: Math.abs(f((a + b) / 2)) };
  }

  return { xirr: r, converged: false, iterations: iter, error: Math.abs(f(r)) };
}

/**
 * Analyzes Cash Flow Timing Alpha (Money-Weighted Return vs Time-Weighted Return).
 */
export function analyzeCashFlowTiming(
  initialDeposit: number,
  intermediateFlows: CashFlowEntry[],
  terminalBalance: number,
  terminalDate: string,
  twrCAGR: number
): CashFlowTimingAnalysis {
  const firstDate = intermediateFlows[0]?.date || '2007-01-01';

  const allFlows: CashFlowEntry[] = [
    { date: firstDate, amount: -Math.abs(initialDeposit), description: 'Initial Capital' },
    ...intermediateFlows,
    { date: terminalDate, amount: Math.abs(terminalBalance), description: 'Terminal Valuation' },
  ];

  const xirrRes = calculateXIRR(allFlows);
  const mwr = xirrRes.converged ? xirrRes.xirr : twrCAGR;
  const timingAlpha = mwr - twrCAGR;
  const timingAlphaBps = timingAlpha * 10000;

  let totalContributed = Math.abs(initialDeposit);
  let totalWithdrawn = 0;

  intermediateFlows.forEach((cf) => {
    if (cf.amount < 0) {
      totalContributed += Math.abs(cf.amount);
    } else {
      totalWithdrawn += cf.amount;
    }
  });

  const netCashFlow = totalContributed - totalWithdrawn;

  let timingEffect: 'favorable' | 'unfavorable' | 'neutral' = 'neutral';
  if (timingAlphaBps > 15) timingEffect = 'favorable';
  else if (timingAlphaBps < -15) timingEffect = 'unfavorable';

  let interpretation = '';
  if (timingEffect === 'favorable') {
    interpretation =
      'Favorable cash flow timing (Contrarian Alpha): Capital additions were concentrated during lower market valuations / drawdowns, allowing dollar-weighted growth to outpace buy-and-hold TWR by ' +
      timingAlphaBps.toFixed(0) +
      ' bps.';
  } else if (timingEffect === 'unfavorable') {
    interpretation =
      'Unfavorable cash flow timing (Performance Chasing Drag): Capital additions occurred near market peaks or withdrawals occurred near troughs, resulting in a -' +
      Math.abs(timingAlphaBps).toFixed(0) +
      ' bps drag relative to buy-and-hold TWR.';
  } else {
    interpretation =
      'Neutral timing effect: Cash flows had virtually zero divergence from time-weighted market compounding (' +
      timingAlphaBps.toFixed(0) +
      ' bps gap).';
  }

  return {
    timeWeightedReturn: twrCAGR,
    moneyWeightedReturn: mwr,
    timingAlpha,
    timingAlphaBps,
    timingEffect,
    interpretation,
    totalContributed,
    totalWithdrawn,
    netCashFlow,
    endingValue: terminalBalance,
  };
}
