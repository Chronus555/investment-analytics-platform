'use client';

import React, { useState, useMemo } from 'react';
import { BookmarkCheck, Plus, Play, Trash2, ArrowRight } from 'lucide-react';
import { runBacktest, BacktestResult, AssetPeriodReturn } from '@/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { SummaryMetricsCard } from '@/components/metrics/SummaryMetricsCard';

const ALIGNED_PERIOD_DATA: AssetPeriodReturn[] = CURATED_DATES.map((date, idx) => {
  const returns: Record<string, number> = {};
  Object.keys(CURATED_RETURNS).forEach((sym) => {
    returns[sym] = CURATED_RETURNS[sym][idx] || 0;
  });
  return { date, returns };
});

export default function SavedAnalysesPage() {
  const [experiments] = useState([
    {
      id: 'baseline',
      name: 'Baseline: Classic 60/40',
      color: '#94a3b8',
      assets: [
        { symbol: 'SPY', weight: 0.60 },
        { symbol: 'BND', weight: 0.40 },
      ],
    },
    {
      id: 'expA',
      name: 'Experiment A: Tech Growth 60/40',
      color: '#38bdf8',
      assets: [
        { symbol: 'QQQ', weight: 0.60 },
        { symbol: 'BND', weight: 0.40 },
      ],
    },
    {
      id: 'expB',
      name: 'Experiment B: Leveraged Core (30% UPRO / 70% BND)',
      color: '#f59e0b',
      assets: [
        { symbol: 'UPRO', weight: 0.30 },
        { symbol: 'BND', weight: 0.70 },
      ],
    },
  ]);

  const results = useMemo(() => {
    return experiments.map((exp) => ({
      ...exp,
      result: runBacktest(exp.assets, ALIGNED_PERIOD_DATA, undefined, {
        initialBalance: 10000,
        rebalanceFrequency: 'annually',
      }),
    }));
  }, [experiments]);

  const growthSeries = results.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    data: r.result.history.map((h) => ({ date: h.date, value: h.portfolioValue })),
  }));

  const summaryPortfolios = results.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    metrics: r.result.summary,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Saved Portfolios & Strategy Experiment Lab
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Phase 27: Compare baseline strategies side-by-side against experimental allocations and leveraged variants
        </p>
      </div>

      {/* Experiment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((exp) => (
          <div
            key={exp.id}
            className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.color }} />
              <h3 className="font-semibold text-sm text-white">{exp.name}</h3>
            </div>

            <div className="text-xs text-slate-400">
              {exp.assets.map((a) => `${a.symbol} ${(a.weight * 100).toFixed(0)}%`).join(' • ')}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
              <div>
                <span className="text-slate-500">CAGR:</span>{' '}
                <span className="font-bold text-emerald-400">
                  {(exp.result.summary.cagr * 100).toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-slate-500">Sharpe:</span>{' '}
                <span className="font-bold text-white">{exp.result.summary.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Growth Chart */}
      <GrowthChart series={growthSeries} height={360} />

      {/* Comparative Summary Metrics Table */}
      <SummaryMetricsCard portfolios={summaryPortfolios} />
    </div>
  );
}
