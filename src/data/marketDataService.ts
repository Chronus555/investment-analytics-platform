import { MarketDataProvider, SecurityMetadata } from './types';
import { CURATED_SECURITIES, CURATED_DATES, CURATED_RETURNS } from './curatedData';

export class CuratedMarketDataProvider implements MarketDataProvider {
  name = 'Curated Offline & Live Store';

  async searchSecurities(query: string): Promise<SecurityMetadata[]> {
    const q = query.trim().toUpperCase();
    if (!q) return CURATED_SECURITIES;
    return CURATED_SECURITIES.filter(
      (s) => s.symbol.toUpperCase().includes(q) || s.name.toUpperCase().includes(q)
    );
  }

  async getMetadata(symbol: string): Promise<SecurityMetadata | null> {
    const s = CURATED_SECURITIES.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
    return s || null;
  }

  async getMonthlyReturns(
    symbols: string[],
    startDate?: string,
    endDate?: string
  ): Promise<{
    dates: string[];
    returns: Record<string, number[]>;
    prices: Record<string, number[]>;
    commonStartDate: string;
  }> {
    let startIdx = 0;
    let endIdx = CURATED_DATES.length - 1;

    if (startDate) {
      const idx = CURATED_DATES.findIndex((d) => d >= startDate);
      if (idx !== -1) startIdx = Math.max(startIdx, idx);
    }
    if (endDate) {
      const idx = CURATED_DATES.findLastIndex((d) => d <= endDate);
      if (idx !== -1) endIdx = Math.min(endIdx, idx);
    }

    const slicedDates = CURATED_DATES.slice(startIdx, endIdx + 1);
    const returns: Record<string, number[]> = {};
    const prices: Record<string, number[]> = {};

    symbols.forEach((sym) => {
      const allReturns = CURATED_RETURNS[sym] || CURATED_RETURNS['SPY'] || [];
      const sliced = allReturns.slice(startIdx, endIdx + 1);
      returns[sym] = sliced;

      // Construct price series starting at 100
      const p: number[] = [100];
      for (let i = 0; i < sliced.length; i++) {
        p.push(p[p.length - 1] * (1 + sliced[i]));
      }
      prices[sym] = p.slice(1);
    });

    return {
      dates: slicedDates,
      returns,
      prices,
      commonStartDate: slicedDates[0] || '2007-01-01',
    };
  }
}

export const defaultMarketDataService = new CuratedMarketDataProvider();
