import { NextRequest, NextResponse } from 'next/server';
import { CURATED_RETURNS, CURATED_DATES, CURATED_SECURITIES } from '@/data/curatedData';

interface CacheEntry {
  timestamp: number;
  data: {
    symbol: string;
    dates: string[];
    returns: number[];
    prices: number[];
    source: string;
  };
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchFromStooq(symbol: string): Promise<{ dates: string[]; prices: number[]; returns: number[] } | null> {
  try {
    const formattedSymbol = symbol.toLowerCase().includes('.') ? symbol.toLowerCase() : `${symbol.toLowerCase()}.us`;
    const url = `https://stooq.com/q/d/l/?s=${formattedSymbol}&i=m`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 5) return null; // Header + at least a few months

    // Stooq format: Date,Open,High,Low,Close,Volume
    const points: { date: string; close: number }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 5) {
        const date = parts[0].trim();
        const close = parseFloat(parts[4]);
        if (!isNaN(close) && close > 0 && date.length === 10) {
          points.push({ date, close });
        }
      }
    }

    if (points.length < 2) return null;

    // Stooq lines are usually chronological or reverse, sort ascending
    points.sort((a, b) => (a.date < b.date ? -1 : 1));

    const dates: string[] = [];
    const prices: number[] = [];
    const returns: number[] = [];

    // Base price at 100
    let currentPrice = 100;
    prices.push(currentPrice);
    dates.push(points[0].date);
    returns.push(0);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1].close;
      const curr = points[i].close;
      const ret = (curr - prev) / prev;
      currentPrice *= (1 + ret);

      dates.push(points[i].date);
      prices.push(Math.round(currentPrice * 100) / 100);
      returns.push(Math.round(ret * 10000) / 10000);
    }

    return { dates, prices, returns };
  } catch {
    return null;
  }
}

async function fetchFromYahoo(symbol: string): Promise<{ dates: string[]; prices: number[]; returns: number[] } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=20y&interval=1mo`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp as number[] | undefined;
    const quote = result.indicators?.quote?.[0];
    const adjclose = result.indicators?.adjclose?.[0]?.adjclose as (number | null)[] | undefined;
    const closes = (adjclose || quote?.close) as (number | null)[] | undefined;

    if (!timestamps || !closes || timestamps.length < 2) return null;

    const validPoints: { date: string; close: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c !== null && c !== undefined && !isNaN(c) && c > 0) {
        const d = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        validPoints.push({ date: d, close: c });
      }
    }

    if (validPoints.length < 2) return null;

    const dates: string[] = [];
    const prices: number[] = [];
    const returns: number[] = [];

    let currentPrice = 100;
    prices.push(currentPrice);
    dates.push(validPoints[0].date);
    returns.push(0);

    for (let i = 1; i < validPoints.length; i++) {
      const prev = validPoints[i - 1].close;
      const curr = validPoints[i].close;
      const ret = (curr - prev) / prev;
      currentPrice *= (1 + ret);

      dates.push(validPoints[i].date);
      prices.push(Math.round(currentPrice * 100) / 100);
      returns.push(Math.round(ret * 10000) / 10000);
    }

    return { dates, prices, returns };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawSymbol = searchParams.get('symbol');

  if (!rawSymbol) {
    return NextResponse.json({ error: 'Missing symbol query parameter' }, { status: 400 });
  }

  const symbol = rawSymbol.trim().toUpperCase();

  // 1. Check in-memory cache
  const cached = memoryCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 2. Check offline curated store
  if (CURATED_RETURNS[symbol]) {
    const rawRets = CURATED_RETURNS[symbol];
    const prices: number[] = [100];
    for (let i = 0; i < rawRets.length; i++) {
      prices.push(prices[prices.length - 1] * (1 + rawRets[i]));
    }
    const meta = CURATED_SECURITIES.find((s) => s.symbol === symbol);

    const payload = {
      symbol,
      name: meta?.name || symbol,
      dates: CURATED_DATES,
      returns: rawRets,
      prices: prices.slice(1),
      source: 'curated-offline',
    };
    memoryCache.set(symbol, { timestamp: Date.now(), data: payload });
    return NextResponse.json(payload);
  }

  // 3. Fallback to Stooq
  const stooqData = await fetchFromStooq(symbol);
  if (stooqData) {
    const payload = {
      symbol,
      name: `${symbol} (Stooq Live)`,
      dates: stooqData.dates,
      returns: stooqData.returns,
      prices: stooqData.prices,
      source: 'stooq-live',
    };
    memoryCache.set(symbol, { timestamp: Date.now(), data: payload });
    return NextResponse.json(payload);
  }

  // 4. Fallback to Yahoo Finance
  const yahooData = await fetchFromYahoo(symbol);
  if (yahooData) {
    const payload = {
      symbol,
      name: `${symbol} (Yahoo Live)`,
      dates: yahooData.dates,
      returns: yahooData.returns,
      prices: yahooData.prices,
      source: 'yahoo-live',
    };
    memoryCache.set(symbol, { timestamp: Date.now(), data: payload });
    return NextResponse.json(payload);
  }

  // 5. If all live sources fail, fallback to SPY benchmark with notice
  const fallbackRets = CURATED_RETURNS['SPY'];
  const prices: number[] = [100];
  for (let i = 0; i < fallbackRets.length; i++) {
    prices.push(prices[prices.length - 1] * (1 + fallbackRets[i]));
  }
  const payload = {
    symbol,
    name: `${symbol} (Synthetic Benchmark Proxy)`,
    dates: CURATED_DATES,
    returns: fallbackRets,
    prices: prices.slice(1),
    source: 'synthetic-fallback',
  };
  return NextResponse.json(payload);
}