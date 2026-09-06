'use client';

import React, { useState, useMemo } from 'react';
import { runMonteCarloSimulation, SimulationMethod, MonteCarloResult } from '@/analytics/monteCarlo';
import { CURATED_RETURNS } from '@/data/curatedData';
import { FanChart } from '@/components/charts/FanChart';
import { Shuffle, ShieldCheck, DollarSign, Calendar, Sliders, TrendingUp, AlertTriangle } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Monte Carlo Simulation & Retirement Longevity
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Stress-test portfolio survival across thousands of simulated market paths, sequence of returns risk, and safe withdrawal rates
        </p>
      </div>

      {/* Simulation Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" /> Simulation Parameters
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Method: <strong className="text-sky-400 uppercase">{method.replace('_', ' ')}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Initial Portfolio Capital ($)</label>
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 mr-1">$</span>
              <input
                type="number"
                min="10000"
                step="50000"
                value={initialBalance}
                onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 1000000)}
                className="w-full bg-transparent font-mono text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Annual Spending / Withdrawal ($)</label>
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-500 mr-1">$</span>
              <input
                type="number"
                min="0"
                step="5000"
                value={annualWithdrawal}
                onChange={(e) => setAnnualWithdrawal(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent font-mono text-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 inline-block">
              Initial withdrawal rate: {initialBalance > 0 ? ((annualWithdrawal / initialBalance) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Time Horizon (Years)</label>
            <input
              type="number"
              min="5"
              max="50"
              value={horizonYears}
              onChange={(e) => setHorizonYears(parseInt(e.target.value, 10) || 30)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Simulation Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as SimulationMethod)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="bootstrap">Historical Bootstrap (Resampling)</option>
              <option value="parametric_normal">Parametric Gaussian</option>
              <option value="parametric_lognormal">Parametric Lognormal</option>
              <option value="fat_tailed">Student-t (Fat-Tailed Shocks)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Underlying Asset Return Pool</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            >
              <option value="SPY">SPY (S&P 500 Equity)</option>
              <option value="VTI">VTI (Total US Market)</option>
              <option value="QQQ">QQQ (Tech Growth)</option>
              <option value="BND">BND (Fixed Income)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Simulated Paths</label>
            <select
              value={numSimulations}
              onChange={(e) => setNumSimulations(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
            >
              <option value="1000">1,000 Paths</option>
              <option value="2000">2,000 Paths</option>
              <option value="5000">5,000 Paths</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="mcInfl"
              checked={adjustInflation}
              onChange={(e) => setAdjustInflation(e.target.checked)}
              className="accent-amber-400 rounded cursor-pointer"
            />
            <label htmlFor="mcInfl" className="text-slate-300 font-medium cursor-pointer">
              Index Withdrawals to Inflation ({(inflationRate * 100).toFixed(1)}%)
            </label>
          </div>
        </div>
      </div>

      {/* Primary KPI Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Survival Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Probability of Survival</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {(result.survivalRate * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500">
            Simulations with ending balance &gt; $0 after {horizonYears} years
          </p>
        </div>

        {/* Probability of Ruin */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Probability of Ruin</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {(result.probabilityOfRuin * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500">Risk of total depletion before year {horizonYears}</p>
        </div>

        {/* Median Ending Wealth */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Median Ending Wealth</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">
            ${Math.round(result.medianEndingValue).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">50th percentile nominal portfolio balance</p>
        </div>

        {/* Safe Withdrawal Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Safe Withdrawal Rate (95%)</span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-teal-400">
            {result.safeWithdrawalRate ? `${(result.safeWithdrawalRate * 100).toFixed(2)}%` : '4.00%'}
          </div>
          <p className="text-[11px] text-slate-500">Max initial spending preserving 95% survival</p>
        </div>
      </div>

      {/* Fan Chart */}
      <FanChart data={result.fanChart} height={360} />

      {/* Percentiles Breakdown Table */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-white tracking-wide">
            Simulated Ending Wealth Percentiles (Year {horizonYears})
          </h3>
          <p className="text-xs text-slate-400">Distribution of simulated portfolio terminal values</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Percentile</th>
                <th className="py-2.5 px-3 text-right">Ending Portfolio Value</th>
                <th className="py-2.5 px-3 text-left">Outcome Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 font-semibold text-rose-400">5th Percentile (Severe Crash)</td>
                <td className="py-2 px-3 text-right font-bold text-rose-300">
                  ${Math.round(result.percentiles.p5).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans">
                  Worst 5% market regimes (prolonged stagnation or deep bear market)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 font-semibold text-rose-300">10th Percentile (Stress Test)</td>
                <td className="py-2 px-3 text-right font-bold text-rose-200">
                  ${Math.round(result.percentiles.p10).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans">Conservative planning baseline floor</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 font-semibold text-amber-300">25th Percentile</td>
                <td className="py-2 px-3 text-right font-bold text-amber-200">
                  ${Math.round(result.percentiles.p25).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans">Below-average market performance</td>
              </tr>
              <tr className="hover:bg-slate-800/30 bg-slate-950/40">
                <td className="py-2.5 px-3 font-bold text-emerald-400">50th Percentile (Median)</td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-300 text-sm">
                  ${Math.round(result.percentiles.p50).toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">
                  Expected middle outcome (50% performed better, 50% worse)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 font-semibold text-sky-300">75th Percentile</td>
                <td className="py-2 px-3 text-right font-bold text-sky-200">
                  ${Math.round(result.percentiles.p75).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans">Above-average market expansion</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 font-semibold text-teal-300">90th Percentile</td>
                <td className="py-2 px-3 text-right font-bold text-teal-200">
                  ${Math.round(result.percentiles.p90).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans">Strong multi-decade economic expansion</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 font-semibold text-teal-400">95th Percentile (Boom)</td>
                <td className="py-2 px-3 text-right font-bold text-teal-300">
                  ${Math.round(result.percentiles.p95).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-slate-400 font-sans">Top 5% optimal sequence of returns</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
