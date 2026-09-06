'use client';

import React, { useState, useMemo } from 'react';
import { runDualMomentumStrategy, runMovingAverageStrategy } from '@/analytics/tactical';
import { calculateCAGR, calculateTotalReturn } from '@/analytics/returns';
import { calculateMaxDrawdown } from '@/analytics/drawdowns';
import { calculateAnnualizedVolatility } from '@/analytics/statistics';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatRatio } from '@/utils/formatters';

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
    { id: 'strat', name: 'Tactical Strategy', color: '#6366f1', data: strategyGrowth },
    { id: 'bench', name: 'SPY (Buy & Hold)', color: '#94a3b8', data: benchmarkGrowth },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Tactical Strategy & Momentum Lab"
        description="Backtest Gary Antonacci Dual Momentum cross-asset rotation, 10-month SMA trend following, and cash defense switches."
        badge={<Badge variant="info">Tactical Engine</Badge>}
      />

      {/* Strategy Selector & Parameters Card */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStrategyType('dual_momentum')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors ${
                strategyType === 'dual_momentum'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Antonacci Dual Momentum
            </button>
            <button
              onClick={() => setStrategyType('moving_average')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors ${
                strategyType === 'moving_average'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              10-Month Moving Average Trend
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Universe: {universe.join(', ')}
          </span>
        </CardHeader>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {strategyType === 'dual_momentum' ? (
              <>
                <div>
                  <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                    Lookback Period
                  </label>
                  <select
                    value={lookbackMonths}
                    onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                  >
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (Canonical)</option>
                    <option value="18">18 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                    Top Momentum Holdings (N)
                  </label>
                  <select
                    value={topHoldings}
                    onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                  >
                    <option value="1">Top 1 Asset (Concentrated)</option>
                    <option value="2">Top 2 Assets (Balanced)</option>
                    <option value="3">Top 3 Assets</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                  SMA Window
                </label>
                <select
                  value={smaWindow}
                  onChange={(e) => setSmaWindow(parseInt(e.target.value, 10))}
                  className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                >
                  <option value="5">5 Months (Fast)</option>
                  <option value="10">10 Months (Faber 200-Day Equivalent)</option>
                  <option value="12">12 Months</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Defensive Out-of-Market Asset
              </label>
              <select
                value={safeAsset}
                onChange={(e) => setSafeAsset(e.target.value)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
              >
                <option value="BND">BND (Total Bond Market)</option>
                <option value="BIL">BIL (1-3M Treasury / Cash)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Comparative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Strategy CAGR"
          value={formatPercent(summary.stratCAGR, 2)}
          subtext={`vs SPY Benchmark ${formatPercent(summary.benchCAGR, 2)}`}
          change={summary.stratCAGR - summary.benchCAGR}
          accentColor="#6366f1"
        />
        <MetricCard
          label="Strategy Volatility"
          value={formatPercent(summary.stratVol, 2)}
          subtext={`vs SPY Benchmark ${formatPercent(summary.benchVol, 2)}`}
          trend={summary.stratVol < summary.benchVol ? 'up' : 'down'}
          accentColor="#10b981"
        />
        <MetricCard
          label="Strategy Sharpe Ratio"
          value={formatRatio(summary.stratSharpe, 2)}
          subtext={`vs SPY Benchmark ${formatRatio(summary.benchSharpe, 2)}`}
          change={summary.stratSharpe - summary.benchSharpe}
          accentColor="#6366f1"
        />
        <MetricCard
          label="Max Drawdown"
          value={formatPercent(summary.stratMDD, 2)}
          subtext={`vs SPY Benchmark ${formatPercent(summary.benchMDD, 2)}`}
          accentColor="#f59e0b"
        />
      </div>

      {/* Growth Chart */}
      <GrowthChart series={growthSeries} height={350} />

      {/* Recent Tactical Signals Table */}
      <Card className="shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Recent Monthly Tactical Allocations & Signals</CardTitle>
            <CardDescription>Execution history over the past 12 months</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-slate-950/40">
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Target Regime</th>
                <th className="py-2.5 px-4">Selected Assets & Weights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[12px]">
              {tradeLog.map((log) => {
                const isDefensive = Object.keys(log.selectedAssets).includes(safeAsset);
                return (
                  <tr key={log.date} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-4 text-slate-300 font-semibold">{log.date.slice(0, 7)}</td>
                    <td className="py-2 px-4">
                      <Badge variant={isDefensive ? 'warning' : 'success'} size="sm">
                        {isDefensive ? 'Defensive Mode' : 'Offensive Momentum'}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(log.selectedAssets).map(([sym, w]) => (
                          <span
                            key={sym}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60 font-mono text-xs"
                          >
                            <strong>{sym}</strong> {formatPercent(w, 0)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}