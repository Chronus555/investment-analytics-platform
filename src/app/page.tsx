'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Shuffle,
  PieChart,
  BarChart3,
  Sliders,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { runBacktest, AssetPeriodReturn, BacktestResult } from '@/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { SummaryMetricsCard } from '@/components/metrics/SummaryMetricsCard';
import { AiPortfolioAnalyst } from '@/components/ai/AiPortfolioAnalyst';

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
    color: '#38bdf8', // Sky
  });

  const [portfolioB] = useState({
    name: 'Classic 70/30 (Portfolio B)',
    assets: [
      { symbol: 'VTI', weight: 0.70 },
      { symbol: 'BND', weight: 0.30 },
    ],
    color: '#34d399', // Emerald
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
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 border border-slate-800 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="max-w-3xl space-y-3 z-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Institutional Portfolio Engine Active
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Original Modern Investment Analytics
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Professional multi-asset backtesting, Markowitz efficient frontier optimization, Equal Risk Parity, Monte Carlo ruin modeling, and grounded AI portfolio intelligence.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/backtest"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
            >
              Open Portfolio Lab <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/optimization"
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all flex items-center gap-2"
            >
              <PieChart className="w-4 h-4 text-teal-400" /> Optimize Frontiers
            </Link>
            <Link
              href="/monte-carlo"
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4 text-amber-400" /> Monte Carlo Lab
            </Link>
          </div>
        </div>
      </div>

      {/* Market Monitor - Benchmark Portfolios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" /> Benchmark Portfolio Monitor
          </h2>
          <span className="text-xs text-slate-500 font-mono">2007 – 2026 Live Historical Simulation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Portfolio A (Growth Tilt)</span>
              <span className="font-mono text-sky-400 font-bold">{(resultA.summary.cagr * 100).toFixed(1)}% CAGR</span>
            </div>
            <div className="text-[11px] text-slate-400">SPY 50%, QQQ 20%, AVUV 10%, TLT 10%, GLD 10%</div>
            <div className="flex justify-between text-xs font-mono pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">Sharpe: <strong className="text-white">{resultA.summary.sharpeRatio.toFixed(2)}</strong></span>
              <span className="text-slate-400">Max DD: <strong className="text-rose-400">{(resultA.summary.maxDrawdown * 100).toFixed(1)}%</strong></span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Portfolio B (Classic 70/30)</span>
              <span className="font-mono text-emerald-400 font-bold">{(resultB.summary.cagr * 100).toFixed(1)}% CAGR</span>
            </div>
            <div className="text-[11px] text-slate-400">VTI 70%, BND 30%</div>
            <div className="flex justify-between text-xs font-mono pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">Sharpe: <strong className="text-white">{resultB.summary.sharpeRatio.toFixed(2)}</strong></span>
              <span className="text-slate-400">Max DD: <strong className="text-rose-400">{(resultB.summary.maxDrawdown * 100).toFixed(1)}%</strong></span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">Portfolio C (Permanent)</span>
              <span className="font-mono text-amber-400 font-bold">{(resultC.summary.cagr * 100).toFixed(1)}% CAGR</span>
            </div>
            <div className="text-[11px] text-slate-400">VTI 25%, TLT 25%, GLD 25%, BIL 25%</div>
            <div className="flex justify-between text-xs font-mono pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">Sharpe: <strong className="text-white">{resultC.summary.sharpeRatio.toFixed(2)}</strong></span>
              <span className="text-slate-400">Max DD: <strong className="text-emerald-400">{(resultC.summary.maxDrawdown * 100).toFixed(1)}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="space-y-6">
        <GrowthChart series={growthSeries} height={360} />
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
