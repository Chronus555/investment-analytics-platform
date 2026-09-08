'use client';

import React, { useState, useMemo } from 'react';
import {
  runDualMomentumStrategy,
  runMovingAverageStrategy,
  runTargetVolatilityStrategy,
  runRelativeMomentumStrategy,
} from '@/analytics/tactical';
import {
  runAdaptiveAllocationBacktest,
  AdaptiveWeightingMethod,
} from '@/analytics/adaptiveAllocation';
import {
  runValuationTacticalBacktest,
  ValuationMetric,
} from '@/analytics/valuationAllocation';
import { calculateCAGR } from '@/analytics/returns';
import { calculateMaxDrawdown } from '@/analytics/drawdowns';
import { calculateAnnualizedVolatility } from '@/analytics/statistics';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { TacticalStackedAllocationChart } from '@/components/charts/TacticalStackedAllocationChart';
import { ValuationIndicatorChart } from '@/components/charts/ValuationIndicatorChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatRatio } from '@/utils/formatters';

type TacticalModel =
  | 'adaptive_allocation'
  | 'valuation_timing'
  | 'dual_momentum'
  | 'moving_average'
  | 'target_volatility'
  | 'relative_momentum';

export default function TacticalPage() {
  const [strategyType, setStrategyType] = useState<TacticalModel>('adaptive_allocation');
  const [lookbackMonths, setLookbackMonths] = useState(6);
  const [volatilityLookback, setVolatilityLookback] = useState(6);
  const [topHoldings, setTopHoldings] = useState(3);
  const [weightingMethod, setWeightingMethod] = useState<AdaptiveWeightingMethod>('min_variance');
  const [useAbsoluteHurdle, setUseAbsoluteHurdle] = useState(true);
  const [smaWindow, setSmaWindow] = useState(10);
  const [safeAsset, setSafeAsset] = useState('BND');
  const [targetVol, setTargetVol] = useState(0.12);
  const [targetVolAsset, setTargetVolAsset] = useState<'SPY' | 'QQQ' | 'UNIVERSE'>('SPY');

  // Market Valuation parameters (Discipline 6.6)
  const [valuationMetric, setValuationMetric] = useState<ValuationMetric>('shiller_cape');
  const [capeUpper, setCapeUpper] = useState(30.0);
  const [capeLower, setCapeLower] = useState(22.0);
  const [erpUpper, setErpUpper] = useState(0.01);
  const [erpLower, setErpLower] = useState(0.035);
  const [minEquityWeight, setMinEquityWeight] = useState(0.30);
  const [valuationRiskyAsset, setValuationRiskyAsset] = useState('SPY');
  const [valuationSafeAsset, setValuationSafeAsset] = useState('BND');
  const [valuationFreq, setValuationFreq] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const applyValuationPreset = (name: string) => {
    if (name === 'conservative') {
      setValuationMetric('shiller_cape');
      setCapeUpper(30.0);
      setCapeLower(22.0);
      setMinEquityWeight(0.30);
      setValuationSafeAsset('BND');
    } else if (name === 'aggressive') {
      setValuationMetric('shiller_cape');
      setCapeUpper(28.0);
      setCapeLower(20.0);
      setMinEquityWeight(0.20);
      setValuationSafeAsset('BIL');
    } else if (name === 'erp_tilt') {
      setValuationMetric('equity_risk_premium');
      setErpUpper(0.01);
      setErpLower(0.035);
      setMinEquityWeight(0.30);
      setValuationSafeAsset('BND');
    } else if (name === 'moderate') {
      setValuationMetric('shiller_cape');
      setCapeUpper(32.0);
      setCapeLower(24.0);
      setMinEquityWeight(0.50);
      setValuationSafeAsset('BND');
    }
  };

  // Candidate universe across equities, bonds, real estate, and commodities
  const universe = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'VNQ', 'GLD', 'TLT'];

  // Convert monthly returns to prices starting at 100
  const { prices, dates, returns } = useMemo(() => {
    const dates = CURATED_DATES;
    const prices: Record<string, number[]> = {};
    const returns: Record<string, number[]> = {};

    [...universe, 'BND', 'BIL', 'VTI', 'AGG'].forEach((sym) => {
      const rets = CURATED_RETURNS[sym] || CURATED_RETURNS['SPY'] || [];
      returns[sym] = rets;
      const p = [100];
      for (let i = 0; i < rets.length; i++) {
        p.push(p[p.length - 1] * (1 + rets[i]));
      }
      prices[sym] = p.slice(1);
    });

    return { prices, dates, returns };
  }, []);

  // Run strategy
  const {
    strategyGrowth,
    benchmarkGrowth,
    classic6040Growth,
    summary,
    tradeLog,
    allSignals,
    valuationSignals,
    annualTurnover,
  } = useMemo(() => {
    if (strategyType === 'adaptive_allocation') {
      const res = runAdaptiveAllocationBacktest(
        dates,
        returns,
        prices,
        {
          universe,
          momentumLookbackMonths: lookbackMonths,
          volatilityLookbackMonths: volatilityLookback,
          topN: topHoldings,
          weightingMethod,
          useAbsoluteHurdle,
          safeAsset,
        },
        'SPY'
      );

      const benchVal = res.benchmarkGrowth[res.benchmarkGrowth.length - 1]?.value || 10000;
      const durationYears = res.signals.length / 12;
      const benchCAGR = calculateCAGR(10000, benchVal, durationYears);
      const benchVol = calculateAnnualizedVolatility(res.benchmarkReturns, 12);
      const benchMDD = calculateMaxDrawdown(res.benchmarkGrowth.map((g) => g.value));

      return {
        strategyGrowth: res.strategyGrowth,
        benchmarkGrowth: res.benchmarkGrowth,
        classic6040Growth: undefined,
        summary: {
          stratCAGR: res.cagr,
          benchCAGR,
          stratVol: res.volatility,
          benchVol,
          stratMDD: res.maxDrawdown,
          benchMDD,
          stratSharpe: res.sharpeRatio,
          benchSharpe: benchVol > 0 ? (benchCAGR - 0.02) / benchVol : 0,
          winRate: res.winRate,
        },
        annualTurnover: res.turnover,
        allSignals: res.signals,
        valuationSignals: undefined,
        tradeLog: res.signals.slice(-12).reverse(),
      };
    }

    if (strategyType === 'valuation_timing') {
      const res = runValuationTacticalBacktest(
        dates,
        returns,
        {
          metric: valuationMetric,
          upperThreshold: valuationMetric === 'shiller_cape' ? capeUpper : erpUpper,
          lowerThreshold: valuationMetric === 'shiller_cape' ? capeLower : erpLower,
          minEquityWeight,
          riskyAsset: valuationRiskyAsset,
          safeAsset: valuationSafeAsset,
          rebalanceFrequency: valuationFreq,
        },
        0.02
      );

      const stackedSignals = res.signals.map((sig) => ({
        date: sig.date,
        selectedAssets: {
          [valuationRiskyAsset]: sig.targetEquityWeight,
          [valuationSafeAsset]: sig.targetSafeWeight,
        },
        cashWeight: sig.targetSafeWeight,
      }));

      let wins = 0;
      for (let i = 1; i < res.strategyGrowth.length; i++) {
        const stratRet = (res.strategyGrowth[i].value - res.strategyGrowth[i - 1].value) / res.strategyGrowth[i - 1].value;
        const benchRet = (res.benchmarkGrowth[i].value - res.benchmarkGrowth[i - 1].value) / res.benchmarkGrowth[i - 1].value;
        if (stratRet >= benchRet) wins++;
      }
      const winRate = res.strategyGrowth.length > 1 ? (wins / (res.strategyGrowth.length - 1)) * 100 : 50;

      return {
        strategyGrowth: res.strategyGrowth,
        benchmarkGrowth: res.benchmarkGrowth,
        classic6040Growth: res.classic6040Growth,
        summary: {
          stratCAGR: res.cagr,
          benchCAGR: res.benchmarkCAGR,
          stratVol: res.volatility,
          benchVol: res.benchmarkVol,
          stratMDD: res.maxDrawdown,
          benchMDD: res.benchmarkMDD,
          stratSharpe: res.sharpeRatio,
          benchSharpe: res.benchmarkSharpe,
          winRate,
        },
        annualTurnover: res.annualTurnover * 100,
        allSignals: stackedSignals,
        valuationSignals: res.signals,
        tradeLog: stackedSignals.slice(-12).reverse(),
      };
    }

    let signals;
    if (strategyType === 'dual_momentum') {
      signals = runDualMomentumStrategy(dates, prices, lookbackMonths, topHoldings, safeAsset);
    } else if (strategyType === 'moving_average') {
      signals = runMovingAverageStrategy(dates, prices, smaWindow, safeAsset);
    } else if (strategyType === 'target_volatility') {
      const risky = targetVolAsset === 'UNIVERSE' ? universe : [targetVolAsset];
      signals = runTargetVolatilityStrategy(dates, prices, risky, targetVol, 12, safeAsset, 1.0);
    } else {
      signals = runRelativeMomentumStrategy(dates, prices, universe, lookbackMonths, topHoldings);
    }

    const startIdx = dates.length - signals.length;
    let stratVal = 10000;
    let benchVal = 10000;

    const stratGrowth = [{ date: dates[startIdx - 1] || '2007-01-01', value: stratVal }];
    const benchGrowth = [{ date: dates[startIdx - 1] || '2007-01-01', value: benchVal }];

    const stratRets: number[] = [];
    const benchRets: number[] = [];
    let wins = 0;
    let totalTurnover = 0;

    for (let t = 0; t < signals.length; t++) {
      const sig = signals[t];
      const nextIdx = startIdx + t;
      if (nextIdx >= dates.length) break;

      let rStrat = 0;
      Object.entries(sig.selectedAssets).forEach(([sym, w]) => {
        const r = returns[sym]?.[nextIdx] || 0;
        rStrat += w * r;
      });

      const rBench = returns['SPY']?.[nextIdx] || 0;

      stratVal *= 1 + rStrat;
      benchVal *= 1 + rBench;

      stratGrowth.push({ date: dates[nextIdx], value: Math.round(stratVal * 100) / 100 });
      benchGrowth.push({ date: dates[nextIdx], value: Math.round(benchVal * 100) / 100 });

      stratRets.push(rStrat);
      benchRets.push(rBench);

      if (rStrat >= rBench) wins++;

      if (t > 0) {
        const prevAssets = signals[t - 1].selectedAssets;
        let dW = 0;
        const allKeys = Array.from(new Set([...Object.keys(sig.selectedAssets), ...Object.keys(prevAssets)]));
        allKeys.forEach((k) => {
          dW += Math.abs((sig.selectedAssets[k] || 0) - (prevAssets[k] || 0));
        });
        totalTurnover += dW / 2;
      }
    }

    const durationYears = stratRets.length / 12;
    const stratCAGR = calculateCAGR(10000, stratVal, durationYears);
    const benchCAGR = calculateCAGR(10000, benchVal, durationYears);
    const stratVol = calculateAnnualizedVolatility(stratRets, 12);
    const benchVol = calculateAnnualizedVolatility(benchRets, 12);
    const stratMDD = calculateMaxDrawdown(stratGrowth.map((g) => g.value));
    const benchMDD = calculateMaxDrawdown(benchGrowth.map((g) => g.value));

    const stratSharpe = stratVol > 0 ? (stratCAGR - 0.02) / stratVol : 0;
    const benchSharpe = benchVol > 0 ? (benchCAGR - 0.02) / benchVol : 0;
    const winRate = stratRets.length > 0 ? (wins / stratRets.length) * 100 : 0;
    const annualTurnover = durationYears > 0 ? (totalTurnover / durationYears) * 100 : 0;

    return {
      strategyGrowth: stratGrowth,
      benchmarkGrowth: benchGrowth,
      classic6040Growth: undefined,
      summary: {
        stratCAGR,
        benchCAGR,
        stratVol,
        benchVol,
        stratMDD,
        benchMDD,
        stratSharpe,
        benchSharpe,
        winRate,
      },
      annualTurnover,
      allSignals: signals,
      valuationSignals: undefined,
      tradeLog: signals.slice(-12).reverse(),
    };
  }, [
    strategyType,
    lookbackMonths,
    volatilityLookback,
    topHoldings,
    weightingMethod,
    useAbsoluteHurdle,
    smaWindow,
    safeAsset,
    targetVol,
    targetVolAsset,
    valuationMetric,
    capeUpper,
    capeLower,
    erpUpper,
    erpLower,
    minEquityWeight,
    valuationRiskyAsset,
    valuationSafeAsset,
    valuationFreq,
    dates,
    prices,
    returns,
    universe,
  ]);

  const strategyNames: Record<TacticalModel, string> = {
    adaptive_allocation: `Adaptive Asset Allocation (Top ${topHoldings} ${weightingMethod.replace('_', ' ').toUpperCase()})`,
    valuation_timing: `Market Valuation Timing (${valuationMetric === 'shiller_cape' ? 'Shiller CAPE' : 'ERP Yield Gap'})`,
    dual_momentum: 'Antonacci Dual Momentum',
    moving_average: `10-Month SMA Trend (${smaWindow}M)`,
    target_volatility: `Target Volatility (${formatPercent(targetVol, 0)})`,
    relative_momentum: `Relative Strength Rotation (Top ${topHoldings})`,
  };

  const growthSeries = [
    { id: 'strat', name: strategyNames[strategyType], color: '#2563eb', data: strategyGrowth },
    ...(classic6040Growth
      ? [{ id: 'classic6040', name: 'Classic 60/40 Benchmark', color: '#10b981', data: classic6040Growth }]
      : []),
    { id: 'bench', name: 'SPY (Buy & Hold)', color: '#64748b', data: benchmarkGrowth },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Tactical Strategy & Momentum Lab"
        description="Backtest ReSolve Adaptive Asset Allocation, Shiller CAPE Market Valuation Timing, Gary Antonacci Dual Momentum, 10-month SMA trend following, Target Volatility, and Relative Strength rotation."
        badge={<Badge variant="info">Complete Tactical Suite (6 Models)</Badge>}
      />

      {/* Strategy Selector & Parameters Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStrategyType('adaptive_allocation')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'adaptive_allocation'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Adaptive Asset Allocation (6.4)
            </button>
            <button
              onClick={() => setStrategyType('valuation_timing')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'valuation_timing'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Market Valuation / Shiller CAPE (6.6)
            </button>
            <button
              onClick={() => setStrategyType('dual_momentum')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'dual_momentum'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Antonacci Dual Momentum (6.3)
            </button>
            <button
              onClick={() => setStrategyType('moving_average')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'moving_average'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              10-Month SMA Trend (6.1)
            </button>
            <button
              onClick={() => setStrategyType('target_volatility')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'target_volatility'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Target Volatility (6.5)
            </button>
            <button
              onClick={() => setStrategyType('relative_momentum')}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                strategyType === 'relative_momentum'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Relative Strength Rotation (6.2)
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {strategyType === 'valuation_timing'
              ? `Assets: Risky (${valuationRiskyAsset}), Safe (${valuationSafeAsset}) | Timeline: 2007-2026 (229 Months)`
              : `Universe: ${universe.join(', ')}`}
          </span>
        </CardHeader>

        <div className="p-4 sm:p-5">
          {/* Valuation Timing Controls (Discipline 6.6) */}
          {strategyType === 'valuation_timing' && (
            <div className="space-y-4">
              {/* Presets */}
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold block mb-2">
                  Market Valuation Strategy Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyValuationPreset('conservative')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Conservative De-risking (CAPE &gt; 30)
                  </button>
                  <button
                    onClick={() => applyValuationPreset('aggressive')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Aggressive Mean-Reversion (CAPE &gt; 28)
                  </button>
                  <button
                    onClick={() => applyValuationPreset('erp_tilt')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Fed Model ERP Yield Gap
                  </button>
                  <button
                    onClick={() => applyValuationPreset('moderate')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Moderate Guardrails (CAPE &gt; 32)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Valuation Metric
                  </label>
                  <select
                    value={valuationMetric}
                    onChange={(e) => setValuationMetric(e.target.value as ValuationMetric)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="shiller_cape">Shiller CAPE (P/E 10)</option>
                    <option value="equity_risk_premium">Equity Risk Premium (ERP / Fed Model)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    {valuationMetric === 'shiller_cape' ? 'Overvalued Limit (De-risk)' : 'Tight ERP Limit (De-risk)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={valuationMetric === 'shiller_cape' ? 24 : 0.0}
                      max={valuationMetric === 'shiller_cape' ? 36 : 0.025}
                      step={valuationMetric === 'shiller_cape' ? 0.5 : 0.001}
                      value={valuationMetric === 'shiller_cape' ? capeUpper : erpUpper}
                      onChange={(e) =>
                        valuationMetric === 'shiller_cape'
                          ? setCapeUpper(parseFloat(e.target.value))
                          : setErpUpper(parseFloat(e.target.value))
                      }
                      className="w-full accent-blue-600"
                    />
                    <span className="font-mono font-semibold text-slate-900 min-w-[50px] text-right">
                      {valuationMetric === 'shiller_cape' ? `${capeUpper.toFixed(1)}x` : formatPercent(erpUpper, 1)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    {valuationMetric === 'shiller_cape' ? 'Undervalued Limit (Risk-On)' : 'Wide ERP Limit (Risk-On)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={valuationMetric === 'shiller_cape' ? 16 : 0.02}
                      max={valuationMetric === 'shiller_cape' ? 26 : 0.05}
                      step={valuationMetric === 'shiller_cape' ? 0.5 : 0.001}
                      value={valuationMetric === 'shiller_cape' ? capeLower : erpLower}
                      onChange={(e) =>
                        valuationMetric === 'shiller_cape'
                          ? setCapeLower(parseFloat(e.target.value))
                          : setErpLower(parseFloat(e.target.value))
                      }
                      className="w-full accent-blue-600"
                    />
                    <span className="font-mono font-semibold text-slate-900 min-w-[50px] text-right">
                      {valuationMetric === 'shiller_cape' ? `${capeLower.toFixed(1)}x` : formatPercent(erpLower, 1)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Min Equity Floor (De-Risked)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.1}
                      max={0.6}
                      step={0.05}
                      value={minEquityWeight}
                      onChange={(e) => setMinEquityWeight(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <span className="font-mono font-semibold text-slate-900 min-w-[50px] text-right">
                      {formatPercent(minEquityWeight, 0)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Risky Equity Core
                  </label>
                  <select
                    value={valuationRiskyAsset}
                    onChange={(e) => setValuationRiskyAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="SPY">SPY (S&amp;P 500 US Large Cap)</option>
                    <option value="QQQ">QQQ (Nasdaq 100 Growth)</option>
                    <option value="VTI">VTI (Total US Stock Market)</option>
                    <option value="IWM">IWM (Russell 2000 Small Cap)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Safe Haven
                  </label>
                  <select
                    value={valuationSafeAsset}
                    onChange={(e) => setValuationSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BND">BND (Vanguard Total Bond Market)</option>
                    <option value="TLT">TLT (20+ Year Long Treasuries)</option>
                    <option value="BIL">BIL (1-3M Treasury Bills / Cash)</option>
                    <option value="GLD">GLD (SPDR Gold Shares)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Rebalance Frequency
                  </label>
                  <select
                    value={valuationFreq}
                    onChange={(e) => setValuationFreq(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="monthly">Monthly Rebalancing</option>
                    <option value="quarterly">Quarterly Rebalancing</option>
                    <option value="annual">Annual Rebalancing</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {strategyType !== 'valuation_timing' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              {strategyType === 'adaptive_allocation' && (
                <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Momentum Lookback (Rank)
                  </label>
                  <select
                    value={lookbackMonths}
                    onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="1">1 Month (Fast Momentum)</option>
                    <option value="3">3 Months (Quarterly)</option>
                    <option value="6">6 Months (Canonical AAA)</option>
                    <option value="12">12 Months (Annual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Top Holdings (N Assets)
                  </label>
                  <select
                    value={topHoldings}
                    onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="2">Top 2 Leaders</option>
                    <option value="3">Top 3 Leaders (Balanced)</option>
                    <option value="4">Top 4 Leaders</option>
                    <option value="5">Top 5 Leaders</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Weighting Algorithm
                  </label>
                  <select
                    value={weightingMethod}
                    onChange={(e) => setWeightingMethod(e.target.value as AdaptiveWeightingMethod)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="min_variance">Minimum Variance (Covariance Optimization)</option>
                    <option value="risk_parity">Equal Risk Parity (Equal Risk Contribution)</option>
                    <option value="inv_vol">Inverse Volatility (1 / Sigma)</option>
                    <option value="max_sharpe">Maximum Sharpe (Tangency)</option>
                    <option value="equal_weight">Equal Weight (1 / N)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Covariance Window
                  </label>
                  <select
                    value={volatilityLookback}
                    onChange={(e) => setVolatilityLookback(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="3">3 Months (Agile Risk)</option>
                    <option value="6">6 Months (Standard)</option>
                    <option value="12">12 Months (Stable)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="absoluteHurdle"
                    checked={useAbsoluteHurdle}
                    onChange={(e) => setUseAbsoluteHurdle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="absoluteHurdle" className="text-xs text-slate-700 cursor-pointer">
                    <strong className="font-semibold text-slate-900">Crash Protection Filter:</strong> Reallocate to safe asset if momentum &le; 0
                  </label>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Safe Asset Buffer
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BND">BND (Total US Bond Market)</option>
                    <option value="BIL">BIL (1-3M Treasury Bills / Cash)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'dual_momentum' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Lookback Period
                  </label>
                  <select
                    value={lookbackMonths}
                    onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (Canonical)</option>
                    <option value="18">18 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Top Momentum Holdings (N)
                  </label>
                  <select
                    value={topHoldings}
                    onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="1">Top 1 Asset (Concentrated)</option>
                    <option value="2">Top 2 Assets (Balanced)</option>
                    <option value="3">Top 3 Assets</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Out-of-Market Asset
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BND">BND (Total Bond Market)</option>
                    <option value="BIL">BIL (1-3M Treasury / Cash)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'moving_average' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    SMA Window
                  </label>
                  <select
                    value={smaWindow}
                    onChange={(e) => setSmaWindow(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="5">5 Months (Fast)</option>
                    <option value="10">10 Months (Faber 200-Day Equivalent)</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Out-of-Market Asset
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BND">BND (Total Bond Market)</option>
                    <option value="BIL">BIL (1-3M Treasury / Cash)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'target_volatility' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Target Volatility
                  </label>
                  <select
                    value={targetVol}
                    onChange={(e) => setTargetVol(parseFloat(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="0.08">8% Annualized (Conservative)</option>
                    <option value="0.10">10% Annualized (Moderate)</option>
                    <option value="0.12">12% Annualized (Standard CTA Target)</option>
                    <option value="0.15">15% Annualized (Growth)</option>
                    <option value="0.18">18% Annualized (Aggressive)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Underlying Risky Exposure
                  </label>
                  <select
                    value={targetVolAsset}
                    onChange={(e) => setTargetVolAsset(e.target.value as 'SPY' | 'QQQ' | 'UNIVERSE')}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="SPY">SPY (S&P 500 US Large Cap)</option>
                    <option value="QQQ">QQQ (Nasdaq 100 Tech/Growth)</option>
                    <option value="UNIVERSE">Multi-Asset Equal Basket (7 Assets)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Defensive Cash Buffer
                  </label>
                  <select
                    value={safeAsset}
                    onChange={(e) => setSafeAsset(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="BIL">BIL (1-3M Treasury / Cash)</option>
                    <option value="BND">BND (Total Bond Market)</option>
                  </select>
                </div>
              </>
            )}

            {strategyType === 'relative_momentum' && (
              <>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Lookback Period
                  </label>
                  <select
                    value={lookbackMonths}
                    onChange={(e) => setLookbackMonths(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="3">3 Months (Short Horizon)</option>
                    <option value="6">6 Months (Intermediate)</option>
                    <option value="12">12 Months (Long Horizon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Top Momentum Holdings (N)
                  </label>
                  <select
                    value={topHoldings}
                    onChange={(e) => setTopHoldings(parseInt(e.target.value, 10))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="1">Top 1 Leader (100% Weight)</option>
                    <option value="2">Top 2 Leaders (50% / 50%)</option>
                    <option value="3">Top 3 Leaders (33.3% Each)</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pure cross-sectional momentum stays 100% invested in the top-performing assets with monthly rebalancing.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </Card>

      {/* KPI Comparative Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Strategy CAGR"
          value={formatPercent(summary.stratCAGR, 2)}
          helperText={`vs SPY ${formatPercent(summary.benchCAGR, 2)}`}
          changeType={summary.stratCAGR >= summary.benchCAGR ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Volatility"
          value={formatPercent(summary.stratVol, 2)}
          helperText={`vs SPY ${formatPercent(summary.benchVol, 2)}`}
          changeType={summary.stratVol < summary.benchVol ? 'positive' : 'neutral'}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={formatRatio(summary.stratSharpe, 2)}
          helperText={`vs SPY ${formatRatio(summary.benchSharpe, 2)}`}
          changeType={summary.stratSharpe >= summary.benchSharpe ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Max Drawdown"
          value={formatPercent(summary.stratMDD, 2)}
          helperText={`vs SPY ${formatPercent(summary.benchMDD, 2)}`}
          changeType={summary.stratMDD > summary.benchMDD ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Annual Turnover"
          value={formatPercent(annualTurnover / 100, 1)}
          helperText="Single-Sided Drift"
          changeType="neutral"
        />
        <MetricCard
          label="Monthly Win Rate"
          value={formatPercent(summary.winRate / 100, 1)}
          helperText="vs SPY Benchmark"
          changeType={summary.winRate >= 50 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Growth Chart */}
      <GrowthChart series={growthSeries} height={350} />

      {/* Valuation Multiplier Chart (Discipline 6.6) */}
      {strategyType === 'valuation_timing' && valuationSignals && (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <div>
              <CardTitle className="text-slate-900">Historical Market Valuation Multiplier &amp; Threshold Bands</CardTitle>
              <CardDescription className="text-slate-500">
                Tracking {valuationMetric === 'shiller_cape' ? 'Shiller CAPE ratio' : 'Equity Risk Premium'} with counter-cyclical de-risking barriers (2007-2026)
              </CardDescription>
            </div>
          </CardHeader>
          <div className="p-4 sm:p-5">
            <ValuationIndicatorChart
              signals={valuationSignals}
              metric={valuationMetric}
              upperThreshold={valuationMetric === 'shiller_cape' ? capeUpper : erpUpper}
              lowerThreshold={valuationMetric === 'shiller_cape' ? capeLower : erpLower}
              height={260}
            />
          </div>
        </Card>
      )}

      {/* Tactical Stacked Dynamic Allocation Chart */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900">Dynamic Asset Allocation Evolution</CardTitle>
            <CardDescription className="text-slate-500">
              Visualizing rotational shift between equities, real estate, gold, treasuries, and cash buffers over time
            </CardDescription>
          </div>
        </CardHeader>
        <div className="p-4 sm:p-5">
          <TacticalStackedAllocationChart signals={allSignals} height={260} />
        </div>
      </Card>

      {/* Recent Tactical Signals Table */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900">Recent Monthly Tactical Allocations &amp; Signals</CardTitle>
            <CardDescription className="text-slate-500">Execution history over the past 12 months</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-2.5 px-4 font-semibold">Period</th>
                <th className="py-2.5 px-4 font-semibold">Target Regime</th>
                <th className="py-2.5 px-4 font-semibold">Selected Assets &amp; Weights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {tradeLog.map((log) => {
                let badgeText = 'Offensive Momentum';
                let badgeVariant: 'success' | 'warning' | 'info' | 'neutral' = 'success';

                if (strategyType === 'valuation_timing') {
                  const isDeRisked = (log.cashWeight ?? 0) >= 0.20;
                  badgeText = isDeRisked
                    ? `De-Risked (${formatPercent(log.cashWeight ?? 0, 0)} Safe)`
                    : 'Risk-On (Equities)';
                  badgeVariant = isDeRisked ? 'warning' : 'success';
                } else if (strategyType === 'adaptive_allocation') {
                  const isDefensive = (log.cashWeight ?? 0) > 0.10;
                  badgeText = isDefensive
                    ? `Crash Buffer (${formatPercent(log.cashWeight ?? 0, 0)} Safe)`
                    : `AAA Active (${Object.keys(log.selectedAssets).filter(k => k !== safeAsset).length} Assets)`;
                  badgeVariant = isDefensive ? 'warning' : 'success';
                } else if (strategyType === 'target_volatility') {
                  const isDeRisked = (log.cashWeight ?? 0) >= 0.25;
                  badgeText = isDeRisked
                    ? `De-Risked (${formatPercent(log.cashWeight ?? 0, 0)} Cash)`
                    : `Target Vol (${formatPercent(1 - (log.cashWeight ?? 0), 0)} Risky)`;
                  badgeVariant = isDeRisked ? 'warning' : 'info';
                } else if (strategyType === 'relative_momentum') {
                  badgeText = 'Top-K Momentum';
                  badgeVariant = 'info';
                } else {
                  const isDefensive = Object.keys(log.selectedAssets).includes(safeAsset);
                  badgeText = isDefensive ? 'Defensive Mode' : 'Offensive Momentum';
                  badgeVariant = isDefensive ? 'warning' : 'success';
                }

                return (
                  <tr key={log.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-4 text-slate-800 font-semibold font-sans">{log.date.slice(0, 7)}</td>
                    <td className="py-2 px-4">
                      <Badge variant={badgeVariant} size="sm">
                        {badgeText}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(log.selectedAssets).map(([sym, w]) => (
                          <span
                            key={sym}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs"
                          >
                            <strong>{sym}</strong> {formatPercent(w, 0)}
                          </span>
                        ))}
                      </div>
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
