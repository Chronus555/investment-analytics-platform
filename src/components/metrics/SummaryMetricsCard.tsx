'use client';

import React from 'react';
import { BacktestSummaryMetrics } from '@/analytics/backtest';
import { MetricTooltip } from './MetricTooltip';

export interface PortfolioSummaryComparison {
  id: string;
  name: string;
  color: string;
  metrics: BacktestSummaryMetrics;
}

export function SummaryMetricsCard({ portfolios }: { portfolios: PortfolioSummaryComparison[] }) {
  if (!portfolios || portfolios.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl overflow-x-auto">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white tracking-wide">Performance & Risk Summary</h3>
        <p className="text-xs text-slate-400">Institutional quantitative metrics comparison across portfolios</p>
      </div>

      <table className="w-full text-xs text-left border-collapse min-w-[650px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="py-2.5 px-3 font-semibold">Metric</th>
            {portfolios.map((p) => (
              <th key={p.id} className="py-2.5 px-3 text-right">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50 font-mono">
          {/* Wealth */}
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">Initial Balance</td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-slate-300">
                ${p.metrics.initialBalance.toLocaleString()}
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20 font-semibold">
            <td className="py-2 px-3 text-white font-sans">Final Balance</td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-emerald-400">
                ${Math.round(p.metrics.finalBalance).toLocaleString()}
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">Total Return</td>
            {portfolios.map((p) => (
              <td
                key={p.id}
                className={`py-2 px-3 text-right ${
                  p.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(p.metrics.totalReturn * 100).toFixed(2)}%
              </td>
            ))}
          </tr>

          {/* CAGR */}
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="cagr">CAGR (Annualized Return)</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right font-bold text-sky-400">
                {(p.metrics.cagr * 100).toFixed(2)}%
              </td>
            ))}
          </tr>

          {/* Volatility */}
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="volatility">Annualized Volatility (StDev)</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-slate-200">
                {(p.metrics.annualizedVolatility * 100).toFixed(2)}%
              </td>
            ))}
          </tr>

          {/* Risk-Adjusted Ratios */}
          <tr className="hover:bg-slate-800/20 bg-slate-950/40">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="sharpeRatio">Sharpe Ratio</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right font-bold text-emerald-400">
                {p.metrics.sharpeRatio.toFixed(2)}
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20 bg-slate-950/40">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="sortinoRatio">Sortino Ratio</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-teal-400">
                {p.metrics.sortinoRatio.toFixed(2)}
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20 bg-slate-950/40">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="calmarRatio">Calmar Ratio</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-slate-200">
                {p.metrics.calmarRatio.toFixed(2)}
              </td>
            ))}
          </tr>

          {/* Drawdowns */}
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="maxDrawdown">Max Drawdown</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right font-bold text-rose-400">
                {(p.metrics.maxDrawdown * 100).toFixed(2)}%
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="ulcerIndex">Ulcer Index</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-slate-300">
                {p.metrics.ulcerIndex.toFixed(2)}
              </td>
            ))}
          </tr>

          {/* Tail Risk */}
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="var95">Historical VaR (95%)</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-rose-300">
                -{(p.metrics.var95 * 100).toFixed(2)}%
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">
              <MetricTooltip metricKey="cvar95">Conditional VaR (CVaR 95%)</MetricTooltip>
            </td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-rose-400">
                -{(p.metrics.cvar95 * 100).toFixed(2)}%
              </td>
            ))}
          </tr>

          {/* Extremes */}
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">Best Year</td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-emerald-400">
                {(p.metrics.bestYear.return * 100).toFixed(2)}% ({p.metrics.bestYear.year})
              </td>
            ))}
          </tr>
          <tr className="hover:bg-slate-800/20">
            <td className="py-2 px-3 text-slate-300 font-sans font-medium">Worst Year</td>
            {portfolios.map((p) => (
              <td key={p.id} className="py-2 px-3 text-right text-rose-400">
                {(p.metrics.worstYear.return * 100).toFixed(2)}% ({p.metrics.worstYear.year})
              </td>
            ))}
          </tr>

          {/* Benchmark regressions */}
          {portfolios.some((p) => p.metrics.beta !== undefined) && (
            <>
              <tr className="hover:bg-slate-800/20 bg-slate-950/30">
                <td className="py-2 px-3 text-slate-300 font-sans font-medium">
                  <MetricTooltip metricKey="beta">Beta (vs Benchmark)</MetricTooltip>
                </td>
                {portfolios.map((p) => (
                  <td key={p.id} className="py-2 px-3 text-right text-slate-300">
                    {p.metrics.beta !== undefined ? p.metrics.beta.toFixed(2) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/20 bg-slate-950/30">
                <td className="py-2 px-3 text-slate-300 font-sans font-medium">
                  <MetricTooltip metricKey="alpha">Jensen's Alpha</MetricTooltip>
                </td>
                {portfolios.map((p) => (
                  <td
                    key={p.id}
                    className={`py-2 px-3 text-right ${
                      (p.metrics.alpha || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {p.metrics.alpha !== undefined ? `${(p.metrics.alpha * 100).toFixed(2)}%` : '-'}
                  </td>
                ))}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
