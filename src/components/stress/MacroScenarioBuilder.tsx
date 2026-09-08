'use client';

import React, { useState, useMemo } from 'react';
import {
  runMacroStressTest,
  MACRO_HISTORICAL_PRESETS,
  MacroFactorShock,
  MacroStressResult,
} from '@/analytics/macroStressTest';
import { MacroWaterfallChart } from '@/components/charts/MacroWaterfallChart';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import {
  AlertTriangle,
  Sliders,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export interface PortfolioStressTarget {
  id: string;
  name: string;
  color?: string;
  assets: Array<{ symbol: string; weight: number }>;
}

interface MacroScenarioBuilderProps {
  portfolios: PortfolioStressTarget[];
  initialBalance?: number;
  benchmarkSymbol?: string;
}

export const MacroScenarioBuilder: React.FC<MacroScenarioBuilderProps> = ({
  portfolios,
  initialBalance = 10000,
  benchmarkSymbol = 'SPY',
}) => {
  // Selected portfolio index
  const [selectedPortIdx, setSelectedPortIdx] = useState<number>(0);

  // Selected preset or 'custom'
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gfc_2008');

  // Custom shock parameters
  const defaultShock = MACRO_HISTORICAL_PRESETS.find((p) => p.id === 'gfc_2008')!.shock;
  const [shock, setShock] = useState<MacroFactorShock>({ ...defaultShock });

  // Handle preset selection
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = MACRO_HISTORICAL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setShock({ ...preset.shock });
    }
  };

  // Handle custom slider update
  const handleSliderChange = (key: keyof MacroFactorShock, val: number) => {
    setSelectedPresetId('custom');
    setShock((prev) => ({ ...prev, [key]: val }));
  };

  // Reset to default
  const handleReset = () => {
    handlePresetSelect('gfc_2008');
  };

  const activePort = portfolios[selectedPortIdx] || portfolios[0];

  // Evaluate active portfolio
  const activeResult: MacroStressResult = useMemo(() => {
    if (!activePort || !activePort.assets || activePort.assets.length === 0) {
      return runMacroStressTest([{ symbol: 'SPY', weight: 1.0 }], shock, {
        initialBalance,
        benchmarkSymbol,
      });
    }
    return runMacroStressTest(activePort.assets, shock, {
      initialBalance,
      benchmarkSymbol,
    });
  }, [activePort, shock, initialBalance, benchmarkSymbol]);

  // Evaluate all portfolios for comparison table
  const allResults = useMemo(() => {
    return portfolios.map((p) => {
      const res = runMacroStressTest(p.assets, shock, {
        initialBalance,
        benchmarkSymbol,
      });
      return {
        portfolio: p,
        result: res,
      };
    });
  }, [portfolios, shock, initialBalance, benchmarkSymbol]);

  const activePreset = MACRO_HISTORICAL_PRESETS.find((p) => p.id === selectedPresetId);

  return (
    <div className="space-y-6">
      {/* Top Header & Presets Selector Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Institutional Macro Scenario Stress-Testing Engine
                </CardTitle>
                <Badge variant="warning" className="font-mono text-[11px]">
                  Multi-Factor Shock Propagation
                </Badge>
              </div>
              <CardDescription className="text-slate-500 text-xs mt-1">
                Stress-test asset allocations against non-linear interest rate hikes, equity crashes, crude oil supply shocks, credit widening, and stagflation
              </CardDescription>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset Shock
            </button>
          </div>
        </CardHeader>

        {/* Historical Crisis Analogs Pill Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Historical Crisis Analog Presets:
            </span>
            {selectedPresetId === 'custom' && (
              <Badge variant="info" className="text-[10px]">
                Custom Interactive Dial
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {MACRO_HISTORICAL_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-white font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{preset.name}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-amber-600 text-amber-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {preset.period}
                  </span>
                </button>
              );
            })}
          </div>

          {activePreset && (
            <p className="text-xs text-slate-600 mt-3 italic bg-white p-2.5 rounded-md border border-slate-200">
              <strong>{activePreset.name}:</strong> {activePreset.description}
            </p>
          )}
        </div>

        {/* 5 Interactive Factor Shock Sliders */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 mb-4">
            <Sliders className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-800">
              Interactive Factor Stress Sensitivities (Real-Time Propagation)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 text-xs">
            {/* 1. Equity Shock */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                  Equity Crash
                </label>
                <span className={`font-mono font-bold ${shock.equityShockPct <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatPercent(shock.equityShockPct, 1)}
                </span>
              </div>
              <input
                type="range"
                min="-0.60"
                max="0.20"
                step="0.01"
                value={shock.equityShockPct}
                onChange={(e) => handleSliderChange('equityShockPct', parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Broad equity market sell-off
              </span>
            </div>

            {/* 2. Rate Shock */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                  10Y Yield Shock
                </label>
                <span className={`font-mono font-bold ${shock.rateShockBps >= 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                  {shock.rateShockBps >= 0 ? '+' : ''}{shock.rateShockBps} bps
                </span>
              </div>
              <input
                type="range"
                min="-300"
                max="500"
                step="25"
                value={shock.rateShockBps}
                onChange={(e) => handleSliderChange('rateShockBps', parseInt(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Duration &amp; convexity pricing
              </span>
            </div>

            {/* 3. Credit Spread */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                  Credit Spreads
                </label>
                <span className="font-mono font-bold text-indigo-600">
                  +{shock.creditSpreadBps} bps
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="800"
                step="25"
                value={shock.creditSpreadBps}
                onChange={(e) => handleSliderChange('creditSpreadBps', parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                IG &amp; High-Yield OAS widening
              </span>
            </div>

            {/* 4. Crude Oil Shock */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                  Crude Oil Shock
                </label>
                <span className={`font-mono font-bold ${shock.oilShockPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {shock.oilShockPct >= 0 ? '+' : ''}{formatPercent(shock.oilShockPct, 0)}
                </span>
              </div>
              <input
                type="range"
                min="-0.60"
                max="1.50"
                step="0.05"
                value={shock.oilShockPct}
                onChange={(e) => handleSliderChange('oilShockPct', parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Commodity supply disruptions
              </span>
            </div>

            {/* 5. Inflation Shock */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                  CPI Inflation Spike
                </label>
                <span className={`font-mono font-bold ${shock.inflationShockPct >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                  {shock.inflationShockPct >= 0 ? '+' : ''}{formatPercent(shock.inflationShockPct, 1)}
                </span>
              </div>
              <input
                type="range"
                min="-0.03"
                max="0.10"
                step="0.005"
                value={shock.inflationShockPct}
                onChange={(e) => handleSliderChange('inflationShockPct', parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Unexpected cost-push inflation
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Target Portfolio Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Target Portfolio:</span>
          {portfolios.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPortIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                selectedPortIdx === idx
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Capital Base: <strong>{formatCurrency(initialBalance)}</strong> | Benchmark: <strong>{benchmarkSymbol}</strong>
        </div>
      </div>

      {/* 6 Macro Stress KPI Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Portfolio Shock Drawdown */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Portfolio Shock</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            activeResult.portfolioShockReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {activeResult.portfolioShockReturn >= 0 ? '+' : ''}
            {formatPercent(activeResult.portfolioShockReturn, 2)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">Immediate capital drawdown</span>
        </div>

        {/* 2. Benchmark Shock Drawdown */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Benchmark ({benchmarkSymbol})</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            activeResult.benchmarkShockReturn >= 0 ? 'text-emerald-600' : 'text-slate-700'
          }`}>
            {activeResult.benchmarkShockReturn >= 0 ? '+' : ''}
            {formatPercent(activeResult.benchmarkShockReturn, 2)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">S&amp;P 500 Core baseline</span>
        </div>

        {/* 3. Resilience Alpha */}
        <div className={`p-4 border rounded-xl shadow-xs ${
          activeResult.resilienceAlpha >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
        }`}>
          <span className={`text-[11px] font-mono uppercase tracking-wider block font-semibold ${
            activeResult.resilienceAlpha >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>Resilience Alpha</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-2xl font-bold font-mono ${
              activeResult.resilienceAlpha >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {activeResult.resilienceAlpha >= 0 ? '+' : ''}
              {formatPercent(activeResult.resilienceAlpha, 2)}
            </span>
            <Badge variant={activeResult.resilienceAlpha >= 0 ? 'success' : 'danger'} className="text-[10px]">
              {activeResult.resilienceAlpha >= 0 ? 'BUFFER' : 'EXPOSED'}
            </Badge>
          </div>
          <span className={`text-xs mt-0.5 block ${
            activeResult.resilienceAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>Shock outperformance</span>
        </div>

        {/* 4. Estimated Dollar Loss */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Dollar Impact</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            activeResult.estimatedDollarLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {activeResult.estimatedDollarLoss >= 0 ? '+' : ''}
            {formatCurrency(activeResult.estimatedDollarLoss)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            End Val: {formatCurrency(activeResult.endingPortfolioBalance)}
          </span>
        </div>

        {/* 5. Projected Recovery Time */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Recovery Horizon</span>
          <span className="text-2xl font-bold font-mono text-indigo-600 mt-1 block">
            {activeResult.projectedRecoveryMonths === 0
              ? 'Immediate'
              : `${activeResult.projectedRecoveryMonths} Mos`}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">Estimated breakeven time</span>
        </div>

        {/* 6. Resilience Score & Grade */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Resilience Rating</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {activeResult.resilienceScore}
              <span className="text-xs text-slate-400 font-normal">/100</span>
            </span>
            <Badge
              variant={
                activeResult.resilienceGrade.startsWith('A')
                  ? 'success'
                  : activeResult.resilienceGrade === 'B'
                  ? 'info'
                  : activeResult.resilienceGrade === 'C'
                  ? 'warning'
                  : 'danger'
              }
              className="text-xs font-bold"
            >
              Grade {activeResult.resilienceGrade}
            </Badge>
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">Capital defense score</span>
        </div>
      </div>

      {/* Asset Loss Waterfall Chart Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Asset Shock Contribution Waterfall ({activePort.name})
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Decomposes total portfolio stress into individual asset impacts (green bars = flight-to-safety hedges, red bars = drawdown drivers)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600">Safe-Haven Hedge</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500" />
                <span className="text-slate-600">Drawdown Driver</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-500" />
                <span className="text-slate-600">Net Shock</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <div className="p-4 sm:p-5">
          <MacroWaterfallChart
            attributions={activeResult.assetAttributions}
            totalPortfolioReturn={activeResult.portfolioShockReturn}
            height={260}
          />
        </div>
      </Card>

      {/* Factor Shock Breakdown & Cross-Portfolio Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factor Breakdown */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <div>
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Macro Factor Shock Decomposition
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Quantifies the portion of portfolio stress stemming from each distinct macroeconomic factor
              </CardDescription>
            </div>
          </CardHeader>
          <div className="p-4 sm:p-5 space-y-3.5 text-xs font-mono">
            {/* Equity Factor */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1">
                <span>Equity Market Factor:</span>
                <span className={`font-bold ${activeResult.factorDecomposition.equityFactorPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {activeResult.factorDecomposition.equityFactorPct >= 0 ? '+' : ''}
                  {formatPercent(activeResult.factorDecomposition.equityFactorPct, 2)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.abs(activeResult.factorDecomposition.equityFactorPct) * 150)}%` }}
                />
              </div>
            </div>

            {/* Rates Factor */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1">
                <span>Duration / Rate Shock Factor:</span>
                <span className={`font-bold ${activeResult.factorDecomposition.ratesFactorPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {activeResult.factorDecomposition.ratesFactorPct >= 0 ? '+' : ''}
                  {formatPercent(activeResult.factorDecomposition.ratesFactorPct, 2)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.abs(activeResult.factorDecomposition.ratesFactorPct) * 150)}%` }}
                />
              </div>
            </div>

            {/* Credit Spread Factor */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1">
                <span>Credit Spread Widening Factor:</span>
                <span className={`font-bold ${activeResult.factorDecomposition.creditFactorPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {activeResult.factorDecomposition.creditFactorPct >= 0 ? '+' : ''}
                  {formatPercent(activeResult.factorDecomposition.creditFactorPct, 2)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.abs(activeResult.factorDecomposition.creditFactorPct) * 150)}%` }}
                />
              </div>
            </div>

            {/* Oil Shock Factor */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1">
                <span>Crude Oil / Energy Factor:</span>
                <span className={`font-bold ${activeResult.factorDecomposition.oilFactorPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {activeResult.factorDecomposition.oilFactorPct >= 0 ? '+' : ''}
                  {formatPercent(activeResult.factorDecomposition.oilFactorPct, 2)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.abs(activeResult.factorDecomposition.oilFactorPct) * 150)}%` }}
                />
              </div>
            </div>

            {/* Inflation Factor */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1">
                <span>CPI Inflation Surprise Factor:</span>
                <span className={`font-bold ${activeResult.factorDecomposition.inflationFactorPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {activeResult.factorDecomposition.inflationFactorPct >= 0 ? '+' : ''}
                  {formatPercent(activeResult.factorDecomposition.inflationFactorPct, 2)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.abs(activeResult.factorDecomposition.inflationFactorPct) * 150)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Multi-Portfolio Comparison */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <div>
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Multi-Portfolio Stress Resilience Comparison
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Side-by-side resilience performance under this scenario
              </CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                  <th className="py-2.5 px-4 font-semibold">Portfolio</th>
                  <th className="py-2.5 px-4 font-semibold">Shock Return</th>
                  <th className="py-2.5 px-4 font-semibold">Dollar Loss</th>
                  <th className="py-2.5 px-4 font-semibold">Resilience Alpha</th>
                  <th className="py-2.5 px-4 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                {allResults.map(({ portfolio, result }) => (
                  <tr key={portfolio.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: portfolio.color }} />
                      {portfolio.name}
                    </td>
                    <td className={`py-2.5 px-4 font-bold ${
                      result.portfolioShockReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {result.portfolioShockReturn >= 0 ? '+' : ''}
                      {formatPercent(result.portfolioShockReturn, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {formatCurrency(result.estimatedDollarLoss)}
                    </td>
                    <td className={`py-2.5 px-4 font-bold ${
                      result.resilienceAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {result.resilienceAlpha >= 0 ? '+' : ''}
                      {formatPercent(result.resilienceAlpha, 2)}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge
                        variant={result.resilienceGrade.startsWith('A') ? 'success' : result.resilienceGrade === 'B' ? 'info' : 'warning'}
                        className="text-[10px]"
                      >
                        Grade {result.resilienceGrade}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {/* Benchmark row */}
                <tr className="bg-slate-50/60">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Benchmark ({benchmarkSymbol})
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-700">
                    {formatPercent(activeResult.benchmarkShockReturn, 2)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">
                    {formatCurrency(Math.round(initialBalance * activeResult.benchmarkShockReturn))}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">0.00%</td>
                  <td className="py-2.5 px-4">
                    <Badge variant="neutral" className="text-[10px]">Baseline</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detailed Asset Sensitivities & Attribution Audit Ledger */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900 text-sm font-semibold">
              Asset Multi-Factor Sensitivity &amp; Loss Attribution Audit
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Complete matrix of factor betas, duration, convexity, unweighted shock response, and weighted portfolio impact
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-2.5 px-4 font-semibold">Asset Ticker</th>
                <th className="py-2.5 px-4 font-semibold">Weight</th>
                <th className="py-2.5 px-4 font-semibold">Equity Beta</th>
                <th className="py-2.5 px-4 font-semibold">Duration (Yrs)</th>
                <th className="py-2.5 px-4 font-semibold">Credit Beta</th>
                <th className="py-2.5 px-4 font-semibold">Oil Beta</th>
                <th className="py-2.5 px-4 font-semibold">CPI Beta</th>
                <th className="py-2.5 px-4 font-semibold">Asset Shock %</th>
                <th className="py-2.5 px-4 font-semibold">Portfolio Impact</th>
                <th className="py-2.5 px-4 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {activeResult.assetAttributions.map((attr) => (
                <tr key={attr.symbol} className="hover:bg-slate-50/60 transition">
                  <td className="py-2 px-4 font-bold text-slate-900 font-sans">{attr.symbol}</td>
                  <td className="py-2 px-4 text-slate-700">{formatPercent(attr.weight, 0)}</td>
                  <td className="py-2 px-4 text-slate-600">{attr.sensitivities.equityBeta.toFixed(2)}</td>
                  <td className="py-2 px-4 text-slate-600">{attr.sensitivities.durationYears.toFixed(1)}y</td>
                  <td className="py-2 px-4 text-slate-600">{attr.sensitivities.creditSpreadBeta.toFixed(2)}</td>
                  <td className="py-2 px-4 text-slate-600">{attr.sensitivities.oilBeta.toFixed(2)}</td>
                  <td className="py-2 px-4 text-slate-600">{attr.sensitivities.inflationBeta.toFixed(2)}</td>
                  <td className={`py-2 px-4 font-bold ${
                    attr.assetTotalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {attr.assetTotalReturn >= 0 ? '+' : ''}
                    {formatPercent(attr.assetTotalReturn, 2)}
                  </td>
                  <td className={`py-2 px-4 font-bold ${
                    attr.weightedPortfolioReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {attr.weightedPortfolioReturn >= 0 ? '+' : ''}
                    {formatPercent(attr.weightedPortfolioReturn, 2)}
                  </td>
                  <td className="py-2 px-4 font-sans">
                    <Badge
                      variant={
                        attr.hedgeStatus === 'hedged'
                          ? 'success'
                          : attr.hedgeStatus === 'loss_driver'
                          ? 'danger'
                          : 'neutral'
                      }
                      className="text-[10px]"
                    >
                      {attr.hedgeStatus === 'hedged'
                        ? 'Safe-Haven Hedge'
                        : attr.hedgeStatus === 'loss_driver'
                        ? 'Loss Driver'
                        : 'Neutral'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
