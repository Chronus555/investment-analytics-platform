'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, ArrowUpDown, ArrowRight, ExternalLink, PlusCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface FundRecord {
  symbol: string;
  name: string;
  category: 'US Equity' | 'International' | 'Fixed Income' | 'Commodity & Real Estate' | 'Leveraged';
  expenseRatio: number; // e.g. 0.09 for 0.09%
  aumBillion: number;
  oneYearReturn: number;
  threeYearReturn: number;
  fiveYearReturn: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  inceptionYear: number;
}

const FUND_UNIVERSE: FundRecord[] = [
  // US Equity
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'US Equity', expenseRatio: 0.09, aumBillion: 540, oneYearReturn: 0.245, threeYearReturn: 0.118, fiveYearReturn: 0.142, volatility: 0.148, sharpe: 0.52, maxDrawdown: -0.508, inceptionYear: 1993 },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'US Equity', expenseRatio: 0.03, aumBillion: 480, oneYearReturn: 0.246, threeYearReturn: 0.119, fiveYearReturn: 0.143, volatility: 0.147, sharpe: 0.53, maxDrawdown: -0.239, inceptionYear: 2010 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', category: 'US Equity', expenseRatio: 0.20, aumBillion: 270, oneYearReturn: 0.312, threeYearReturn: 0.134, fiveYearReturn: 0.198, volatility: 0.192, sharpe: 0.49, maxDrawdown: -0.811, inceptionYear: 1999 },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'US Equity', expenseRatio: 0.03, aumBillion: 390, oneYearReturn: 0.238, threeYearReturn: 0.112, fiveYearReturn: 0.136, volatility: 0.152, sharpe: 0.47, maxDrawdown: -0.508, inceptionYear: 2001 },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'US Equity', expenseRatio: 0.19, aumBillion: 68, oneYearReturn: 0.162, threeYearReturn: 0.048, fiveYearReturn: 0.084, volatility: 0.215, sharpe: 0.21, maxDrawdown: -0.589, inceptionYear: 2000 },
  { symbol: 'AVUV', name: 'Avantis US Small Cap Value ETF', category: 'US Equity', expenseRatio: 0.25, aumBillion: 12, oneYearReturn: 0.194, threeYearReturn: 0.098, fiveYearReturn: 0.162, volatility: 0.228, sharpe: 0.54, maxDrawdown: -0.428, inceptionYear: 2019 },
  { symbol: 'VUG', name: 'Vanguard Growth ETF', category: 'US Equity', expenseRatio: 0.04, aumBillion: 125, oneYearReturn: 0.298, threeYearReturn: 0.125, fiveYearReturn: 0.178, volatility: 0.185, sharpe: 0.46, maxDrawdown: -0.501, inceptionYear: 2004 },
  { symbol: 'VTV', name: 'Vanguard Value ETF', category: 'US Equity', expenseRatio: 0.04, aumBillion: 110, oneYearReturn: 0.182, threeYearReturn: 0.094, fiveYearReturn: 0.112, volatility: 0.142, sharpe: 0.38, maxDrawdown: -0.592, inceptionYear: 2004 },

  // International
  { symbol: 'VXUS', name: 'Vanguard Total International Stock', category: 'International', expenseRatio: 0.07, aumBillion: 75, oneYearReturn: 0.124, threeYearReturn: 0.042, fiveYearReturn: 0.058, volatility: 0.158, sharpe: 0.01, maxDrawdown: -0.354, inceptionYear: 2011 },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', category: 'International', expenseRatio: 0.32, aumBillion: 55, oneYearReturn: 0.131, threeYearReturn: 0.054, fiveYearReturn: 0.065, volatility: 0.165, sharpe: 0.15, maxDrawdown: -0.568, inceptionYear: 2001 },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets', category: 'International', expenseRatio: 0.69, aumBillion: 21, oneYearReturn: 0.082, threeYearReturn: -0.024, fiveYearReturn: 0.018, volatility: 0.184, sharpe: -0.12, maxDrawdown: -0.616, inceptionYear: 2003 },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets', category: 'International', expenseRatio: 0.05, aumBillion: 130, oneYearReturn: 0.138, threeYearReturn: 0.058, fiveYearReturn: 0.069, volatility: 0.161, sharpe: 0.18, maxDrawdown: -0.356, inceptionYear: 2007 },

  // Fixed Income
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'Fixed Income', expenseRatio: 0.03, aumBillion: 115, oneYearReturn: 0.065, threeYearReturn: -0.012, fiveYearReturn: 0.002, volatility: 0.062, sharpe: -0.61, maxDrawdown: -0.186, inceptionYear: 2007 },
  { symbol: 'AGG', name: 'iShares Core US Aggregate Bond', category: 'Fixed Income', expenseRatio: 0.03, aumBillion: 108, oneYearReturn: 0.064, threeYearReturn: -0.014, fiveYearReturn: 0.001, volatility: 0.061, sharpe: -0.63, maxDrawdown: -0.184, inceptionYear: 2003 },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond', category: 'Fixed Income', expenseRatio: 0.15, aumBillion: 52, oneYearReturn: 0.042, threeYearReturn: -0.078, fiveYearReturn: -0.045, volatility: 0.152, sharpe: -0.56, maxDrawdown: -0.468, inceptionYear: 2002 },
  { symbol: 'IEF', name: 'iShares 7-10 Year Treasury Bond', category: 'Fixed Income', expenseRatio: 0.15, aumBillion: 28, oneYearReturn: 0.058, threeYearReturn: -0.028, fiveYearReturn: -0.008, volatility: 0.084, sharpe: -0.71, maxDrawdown: -0.231, inceptionYear: 2002 },
  { symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond', category: 'Fixed Income', expenseRatio: 0.15, aumBillion: 26, oneYearReturn: 0.051, threeYearReturn: 0.021, fiveYearReturn: 0.016, volatility: 0.024, sharpe: -0.98, maxDrawdown: -0.057, inceptionYear: 2002 },
  { symbol: 'LQD', name: 'iShares iBoxx $ Investment Grade', category: 'Fixed Income', expenseRatio: 0.14, aumBillion: 34, oneYearReturn: 0.078, threeYearReturn: -0.008, fiveYearReturn: 0.012, volatility: 0.088, sharpe: -0.36, maxDrawdown: -0.249, inceptionYear: 2002 },
  { symbol: 'BIL', name: 'SPDR Bloomberg 1-3 Month T-Bill', category: 'Fixed Income', expenseRatio: 0.13, aumBillion: 31, oneYearReturn: 0.052, threeYearReturn: 0.042, fiveYearReturn: 0.028, volatility: 0.006, sharpe: 0.02, maxDrawdown: -0.004, inceptionYear: 2007 },

  // Commodities & Real Estate
  { symbol: 'GLD', name: 'SPDR Gold Shares', category: 'Commodity & Real Estate', expenseRatio: 0.40, aumBillion: 68, oneYearReturn: 0.285, threeYearReturn: 0.112, fiveYearReturn: 0.108, volatility: 0.145, sharpe: 0.49, maxDrawdown: -0.455, inceptionYear: 2004 },
  { symbol: 'IAU', name: 'iShares Gold Trust', category: 'Commodity & Real Estate', expenseRatio: 0.25, aumBillion: 32, oneYearReturn: 0.286, threeYearReturn: 0.114, fiveYearReturn: 0.109, volatility: 0.145, sharpe: 0.50, maxDrawdown: -0.454, inceptionYear: 2005 },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', category: 'Commodity & Real Estate', expenseRatio: 0.12, aumBillion: 34, oneYearReturn: 0.188, threeYearReturn: 0.032, fiveYearReturn: 0.052, volatility: 0.185, sharpe: 0.06, maxDrawdown: -0.732, inceptionYear: 2004 },
  { symbol: 'DBC', name: 'Invesco DB Commodity Tracking', category: 'Commodity & Real Estate', expenseRatio: 0.85, aumBillion: 2, oneYearReturn: 0.042, threeYearReturn: 0.078, fiveYearReturn: 0.124, volatility: 0.198, sharpe: 0.19, maxDrawdown: -0.758, inceptionYear: 2006 },

  // Leveraged ETFs
  { symbol: 'UPRO', name: 'ProShares UltraPro S&P 500 (3x)', category: 'Leveraged', expenseRatio: 0.91, aumBillion: 4, oneYearReturn: 0.742, threeYearReturn: 0.245, fiveYearReturn: 0.328, volatility: 0.442, sharpe: 0.65, maxDrawdown: -0.768, inceptionYear: 2009 },
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ (3x)', category: 'Leveraged', expenseRatio: 0.88, aumBillion: 22, oneYearReturn: 0.895, threeYearReturn: 0.268, fiveYearReturn: 0.412, volatility: 0.582, sharpe: 0.64, maxDrawdown: -0.816, inceptionYear: 2010 },
  { symbol: 'SOXL', name: 'Direxion Semiconductor Bull 3x', category: 'Leveraged', expenseRatio: 0.76, aumBillion: 10, oneYearReturn: 0.965, threeYearReturn: 0.185, fiveYearReturn: 0.485, volatility: 0.785, sharpe: 0.57, maxDrawdown: -0.902, inceptionYear: 2010 },
];

