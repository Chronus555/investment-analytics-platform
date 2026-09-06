/**
 * Quantitative Tactical Asset Allocation Engine
 * Moving Average Trend Following, Relative Strength Momentum, Dual Momentum, and Target Volatility.
 */

export interface TacticalSignal {
  date: string;
  selectedAssets: Record<string, number>; // symbol -> weight
  cashWeight: number;
}

export interface TacticalStrategyResult {
  signals: TacticalSignal[];
  strategyReturns: number[];
  dates: string[];
}

/**
 * Calculates Simple Moving Average (SMA) of window W
 */
export function calculateSMA(prices: number[], window: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < window - 1) {
      sma.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - window + 1; j <= i; j++) {
        sum += prices[j];
      }
      sma.push(sum / window);
    }
  }
  return sma;
}

/**
 * Single Asset or Multi-Asset Moving Average Timing Rule (e.g. Price > 10M SMA -> Risk-On, else Cash)
 */
export function runMovingAverageStrategy(
  dates: string[],
  prices: Record<string, number[]>, // symbol -> historical price series
  smaWindow: number = 10,
  cashSymbol: string = 'CASH'
): TacticalSignal[] {
  const symbols = Object.keys(prices);
  const n = dates.length;
  const signals: TacticalSignal[] = [];

  const smas: Record<string, number[]> = {};
  symbols.forEach((sym) => {
    smas[sym] = calculateSMA(prices[sym], smaWindow);
  });

  for (let t = smaWindow; t < n; t++) {
    const selected: Record<string, number> = {};
    let activeRiskCount = 0;

    symbols.forEach((sym) => {
      const price = prices[sym][t];
      const smaVal = smas[sym][t];
      if (!isNaN(smaVal) && price > smaVal) {
        selected[sym] = 1;
        activeRiskCount++;
      }
    });

    if (activeRiskCount > 0) {
      // Equal weight among bullish assets
      symbols.forEach((sym) => {
        if (selected[sym]) {
          selected[sym] = 1 / activeRiskCount;
        }
      });
      signals.push({
        date: dates[t],
        selectedAssets: selected,
        cashWeight: 0,
      });
    } else {
      // 100% Cash / Defensive
      signals.push({
        date: dates[t],
        selectedAssets: { [cashSymbol]: 1.0 },
        cashWeight: 1.0,
      });
    }
  }

  return signals;
}

/**
 * Relative Strength Momentum / Top-K Rotation with Dual Momentum Absolute Filter
 */
export function runDualMomentumStrategy(
  dates: string[],
  prices: Record<string, number[]>,
  lookbackMonths: number = 12,
  topN: number = 1,
  safeSymbol: string = 'BND'
): TacticalSignal[] {
  const symbols = Object.keys(prices).filter((s) => s !== safeSymbol && s !== 'CASH');
  const n = dates.length;
  const signals: TacticalSignal[] = [];

  for (let t = lookbackMonths; t < n; t++) {
    // Calculate lookback return for each candidate
    const candidates: { symbol: string; return: number }[] = [];

    symbols.forEach((sym) => {
      const pCurrent = prices[sym][t];
      const pOld = prices[sym][t - lookbackMonths];
      const ret = pOld > 0 ? (pCurrent - pOld) / pOld : -1;
      candidates.push({ symbol: sym, return: ret });
    });

    // Rank descending by return (Relative Momentum)
    candidates.sort((a, b) => b.return - a.return);

    // Top K candidates
    const chosen = candidates.slice(0, topN);
    const selected: Record<string, number> = {};
    let activeCount = 0;

    chosen.forEach((c) => {
      // Absolute Momentum filter: must be > 0 (or > safe asset return)
      if (c.return > 0) {
        selected[c.symbol] = 1 / topN;
        activeCount++;
      }
    });

    if (activeCount > 0) {
      // If some assets qualified, normalize
      const totalWeight = Object.values(selected).reduce((a, b) => a + b, 0);
      Object.keys(selected).forEach((k) => (selected[k] /= totalWeight));

      signals.push({
        date: dates[t],
        selectedAssets: selected,
        cashWeight: 0,
      });
    } else {
      // Absolute momentum failed -> safe asset
      signals.push({
        date: dates[t],
        selectedAssets: { [safeSymbol]: 1.0 },
        cashWeight: 1.0,
      });
    }
  }

  return signals;
}

