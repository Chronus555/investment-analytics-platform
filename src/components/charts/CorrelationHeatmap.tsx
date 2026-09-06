'use client';

import React from 'react';

interface CorrelationHeatmapProps {
  symbols: string[];
  matrix: number[][];
}

export function CorrelationHeatmap({ symbols, matrix }: CorrelationHeatmapProps) {
  if (!symbols || symbols.length === 0 || !matrix || matrix.length === 0) return null;

  const getHeatmapColor = (corr: number) => {
    if (corr >= 0.8) return 'bg-emerald-600/90 text-white';
    if (corr >= 0.5) return 'bg-emerald-700/70 text-emerald-100';
    if (corr >= 0.2) return 'bg-emerald-900/50 text-emerald-200';
    if (corr >= -0.2) return 'bg-slate-800 text-slate-300';
    if (corr >= -0.5) return 'bg-rose-900/50 text-rose-200';
    if (corr >= -0.8) return 'bg-rose-700/70 text-rose-100';
    return 'bg-rose-600/90 text-white';
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl overflow-x-auto">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white tracking-wide">Correlation Heatmap</h3>
        <p className="text-xs text-slate-400">Pairwise Pearson correlation matrix (-1.0 to +1.0)</p>
      </div>

      <table className="text-xs border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="p-2 text-left font-mono text-slate-400"></th>
            {symbols.map((s) => (
              <th key={s} className="p-2 text-center font-mono font-semibold text-slate-300">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {symbols.map((rowSym, r) => (
            <tr key={rowSym}>
              <td className="p-2 font-mono font-semibold text-slate-300">{rowSym}</td>
              {symbols.map((_, c) => {
                const corr = matrix[r][c];
                return (
                  <td key={c} className="p-1 text-center">
                    <div
                      className={`py-2 px-3 rounded font-mono font-medium text-[11px] transition-transform hover:scale-105 ${getHeatmapColor(
                        corr
                      )}`}
                    >
                      {corr.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
