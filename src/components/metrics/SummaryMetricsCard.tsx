'use client';

import React from 'react';
import { BacktestSummaryMetrics } from '@/analytics/backtest';
import { MetricTooltip } from './MetricTooltip';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { formatCurrency, formatPercent, formatRatio } from '@/utils/formatters';

export interface PortfolioSummaryComparison {
  id: string;
  name: string;
  color: string;
  metrics: BacktestSummaryMetrics;
}

export function SummaryMetricsCard({ portfolios }: { portfolios: PortfolioSummaryComparison[] }) {
  if (!portfolios || portfolios.length === 0) return null;

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div>
          <CardTitle>Performance & Risk Statistics</CardTitle>
          <CardDescription>
            Institutional comparative risk-adjusted metrics across all evaluated portfolios
          </CardDescription>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-800/80 text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-slate-950/40">
              <th className="py-2.5 px-4 font-medium">Statistical Metric</th>
              {portfolios.map((p) => (
                <th key={p.id} className="py-2.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate max-w-[160px]">{p.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono text-[12px]">
            {/* Category 1: Returns & Growth */}
            <tr className="bg-slate-950/20">
              <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Wealth & Returns
              </td>
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">Initial Capital</td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-400">
                  {formatCurrency(p.metrics.initialBalance)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-100 font-sans font-semibold">Final Balance</td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-emerald-400 font-bold">
                  {formatCurrency(p.metrics.finalBalance)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">Total Return</td>
              {portfolios.map((p) => (
                <td
                  key={p.id}
                  className={`py-2 px-4 text-right ${
                    p.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatPercent(p.metrics.totalReturn, 2, true)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="cagr">CAGR (Compound Annual Growth)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-bold text-indigo-400">
                  {formatPercent(p.metrics.cagr, 2)}
                </td>
              ))}
            </tr>

            {/* Category 2: Volatility & Downside Risk */}
            <tr className="bg-slate-950/20">
              <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Volatility & Tail Risk
              </td>
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="volatility">Annualized Volatility (σ)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-200">
                  {formatPercent(p.metrics.annualizedVolatility, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="maxDrawdown">Maximum Drawdown</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-bold text-rose-400">
                  {formatPercent(p.metrics.maxDrawdown, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="ulcerIndex">Ulcer Index</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-300">
                  {formatPercent(p.metrics.ulcerIndex, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="var95">Historical VaR (95%)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-rose-400/90">
                  -{formatPercent(p.metrics.var95, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="cvar95">Conditional VaR (CVaR 95%)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-rose-400">
                  -{formatPercent(p.metrics.cvar95, 2)}
                </td>
              ))}
            </tr>

            {/* Category 3: Risk-Adjusted Ratios */}
            <tr className="bg-slate-950/20">
              <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Risk-Adjusted Ratios
              </td>
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="sharpeRatio">Sharpe Ratio (Rf = 4%)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-bold text-emerald-400">
                  {formatRatio(p.metrics.sharpeRatio, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="sortinoRatio">Sortino Ratio</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-teal-400">
                  {formatRatio(p.metrics.sortinoRatio, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-850/30 transition-colors">
              <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                <MetricTooltip metricKey="calmarRatio">Calmar Ratio</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-200">
                  {formatRatio(p.metrics.calmarRatio, 2)}
                </td>
              ))}
            </tr>

            {/* Category 4: Benchmark Comparison */}
            {portfolios.some((p) => p.metrics.beta !== undefined) && (
              <>
                <tr className="bg-slate-950/20">
                  <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                    Benchmark Attribution
                  </td>
                </tr>
                <tr className="hover:bg-slate-850/30 transition-colors">
                  <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                    <MetricTooltip metricKey="beta">Beta (Sensitivity)</MetricTooltip>
                  </td>
                  {portfolios.map((p) => (
                    <td key={p.id} className="py-2 px-4 text-right text-slate-300">
                      {p.metrics.beta !== undefined ? formatRatio(p.metrics.beta, 2) : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-850/30 transition-colors">
                  <td className="py-2 px-4 text-slate-300 font-sans font-medium">
                    <MetricTooltip metricKey="alpha">Jensen's Alpha</MetricTooltip>
                  </td>
                  {portfolios.map((p) => (
                    <td
                      key={p.id}
                      className={`py-2 px-4 text-right ${
                        (p.metrics.alpha || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {p.metrics.alpha !== undefined ? formatPercent(p.metrics.alpha, 2, true) : '-'}
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}