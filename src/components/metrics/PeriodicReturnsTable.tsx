'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { AnnualReturnRecord } from '@/analytics/backtest';

interface PeriodicReturnsTableProps {
  portfolioName: string;
  annualReturns: AnnualReturnRecord[];
}

export function PeriodicReturnsTable({ portfolioName, annualReturns }: PeriodicReturnsTableProps) {
  if (!annualReturns || annualReturns.length === 0) return null;

  const handleExportCSV = () => {
    let csv = 'Year,Return,Ending Balance\n';
    annualReturns.forEach((r) => {
      csv += `${r.year},${(r.return * 100).toFixed(2)}%,$${Math.round(r.endingBalance)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioName.toLowerCase().replace(/\s+/g, '-')}-annual-returns.csv`;
    a.click();
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white tracking-wide">Historical Annual Returns</h3>
          <p className="text-xs text-slate-400">Year-by-year calendar return compounding</p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-medium transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono">
              <th className="py-2 px-3">Year</th>
              <th className="py-2 px-3 text-right">Return</th>
              <th className="py-2 px-3 text-right">Ending Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {annualReturns.map((r) => (
              <tr key={r.year} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-3 text-slate-300 font-semibold">{r.year}</td>
                <td
                  className={`py-2 px-3 text-right font-semibold ${
                    r.return >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(r.return * 100).toFixed(2)}%
                </td>
                <td className="py-2 px-3 text-right text-slate-200">
                  ${Math.round(r.endingBalance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
