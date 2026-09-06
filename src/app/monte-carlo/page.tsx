'use client';

import React, { useState, useMemo } from 'react';
import { runMonteCarloSimulation, SimulationMethod, MonteCarloResult } from '@/analytics/monteCarlo';
import { CURATED_RETURNS } from '@/data/curatedData';
import { FanChart } from '@/components/charts/FanChart';
import { Shuffle, ShieldCheck, DollarSign, Calendar, Sliders, TrendingUp, AlertTriangle } from 'lucide-react';
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
      <Card className="shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Simulation Parameters & Cash Flow Rules</CardTitle>
            <CardDescription>
              Configure initial capital, annual decumulation withdrawals, time horizon, and stochastic model
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Model: <strong className="text-indigo-400 uppercase">{method.replace('_', ' ')}</strong>
          </span>
        </CardHeader>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Initial Capital
              </label>
              <div className="flex items-center h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 focus-within:border-indigo-500 transition">
                <span className="text-slate-500 mr-1.5">$</span>
                <input
                  type="number"
                  min="10000"
                  step="50000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 1000000)}
                  className="w-full bg-transparent font-mono text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Annual Spending
              </label>
              <div className="flex items-center h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 focus-within:border-indigo-500 transition">
                <span className="text-slate-500 mr-1.5">$</span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={annualWithdrawal}
                  onChange={(e) => setAnnualWithdrawal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent font-mono text-slate-100 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                Initial Rate: {initialBalance > 0 ? formatPercent(annualWithdrawal / initialBalance, 1) : '0.0%'}
              </span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Time Horizon (Years)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={horizonYears}
                onChange={(e) => setHorizonYears(parseInt(e.target.value, 10) || 30)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Stochastic Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as SimulationMethod)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="bootstrap">Historical Bootstrap (Resampling)</option>
                <option value="parametric_normal">Parametric Gaussian</option>
                <option value="parametric_lognormal">Parametric Lognormal</option>
                <option value="fat_tailed">Student-t (Fat-Tailed Shocks)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Asset Return Pool
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
              >
                <option value="SPY">SPY (S&P 500 Equity)</option>
                <option value="VTI">VTI (Total US Market)</option>
                <option value="QQQ">QQQ (Tech Growth)</option>
                <option value="BND">BND (Fixed Income)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Simulation Paths
              </label>
              <select
                value={numSimulations}
                onChange={(e) => setNumSimulations(parseInt(e.target.value, 10))}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
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
                className="accent-indigo-500 rounded cursor-pointer h-4 w-4"
              />
              <label htmlFor="mcInfl" className="text-slate-300 font-medium cursor-pointer text-xs">
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
          subtext={`Ending balance > $0 after ${horizonYears} years`}
          change={result.survivalRate - 0.90}
          accentColor="#10b981"
        />

        <MetricCard
          label="Probability of Ruin"
          value={formatPercent(result.probabilityOfRuin, 1)}
          subtext={`Risk of total portfolio depletion`}
          trend={result.probabilityOfRuin > 0.1 ? 'down' : 'neutral'}
          accentColor="#f43f5e"
        />

        <MetricCard
          label="Median Ending Wealth"
          value={formatCurrency(result.medianEndingValue)}
          subtext="50th percentile nominal portfolio balance"
          trend="up"
          accentColor="#6366f1"
        />

        <MetricCard
          label="Safe Withdrawal Rate (95%)"
          value={formatPercent(result.safeWithdrawalRate || 0.04, 2)}
          subtext="Max initial spending preserving 95% survival"
          accentColor="#00b4d8"
        />
      </div>

      {/* Fan Chart */}
      <FanChart data={result.fanChart} height={360} />

      {/* Percentiles Breakdown Table */}
      <Card className="shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Simulated Terminal Wealth Percentiles (Year {horizonYears})</CardTitle>
            <CardDescription>
              Statistical distribution of terminal portfolio values across all simulated paths
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[10px] uppercase font-mono tracking-wider text-slate-400 bg-slate-950/40">
                <th className="py-2.5 px-4 font-medium">Percentile Confidence Band</th>
                <th className="py-2.5 px-4 text-right font-medium">Terminal Portfolio Value</th>
                <th className="py-2.5 px-4 text-right font-medium">Implied CAGR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[12px]">
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
                  <tr key={p.label} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2.5 px-4 text-slate-300 font-sans font-medium">
                      {p.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-100 tabular-nums">
                      {formatCurrency(p.value)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-semibold tabular-nums ${
                        impliedCAGR >= 0 ? 'text-emerald-400' : 'text-rose-400'
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