'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  PieChart,
  BarChart3,
  Shuffle,
  Compass,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { runBacktest, AssetPeriodReturn, BacktestResult } from '@/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { SummaryMetricsCard } from '@/components/metrics/SummaryMetricsCard';
import { AiPortfolioAnalyst } from '@/components/ai/AiPortfolioAnalyst';
import { PageHeader } from '@/components/ui/PageHeader';
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
    color: '#2563eb', // Blue
  });

  const [portfolioB] = useState({
    name: 'Classic 70/30 (Portfolio B)',
    assets: [
      { symbol: 'VTI', weight: 0.70 },
      { symbol: 'BND', weight: 0.30 },
    ],
    color: '#16a34a', // Emerald
  });

  const [portfolioC] = useState({
    name: 'Permanent Portfolio (Portfolio C)',
    assets: [
      { symbol: 'VTI', weight: 0.25 },
      { symbol: 'TLT', weight: 0.25 },
      { symbol: 'GLD', weight: 0.25 },
      { symbol: 'BIL', weight: 0.25 },
    ],
    color: '#d97706', // Amber
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
      {/* Hero Header with 3 Quick Action Buttons */}
      <PageHeader
        title="Portfolio Research Terminal"
        description="Multi-asset quantitative backtesting, Markowitz efficient frontier optimization, and macro risk analysis"
        badge={<Badge variant="info">Curated Multi-Asset Store</Badge>}
      >
        <Link href="/backtest">
          <Button variant="primary" size="md" icon={<BarChart3 className="w-3.5 h-3.5" />}>
            Open Backtest
          </Button>
        </Link>
        <Link href="/optimization">
          <Button variant="secondary" size="md" icon={<PieChart className="w-3.5 h-3.5" />}>
            Optimize Portfolio
          </Button>
        </Link>
        <Link href="/monte-carlo">
          <Button variant="secondary" size="md" icon={<Shuffle className="w-3.5 h-3.5" />}>
            Run Monte Carlo
          </Button>
        </Link>
      </PageHeader>

      {/* Top Level Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="S&P 500 Benchmark (SPY)"
          value={formatPercent(0.1042, 2)}
          helperText="Annualized Return (2007–2026)"
          change="+10.4%"
          changeType="positive"
        />
        <MetricCard
          label="Growth Tilt (Portfolio A)"
          value={formatPercent(resultA.summary.cagr, 2)}
          helperText={`Sharpe ${formatRatio(resultA.summary.sharpeRatio, 2)} • Vol ${formatPercent(resultA.summary.annualizedVolatility, 1)}`}
          change={`${formatPercent(resultA.summary.cagr, 1)}`}
          changeType="positive"
        />
        <MetricCard
          label="Classic 70/30 (Portfolio B)"
          value={formatPercent(resultB.summary.cagr, 2)}
          helperText={`Sharpe ${formatRatio(resultB.summary.sharpeRatio, 2)} • Max DD ${formatPercent(resultB.summary.maxDrawdown, 1)}`}
          change={`${formatPercent(resultB.summary.cagr, 1)}`}
          changeType="positive"
        />
        <MetricCard
          label="Permanent Portfolio (Portfolio C)"
          value={formatPercent(resultC.summary.cagr, 2)}
          helperText={`Downside Buffer • Max DD ${formatPercent(resultC.summary.maxDrawdown, 1)}`}
          change={`${formatPercent(resultC.summary.cagr, 1)}`}
          changeType="positive"
        />
      </div>

      {/* Analytical Workspaces Jump Grid (Clickable Feature Module Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/backtest"
          className="group rounded-xl border border-slate-200 bg-white p-4.5 transition-all hover:border-slate-300 hover:shadow-md shadow-xs no-underline"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <BarChart3 className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            Portfolio Backtester
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Compare up to 3 custom portfolios with calendar & threshold rebalancing and cash flows.
          </p>
        </Link>

        <Link
          href="/optimization"
          className="group rounded-xl border border-slate-200 bg-white p-4.5 transition-all hover:border-slate-300 hover:shadow-md shadow-xs no-underline"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <PieChart className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
            MPT & Risk Parity
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Markowitz Efficient Frontier tracing, Equal Risk Contribution (ERC), and Black-Litterman tilt.
          </p>
        </Link>

        <Link
          href="/monte-carlo"
          className="group rounded-xl border border-slate-200 bg-white p-4.5 transition-all hover:border-slate-300 hover:shadow-md shadow-xs no-underline"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Shuffle className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
            Monte Carlo & Longevity
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            5,000-path stochastic simulation with percentile wealth distribution fan charts.
          </p>
        </Link>

        <Link
          href="/retirement"
          className="group rounded-xl border border-slate-200 bg-white p-4.5 transition-all hover:border-slate-300 hover:shadow-md shadow-xs no-underline"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Retirement Decumulation Lab
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Guyton-Klinger guardrails, Bengel 4% rule, Social Security offsets, and SWR curves.
          </p>
        </Link>

        <Link
          href="/screener"
          className="group rounded-xl border border-slate-200 bg-white p-4.5 transition-all hover:border-slate-300 hover:shadow-md shadow-xs no-underline"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Filter className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Fund & ETF Screener
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Multi-factor screening across 26 benchmark ETFs with 1-click backtest integration.
          </p>
        </Link>

        <Link
          href="/tactical"
          className="group rounded-xl border border-slate-200 bg-white p-4.5 transition-all hover:border-slate-300 hover:shadow-md shadow-xs no-underline"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Compass className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
            Tactical Strategy Lab
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
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