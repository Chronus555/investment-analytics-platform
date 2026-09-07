'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateActiveMetrics,
  calculateRollingActiveMetrics,
  ActiveMetrics,
} from '@/analytics/attribution';
import { CURATED_SECURITIES, CURATED_RETURNS, CURATED_DATES } from '@/data/curatedData';
import { ActiveReturnChart } from '@/components/charts/ActiveReturnChart';
import { MarketCaptureChart } from '@/components/charts/MarketCaptureChart';
import { RollingAlphaBetaChart } from '@/components/charts/RollingAlphaBetaChart';
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
  Award,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Activity,
  ArrowRightLeft,
  Sliders,
  Calendar,
  Layers,
  BarChart2,
} from 'lucide-react';

interface PresetPortfolio {
  id: string;
  name: string;
  weights: Record<string, number>;
}

const PRESET_PORTFOLIOS: PresetPortfolio[] = [
  {
    id: 'classic-6040',
    name: 'Classic 60/40 (SPY/BND)',
    weights: { SPY: 0.6, BND: 0.4 },
  },
  {
    id: 'tech-growth',
    name: 'Tech Growth (QQQ/SPY)',
    weights: { QQQ: 0.7, SPY: 0.3 },
  },
  {
    id: 'permanent',
    name: 'Permanent Portfolio (SPY/TLT/GLD/SHV)',
    weights: { SPY: 0.25, TLT: 0.25, GLD: 0.25, SHV: 0.25 },
  },
  {
    id: 'all-weather',
    name: 'All Weather (SPY/TLT/GLD/VNQ/BND)',
    weights: { SPY: 0.3, TLT: 0.4, GLD: 0.15, VNQ: 0.075, BND: 0.075 },
  },
];

