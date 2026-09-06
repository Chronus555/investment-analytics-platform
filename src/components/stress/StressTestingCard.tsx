'use client';

import React, { useState } from 'react';
import {
  HISTORICAL_STRESS_REGIMES,
  StressRegime,
  evaluateStressRegime,
} from '@/analytics/stressTesting';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';

interface PortfolioSeriesInput {
  name: string;
  color: string;
  returns: number[];
}

interface StressTestingCardProps {
  dates: string[];
  portfolios: PortfolioSeriesInput[];
  benchmark?: PortfolioSeriesInput;
}

export const StressTestingCard: React.FC<StressTestingCardProps> = ({
  dates,
  portfolios,
  benchmark,
}) => {
  const [selectedRegimeId, setSelectedRegimeId] = useState<string>('gfc_2008');

  const selectedRegime = HISTORICAL_STRESS_REGIMES.find((r) => r.id === selectedRegimeId) || HISTORICAL_STRESS_REGIMES[0];

  const allSeries = benchmark ? [...portfolios, benchmark] : portfolios;

  const regimeEvaluations = allSeries.map((s) => {
    const res = evaluateStressRegime(dates, s.returns, selectedRegime);
    return {
      name: s.name,
      color: s.color,
      result: res,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">Historical Macro Stress-Testing Lab</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate how your portfolio allocations would have performed through major market crises and rate shocks
          </p>
        </div>

        {/* Regime Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {HISTORICAL_STRESS_REGIMES.map((r) => {
            const isSelected = r.id === selectedRegimeId;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRegimeId(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {r.name.split(' ')[0]} {r.name.split(' ')[1] || ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Regime Overview Banner */}
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-0.5">
            {selectedRegime.category}
          </span>
          <h4 className="text-sm font-semibold text-slate-900">{selectedRegime.name}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{selectedRegime.description}</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Crisis Window</span>
            <span className="text-slate-700 font-semibold">{selectedRegime.startDate} → {selectedRegime.endDate}</span>
          </div>
        </div>
      </div>

      {/* Comparative Cards Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {regimeEvaluations.map(({ name, color, result }) => {
          if (!result) {
            return (
              <div
                key={name}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500"
              >
                Data unavailable for this period.
              </div>
            );
          }

          const isPositive = result.cumulativeReturn >= 0;
          return (
            <div
              key={name}
              className="rounded-xl border border-slate-200 bg-white p-4 relative overflow-hidden transition hover:border-slate-300 hover:shadow-xs"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{name}</span>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              </div>

              {/* Cumulative Return */}
              <div className="mt-3">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-sans">Period Return</span>
                <div
                  className={`text-xl font-bold font-mono ${
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {(result.cumulativeReturn * 100).toFixed(2)}%
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" /> Max Drawdown
                  </span>
                  <span className="font-mono text-red-600 font-medium">
                    {(result.maxDrawdown * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Annualized Vol</span>
                  <span className="font-mono text-slate-800">
                    {(result.annualizedVol * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Worst Single Month</span>
                  <span className="font-mono text-red-600">
                    {(result.worstMonth * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> Recovery
                  </span>
                  <span className="font-mono text-xs">
                    {result.isRecovered ? (
                      <span className="text-emerald-700 font-medium">
                        {result.monthsToRecover} months
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Not Recovered</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};