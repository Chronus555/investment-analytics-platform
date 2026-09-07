'use client';

import React, { useState, useMemo } from 'react';
import {
  runDynamicAllocationBacktest,
  TargetDateConfig,
  PhaseConfig,
  RebalanceSchedule,
} from '@/analytics/dynamicAllocation';
import { CURATED_RETURNS, CURATED_DATES } from '@/data/curatedData';
import { GlidePathWeightsChart } from '@/components/charts/GlidePathWeightsChart';
import { DynamicGrowthChart } from '@/components/charts/DynamicGrowthChart';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  MetricCard,
} from '@/components/ui';
import {
  Milestone,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
  Calendar,
  CheckCircle2,
  PieChart,
} from 'lucide-react';

interface GlidePathPreset {
  id: string;
  name: string;
  description: string;
  startAge: number;
  retirementAge: number;
  initialEquity: number;
  terminalEquity: number;
}

const GLIDE_PATH_PRESETS: GlidePathPreset[] = [
  {
    id: 'vanguard-target',
    name: 'Vanguard Target Retirement',
    description: '90% equity at age 25 linearly transitioning to 40% equity at age 65',
    startAge: 25,
    retirementAge: 65,
    initialEquity: 90,
    terminalEquity: 40,
  },
  {
    id: 'aggressive-growth',
    name: 'Aggressive Capital Accumulation',
    description: '100% equity at age 20 transitioning to 50% equity at age 65',
    startAge: 20,
    retirementAge: 65,
    initialEquity: 100,
    terminalEquity: 50,
  },
  {
    id: 'conservative-glide',
    name: 'Conservative Wealth Preservation',
    description: '80% equity at age 30 transitioning to 30% equity at age 60',
    startAge: 30,
    retirementAge: 60,
    initialEquity: 80,
    terminalEquity: 30,
  },
];

const MULTI_PHASE_PRESETS: { id: string; name: string; phases: PhaseConfig[] }[] = [
  {
    id: '3-stage-lifecycle',
    name: '3-Stage Career Lifecycle',
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1: Aggressive Accumulation (2006-2012)',
        startDate: '2006-01',
        endDate: '2012-12',
        weights: { SPY: 0.60, QQQ: 0.25, BND: 0.15 },
      },
      {
        id: 'phase-2',
        name: 'Phase 2: Core Growth & Diversification (2013-2019)',
        startDate: '2013-01',
        endDate: '2019-12',
        weights: { SPY: 0.45, QQQ: 0.15, BND: 0.30, GLD: 0.10 },
      },
      {
        id: 'phase-3',
        name: 'Phase 3: Pre-Retirement Preservation (2020-Present)',
        startDate: '2020-01',
        endDate: '2026-12',
        weights: { SPY: 0.25, BND: 0.45, TLT: 0.20, GLD: 0.10 },
      },
    ],
  },
  {
    id: 'crisis-adaptive',
    name: 'Macro Regime Adaptive Allocation',
    phases: [
      {
        id: 'phase-gfc',
        name: 'GFC Capital Preservation (2006-2009)',
        startDate: '2006-01',
        endDate: '2009-12',
        weights: { SPY: 0.30, TLT: 0.40, GLD: 0.30 },
      },
      {
        id: 'phase-expansion',
        name: 'Zero-Rate Expansion Bull Run (2010-2021)',
        startDate: '2010-01',
        endDate: '2021-12',
        weights: { SPY: 0.60, QQQ: 0.30, BND: 0.10 },
      },
      {
        id: 'phase-inflation',
        name: 'Fed Rate Hike & Inflation Shock (2022-Present)',
        startDate: '2022-01',
        endDate: '2026-12',
        weights: { SPY: 0.40, BND: 0.30, GLD: 0.20, TIP: 0.10 },
      },
    ],
  },
];

