'use client';

import React, { useState, useMemo } from 'react';
import {
  ASSET_CLASSES,
  ASSET_CLASS_YEARS,
  ASSET_ALLOCATION_PRESETS,
  AssetAllocationPreset,
} from '@/data/assetClassData';
import {
  runAssetClassBacktest,
  PortfolioAllocationInput,
  AssetClassBacktestResult,
} from '@/analytics/assetClassBacktest';
import { AssetClassGrowthChart } from '@/components/charts/AssetClassGrowthChart';
import { AssetClassAnnualReturnsChart } from '@/components/charts/AssetClassAnnualReturnsChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatPercent, formatRatio, formatCurrency } from '@/utils/formatters';
import {
  History,
  Sliders,
  RotateCcw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Layers,
  BarChart3,
  Award,
} from 'lucide-react';
import { MacroScenarioBuilder, PortfolioStressTarget } from '@/components/stress/MacroScenarioBuilder';

const ASSET_TO_ETF_PROXY: Record<string, string> = {
  US_LARGE_CAP: 'SPY',
  US_SMALL_CAP: 'AVUV',
  INTL_DEVELOPED: 'VEA',
  EMERGING_MARKETS: 'VWO',
  TOTAL_BOND: 'BND',
  LONG_TREASURY: 'TLT',
  INTERM_TREASURY: 'IEF',
  CASH: 'CASH',
  GOLD: 'GLD',
  COMMODITIES: 'DBC',
  REITS: 'VNQ',
};

