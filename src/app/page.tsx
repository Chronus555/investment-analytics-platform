'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Shuffle,
  PieChart,
  BarChart3,
  Sliders,
  Layers,
  Compass,
} from 'lucide-react';
import { runBacktest, AssetPeriodReturn, BacktestResult } from '@/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { SummaryMetricsCard } from '@/components/metrics/SummaryMetricsCard';
import { AiPortfolioAnalyst } from '@/components/ai/AiPortfolioAnalyst';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatRatio } from '@/utils/formatters';

// Convert curated data to aligned monthly period data
const ALIGNED_PERIOD_DATA: AssetPeriodReturn[] = CURATED_DATES.map((date, idx) => {
  const returns: Record<string, number> = {};
  Object.keys(CURATED_RETURNS).forEach((sym) => {
    returns[sym] = CURATED_RETURNS[sym][idx] || 0;
  });
  return { date, returns };
});

const SPY_BENCHMARK_RETURNS = CURATED_RETURNS['SPY'] || [];

export default function DashboardPage() {
  // Pre-configured Portfolios for instant interactive backtesting
  const [portfolioA] = useState({
    name: 'Growth Tilt (Portfolio A)',
    assets: [
      { symbol: 'SPY', weight: 0.50 },
      { symbol: 'QQQ', weight: 0.20 },
      { symbol: 'AVUV', weight: 0.10 },
      { symbol: 'TLT', weight: 0.10 },
      { symbol: 'GLD', weight: 0.10 },
    ],
    color: '#6366f1', // Indigo
  });

  const [portfolioB] = useState({
    name: 'Classic 70/30 (Portfolio B)',
    assets: [
      { symbol: 'VTI', weight: 0.70 },
      { symbol: 'BND', weight: 0.30 },
    ],
    color: '#10b981', // Emerald
  });

  const [portfolioC] = useState({
    name: 'Permanent Portfolio (Portfolio C)',
    assets: [
      { symbol: 'VTI', weight: 0.25 },
      { symbol: 'TLT', weight: 0.25 },
      { symbol: 'GLD', weight: 0.25 },
      { symbol: 'BIL', weight: 0.25 },
    ],
    color: '#f59e0b', // Amber
  });

  // Run backtests
  const resultA = useMemo<BacktestResult>(() => {
    return runBacktest(portfolioA.assets, ALIGNED_PERIOD_DATA, SPY_BENCHMARK_RETURNS, {
      initialBalance: 10000,
      rebalanceFrequency: 'annually',
    });
  }, [portfolioA]);

  const resultB = useMemo<BacktestResult>(() => {
    return runBacktest(portfolioB.assets, ALIGNED_PERIOD_DATA, SPY_BENCHMARK_RETURNS, {
      initialBalance: 10000,
      rebalanceFrequency: 'annually',
    });
  }, [portfolioB]);

  const resultC = useMemo<BacktestResult>(() => {
    return runBacktest(portfolioC.assets, ALIGNED_PERIOD_DATA, SPY_BENCHMARK_RETURNS, {
      initialBalance: 10000,
      rebalanceFrequency: 'annually',
    });
  }, [portfolioC]);

  // Chart data
  const growthSeries = useMemo(() => {
    return [
      {
        id: 'portA',
        name: portfolioA.name,
        color: portfolioA.color,
        data: resultA.history.map((h) => ({ date: h.date, value: h.portfolioValue })),
      },
      {
        id: 'portB',
        name: portfolioB.name,
        color: portfolioB.color,
        data: resultB.history.map((h) => ({ date: h.date, value: h.portfolioValue })),
      },
      {
        id: 'portC',
        name: portfolioC.name,
        color: portfolioC.color,
        data: resultC.history.map((h) => ({ date: h.date, value: h.portfolioValue })),
      },
    ];
  }, [resultA, resultB, resultC, portfolioA, portfolioB, portfolioC]);

  const drawdownSeries = useMemo(() => {
    return [
      {
        id: 'portA',
        name: portfolioA.name,
        color: portfolioA.color,
        data: resultA.history.map((h) => ({ date: h.date, drawdown: h.drawdown })),
      },
      {
        id: 'portB',
        name: portfolioB.name,
        color: portfolioB.color,
        data: resultB.history.map((h) => ({ date: h.date, drawdown: h.drawdown })),
      },
      {
        id: 'portC',
        name: portfolioC.name,
        color: portfolioC.color,
        data: resultC.history.map((h) => ({ date: h.date, drawdown: h.drawdown })),
      },
    ];
  }, [resultA, resultB, resultC, portfolioA, portfolioB, portfolioC]);

  const summaryPortfolios = useMemo(() => {
    return [
      { id: 'portA', name: 'Portfolio A (Growth)', color: portfolioA.color, metrics: resultA.summary },
      { id: 'portB', name: 'Portfolio B (70/30)', color: portfolioB.color, metrics: resultB.summary },
      { id: 'portC', name: 'Portfolio C (Permanent)', color: portfolioC.color, metrics: resultC.summary },
    ];
  }, [resultA, resultB, resultC, portfolioA, portfolioB, portfolioC]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Portfolio Research Terminal"
        description="Multi-asset quantitative backtesting, Markowitz efficient frontier optimization, and macro risk analysis"
        badge={<Badge variant="info">Live & Curated Store</Badge>}
      >
        <Link href="/backtest">
          <Button variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />}>
            Open Backtest Lab
          </Button>
        </Link>
        <Link href="/optimization">
          <Button variant="secondary" icon={<PieChart className="w-3.5 h-3.5" />}>
            Optimize Frontier
          </Button>
        </Link>
      </PageHeader>

      {/* Top Level Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="S&P 500 Benchmark (SPY)"
          value={formatPercent(0.1042, 2)}
          subtext="Annualized Return (2007–2026)"
          change={0.1042}
          accentColor="#94a3b8"
        />
        <MetricCard
          label="Growth Tilt (P1)"
          value={formatPercent(resultA.summary.cagr, 2)}
          subtext={`Sharpe ${formatRatio(resultA.summary.sharpeRatio, 2)} • Vol ${formatPercent(resultA.summary.annualizedVolatility, 1)}`}
          change={resultA.summary.cagr}
          accentColor="#6366f1"
        />
        <MetricCard
          label="Classic 70/30 (P2)"
          value={formatPercent(resultB.summary.cagr, 2)}
          subtext={`Sharpe ${formatRatio(resultB.summary.sharpeRatio, 2)} • Max DD ${formatPercent(resultB.summary.maxDrawdown, 1)}`}
          change={resultB.summary.cagr}
          accentColor="#10b981"
        />
        <MetricCard
          label="Permanent Portfolio (P3)"
          value={formatPercent(resultC.summary.cagr, 2)}
          subtext={`Downside Buffer • Max DD ${formatPercent(resultC.summary.maxDrawdown, 1)}`}
          change={resultC.summary.cagr}
          accentColor="#f59e0b"
        />
      </div>

      {/* Analytical Workspaces Jump Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/backtest"
          className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-850 p-4 transition-all hover:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Portfolio Backtester</h3>
          <p className="text-xs text-slate-400 mt-1">
            Compare up to 3 custom portfolios with calendar & threshold rebalancing and cash flows.
          </p>
        </Link>

        <Link
          href="/optimization"
          className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-850 p-4 transition-all hover:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <PieChart className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">MPT & Risk Parity</h3>
          <p className="text-xs text-slate-400 mt-1">
            Markowitz Efficient Frontier tracing, Equal Risk Contribution (ERC), and Black-Litterman tilt.
          </p>
        </Link>

        <Link
          href="/monte-carlo"
          className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-850 p-4 transition-all hover:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Shuffle className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Monte Carlo & Longevity</h3>
          <p className="text-xs text-slate-400 mt-1">
            5,000-path bootstrap simulation with dynamic Guyton-Klinger withdrawal guardrails.
          </p>
        </Link>

        <Link
          href="/tactical"
          className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-850 p-4 transition-all hover:border-slate-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Compass className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Tactical Strategy Lab</h3>
          <p className="text-xs text-slate-400 mt-1">
            Antonacci Dual Momentum rules, 10-month SMA trend filters, and volatility scaling.
          </p>
        </Link>
      </div>

      {/* Visual Analytics */}
      <div className="space-y-6">
        <GrowthChart series={growthSeries} height={340} />
        <DrawdownChart series={drawdownSeries} height={260} />
      </div>

      {/* Comprehensive Summary Table */}
      <SummaryMetricsCard portfolios={summaryPortfolios} />

      {/* Grounded AI Portfolio Analyst */}
      <AiPortfolioAnalyst
        portfolioName="Portfolio A (Growth Tilt)"
        result={resultA}
        benchmarkName="SPY (S&P 500)"
      />
    </div>
  );
}