export default function AttributionPage() {
  // Mode: Single Ticker vs Multi-Asset Preset
  const [managerMode, setManagerMode] = useState<'ticker' | 'preset'>('ticker');
  const [selectedTicker, setSelectedTicker] = useState<string>('QQQ');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('classic-6040');
  const [benchmarkSymbol, setBenchmarkSymbol] = useState<string>('SPY');
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.04);
  const [rollingWindow, setRollingWindow] = useState<number>(24);

  // Compute Manager Return Series
  const managerReturns = useMemo(() => {
    if (managerMode === 'ticker') {
      return CURATED_RETURNS[selectedTicker] || CURATED_RETURNS['SPY'] || [];
    } else {
      const preset = PRESET_PORTFOLIOS.find((p) => p.id === selectedPresetId);
      if (!preset) return CURATED_RETURNS['SPY'] || [];

      const n = CURATED_DATES.length;
      const composite: number[] = new Array(n).fill(0);

      Object.entries(preset.weights).forEach(([sym, weight]) => {
        const rets = CURATED_RETURNS[sym] || [];
        for (let i = 0; i < n; i++) {
          composite[i] += (rets[i] || 0) * weight;
        }
      });
      return composite;
    }
  }, [managerMode, selectedTicker, selectedPresetId]);

  const benchmarkReturns = useMemo(() => {
    return CURATED_RETURNS[benchmarkSymbol] || CURATED_RETURNS['SPY'] || [];
  }, [benchmarkSymbol]);

  const managerLabel = useMemo(() => {
    if (managerMode === 'ticker') {
      const sec = CURATED_SECURITIES.find((s) => s.symbol === selectedTicker);
      return sec ? `${sec.symbol} (${sec.name})` : selectedTicker;
    } else {
      const p = PRESET_PORTFOLIOS.find((preset) => preset.id === selectedPresetId);
      return p ? p.name : 'Custom Portfolio';
    }
  }, [managerMode, selectedTicker, selectedPresetId]);

  const benchmarkLabel = useMemo(() => {
    const sec = CURATED_SECURITIES.find((s) => s.symbol === benchmarkSymbol);
    return sec ? `${sec.symbol} (${sec.name})` : benchmarkSymbol;
  }, [benchmarkSymbol]);

  // Compute Active Risk Attribution Metrics
  const activeMetrics: ActiveMetrics = useMemo(() => {
    return calculateActiveMetrics(managerReturns, benchmarkReturns, CURATED_DATES, riskFreeRate);
  }, [managerReturns, benchmarkReturns, riskFreeRate]);

  // Compute Rolling Active Metrics
  const rollingMetrics = useMemo(() => {
    return calculateRollingActiveMetrics(
      managerReturns,
      benchmarkReturns,
      CURATED_DATES,
      rollingWindow,
      riskFreeRate
    );
  }, [managerReturns, benchmarkReturns, rollingWindow, riskFreeRate]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Manager Performance & Active Risk Attribution"
        description="Rigorously evaluate manager skill (Alpha), benchmark sensitivity (Beta), active risk efficiency (Information Ratio), market asymmetry, and outperformance consistency."
        badge="PV 1.4 Benchmark Parity"
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
                  Attribution Controls & Benchmark Mapping
                </CardTitle>
                <CardDescription className="text-xs">
                  Compare single asset or composite multi-asset portfolio against reference benchmark.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setManagerMode('ticker')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  managerMode === 'ticker'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Asset
              </button>
              <button
                type="button"
                onClick={() => setManagerMode('preset')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  managerMode === 'preset'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Model Portfolio
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Target Manager / Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Manager / Target Asset
            </label>
            {managerMode === 'ticker' ? (
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {CURATED_SECURITIES.map((sec) => (
                  <option key={sec.symbol} value={sec.symbol}>
                    {sec.symbol} - {sec.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {PRESET_PORTFOLIOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reference Benchmark */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reference Benchmark
            </label>
            <select
              value={benchmarkSymbol}
              onChange={(e) => setBenchmarkSymbol(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="SPY">SPY - S&P 500 Large Cap</option>
              <option value="VTI">VTI - Total US Stock Market</option>
              <option value="QQQ">QQQ - Nasdaq 100 Growth</option>
              <option value="BND">BND - Total Bond Market</option>
              <option value="AGG">AGG - US Aggregate Bond</option>
              <option value="EFA">EFA - MSCI EAFE Developed</option>
              <option value="GLD">GLD - SPDR Gold Shares</option>
            </select>
          </div>

          {/* Risk-Free Rate */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Risk-Free Rate (Annual)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                max="15"
                value={(riskFreeRate * 100).toFixed(1)}
                onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) / 100 || 0)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                %
              </span>
            </div>
          </div>

          {/* Rolling Lookback Window */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rolling Lookback Window
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[12, 24, 36].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setRollingWindow(w)}
                  className={`h-9 rounded-lg text-xs font-mono font-medium transition-all ${
                    rollingWindow === w
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w}M
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Jensen's Alpha"
          value={`${activeMetrics.annualizedAlpha >= 0 ? '+' : ''}${(
            activeMetrics.annualizedAlpha * 100
          ).toFixed(2)}%`}
          change={`Monthly: ${(activeMetrics.monthlyAlpha * 100).toFixed(2)}%`}
          changeType={activeMetrics.annualizedAlpha >= 0 ? 'positive' : 'negative'}
        />

        <MetricCard
          label="Market Beta (β)"
          value={activeMetrics.beta.toFixed(2)}
          change={`R² = ${(activeMetrics.rSquared * 100).toFixed(1)}%`}
          changeType="neutral"
        />

        <MetricCard
          label="Information Ratio"
          value={activeMetrics.informationRatio.toFixed(2)}
          change={`TE: ${(activeMetrics.trackingError * 100).toFixed(2)}%`}
          changeType={activeMetrics.informationRatio >= 0.5 ? 'positive' : 'neutral'}
        />

        <MetricCard
          label="Tracking Error"
          value={`${(activeMetrics.trackingError * 100).toFixed(2)}%`}
          change="Active Volatility"
          changeType="neutral"
        />

        <MetricCard
          label="Batting Average"
          value={`${activeMetrics.battingAverage.toFixed(1)}%`}
          change={`${activeMetrics.winMonths} / ${activeMetrics.totalMonths} mos`}
          changeType={activeMetrics.battingAverage >= 50 ? 'positive' : 'negative'}
        />

        <MetricCard
          label="Capture Ratio"
          value={`${activeMetrics.captureRatio.toFixed(2)}x`}
          change={`Up: ${activeMetrics.upCapture.toFixed(0)}% / Dn: ${activeMetrics.downCapture.toFixed(0)}%`}
          changeType={activeMetrics.captureRatio >= 1.0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Main Attribution Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Active Excess Return (2 cols on large screen) */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Cumulative Active Excess Return
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compounded percentage wealth outperformance vs. {benchmarkSymbol} baseline
                  </CardDescription>
                </div>
              </div>
              <Badge variant="neutral" className="font-mono text-[11px]">
                {CURATED_DATES.length} Months Tracked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ActiveReturnChart
              data={activeMetrics.cumulativeActiveSeries}
              managerLabel={managerLabel}
              benchmarkLabel={benchmarkSymbol}
              height={320}
            />
          </CardContent>
        </Card>

        {/* Market Capture Profile (1 col) */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Market Capture Asymmetry
                </CardTitle>
                <CardDescription className="text-xs">
                  Bull vs. Bear market participation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <MarketCaptureChart
              upCapture={activeMetrics.upCapture}
              downCapture={activeMetrics.downCapture}
              captureRatio={activeMetrics.captureRatio}
            />

            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Manager CAGR</span>
                <span className="font-mono font-semibold text-slate-900">
                  {(activeMetrics.managerCAGR * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Benchmark CAGR</span>
                <span className="font-mono font-semibold text-slate-900">
                  {(activeMetrics.benchmarkCAGR * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Annualized Volatility</span>
                <span className="font-mono font-semibold text-slate-900">
                  {(activeMetrics.managerVol * 100).toFixed(2)}% vs {(activeMetrics.benchmarkVol * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Modigliani M² Measure</span>
                <span className="font-mono font-semibold text-blue-700">
                  {(activeMetrics.modiglianiM2 * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Rolling Active Studio & Outperformance Consistency Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rolling Alpha, Beta & IR (2 cols) */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Rolling Active Risk Studio
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evaluate parameter persistence and style drift over rolling {rollingWindow}-month windows
                  </CardDescription>
                </div>
              </div>
              <Badge variant="neutral" className="font-mono text-[11px]">
                {rollingWindow}M Lookback
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <RollingAlphaBetaChart
              data={rollingMetrics}
              windowMonths={rollingWindow}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Consistency & Outperformance Streaks (1 col) */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Consistency & Win Rate
                </CardTitle>
                <CardDescription className="text-xs">
                  Streak and magnitude distribution
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[11px] text-slate-500 font-medium">Outperform Months</div>
                <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                  {activeMetrics.winMonths}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Avg: +{(activeMetrics.avgWinReturn * 100).toFixed(2)}%
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[11px] text-slate-500 font-medium">Underperform Months</div>
                <div className="text-lg font-bold font-mono text-rose-600 mt-0.5">
                  {activeMetrics.lossMonths}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Avg: -{(activeMetrics.avgLossReturn * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-2">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Win/Loss Magnitude Ratio</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeMetrics.winLossRatio.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Max Outperforming Streak</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {activeMetrics.maxConsecutiveWins} Consecutive Mos
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Max Underperforming Streak</span>
                <span className="font-mono font-semibold text-rose-700">
                  {activeMetrics.maxConsecutiveLosses} Consecutive Mos
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Treynor Ratio</span>
                <span className="font-mono font-semibold text-slate-900">
                  {(activeMetrics.treynorRatio * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Sharpe Ratio Spread</span>
                <span
                  className={`font-mono font-bold ${
                    activeMetrics.managerSharpe >= activeMetrics.benchmarkSharpe
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {(activeMetrics.managerSharpe - activeMetrics.benchmarkSharpe >= 0 ? '+' : '')}
                  {(activeMetrics.managerSharpe - activeMetrics.benchmarkSharpe).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Explanatory Footnote */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-900">
                Mathematical Verification Standards & Academic Citations:
              </span>
              <p>
                Calculations conform strictly to institutional GIPS standards. Jensen&apos;s Alpha decomposes
                excess return above the Security Market Line (Alpha = R_p - [R_f + Beta * (R_b - R_f)]).
                Information Ratio evaluates residual skill scaled by annualized tracking error (IR = Mean Active Return &times; 12 / Tracking Error).
                Capture ratios calculate geometric annualized CAGR over bull (R_b &gt; 0) and bear (R_b &lt; 0) market regimes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
