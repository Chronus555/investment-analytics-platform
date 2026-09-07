'use client';

import React, { useState, useMemo } from 'react';
import {
  solveOptimization,
  generateEfficientFrontier,
  EfficientFrontierPoint
} from '@/analytics/optimization';
import { solveRiskParity, RiskParityResult } from '@/analytics/riskParity';
import { calculateCovarianceMatrix, calculateMean } from '@/analytics/statistics';
import { solveBlackLitterman, BlackLittermanView } from '@/analytics/blackLitterman';
import { CURATED_SECURITIES, CURATED_RETURNS } from '@/data/curatedData';
import { FrontierChart } from '@/components/charts/FrontierChart';
import { BlackLittermanComparisonChart } from '@/components/charts/BlackLittermanComparisonChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatRatio } from '@/utils/formatters';
import { PieChart, Sliders, Plus, Trash2, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { runWalkForwardOptimization, WalkForwardModel, WalkForwardResult } from '@/analytics/walkForwardOptimization';
import { CURATED_DATES } from '@/data/curatedData';
import { WalkForwardGrowthChart } from '@/components/charts/WalkForwardGrowthChart';
import { WalkForwardWeightsChart } from '@/components/charts/WalkForwardWeightsChart';
import { WalkForwardDecayChart } from '@/components/charts/WalkForwardDecayChart';
import { History, RotateCcw, TrendingUp, AlertTriangle, ShieldCheck, Activity, Layers, BarChart3, Clock } from 'lucide-react';


const CORE_TICKERS = [
  'SPY', 'QQQ', 'VTI', 'BND',
  'AGG', 'TLT', 'GLD', 'VNQ',
  'VXUS', 'EFA', 'EEM', 'BIL',
];

// Baseline proxy market capitalization weights for global assets
const DEFAULT_MARKET_CAP_WEIGHTS: Record<string, number> = {
  SPY: 0.40,
  QQQ: 0.20,
  VTI: 0.15,
  BND: 0.10,
  AGG: 0.05,
  TLT: 0.03,
  GLD: 0.03,
  VNQ: 0.02,
  VXUS: 0.01,
  EFA: 0.005,
  EEM: 0.003,
  BIL: 0.002,
};

export default function OptimizationPage() {
  const [activeMode, setActiveMode] = useState<'frontier' | 'black_litterman' | 'walk_forward'>('frontier');

  // Walk-Forward State
  const [wfModel, setWfModel] = useState<WalkForwardModel>('max_sharpe');
  const [inSampleMonths, setInSampleMonths] = useState<number>(36);
  const [outOfSampleMonths, setOutOfSampleMonths] = useState<number>(3);
  const [wfMinWeight, setWfMinWeight] = useState<number>(0.0);
  const [wfMaxWeight, setWfMaxWeight] = useState<number>(0.40);
  const [wfRiskFreeRate, setWfRiskFreeRate] = useState<number>(0.04);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    'SPY',
    'QQQ',
    'VTI',
    'BND',
    'TLT',
    'GLD',
    'VNQ',
  ]);

  // MPT Constraints
  const [minWeight, setMinWeight] = useState(0.0); // 0%
  const [maxWeight, setMaxWeight] = useState(0.40); // 40% cap
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);

  // Black-Litterman Parameters
  const [riskAversion, setRiskAversion] = useState(2.5);
  const [tau, setTau] = useState(0.05);
  const [views, setViews] = useState<BlackLittermanView[]>([
    {
      description: 'Tech & Nasdaq 100 (QQQ) will outperform market by +3.0%',
      assets: [{ symbol: 'QQQ', weight: 1.0 }],
      expectedExcessReturn: 0.03,
      confidence: 0.75,
    },
    {
      description: 'Gold (GLD) will outperform Long Treasuries (TLT) by +4.0%',
      assets: [
        { symbol: 'GLD', weight: 1.0 },
        { symbol: 'TLT', weight: -1.0 },
      ],
      expectedExcessReturn: 0.04,
      confidence: 0.65,
    },
  ]);

  // Compute expected returns and covariance matrix from historical data
  const { expectedReturns, covMatrix, individualAssets, validSymbols } = useMemo(() => {
    const valid = selectedSymbols.filter((s) => CURATED_RETURNS[s]);
    const series = valid.map((s) => CURATED_RETURNS[s]);
    const cov = calculateCovarianceMatrix(series);

    const expRets = series.map((s) => {
      const m = calculateMean(s);
      return Math.pow(1 + m, 12) - 1; // Compound annualized
    });

    const indAssets = valid.map((s, i) => ({
      symbol: s,
      return: expRets[i],
      volatility: Math.sqrt(cov[i][i] * 12),
    }));

    return { expectedReturns: expRets, covMatrix: cov, individualAssets: indAssets, validSymbols: valid };
  }, [selectedSymbols]);

  // Solve Tangency / Max Sharpe
  const maxSharpe = useMemo<EfficientFrontierPoint>(() => {
    if (validSymbols.length === 0) return { return: 0, volatility: 0, sharpeRatio: 0, weights: {} };
    const opt = solveOptimization(
      validSymbols,
      expectedReturns,
      covMatrix,
      'max_sharpe',
      undefined,
      riskFreeRate,
      { minWeight, maxWeight }
    );
    return {
      return: opt.expectedReturn,
      volatility: opt.volatility,
      sharpeRatio: opt.sharpeRatio,
      weights: opt.weights,
    };
  }, [validSymbols, expectedReturns, covMatrix, riskFreeRate, minWeight, maxWeight]);

  // Solve Min Variance
  const minVar = useMemo<EfficientFrontierPoint>(() => {
    if (validSymbols.length === 0) return { return: 0, volatility: 0, sharpeRatio: 0, weights: {} };
    const opt = solveOptimization(
      validSymbols,
      expectedReturns,
      covMatrix,
      'min_variance',
      undefined,
      riskFreeRate,
      { minWeight, maxWeight }
    );
    return {
      return: opt.expectedReturn,
      volatility: opt.volatility,
      sharpeRatio: opt.sharpeRatio,
      weights: opt.weights,
    };
  }, [validSymbols, expectedReturns, covMatrix, riskFreeRate, minWeight, maxWeight]);

  // Generate Efficient Frontier Curve
  const frontier = useMemo(() => {
    if (validSymbols.length < 2) return [];
    return generateEfficientFrontier(
      validSymbols,
      expectedReturns,
      covMatrix,
      25,
      riskFreeRate,
      { minWeight, maxWeight }
    );
  }, [validSymbols, expectedReturns, covMatrix, riskFreeRate, minWeight, maxWeight]);

  // Equal Risk Parity (ERC)
  const riskParity = useMemo<RiskParityResult>(() => {
    if (validSymbols.length < 2) {
      return {
        weights: {},
        marginalRiskContributions: {},
        percentRiskContributions: {},
        portfolioVolatility: 0,
        assets: [],
      };
    }
    return solveRiskParity(validSymbols, covMatrix);
  }, [validSymbols, covMatrix]);

  // Black-Litterman Normalized Market Cap Weights
  const marketCapWeights = useMemo(() => {
    const raw = validSymbols.map((s) => DEFAULT_MARKET_CAP_WEIGHTS[s] || 0.05);
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((w) => w / sum);
  }, [validSymbols]);

  // Solve Black-Litterman
  const blResult = useMemo(() => {
    if (validSymbols.length < 2) {
      return {
        impliedEquilibriumReturns: {},
        posteriorReturns: {},
        optimalWeights: {},
      };
    }
    return solveBlackLitterman(
      validSymbols,
      marketCapWeights,
      covMatrix,
      views,
      tau,
      riskAversion
    );
  }, [validSymbols, marketCapWeights, covMatrix, views, tau, riskAversion]);


  // Walk-Forward Optimization Execution
  const wfResult = useMemo<WalkForwardResult | null>(() => {
    if (validSymbols.length === 0) return null;
    try {
      return runWalkForwardOptimization({
        symbols: validSymbols,
        returnsMap: CURATED_RETURNS,
        dates: CURATED_DATES,
        model: wfModel,
        inSampleMonths,
        outOfSampleMonths,
        minWeight: wfMinWeight,
        maxWeight: wfMaxWeight,
        riskFreeRate: wfRiskFreeRate,
      });
    } catch (e) {
      console.error('Walk-Forward computation error:', e);
      return null;
    }
  }, [validSymbols, wfModel, inSampleMonths, outOfSampleMonths, wfMinWeight, wfMaxWeight, wfRiskFreeRate]);

  // Toggle Security in Universe
  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 2) {
        setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
      }
    } else {
      setSelectedSymbols([...selectedSymbols, sym]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Optimization"
        subtitle="Markowitz Efficient Frontier & Black-Litterman Studio"
        description="Solve for mathematically optimal asset weights, trace the Modern Portfolio Theory efficient frontier, or synthesize subjective investor views with CAPM market equilibrium."
        badge={
          <Badge variant="info" className="gap-1.5 font-medium">
            <PieChart className="w-3.5 h-3.5 text-blue-600" />
            <span>MPT & Bayesian Solvers</span>
          </Badge>
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveMode('frontier')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeMode === 'frontier'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Markowitz Efficient Frontier
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('black_litterman')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeMode === 'black_litterman'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Black-Litterman Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('walk_forward')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeMode === 'walk_forward'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Walk-Forward Optimization
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
          <span>{validSymbols.length} ASSETS</span>
          <span>•</span>
          <span>{activeMode === 'frontier' ? 'MEAN-VARIANCE' : activeMode === 'black_litterman' ? 'BAYESIAN PRIORS' : 'ROLLING OUT-OF-SAMPLE'}</span>
        </div>
      </div>

      {/* Universe Selection Chips (Shared) */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 text-sm font-semibold">
              Asset Universe Selection
            </CardTitle>
            <Badge variant="neutral">{selectedSymbols.length} Assets Active</Badge>
          </div>
          <CardDescription className="text-slate-500 text-xs">
            Toggle securities to include in the covariance estimation matrix
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CORE_TICKERS.map((sym) => {
              const isSelected = selectedSymbols.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleSymbol(sym)}
                  className={`h-9 px-3 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* TAB 1: MARKOWITZ EFFICIENT FRONTIER */}
      {activeMode === 'frontier' && (
        <div className="space-y-6">
          {/* MPT Constraints Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Allocation Box Constraints
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Upper & lower bounds on individual asset weights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Max Single-Asset Weight
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPercent(maxWeight, 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.0"
                    step="0.05"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Min Single-Asset Weight
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPercent(minWeight, 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.20"
                    step="0.02"
                    value={minWeight}
                    onChange={(e) => setMinWeight(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Assumed Risk-Free Rate
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPercent(riskFreeRate, 1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.08"
                    step="0.005"
                    value={riskFreeRate}
                    onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Efficient Frontier Curve */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Markowitz Efficient Frontier
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Optimal risk/return curve with Tangency and Minimum Variance portfolios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FrontierChart
                frontier={frontier}
                individualAssets={individualAssets}
                maxSharpePortfolio={maxSharpe}
                minVarPortfolio={minVar}
              />
            </CardContent>
          </Card>

          {/* Optimal Allocations Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Tangency / Max Sharpe */}
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <CardTitle className="text-slate-900 text-sm font-semibold">
                    Max Sharpe (Tangency)
                  </CardTitle>
                </div>
                <Badge variant="success">Sharpe {formatRatio(maxSharpe.sharpeRatio, 2)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">
                      Exp Return
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {formatPercent(maxSharpe.return, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">
                      Annual Vol
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatPercent(maxSharpe.volatility, 2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold font-sans">
                    Allocations
                  </div>
                  {Object.entries(maxSharpe.weights)
                    .filter(([_, w]) => w > 0.001)
                    .map(([sym, w]) => (
                      <div key={sym} className="flex justify-between items-center text-xs">
                        <span className="font-mono font-medium text-slate-700">{sym}</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {formatPercent(w, 1)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Min Variance */}
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <CardTitle className="text-slate-900 text-sm font-semibold">
                    Minimum Volatility
                  </CardTitle>
                </div>
                <Badge variant="info">Vol {formatPercent(minVar.volatility, 1)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">
                      Exp Return
                    </span>
                    <span className="font-semibold text-blue-600">
                      {formatPercent(minVar.return, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">
                      Sharpe
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatRatio(minVar.sharpeRatio, 2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold font-sans">
                    Allocations
                  </div>
                  {Object.entries(minVar.weights)
                    .filter(([_, w]) => w > 0.001)
                    .map(([sym, w]) => (
                      <div key={sym} className="flex justify-between items-center text-xs">
                        <span className="font-mono font-medium text-slate-700">{sym}</span>
                        <span className="font-mono font-semibold text-blue-700">
                          {formatPercent(w, 1)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Parity */}
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <CardTitle className="text-slate-900 text-sm font-semibold">
                    Equal Risk Parity (ERC)
                  </CardTitle>
                </div>
                <Badge variant="warning">
                  Vol {formatPercent(riskParity.portfolioVolatility, 1)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">
                      Total Vol
                    </span>
                    <span className="font-semibold text-amber-600">
                      {formatPercent(riskParity.portfolioVolatility, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">
                      Risk Budget
                    </span>
                    <span className="font-semibold text-slate-800">Equal (1/N)</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold font-sans">
                    Allocations & Risk Contrib
                  </div>
                  {riskParity.assets.map((a) => (
                    <div key={a.symbol} className="flex justify-between items-center text-xs">
                      <span className="font-mono font-medium text-slate-700">{a.symbol}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-semibold text-slate-800">
                          {formatPercent(a.weight, 1)}
                        </span>
                        <span className="text-[10px] text-amber-700">
                          ({formatPercent(a.percentRiskContribution, 0)} risk)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: BLACK-LITTERMAN MODEL STUDIO */}
      {activeMode === 'black_litterman' && (
        <div className="space-y-6">
          {/* Black-Litterman Global Parameters */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Bayesian Prior Hyperparameters
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Equilibrium risk aversion coefficient and view uncertainty scaling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Market Risk Aversion (δ)
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {riskAversion.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={riskAversion}
                    onChange={(e) => setRiskAversion(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Scales equilibrium market return vector: Π = δ * Σ * w_mkt
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Prior Uncertainty Scale (τ)
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {tau.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.15"
                    step="0.01"
                    value={tau}
                    onChange={(e) => setTau(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Heuristic weight on equilibrium variance: cov(Π) = τ * Σ
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subjective Views Formulator */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Subjective Investor Views ({views.length})
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Incorporate absolute and relative excess return expectations with confidence weighting
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstSym = validSymbols[0] || 'SPY';
                  setViews([
                    ...views,
                    {
                      description: `${firstSym} will outperform benchmark by +2.0%`,
                      assets: [{ symbol: firstSym, weight: 1.0 }],
                      expectedExcessReturn: 0.02,
                      confidence: 0.50,
                    },
                  ]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-medium transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add View</span>
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {views.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No investor views specified. The model defaults to CAPM equilibrium weights.
                </div>
              ) : (
                views.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={v.description}
                        onChange={(e) => {
                          const updated = [...views];
                          updated[idx].description = e.target.value;
                          setViews(updated);
                        }}
                        className="flex-1 text-xs font-medium text-slate-800 bg-white px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="View description..."
                      />
                      <button
                        type="button"
                        onClick={() => setViews(views.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-slate-600 mb-1 font-sans text-[11px]">
                          <span>Expected Excess Return (Q)</span>
                          <span className="font-semibold text-slate-900">
                            {(v.expectedExcessReturn * 100).toFixed(1)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-0.10"
                          max="0.20"
                          step="0.005"
                          value={v.expectedExcessReturn}
                          onChange={(e) => {
                            const updated = [...views];
                            updated[idx].expectedExcessReturn = parseFloat(e.target.value);
                            setViews(updated);
                          }}
                          className="w-full accent-blue-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1 font-sans text-[11px]">
                          <span>Confidence Level (1 - Error Variance)</span>
                          <span className="font-semibold text-slate-900">
                            {Math.round(v.confidence * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="1.0"
                          step="0.05"
                          value={v.confidence}
                          onChange={(e) => {
                            const updated = [...views];
                            updated[idx].confidence = parseFloat(e.target.value);
                            setViews(updated);
                          }}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Implied Equilibrium vs Posterior Returns Chart */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Implied Equilibrium vs. Posterior Expected Returns
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Shows how subjective views update prior market equilibrium into posterior expected returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlackLittermanComparisonChart
                symbols={validSymbols}
                impliedReturns={blResult.impliedEquilibriumReturns}
                posteriorReturns={blResult.posteriorReturns}
              />
            </CardContent>
          </Card>

          {/* Optimal Allocation Tilts Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-slate-900 text-sm font-semibold">
                Black-Litterman Asset Allocation & Active Tilts
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Bayesian shifts from market equilibrium capitalization weights into optimal portfolio holdings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3 text-right">Mkt Cap Wgt</th>
                      <th className="py-2.5 px-3 text-right">Implied Return (Π)</th>
                      <th className="py-2.5 px-3 text-right">Posterior Return (μ_BL)</th>
                      <th className="py-2.5 px-3 text-right">Optimal BL Wgt</th>
                      <th className="py-2.5 px-3 text-right">Active Tilt (Δw)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validSymbols.map((sym, idx) => {
                      const mktW = marketCapWeights[idx] || 0;
                      const optW = blResult.optimalWeights[sym] || 0;
                      const tilt = optW - mktW;
                      const pi = blResult.impliedEquilibriumReturns[sym] || 0;
                      const post = blResult.posteriorReturns[sym] || 0;

                      return (
                        <tr key={sym} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                            {sym}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {formatPercent(mktW, 1)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {formatPercent(pi, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-blue-600">
                            {formatPercent(post, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatPercent(optW, 1)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                tilt >= 0.005
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : tilt <= -0.005
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {tilt >= 0.005 ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              ) : tilt <= -0.005 ? (
                                <ArrowDownRight className="w-3 h-3 text-red-600" />
                              ) : null}
                              {tilt >= 0 ? `+${formatPercent(tilt, 1)}` : formatPercent(tilt, 1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: WALK-FORWARD OPTIMIZATION (ROLLING OUT-OF-SAMPLE)      */}
      {/* ------------------------------------------------------------- */}
      {activeMode === 'walk_forward' && (
        <div className="space-y-6">
          {/* Controls Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Walk-Forward Simulation Parameters</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Configure rolling training lookbacks, re-optimization holding intervals, and boundary limits
                  </CardDescription>
                </div>
                <Badge variant="neutral" className="w-fit text-[11px] font-mono">
                  {validSymbols.length} Assets • {CURATED_DATES.length} Total Periods
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Optimization Model */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5 font-mono">
                    Objective Model
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70 text-xs">
                    <button
                      type="button"
                      onClick={() => setWfModel('max_sharpe')}
                      className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer ${
                        wfModel === 'max_sharpe'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Max Sharpe
                    </button>
                    <button
                      type="button"
                      onClick={() => setWfModel('min_variance')}
                      className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer ${
                        wfModel === 'min_variance'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Min Vol
                    </button>
                    <button
                      type="button"
                      onClick={() => setWfModel('risk_parity')}
                      className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer ${
                        wfModel === 'risk_parity'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Risk Parity
                    </button>
                  </div>
                </div>

                {/* In-Sample Lookback Window */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
                      Training Window (W_in)
                    </label>
                    <span className="text-xs font-mono font-medium text-blue-600">
                      {inSampleMonths} Months ({Math.round((inSampleMonths / 12) * 10) / 10}Y)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70 text-xs">
                    {[12, 24, 36, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setInSampleMonths(m)}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer ${
                          inSampleMonths === m
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>

                {/* Out-of-Sample Rebalance Window */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
                      Rebalance Horizon (W_out)
                    </label>
                    <span className="text-xs font-mono font-medium text-blue-600">
                      Every {outOfSampleMonths} Month{outOfSampleMonths > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70 text-xs">
                    {[
                      { m: 1, label: '1M' },
                      { m: 3, label: '3M' },
                      { m: 6, label: '6M' },
                      { m: 12, label: '12M' },
                    ].map((item) => (
                      <button
                        key={item.m}
                        type="button"
                        onClick={() => setOutOfSampleMonths(item.m)}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition cursor-pointer ${
                          outOfSampleMonths === item.m
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weight Bounds and Risk Free Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Min Weight:</span>
                    <span className="font-mono font-semibold text-slate-900">{formatPercent(wfMinWeight, 0)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.10"
                    step="0.01"
                    value={wfMinWeight}
                    onChange={(e) => setWfMinWeight(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Max Weight Cap:</span>
                    <span className="font-mono font-semibold text-slate-900">{formatPercent(wfMaxWeight, 0)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="1.0"
                    step="0.05"
                    value={wfMaxWeight}
                    onChange={(e) => setWfMaxWeight(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Risk-Free Rate (Rf):</span>
                    <span className="font-mono font-semibold text-slate-900">{formatPercent(wfRiskFreeRate, 1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.07"
                    step="0.005"
                    value={wfRiskFreeRate}
                    onChange={(e) => setWfRiskFreeRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6 Executive KPI MetricCards */}
          {wfResult && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                label="OOS Realized CAGR"
                value={formatPercent(wfResult.kpis.cagr, 2)}
                change={
                  wfResult.kpis.cagr >= wfResult.benchmarks.equalWeight.cagr
                    ? `+${formatPercent(wfResult.kpis.cagr - wfResult.benchmarks.equalWeight.cagr, 1)} vs 1/N`
                    : `${formatPercent(wfResult.kpis.cagr - wfResult.benchmarks.equalWeight.cagr, 1)} vs 1/N`
                }
                changeType={wfResult.kpis.cagr >= wfResult.benchmarks.equalWeight.cagr ? 'positive' : 'negative'}
              />

              <MetricCard
                label="OOS Volatility"
                value={formatPercent(wfResult.kpis.volatility, 2)}
                change={
                  wfResult.kpis.volatility <= wfResult.benchmarks.equalWeight.volatility
                    ? `${formatPercent(wfResult.kpis.volatility - wfResult.benchmarks.equalWeight.volatility, 1)} vs 1/N`
                    : `+${formatPercent(wfResult.kpis.volatility - wfResult.benchmarks.equalWeight.volatility, 1)} vs 1/N`
                }
                changeType={wfResult.kpis.volatility <= wfResult.benchmarks.equalWeight.volatility ? 'positive' : 'negative'}
              />

              <MetricCard
                label="OOS Sharpe Ratio"
                value={formatRatio(wfResult.kpis.sharpeRatio, 2)}
                change={`Rf = ${formatPercent(wfRiskFreeRate, 1)}`}
                changeType={wfResult.kpis.sharpeRatio >= 0.5 ? 'positive' : 'neutral'}
              />

              <MetricCard
                label="Max Drawdown"
                value={formatPercent(wfResult.kpis.maxDrawdown, 2)}
                change={`Peak to Trough`}
                changeType={wfResult.kpis.maxDrawdown > -0.25 ? 'positive' : 'negative'}
              />

              <MetricCard
                label="Avg Turnover"
                value={formatPercent(wfResult.kpis.avgTurnover, 1)}
                change={`${wfResult.kpis.rebalanceCount} Rebalances`}
                changeType="neutral"
              />

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Sharpe Decay Ratio</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      wfResult.kpis.sharpeDecay >= 0.75
                        ? 'bg-emerald-50 text-emerald-700'
                        : wfResult.kpis.sharpeDecay >= 0.50
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {wfResult.kpis.sharpeDecay >= 0.75 ? 'Robust' : wfResult.kpis.sharpeDecay >= 0.50 ? 'Moderate' : 'Overfit'}
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {formatRatio(wfResult.kpis.sharpeDecay, 2)}x
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  IS {formatRatio(wfResult.kpis.inSampleAvgSharpe, 2)} → OOS {formatRatio(wfResult.kpis.sharpeRatio, 2)}
                </div>
              </div>
            </div>
          )}

          {/* Primary Growth & Drawdown Chart */}
          {wfResult && (
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>Out-of-Sample Compounded Growth & Drawdown</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Strict forward performance ($10,000 base) evaluated with zero look-ahead bias vs 1/N, 60/40, and In-Sample Look-Ahead Overfit
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-500">{wfResult.outOfSampleSeries.length} Out-of-Sample Months</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <WalkForwardGrowthChart
                  series={wfResult.outOfSampleSeries}
                  benchmarks={wfResult.benchmarks}
                />
              </CardContent>
            </Card>
          )}

          {/* Dual Column Visualizations: Dynamic Allocation & Sharpe Decay */}
          {wfResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dynamic Weights Evolution */}
              <Card className="shadow-xs border-slate-200 bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Dynamic Asset Allocation Over Time</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Stacked weight composition demonstrating adaptive shifts across historical regimes
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <WalkForwardWeightsChart
                    series={wfResult.outOfSampleSeries}
                  />
                </CardContent>
              </Card>

              {/* Empirical Walk-Forward Sharpe Efficiency Gap */}
              <Card className="shadow-xs border-slate-200 bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>Empirical Sharpe Efficiency Gap (Optimization Tax)</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    In-Sample Expected Sharpe vs realized Out-of-Sample Sharpe across rebalance intervals
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <WalkForwardDecayChart
                    events={wfResult.rebalanceEvents}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Rebalance Schedule Audit Log Table */}
          {wfResult && (
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <span>Chronological Rebalance Audit Schedule</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Complete step-by-step history of optimal weights, in-sample estimations, and realized out-of-sample holding returns
                    </CardDescription>
                  </div>
                  <Badge variant="neutral">
                    {wfResult.rebalanceEvents.length} Rebalance Events
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">#</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">Date</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">Training Window</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700">Optimal Allocations</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">IS Sharpe</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">OOS Return</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">OOS Sharpe</th>
                        <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Turnover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {wfResult.rebalanceEvents.map((evt) => {
                        const topAssets = Object.entries(evt.weights)
                          .filter(([_, w]) => w >= 0.05)
                          .sort((a, b) => b[1] - a[1]);

                        return (
                          <tr key={evt.rebalanceIndex} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-slate-500 font-semibold">{evt.rebalanceIndex}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{evt.date}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {evt.lookbackStartDate} → {evt.lookbackEndDate}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {topAssets.map(([sym, w]) => (
                                  <span
                                    key={sym}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-medium"
                                  >
                                    <span>{sym}</span>
                                    <span className="font-semibold text-blue-600">{formatPercent(w, 0)}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-purple-700">
                              {formatRatio(evt.inSampleSharpe, 2)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-semibold ${
                                evt.outOfSampleReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {evt.outOfSampleReturn >= 0
                                ? `+${formatPercent(evt.outOfSampleReturn, 1)}`
                                : formatPercent(evt.outOfSampleReturn, 1)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-medium ${
                                evt.outOfSampleSharpe >= 0.5
                                  ? 'text-slate-900'
                                  : evt.outOfSampleSharpe >= 0
                                  ? 'text-slate-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {formatRatio(evt.outOfSampleSharpe, 2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              {formatPercent(evt.turnover, 0)}
                            </td>
                          </tr>
                        );
                      })}
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