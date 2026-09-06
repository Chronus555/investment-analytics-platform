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
      return 'bg-slate-100 text-slate-400 border-slate-200 font-medium';
    }
    if (corr >= 0.75) return 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs';
    if (corr >= 0.5) return 'bg-emerald-100 text-emerald-900 font-semibold border-emerald-200';
    if (corr >= 0.2) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (corr <= -0.75) return 'bg-red-600 text-white font-bold border-red-600 shadow-2xs';
    if (corr <= -0.5) return 'bg-red-100 text-red-900 font-semibold border-red-200';
    if (corr <= -0.2) return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-slate-50 text-slate-500 border-slate-200/60';
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
            <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 text-white border border-slate-850 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-slate-300">{hoveredCell.row} × {hoveredCell.col}:</span>
              <span className={`font-bold ${hoveredCell.val > 0 ? 'text-emerald-400' : hoveredCell.val < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                {hoveredCell.val >= 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 text-[11px] text-slate-500">
          <span className="font-medium text-slate-700">Correlation Scale:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-600 border border-red-700" />
              <span>-1.0 to -0.5</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200" />
              <span>-0.5 to -0.2</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
              <span>-0.2 to +0.2</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
              <span>+0.2 to +0.5</span>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700" />
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
                  <th key={s} className="p-2 text-center font-mono font-semibold text-slate-700 min-w-[64px]">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {s}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((rowSym, r) => (
                <tr key={rowSym} className="hover:bg-slate-50/50">
                  <td className="p-2 font-mono font-semibold text-slate-700">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
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
