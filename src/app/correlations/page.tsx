'use client';

import React, { useState, useMemo } from 'react';
import { calculateCorrelationMatrix, calculateAutocorrelation, calculateADFTest } from '@/analytics/statistics';
import { CURATED_SECURITIES, CURATED_RETURNS } from '@/data/curatedData';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui';
import { Grid, Activity, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';

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

  const { matrix, symbols } = useMemo(() => {
    const valid = selectedSymbols.filter((s) => CURATED_RETURNS[s]);
    const series = valid.map((s) => CURATED_RETURNS[s]);
    const mat = calculateCorrelationMatrix(series);
    return { matrix: mat, symbols: valid };
  }, [selectedSymbols]);

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