type SortKey = 'symbol' | 'name' | 'expenseRatio' | 'oneYearReturn' | 'threeYearReturn' | 'volatility' | 'sharpe' | 'maxDrawdown';

export default function ScreenerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [maxExpense, setMaxExpense] = useState<number>(1.0);
  const [sortKey, setSortKey] = useState<SortKey>('oneYearReturn');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const categories = ['All', 'US Equity', 'International', 'Fixed Income', 'Commodity & Real Estate', 'Leveraged'];

  const filteredFunds = useMemo(() => {
    return FUND_UNIVERSE.filter((fund) => {
      const matchSearch =
        fund.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'All' || fund.category === selectedCategory;
      const matchExpense = fund.expenseRatio <= maxExpense;
      return matchSearch && matchCategory && matchExpense;
    }).sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [searchTerm, selectedCategory, maxExpense, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund & ETF Screener"
        subtitle="Multi-Asset Universe Filter & Comparative Rankings"
        description="Screen liquid index funds, equity benchmarks, Treasury bonds, and leveraged ETFs by expense ratio, Sharpe ratio, volatility, and historical returns."
        badge={
          <Badge variant="info" className="gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>26 Benchmark Securities</span>
          </Badge>
        }
      />

      {/* Filter Controls Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by symbol or fund name (e.g. SPY, Vanguard, Gold)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
            </div>

            {/* Expense Ratio Threshold */}
            <div className="flex items-center gap-2 text-xs text-slate-600 w-full md:w-auto shrink-0 font-medium">
              <span>Max Expense:</span>
              <div className="flex items-center gap-1">
                {[0.10, 0.25, 0.50, 1.00].map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setMaxExpense(exp)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                      maxExpense === exp
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {exp >= 1.0 ? 'All' : `≤${(exp * 100).toFixed(0)}bps`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 mr-2">Asset Class:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Matching Securities ({filteredFunds.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Click column headers to re-sort results
            </CardDescription>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Sorted by: <strong className="text-slate-800 uppercase">{sortKey}</strong> ({sortAsc ? 'Asc' : 'Desc'})
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('symbol')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Ticker</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Fund Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Asset Class</th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('expenseRatio')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Expense</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('oneYearReturn')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>1Y Return</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('threeYearReturn')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>3Y Return</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('volatility')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Vol (σ)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('sharpe')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sharpe</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort('maxDrawdown')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Max DD</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredFunds.map((f) => (
                  <tr key={f.symbol} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-blue-600">
                      {f.symbol}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800 min-w-[180px]">
                      {f.name}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {f.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                      {(f.expenseRatio).toFixed(2)}%
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-semibold ${
                        f.oneYearReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatPct(f.oneYearReturn)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums ${
                        f.threeYearReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatPct(f.threeYearReturn)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                      {formatPct(f.volatility)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-semibold ${
                        f.sharpe >= 0.5 ? 'text-emerald-600' : f.sharpe < 0 ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      {f.sharpe.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-red-600">
                      {formatPct(f.maxDrawdown)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Link
                        href={`/backtest?add=${f.symbol}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-[11px] font-medium transition cursor-pointer font-sans shadow-2xs"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Backtest</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
