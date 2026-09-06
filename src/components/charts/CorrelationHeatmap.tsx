'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

interface CorrelationHeatmapProps {
  symbols: string[];
  matrix: number[][];
}

export function CorrelationHeatmap({ symbols, matrix }: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; val: number } | null>(null);

  if (!symbols || symbols.length === 0 || !matrix || matrix.length === 0) return null;

  const getHeatmapColor = (corr: number, isDiagonal: boolean) => {
    if (isDiagonal) {
      return 'bg-slate-800/60 text-slate-400 border-slate-700/40';
    }
    if (corr >= 0.75) return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/30';
    if (corr >= 0.5) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (corr >= 0.2) return 'bg-emerald-500/10 text-emerald-400/90 border-emerald-500/10';
    if (corr <= -0.75) return 'bg-rose-500/25 text-rose-300 border-rose-500/30';
    if (corr <= -0.5) return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
    if (corr <= -0.2) return 'bg-rose-500/10 text-rose-400/90 border-rose-500/10';
    return 'bg-slate-900/60 text-slate-400 border-slate-800/60';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Pairwise Correlation Matrix</CardTitle>
            <CardDescription>
              Pearson correlation coefficients between selected assets (-1.00 to +1.00)
            </CardDescription>
          </div>
          {hoveredCell && (
            <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-md">
              <span className="text-slate-400">{hoveredCell.row} × {hoveredCell.col}:</span>
              <span className={`font-bold ${hoveredCell.val > 0 ? 'text-emerald-400' : hoveredCell.val < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {hoveredCell.val >= 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80 text-[11px] text-slate-400">
          <span className="font-medium text-slate-300">Correlation Scale:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-rose-500/25 border border-rose-500/30" />
              <span>-1.0 to -0.5</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500/10" />
              <span>-0.5 to -0.2</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-slate-900/60 border border-slate-800/60" />
              <span>-0.2 to +0.2</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/10" />
              <span>+0.2 to +0.5</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-500/30" />
              <span>+0.5 to +1.0</span>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto pb-2">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr>
                <th className="p-2 text-left font-mono text-slate-400 w-20"></th>
                {symbols.map((s) => (
                  <th key={s} className="p-2 text-center font-mono font-semibold text-slate-300 min-w-[64px]">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-slate-300">
                      {s}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((rowSym, r) => (
                <tr key={rowSym} className="hover:bg-slate-800/20">
                  <td className="p-2 font-mono font-semibold text-slate-300">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-slate-300">
                      {rowSym}
                    </span>
                  </td>
                  {symbols.map((colSym, c) => {
                    const corr = matrix[r][c];
                    const isDiagonal = r === c;
                    return (
                      <td
                        key={c}
                        className="p-1 text-center"
                        onMouseEnter={() => setHoveredCell({ row: rowSym, col: colSym, val: corr })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className={`py-2 px-2.5 rounded border font-mono font-medium text-[11px] tabular-nums transition-transform hover:scale-105 cursor-default ${getHeatmapColor(
                            corr,
                            isDiagonal
                          )}`}
                        >
                          {corr >= 0 ? `+${corr.toFixed(2)}` : corr.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