/**
 * Target Volatility Strategy
 * Dynamically scales risky asset exposure: w = min(targetVol / realizedVol, maxLeverage)
 */
export function calculateTargetVolatilityWeights(
  realizedVolatilities: number[],
  targetVol: number = 0.12,
  maxLeverage: number = 1.0
): number[] {
  return realizedVolatilities.map((vol) => {
    if (vol <= 0) return maxLeverage;
    const rawWeight = targetVol / vol;
    return Math.min(maxLeverage, Math.max(0, rawWeight));
  });
}

/**
 * Runs dynamic Target Volatility scaling over time
 */
export function runTargetVolatilityStrategy(
  dates: string[],
  prices: Record<string, number[]>,
  riskySymbols: string[] = ['SPY'],
  targetVol: number = 0.12,
  lookbackMonths: number = 12,
  cashSymbol: string = 'BIL',
  maxLeverage: number = 1.0
): TacticalSignal[] {
  const n = dates.length;
  const signals: TacticalSignal[] = [];

  for (let t = lookbackMonths; t < n; t++) {
    // Calculate returns of the risky basket over the lookback window
    const monthlyBasketReturns: number[] = [];
    for (let i = t - lookbackMonths + 1; i <= t; i++) {
      let monthRet = 0;
      riskySymbols.forEach((sym) => {
        const pCurrent = prices[sym][i];
        const pPrev = prices[sym][i - 1];
        const r = pPrev > 0 ? (pCurrent - pPrev) / pPrev : 0;
        monthRet += r / riskySymbols.length;
      });
      monthlyBasketReturns.push(monthRet);
    }

    // Sample variance and annualized volatility
    const mean = monthlyBasketReturns.reduce((a, b) => a + b, 0) / monthlyBasketReturns.length;
    const variance =
      monthlyBasketReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      Math.max(1, monthlyBasketReturns.length - 1);
    const realizedVol = Math.sqrt(variance * 12);

    // Dynamic weight
    const riskyWeight = realizedVol > 0 ? Math.min(maxLeverage, Math.max(0.1, targetVol / realizedVol)) : maxLeverage;
    const cashWeight = Math.max(0, 1.0 - riskyWeight);

    const selected: Record<string, number> = {};
    riskySymbols.forEach((sym) => {
      selected[sym] = riskyWeight / riskySymbols.length;
    });
    if (cashWeight > 0.001) {
      selected[cashSymbol] = cashWeight;
    }

    signals.push({
      date: dates[t],
      selectedAssets: selected,
      cashWeight,
    });
  }

  return signals;
}

/**
 * Pure Relative Strength Momentum Rotation (Top-K assets without cash hurdle filter)
 */
export function runRelativeMomentumStrategy(
  dates: string[],
  prices: Record<string, number[]>,
  candidateSymbols: string[],
  lookbackMonths: number = 6,
  topN: number = 2
): TacticalSignal[] {
  const n = dates.length;
  const signals: TacticalSignal[] = [];
  const k = Math.max(1, Math.min(topN, candidateSymbols.length));

  for (let t = lookbackMonths; t < n; t++) {
    const scored: { symbol: string; return: number }[] = [];

    candidateSymbols.forEach((sym) => {
      const pCurrent = prices[sym][t];
      const pOld = prices[sym][t - lookbackMonths];
      const ret = pOld > 0 ? (pCurrent - pOld) / pOld : -1;
      scored.push({ symbol: sym, return: ret });
    });

    scored.sort((a, b) => b.return - a.return);
    const topHoldings = scored.slice(0, k);

    const selected: Record<string, number> = {};
    topHoldings.forEach((h) => {
      selected[h.symbol] = 1 / k;
    });

    signals.push({
      date: dates[t],
      selectedAssets: selected,
      cashWeight: 0,
    });
  }

  return signals;
}