export default function AssetClassPage() {
  // Active editing portfolio tab (0 = Portfolio 1, 1 = Portfolio 2, 2 = Portfolio 3)
  const [activePortfolioTab, setActivePortfolioTab] = useState<number>(0);

  // 3 user portfolios
  const [portfolios, setPortfolios] = useState<PortfolioAllocationInput[]>([
    {
      id: 'port_1',
      name: 'Classic 60/40',
      weights: { US_LARGE_CAP: 0.60, TOTAL_BOND: 0.40 },
      color: '#2563EB',
    },
    {
      id: 'port_2',
      name: 'Ray Dalio All Weather',
      weights: {
        US_LARGE_CAP: 0.30,
        LONG_TREASURY: 0.40,
        INTERM_TREASURY: 0.15,
        GOLD: 0.075,
        COMMODITIES: 0.075,
      },
      color: '#059669',
    },
    {
      id: 'port_3',
      name: 'Harry Browne Permanent',
      weights: {
        US_LARGE_CAP: 0.25,
        LONG_TREASURY: 0.25,
        CASH: 0.25,
        GOLD: 0.25,
      },
      color: '#7C3AED',
    },
  ]);

  // Backtest settings
  const [startYear, setStartYear] = useState<number>(1972);
  const [endYear, setEndYear] = useState<number>(2025);
  const [rebalancing, setRebalancing] = useState<'annual' | 'none'>('annual');
  const [benchmarkId, setBenchmarkId] = useState<string>('classic_60_40');
  const [stressMode, setStressMode] = useState<'macro' | 'historical'>('macro');

  const macroStressPortfolios: PortfolioStressTarget[] = useMemo(() => {
    return portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color || '#2563EB',
      assets: Object.entries(p.weights).map(([assetId, weight]) => ({
        symbol: ASSET_TO_ETF_PROXY[assetId] || assetId,
        weight: (weight as number) || 0,
      })),
    }));
  }, [portfolios]);

  // Active editing portfolio
  const curP = portfolios[activePortfolioTab];

  // Helper to update active portfolio
  const updateActivePortfolio = (patch: Partial<PortfolioAllocationInput>) => {
    setPortfolios((prev) => {
      const next = [...prev];
      next[activePortfolioTab] = { ...next[activePortfolioTab], ...patch };
      return next;
    });
  };

  // Helper to update asset weight
  const handleWeightChange = (assetId: string, val: number) => {
    const updated = { ...curP.weights, [assetId]: Math.max(0, val) };
    updateActivePortfolio({ weights: updated });
  };

  // Load preset into current portfolio
  const applyPreset = (preset: AssetAllocationPreset) => {
    updateActivePortfolio({
      name: preset.name,
      weights: { ...preset.weights },
    });
  };

  // Normalize current portfolio to 100%
  const normalizeCurrentWeights = () => {
    const total = Object.values(curP.weights).reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    const normalized: Record<string, number> = {};
    for (const [k, v] of Object.entries(curP.weights)) {
      normalized[k] = Math.round((v / total) * 1000) / 1000;
    }
    updateActivePortfolio({ weights: normalized });
  };

  // Set Equal Weight across non-zero assets
  const setEqualWeight = () => {
    const activeKeys = Object.keys(curP.weights).filter((k) => (curP.weights[k] || 0) > 0);
    const keys = activeKeys.length > 0 ? activeKeys : ['US_LARGE_CAP', 'TOTAL_BOND', 'GOLD', 'CASH'];
    const eqW = Math.round((1 / keys.length) * 1000) / 1000;
    const updated: Record<string, number> = {};
    keys.forEach((k) => (updated[k] = eqW));
    updateActivePortfolio({ weights: updated });
  };

  // Calculate current sum of weights
  const currentWeightSum = useMemo(() => {
    return Object.values(curP.weights).reduce((a, b) => a + b, 0);
  }, [curP.weights]);

  // Execute Backtest
  const backtestResult = useMemo<AssetClassBacktestResult | null>(() => {
    try {
      return runAssetClassBacktest({
        portfolios,
        startYear,
        endYear,
        initialAmount: 10000,
        rebalancing,
        benchmarkId,
      });
    } catch (e) {
      console.error('Asset Class backtest error:', e);
      return null;
    }
  }, [portfolios, startYear, endYear, rebalancing, benchmarkId]);

  // Primary active portfolio result for KPI cards
  const primaryResult = backtestResult?.portfolios[activePortfolioTab] || backtestResult?.portfolios[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Class Allocation Studio"
        subtitle="54-Year Secular Macroeconomic Regimes (1972–Present)"
        description="Stress-test multi-asset portfolios across half a century of economic history, from the 1970s Great Stagflation and Volcker rate shock to the 2008 GFC, 2020 pandemic, and 2022 inflation regime."
        badge={
          <Badge variant="info" className="gap-1.5 font-medium">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>54 Years • 1972–Present</span>
          </Badge>
        }
      />

      {/* PORTFOLIO BUILDER CARD */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Portfolio Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200/80">
              {portfolios.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePortfolioTab(idx)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    activePortfolioTab === idx
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {/* Presets Dropdown & Fast Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  aria-label="Load Institutional Model Preset"
                  onChange={(e) => {
                    const found = ASSET_ALLOCATION_PRESETS.find((p) => p.id === e.target.value);
                    if (found) applyPreset(found);
                  }}
                  defaultValue=""
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer hover:bg-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Load Model Preset...
                  </option>
                  {ASSET_ALLOCATION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.author})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={normalizeCurrentWeights}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition cursor-pointer"
              >
                Normalize (100%)
              </button>

              <button
                type="button"
                onClick={setEqualWeight}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition cursor-pointer"
              >
                Equal Weight
              </button>

              <Badge
                variant={Math.abs(currentWeightSum - 1.0) < 0.01 ? 'success' : 'warning'}
                className="font-mono text-xs"
              >
                Sum: {formatPercent(currentWeightSum, 1)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Portfolio Name Input */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
              Portfolio Name:
            </label>
            <input
              type="text"
              value={curP.name}
              onChange={(e) => updateActivePortfolio({ name: e.target.value })}
              className="text-xs font-semibold text-slate-900 border border-slate-200 rounded-md px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>

          {/* 12 Asset Class Weight Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-2">
            {ASSET_CLASSES.map((ac) => {
              const currentW = curP.weights[ac.id] || 0;

              return (
                <div key={ac.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: ac.color }} />
                      <span className="text-xs font-semibold text-slate-800 truncate" title={ac.name}>
                        {ac.shortName}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 shrink-0">
                      {formatPercent(currentW, 1)}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 truncate mb-1.5" title={ac.proxyIndex}>
                    {ac.proxyIndex}
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.01"
                      value={currentW}
                      onChange={(e) => handleWeightChange(ac.id, parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(currentW * 100)}
                      onChange={(e) => handleWeightChange(ac.id, (parseFloat(e.target.value) || 0) / 100)}
                      className="w-12 text-[11px] font-mono font-semibold text-right border border-slate-200 rounded px-1 py-0.5 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SIMULATION SETTINGS BAR */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Start Year */}
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>Start Year:</span>
                <span className="font-mono font-semibold text-slate-900">{startYear}</span>
              </div>
              <input
                type="range"
                min="1972"
                max={endYear - 1}
                step="1"
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* End Year */}
            <div>
              <div className="flex justify-between text-slate-600 mb-1">
                <span>End Year:</span>
                <span className="font-mono font-semibold text-slate-900">{endYear}</span>
              </div>
              <input
                type="range"
                min={startYear + 1}
                max="2025"
                step="1"
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Rebalancing Frequency */}
            <div>
              <label className="text-slate-600 block mb-1">Rebalancing Schedule:</label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRebalancing('annual')}
                  className={`py-1 px-2 rounded text-[11px] font-medium transition cursor-pointer ${
                    rebalancing === 'annual'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annually
                </button>
                <button
                  type="button"
                  onClick={() => setRebalancing('none')}
                  className={`py-1 px-2 rounded text-[11px] font-medium transition cursor-pointer ${
                    rebalancing === 'none'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buy & Hold (Drift)
                </button>
              </div>
            </div>

            {/* Designated Benchmark */}
            <div>
              <label htmlFor="benchmark-select" className="text-slate-600 block mb-1">Designated Benchmark:</label>
              <select
                id="benchmark-select"
                value={benchmarkId}
                onChange={(e) => setBenchmarkId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
              >
                <option value="classic_60_40">Classic 60/40 (Vanguard)</option>
                <option value="us_total_equity">100% US Large Cap</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6 EXECUTIVE KPI METRIC CARDS */}
      {primaryResult && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Nominal CAGR"
            value={formatPercent(primaryResult.kpis.nominalCagr, 2)}
            change={`${startYear}–${endYear} (${endYear - startYear + 1}Y)`}
            changeType={primaryResult.kpis.nominalCagr >= 0.08 ? 'positive' : 'neutral'}
          />

          <MetricCard
            label="Real CAGR (CPI-U)"
            value={formatPercent(primaryResult.kpis.realCagr, 2)}
            change="Inflation-Adjusted"
            changeType={primaryResult.kpis.realCagr >= 0.04 ? 'positive' : 'neutral'}
          />

          <MetricCard
            label="Annual Volatility"
            value={formatPercent(primaryResult.kpis.annualVolatility, 2)}
            change={
              backtestResult?.benchmark
                ? `${formatPercent(
                    primaryResult.kpis.annualVolatility - backtestResult.benchmark.kpis.annualVolatility,
                    1
                  )} vs Bench`
                : 'Annualized StdDev'
            }
            changeType={
              backtestResult?.benchmark &&
              primaryResult.kpis.annualVolatility <= backtestResult.benchmark.kpis.annualVolatility
                ? 'positive'
                : 'negative'
            }
          />

          <MetricCard
            label="Sharpe Ratio"
            value={formatRatio(primaryResult.kpis.sharpeRatio, 2)}
            change={`Sortino: ${formatRatio(primaryResult.kpis.sortinoRatio, 2)}`}
            changeType={primaryResult.kpis.sharpeRatio >= 0.5 ? 'positive' : 'neutral'}
          />

          <MetricCard
            label="Max Drawdown"
            value={formatPercent(primaryResult.kpis.maxDrawdownNominal, 2)}
            change={`Real DD: ${formatPercent(primaryResult.kpis.maxDrawdownReal, 1)}`}
            changeType={primaryResult.kpis.maxDrawdownNominal > -0.25 ? 'positive' : 'negative'}
          />

          <MetricCard
            label="Worst Year"
            value={formatPercent(primaryResult.kpis.worstYear.return, 1)}
            change={`Year ${primaryResult.kpis.worstYear.year}`}
            changeType="negative"
          />
        </div>
      )}

      {/* 54-YEAR GROWTH & UNDERWATER DRAWDOWN CHART */}
      {backtestResult && (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Historical Wealth Compounding & Underwater Drawdowns</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  $10,000 compounding across 54 years with linear/log scale and nominal vs CPI-U real purchasing power toggles
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>{backtestResult.years.length} Calendar Years</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <AssetClassGrowthChart
              portfolios={backtestResult.portfolios}
              benchmark={backtestResult.benchmark}
            />
          </CardContent>
        </Card>
      )}

      {/* 54-YEAR ANNUAL RETURNS SIDE-BY-SIDE BAR CHART */}
      {backtestResult && (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Annual Return Breakdown (1972–2025)</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Year-by-year comparison demonstrating stability during market dislocations (1973–74, 1987, 2008, 2022)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <AssetClassAnnualReturnsChart
              portfolios={backtestResult.portfolios}
              benchmark={backtestResult.benchmark}
            />
          </CardContent>
        </Card>
      )}

      {/* DECADE-BY-DECADE ATTRIBUTION MATRIX TABLE */}
      {primaryResult && (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Decade-by-Decade Performance Matrix</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Secular macro performance of {primaryResult.name} across distinct 10-year economic cycles
                </CardDescription>
              </div>
              <Badge variant="neutral">{primaryResult.decades.length} Decades Analyzed</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-slate-700">Decade Regime</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700">Years</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Cumulative Return</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Nominal CAGR</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Real CAGR</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Volatility</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Max Drawdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {primaryResult.decades.map((dec) => (
                    <tr key={dec.decadeName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">
                        {dec.decadeName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {dec.startYear}–{dec.endYear} ({dec.yearsCount}Y)
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          dec.periodReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {dec.periodReturn >= 0 ? `+${formatPercent(dec.periodReturn, 1)}` : formatPercent(dec.periodReturn, 1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {formatPercent(dec.cagr, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-blue-600">
                        {formatPercent(dec.realCagr, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatPercent(dec.volatility, 1)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                        {formatPercent(dec.maxDrawdown, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MACRO STRESS TESTING SECTION */}
      {primaryResult && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Macro Stress-Testing &amp; Scenario Studio
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluate asset class portfolios under real-time multi-factor shocks and historical crises
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setStressMode('macro')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  stressMode === 'macro'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Multi-Factor Macro Engine
              </button>
              <button
                type="button"
                onClick={() => setStressMode('historical')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  stressMode === 'historical'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Historical Crisis Matrix
              </button>
            </div>
          </div>

          {stressMode === 'macro' ? (
            <MacroScenarioBuilder
              portfolios={macroStressPortfolios}
              initialBalance={10000}
              benchmarkSymbol="SPY"
            />
          ) : (
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Historical Crisis Stress-Testing Matrix</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Stress-testing {primaryResult.name} resilience across 7 landmark financial crises and market crashes
                    </CardDescription>
                  </div>
                  <Badge variant="neutral">7 Historical Regimes</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">Crisis Event</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">Period</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">Macro Dynamic</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Nominal Return</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Real Return</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Max Drawdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {primaryResult.crises.map((cr) => (
                        <tr key={cr.crisisId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                            {cr.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-semibold">
                            {cr.period}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px] max-w-xs truncate" title={cr.description}>
                            {cr.description}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              cr.periodReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {cr.periodReturn >= 0 ? `+${formatPercent(cr.periodReturn, 1)}` : formatPercent(cr.periodReturn, 1)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-medium ${
                              cr.realReturn >= 0 ? 'text-blue-600' : 'text-rose-600'
                            }`}
                          >
                            {cr.realReturn >= 0 ? `+${formatPercent(cr.realReturn, 1)}` : formatPercent(cr.realReturn, 1)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                            {formatPercent(cr.maxDrawdown, 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
