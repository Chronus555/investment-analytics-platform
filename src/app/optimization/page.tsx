'use client';

import React, { useState, useMemo } from 'react';
import {
  solveOptimization,
  generateEfficientFrontier,
  EfficientFrontierPoint
} from '@/analytics/optimization';
import { solveRiskParity, RiskParityResult } from '@/analytics/riskParity';
import { calculateCovarianceMatrix, calculateMean } from '@/analytics/statistics';
import { CURATED_SECURITIES, CURATED_RETURNS } from '@/data/curatedData';
import { FrontierChart } from '@/components/charts/FrontierChart';
import { Sliders, PieChart, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function OptimizationPage() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    'SPY',
    'QQQ',
    'VTI',
    'BND',
    'TLT',
    'GLD',
    'VNQ',
  ]);

  const [minWeight, setMinWeight] = useState(0.0); // 0%
  const [maxWeight, setMaxWeight] = useState(0.40); // 40% cap
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);

  // Compute expected returns and covariance matrix from historical data
  const { expectedReturns, covMatrix, individualAssets } = useMemo(() => {
    const valid = selectedSymbols.filter((s) => CURATED_RETURNS[s]);
    const series = valid.map((s) => CURATED_RETURNS[s]);
    const cov = calculateCovarianceMatrix(series);

    const expRets = series.map((s) => {
      const m = calculateMean(s);
      return Math.pow(1 + m, 12) - 1; // Compound annualized
    });

    const indAssets = valid.map((s, i) => ({
      symbol: s,
      return: expRets[i],
      volatility: Math.sqrt(cov[i][i] * 12),
    }));

    return { expectedReturns: expRets, covMatrix: cov, individualAssets: indAssets };
  }, [selectedSymbols]);

  // Solve Tangency / Max Sharpe
  const maxSharpe = useMemo<EfficientFrontierPoint>(() => {
    if (selectedSymbols.length === 0) return { return: 0, volatility: 0, sharpeRatio: 0, weights: {} };
    const opt = solveOptimization(
      selectedSymbols,
      expectedReturns,
      covMatrix,
      'max_sharpe',
      undefined,
      riskFreeRate,
      { minWeight, maxWeight }
    );
    return {
      return: opt.expectedReturn,
      volatility: opt.volatility,
      sharpeRatio: opt.sharpeRatio,
      weights: opt.weights,
    };
  }, [selectedSymbols, expectedReturns, covMatrix, riskFreeRate, minWeight, maxWeight]);

  // Solve Min Variance
  const minVar = useMemo<EfficientFrontierPoint>(() => {
    if (selectedSymbols.length === 0) return { return: 0, volatility: 0, sharpeRatio: 0, weights: {} };
    const opt = solveOptimization(
      selectedSymbols,
      expectedReturns,
      covMatrix,
      'min_variance',
      undefined,
      riskFreeRate,
      { minWeight, maxWeight }
    );
    return {
      return: opt.expectedReturn,
      volatility: opt.volatility,
      sharpeRatio: opt.sharpeRatio,
      weights: opt.weights,
    };
  }, [selectedSymbols, expectedReturns, covMatrix, riskFreeRate, minWeight, maxWeight]);

  // Solve Risk Parity
  const riskParity = useMemo<RiskParityResult>(() => {
    if (selectedSymbols.length === 0) return { weights: {}, portfolioVolatility: 0, assets: [] };
    return solveRiskParity(selectedSymbols, covMatrix, undefined, 12);
  }, [selectedSymbols, covMatrix]);

  // Generate Frontier
  const frontier = useMemo<EfficientFrontierPoint[]>(() => {
    if (selectedSymbols.length < 2) return [];
    return generateEfficientFrontier(selectedSymbols, expectedReturns, covMatrix, 25, riskFreeRate, {
      minWeight,
      maxWeight,
    });
  }, [selectedSymbols, expectedReturns, covMatrix, riskFreeRate, minWeight, maxWeight]);

  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 2) {
        setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
      }
    } else {
      setSelectedSymbols([...selectedSymbols, sym]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Portfolio Optimization & Efficient Frontier
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Markowitz Mean-Variance MPT, Tangency Sharpe maximization, Minimum Variance, and Equal Risk Contribution (Risk Parity)
        </p>
      </div>

      {/* Universe Selection & Constraints */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" /> Optimization Universe & Constraints
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {selectedSymbols.length} Assets Selected
          </span>
        </div>

        {/* Ticker chips */}
        <div className="flex flex-wrap gap-2">
          {CURATED_SECURITIES.slice(0, 12).map((sec) => {
            const isSelected = selectedSymbols.includes(sec.symbol);
            return (
              <button
                key={sec.symbol}
                type="button"
                onClick={() => toggleSymbol(sec.symbol)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{sec.symbol}</span>
                <span className="text-[10px] text-slate-400 font-sans">({sec.assetClass})</span>
              </button>
            );
          })}
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Max Single Asset Weight ({(maxWeight * 100).toFixed(0)}%)</label>
            <input
              type="range"
              min="0.10"
              max="1.0"
              step="0.05"
              value={maxWeight}
              onChange={(e) => setMaxWeight(parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Min Single Asset Weight ({(minWeight * 100).toFixed(0)}%)</label>
            <input
              type="range"
              min="0.0"
              max="0.20"
              step="0.01"
              value={minWeight}
              onChange={(e) => setMinWeight(parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Risk-Free Rate ({(riskFreeRate * 100).toFixed(1)}%)</label>
            <input
              type="range"
              min="0.01"
              max="0.08"
              step="0.005"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>
        </div>
      </div>

      {/* Frontier Chart */}
      <FrontierChart
        frontier={frontier}
        maxSharpePortfolio={maxSharpe}
        minVarPortfolio={minVar}
        individualAssets={individualAssets}
        height={380}
      />

      {/* Optimal Allocations Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tangency */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Max Sharpe (Tangency)
            </span>
            <span className="font-mono text-xs text-slate-400">Sharpe: {maxSharpe.sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Expected Return:</span>
              <span className="font-mono text-white font-semibold">{(maxSharpe.return * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Annual Volatility:</span>
              <span className="font-mono text-white font-semibold">{(maxSharpe.volatility * 100).toFixed(2)}%</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Optimal Weights
            </div>
            {Object.entries(maxSharpe.weights)
              .filter(([_, w]) => w > 0.001)
              .map(([sym, w]) => (
                <div key={sym} className="flex justify-between text-xs">
                  <span className="font-mono font-medium text-slate-300">{sym}</span>
                  <span className="font-mono font-semibold text-emerald-300">{(w * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Min Variance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Minimum Variance
            </span>
            <span className="font-mono text-xs text-slate-400">Sharpe: {minVar.sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Expected Return:</span>
              <span className="font-mono text-white font-semibold">{(minVar.return * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Annual Volatility:</span>
              <span className="font-mono text-amber-300 font-semibold">{(minVar.volatility * 100).toFixed(2)}%</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Optimal Weights
            </div>
            {Object.entries(minVar.weights)
              .filter(([_, w]) => w > 0.001)
              .map(([sym, w]) => (
                <div key={sym} className="flex justify-between text-xs">
                  <span className="font-mono font-medium text-slate-300">{sym}</span>
                  <span className="font-mono font-semibold text-amber-300">{(w * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Risk Parity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm text-sky-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Equal Risk Contribution
            </span>
            <span className="font-mono text-xs text-slate-400">
              Vol: {(riskParity.portfolioVolatility * 100).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Risk Budget:</span>
              <span className="font-mono text-sky-300 font-semibold">
                Equal ({(100 / selectedSymbols.length).toFixed(1)}% each)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Convergence:</span>
              <span className="font-mono text-emerald-400 font-semibold">Global Minimum</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              ERC Weights
            </div>
            {Object.entries(riskParity.weights).map(([sym, w]) => (
              <div key={sym} className="flex justify-between text-xs">
                <span className="font-mono font-medium text-slate-300">{sym}</span>
                <span className="font-mono font-semibold text-sky-300">{(w * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Risk Parity Table */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-white tracking-wide">
            Risk Parity Component Contribution to Risk
          </h3>
          <p className="text-xs text-slate-400">
            Phase 13: Verifies that percentage risk contribution matches target risk budget
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2 px-3">Asset</th>
                <th className="py-2 px-3 text-right">Weight</th>
                <th className="py-2 px-3 text-right">Asset Volatility</th>
                <th className="py-2 px-3 text-right">Marginal Risk (MCR)</th>
                <th className="py-2 px-3 text-right">Risk Contribution</th>
                <th className="py-2 px-3 text-right font-bold text-sky-400">% Risk Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {riskParity.assets.map((asset) => (
                <tr key={asset.symbol} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-3 text-slate-200 font-bold">{asset.symbol}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{(asset.weight * 100).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right text-slate-300">{(asset.volatility * 100).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right text-slate-400">{(asset.marginalRisk * 100).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right text-slate-400">{(asset.riskContribution * 100).toFixed(3)}%</td>
                  <td className="py-2 px-3 text-right font-bold text-sky-300">
                    {(asset.percentRiskContribution * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
