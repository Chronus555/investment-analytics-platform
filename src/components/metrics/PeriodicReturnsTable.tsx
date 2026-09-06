'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { AnnualReturnRecord } from '@/analytics/backtest';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface PeriodicReturnsTableProps {
  portfolioName: string;
  annualReturns: AnnualReturnRecord[];
}

export function PeriodicReturnsTable({ portfolioName, annualReturns }: PeriodicReturnsTableProps) {
  if (!annualReturns || annualReturns.length === 0) return null;

  const handleExportCSV = () => {
    let csv = 'Year,Return,Ending Balance\n';
    annualReturns.forEach((r) => {
      csv += `${r.year},${formatPercent(r.return, 2)},${Math.round(r.endingBalance)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioName.toLowerCase().replace(/\s+/g, '-')}-annual-returns.csv`;
    a.click();
  };

  return (
    <Card className="w-full shadow-xs border-slate-200 bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-slate-900">Historical Calendar Year Returns</CardTitle>
          <CardDescription className="text-slate-500">Chronological annual performance and ending wealth</CardDescription>
        </div>
        <Button onClick={handleExportCSV} variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
          Export CSV
        </Button>
      </CardHeader>

      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-[11px] uppercase font-mono tracking-wider text-slate-500">
              <th className="py-2.5 px-4 font-semibold">Year</th>
              <th className="py-2.5 px-4 text-right font-semibold">Calendar Return</th>
              <th className="py-2.5 px-4 text-right font-semibold">Ending Wealth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
            {annualReturns.map((r) => (
              <tr key={r.year} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2 px-4 text-slate-800 font-semibold font-sans">{r.year}</td>
                <td
                  className={`py-2 px-4 text-right font-medium ${
                    r.return >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatPercent(r.return, 2, true)}
                </td>
                <td className="py-2 px-4 text-right text-slate-700">
                  {formatCurrency(r.endingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}