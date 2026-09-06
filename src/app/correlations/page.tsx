'use client';

import React, { useState, useMemo } from 'react';
import { calculateCorrelationMatrix, calculateAutocorrelation, calculateADFTest } from '@/analytics/statistics';
import { CURATED_SECURITIES, CURATED_RETURNS } from '@/data/curatedData';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { Grid, BarChart2, ShieldCheck, Activity } from 'lucide-react';

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Asset Correlations & Statistical Cointegration
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Pairwise correlation matrices, return autocorrelation persistence, and Augmented Dickey-Fuller stationarity tests
        </p>
      </div>

      {/* Symbol selection */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-sky-400" /> Active Securities in Correlation Matrix
          </span>
          <span className="text-xs font-mono text-slate-400">{symbols.length} Assets</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CURATED_SECURITIES.map((sec) => {
            const isSelected = selectedSymbols.includes(sec.symbol);
            return (
              <button
                key={sec.symbol}
                type="button"
                onClick={() => toggleSymbol(sec.symbol)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {sec.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Correlation Heatmap */}
      <CorrelationHeatmap symbols={symbols} matrix={matrix} />

      {/* Autocorrelation & Cointegration Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Autocorrelation Bar List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <h3 className="font-semibold text-sm text-white">Autocorrelation by Lag</h3>
            </div>
            <select
              value={activeAsset}
              onChange={(e) => setActiveAsset(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-400">
            Serial correlation from Lag 1 to Lag 12 months. Positive implies trend persistence; negative implies mean reversion.
          </p>

          <div className="space-y-1.5 font-mono text-xs">
            {autocorrelations.map((val, idx) => {
              const lag = idx + 1;
              const barPct = Math.min(100, Math.abs(val) * 200);
              return (
                <div key={lag} className="flex items-center gap-2">
                  <span className="w-12 text-slate-400 text-[11px]">Lag {lag}:</span>
                  <div className="flex-1 bg-slate-950 h-4 rounded overflow-hidden flex items-center">
                    <div
                      className={`h-full ${val >= 0 ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span
                    className={`w-14 text-right text-[11px] font-semibold ${
                      val >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {val.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cointegration & Stationarity Test */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm text-white">Augmented Dickey-Fuller (ADF) Test</h3>
          </div>

          <p className="text-xs text-slate-400">
            Tests whether the return series has a unit root. A strongly negative test statistic confirms statistical stationarity.
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Security:</span>
              <span className="text-white font-bold">{activeAsset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ADF Test Statistic:</span>
              <span className="text-emerald-400 font-bold">{adf.testStat.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Critical Value (95% Conf):</span>
              <span className="text-slate-300">-2.860</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2">
              <span className="text-slate-400">Stationary at 95% Confidence:</span>
              <span className={adf.isStationary95 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {adf.isStationary95 ? 'YES (Stationary)' : 'NO (Unit Root)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
