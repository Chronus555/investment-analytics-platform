'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';
import { PortfolioMetrics } from '@/analytics/backtest';

interface TearSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioName: string;
  allocations: { symbol: string; weight: number }[];
  metrics: PortfolioMetrics;
  dates: string[];
  initialBalance: number;
}

export const TearSheetModal: React.FC<TearSheetModalProps> = ({
  isOpen,
  onClose,
  portfolioName,
  allocations,
  metrics,
  dates,
  initialBalance,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const startDate = dates[0] || '2007-01-01';
  const endDate = dates[dates.length - 1] || '2026-01-01';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden print:border-none print:bg-white print:text-slate-900 print:shadow-none">
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 print:hidden">
          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <span>Institutional Portfolio Tear Sheet</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tear Sheet Printable Content */}
        <div className="p-8 print:p-0 space-y-6 text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
                Institutional Portfolio FactSheet
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                {portfolioName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation Window: {startDate} to {endDate} ({dates.length} Monthly Periods)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-slate-700 block">
                QuantPulse Platform
              </span>
              <span className="text-[10px] text-slate-400">
                As of {new Date().toISOString().split('T')[0]}
              </span>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-[11px] font-semibold uppercase text-slate-500">CAGR</span>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
                {(metrics.cagr * 100).toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-400">Annualized Compound Return</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Volatility (σ)</span>
              <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                {(metrics.annualizedVolatility * 100).toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-400">Annualized Standard Deviation</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Sharpe Ratio</span>
              <div className="text-xl font-bold font-mono text-blue-600 mt-0.5">
                {metrics.sharpeRatio.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Excess Return / Vol (Rf = 4%)</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Max Drawdown</span>
              <div className="text-xl font-bold font-mono text-red-600 mt-0.5">
                {(metrics.maxDrawdown * 100).toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-400">Peak-to-Trough Decline</span>
            </div>
          </div>

          {/* Allocation & Risk Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Allocations Table */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Target Asset Allocations
              </h3>
              <div className="space-y-2">
                {allocations.map((a) => (
                  <div key={a.symbol} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{a.symbol}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, a.weight * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-700 w-12 text-right">
                        {(a.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comprehensive Risk Statistics */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Risk & Benchmark Analytics
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Sortino Ratio:</span>
                  <span className="font-mono text-slate-800">{metrics.sortinoRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Calmar Ratio:</span>
                  <span className="font-mono text-slate-800">{metrics.calmarRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ulcer Index:</span>
                  <span className="font-mono text-slate-800">{(metrics.ulcerIndex * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Historical VaR (95%):</span>
                  <span className="font-mono text-red-600">{(metrics.var95 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Conditional VaR (95%):</span>
                  <span className="font-mono text-red-600">{(metrics.cvar95 * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Jensen's Alpha:</span>
                  <span className="font-mono text-emerald-600">{((metrics.alpha ?? 0) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Beta to Benchmark:</span>
                  <span className="font-mono text-slate-800">{(metrics.beta ?? 1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Final Balance ($10k start):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${Math.round(metrics.finalBalance).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Disclosure Footnote */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 leading-relaxed">
            CONFIDENTIAL & PROPRIETARY. For investment analysis purposes only. Past performance does not guarantee future results.
            Backtested performance calculations reflect simulated returns, include reinvestment of dividends and capital gains, and account
            for stated expense ratios. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.
          </div>
        </div>
      </div>
    </div>
  );
};