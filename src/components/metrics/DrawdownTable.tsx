'use client';

import React from 'react';
import { DrawdownEpisode } from '@/analytics/drawdowns';

export function DrawdownTable({ episodes }: { episodes: DrawdownEpisode[] }) {
  if (!episodes || episodes.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-3">
      <div className="mb-2">
        <h3 className="text-base font-semibold text-white tracking-wide">Worst Historical Drawdown Periods</h3>
        <p className="text-xs text-slate-400">Ranked by peak-to-trough decline severity</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono">
              <th className="py-2 px-2.5">#</th>
              <th className="py-2 px-2.5">Peak</th>
              <th className="py-2 px-2.5">Trough</th>
              <th className="py-2 px-2.5 text-right font-bold text-rose-400">Drawdown</th>
              <th className="py-2 px-2.5">Recovery Date</th>
              <th className="py-2 px-2.5 text-right">Decline (Mo)</th>
              <th className="py-2 px-2.5 text-right">Recovery (Mo)</th>
              <th className="py-2 px-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {episodes.map((ep, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-2.5 text-slate-500 font-bold">{idx + 1}</td>
                <td className="py-2 px-2.5 text-slate-300">{ep.peakDate}</td>
                <td className="py-2 px-2.5 text-slate-300">{ep.troughDate}</td>
                <td className="py-2 px-2.5 text-right font-bold text-rose-400">
                  {(ep.depth * 100).toFixed(2)}%
                </td>
                <td className="py-2 px-2.5 text-slate-400">{ep.recoveryDate || '—'}</td>
                <td className="py-2 px-2.5 text-right text-slate-300">{ep.durationMonths}m</td>
                <td className="py-2 px-2.5 text-right text-slate-300">
                  {ep.recoveryMonths ? `${ep.recoveryMonths}m` : '—'}
                </td>
                <td className="py-2 px-2.5 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      ep.isRecovered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {ep.isRecovered ? 'Recovered' : 'In Recovery'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
