'use client';

import React, { useState, useMemo } from 'react';
import { runMonteCarloSimulation, SimulationMethod, MonteCarloResult } from '@/analytics/monteCarlo';
import { CURATED_RETURNS } from '@/data/curatedData';
import { FanChart } from '@/components/charts/FanChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent } from '@/utils/formatters';

export default function MonteCarloPage() {
  const [numSimulations, setNumSimulations] = useState(2000);
  const [horizonYears, setHorizonYears] = useState(30);
  const [initialBalance, setInitialBalance] = useState(1000000);
  const [annualWithdrawal, setAnnualWithdrawal] = useState(45000);
  const [annualContribution, setAnnualContribution] = useState(0);
  const [method, setMethod] = useState<SimulationMethod>('bootstrap');
  const [inflationRate, setInflationRate] = useState(0.025);
  const [adjustInflation, setAdjustInflation] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState('SPY');

  // Asset return pool
  const historicalReturns = useMemo(() => {
    // Annual returns synthesized from monthly series
    const monthly = CURATED_RETURNS[selectedAsset] || CURATED_RETURNS['SPY'] || [];
    const annual: number[] = [];
    for (let i = 0; i < monthly.length; i += 12) {
      const slice = monthly.slice(i, i + 12);
      let comp = 1.0;
      slice.forEach((m) => (comp *= 1 + m));
      annual.push(comp - 1);
    }
    return annual;
  }, [selectedAsset]);

  // Run simulation
  const result = useMemo<MonteCarloResult>(() => {
    return runMonteCarloSimulation(
      historicalReturns,
      {
        numSimulations,
        horizonYears,
        initialBalance,
        annualContribution,
        annualWithdrawal,
        inflationRate,
        adjustCashFlowForInflation: adjustInflation,
        method,
        seed: 42,
      }
    );
  }, [historicalReturns, numSimulations, horizonYears, initialBalance, annualContribution, annualWithdrawal, inflationRate, adjustInflation, method]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Monte Carlo Simulation & Longevity"
        description="Stress-test retirement decumulation and capital longevity across 1,000–5,000 randomized return paths and sequence of returns risk."
        badge={<Badge variant="info">{numSimulations.toLocaleString()} Stochastic Paths</Badge>}
      />

      {/* Simulation Controls Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900">Simulation Parameters & Cash Flow Rules</CardTitle>
            <CardDescription className="text-slate-500">
              Configure initial capital, annual decumulation withdrawals, time horizon, and stochastic model
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Model: <strong className="text-blue-600 uppercase">{method.replace('_', ' ')}</strong>
          </span>
        </CardHeader>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Initial Capital
              </label>
              <div className="flex items-center h-9 bg-white border border-slate-200 rounded-lg px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition">
                <span className="text-slate-400 mr-1.5 font-sans">$</span>
                <input
                  type="number"
                  min="10000"
                  step="50000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 1000000)}
                  className="w-full bg-transparent font-mono text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Annual Spending
              </label>
              <div className="flex items-center h-9 bg-white border border-slate-200 rounded-lg px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition">
                <span className="text-slate-400 mr-1.5 font-sans">$</span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={annualWithdrawal}
                  onChange={(e) => setAnnualWithdrawal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent font-mono text-slate-900 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                Initial Rate: {initialBalance > 0 ? formatPercent(annualWithdrawal / initialBalance, 1) : '0.0%'}
              </span>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Time Horizon (Years)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={horizonYears}
                onChange={(e) => setHorizonYears(parseInt(e.target.value, 10) || 30)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Stochastic Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as SimulationMethod)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
              >
                <option value="bootstrap">Historical Bootstrap (Resampling)</option>
                <option value="parametric_normal">Parametric Gaussian</option>
                <option value="parametric_lognormal">Parametric Lognormal</option>
                <option value="fat_tailed">Student-t (Fat-Tailed Shocks)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Asset Return Pool
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
              >
                <option value="SPY">SPY (S&P 500 Equity)</option>
                <option value="VTI">VTI (Total US Market)</option>
                <option value="QQQ">QQQ (Tech Growth)</option>
                <option value="BND">BND (Fixed Income)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Simulation Paths
              </label>
              <select
                value={numSimulations}
                onChange={(e) => setNumSimulations(parseInt(e.target.value, 10))}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
              >
                <option value="1000">1,000 Paths</option>
                <option value="2000">2,000 Paths</option>
                <option value="5000">5,000 Paths</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="mcInfl"
                checked={adjustInflation}
                onChange={(e) => setAdjustInflation(e.target.checked)}
                className="accent-blue-600 rounded cursor-pointer h-4 w-4"
              />
              <label htmlFor="mcInfl" className="text-slate-700 font-medium cursor-pointer text-xs">
                Adjust for Inflation ({formatPercent(inflationRate, 1)})
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Probability of Survival"
          value={formatPercent(result.survivalRate, 1)}
          helperText={`Ending balance > $0 after ${horizonYears} years`}
          change={`${formatPercent(result.survivalRate, 1)}`}
          changeType={result.survivalRate >= 0.85 ? 'positive' : 'negative'}
        />

        <MetricCard
          label="Probability of Ruin"
          value={formatPercent(result.probabilityOfRuin, 1)}
          helperText="Risk of total portfolio depletion"
          change={`${formatPercent(result.probabilityOfRuin, 1)}`}
          changeType={result.probabilityOfRuin > 0.1 ? 'negative' : 'neutral'}
        />

        <MetricCard
          label="Median Ending Wealth"
          value={formatCurrency(result.medianEndingValue)}
          helperText="50th percentile nominal balance"
          change="Median"
          changeType="positive"
        />

        <MetricCard
          label="Safe Withdrawal Rate (95%)"
          value={formatPercent(result.safeWithdrawalRate || 0.04, 2)}
          helperText="Max spending for 95% survival"
          change="95% SWR"
          changeType="neutral"
        />
      </div>

      {/* Fan Chart */}
      <FanChart data={result.fanChart} height={360} />

      {/* Percentiles Breakdown Table */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900">Simulated Terminal Wealth Percentiles (Year {horizonYears})</CardTitle>
            <CardDescription className="text-slate-500">
              Statistical distribution of terminal portfolio values across all simulated paths
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-2.5 px-4 font-semibold">Percentile Confidence Band</th>
                <th className="py-2.5 px-4 text-right font-semibold">Terminal Portfolio Value</th>
                <th className="py-2.5 px-4 text-right font-semibold">Implied CAGR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {[
                { label: '95th Percentile (Super Bull)', value: result.percentiles.p95 },
                { label: '90th Percentile (Bull Scenario)', value: result.percentiles.p90 },
                { label: '75th Percentile (Optimistic)', value: result.percentiles.p75 },
                { label: '50th Percentile (Median Outcome)', value: result.percentiles.p50 },
                { label: '25th Percentile (Conservative)', value: result.percentiles.p25 },
                { label: '10th Percentile (Severe Bear)', value: result.percentiles.p10 },
                { label: '5th Percentile (Worst-Case)', value: result.percentiles.p5 },
              ].map((p) => {
                const impliedCAGR = Math.pow(Math.max(0.001, p.value / initialBalance), 1 / horizonYears) - 1;
                return (
                  <tr key={p.label} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 text-slate-700 font-sans font-medium">
                      {p.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrency(p.value)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-semibold tabular-nums ${
                        impliedCAGR >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercent(impliedCAGR, 2, true)}
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