'use client';

import React from 'react';
import { DrawdownEpisode } from '@/analytics/drawdowns';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPercent } from '@/utils/formatters';

export function DrawdownTable({ episodes }: { episodes: DrawdownEpisode[] }) {
  if (!episodes || episodes.length === 0) return null;

  return (
    <Card className="w-full shadow-xs border-slate-200 bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-slate-900">Historical Crisis & Drawdown Episodes</CardTitle>
          <CardDescription className="text-slate-500">Ranked by peak-to-trough decline depth and recovery duration</CardDescription>
        </div>
      </CardHeader>

      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-[11px] uppercase font-mono tracking-wider text-slate-500">
              <th className="py-2.5 px-3 font-semibold">#</th>
              <th className="py-2.5 px-3 font-semibold">Peak</th>
              <th className="py-2.5 px-3 font-semibold">Trough</th>
              <th className="py-2.5 px-3 text-right font-semibold">Decline</th>
              <th className="py-2.5 px-3 font-semibold">Recovery Date</th>
              <th className="py-2.5 px-3 text-right font-semibold">Length</th>
              <th className="py-2.5 px-3 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
            {episodes.map((ep, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2 px-3 text-slate-400 font-semibold font-sans">{idx + 1}</td>
                <td className="py-2 px-3 text-slate-700">{ep.peakDate.slice(0, 7)}</td>
                <td className="py-2 px-3 text-slate-700">{ep.troughDate.slice(0, 7)}</td>
                <td className="py-2 px-3 text-right font-bold text-red-600">
                  {formatPercent(ep.depth, 2)}
                </td>
                <td className="py-2 px-3 text-slate-600">{ep.recoveryDate ? ep.recoveryDate.slice(0, 7) : '—'}</td>
                <td className="py-2 px-3 text-right text-slate-700">{ep.durationMonths} mo</td>
                <td className="py-2 px-3 text-center">
                  <Badge variant={ep.isRecovered ? 'success' : 'warning'} size="sm">
                    {ep.isRecovered ? 'Recovered' : 'Underwater'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}