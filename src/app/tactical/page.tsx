'use client';

import React, { useState, useMemo } from 'react';
import { runDualMomentumStrategy, runMovingAverageStrategy } from '@/analytics/tactical';
import { calculateCAGR, calculateTotalReturn } from '@/analytics/returns';
import { calculateMaxDrawdown } from '@/analytics/drawdowns';
import { calculateAnnualizedVolatility } from '@/analytics/statistics';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { Compass, Zap, Shield, TrendingUp, Sliders } from 'lucide-react';

export default function TacticalPage() {
  const [strategyType, setStrategyType] = useState<'dual_momentum' | 'moving_average'>('dual_momentum');
  const [lookbackMonths, setLookbackMonths] = useState(12);
  const [topHoldings, setTopHoldings] = useState(2);
  const [smaWindow, setSmaWindow] = useState(10);
  const [safeAsset, setSafeAsset] = useState('BND');

  // Candidate universe
  const universe = ['QQQ', 'SPY', 'IWM', 'EFA', 'EEM', 'GLD', 'TLT'];

  // Convert monthly returns to prices starting at 100
  const { prices, dates } = useMemo(() => {
    const dates = CURATED_DATES;
    const prices: Record<string, number[]> = {};

    [...universe, 'BND', 'BIL'].forEach((sym) => {
      const rets = CURATED_RETURNS[sym] || CURATED_RETURNS['SPY'] || [];
      const p = [100];
      for (let i = 0; i < rets.length; i++) {
        p.push(p[p.length - 1] * (1 + rets[i]));
      }
      prices[sym] = p.slice(1);
    });

    return { prices, dates };
  }, []);

  // Run strategy
  const { strategyGrowth, benchmarkGrowth, summary, tradeLog } = useMemo(() => {
    let signals;
    if (strategyType === 'dual_momentum') {
      signals = runDualMomentumStrategy(dates, prices, lookbackMonths, topHoldings, safeAsset);
    } else {
      signals = runMovingAverageStrategy(dates, prices, smaWindow, safeAsset);
    }

    // Simulate portfolio value over time
    const startIdx = dates.length - signals.length;
    let stratVal = 10000;
    let benchVal = 10000;

    const stratGrowth = [{ date: dates[startIdx - 1] || '2007-01-01', value: stratVal }];
    const benchGrowth = [{ date: dates[startIdx - 1] || '2007-01-01', value: benchVal }];
    const stratRets: number[] = [];
    const benchRets: number[] = [];

    for (let t = 0; t < signals.length; t++) {
      const sig = signals[t];
      const actualIdx = startIdx + t;

      // Compute weighted return for current period
      let periodStratRet = 0;
      Object.entries(sig.selectedAssets).forEach(([sym, w]) => {
        const ret = CURATED_RETURNS[sym]?.[actualIdx] || 0;
        periodStratRet += w * ret;
      });

      const spyRet = CURATED_RETURNS['SPY']?.[actualIdx] || 0;

      stratVal *= 1 + periodStratRet;
      benchVal *= 1 + spyRet;

      stratGrowth.push({ date: sig.date, value: stratVal });
      benchGrowth.push({ date: sig.date, value: benchVal });

      stratRets.push(periodStratRet);
      benchRets.push(spyRet);
    }

    const durationYears = signals.length / 12;
    const stratCAGR = calculateCAGR(10000, stratVal, durationYears);
    const benchCAGR = calculateCAGR(10000, benchVal, durationYears);
    const stratVol = calculateAnnualizedVolatility(stratRets, 12);
    const benchVol = calculateAnnualizedVolatility(benchRets, 12);
    const stratMDD = calculateMaxDrawdown(stratGrowth.map((g) => g.value));
    const benchMDD = calculateMaxDrawdown(benchGrowth.map((g) => g.value));

    return {
      strategyGrowth: stratGrowth,
      benchmarkGrowth: benchGrowth,
      summary: {
        stratCAGR,
        benchCAGR,
        stratVol,
        benchVol,
        stratMDD,
        benchMDD,
        stratSharpe: stratVol > 0 ? (stratCAGR - 0.04) / stratVol : 0,
        benchSharpe: benchVol > 0 ? (benchCAGR - 0.04) / benchVol : 0,
      },
      tradeLog: signals.slice(-12).reverse(), // Last 12 months allocation
    };
  }, [strategyType, lookbackMonths, topHoldings, smaWindow, safeAsset, dates, prices]);

  const growthSeries = [
    { id: 'strat', name: 'Tactical Strategy', color: '#38bdf8', data: strategyGrowth },
    { id: 'bench', name: 'SPY (Buy & Hold)', color: '#94a3b8', data: benchmarkGrowth },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Tactical Asset Allocation Strategy Laboratory
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Backtest Gary Antonacci Dual Momentum rotation, trend-following moving average filters, and defensive cash switches
        </p>
      </div>

      {/* Configuration card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" /> Strategy Configuration
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Universe: {universe.join(', ')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Tactical Model</label>
            <select
              value={strategyType}
              onChange={(e) => setStrategyType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="dual_momentum">Gary Antonacci Dual Momentum</option>
              <option value="moving_average">Moving Average Trend Following</option>
            </select>
          </div>

          {strategyType === 'dual_momentum' ? (
            <>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Momentum Lookback (Months)</label>
                <select
                  value={lookbackMonths}
                  onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono"
                >
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Top N Assets Held</label>
                <select
                  value={topHoldings}
                  onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono"
                >
                  <option value="1">Top 1 Asset (Concentrated)</option>
                  <option value="2">Top 2 Assets (Equal Weight)</option>
                  <option value="3">Top 3 Assets</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">SMA Window (Months)</label>
              <select
                value={smaWindow}
                onChange={(e) => setSmaWindow(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono"
              >
                <option value="5">5-Month SMA</option>
                <option value="10">10-Month SMA (200-Day Proxy)</option>
                <option value="12">12-Month SMA</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Defensive Safety Asset</label>
            <select
              value={safeAsset}
              onChange={(e) => setSafeAsset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono"
            >
              <option value="BND">BND (Total Bond Market)</option>
              <option value="BIL">BIL (Cash / 1-3M T-Bill)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Strategy CAGR</span>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {(summary.stratCAGR * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-500">Benchmark: {(summary.benchCAGR * 100).toFixed(2)}%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Max Drawdown</span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {(summary.stratMDD * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-500">Benchmark: {(summary.benchMDD * 100).toFixed(2)}%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Annualized Volatility</span>
          <div className="text-2xl font-bold font-mono text-slate-200">
            {(summary.stratVol * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-500">Benchmark: {(summary.benchVol * 100).toFixed(2)}%</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Sharpe Ratio</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary.stratSharpe.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Benchmark: {summary.benchSharpe.toFixed(2)}</span>
        </div>
      </div>

      {/* Growth Chart */}
      <GrowthChart series={growthSeries} height={360} />

      {/* Historical Signals Table */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-white tracking-wide">Recent Tactical Allocation History</h3>
          <p className="text-xs text-slate-400">Most recent monthly position reallocations</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Active Position(s)</th>
                <th className="py-2 px-3 text-right">Cash Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {tradeLog.map((sig, i) => (
                <tr key={i} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-semibold text-slate-300">{sig.date}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(sig.selectedAssets).map(([sym, w]) => (
                        <span
                          key={sym}
                          className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold"
                        >
                          {sym}: {(w * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">
                    {(sig.cashWeight * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
