'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateCorrelationMatrix,
  calculateAutocorrelation,
  calculateADFTest,
  calculateRollingCorrelation,
} from '@/analytics/statistics';
import { CURATED_SECURITIES, CURATED_RETURNS, CURATED_DATES } from '@/data/curatedData';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { RollingCorrelationChart } from '@/components/charts/RollingCorrelationChart';
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
import { Grid, Activity, ShieldCheck, CheckCircle, AlertTriangle, ArrowRightLeft } from 'lucide-react';

export default function CorrelationsPage() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    'SPY',
    'QQQ',
    'VTI',
    'BND',
    'TLT',
    'GLD',
    'VNQ',
    'EFA',
  ]);

  const [activeAsset, setActiveAsset] = useState('SPY');

  // Rolling Pairwise Correlation State
  const [rollingAssetA, setRollingAssetA] = useState('SPY');
  const [rollingAssetB, setRollingAssetB] = useState('TLT');
  const [rollingWindow, setRollingWindow] = useState(12);

  const { matrix, symbols } = useMemo(() => {
    const valid = selectedSymbols.filter((s) => CURATED_RETURNS[s]);
    const series = valid.map((s) => CURATED_RETURNS[s]);
    const mat = calculateCorrelationMatrix(series);
    return { matrix: mat, symbols: valid };
  }, [selectedSymbols]);

  const rollingCorrSeries = useMemo(() => {
    const retsA = CURATED_RETURNS[rollingAssetA] || CURATED_RETURNS['SPY'] || [];
    const retsB = CURATED_RETURNS[rollingAssetB] || CURATED_RETURNS['TLT'] || [];
    return calculateRollingCorrelation(retsA, retsB, CURATED_DATES, rollingWindow);
  }, [rollingAssetA, rollingAssetB, rollingWindow]);

  const rollingSummary = useMemo(() => {
    if (rollingCorrSeries.length === 0) {
      return { current: 0, min: 0, max: 0, avg: 0 };
    }
    const vals = rollingCorrSeries.map((p) => p.correlation);
    const current = vals[vals.length - 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { current, min, max, avg };
  }, [rollingCorrSeries]);

  // Autocorrelation for active asset
  const autocorrelations = useMemo(() => {
    const returns = CURATED_RETURNS[activeAsset] || CURATED_RETURNS['SPY'] || [];
    return calculateAutocorrelation(returns, 12);
  }, [activeAsset]);

  // ADF Test for active asset
  const adf = useMemo(() => {
    const returns = CURATED_RETURNS[activeAsset] || CURATED_RETURNS['SPY'] || [];
    return calculateADFTest(returns);
  }, [activeAsset]);

  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 2) setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
    } else {
      setSelectedSymbols([...selectedSymbols, sym]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Correlations & Statistical Dynamics"
        description="Pairwise Pearson correlation matrix, serial autocorrelation persistence, and Augmented Dickey-Fuller stationarity tests."
      />

      {/* Symbol selection card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-slate-900">Matrix Securities ({symbols.length} Assets Active)</CardTitle>
            </div>
            <span className="text-xs font-mono text-slate-400">Min: 2 assets</span>
          </div>
          <CardDescription className="text-slate-500">
            Toggle securities to dynamically compute historical Pearson correlations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CURATED_SECURITIES.map((sec) => {
              const isSelected = selectedSymbols.includes(sec.symbol);
              return (
                <button
                  key={sec.symbol}
                  type="button"
                  onClick={() => toggleSymbol(sec.symbol)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {sec.symbol}
                  <span className="ml-1.5 text-[10px] text-slate-400 font-sans">{sec.assetClass}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Correlation Heatmap */}
      <CorrelationHeatmap symbols={symbols} matrix={matrix} />

      {/* Rolling Pairwise Correlation Studio */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-slate-900">Rolling Pairwise Correlation Studio</CardTitle>
              <CardDescription className="text-slate-500">
                Track dynamic co-movement regime shifts, flight-to-safety episodes, and diversification breakdown
              </CardDescription>
            </div>
            {/* Quick Pair Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setRollingAssetA('SPY');
                  setRollingAssetB('TLT');
                }}
                className="px-2 py-1 text-xs font-mono rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                SPY/TLT
              </button>
              <button
                type="button"
                onClick={() => {
                  setRollingAssetA('SPY');
                  setRollingAssetB('GLD');
                }}
                className="px-2 py-1 text-xs font-mono rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                SPY/GLD
              </button>
              <button
                type="button"
                onClick={() => {
                  setRollingAssetA('QQQ');
                  setRollingAssetB('SPY');
                }}
                className="px-2 py-1 text-xs font-mono rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                QQQ/SPY
              </button>
              <button
                type="button"
                onClick={() => {
                  setRollingAssetA('SPY');
                  setRollingAssetB('BND');
                }}
                className="px-2 py-1 text-xs font-mono rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                SPY/BND
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Asset A
              </label>
              <select
                value={rollingAssetA}
                onChange={(e) => setRollingAssetA(e.target.value)}
                className="w-full h-8 bg-white border border-slate-200 rounded-md px-2.5 font-mono text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {CURATED_SECURITIES.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-slate-600 mb-1 text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Asset B
                </label>
                <select
                  value={rollingAssetB}
                  onChange={(e) => setRollingAssetB(e.target.value)}
                  className="w-full h-8 bg-white border border-slate-200 rounded-md px-2.5 font-mono text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {CURATED_SECURITIES.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  const temp = rollingAssetA;
                  setRollingAssetA(rollingAssetB);
                  setRollingAssetB(temp);
                }}
                title="Swap Asset A and Asset B"
                className="mt-4 p-1.5 h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Rolling Window
              </label>
              <select
                value={rollingWindow}
                onChange={(e) => setRollingWindow(parseInt(e.target.value, 10))}
                className="w-full h-8 bg-white border border-slate-200 rounded-md px-2.5 font-mono text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="6">6 Months (Fast Tactical)</option>
                <option value="12">12 Months (1 Year Standard)</option>
                <option value="24">24 Months (2 Year Regime)</option>
                <option value="36">36 Months (3 Year Macro Cycle)</option>
              </select>
            </div>

            <div className="flex items-end h-full pb-0.5">
              <span className="text-[11px] text-slate-500 font-mono">
                {rollingCorrSeries.length} Rolling Periods Evaluated
              </span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Current Correlation"
              value={rollingSummary.current >= 0 ? `+${rollingSummary.current.toFixed(3)}` : rollingSummary.current.toFixed(3)}
              helperText={`Latest ${rollingWindow}M rolling value`}
              change={rollingSummary.current > 0 ? 'Co-moving' : 'Diversifying'}
              changeType={rollingSummary.current <= 0 ? 'positive' : 'neutral'}
            />
            <MetricCard
              label="Minimum Correlation"
              value={rollingSummary.min >= 0 ? `+${rollingSummary.min.toFixed(3)}` : rollingSummary.min.toFixed(3)}
              helperText="Deepest diversification trough"
              change={`${rollingSummary.min.toFixed(2)}`}
              changeType="positive"
            />
            <MetricCard
              label="Maximum Correlation"
              value={rollingSummary.max >= 0 ? `+${rollingSummary.max.toFixed(3)}` : rollingSummary.max.toFixed(3)}
              helperText="Peak co-movement level"
              change={`${rollingSummary.max.toFixed(2)}`}
              changeType="neutral"
            />
            <MetricCard
              label="Period Average"
              value={rollingSummary.avg >= 0 ? `+${rollingSummary.avg.toFixed(3)}` : rollingSummary.avg.toFixed(3)}
              helperText="Full-cycle average correlation"
              change={`${rollingSummary.avg.toFixed(2)}`}
              changeType={rollingSummary.avg <= 0 ? 'positive' : 'neutral'}
            />
          </div>

          {/* Rolling Chart */}
          <RollingCorrelationChart
            series={rollingCorrSeries}
            assetA={rollingAssetA}
            assetB={rollingAssetB}
            windowMonths={rollingWindow}
          />
        </CardContent>
      </Card>

      {/* Autocorrelation & Cointegration Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Autocorrelation Card */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-slate-900">Autocorrelation by Lag</CardTitle>
              </div>
              <select
                value={activeAsset}
                onChange={(e) => setActiveAsset(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <CardDescription className="text-slate-500">
              Serial correlation from Lag 1 to 12 months. Positive values indicate trend persistence; negative indicates mean reversion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-xs">
              {autocorrelations.map((val, idx) => {
                const lag = idx + 1;
                const barPct = Math.min(100, Math.abs(val) * 200);
                const isPositive = val >= 0;
                return (
                  <div key={lag} className="flex items-center gap-2.5">
                    <span className="w-14 text-slate-500 text-[11px] tabular-nums">Lag {lag}</span>
                    <div className="flex-1 bg-slate-100 h-3 rounded overflow-hidden flex items-center border border-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isPositive ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span
                      className={`w-14 text-right text-[11px] font-semibold tabular-nums ${
                        isPositive ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isPositive ? `+${val.toFixed(3)}` : val.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cointegration & Stationarity Test Card */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-slate-900">Stationarity (ADF Test)</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              Augmented Dickey-Fuller unit root test. Strongly negative statistics reject non-stationarity at 95% confidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Target Asset:</span>
                <span className="text-slate-900 font-bold">{activeAsset}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Test Statistic:</span>
                <span className="text-emerald-700 font-bold tabular-nums">{adf.testStat.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Critical Value (95% Conf):</span>
                <span className="text-slate-700 tabular-nums">-2.860</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Stationarity Conclusion:</span>
                {adf.isStationary95 ? (
                  <Badge variant="success">
                    <CheckCircle className="w-3 h-3 mr-1 inline" />
                    Stationary (p &lt; 0.05)
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <AlertTriangle className="w-3 h-3 mr-1 inline" />
                    Unit Root (Non-Stationary)
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Financial Interpretation:</p>
              <p>
                {adf.isStationary95
                  ? `${activeAsset} exhibits mean-reverting stationary returns suitable for standard variance and correlation estimation without differencing.`
                  : `${activeAsset} displays non-stationary drift characteristics requiring caution when applying stationary models.`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
