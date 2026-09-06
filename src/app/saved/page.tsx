'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Layers } from 'lucide-react';
import { runBacktest, AssetPeriodReturn } from '@/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { SummaryMetricsCard } from '@/components/metrics/SummaryMetricsCard';
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Button, EmptyState } from '@/components/ui';
import { formatPercent, formatRatio } from '@/utils/formatters';

const ALIGNED_PERIOD_DATA: AssetPeriodReturn[] = CURATED_DATES.map((date, idx) => {
  const returns: Record<string, number> = {};
  Object.keys(CURATED_RETURNS).forEach((sym) => {
    returns[sym] = CURATED_RETURNS[sym][idx] || 0;
  });
  return { date, returns };
});

export default function SavedAnalysesPage() {
  const [experiments, setExperiments] = useState([
    {
      id: 'baseline',
      name: 'Baseline: Classic 60/40',
      description: 'Traditional balanced benchmark with 60% US Equities and 40% Total Bond Market',
      color: '#64748b',
      assets: [
        { symbol: 'SPY', weight: 0.60 },
        { symbol: 'BND', weight: 0.40 },
      ],
    },
    {
      id: 'expA',
      name: 'Experiment A: Tech Growth 60/40',
      description: 'Nasdaq-100 high beta equity tilt paired with aggregate fixed income',
      color: '#2563eb',
      assets: [
        { symbol: 'QQQ', weight: 0.60 },
        { symbol: 'BND', weight: 0.40 },
      ],
    },
    {
      id: 'expB',
      name: 'Experiment B: Leveraged Core (30% UPRO / 70% BND)',
      description: 'Capital-efficient leveraged equity sleeve allowing heavy duration cushion',
      color: '#d97706',
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

  const removeExperiment = (id: string) => {
    if (experiments.length > 1) {
      setExperiments(experiments.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved Portfolios & Experiment Lab"
        description="Compare baseline investment strategies side-by-side against experimental asset allocations and leveraged variants."
        actions={
          <Link href="/backtest">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Backtest Model
            </Button>
          </Link>
        }
      />

      {experiments.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-12 h-12 text-slate-400" />}
          title="No Saved Experiments"
          description="Save custom portfolio models from the Backtester or Strategy Lab to compare them side-by-side."
          action={
            <Link href="/backtest">
              <Button variant="primary" size="sm">
                Open Portfolio Backtester
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Experiment Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((exp) => (
              <Card key={exp.id} className="flex flex-col justify-between shadow-xs border-slate-200 bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: exp.color }} />
                      <CardTitle className="text-sm font-semibold text-slate-900">{exp.name}</CardTitle>
                    </div>
                    {experiments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperiment(exp.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        title="Remove experiment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2 mt-1 text-slate-500">
                    {exp.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {exp.assets.map((a) => (
                      <span
                        key={a.symbol}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700"
                      >
                        <span className="font-semibold text-slate-900">{a.symbol}</span>
                        <span className="ml-1 text-slate-500">{(a.weight * 100).toFixed(0)}%</span>
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-sans">CAGR</span>
                      <span className="font-bold text-emerald-600 text-sm tabular-nums">
                        {formatPercent(exp.result.summary.cagr, 2)}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-sans">Sharpe</span>
                      <span className="font-bold text-slate-900 text-sm tabular-nums">
                        {formatRatio(exp.result.summary.sharpeRatio, 2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Growth Chart */}
          <GrowthChart series={growthSeries} height={360} />

          {/* Comparative Summary Metrics Table */}
          <SummaryMetricsCard portfolios={summaryPortfolios} />
        </>
      )}
    </div>
  );
}
