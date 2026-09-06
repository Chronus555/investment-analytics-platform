export interface SecurityMetadata {
  symbol: string;
  name: string;
  assetClass: 'US Equity' | 'International Equity' | 'Fixed Income' | 'Commodities' | 'Real Estate' | 'Cash Equivalent' | 'Leveraged ETF';
  expenseRatio: number; // Decimal (e.g. 0.0003 for 0.03%)
  inceptionDate: string;
  isLeveraged?: boolean;
  leverageFactor?: number;
}

export interface HistoricalPricePoint {
  date: string; // YYYY-MM-DD
  close: number;
  adjClose: number;
  return?: number; // Monthly decimal return
}

export interface SecurityQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

export interface MarketDataProvider {
  name: string;
  searchSecurities(query: string): Promise<SecurityMetadata[]>;
  getMetadata(symbol: string): Promise<SecurityMetadata | null>;
  getMonthlyReturns(symbols: string[], startDate?: string, endDate?: string): Promise<{
    dates: string[];
    returns: Record<string, number[]>; // symbol -> array of returns
    prices: Record<string, number[]>;
    commonStartDate: string;
  }>;
}
