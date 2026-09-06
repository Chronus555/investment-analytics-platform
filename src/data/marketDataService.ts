import { MarketDataProvider, SecurityMetadata } from './types';
import { CURATED_SECURITIES, CURATED_DATES, CURATED_RETURNS } from './curatedData';

export class CuratedMarketDataProvider implements MarketDataProvider {
  name = 'Curated Offline & Live Store';
  private dynamicCache: Record<string, { dates: string[]; returns: number[]; prices: number[] }> = {};

  async searchSecurities(query: string): Promise<SecurityMetadata[]> {
    const q = query.trim().toUpperCase();
    if (!q) return CURATED_SECURITIES;
    const matches = CURATED_SECURITIES.filter(
      (s) => s.symbol.toUpperCase().includes(q) || s.name.toUpperCase().includes(q)
    );

    // If no direct matches in curated, offer as custom live ticker
    if (matches.length === 0 && q.length >= 1 && q.length <= 6) {
      return [
        {
          symbol: q,
          name: `${q} (Live Market Ticker)`,
          assetClass: 'US Equity',
          expenseRatio: 0.0,
          inceptionDate: '2007-01-01',
        },
      ];
    }
    return matches;
  }

  async getMetadata(symbol: string): Promise<SecurityMetadata | null> {
    const s = CURATED_SECURITIES.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
    if (s) return s;
    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} (Live Market Ticker)`,
      assetClass: 'US Equity',
      expenseRatio: 0.0,
      inceptionDate: '2007-01-01',
    };
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

    for (const sym of symbols) {
      const upperSym = sym.toUpperCase();
      let symReturns = CURATED_RETURNS[upperSym];

      // Check dynamic client-side cache
      if (!symReturns && this.dynamicCache[upperSym]) {
        symReturns = this.dynamicCache[upperSym].returns;
      }

      // If still missing and running in browser, try client fetch to /api/market-data
      if (!symReturns && typeof window !== 'undefined') {
        try {
          const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(upperSym)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.returns) && data.returns.length > 0) {
              this.dynamicCache[upperSym] = {
                dates: data.dates,
                returns: data.returns,
                prices: data.prices,
              };
              symReturns = data.returns;
            }
          }
        } catch {
          // Ignore network errors, will fallback
        }
      }

      // Ultimate fallback: SPY return series
      const rawReturns = symReturns || CURATED_RETURNS['SPY'] || [];
      const sliced = rawReturns.slice(startIdx, endIdx + 1);
      returns[sym] = sliced;

      // Construct price series starting at 100
      const p: number[] = [100];
      for (let i = 0; i < sliced.length; i++) {
        p.push(p[p.length - 1] * (1 + sliced[i]));
      }
      prices[sym] = p.slice(1);
    }

    return {
      dates: slicedDates,
      returns,
      prices,
      commonStartDate: slicedDates[0] || '2007-01-01',
    };
  }
}

export const defaultMarketDataService = new CuratedMarketDataProvider();