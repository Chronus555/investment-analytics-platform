'use client';

import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Printer,
  Layers,
  Sparkles,
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
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
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

  // Backtest Settings
  const [initialBalance, setInitialBalance] = useState(10000);
  const [rebalanceFreq, setRebalanceFreq] = useState<RebalanceFrequency>('annually');
  const [rebalanceThreshold, setRebalanceThreshold] = useState(0.05); // 5% bands
  const [benchmarkSymbol, setBenchmarkSymbol] = useState('SPY');

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

  // Chart Series
  const growthSeries = [
    { id: 'p1', name: port1Name, color: '#6366f1', data: result1.history.map((h) => ({ date: h.date, value: h.portfolioValue })) },
    { id: 'p2', name: port2Name, color: '#10b981', data: result2.history.map((h) => ({ date: h.date, value: h.portfolioValue })) },
    { id: 'p3', name: port3Name, color: '#f59e0b', data: result3.history.map((h) => ({ date: h.date, value: h.portfolioValue })) },
  ];

  const drawdownSeries = [
    { id: 'p1', name: port1Name, color: '#6366f1', data: result1.history.map((h) => ({ date: h.date, drawdown: h.drawdown })) },
    { id: 'p2', name: port2Name, color: '#10b981', data: result2.history.map((h) => ({ date: h.date, drawdown: h.drawdown })) },
    { id: 'p3', name: port3Name, color: '#f59e0b', data: result3.history.map((h) => ({ date: h.date, drawdown: h.drawdown })) },
  ];

  const annualBarSeries = [
    { id: 'p1', name: port1Name, color: '#6366f1', returns: result1.annualReturns },
    { id: 'p2', name: port2Name, color: '#10b981', returns: result2.annualReturns },
    { id: 'p3', name: port3Name, color: '#f59e0b', returns: result3.annualReturns },
  ];

  const comparisonPortfolios = [
    { id: 'p1', name: port1Name, color: '#6366f1', metrics: result1.summary },
    { id: 'p2', name: port2Name, color: '#10b981', metrics: result2.summary },
    { id: 'p3', name: port3Name, color: '#f59e0b', metrics: result3.summary },
  ];

  const rollingSeries = [
    { name: port1Name, color: '#6366f1', returns: result1.history.map((h) => h.portfolioReturn) },
    { name: port2Name, color: '#10b981', returns: result2.history.map((h) => h.portfolioReturn) },
    { name: port3Name, color: '#f59e0b', returns: result3.history.map((h) => h.portfolioReturn) },
  ];

  const stressPortfolios = [
    { name: port1Name, color: '#6366f1', returns: result1.history.map((h) => h.portfolioReturn) },
    { name: port2Name, color: '#10b981', returns: result2.history.map((h) => h.portfolioReturn) },
    { name: port3Name, color: '#f59e0b', returns: result3.history.map((h) => h.portfolioReturn) },
  ];

  const benchmarkStressInput = {
    name: `Benchmark (${benchmarkSymbol})`,
    color: '#94a3b8',
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

      {/* Portfolio Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('port1')}
          className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'port1'
              ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          {port1Name}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('port2')}
          className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'port2'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {port2Name}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('port3')}
          className={`flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'port3'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
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
            accentColor="#6366f1"
          />
        )}
        {activeTab === 'port2' && (
          <PortfolioBuilder
            portfolioName={port2Name}
            onNameChange={setPort2Name}
            assets={port2Assets}
            onChange={setPort2Assets}
            accentColor="#10b981"
          />
        )}
        {activeTab === 'port3' && (
          <PortfolioBuilder
            portfolioName={port3Name}
            onNameChange={setPort3Name}
            assets={port3Assets}
            onChange={setPort3Assets}
            accentColor="#f59e0b"
          />
        )}
      </div>

      {/* Backtest & Cash Flow Settings Card */}
      <Card className="shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Simulation Parameters & Rebalancing</CardTitle>
            <CardDescription>
              Configure initial capital, rebalancing frequency, benchmark comparison, and fee drag
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </CardHeader>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Starting Capital
              </label>
              <div className="flex items-center h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 focus-within:border-indigo-500 transition">
                <span className="text-slate-500 mr-1.5">$</span>
                <input
                  type="number"
                  min="100"
                  step="1000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 10000)}
                  className="w-full bg-transparent font-mono text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Rebalancing
              </label>
              <select
                value={rebalanceFreq}
                onChange={(e) => setRebalanceFreq(e.target.value as RebalanceFrequency)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
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
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Benchmark Asset
              </label>
              <select
                value={benchmarkSymbol}
                onChange={(e) => setBenchmarkSymbol(e.target.value)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
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
              <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                Annual Advisory Fee
              </label>
              <div className="flex items-center h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 focus-within:border-indigo-500 transition">
                <input
                  type="number"
                  min="0"
                  max="300"
                  step="5"
                  value={advisoryFeeBps}
                  onChange={(e) => setAdvisoryFeeBps(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent font-mono text-slate-100 focus:outline-none"
                />
                <span className="text-slate-500 ml-1.5 text-[11px] font-mono">bps</span>
              </div>
            </div>
          </div>

          {/* Progressive Disclosure: Advanced Settings */}
          {showAdvanced && (
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                  Cash Flow Mode
                </label>
                <select
                  value={cashFlowType}
                  onChange={(e) => setCashFlowType(e.target.value as CashFlowType)}
                  className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
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
                    <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                      {cashFlowType === 'percentage_withdraw' ? 'Annual Percentage Rate (%)' : 'Amount ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={cashFlowType === 'percentage_withdraw' ? '0.5' : '100'}
                      value={cashFlowAmount}
                      onChange={(e) => setCashFlowAmount(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                      Frequency
                    </label>
                    <select
                      value={cashFlowFreq}
                      onChange={(e) => setCashFlowFreq(e.target.value as any)}
                      className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
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
                      className="accent-indigo-500 rounded cursor-pointer h-4 w-4"
                    />
                    <label htmlFor="inflCheck" className="text-slate-300 font-medium cursor-pointer text-xs">
                      Adjust for Inflation (CPI-U 2.5%)
                    </label>
                  </div>
                </>
              )}

              {rebalanceFreq === 'threshold' && (
                <div>
                  <label className="block text-slate-400 mb-1.5 text-[11px] font-mono uppercase tracking-wider font-medium">
                    Drift Band Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    step="1"
                    value={rebalanceThreshold * 100}
                    onChange={(e) => setRebalanceThreshold((parseFloat(e.target.value) || 5) / 100)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

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