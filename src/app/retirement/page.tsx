'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { LifecycleWealthChart } from '@/components/charts/LifecycleWealthChart';
import { WithdrawalRateBar } from '@/components/charts/WithdrawalRateBar';
import {
  RetirementGoalConfig,
  WithdrawalStrategy,
  simulateRetirementMonteCarlo,
  calculateSWRSchedule,
} from '@/analytics/retirement';
import { ShieldCheck, Sparkles, TrendingUp, AlertTriangle, HelpCircle, ArrowRight, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function RetirementPage() {
  // Input parameters
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancyAge, setLifeExpectancyAge] = useState(90);

  const [currentPortfolio, setCurrentPortfolio] = useState(250000);
  const [annualSavings, setAnnualSavings] = useState(15000);
  const [desiredAnnualSpending, setDesiredAnnualSpending] = useState(75000);

  const [strategy, setStrategy] = useState<WithdrawalStrategy>('guyton_klinger');
  const [socialSecurityAge, setSocialSecurityAge] = useState(67);
  const [socialSecurityAnnual, setSocialSecurityAnnual] = useState(32000);
  const [pensionAnnual, setPensionAnnual] = useState(0);

  // Asset allocation: % Stocks (remaining is Bonds)
  const [stockWeight, setStockWeight] = useState(60);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'trajectory' | 'swr' | 'schedule'>('trajectory');

  // Compute market parameters based on asset allocation
  // Stocks: 8.5% return, 15.5% vol; Bonds: 4.2% return, 5.5% vol; correlation approx 0.1
  const marketParams = useMemo(() => {
    const wS = stockWeight / 100;
    const wB = 1 - wS;
    const retS = 0.085;
    const retB = 0.042;
    const volS = 0.155;
    const volB = 0.055;
    const cov = 0.1 * volS * volB;

    const meanReturn = wS * retS + wB * retB;
    const variance = wS * wS * volS * volS + wB * wB * volB * volB + 2 * wS * wB * cov;
    const volatility = Math.sqrt(variance);

    return { meanReturn, volatility, seed: 4242 };
  }, [stockWeight]);

  // Build config
  const config: RetirementGoalConfig = useMemo(() => ({
    currentAge,
    retirementAge,
    lifeExpectancyAge,
    currentPortfolio,
    annualSavings,
    desiredAnnualSpending,
    strategy,
    socialSecurityAge,
    socialSecurityAnnual,
    pensionAnnual,
    inflationRate: 0.025,
    floorSpending: desiredAnnualSpending * 0.85,
    ceilingSpending: desiredAnnualSpending * 1.30,
  }), [
    currentAge,
    retirementAge,
    lifeExpectancyAge,
    currentPortfolio,
    annualSavings,
    desiredAnnualSpending,
    strategy,
    socialSecurityAge,
    socialSecurityAnnual,
    pensionAnnual,
  ]);

  // Run 1,000 Monte Carlo paths
  const mcResult = useMemo(() => {
    return simulateRetirementMonteCarlo(config, marketParams, 1000);
  }, [config, marketParams]);

  // Calculate SWR schedule
  const swrSchedule = useMemo(() => {
    return calculateSWRSchedule(config, marketParams, [0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06]);
  }, [config, marketParams]);

  // Initial withdrawal rate at retirement
  const initialWithdrawalRate = useMemo(() => {
    const yearsToRet = Math.max(0, retirementAge - currentAge);
    let estBal = currentPortfolio;
    for (let y = 0; y < yearsToRet; y++) {
      estBal = (estBal + annualSavings) * (1 + marketParams.meanReturn);
    }
    const netSpending = Math.max(0, desiredAnnualSpending - (retirementAge >= socialSecurityAge ? socialSecurityAnnual : 0) - pensionAnnual);
    return estBal > 0 ? (netSpending / estBal) * 100 : 0;
  }, [currentAge, retirementAge, currentPortfolio, annualSavings, desiredAnnualSpending, socialSecurityAge, socialSecurityAnnual, pensionAnnual, marketParams]);

  // Success rate status
  const successPct = Math.round(mcResult.successRate * 100);
  const successStatus = successPct >= 90 ? 'safe' : successPct >= 75 ? 'moderate' : 'risky';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retirement & Withdrawal Lab"
        subtitle="Lifecycle Decumulation & Dynamic Guardrails"
        description="Model multi-decade retirement decumulation with Guyton-Klinger guardrails, Social Security offsets, and 1,000-path Monte Carlo survival simulations."
        badge={
          <Badge variant="info" className="gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Monte Carlo Decumulation Engine</span>
          </Badge>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Survival Probability"
          value={`${successPct}%`}
          change={successPct >= 90 ? 'Safe Horizon' : successPct >= 75 ? 'Moderate Risk' : 'High Ruin Risk'}
          changeType={successPct >= 75 ? 'positive' : 'negative'}
          subtext={`1,000 paths to age ${lifeExpectancyAge}`}
        />
        <MetricCard
          label="Median Legacy Balance"
          value={`$${Math.round(mcResult.medianEndingWealth).toLocaleString()}`}
          subtext={`Age ${lifeExpectancyAge} terminal wealth`}
        />
        <MetricCard
          label="Worst Depletion Age"
          value={mcResult.worstDepletionAge ? `Age ${mcResult.worstDepletionAge}` : 'Never Depleted'}
          change={mcResult.worstDepletionAge ? 'Tail Risk Episode' : '100% Capital Solvency'}
          changeType={!mcResult.worstDepletionAge ? 'positive' : 'negative'}
          subtext="Earliest ruin in 1,000 trials"
        />
        <MetricCard
          label="Net Annual Withdrawal"
          value={`$${Math.round(mcResult.averageNetAnnualWithdrawal).toLocaleString()}`}
          subtext={`Initial rate: ${initialWithdrawalRate.toFixed(1)}%`}
        />
      </div>

      {/* Configuration & Simulation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">1. Milestone Ages</CardTitle>
              <CardDescription className="text-xs">
                Timeline from today through life expectancy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Current Age</span>
                  <span className="font-mono font-bold">{currentAge}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  value={currentAge}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCurrentAge(v);
                    if (v >= retirementAge) setRetirementAge(v + 1);
                  }}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Retirement Age</span>
                  <span className="font-mono font-bold">{retirementAge}</span>
                </div>
                <input
                  type="range"
                  min={currentAge + 1}
                  max="75"
                  value={retirementAge}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRetirementAge(v);
                    if (v >= lifeExpectancyAge) setLifeExpectancyAge(v + 5);
                  }}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Life Expectancy</span>
                  <span className="font-mono font-bold">{lifeExpectancyAge}</span>
                </div>
                <input
                  type="range"
                  min={retirementAge + 1}
                  max="100"
                  value={lifeExpectancyAge}
                  onChange={(e) => setLifeExpectancyAge(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">2. Financials & Cash Flows</CardTitle>
              <CardDescription className="text-xs">
                Accumulation contributions & retirement spending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Current Portfolio</span>
                  <span className="font-mono font-bold">${currentPortfolio.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="2000000"
                  step="10000"
                  value={currentPortfolio}
                  onChange={(e) => setCurrentPortfolio(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Annual Savings (Pre-Retire)</span>
                  <span className="font-mono font-bold">${annualSavings.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="2500"
                  value={annualSavings}
                  onChange={(e) => setAnnualSavings(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Desired Retirement Spending</span>
                  <span className="font-mono font-bold">${desiredAnnualSpending.toLocaleString()}/yr</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="250000"
                  step="2500"
                  value={desiredAnnualSpending}
                  onChange={(e) => setDesiredAnnualSpending(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">3. Guaranteed Outside Income</CardTitle>
              <CardDescription className="text-xs">
                Social Security & defined pensions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Social Security Age</span>
                  <span className="font-mono font-bold">{socialSecurityAge}</span>
                </div>
                <input
                  type="range"
                  min="62"
                  max="70"
                  value={socialSecurityAge}
                  onChange={(e) => setSocialSecurityAge(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Annual Social Security</span>
                  <span className="font-mono font-bold">${socialSecurityAnnual.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60000"
                  step="1000"
                  value={socialSecurityAnnual}
                  onChange={(e) => setSocialSecurityAnnual(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Defined Benefit Pension</span>
                  <span className="font-mono font-bold">${pensionAnnual.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60000"
                  step="2000"
                  value={pensionAnnual}
                  onChange={(e) => setPensionAnnual(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">4. Strategy & Asset Allocation</CardTitle>
              <CardDescription className="text-xs">
                Rule engine and expected market volatility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-2">Withdrawal Rule</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'guyton_klinger', label: 'Guyton-Klinger Guardrails', desc: 'Dynamic cuts on crashes, boosts in bull markets' },
                    { id: 'fixed_real', label: 'Fixed Real (Bengel 4% Rule)', desc: 'Constant dollar indexed annually for inflation' },
                    { id: 'fixed_nominal', label: 'Fixed Nominal', desc: 'Flat dollar amount (inflation decays real value)' },
                    { id: 'percentage', label: 'Variable % of Portfolio', desc: 'Fixed % of starting annual balance' },
                    { id: 'floor_and_ceiling', label: 'Floor & Ceiling', desc: 'Variable spending clamped between 85% and 130%' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrategy(s.id as WithdrawalStrategy)}
                      className={`text-left p-2 rounded-lg border transition-all ${
                        strategy === s.id
                          ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-medium">Portfolio Mix: {stockWeight}% Stocks / {100 - stockWeight}% Bonds</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={stockWeight}
                  onChange={(e) => setStockWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                  <span>Exp Return: {(marketParams.meanReturn * 100).toFixed(1)}%</span>
                  <span>Volatility: {(marketParams.volatility * 100).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Visualization & Schedules */}
        <div className="lg:col-span-8 space-y-6">
          {/* Segmented View Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('trajectory')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'trajectory'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lifecycle Trajectory
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('swr')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'swr'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SWR Safety Curve
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'schedule'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cash Flow Schedule
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>{strategy.replace('_', ' ').toUpperCase()}</span>
              <span>•</span>
              <span>1,000 PATHS</span>
            </div>
          </div>

          {activeTab === 'trajectory' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Multi-Decade Lifecycle Wealth Trajectory
                </CardTitle>
                <CardDescription className="text-xs">
                  Accumulation phase (ages {currentAge} to {retirementAge}) and decumulation (ages {retirementAge} to {lifeExpectancyAge}) showing 10th, 50th (median), and 90th percentile wealth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LifecycleWealthChart
                  trajectories={mcResult.percentileTrajectories}
                  retirementAge={retirementAge}
                  socialSecurityAge={socialSecurityAge}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'swr' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Safe Withdrawal Rate (SWR) Curve Comparison
                </CardTitle>
                <CardDescription className="text-xs">
                  Evaluation of longevity success across initial withdrawal rates from 3.0% to 6.0% under simulated market regimes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WithdrawalRateBar
                  schedule={swrSchedule}
                  currentRate={initialWithdrawalRate / 100}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'schedule' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Deterministic Baseline Decumulation Schedule
                </CardTitle>
                <CardDescription className="text-xs">
                  Year-by-year cash flows under expected long-term market returns ({(marketParams.meanReturn * 100).toFixed(1)}%)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Age</th>
                        <th className="py-2.5 px-3">Phase</th>
                        <th className="py-2.5 px-3">Starting Bal</th>
                        <th className="py-2.5 px-3">Gross Spending</th>
                        <th className="py-2.5 px-3">Outside Inc</th>
                        <th className="py-2.5 px-3">Net Withdrawal</th>
                        <th className="py-2.5 px-3">Ending Bal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mcResult.deterministicSchedule.map((row) => {
                        const isRetire = row.age >= retirementAge;
                        return (
                          <tr
                            key={row.age}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              row.age === retirementAge ? 'bg-amber-50/40 font-semibold' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-semibold text-slate-800">{row.age}</td>
                            <td className="py-2 px-3 text-[11px]">
                              {isRetire ? (
                                <span className="text-blue-600">Retirement</span>
                              ) : (
                                <span className="text-slate-500">Accumulate</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              ${Math.round(row.portfolioStart).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              {row.spending > 0 ? `$${Math.round(row.spending).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-emerald-600">
                              {row.outsideIncome > 0 ? `+$${Math.round(row.outsideIncome).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-red-600">
                              {row.netWithdrawal > 0
                                ? `-$${Math.round(row.netWithdrawal).toLocaleString()}`
                                : row.netWithdrawal < 0
                                ? `+$${Math.round(-row.netWithdrawal).toLocaleString()}`
                                : '—'}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              ${Math.round(row.portfolioEnd).toLocaleString()}
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

          {/* Educational / Methodology Callout */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 text-slate-600">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Guyton-Klinger Guardrails Methodology</span>
            </div>
            <p className="leading-relaxed">
              Unlike the naive static Bengel 4% rule which blindly raises nominal withdrawals during severe market downturns, Guyton-Klinger introduces dynamic capital preservation: if your current withdrawal rate exceeds 120% of your initial target, spending is trimmed by 10% to protect the principal. When markets surge and withdrawal rates drop below 80% of target, the prosperity rule triggers a 10% raise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
