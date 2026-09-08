'use client';

import React, { useState, useMemo } from 'react';
import { runMultipleRegression, FactorRegressionResult } from '@/analytics/factors';
import { runPCA, PCAResult } from '@/analytics/pca';
import {
  extractUniverseFactorLoadings,
  solveTargetFactorAllocation,
  simulateFactorMatchedPortfolio,
  TargetFactorExposures,
} from '@/analytics/factorAllocation';
import { CURATED_DATES, CURATED_RETURNS, CURATED_SECURITIES } from '@/data/curatedData';
import { PcaScreeChart } from '@/components/charts/PcaScreeChart';
import { FactorMatchBarChart } from '@/components/charts/FactorMatchBarChart';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, MetricCard } from '@/components/ui';
import { TrendingUp, Layers, Sliders, CheckCircle2 } from 'lucide-react';
import { formatPercent, formatRatio } from '@/utils/formatters';

type FactorTab = 'regression' | 'matching' | 'pca';

export default function FactorsPage() {
  const [activeTab, setActiveTab] = useState<FactorTab>('regression');

  // --- Factor Regression State ---
  const [targetSymbol, setTargetSymbol] = useState('AVUV');
  const [modelType, setModelType] = useState<'capm' | 'ff3' | 'carhart4'>('ff3');

  // --- Factor Matching (Discipline 5.2) State ---
  const [targetMkt, setTargetMkt] = useState(1.0);
  const [targetSmb, setTargetSmb] = useState(0.25);
  const [targetHml, setTargetHml] = useState(0.25);
  const [targetMom, setTargetMom] = useState(0.10);
  const [maxAssetWeight, setMaxAssetWeight] = useState(0.40);

  const factorUniverse = [
    'SPY',
    'QQQ',
    'IWM',
    'AVUV',
    'EFA',
    'EEM',
    'VNQ',
    'GLD',
    'TLT',
    'BND',
    'BIL',
  ];

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
        const smb = iwm[i] - mkt[i];
        const hml = 0.5 * (targetRets[i] - qqq[i]);
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

  // Run Factor Matching Solver (Discipline 5.2)
  const factorMatching = useMemo(() => {
    const { factorMatrix } = extractUniverseFactorLoadings(CURATED_RETURNS, factorUniverse);
    const targetBetas: TargetFactorExposures = {
      mkt: targetMkt,
      smb: targetSmb,
      hml: targetHml,
      mom: targetMom,
    };
    const solved = solveTargetFactorAllocation(
      factorUniverse,
      factorMatrix,
      targetBetas,
      undefined,
      maxAssetWeight
    );
    const sim = simulateFactorMatchedPortfolio(CURATED_DATES, CURATED_RETURNS, solved.weights, 'SPY');
    return { ...solved, sim };
  }, [factorUniverse, targetMkt, targetSmb, targetHml, targetMom, maxAssetWeight]);

  // Run PCA
  const pca = useMemo<PCAResult>(() => {
    return runPCA(CURATED_RETURNS, pcaSymbols);
  }, [pcaSymbols]);

  const applyMatchingPreset = (preset: 'balanced' | 'scv' | 'lowvol' | 'momentum' | 'market_neutral') => {
    if (preset === 'balanced') {
      setTargetMkt(1.0);
      setTargetSmb(0.20);
      setTargetHml(0.20);
      setTargetMom(0.10);
    } else if (preset === 'scv') {
      setTargetMkt(1.0);
      setTargetSmb(0.50);
      setTargetHml(0.40);
      setTargetMom(0.00);
    } else if (preset === 'lowvol') {
      setTargetMkt(0.70);
      setTargetSmb(-0.10);
      setTargetHml(0.30);
      setTargetMom(0.00);
    } else if (preset === 'momentum') {
      setTargetMkt(1.15);
      setTargetSmb(0.10);
      setTargetHml(-0.20);
      setTargetMom(0.40);
    } else if (preset === 'market_neutral') {
      setTargetMkt(0.0);
      setTargetSmb(0.30);
      setTargetHml(0.30);
      setTargetMom(0.20);
    }
  };

  const matchingGrowthSeries = [
    {
      id: 'matched',
      name: 'Factor-Matched Portfolio',
      color: '#2563eb',
      data: factorMatching.sim.growthSeries,
    },
    {
      id: 'spy',
      name: 'SPY Benchmark',
      color: '#64748b',
      data: factorMatching.sim.benchmarkSeries,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factor Analysis & Systematic Risk Attribution"
        description="Multi-factor OLS regressions, Target Factor Allocation reverse-solver, and Principal Component Analysis (PCA)."
      />

      {/* Segmented Top Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100/80 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('regression')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'regression'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Factor Regressions (5.1)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matching')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'matching'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Risk Factor Allocation (5.2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pca')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'pca'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Principal Component Analysis (5.3)
          </button>
        </div>

        <span className="text-xs font-mono text-slate-400 hidden sm:inline">
          {activeTab === 'regression'
            ? 'OLS GAUSS-MARKOV SOLVER'
            : activeTab === 'matching'
            ? 'SIMPLEX CONSTRAINED REVERSE QP'
            : 'JACOBI EIGENVALUE DECOMPOSITION'}
        </span>
      </div>

      {activeTab === 'regression' && (
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
              helperText="Idiosyncratic unsystematic risk"
            />
          </div>

          {/* Factor Loadings Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Systematic Factor Loadings &amp; Significance</CardTitle>
              <CardDescription className="text-slate-500">
                Ordinary least squares coefficients, standard errors, and hypothesis test statistics
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Factor</th>
                    <th className="py-2.5 px-4 font-semibold">Beta Loading (β)</th>
                    <th className="py-2.5 px-4 font-semibold">t-Statistic</th>
                    <th className="py-2.5 px-4 font-semibold">p-Value</th>
                    <th className="py-2.5 px-4 font-semibold">Significance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  {factorNames.map((fn) => {
                    const beta = regression.betas[fn] || 0;
                    const tVal = regression.tStats[fn] || 0;
                    const pVal = regression.pValues[fn] || 0;
                    const isSig = pVal < 0.05;

                    return (
                      <tr key={fn} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-4 text-slate-900 font-semibold font-sans">{fn}</td>
                        <td className="py-2 px-4 text-slate-800 font-bold">{formatRatio(beta, 3)}</td>
                        <td className="py-2 px-4 text-slate-700">{formatRatio(tVal, 2)}</td>
                        <td className="py-2 px-4 text-slate-600">{pVal.toFixed(4)}</td>
                        <td className="py-2 px-4">
                          <Badge variant={isSig ? 'success' : 'neutral'} size="sm">
                            {isSig ? 'p < 0.05 (Sig)' : 'Not Significant'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="space-y-6">
          {/* Factor Matching Controls */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-slate-900">Target Factor Exposure Specification</CardTitle>
                </div>
                <Badge variant="info" className="w-fit font-mono text-[11px]">
                  Portfolio Visualizer Discipline 5.2
                </Badge>
              </div>
              <CardDescription className="text-slate-500">
                Specify your desired portfolio factor betas; the quadratic programming solver determines the optimal long-only asset weights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Presets */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-2">
                  Factor Allocation Presets
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => applyMatchingPreset('balanced')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Balanced Tilt (MKT 1.0, SMB 0.2, HML 0.2)
                  </button>
                  <button
                    onClick={() => applyMatchingPreset('scv')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Small-Cap Value (SMB 0.5, HML 0.4)
                  </button>
                  <button
                    onClick={() => applyMatchingPreset('lowvol')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Low Vol Value (MKT 0.7, HML 0.3)
                  </button>
                  <button
                    onClick={() => applyMatchingPreset('momentum')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    High Momentum (MOM 0.4)
                  </button>
                  <button
                    onClick={() => applyMatchingPreset('market_neutral')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                  >
                    Market Neutral (MKT 0.0)
                  </button>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-slate-800">Market Beta (MKT)</span>
                    <span className="font-mono font-bold text-blue-600">{targetMkt.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={targetMkt}
                    onChange={(e) => setTargetMkt(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>0.0 (Neutral)</span>
                    <span>1.5 (Aggressive)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-slate-800">Size Beta (SMB)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {targetSmb > 0 ? '+' : ''}{targetSmb.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.8"
                    step="0.05"
                    value={targetSmb}
                    onChange={(e) => setTargetSmb(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>-0.5 (Large)</span>
                    <span>+0.8 (Small)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-slate-800">Value Beta (HML)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {targetHml > 0 ? '+' : ''}{targetHml.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.8"
                    step="0.05"
                    value={targetHml}
                    onChange={(e) => setTargetHml(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>-0.5 (Growth)</span>
                    <span>+0.8 (Value)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-slate-800">Momentum Beta (MOM)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {targetMom > 0 ? '+' : ''}{targetMom.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.8"
                    step="0.05"
                    value={targetMom}
                    onChange={(e) => setTargetMom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>-0.5 (Reversal)</span>
                    <span>+0.8 (Trend)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-slate-800">Max Asset Weight</span>
                    <span className="font-mono font-bold text-slate-800">{Math.round(maxAssetWeight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="1.00"
                    step="0.05"
                    value={maxAssetWeight}
                    onChange={(e) => setMaxAssetWeight(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>20% (Diversified)</span>
                    <span>100% (Unconstrained)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Mean Factor Error (MAE)"
              value={factorMatching.meanAbsoluteError.toFixed(3)}
              change={factorMatching.meanAbsoluteError < 0.10 ? 'Tight Fit' : 'Moderate Fit'}
              changeType={factorMatching.meanAbsoluteError < 0.10 ? 'positive' : 'neutral'}
              helperText="Average |Achieved - Target|"
            />

            <MetricCard
              label="Factor Match Quality"
              value={formatPercent(factorMatching.rSquared, 1)}
              helperText="Objective goodness-of-fit"
            />

            <MetricCard
              label="Backtested CAGR"
              value={formatPercent(factorMatching.sim.cagr, 2)}
              helperText={`vs SPY ${formatPercent(factorMatching.sim.benchCagr, 2)}`}
              changeType={factorMatching.sim.cagr >= factorMatching.sim.benchCagr ? 'positive' : 'negative'}
            />

            <MetricCard
              label="Sharpe Ratio"
              value={formatRatio(factorMatching.sim.sharpe, 2)}
              helperText={`vs SPY ${formatRatio(factorMatching.sim.benchSharpe, 2)}`}
              changeType={factorMatching.sim.sharpe >= factorMatching.sim.benchSharpe ? 'positive' : 'negative'}
            />
          </div>

          {/* Factor Comparison Bar Chart */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Factor Exposure Alignment</CardTitle>
              <CardDescription className="text-slate-500">
                Comparing user-specified target betas against the achieved loadings of the reverse-solved portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FactorMatchBarChart
                targetBetas={factorMatching.targetBetas}
                achievedBetas={factorMatching.achievedBetas}
                height={220}
              />
            </CardContent>
          </Card>

          {/* Solved Asset Weights Breakdown */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900">Optimal Factor-Matched Asset Allocation</CardTitle>
                  <CardDescription className="text-slate-500">
                    Solved portfolio weights minimizing factor tracking error subject to long-only simplex bounds
                  </CardDescription>
                </div>
                <Badge variant="success" className="font-mono text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Sum = 100.0%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(factorMatching.weights)
                  .sort(([, a], [, b]) => b - a)
                  .map(([sym, w]) => {
                    const isAllocated = w > 0.005;
                    return (
                      <div
                        key={sym}
                        className={`p-3 rounded-lg border transition-colors ${
                          isAllocated
                            ? 'border-blue-200 bg-blue-50/40 text-slate-900'
                            : 'border-slate-100 bg-slate-50/40 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{sym}</span>
                          <span className="font-mono text-xs font-semibold">
                            {(w * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, w * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Historical Compounded Growth Chart */}
          <GrowthChart series={matchingGrowthSeries} height={320} />
        </div>
      )}

      {activeTab === 'pca' && (
        <div className="space-y-6">
          {/* Asset Selection for PCA */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-slate-900">PCA Asset Universe Selection</CardTitle>
              </div>
              <CardDescription className="text-slate-500">
                Choose assets to compute orthogonal principal components and decompose systematic macro risk drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CURATED_SECURITIES.map((s) => {
                  const isSelected = pcaSymbols.includes(s.symbol);
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => togglePcaSymbol(s.symbol)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s.symbol}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* PCA Scree Chart */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Scree Plot: Variance Explained by Component</CardTitle>
              <CardDescription className="text-slate-500">
                Individual variance bars (left axis) and cumulative variance line reaching 100% (right axis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PcaScreeChart components={pca.components} />
            </CardContent>
          </Card>

          {/* Component Loadings Heatmap */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Principal Component Asset Loadings</CardTitle>
              <CardDescription className="text-slate-500">
                Factor loadings of each asset onto the top principal components
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Asset</th>
                    {pca.components.slice(0, 4).map((c) => (
                      <th key={c.component} className="py-2.5 px-4 font-semibold">
                        {c.component} ({formatPercent(c.varianceExplained, 1)})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  {pca.symbols.map((sym) => (
                    <tr key={sym} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-4 text-slate-900 font-semibold font-sans">{sym}</td>
                      {pca.components.slice(0, 4).map((c) => {
                        const loading = c.loadings[sym] ?? 0;
                        const isPos = loading >= 0;
                        return (
                          <td key={c.component} className="py-2 px-4">
                            <span
                              className={`font-mono font-semibold ${
                                isPos ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isPos ? '+' : ''}{loading.toFixed(3)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
