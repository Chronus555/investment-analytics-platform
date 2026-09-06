'use client';

import React from 'react';
import { MonthlyReturnRecord } from '@/analytics/backtest';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyHeatmap({ records }: { records: MonthlyReturnRecord[] }) {
  if (!records || records.length === 0) return null;

  const getCellColor = (val: number | null) => {
    if (val === null) return 'bg-slate-50 text-slate-300';
    if (val === 0) return 'bg-slate-100 text-slate-600';
    if (val > 0) {
      if (val >= 0.08) return 'bg-emerald-600 text-white font-semibold shadow-2xs';
      if (val >= 0.04) return 'bg-emerald-500 text-white font-medium';
      if (val >= 0.02) return 'bg-emerald-100 text-emerald-800 font-medium';
      return 'bg-emerald-50 text-emerald-700';
    } else {
      if (val <= -0.08) return 'bg-red-600 text-white font-semibold shadow-2xs';
      if (val <= -0.04) return 'bg-red-500 text-white font-medium';
      if (val <= -0.02) return 'bg-red-100 text-red-800 font-medium';
      return 'bg-red-50 text-red-700';
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm overflow-x-auto">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">Monthly Returns Matrix</h3>
        <p className="text-xs text-slate-500 mt-0.5">Monthly percentage returns and full year totals</p>
      </div>

      <table className="w-full text-xs border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 font-medium">
            <th className="py-2 px-2 text-left font-mono">Year</th>
            {MONTH_NAMES.map((m) => (
              <th key={m} className="py-2 px-2 text-center font-mono">{m}</th>
            ))}
            <th className="py-2 px-2 text-right font-mono font-bold text-blue-600">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {records.map((rec) => (
            <tr key={rec.year} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-1.5 px-2 font-semibold text-slate-800">{rec.year}</td>
              {rec.months.map((mVal, idx) => (
                <td key={idx} className="p-0.5 text-center">
                  <div className={`py-1 px-1 rounded text-[11px] ${getCellColor(mVal)}`}>
                    {mVal !== null ? `${(mVal * 100).toFixed(1)}%` : '-'}
                  </div>
                </td>
              ))}
              <td className="py-1.5 px-2 text-right font-bold tabular-nums">
                <span className={rec.total >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {(rec.total * 100).toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
