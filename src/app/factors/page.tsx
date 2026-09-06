'use client';

import React, { useState, useMemo } from 'react';
import { runMultipleRegression, FactorRegressionResult } from '@/analytics/factors';
import { CURATED_RETURNS, CURATED_SECURITIES } from '@/data/curatedData';
import { TrendingUp, BarChart3, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function FactorsPage() {
  const [targetSymbol, setTargetSymbol] = useState('AVUV');
  const [modelType, setModelType] = useState<'capm' | 'ff3' | 'carhart4'>('ff3');

  // Synthesize standard academic factors from curated benchmark proxies
  // Market = SPY - BIL
  // SMB (Size) = IWM - SPY
  // HML (Value) = AVUV - QQQ (or proxy)
  // MOM (Momentum) = QQQ - SPY
  const { yExcess, xMatrix, factorNames } = useMemo(() => {
    const targetRets = CURATED_RETURNS[targetSymbol] || CURATED_RETURNS['SPY'] || [];
    const rf = CURATED_RETURNS['BIL'] || Array(targetRets.length).fill(0.002);
    const mkt = CURATED_RETURNS['SPY'] || [];
    const iwm = CURATED_RETURNS['IWM'] || [];
    const qqq = CURATED_RETURNS['QQQ'] || [];

    const y = targetRets.map((r, i) => r - (rf[i] || 0));

    let fNames: string[] = [];
    const x: number[][] = [];

    if (modelType === 'capm') {
      fNames = ['MKT-RF'];
      for (let i = 0; i < targetRets.length; i++) {
        x.push([mkt[i] - (rf[i] || 0)]);
      }
    } else if (modelType === 'ff3') {
      fNames = ['MKT-RF', 'SMB (Size)', 'HML (Value)'];
      for (let i = 0; i < targetRets.length; i++) {
        const mktRf = mkt[i] - (rf[i] || 0);
        const smb = iwm[i] - mkt[i]; // Small minus Big
        const hml = 0.5 * (targetRets[i] - qqq[i]); // High minus Low proxy
        x.push([mktRf, smb, hml]);
      }
    } else {
      fNames = ['MKT-RF', 'SMB (Size)', 'HML (Value)', 'MOM (Momentum)'];
      for (let i = 0; i < targetRets.length; i++) {
        const mktRf = mkt[i] - (rf[i] || 0);
        const smb = iwm[i] - mkt[i];
        const hml = 0.5 * (targetRets[i] - qqq[i]);
        const mom = qqq[i] - mkt[i];
        x.push([mktRf, smb, hml, mom]);
      }
    }

    return { yExcess: y, xMatrix: x, factorNames: fNames };
  }, [targetSymbol, modelType]);

  // Run OLS
  const regression = useMemo<FactorRegressionResult>(() => {
    return runMultipleRegression(yExcess, xMatrix, factorNames);
  }, [yExcess, xMatrix, factorNames]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Factor Analysis & Systematic Risk Regression
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Multi-factor Ordinary Least Squares (OLS) regressions, systematic risk factor loadings, t-statistics, and manager alpha
        </p>
      </div>

      {/* Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" /> Regression Setup
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {regression.observations} Monthly Observations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Target Fund or ETF</label>
            <select
              value={targetSymbol}
              onChange={(e) => setTargetSymbol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono"
            >
              {CURATED_SECURITIES.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Factor Model Specification</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
            >
              <option value="capm">CAPM (1-Factor: Market Beta)</option>
              <option value="ff3">Fama-French 3-Factor (Market, Size, Value)</option>
              <option value="carhart4">Carhart 4-Factor (Market, Size, Value, Momentum)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Regression Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">R-Squared (Fit)</span>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {(regression.rSquared * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-500">
            Adj R²: {(regression.adjRSquared * 100).toFixed(2)}%
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Annualized Alpha</span>
          <div
            className={`text-2xl font-bold font-mono ${
              regression.annualizedAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(regression.annualizedAlpha * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-500">
            Monthly: {(regression.alpha * 100).toFixed(2)}%
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Alpha t-Statistic</span>
          <div className="text-2xl font-bold font-mono text-slate-200">
            {regression.alphaTStat.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">
            p-value: {regression.alphaPValue.toFixed(4)}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-1">
          <span className="text-xs text-slate-400">Residual Volatility</span>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {(regression.residualVolatility * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-slate-500">Idiosyncratic active risk</span>
        </div>
      </div>

      {/* Factor Coefficients Table */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-white tracking-wide">
            Factor Coefficients & Significance Table
          </h3>
          <p className="text-xs text-slate-400">
            Factor loadings (Beta), t-statistics, and statistical significance levels
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Factor</th>
                <th className="py-2.5 px-3 text-right">Coefficient (Beta)</th>
                <th className="py-2.5 px-3 text-right">t-Statistic</th>
                <th className="py-2.5 px-3 text-right">p-Value</th>
                <th className="py-2.5 px-3 text-center">Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-3 font-semibold text-slate-200">Alpha (Intercept)</td>
                <td
                  className={`py-2.5 px-3 text-right font-bold ${
                    regression.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(regression.alpha * 100).toFixed(3)}%
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {regression.alphaTStat.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {regression.alphaPValue.toFixed(4)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      regression.alphaPValue < 0.05
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {regression.alphaPValue < 0.01
                      ? 'p < 0.01 ***'
                      : regression.alphaPValue < 0.05
                      ? 'p < 0.05 **'
                      : 'Not Sig'}
                  </span>
                </td>
              </tr>

              {factorNames.map((name) => {
                const beta = regression.betas[name] || 0;
                const tStat = regression.tStats[name] || 0;
                const pVal = regression.pValues[name] || 1;

                return (
                  <tr key={name} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-sky-400">{name}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {beta.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{tStat.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{pVal.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          pVal < 0.05
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pVal < 0.01 ? 'p < 0.01 ***' : pVal < 0.05 ? 'p < 0.05 **' : 'Not Sig'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
