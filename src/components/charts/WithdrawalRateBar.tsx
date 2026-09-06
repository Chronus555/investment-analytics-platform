'use client';

import React from 'react';
import { SWRRatePoint } from '@/analytics/retirement';

interface WithdrawalRateBarProps {
  schedule: SWRRatePoint[];
  currentRate?: number;
}

export const WithdrawalRateBar: React.FC<WithdrawalRateBarProps> = ({
  schedule,
  currentRate,
}) => {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
        No withdrawal rate schedule computed.
      </div>
    );
  }

  const getStatusBadge = (status: SWRRatePoint['status']) => {
    switch (status) {
      case 'safe':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Safe (&ge;90%)
          </span>
        );
      case 'moderate':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Moderate (75-89%)
          </span>
        );
      case 'risky':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
            Risky (&lt;75%)
          </span>
        );
    }
  };

  const getBarColor = (succ: number) => {
    if (succ >= 0.90) return 'bg-emerald-500';
    if (succ >= 0.75) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5">
        {schedule.map((pt) => {
          const isSelected = currentRate !== undefined && Math.abs(pt.rate - currentRate) < 0.002;
          const succPct = Math.round(pt.successRate * 100);

          return (
            <div
              key={pt.rateLabel}
              className={`p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {pt.rateLabel}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    (${pt.annualSpending.toLocaleString()}/yr)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(pt.status)}
                  <span className="font-mono font-semibold text-xs text-slate-800 tabular-nums">
                    {succPct}% Success
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBarColor(
                    pt.successRate
                  )}`}
                  style={{ width: `${Math.max(4, succPct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                <span>Legacy Median: ${pt.medianLegacy.toLocaleString()}</span>
                <span>{pt.successRate >= 0.95 ? 'High Capital Preservation' : pt.successRate < 0.7 ? 'High Depletion Risk' : 'Acceptable Volatility'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
