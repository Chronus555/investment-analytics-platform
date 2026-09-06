'use client';

import React from 'react';
import { MonthlyReturnRecord } from '@/analytics/backtest';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyHeatmap({ records }: { records: MonthlyReturnRecord[] }) {
  if (!records || records.length === 0) return null;

  const getCellColor = (val: number | null) => {
    if (val === null) return 'bg-slate-900/40 text-slate-600';
    if (val === 0) return 'bg-slate-800 text-slate-300';
    if (val > 0) {
      if (val >= 0.08) return 'bg-emerald-500/80 text-white font-semibold';
      if (val >= 0.04) return 'bg-emerald-600/70 text-emerald-100';
      if (val >= 0.02) return 'bg-emerald-700/60 text-emerald-200';
      return 'bg-emerald-900/50 text-emerald-300';
    } else {
      if (val <= -0.08) return 'bg-rose-500/80 text-white font-semibold';
      if (val <= -0.04) return 'bg-rose-600/70 text-rose-100';
      if (val <= -0.02) return 'bg-rose-700/60 text-rose-200';
      return 'bg-rose-900/50 text-rose-300';
    }
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl overflow-x-auto">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white tracking-wide">Monthly Returns Matrix</h3>
        <p className="text-xs text-slate-400">Monthly percentage returns and full year totals</p>
      </div>

      <table className="w-full text-xs border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 font-medium">
            <th className="py-2 px-2 text-left font-mono">Year</th>
            {MONTH_NAMES.map((m) => (
              <th key={m} className="py-2 px-2 text-center font-mono">{m}</th>
            ))}
            <th className="py-2 px-2 text-right font-mono font-bold text-sky-400">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40 font-mono">
          {records.map((rec) => (
            <tr key={rec.year} className="hover:bg-slate-800/30 transition-colors">
              <td className="py-1.5 px-2 font-semibold text-slate-300">{rec.year}</td>
              {rec.months.map((mVal, idx) => (
                <td key={idx} className="p-0.5 text-center">
                  <div className={`py-1 px-1 rounded text-[11px] ${getCellColor(mVal)}`}>
                    {mVal !== null ? `${(mVal * 100).toFixed(1)}%` : '-'}
                  </div>
                </td>
              ))}
              <td className="py-1.5 px-2 text-right font-bold">
                <span className={rec.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
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
