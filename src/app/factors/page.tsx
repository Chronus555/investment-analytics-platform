'use client';

import React, { useState, useMemo } from 'react';
import { runMultipleRegression, FactorRegressionResult } from '@/analytics/factors';
import { CURATED_RETURNS, CURATED_SECURITIES } from '@/data/curatedData';
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, MetricCard } from '@/components/ui';
import { TrendingUp } from 'lucide-react';
import { formatPercent, formatRatio } from '@/utils/formatters';

export default function FactorsPage() {
  const [targetSymbol, setTargetSymbol] = useState('AVUV');
  const [modelType, setModelType] = useState<'capm' | 'ff3' | 'carhart4'>('ff3');

  // Synthesize standard academic factors from curated benchmark proxies
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
    <div className="space-y-6">
      <PageHeader
        title="Factor Analysis & Systematic Risk Attribution"
        description="Multi-factor Ordinary Least Squares (OLS) regressions, systematic risk factor loadings, t-statistics, and manager alpha."
      />

      {/* Regression Configuration */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-slate-900">Model Specification & Target Security</CardTitle>
            </div>
            <Badge variant="neutral" className="w-fit font-mono text-[11px]">
              {regression.observations} Monthly Periods
            </Badge>
          </div>
          <CardDescription className="text-slate-500">
            Select an asset and academic factor model to isolate market, size, value, and momentum risk exposures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1.5 font-semibold">Target Fund or ETF</label>
              <select
                value={targetSymbol}
                onChange={(e) => setTargetSymbol(e.target.value)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono cursor-pointer"
              >
                {CURATED_SECURITIES.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-1.5 font-semibold">Factor Model Framework</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value as any)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="capm">Capital Asset Pricing Model (CAPM / 1-Factor)</option>
                <option value="ff3">Fama-French 3-Factor (Market, Size SMB, Value HML)</option>
                <option value="carhart4">Carhart 4-Factor (Market, Size, Value, Momentum MOM)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regression Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="R-Squared (Fit)"
          value={formatPercent(regression.rSquared, 2)}
          helperText={`Adj R²: ${formatPercent(regression.adjRSquared, 2)}`}
        />

        <MetricCard
          label="Annualized Alpha (α)"
          value={formatPercent(regression.annualizedAlpha, 2, true)}
          change={`${(regression.alpha * 100).toFixed(2)}% / mo`}
          changeType={regression.annualizedAlpha >= 0 ? 'positive' : 'negative'}
          helperText="Risk-adjusted excess return"
        />

        <MetricCard
          label="Alpha t-Statistic"
          value={formatRatio(regression.alphaTStat, 2)}
          change={regression.alphaPValue < 0.05 ? 'Stat. Significant' : 'Not Significant'}
          changeType={regression.alphaPValue < 0.05 ? 'positive' : 'neutral'}
          helperText={`p-value: ${regression.alphaPValue.toFixed(4)}`}
        />

        <MetricCard
          label="Residual Volatility"
          value={formatPercent(regression.residualVolatility, 2)}
          helperText="Idiosyncratic active risk"
        />
      </div>

      {/* Factor Coefficients Table */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-900">Factor Coefficients & Significance Table</CardTitle>
          <CardDescription className="text-slate-500">
            Ordinary Least Squares loadings (Beta), t-statistics, p-values, and 95% statistical significance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80 font-semibold text-[11px] uppercase font-mono tracking-wider">
                  <th className="py-2.5 px-3">Factor Component</th>
                  <th className="py-2.5 px-3 text-right">Coefficient (Beta)</th>
                  <th className="py-2.5 px-3 text-right">t-Statistic</th>
                  <th className="py-2.5 px-3 text-right">p-Value</th>
                  <th className="py-2.5 px-3 text-center">Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                    Alpha (Intercept α)
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                      regression.alpha >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercent(regression.alpha, 3, true)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                    {regression.alphaTStat.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                    {regression.alphaPValue.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {regression.alphaPValue < 0.05 ? (
                      <Badge variant="success">
                        {regression.alphaPValue < 0.01 ? 'p < 0.01 ***' : 'p < 0.05 **'}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Not Sig</Badge>
                    )}
                  </td>
                </tr>

                {factorNames.map((name) => {
                  const beta = regression.betas[name] || 0;
                  const tStat = regression.tStats[name] || 0;
                  const pVal = regression.pValues[name] || 1;

                  return (
                    <tr key={name} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                        <span className="text-blue-600 mr-2">■</span>
                        {name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {beta >= 0 ? `+${beta.toFixed(3)}` : beta.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                        {tStat.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                        {pVal.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {pVal < 0.05 ? (
                          <Badge variant="info">
                            {pVal < 0.01 ? 'p < 0.01 ***' : 'p < 0.05 **'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Not Sig</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-800">Factor Interpretation:</p>
            <p>
              • <strong className="text-slate-700">MKT-RF:</strong> Measures systematic broad equity market sensitivity. A beta &gt; 1.0 indicates higher volatility than the benchmark.
            </p>
            <p>
              • <strong className="text-slate-700">SMB (Small Minus Big):</strong> Positive exposure indicates tilting toward small-cap equities.
            </p>
            <p>
              • <strong className="text-slate-700">HML (High Minus Low):</strong> Positive exposure indicates value orientation; negative indicates growth orientation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
