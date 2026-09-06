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
import { Sliders, PieChart, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatRatio } from '@/utils/formatters';

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
      {/* Page Header */}
      <PageHeader
        title="Portfolio Optimization & Efficient Frontier"
        description="Markowitz Modern Portfolio Theory (MPT), Tangency Sharpe maximization, Minimum Variance, and Equal Risk Contribution (ERC)"
        badge={<Badge variant="info">Markowitz & Risk Parity Solvers</Badge>}
      />

      {/* Universe Selection & Constraints */}
      <Card className="shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Asset Universe & Allocation Constraints</CardTitle>
            <CardDescription>
              Toggle available assets and adjust single-asset concentration limits
            </CardDescription>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {selectedSymbols.length} Assets Active
          </span>
        </CardHeader>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Ticker chips */}
          <div className="flex flex-wrap gap-1.5">
            {CURATED_SECURITIES.slice(0, 12).map((sec) => {
              const isSelected = selectedSymbols.includes(sec.symbol);
              return (
                <button
                  key={sec.symbol}
                  type="button"
                  onClick={() => toggleSymbol(sec.symbol)}
                  className={`h-8 px-3 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold">{sec.symbol}</span>
                  <span className="text-[10px] text-slate-500 font-sans hidden sm:inline">({sec.assetClass})</span>
                </button>
              );
            })}
          </div>

          {/* Constraints Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs border-t border-slate-800/80">
            <div>
              <div className="flex justify-between mb-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                <span>Max Single Asset Weight</span>
                <span className="text-slate-200">{formatPercent(maxWeight, 0)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.0"
                step="0.05"
                value={maxWeight}
                onChange={(e) => setMaxWeight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                <span>Min Single Asset Weight</span>
                <span className="text-slate-200">{formatPercent(minWeight, 0)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.20"
                step="0.01"
                value={minWeight}
                onChange={(e) => setMinWeight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">
                <span>Assumed Risk-Free Rate</span>
                <span className="text-slate-200">{formatPercent(riskFreeRate, 1)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.08"
                step="0.005"
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </Card>

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
        {/* Tangency / Max Sharpe */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <CardTitle>Max Sharpe (Tangency)</CardTitle>
            </div>
            <Badge variant="success">Sharpe {formatRatio(maxSharpe.sharpeRatio, 2)}</Badge>
          </CardHeader>
          <div className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Exp Return</span>
                <span className="font-semibold text-emerald-400">{formatPercent(maxSharpe.return, 2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Annual Vol</span>
                <span className="font-semibold text-slate-200">{formatPercent(maxSharpe.volatility, 2)}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Allocations
              </div>
              {Object.entries(maxSharpe.weights)
                .filter(([_, w]) => w > 0.001)
                .map(([sym, w]) => (
                  <div key={sym} className="flex justify-between items-center text-xs">
                    <span className="font-mono font-medium text-slate-300">{sym}</span>
                    <span className="font-mono font-semibold text-emerald-300">{formatPercent(w, 1)}</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Min Variance */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <CardTitle>Minimum Volatility</CardTitle>
            </div>
            <Badge variant="info">Vol {formatPercent(minVar.volatility, 1)}</Badge>
          </CardHeader>
          <div className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Exp Return</span>
                <span className="font-semibold text-indigo-400">{formatPercent(minVar.return, 2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Sharpe</span>
                <span className="font-semibold text-slate-200">{formatRatio(minVar.sharpeRatio, 2)}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Allocations
              </div>
              {Object.entries(minVar.weights)
                .filter(([_, w]) => w > 0.001)
                .map(([sym, w]) => (
                  <div key={sym} className="flex justify-between items-center text-xs">
                    <span className="font-mono font-medium text-slate-300">{sym}</span>
                    <span className="font-mono font-semibold text-indigo-300">{formatPercent(w, 1)}</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Risk Parity */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <CardTitle>Equal Risk Parity (ERC)</CardTitle>
            </div>
            <Badge variant="warning">Vol {formatPercent(riskParity.portfolioVolatility, 1)}</Badge>
          </CardHeader>
          <div className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Total Vol</span>
                <span className="font-semibold text-amber-400">{formatPercent(riskParity.portfolioVolatility, 2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Risk Budget</span>
                <span className="font-semibold text-slate-200">Equal (1/N)</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Allocations & Risk Contrib
              </div>
              {riskParity.assets.map((a) => (
                <div key={a.symbol} className="flex justify-between items-center text-xs">
                  <span className="font-mono font-medium text-slate-300">{a.symbol}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-semibold text-slate-200">{formatPercent(a.weight, 1)}</span>
                    <span className="text-[10px] text-amber-400/80">({formatPercent(a.percentRiskContribution, 0)} risk)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}