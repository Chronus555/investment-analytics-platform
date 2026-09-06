'use client';

import React from 'react';
import { DrawdownEpisode } from '@/analytics/drawdowns';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPercent } from '@/utils/formatters';

export function DrawdownTable({ episodes }: { episodes: DrawdownEpisode[] }) {
  if (!episodes || episodes.length === 0) return null;

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div>
          <CardTitle>Historical Crisis & Drawdown Episodes</CardTitle>
          <CardDescription>Ranked by peak-to-trough decline depth and recovery duration</CardDescription>
        </div>
      </CardHeader>

      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-950">
            <tr className="border-b border-slate-800/80 text-[10px] uppercase font-mono tracking-wider text-slate-400">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Peak</th>
              <th className="py-2.5 px-3">Trough</th>
              <th className="py-2.5 px-3 text-right">Decline</th>
              <th className="py-2.5 px-3">Recovery Date</th>
              <th className="py-2.5 px-3 text-right">Length</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono text-[12px]">
            {episodes.map((ep, idx) => (
              <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
                <td className="py-2 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                <td className="py-2 px-3 text-slate-300">{ep.peakDate.slice(0, 7)}</td>
                <td className="py-2 px-3 text-slate-300">{ep.troughDate.slice(0, 7)}</td>
                <td className="py-2 px-3 text-right font-bold text-rose-400">
                  {formatPercent(ep.depth, 2)}
                </td>
                <td className="py-2 px-3 text-slate-400">{ep.recoveryDate ? ep.recoveryDate.slice(0, 7) : '—'}</td>
                <td className="py-2 px-3 text-right text-slate-300">{ep.durationMonths} mo</td>
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