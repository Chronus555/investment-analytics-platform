'use client';

import React, { useState, useMemo } from 'react';
import {
  runDualMomentumStrategy,
  runMovingAverageStrategy,
  runTargetVolatilityStrategy,
  runRelativeMomentumStrategy,
} from '@/analytics/tactical';
import { calculateCAGR } from '@/analytics/returns';
import { calculateMaxDrawdown } from '@/analytics/drawdowns';
import { calculateAnnualizedVolatility } from '@/analytics/statistics';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatRatio } from '@/utils/formatters';

type TacticalModel = 'dual_momentum' | 'moving_average' | 'target_volatility' | 'relative_momentum';

export default function TacticalPage() {
  const [strategyType, setStrategyType] = useState<TacticalModel>('dual_momentum');
  const [lookbackMonths, setLookbackMonths] = useState(12);
  const [topHoldings, setTopHoldings] = useState(2);
  const [smaWindow, setSmaWindow] = useState(10);
  const [safeAsset, setSafeAsset] = useState('BND');
  const [targetVol, setTargetVol] = useState(0.12);
  const [targetVolAsset, setTargetVolAsset] = useState<'SPY' | 'QQQ' | 'UNIVERSE'>('SPY');

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
    } else if (strategyType === 'moving_average') {
      signals = runMovingAverageStrategy(dates, prices, smaWindow, safeAsset);
    } else if (strategyType === 'target_volatility') {
      const risky = targetVolAsset === 'UNIVERSE' ? universe : [targetVolAsset];
      signals = runTargetVolatilityStrategy(dates, prices, risky, targetVol, 12, safeAsset, 1.0);
    } else {
      signals = runRelativeMomentumStrategy(dates, prices, universe, lookbackMonths, topHoldings);
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
  }, [strategyType, lookbackMonths, topHoldings, smaWindow, safeAsset, targetVol, targetVolAsset, dates, prices]);

  const strategyNames: Record<TacticalModel, string> = {
    dual_momentum: 'Antonacci Dual Momentum',
    moving_average: `10-Month SMA Trend (${smaWindow}M)`,
    target_volatility: `Target Volatility (${formatPercent(targetVol, 0)})`,
    relative_momentum: `Relative Strength Rotation (Top ${topHoldings})`,
  };

  const growthSeries = [
    { id: 'strat', name: strategyNames[strategyType], color: '#2563eb', data: strategyGrowth },
    { id: 'bench', name: 'SPY (Buy & Hold)', color: '#64748b', data: benchmarkGrowth },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Tactical Strategy & Momentum Lab"
        description="Backtest Gary Antonacci Dual Momentum cross-asset rotation, 10-month SMA trend following, Target Volatility dynamic scaling, and Relative Strength momentum rotation."
        badge={<Badge variant="info">Tactical Engine</Badge>}
      />

      {/* Strategy Selector & Parameters Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStrategyType('dual_momentum')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'dual_momentum'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Antonacci Dual Momentum
            </button>
            <button
              onClick={() => setStrategyType('moving_average')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'moving_average'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              10-Month SMA Trend
            </button>
            <button
              onClick={() => setStrategyType('target_volatility')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'target_volatility'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Target Volatility Scaling
            </button>
            <button
              onClick={() => setStrategyType('relative_momentum')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'relative_momentum'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Relative Strength Rotation
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Universe: {universe.join(', ')}
          </span>
        </CardHeader>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {strategyType === 'dual_momentum' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Lookback Period
                  </label>
                  <select
                    value={lookbackMonths}
                    onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (Canonical)</option>
                    <option value="18">18 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Top Momentum Holdings (N)
                  </label>
                  <select
                    value={topHoldings}
                    onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="1">Top 1 Asset (Concentrated)</option>
                    <option value="2">Top 2 Assets (Balanced)</option>
                    <option value="3">Top 3 Assets</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Out-of-Market Asset
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BND">BND (Total Bond Market)</option>
                    <option value="BIL">BIL (1-3M Treasury / Cash)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'moving_average' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    SMA Window
                  </label>
                  <select
                    value={smaWindow}
                    onChange={(e) => setSmaWindow(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="5">5 Months (Fast)</option>
                    <option value="10">10 Months (Faber 200-Day Equivalent)</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Out-of-Market Asset
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BND">BND (Total Bond Market)</option>
                    <option value="BIL">BIL (1-3M Treasury / Cash)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'target_volatility' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Target Volatility
                  </label>
                  <select
                    value={targetVol}
                    onChange={(e) => setTargetVol(parseFloat(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="0.08">8% Annualized (Conservative)</option>
                    <option value="0.10">10% Annualized (Moderate)</option>
                    <option value="0.12">12% Annualized (Standard CTA Target)</option>
                    <option value="0.15">15% Annualized (Growth)</option>
                    <option value="0.18">18% Annualized (Aggressive)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Underlying Risky Exposure
                  </label>
                  <select
                    value={targetVolAsset}
                    onChange={(e) => setTargetVolAsset(e.target.value as 'SPY' | 'QQQ' | 'UNIVERSE')}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="SPY">SPY (S&P 500 US Large Cap)</option>
                    <option value="QQQ">QQQ (Nasdaq 100 Tech/Growth)</option>
                    <option value="UNIVERSE">Multi-Asset Equal Basket (7 Assets)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Cash Buffer
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BIL">BIL (1-3M Treasury / Cash)</option>
                    <option value="BND">BND (Total Bond Market)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'relative_momentum' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Lookback Period
                  </label>
                  <select
                    value={lookbackMonths}
                    onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="3">3 Months (Short Horizon)</option>
                    <option value="6">6 Months (Intermediate)</option>
                    <option value="12">12 Months (Long Horizon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Top Momentum Holdings (N)
                  </label>
                  <select
                    value={topHoldings}
                    onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="1">Top 1 Leader (100% Weight)</option>
                    <option value="2">Top 2 Leaders (50% / 50%)</option>
                    <option value="3">Top 3 Leaders (33.3% Each)</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pure cross-sectional momentum stays 100% invested in the top-performing assets with monthly rebalancing.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Comparative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Strategy CAGR"
          value={formatPercent(summary.stratCAGR, 2)}
          helperText={`vs SPY Benchmark ${formatPercent(summary.benchCAGR, 2)}`}
          change={`${formatPercent(summary.stratCAGR, 1)}`}
          changeType={summary.stratCAGR >= summary.benchCAGR ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Strategy Volatility"
          value={formatPercent(summary.stratVol, 2)}
          helperText={`vs SPY Benchmark ${formatPercent(summary.benchVol, 2)}`}
          change={`${formatPercent(summary.stratVol, 1)}`}
          changeType={summary.stratVol < summary.benchVol ? 'positive' : 'neutral'}
        />
        <MetricCard
          label="Strategy Sharpe Ratio"
          value={formatRatio(summary.stratSharpe, 2)}
          helperText={`vs SPY Benchmark ${formatRatio(summary.benchSharpe, 2)}`}
          change={`Sharpe ${formatRatio(summary.stratSharpe, 2)}`}
          changeType={summary.stratSharpe >= summary.benchSharpe ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Max Drawdown"
          value={formatPercent(summary.stratMDD, 2)}
          helperText={`vs SPY Benchmark ${formatPercent(summary.benchMDD, 2)}`}
          change={`${formatPercent(summary.stratMDD, 1)}`}
          changeType={summary.stratMDD > summary.benchMDD ? 'positive' : 'negative'}
        />
      </div>

      {/* Growth Chart */}
      <GrowthChart series={growthSeries} height={350} />

      {/* Recent Tactical Signals Table */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900">Recent Monthly Tactical Allocations & Signals</CardTitle>
            <CardDescription className="text-slate-500">Execution history over the past 12 months</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-2.5 px-4 font-semibold">Period</th>
                <th className="py-2.5 px-4 font-semibold">Target Regime</th>
                <th className="py-2.5 px-4 font-semibold">Selected Assets & Weights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {tradeLog.map((log) => {
                let badgeText = 'Offensive Momentum';
                let badgeVariant: 'success' | 'warning' | 'info' | 'neutral' = 'success';

                if (strategyType === 'target_volatility') {
                  const isDeRisked = (log.cashWeight ?? 0) >= 0.25;
                  badgeText = isDeRisked
                    ? `De-Risked (${formatPercent(log.cashWeight ?? 0, 0)} Cash)`
                    : `Target Vol (${formatPercent(1 - (log.cashWeight ?? 0), 0)} Risky)`;
                  badgeVariant = isDeRisked ? 'warning' : 'info';
                } else if (strategyType === 'relative_momentum') {
                  badgeText = 'Top-K Momentum';
                  badgeVariant = 'info';
                } else {
                  const isDefensive = Object.keys(log.selectedAssets).includes(safeAsset);
                  badgeText = isDefensive ? 'Defensive Mode' : 'Offensive Momentum';
                  badgeVariant = isDefensive ? 'warning' : 'success';
                }

                return (
                  <tr key={log.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-4 text-slate-800 font-semibold font-sans">{log.date.slice(0, 7)}</td>
                    <td className="py-2 px-4">
                      <Badge variant={badgeVariant} size="sm">
                        {badgeText}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(log.selectedAssets).map(([sym, w]) => (
                          <span
                            key={sym}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs"
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