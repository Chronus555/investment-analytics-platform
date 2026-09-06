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
    <Card className="w-full shadow-xs border-slate-200 bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-slate-900">Performance & Risk Statistics</CardTitle>
          <CardDescription className="text-slate-500">
            Institutional comparative risk-adjusted metrics across all evaluated portfolios
          </CardDescription>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
              <th className="py-2.5 px-4 font-semibold">Statistical Metric</th>
              {portfolios.map((p) => (
                <th key={p.id} className="py-2.5 px-4 text-right font-semibold">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate max-w-[160px]">{p.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
            {/* Category 1: Returns & Growth */}
            <tr className="bg-slate-100/50">
              <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                Wealth & Returns
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">Initial Capital</td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-600">
                  {formatCurrency(p.metrics.initialBalance)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-900 font-sans font-semibold">Final Balance</td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-emerald-600 font-bold">
                  {formatCurrency(p.metrics.finalBalance)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">Total Return</td>
              {portfolios.map((p) => (
                <td
                  key={p.id}
                  className={`py-2 px-4 text-right font-semibold ${
                    p.metrics.totalReturn >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatPercent(p.metrics.totalReturn, 2, true)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-700 font-sans font-medium">
                <MetricTooltip metricKey="cagr">CAGR (Compound Annual Growth)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-bold text-blue-600">
                  {formatPercent(p.metrics.cagr, 2)}
                </td>
              ))}
            </tr>

            {/* Category 2: Volatility & Downside Risk */}
            <tr className="bg-slate-100/50">
              <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                Volatility & Tail Risk
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                <MetricTooltip metricKey="volatility">Annualized Volatility (σ)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-800">
                  {formatPercent(p.metrics.annualizedVolatility, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-700 font-sans font-medium">
                <MetricTooltip metricKey="maxDrawdown">Maximum Drawdown</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-bold text-red-600">
                  {formatPercent(p.metrics.maxDrawdown, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                <MetricTooltip metricKey="ulcerIndex">Ulcer Index</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-700">
                  {formatPercent(p.metrics.ulcerIndex, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                <MetricTooltip metricKey="var95">Historical VaR (95%)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-red-600">
                  -{formatPercent(p.metrics.var95, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                <MetricTooltip metricKey="cvar95">Conditional VaR (CVaR 95%)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-red-600 font-medium">
                  -{formatPercent(p.metrics.cvar95, 2)}
                </td>
              ))}
            </tr>

            {/* Category 3: Risk-Adjusted Ratios */}
            <tr className="bg-slate-100/50">
              <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                Risk-Adjusted Ratios
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-700 font-sans font-medium">
                <MetricTooltip metricKey="sharpeRatio">Sharpe Ratio (Rf = 4%)</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-bold text-emerald-700">
                  {formatRatio(p.metrics.sharpeRatio, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                <MetricTooltip metricKey="sortinoRatio">Sortino Ratio</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right font-semibold text-blue-700">
                  {formatRatio(p.metrics.sortinoRatio, 2)}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                <MetricTooltip metricKey="calmarRatio">Calmar Ratio</MetricTooltip>
              </td>
              {portfolios.map((p) => (
                <td key={p.id} className="py-2 px-4 text-right text-slate-800">
                  {formatRatio(p.metrics.calmarRatio, 2)}
                </td>
              ))}
            </tr>

            {/* Category 4: Benchmark Comparison */}
            {portfolios.some((p) => p.metrics.beta !== undefined) && (
              <>
                <tr className="bg-slate-100/50">
                  <td colSpan={portfolios.length + 1} className="py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                    Benchmark Attribution
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                    <MetricTooltip metricKey="beta">Beta (Sensitivity)</MetricTooltip>
                  </td>
                  {portfolios.map((p) => (
                    <td key={p.id} className="py-2 px-4 text-right text-slate-800">
                      {p.metrics.beta !== undefined ? formatRatio(p.metrics.beta, 2) : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-4 text-slate-600 font-sans font-medium">
                    <MetricTooltip metricKey="alpha">Jensen's Alpha</MetricTooltip>
                  </td>
                  {portfolios.map((p) => (
                    <td
                      key={p.id}
                      className={`py-2 px-4 text-right font-semibold ${
                        (p.metrics.alpha || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
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