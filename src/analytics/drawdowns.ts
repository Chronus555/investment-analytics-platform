/**
 * Quantitative Drawdown Analytics
 * High-water marks, underwater series, maximum drawdown, duration tracking, and Ulcer index.
 */

export interface DrawdownPoint {
  date: string;
  drawdown: number; // Decimal (e.g. -0.15 for -15%)
  highWaterMark: number;
}

export interface DrawdownEpisode {
  peakDate: string;
  peakValue: number;
  troughDate: string;
  troughValue: number;
  depth: number; // e.g. -0.25 for -25%
  recoveryDate?: string;
  durationMonths: number;
  recoveryMonths?: number;
  isRecovered: boolean;
}

/**
 * Calculates underwater drawdown series from an array of portfolio values
 */
export function calculateDrawdownSeries(
  dates: string[],
  values: number[]
): DrawdownPoint[] {
  if (values.length === 0) return [];
  const points: DrawdownPoint[] = [];
  let hwm = values[0];

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val > hwm) {
      hwm = val;
    }
    const dd = hwm > 0 ? (val - hwm) / hwm : 0;
    points.push({
      date: dates[i] || 'T' + i,
      drawdown: dd,
      highWaterMark: hwm,
    });
  }
  return points;
}

/**
 * Calculates Maximum Drawdown (as a negative decimal, e.g. -0.509)
 */
export function calculateMaxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;
  let maxDD = 0;
  let hwm = values[0];

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val > hwm) {
      hwm = val;
    } else {
      const dd = (val - hwm) / hwm;
      if (dd < maxDD) {
        maxDD = dd;
      }
    }
  }
  return maxDD;
}

/**
 * Calculates Ulcer Index: sqrt( 1/N * sum(DD_i^2) ) * 100
 */
export function calculateUlcerIndex(drawdowns: number[]): number {
  if (drawdowns.length === 0) return 0;
  let sumSq = 0;
  for (const dd of drawdowns) {
    // Percentage drawdown squared
    const pct = Math.abs(dd) * 100;
    sumSq += Math.pow(pct, 2);
  }
  return Math.sqrt(sumSq / drawdowns.length);
}

/**
 * Detects all distinct historical drawdown episodes and ranks them by severity
 */
export function findDrawdownEpisodes(
  dates: string[],
  values: number[],
  topN: number = 10
): DrawdownEpisode[] {
  if (values.length < 2) return [];

  const episodes: DrawdownEpisode[] = [];
  let inDrawdown = false;
  let peakIdx = 0;
  let troughIdx = 0;
  let troughVal = values[0];

  for (let i = 1; i < values.length; i++) {
    const val = values[i];
    const peakVal = values[peakIdx];

    if (val < peakVal) {
      if (!inDrawdown) {
        inDrawdown = true;
        troughIdx = i;
        troughVal = val;
      } else if (val < troughVal) {
        troughIdx = i;
        troughVal = val;
      }
    } else {
      // Reached new high -> previous episode is recovered
      if (inDrawdown) {
        episodes.push({
          peakDate: dates[peakIdx],
          peakValue: peakVal,
          troughDate: dates[troughIdx],
          troughValue: troughVal,
          depth: (troughVal - peakVal) / peakVal,
          recoveryDate: dates[i],
          durationMonths: Math.max(1, troughIdx - peakIdx),
          recoveryMonths: Math.max(1, i - troughIdx),
          isRecovered: true,
        });
        inDrawdown = false;
      }
      peakIdx = i;
    }
  }

  // If currently still in an active unrecovered drawdown
  if (inDrawdown) {
    const peakVal = values[peakIdx];
    episodes.push({
      peakDate: dates[peakIdx],
      peakValue: peakVal,
      troughDate: dates[troughIdx],
      troughValue: troughVal,
      depth: (troughVal - peakVal) / peakVal,
      durationMonths: Math.max(1, troughIdx - peakIdx),
      isRecovered: false,
    });
  }

  // Sort episodes by depth ascending (most negative first)
  episodes.sort((a, b) => a.depth - b.depth);
  return episodes.slice(0, topN);
}