export default function DynamicAllocationPage() {
  const [mode, setMode] = useState<'glide_path' | 'multi_phase'>('glide_path');

  // Glide Path Parameters
  const [selectedGlidePreset, setSelectedGlidePreset] = useState('vanguard-target');
  const [startAge, setStartAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(65);
  const [initialEquity, setInitialEquity] = useState(90);
  const [terminalEquity, setTerminalEquity] = useState(40);

  // Multi-Phase Parameters
  const [selectedPhasePresetId, setSelectedPhasePresetId] = useState('3-stage-lifecycle');

  // Common Parameters
  const [rebalanceSchedule, setRebalanceSchedule] = useState<RebalanceSchedule>('annually');
  const [initialCapital, setInitialCapital] = useState(10000);

  // Handle Preset Change for Glide Path
  const handleGlidePresetSelect = (presetId: string) => {
    setSelectedGlidePreset(presetId);
    const p = GLIDE_PATH_PRESETS.find((preset) => preset.id === presetId);
    if (p) {
      setStartAge(p.startAge);
      setRetirementAge(p.retirementAge);
      setInitialEquity(p.initialEquity);
      setTerminalEquity(p.terminalEquity);
    }
  };

  // Build Glide Path Config
  const glideConfig: TargetDateConfig = useMemo(() => {
    return {
      startAge,
      retirementAge,
      initialEquityWeight: initialEquity / 100,
      terminalEquityWeight: terminalEquity / 100,
      growthAssets: [
        { symbol: 'SPY', weightShare: 0.7 },
        { symbol: 'QQQ', weightShare: 0.3 },
      ],
      safetyAssets: [
        { symbol: 'BND', weightShare: 0.7 },
        { symbol: 'TLT', weightShare: 0.3 },
      ],
    };
  }, [startAge, retirementAge, initialEquity, terminalEquity]);

  // Build Multi-Phase Config
  const phasesConfig: PhaseConfig[] = useMemo(() => {
    const selected = MULTI_PHASE_PRESETS.find((p) => p.id === selectedPhasePresetId);
    return selected ? selected.phases : MULTI_PHASE_PRESETS[0].phases;
  }, [selectedPhasePresetId]);

  // Run Backtest Engine
  const result = useMemo(() => {
    return runDynamicAllocationBacktest(
      CURATED_DATES,
      CURATED_RETURNS,
      mode,
      glideConfig,
      phasesConfig,
      rebalanceSchedule,
      initialCapital,
      0.04
    );
  }, [mode, glideConfig, phasesConfig, rebalanceSchedule, initialCapital]);

  // Compute Benchmark comparison
  const bench6040Final = result.benchmark6040Periods[result.benchmark6040Periods.length - 1]?.value || initialCapital;
  const bench6040TotalRet = (bench6040Final - initialCapital) / initialCapital;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Dynamic Asset Allocation & Lifecycle Glide Path Studio"
        description="Backtest time-varying asset allocations, age-based target date glide paths, and multi-phase historical regimes with periodic rebalancing."
        badge="PV 1.3 Benchmark Parity"
      />

      {/* Control Panel Card */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Dynamic Allocation Model & Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose between age-based target-date lifecycle glide path or discrete historical macro regimes.
                </CardDescription>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMode('glide_path')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  mode === 'glide_path'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Target Date Glide Path
              </button>
              <button
                type="button"
                onClick={() => setMode('multi_phase')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  mode === 'multi_phase'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Multi-Phase Regimes
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {mode === 'glide_path' ? (
            <div className="space-y-4">
              {/* Presets row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {GLIDE_PATH_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleGlidePresetSelect(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedGlidePreset === preset.id
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{preset.name}</span>
                      {selectedGlidePreset === preset.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Glide Path Sliders / Number Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Starting Career Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="60"
                    value={startAge}
                    onChange={(e) => setStartAge(parseInt(e.target.value, 10) || 25)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retirement Age
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="80"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(parseInt(e.target.value, 10) || 65)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Equity Weight (%)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="100"
                    value={initialEquity}
                    onChange={(e) => setInitialEquity(parseInt(e.target.value, 10) || 90)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Terminal Equity Weight (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={terminalEquity}
                    onChange={(e) => setTerminalEquity(parseInt(e.target.value, 10) || 40)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MULTI_PHASE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPhasePresetId(preset.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedPhasePresetId === preset.id
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{preset.name}</span>
                      {selectedPhasePresetId === preset.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {preset.phases.map((ph) => (
                        <div key={ph.id} className="text-[11px] text-slate-600 flex justify-between">
                          <span className="font-medium">{ph.name.split(':')[0]}</span>
                          <span className="font-mono text-slate-500">
                            {Object.entries(ph.weights)
                              .map(([s, w]) => `${s} ${Math.round(w * 100)}%`)
                              .join(' / ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rebalance Schedule & Capital */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Rebalance Schedule:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['monthly', 'quarterly', 'annually', 'drift'] as RebalanceSchedule[]).map((sched) => (
                  <button
                    key={sched}
                    type="button"
                    onClick={() => setRebalanceSchedule(sched)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition ${
                      rebalanceSchedule === sched
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sched}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-slate-500 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Backtest Horizon: {CURATED_DATES[0]} to {CURATED_DATES[CURATED_DATES.length - 1]} ({CURATED_DATES.length} Months)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Ending Balance"
          value={`$${result.finalBalance.toLocaleString()}`}
          change={`Total: +${(result.totalReturn * 100).toFixed(1)}%`}
          changeType="positive"
        />

        <MetricCard
          label="Realized CAGR"
          value={`${(result.cagr * 100).toFixed(2)}%`}
          change={`Annualized`}
          changeType="positive"
        />

        <MetricCard
          label="Realized Volatility"
          value={`${(result.annualizedVolatility * 100).toFixed(2)}%`}
          change="Annual StDev"
          changeType="neutral"
        />

        <MetricCard
          label="Sharpe Ratio"
          value={result.sharpeRatio.toFixed(2)}
          change="Rf = 4.0%"
          changeType={result.sharpeRatio >= 0.25 ? 'positive' : 'neutral'}
        />

        <MetricCard
          label="Max Drawdown"
          value={`${(result.maxDrawdown * 100).toFixed(2)}%`}
          change="Peak to Trough"
          changeType={result.maxDrawdown > -0.3 ? 'positive' : 'negative'}
        />

        <MetricCard
          label="vs. 60/40 Benchmark"
          value={`${((result.totalReturn - bench6040TotalRet) * 100 >= 0 ? '+' : '')}${(
            (result.totalReturn - bench6040TotalRet) *
            100
          ).toFixed(1)}%`}
          change={`60/40: $${Math.round(bench6040Final).toLocaleString()}`}
          changeType={result.totalReturn >= bench6040TotalRet ? 'positive' : 'negative'}
        />
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Area Allocation Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Asset Allocation Weights Over Time
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Stacked percentage composition (0% to 100%) across lifecycle
                  </CardDescription>
                </div>
              </div>
              <Badge variant="neutral" className="font-mono text-[11px]">
                {mode === 'glide_path' ? 'Target Date Glide Path' : 'Multi-Phase Regimes'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <GlidePathWeightsChart periods={result.periods} height={300} />
          </CardContent>
        </Card>

        {/* Comparative Wealth Growth Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Comparative Wealth Trajectory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dynamic Strategy vs. Static 60/40 and 100% SPY baselines ($10k initial)
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <DynamicGrowthChart
              periods={result.periods}
              benchmarkPeriods={result.benchmarkPeriods}
              benchmark6040Periods={result.benchmark6040Periods}
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* Phase-by-Phase Performance Attribution Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Phase & Lifecycle Stage Performance Attribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Sequence of returns risk analysis and risk-adjusted metrics across distinct lifecycle intervals
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 p-0 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">Lifecycle Stage / Phase</th>
                  <th className="py-2.5 px-3 font-semibold">Time Period</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Months</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Start Wealth</th>
                  <th className="py-2.5 px-3 font-semibold text-right">End Wealth</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Phase CAGR</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Realized Vol</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Sharpe</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Max Drawdown</th>
                  <th className="py-2.5 px-3 font-semibold text-right">SPY CAGR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {result.phases.map((ph) => (
                  <tr key={ph.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                      {ph.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {ph.startDate} to {ph.endDate}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{ph.months}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      ${ph.startBalance.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      ${ph.endBalance.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        ph.cagr >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {ph.cagr >= 0 ? '+' : ''}
                      {ph.cagr.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{ph.volatility.toFixed(2)}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{ph.sharpe.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                      {ph.maxDrawdown.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {ph.benchmarkCAGR >= 0 ? '+' : ''}
                      {ph.benchmarkCAGR.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Institutional Explanatory Footnote */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-900">
                Academic Foundations of Lifecycle Investing:
              </span>
              <p>
                Dynamic target-date glide paths operationalize lifecycle financial theory (Merton 1969, Samuelson 1969,
                Bodie, Merton & Samuelson 1992). During early career accumulation, human capital resembles a large, bond-like
                inflation-indexed asset, justifying high financial equity exposures. As human capital converts into financial
                wealth, the portfolio shifts systematically toward fixed income to mitigate sequence of returns risk prior to retirement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
