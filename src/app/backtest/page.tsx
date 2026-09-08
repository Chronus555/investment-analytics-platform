'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import {
  runBacktest,
  AssetPeriodReturn,
  RebalanceFrequency,
  CashFlowType,
  BacktestResult,
  PortfolioMetrics,
} from '@/analytics/backtest';
import { CURATED_DATES, CURATED_RETURNS } from '@/data/curatedData';
import { PortfolioBuilder, BuilderAsset } from '@/components/builder/PortfolioBuilder';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { AnnualReturnsBar } from '@/components/charts/AnnualReturnsBar';
import { MonthlyHeatmap } from '@/components/charts/MonthlyHeatmap';
import { SummaryMetricsCard } from '@/components/metrics/SummaryMetricsCard';
import { PeriodicReturnsTable } from '@/components/metrics/PeriodicReturnsTable';
import { DrawdownTable } from '@/components/metrics/DrawdownTable';
import { AiPortfolioAnalyst } from '@/components/ai/AiPortfolioAnalyst';
import { RollingMetricsChart } from '@/components/charts/RollingMetricsChart';
import { StressTestingCard } from '@/components/stress/StressTestingCard';
import { TearSheetModal } from '@/components/reports/TearSheetModal';
import {
  Receipt,
  DollarSign,
  Scale,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Sparkles,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { runTaxAwareBacktest, CostBasisMethod, TaxBacktestResult } from '@/analytics/taxBacktest';
import { calculateXIRR, analyzeCashFlowTiming, CashFlowEntry, CashFlowTimingAnalysis } from '@/analytics/xirr';
import { TaxGrowthChart } from '@/components/charts/TaxGrowthChart';
import { runTaxLossHarvestingSimulation, TLHResult, DEFAULT_PROXY_PAIRS, HarvestEvent } from '@/analytics/taxLossHarvesting';
import { TlhGrowthChart } from '@/components/charts/TlhGrowthChart';
import { Scissors, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatPercent, formatRatio } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Convert curated data to aligned monthly period data
const ALIGNED_PERIOD_DATA: AssetPeriodReturn[] = CURATED_DATES.map((date, idx) => {
  const returns: Record<string, number> = {};
  Object.keys(CURATED_RETURNS).forEach((sym) => {
    returns[sym] = CURATED_RETURNS[sym][idx] || 0;
  });
  return { date, returns };
});

export default function BacktestPage() {
  // 3 Portfolios State
  const [activeTab, setActiveTab] = useState<'port1' | 'port2' | 'port3'>('port1');

  const [port1Name, setPort1Name] = useState('Portfolio 1 (Growth)');
  const [port1Assets, setPort1Assets] = useState<BuilderAsset[]>([
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetClass: 'US Equity', weight: 50, expenseRatio: 0.0009 },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'US Equity', weight: 20, expenseRatio: 0.0020 },
    { symbol: 'AVUV', name: 'Avantis US Small Cap Value', assetClass: 'US Equity', weight: 10, expenseRatio: 0.0025 },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury', assetClass: 'Fixed Income', weight: 10, expenseRatio: 0.0015 },
    { symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'Commodities', weight: 10, expenseRatio: 0.0040 },
  ]);

  const [port2Name, setPort2Name] = useState('Portfolio 2 (Classic 70/30)');
  const [port2Assets, setPort2Assets] = useState<BuilderAsset[]>([
    { symbol: 'VTI', name: 'Vanguard Total Stock Market', assetClass: 'US Equity', weight: 70, expenseRatio: 0.0003 },
    { symbol: 'BND', name: 'Vanguard Total Bond Market', assetClass: 'Fixed Income', weight: 30, expenseRatio: 0.0003 },
  ]);

  const [port3Name, setPort3Name] = useState('Portfolio 3 (Permanent)');
  const [port3Assets, setPort3Assets] = useState<BuilderAsset[]>([
    { symbol: 'VTI', name: 'Vanguard Total Stock Market', assetClass: 'US Equity', weight: 25, expenseRatio: 0.0003 },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury', assetClass: 'Fixed Income', weight: 25, expenseRatio: 0.0015 },
    { symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'Commodities', weight: 25, expenseRatio: 0.0040 },
    { symbol: 'BIL', name: 'SPDR 1-3M T-Bill (Cash)', assetClass: 'Cash Equivalent', weight: 25, expenseRatio: 0.0014 },
  ]);

  // Read ?add= query parameter from Screener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const addSym = params.get('add');
      if (addSym) {
        const sym = addSym.toUpperCase();
        setPort1Assets((prev) => {
          if (prev.some((a) => a.symbol === sym)) return prev;
          return [
            ...prev,
            {
              symbol: sym,
              name: `${sym} (Added from Screener)`,
              assetClass: 'Other',
              weight: 0,
              expenseRatio: 0.001,
            },
          ];
        });
      }
    }
  }, []);

  // Backtest Settings
  const [initialBalance, setInitialBalance] = useState(10000);
  const [rebalanceFreq, setRebalanceFreq] = useState<RebalanceFrequency>('annually');
  const [rebalanceThreshold, setRebalanceThreshold] = useState(0.05); // 5% bands
  const [benchmarkSymbol, setBenchmarkSymbol] = useState('SPY');

  // View Mode: Standard vs Tax-Aware vs Cash Flow Timing (XIRR)
  const [viewMode, setViewMode] = useState<'standard' | 'tax' | 'tlh' | 'cashflow'>('standard');

  // Tax-Aware Settings State
  const [isTaxable, setIsTaxable] = useState(true);
  const [ordinaryTaxRate, setOrdinaryTaxRate] = useState(0.24); // 24%
  const [ltcgTaxRate, setLtcgTaxRate] = useState(0.15); // 15%
  const [dividendTaxRate, setDividendTaxRate] = useState(0.15); // 15%
  const [costBasisMethod, setCostBasisMethod] = useState<CostBasisMethod>('HIFO');



  // Cash Flow Timing (XIRR) Scenario State
  const [cashFlowScenario, setCashFlowScenario] = useState<'annual' | 'dip_buying' | 'peak_chasing'>('dip_buying');
  const [customFlows, setCustomFlows] = useState<CashFlowEntry[]>([
    { date: '2008-10-01', amount: -5000, description: 'GFC Crash Buy' },
    { date: '2020-03-01', amount: -5000, description: 'COVID Crash Buy' },
    { date: '2022-10-01', amount: -5000, description: 'Fed Inflation Dip Buy' },
  ]);

  // Active Portfolio References for Tax & Cash Flow Studios
  const activePortAssets = useMemo(() => {
    if (activeTab === 'port1') return port1Assets;
    if (activeTab === 'port2') return port2Assets;
    return port3Assets;
  }, [activeTab, port1Assets, port2Assets, port3Assets]);

  const activePortName = useMemo(() => {
    if (activeTab === 'port1') return port1Name;
    if (activeTab === 'port2') return port2Name;
    return port3Name;
  }, [activeTab, port1Name, port2Name, port3Name]);



  // Compute Tax-Aware Backtest
  const taxResult = useMemo<TaxBacktestResult>(() => {
    return runTaxAwareBacktest(
      activePortAssets.map((a) => ({ symbol: a.symbol, weight: a.weight / 100 })),
      ALIGNED_PERIOD_DATA,
      {
        initialBalance,
        isTaxable,
        ordinaryTaxRate,
        ltcgTaxRate,
        dividendTaxRate,
        costBasisMethod,
        rebalanceFrequency: rebalanceFreq,
        rebalanceThreshold,
      }
    );
  }, [activePortAssets, initialBalance, isTaxable, ordinaryTaxRate, ltcgTaxRate, dividendTaxRate, costBasisMethod, rebalanceFreq, rebalanceThreshold]);

  // Tax-Loss Harvesting (TLH) Settings State
  const [tlhLossThresholdPct, setTlhLossThresholdPct] = useState(-0.05); // -5%
  const [tlhMinDollarLoss, setTlhMinDollarLoss] = useState(75); // $75 min loss
  const [tlhMaxOrdinaryOffset, setTlhMaxOrdinaryOffset] = useState(3000); // $3,000/yr IRS limit

  // Compute Tax-Loss Harvesting Simulation
  const tlhResult = useMemo<TLHResult>(() => {
    return runTaxLossHarvestingSimulation(
      activePortAssets.map((a) => ({ symbol: a.symbol, weight: a.weight / 100 })),
      ALIGNED_PERIOD_DATA,
      {
        initialBalance,
        harvestThresholdPct: tlhLossThresholdPct,
        minDollarLoss: tlhMinDollarLoss,
        ordinaryTaxRate,
        ltcgTaxRate,
        dividendTaxRate,
        maxOrdinaryOffset: tlhMaxOrdinaryOffset,
      }
    );
  }, [activePortAssets, initialBalance, tlhLossThresholdPct, tlhMinDollarLoss, ordinaryTaxRate, ltcgTaxRate, dividendTaxRate, tlhMaxOrdinaryOffset]);

  // Active Irregular Cash Flows
  const activeFlows = useMemo<CashFlowEntry[]>(() => {
    if (cashFlowScenario === 'annual') {
      const flows: CashFlowEntry[] = [];
      for (let y = 2008; y <= 2025; y++) {
        flows.push({ date: `${y}-01-01`, amount: -2000, description: `Annual Contribution ${y}` });
      }
      return flows;
    }
    if (cashFlowScenario === 'dip_buying') {
      return [
        { date: '2008-11-01', amount: -8000, description: '2008 GFC Bottom Buy' },
        { date: '2011-09-01', amount: -4000, description: '2011 US Debt Downgrade Buy' },
        { date: '2020-03-01', amount: -8000, description: '2020 COVID Panic Buy' },
        { date: '2022-10-01', amount: -6000, description: '2022 Fed Rate Hike Trough Buy' },
      ];
    }
    return [
      { date: '2007-10-01', amount: -8000, description: '2007 Pre-GFC Peak Inflow' },
      { date: '2015-05-01', amount: -4000, description: '2015 Pre-Correction Inflow' },
      { date: '2021-11-01', amount: -10000, description: '2021 All-Time High Peak Inflow' },
    ];
  }, [cashFlowScenario]);




  // Cash Flow Settings
  const [cashFlowType, setCashFlowType] = useState<CashFlowType>('none');
  const [cashFlowAmount, setCashFlowAmount] = useState(0);
  const [cashFlowFreq, setCashFlowFreq] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [adjustInflation, setAdjustInflation] = useState(true);

  // Fee
  const [advisoryFeeBps, setAdvisoryFeeBps] = useState(0);

  // Collapsible Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Tear Sheet Modal State
  const [tearSheetState, setTearSheetState] = useState<{
    isOpen: boolean;
    name: string;
    assets: BuilderAsset[];
    metrics: PortfolioMetrics;
  } | null>(null);

  // Compute Benchmark Returns
  const benchmarkReturns = useMemo(() => {
    return CURATED_RETURNS[benchmarkSymbol] || CURATED_RETURNS['SPY'] || [];
  }, [benchmarkSymbol]);

  // Run Backtests
  const result1 = useMemo<BacktestResult>(() => {
    return runBacktest(
      port1Assets.map((a) => ({ symbol: a.symbol, weight: a.weight / 100, expenseRatio: a.expenseRatio })),
      ALIGNED_PERIOD_DATA,
      benchmarkReturns,
      {
        initialBalance,
        rebalanceFrequency: rebalanceFreq,
        rebalanceThreshold,
        annualFee: advisoryFeeBps / 10000,
        cashFlow: {
          type: cashFlowType,
          amount: cashFlowAmount,
          frequency: cashFlowFreq,
          adjustForInflation: adjustInflation,
          annualInflationRate: 0.025,
        },
      }
    );
  }, [port1Assets, initialBalance, rebalanceFreq, rebalanceThreshold, advisoryFeeBps, cashFlowType, cashFlowAmount, cashFlowFreq, adjustInflation, benchmarkReturns]);

  const result2 = useMemo<BacktestResult>(() => {
    return runBacktest(
      port2Assets.map((a) => ({ symbol: a.symbol, weight: a.weight / 100, expenseRatio: a.expenseRatio })),
      ALIGNED_PERIOD_DATA,
      benchmarkReturns,
      {
        initialBalance,
        rebalanceFrequency: rebalanceFreq,
        rebalanceThreshold,
        annualFee: advisoryFeeBps / 10000,
        cashFlow: {
          type: cashFlowType,
          amount: cashFlowAmount,
          frequency: cashFlowFreq,
          adjustForInflation: adjustInflation,
          annualInflationRate: 0.025,
        },
      }
    );
  }, [port2Assets, initialBalance, rebalanceFreq, rebalanceThreshold, advisoryFeeBps, cashFlowType, cashFlowAmount, cashFlowFreq, adjustInflation, benchmarkReturns]);

  const result3 = useMemo<BacktestResult>(() => {
    return runBacktest(
      port3Assets.map((a) => ({ symbol: a.symbol, weight: a.weight / 100, expenseRatio: a.expenseRatio })),
      ALIGNED_PERIOD_DATA,
      benchmarkReturns,
      {
        initialBalance,
        rebalanceFrequency: rebalanceFreq,
        rebalanceThreshold,
        annualFee: advisoryFeeBps / 10000,
        cashFlow: {
          type: cashFlowType,
          amount: cashFlowAmount,
          frequency: cashFlowFreq,
          adjustForInflation: adjustInflation,
          annualInflationRate: 0.025,
        },
      }
    );
  }, [port3Assets, initialBalance, rebalanceFreq, rebalanceThreshold, advisoryFeeBps, cashFlowType, cashFlowAmount, cashFlowFreq, adjustInflation, benchmarkReturns]);

  const activePortResult = useMemo(() => {
    if (activeTab === 'port1') return result1;
    if (activeTab === 'port2') return result2;
    return result3;
  }, [activeTab, result1, result2, result3]);

  // Compute Cash Flow Timing Analysis (XIRR vs TWR)
  const xirrAnalysis = useMemo<CashFlowTimingAnalysis>(() => {
    const terminalDate = ALIGNED_PERIOD_DATA[ALIGNED_PERIOD_DATA.length - 1]?.date || '2026-02-01';
    const terminalVal = activePortResult.summary.finalBalance;
    return analyzeCashFlowTiming(
      initialBalance,
      activeFlows,
      terminalVal,
      terminalDate,
      activePortResult.summary.cagr
    );
  }, [initialBalance, activeFlows, activePortResult]);

  // Chart Series
  const growthSeries = [
    { id: 'p1', name: port1Name, color: '#2563eb', data: result1.history.map((h) => ({ date: h.date, value: h.portfolioValue })) },
    { id: 'p2', name: port2Name, color: '#16a34a', data: result2.history.map((h) => ({ date: h.date, value: h.portfolioValue })) },
    { id: 'p3', name: port3Name, color: '#d97706', data: result3.history.map((h) => ({ date: h.date, value: h.portfolioValue })) },
  ];

  const drawdownSeries = [
    { id: 'p1', name: port1Name, color: '#2563eb', data: result1.history.map((h) => ({ date: h.date, drawdown: h.drawdown })) },
    { id: 'p2', name: port2Name, color: '#16a34a', data: result2.history.map((h) => ({ date: h.date, drawdown: h.drawdown })) },
    { id: 'p3', name: port3Name, color: '#d97706', data: result3.history.map((h) => ({ date: h.date, drawdown: h.drawdown })) },
  ];

  const annualBarSeries = [
    { id: 'p1', name: port1Name, color: '#2563eb', returns: result1.annualReturns },
    { id: 'p2', name: port2Name, color: '#16a34a', returns: result2.annualReturns },
    { id: 'p3', name: port3Name, color: '#d97706', returns: result3.annualReturns },
  ];

  const comparisonPortfolios = [
    { id: 'p1', name: port1Name, color: '#2563eb', metrics: result1.summary },
    { id: 'p2', name: port2Name, color: '#16a34a', metrics: result2.summary },
    { id: 'p3', name: port3Name, color: '#d97706', metrics: result3.summary },
  ];

  const rollingSeries = [
    { name: port1Name, color: '#2563eb', returns: result1.history.map((h) => h.portfolioReturn) },
    { name: port2Name, color: '#16a34a', returns: result2.history.map((h) => h.portfolioReturn) },
    { name: port3Name, color: '#d97706', returns: result3.history.map((h) => h.portfolioReturn) },
  ];

  const stressPortfolios = [
    { name: port1Name, color: '#2563eb', returns: result1.history.map((h) => h.portfolioReturn) },
    { name: port2Name, color: '#16a34a', returns: result2.history.map((h) => h.portfolioReturn) },
    { name: port3Name, color: '#d97706', returns: result3.history.map((h) => h.portfolioReturn) },
  ];

  const benchmarkStressInput = {
    name: `Benchmark (${benchmarkSymbol})`,
    color: '#64748b',
    returns: benchmarkReturns,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Historical Backtest & Comparison Lab"
        description="Configure, backtest, and compare up to 3 multi-asset portfolios with deterministic rebalancing, cash flow modeling, and fee drag."
        badge={<Badge variant="info">229 Months Historical Depth</Badge>}
      >
        <Button
          onClick={() =>
            setTearSheetState({
              isOpen: true,
              name: port1Name,
              assets: port1Assets,
              metrics: result1.summary,
            })
          }
          variant="secondary"
          size="md"
          icon={<Printer className="w-3.5 h-3.5" />}
        >
          FactSheet (P1)
        </Button>
        <Button
          onClick={() =>
            setTearSheetState({
              isOpen: true,
              name: port2Name,
              assets: port2Assets,
              metrics: result2.summary,
            })
          }
          variant="secondary"
          size="md"
          icon={<Printer className="w-3.5 h-3.5" />}
        >
          FactSheet (P2)
        </Button>
      </PageHeader>

      {/* Analytical Workspace Mode Selector */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setViewMode('standard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            viewMode === 'standard'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          Standard Backtest &amp; Tear Sheet
        </button>

        <button
          type="button"
          onClick={() => setViewMode('tax')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            viewMode === 'tax'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-rose-600" />
          Tax-Aware &amp; Tax Drag Studio
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-mono">HIFO/FIFO</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('tlh')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            viewMode === 'tlh'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Scissors className="w-3.5 h-3.5 text-emerald-600" />
          Tax-Loss Harvesting &amp; Direct Indexing
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono">30D Wash Sale</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('cashflow')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            viewMode === 'cashflow'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-teal-600" />
          Cash Flow Timing &amp; XIRR Lab
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-mono">MWR vs TWR</span>
        </button>
      </div>


      {/* Portfolio Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('port1')}
          className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'port1'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-semibold'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          {port1Name}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('port2')}
          className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'port2'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs font-semibold'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          {port2Name}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('port3')}
          className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'port3'
              ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs font-semibold'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          {port3Name}
        </button>
      </div>

      {/* Active Portfolio Builder */}
      <div>
        {activeTab === 'port1' && (
          <PortfolioBuilder
            portfolioName={port1Name}
            onNameChange={setPort1Name}
            assets={port1Assets}
            onChange={setPort1Assets}
            accentColor="#2563eb"
          />
        )}
        {activeTab === 'port2' && (
          <PortfolioBuilder
            portfolioName={port2Name}
            onNameChange={setPort2Name}
            assets={port2Assets}
            onChange={setPort2Assets}
            accentColor="#16a34a"
          />
        )}
        {activeTab === 'port3' && (
          <PortfolioBuilder
            portfolioName={port3Name}
            onNameChange={setPort3Name}
            assets={port3Assets}
            onChange={setPort3Assets}
            accentColor="#d97706"
          />
        )}
      </div>

      {/* Backtest & Cash Flow Settings Card */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <div>
            <CardTitle className="text-slate-900">Simulation Parameters & Rebalancing</CardTitle>
            <CardDescription className="text-slate-500">
              Configure initial capital, rebalancing frequency, benchmark comparison, and fee drag
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </CardHeader>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Starting Capital
              </label>
              <div className="flex items-center h-9 bg-white border border-slate-200 rounded-lg px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition">
                <span className="text-slate-400 mr-1.5 font-sans">$</span>
                <input
                  type="number"
                  min="100"
                  step="1000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 10000)}
                  className="w-full bg-transparent font-mono text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Rebalancing
              </label>
              <select
                value={rebalanceFreq}
                onChange={(e) => setRebalanceFreq(e.target.value as RebalanceFrequency)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
              >
                <option value="never">No Rebalancing</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semiannually">Semi-Annually</option>
                <option value="annually">Annually</option>
                <option value="threshold">Dynamic Drift Bands (Threshold)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Benchmark Asset
              </label>
              <select
                value={benchmarkSymbol}
                onChange={(e) => setBenchmarkSymbol(e.target.value)}
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono cursor-pointer"
              >
                <option value="SPY">SPY (S&P 500 Large Cap)</option>
                <option value="QQQ">QQQ (Nasdaq 100 Tech)</option>
                <option value="VTI">VTI (Total US Stock Market)</option>
                <option value="IWM">IWM (Russell 2000 Small Cap)</option>
                <option value="VXUS">VXUS (Total International)</option>
                <option value="BND">BND (Total US Bond Market)</option>
                <option value="TLT">TLT (20+ Year Long Treasury)</option>
                <option value="GLD">GLD (SPDR Gold Shares)</option>
                <option value="VNQ">VNQ (US Real Estate / REITs)</option>
                <option value="BIL">BIL (1-3M Treasury / Cash)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                Annual Advisory Fee
              </label>
              <div className="flex items-center h-9 bg-white border border-slate-200 rounded-lg px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition">
                <input
                  type="number"
                  min="0"
                  max="300"
                  step="5"
                  value={advisoryFeeBps}
                  onChange={(e) => setAdvisoryFeeBps(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent font-mono text-slate-900 focus:outline-none"
                />
                <span className="text-slate-400 ml-1.5 text-[11px] font-mono">bps</span>
              </div>
            </div>
          </div>

          {/* Progressive Disclosure: Advanced Settings */}
          {showAdvanced && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Cash Flow Mode
                </label>
                <select
                  value={cashFlowType}
                  onChange={(e) => setCashFlowType(e.target.value as CashFlowType)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
                >
                  <option value="none">None (Lump Sum Only)</option>
                  <option value="contribute">Periodic Contribution ($)</option>
                  <option value="withdraw">Periodic Withdrawal ($)</option>
                  <option value="percentage_withdraw">Fixed Percentage Withdrawal (%)</option>
                </select>
              </div>

              {cashFlowType !== 'none' && (
                <>
                  <div>
                    <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                      {cashFlowType === 'percentage_withdraw' ? 'Annual Percentage Rate (%)' : 'Amount ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={cashFlowType === 'percentage_withdraw' ? '0.5' : '100'}
                      value={cashFlowAmount}
                      onChange={(e) => setCashFlowAmount(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                      Frequency
                    </label>
                    <select
                      value={cashFlowFreq}
                      onChange={(e) => setCashFlowFreq(e.target.value as any)}
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="inflCheck"
                      checked={adjustInflation}
                      onChange={(e) => setAdjustInflation(e.target.checked)}
                      className="accent-blue-600 rounded cursor-pointer h-4 w-4"
                    />
                    <label htmlFor="inflCheck" className="text-slate-700 font-medium cursor-pointer text-xs">
                      Adjust for Inflation (CPI-U 2.5%)
                    </label>
                  </div>
                </>
              )}

              {rebalanceFreq === 'threshold' && (
                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Drift Band Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    step="1"
                    value={rebalanceThreshold * 100}
                    onChange={(e) => setRebalanceThreshold((parseFloat(e.target.value) || 5) / 100)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Conditional Workspace Views */}
      {viewMode === 'standard' && (
        <>
          {/* Visual Analytics */}
          <div className="space-y-6">
            <GrowthChart series={growthSeries} height={350} />
            <DrawdownChart series={drawdownSeries} height={270} />
            <AnnualReturnsBar series={annualBarSeries} height={290} />
          </div>

          {/* Rolling Performance Analysis */}
          <RollingMetricsChart
            dates={CURATED_DATES}
            series={rollingSeries}
            benchmarkReturns={benchmarkReturns}
          />

          {/* Historical Crisis Stress Testing Lab */}
          <StressTestingCard
            dates={CURATED_DATES}
            portfolios={stressPortfolios}
            benchmark={benchmarkStressInput}
          />

          {/* Summary Metrics Multi-Column Table */}
          <SummaryMetricsCard portfolios={comparisonPortfolios} />

          {/* Monthly Returns Heatmap & Worst Drawdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <MonthlyHeatmap records={result1.monthlyMatrix} />
            </div>
            <div>
              <DrawdownTable episodes={result1.drawdownEpisodes} />
            </div>
          </div>

          {/* Calendar Annual Return Table with CSV export */}
          <PeriodicReturnsTable portfolioName={port1Name} annualReturns={result1.annualReturns} />

          {/* Grounded AI Portfolio Analyst */}
          <AiPortfolioAnalyst
            portfolioName={port1Name}
            result={result1}
            benchmarkName={benchmarkSymbol}
          />
        </>
      )}

      {/* Tax-Aware & Tax Drag Studio View */}
      {viewMode === 'tax' && (
        <div className="space-y-6">
          {/* Tax Parameters Control Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-rose-600" />
                    <CardTitle className="text-slate-900 text-sm font-semibold">
                      Taxable Account Parameters &amp; Cost Basis Rules
                    </CardTitle>
                    <Badge variant={isTaxable ? 'danger' : 'neutral'} className="font-mono text-[11px]">
                      {isTaxable ? 'Taxable Account Active' : 'Tax-Exempt Account (0% Tax)'}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-500 text-xs mt-1">
                    Simulates short-term vs long-term capital gains realization, qualified dividend tax drag, and lot-level cost basis accounting on {activePortName}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTaxable(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isTaxable
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Taxable Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTaxable(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      !isTaxable
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tax-Exempt (IRA/401k)
                  </button>
                </div>
              </div>
            </CardHeader>

            <div className="p-4 sm:p-5 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Ordinary / STCG Rate
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPercent(ordinaryTaxRate, 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.45"
                    step="0.02"
                    disabled={!isTaxable}
                    value={ordinaryTaxRate}
                    onChange={(e) => setOrdinaryTaxRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600 disabled:opacity-40"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Holding period &lt; 12 months</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Long-Term CG Rate
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPercent(ltcgTaxRate, 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.25"
                    step="0.01"
                    disabled={!isTaxable}
                    value={ltcgTaxRate}
                    onChange={(e) => setLtcgTaxRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600 disabled:opacity-40"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Holding period &ge; 12 months</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-500 text-[11px] uppercase tracking-wider">
                      Qualified Dividend Rate
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPercent(dividendTaxRate, 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.25"
                    step="0.01"
                    disabled={!isTaxable}
                    value={dividendTaxRate}
                    onChange={(e) => setDividendTaxRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600 disabled:opacity-40"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Annual dividend yield drag</span>
                </div>

                <div>
                  <span className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Cost Basis Method
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {(['HIFO', 'FIFO', 'LIFO'] as CostBasisMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCostBasisMethod(method)}
                        className={`py-1 text-center rounded text-[11px] font-mono font-semibold transition cursor-pointer ${
                          costBasisMethod === method
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {costBasisMethod === 'HIFO' ? 'Highest In, First Out (Tax Optimal)' : costBasisMethod === 'FIFO' ? 'First In, First Out' : 'Last In, First Out'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 6 Primary Tax Performance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Pre-Tax CAGR</span>
              <span className="text-xl font-bold font-mono text-blue-600 mt-0.5 block">
                {formatPercent(taxResult.preTaxCAGR, 2)}
              </span>
              <span className="text-[10px] text-slate-400">Gross Return</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">After-Tax CAGR</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-0.5 block">
                {formatPercent(taxResult.afterTaxCAGR, 2)}
              </span>
              <span className="text-[10px] text-slate-400">Net Realized</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Annual Tax Drag</span>
              <span className="text-xl font-bold font-mono text-rose-600 mt-0.5 block">
                {taxResult.annualizedTaxDragBps.toFixed(0)} bps
              </span>
              <span className="text-[10px] text-slate-400">Per Year Friction</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Total Tax Paid</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">
                {formatCurrency(taxResult.totalTaxPaid)}
              </span>
              <span className="text-[10px] text-slate-400">CG &amp; Divs</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Tax Efficiency</span>
              <span className="text-xl font-bold font-mono text-teal-600 mt-0.5 block">
                {formatPercent(taxResult.taxEfficiencyRatio, 1)}
              </span>
              <span className="text-[10px] text-slate-400">Wealth Retained</span>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Unrealized Gain</span>
              <span className="text-xl font-bold font-mono text-indigo-600 mt-0.5 block">
                {formatCurrency(taxResult.unrealizedGainsRemaining)}
              </span>
              <span className="text-[10px] text-slate-400">Untaxed Capital</span>
            </div>
          </div>

          {/* Interactive Tax Wedge Growth Chart */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Pre-Tax vs. After-Tax Compounded Wealth &amp; Tax Wedge
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Visualizes the compounding friction of annual rebalancing and dividend taxation on {activePortName}
                </CardDescription>
              </div>
              <Badge variant="info" className="font-mono text-[11px]">
                {costBasisMethod} Accounting
              </Badge>
            </CardHeader>
            <div className="p-4 sm:p-5">
              <TaxGrowthChart timeSeries={taxResult.timeSeries} height={360} />
            </div>
          </Card>

          {/* Rebalancing Tax Friction Comparative Matrix */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Rebalancing Tax Friction Analysis
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Evaluates whether portfolio rebalancing bonus compensates for accelerated tax realization
                </CardDescription>
              </div>
            </CardHeader>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Buy &amp; Hold (No Rebalancing)</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {formatPercent(taxResult.rebalanceTaxComparison.buyAndHoldAfterTaxCAGR, 2)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Zero capital gains turnover friction</div>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] font-mono uppercase text-blue-700 font-semibold">Annual Rebalancing</div>
                  <div className="text-lg font-bold font-mono text-blue-800 mt-1">
                    {formatPercent(taxResult.rebalanceTaxComparison.annualRebalanceAfterTaxCAGR, 2)}
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">Discipline benchmark rebalance</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Monthly Rebalancing</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {formatPercent(taxResult.rebalanceTaxComparison.monthlyRebalanceAfterTaxCAGR, 2)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Frequent short-term turnover</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Annual Tax Breakdown Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Annual Tax Liability &amp; Realized Capital Gains Matrix
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Chronological tax audit showing year-by-year gross returns, net returns, realized capital gains, and tax paid
                </CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Year</th>
                    <th className="py-2.5 px-4 font-semibold">Pre-Tax Return</th>
                    <th className="py-2.5 px-4 font-semibold">After-Tax Return</th>
                    <th className="py-2.5 px-4 font-semibold">Realized STCG</th>
                    <th className="py-2.5 px-4 font-semibold">Realized LTCG</th>
                    <th className="py-2.5 px-4 font-semibold">Dividends</th>
                    <th className="py-2.5 px-4 font-semibold">Total Tax Paid</th>
                    <th className="py-2.5 px-4 font-semibold">Ending Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  {taxResult.annualTaxBreakdown.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-4 font-bold text-slate-900 font-sans">{row.year}</td>
                      <td className="py-2 px-4 text-blue-600 font-semibold">{formatPercent(row.preTaxReturn, 2)}</td>
                      <td className="py-2 px-4 text-emerald-600 font-semibold">{formatPercent(row.afterTaxReturn, 2)}</td>
                      <td className="py-2 px-4 text-slate-700">{formatCurrency(row.realizedSTCG)}</td>
                      <td className="py-2 px-4 text-slate-700">{formatCurrency(row.realizedLTCG)}</td>
                      <td className="py-2 px-4 text-slate-700">{formatCurrency(row.dividendIncome)}</td>
                      <td className="py-2 px-4 text-rose-600 font-bold">{formatCurrency(row.taxPaid)}</td>
                      <td className="py-2 px-4 text-slate-900 font-bold">{formatCurrency(row.afterTaxEndBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tax-Loss Harvesting & Direct Indexing View */}
      {viewMode === 'tlh' && (
        <div className="space-y-6">
          {/* Controls Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-slate-900 text-sm font-semibold">
                      Tax-Loss Harvesting &amp; Wash-Sale Substitution Controls
                    </CardTitle>
                    <Badge variant="success" className="font-mono text-[11px]">
                      IRS Sec 1091 Compliant
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-500 text-xs mt-1">
                    Systematic lot harvesting with 30-day substitute proxy routing, ordinary income deduction offsetting, and tax alpha reinvestment
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-600 text-[11px] font-mono uppercase tracking-wider font-semibold">
                      Harvest Loss Threshold
                    </label>
                    <span className="font-mono font-bold text-rose-600">
                      {formatPercent(tlhLossThresholdPct, 0)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.20"
                    max="-0.02"
                    step="0.01"
                    value={tlhLossThresholdPct}
                    onChange={(e) => setTlhLossThresholdPct(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Trigger harvest when lot loss exceeds threshold
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Min Dollar Loss per Lot
                  </label>
                  <select
                    value={tlhMinDollarLoss}
                    onChange={(e) => setTlhMinDollarLoss(parseFloat(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                  >
                    <option value="25">$25 (Aggressive Micro-Harvesting)</option>
                    <option value="50">$50 (Balanced)</option>
                    <option value="75">$75 (Recommended)</option>
                    <option value="100">$100 (Conservative)</option>
                    <option value="250">$250 (High Balance Portfolios)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Prevents transaction churn on negligible losses
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    IRS Ordinary Income Offset
                  </label>
                  <select
                    value={tlhMaxOrdinaryOffset}
                    onChange={(e) => setTlhMaxOrdinaryOffset(parseFloat(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                  >
                    <option value="3000">$3,000 / Year (IRS Maximum Cap)</option>
                    <option value="1500">$1,500 / Year (Married Filing Separate)</option>
                    <option value="0">$0 / Year (Capital Gains Only)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Net realized capital loss allowed against ordinary salary
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Investor Marginal Tax Bracket
                  </label>
                  <select
                    value={ordinaryTaxRate}
                    onChange={(e) => setOrdinaryTaxRate(parseFloat(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-slate-800 font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
                  >
                    <option value="0.22">22% Federal Marginal</option>
                    <option value="0.24">24% Federal Marginal</option>
                    <option value="0.32">32% Federal Marginal</option>
                    <option value="0.35">35% Federal Marginal</option>
                    <option value="0.37">37% Federal Top Bracket</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Determines cash tax shield value of harvested losses
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 6 TLH Performance & Tax Alpha KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Tax-Harvested CAGR</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
                {formatPercent(tlhResult.harvestedCAGR, 2)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Baseline: {formatPercent(tlhResult.baselineCAGR, 2)}</span>
            </div>

            <div className={`p-4 border rounded-xl shadow-xs ${
              tlhResult.taxAlphaBps >= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
            }`}>
              <span className={`text-[11px] font-mono uppercase tracking-wider block font-semibold ${
                tlhResult.taxAlphaBps >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>Net Tax Alpha</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-2xl font-bold font-mono ${
                  tlhResult.taxAlphaBps >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {tlhResult.taxAlphaBps >= 0 ? '+' : ''}{tlhResult.taxAlphaBps.toFixed(0)} bps
                </span>
                <Badge variant={tlhResult.taxAlphaBps >= 0 ? 'success' : 'danger'} className="text-[10px]">
                  {tlhResult.taxAlphaBps >= 0 ? 'ALPHA' : 'DRAG'}
                </Badge>
              </div>
              <span className={`text-xs mt-0.5 block ${
                tlhResult.taxAlphaBps >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>Annualized compound edge</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Losses Harvested</span>
              <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
                {formatCurrency(tlhResult.cumulativeLossesHarvested)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">{tlhResult.totalHarvestEvents} tax lots harvested</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Tax Savings Reinvested</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
                {formatCurrency(tlhResult.cumulativeTaxSavings)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Compounded in portfolio</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Net Wealth Delta</span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${
                tlhResult.netWealthGain >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {tlhResult.netWealthGain >= 0 ? '+' : ''}{formatCurrency(tlhResult.netWealthGain)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Ending: {formatCurrency(tlhResult.harvestedEndingBalance)}</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Loss Carryforward</span>
              <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
                {formatCurrency(tlhResult.currentCarryforward)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Protects future tax years</span>
            </div>
          </div>

          {/* Institutional Explanation Callout */}
          <div className="p-4 rounded-xl border bg-emerald-50/70 border-emerald-200 text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Direct Indexing &amp; 30-Day Substantially Identical Proxy Mechanics
            </div>
            <p className="text-xs mt-1 leading-relaxed text-emerald-900">
              Under <strong>IRS Section 1091</strong>, realizing a tax loss while repurchasing a &quot;substantially identical&quot; security within 30 days disallows the loss and adds it to the new basis. Direct indexing overcomes this by immediately reallocating proceeds into highly correlated benchmark proxies (e.g. SPY &rarr; SPLG, QQQ &rarr; QQQM) that track different indices or distinct fund trusts. This legally locks in the tax deduction while retaining 100% equity market beta during rebounds.
            </p>
          </div>

          {/* Growth Comparison Chart */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-slate-900 text-sm font-semibold">
                    Tax-Loss Harvested Wealth vs Standard Baseline (Tax Alpha Wedge)
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs">
                    Green shaded wedge illustrates compounding gains generated by reinvesting recovered tax shield dollars into correlated proxies
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-slate-700">TLH Active ({formatPercent(tlhResult.harvestedCAGR, 2)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-slate-400 rounded-full border-dashed" />
                    <span className="text-slate-500">Baseline ({formatPercent(tlhResult.baselineCAGR, 2)})</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <div className="p-4 sm:p-5">
              <TlhGrowthChart
                history={tlhResult.history}
                harvestDates={tlhResult.harvestEvents.map((e) => e.date)}
                height={340}
              />
            </div>
          </Card>

          {/* Proxy Substitution Matrix Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Benchmark Proxy Substitution Matrix (Wash-Sale Compliant Pairs)
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Economically equivalent ETF pairs with distinct legal issuers, CUSIPs, and index methodologies to satisfy IRS guidelines
                </CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Primary Asset</th>
                    <th className="py-2.5 px-4 font-semibold">Substitute Proxy</th>
                    <th className="py-2.5 px-4 font-semibold">Correlation (r)</th>
                    <th className="py-2.5 px-4 font-semibold">Tracking Spread</th>
                    <th className="py-2.5 px-4 font-semibold">IRS Sec 1091 Non-Identical Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-blue-600 font-sans">SPY (SPDR S&amp;P 500)</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600 font-sans">SPLG (SPDR Portfolio S&amp;P 500)</td>
                    <td className="py-2.5 px-4 text-slate-800">0.999</td>
                    <td className="py-2.5 px-4 text-slate-600">~1 bps</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Different share class &amp; legal UIT vs open-end fund structure</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-blue-600 font-sans">QQQ (Invesco QQQ Trust)</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600 font-sans">QQQM (Invesco Nasdaq 100 ETF)</td>
                    <td className="py-2.5 px-4 text-slate-800">0.999</td>
                    <td className="py-2.5 px-4 text-slate-600">~1 bps</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Distinct CUSIP, fee structure, and separate legal trust entity</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-blue-600 font-sans">TLT (iShares 20+ Year Treasury)</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600 font-sans">SPTL (SPDR Long Term Treasury)</td>
                    <td className="py-2.5 px-4 text-slate-800">0.994</td>
                    <td className="py-2.5 px-4 text-slate-600">~12 bps</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Different index benchmark (ICE US Treasury 20+ vs Bloomberg Long US)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-blue-600 font-sans">GLD (SPDR Gold Shares)</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600 font-sans">IAU (iShares Gold Trust)</td>
                    <td className="py-2.5 px-4 text-slate-800">0.998</td>
                    <td className="py-2.5 px-4 text-slate-600">~6 bps</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Independent London vault custodians &amp; trustee fiduciary agreements</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-bold text-blue-600 font-sans">BND (Vanguard Total Bond)</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-600 font-sans">AGG (iShares US Aggregate Bond)</td>
                    <td className="py-2.5 px-4 text-slate-800">0.997</td>
                    <td className="py-2.5 px-4 text-slate-600">~4 bps</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">Float-adjusted index methodology vs standard Bloomberg Aggregate index</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Chronological Harvest Event Audit Log */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-slate-900 text-sm font-semibold">
                    Chronological Tax-Loss Harvest Audit Log ({tlhResult.harvestEvents.length} Events)
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs">
                    Detailed ledger of depreciated tax lots systematically sold and swapped into non-identical proxies
                  </CardDescription>
                </div>
                <Badge variant={tlhResult.harvestEvents.length > 0 ? 'success' : 'neutral'} className="font-mono text-xs">
                  {tlhResult.harvestEvents.length} Harvest Transactions
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              {tlhResult.harvestEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  No tax lots met the {formatPercent(tlhLossThresholdPct, 0)} loss threshold with ${tlhMinDollarLoss} minimum loss during this backtest window.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-4 font-semibold">Trigger Asset</th>
                      <th className="py-2.5 px-4 font-semibold">Substitute Proxy</th>
                      <th className="py-2.5 px-4 font-semibold">Cost Basis</th>
                      <th className="py-2.5 px-4 font-semibold">Sale Proceeds</th>
                      <th className="py-2.5 px-4 font-semibold">Loss Harvested</th>
                      <th className="py-2.5 px-4 font-semibold">Est. Tax Shield</th>
                      <th className="py-2.5 px-4 font-semibold">Wash Sale Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                    {tlhResult.harvestEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-4 font-bold text-slate-900 font-sans">{evt.date}</td>
                        <td className="py-2 px-4 text-blue-600 font-semibold font-sans">{evt.primarySymbol}</td>
                        <td className="py-2 px-4 text-emerald-600 font-semibold font-sans flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          {evt.proxySymbol}
                        </td>
                        <td className="py-2 px-4 text-slate-700">{formatCurrency(evt.costBasis)}</td>
                        <td className="py-2 px-4 text-slate-700">{formatCurrency(evt.saleProceeds)}</td>
                        <td className="py-2 px-4 text-rose-600 font-bold">-{formatCurrency(evt.realizedLoss)}</td>
                        <td className="py-2 px-4 text-emerald-600 font-bold">+{formatCurrency(evt.taxSavingsEst)}</td>
                        <td className="py-2 px-4 font-sans">
                          <Badge variant="success" className="text-[10px]">
                            30D Compliant
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Annual Tax Savings & Carryforward Schedule Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Annual Tax Savings &amp; Loss Carryforward Schedule
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Year-by-year accounting of capital gains offsets, ordinary income deductions ($3,000/yr IRS limit), and carryforward reservoir
                </CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Year</th>
                    <th className="py-2.5 px-4 font-semibold">Baseline Wealth</th>
                    <th className="py-2.5 px-4 font-semibold">Harvested Wealth</th>
                    <th className="py-2.5 px-4 font-semibold">Losses Realized</th>
                    <th className="py-2.5 px-4 font-semibold">Ordinary Offset</th>
                    <th className="py-2.5 px-4 font-semibold">Tax Savings</th>
                    <th className="py-2.5 px-4 font-semibold">Ending Carryforward</th>
                    <th className="py-2.5 px-4 font-semibold">Cumulative Alpha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  {tlhResult.annualAudit.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-4 font-bold text-slate-900 font-sans">{row.year}</td>
                      <td className="py-2 px-4 text-slate-700">{formatCurrency(row.baselineEndingBalance)}</td>
                      <td className="py-2 px-4 text-emerald-600 font-bold">{formatCurrency(row.harvestedEndingBalance)}</td>
                      <td className="py-2 px-4 text-rose-600">{formatCurrency(row.realizedLossesHarvested)}</td>
                      <td className="py-2 px-4 text-blue-600">{formatCurrency(row.ordinaryIncomeOffset)}</td>
                      <td className="py-2 px-4 text-emerald-600 font-semibold">{formatCurrency(row.taxSavingsGenerated)}</td>
                      <td className="py-2 px-4 text-amber-600 font-semibold">{formatCurrency(row.lossCarryforward)}</td>
                      <td className="py-2 px-4 text-emerald-700 font-bold">+{row.annualTaxAlphaBps.toFixed(0)} bps</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Cash Flow Timing & XIRR Lab View */}
      {viewMode === 'cashflow' && (
        <div className="space-y-6">
          {/* Scenario Selector Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <CardTitle className="text-slate-900 text-sm font-semibold">
                      Money-Weighted Return (XIRR) &amp; Cash Flow Timing Lab
                    </CardTitle>
                    <Badge variant="info" className="font-mono text-[11px]">
                      Newton-Raphson Solver
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-500 text-xs mt-1">
                    Evaluates how deposit and withdrawal timing affects personal investor returns vs buy-and-hold TWR
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCashFlowScenario('dip_buying')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      cashFlowScenario === 'dip_buying'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Contrarian Dip Buying
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowScenario('peak_chasing')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      cashFlowScenario === 'peak_chasing'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Peak Chasing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashFlowScenario('annual')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      cashFlowScenario === 'annual'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Regular Annual
                  </button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 4 XIRR vs TWR KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Money-Weighted Return (MWR)</span>
              <span className="text-2xl font-bold font-mono text-teal-600 mt-1 block">
                {formatPercent(xirrAnalysis.moneyWeightedReturn, 2)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Exact Newton-Raphson XIRR</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Time-Weighted Return (TWR)</span>
              <span className="text-2xl font-bold font-mono text-blue-600 mt-1 block">
                {formatPercent(xirrAnalysis.timeWeightedReturn, 2)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Buy &amp; Hold Annualized CAGR</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Cash Flow Timing Alpha</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-2xl font-bold font-mono ${
                  xirrAnalysis.timingAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {xirrAnalysis.timingAlpha >= 0 ? '+' : ''}{xirrAnalysis.timingAlphaBps.toFixed(0)} bps
                </span>
                <Badge variant={xirrAnalysis.timingEffect === 'favorable' ? 'success' : xirrAnalysis.timingEffect === 'unfavorable' ? 'danger' : 'neutral'}>
                  {xirrAnalysis.timingEffect.toUpperCase()}
                </Badge>
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">MWR minus TWR Divergence</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Net Capital Contributed</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                {formatCurrency(xirrAnalysis.totalContributed)}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">Terminal: {formatCurrency(xirrAnalysis.endingValue)}</span>
            </div>
          </div>

          {/* Quantitative Interpretation Banner */}
          <div className={`p-4 rounded-xl border ${
            xirrAnalysis.timingEffect === 'favorable'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : xirrAnalysis.timingEffect === 'unfavorable'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              Cash Flow Timing Economic Interpretation
            </div>
            <p className="text-xs mt-1 leading-relaxed opacity-90">
              {xirrAnalysis.interpretation}
            </p>
          </div>

          {/* Cash Flow Ledger Table */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader>
              <div>
                <CardTitle className="text-slate-900 text-sm font-semibold">
                  Simulated Cash Flow Schedule Ledger
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  Dated intermediate deposits and withdrawals evaluated by the XIRR root-finding engine
                </CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Description</th>
                    <th className="py-2.5 px-4 font-semibold">Cash Flow Amount</th>
                    <th className="py-2.5 px-4 font-semibold">Transaction Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  <tr className="bg-slate-50/50">
                    <td className="py-2 px-4 font-bold text-slate-900">2007-01-01</td>
                    <td className="py-2 px-4 font-sans text-slate-700">Initial Starting Capital</td>
                    <td className="py-2 px-4 text-rose-600 font-bold">-{formatCurrency(initialBalance)}</td>
                    <td className="py-2 px-4 font-sans"><Badge variant="neutral">Initial Deposit</Badge></td>
                  </tr>
                  {activeFlows.map((cf, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-4 text-slate-800">{cf.date}</td>
                      <td className="py-2 px-4 font-sans text-slate-700">{cf.description || 'Contribution'}</td>
                      <td className={`py-2 px-4 font-bold ${cf.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {cf.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(cf.amount))}
                      </td>
                      <td className="py-2 px-4 font-sans">
                        <Badge variant={cf.amount < 0 ? 'info' : 'success'}>
                          {cf.amount < 0 ? 'Capital Contribution' : 'Withdrawal'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/50">
                    <td className="py-2 px-4 font-bold text-slate-900">2026-02-01</td>
                    <td className="py-2 px-4 font-sans text-slate-700">Terminal Portfolio Valuation</td>
                    <td className="py-2 px-4 text-emerald-600 font-bold">+{formatCurrency(xirrAnalysis.endingValue)}</td>
                    <td className="py-2 px-4 font-sans"><Badge variant="success">Final Balance</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Institutional Tear Sheet Print Modal */}
      {tearSheetState && (
        <TearSheetModal
          isOpen={tearSheetState.isOpen}
          onClose={() => setTearSheetState(null)}
          portfolioName={tearSheetState.name}
          allocations={tearSheetState.assets.map((a) => ({ symbol: a.symbol, weight: a.weight / 100 }))}
          metrics={tearSheetState.metrics}
          dates={CURATED_DATES}
          initialBalance={initialBalance}
        />
      )}
    </div>
  );
}