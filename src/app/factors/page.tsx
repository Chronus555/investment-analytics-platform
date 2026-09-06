'use client';

import React, { useState, useMemo } from 'react';
import { runMultipleRegression, FactorRegressionResult } from '@/analytics/factors';
import { runPCA, PCAResult } from '@/analytics/pca';
import { CURATED_RETURNS, CURATED_SECURITIES } from '@/data/curatedData';
import { PcaScreeChart } from '@/components/charts/PcaScreeChart';
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, MetricCard } from '@/components/ui';
import { TrendingUp, Layers, Compass } from 'lucide-react';
import { formatPercent, formatRatio } from '@/utils/formatters';

export default function FactorsPage() {
  const [activeTab, setActiveTab] = useState<'regression' | 'pca'>('regression');

  // --- Factor Regression State ---
  const [targetSymbol, setTargetSymbol] = useState('AVUV');
  const [modelType, setModelType] = useState<'capm' | 'ff3' | 'carhart4'>('ff3');

  // --- PCA State ---
  const [pcaSymbols, setPcaSymbols] = useState<string[]>([
    'SPY',
    'QQQ',
    'VTI',
    'IWM',
    'BND',
    'TLT',
    'GLD',
    'VNQ',
  ]);

  const togglePcaSymbol = (sym: string) => {
    if (pcaSymbols.includes(sym)) {
      if (pcaSymbols.length > 2) setPcaSymbols(pcaSymbols.filter((s) => s !== sym));
    } else {
      setPcaSymbols([...pcaSymbols, sym]);
    }
  };

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

  // Run PCA
  const pca = useMemo<PCAResult>(() => {
    return runPCA(CURATED_RETURNS, pcaSymbols);
  }, [pcaSymbols]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factor Analysis & Systematic Risk Attribution"
        description="Multi-factor Ordinary Least Squares (OLS) regressions, systematic risk factor loadings, t-statistics, and Principal Component Analysis (PCA)."
      />

      {/* Segmented Top Tab Controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('regression')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'regression'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Factor Regressions (CAPM &amp; Multi-Factor)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pca')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'pca'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Principal Component Analysis (PCA)
          </button>
        </div>

        <span className="text-xs font-mono text-slate-400 hidden sm:inline">
          {activeTab === 'regression' ? 'OLS GAUSS-MARKOV SOLVER' : 'JACOBI EIGENVALUE DECOMPOSITION'}
        </span>
      </div>

      {activeTab === 'regression' ? (
        <div className="space-y-6">
          {/* Regression Configuration */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-slate-900">Model Specification &amp; Target Security</CardTitle>
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
              <CardTitle className="text-slate-900">Factor Coefficients &amp; Significance Table</CardTitle>
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
      ) : (
        <div className="space-y-6">
          {/* PCA Universe Selection */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-slate-900">
                    PCA Asset Universe ({pcaSymbols.length} Assets Selected)
                  </CardTitle>
                </div>
                <span className="text-xs font-mono text-slate-400">Min: 2 assets</span>
              </div>
              <CardDescription className="text-slate-500">
                Select multi-asset securities to perform orthogonal principal component decomposition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CURATED_SECURITIES.map((sec) => {
                  const isSelected = pcaSymbols.includes(sec.symbol);
                  return (
                    <button
                      key={sec.symbol}
                      type="button"
                      onClick={() => togglePcaSymbol(sec.symbol)}
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

          {/* PCA Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Analyzed Components"
              value={pca.components.length.toString()}
              helperText={`${pcaSymbols.length} Orthogonal Eigenvectors`}
            />
            <MetricCard
              label="PC1 Variance Explained"
              value={formatPercent(pca.components[0]?.varianceExplained || 0, 1)}
              change="Dominant Factor"
              changeType="positive"
              helperText="Primary systemic market driver"
            />
            <MetricCard
              label="PC1 + PC2 Cumulative"
              value={formatPercent(pca.components[1]?.cumulativeVariance || 0, 1)}
              change="Top 2 Components"
              changeType="positive"
              helperText="Explains bulk of systemic co-movement"
            />
            <MetricCard
              label="PC1 Primary Driver"
              value={pca.topDrivers[0]?.dominantAsset || 'N/A'}
              change={`Loading ${pca.topDrivers[0]?.loading.toFixed(2) || '0'}`}
              changeType="neutral"
              helperText="Largest positive loading on PC1"
            />
          </div>

          {/* Scree Plot Chart */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-slate-900">Eigenvalue Scree Plot &amp; Variance Decomposition</CardTitle>
              </div>
              <CardDescription className="text-slate-500">
                Percentage of total portfolio return variance captured by each principal component (bars) and cumulative variance (line)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PcaScreeChart components={pca.components} />
            </CardContent>
          </Card>

          {/* Factor Loadings Matrix Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Asset Factor Loadings Matrix</CardTitle>
              <CardDescription className="text-slate-500">
                Statistical correlation between each security and the underlying orthogonal principal components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80 font-semibold text-[11px] uppercase font-mono tracking-wider">
                      <th className="py-2.5 px-3">Asset</th>
                      {pca.components.slice(0, 5).map((comp) => (
                        <th key={comp.component} className="py-2.5 px-3 text-right">
                          {comp.component} ({formatPercent(comp.varianceExplained, 0)})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                    {pcaSymbols.map((sym) => {
                      return (
                        <tr key={sym} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                            {sym}
                          </td>
                          {pca.components.slice(0, 5).map((comp) => {
                            const loading = comp.loadings[sym] ?? 0;
                            const isHighPos = loading >= 0.5;
                            const isHighNeg = loading <= -0.5;

                            return (
                              <td
                                key={comp.component}
                                className={`py-2.5 px-3 text-right tabular-nums ${
                                  isHighPos
                                    ? 'text-blue-700 font-bold bg-blue-50/40'
                                    : isHighNeg
                                    ? 'text-red-700 font-bold bg-red-50/40'
                                    : 'text-slate-700'
                                }`}
                              >
                                {loading >= 0 ? `+${loading.toFixed(3)}` : loading.toFixed(3)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-800">Macro Risk Interpretation:</p>
                <p>
                  • <strong className="text-slate-700">PC1 (Market Beta / Growth):</strong> Typically captures broad market equity co-movement, explaining 50–70% of multi-asset variation.
                </p>
                <p>
                  • <strong className="text-slate-700">PC2 (Duration / Interest Rate Sensitivity):</strong> Typically aligns with fixed income duration (e.g. TLT, BND) vs equities.
                </p>
                <p>
                  • <strong className="text-slate-700">PC3 (Real Assets / Inflation Hedge):</strong> Often reflects commodities, gold, and real estate sensitivity.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
