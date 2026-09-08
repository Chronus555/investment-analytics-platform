'use client';

import React, { useState } from 'react';

interface MatrixData {
  symbols: string[];
  matrix: number[][];
}

interface QuasiDiagHeatmapProps {
  original: MatrixData;
  quasi: MatrixData;
}

export const QuasiDiagHeatmap: React.FC<QuasiDiagHeatmapProps> = ({
  original,
  quasi,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    sym1: string;
    sym2: string;
    value: number;
    matrixType: 'original' | 'quasi';
  } | null>(null);

  function getColor(val: number): string {
    // Clamped [-1, 1]
    const clamped = Math.max(-1, Math.min(1, val));
    if (clamped >= 0) {
      // 0 -> #f8fafc (slate-50), 1 -> #10b981 (emerald-500)
      const intensity = clamped;
      const r = Math.round(248 - intensity * (248 - 16));
      const g = Math.round(250 - intensity * (250 - 185));
      const b = Math.round(252 - intensity * (252 - 129));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // 0 -> #f8fafc, -1 -> #ef4444 (rose-500)
      const intensity = Math.abs(clamped);
      const r = Math.round(248 + intensity * (239 - 248));
      const g = Math.round(250 - intensity * (250 - 68));
      const b = Math.round(252 - intensity * (252 - 68));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  function renderGrid(data: MatrixData, matrixType: 'original' | 'quasi') {
    const n = data.symbols.length;
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead>
            <tr>
              <th className="p-1 text-slate-400 text-left font-normal"></th>
              {data.symbols.map((sym) => (
                <th key={sym} className="p-1 text-center font-bold text-slate-700">
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.symbols.map((symRow, r) => (
              <tr key={symRow}>
                <td className="p-1 font-bold text-slate-700 text-left pr-2 whitespace-nowrap">
                  {symRow}
                </td>
                {data.symbols.map((symCol, c) => {
                  const val = data.matrix[r][c];
                  const isHovered =
                    hoveredCell &&
                    hoveredCell.matrixType === matrixType &&
                    ((hoveredCell.sym1 === symRow && hoveredCell.sym2 === symCol) ||
                      (hoveredCell.sym1 === symCol && hoveredCell.sym2 === symRow));

                  return (
                    <td
                      key={symCol}
                      className="p-1 text-center transition-all cursor-pointer"
                      style={{
                        backgroundColor: getColor(val),
                        color: Math.abs(val) > 0.6 ? '#ffffff' : '#0f172a',
                        fontWeight: r === c ? 700 : 500,
                        border: isHovered ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      }}
                      onMouseEnter={() =>
                        setHoveredCell({
                          sym1: symRow,
                          sym2: symCol,
                          value: val,
                          matrixType,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {val.toFixed(2)}
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Quasi-Diagonalization Correlation Heatmap Matrix
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
              Block Clustering Proof
            </span>
          </h4>
          <p className="text-xs text-slate-500">
            Compare raw order against HRP reordered matrix: notice how collinear assets group into contiguous diagonal blocks
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-rose-600 font-semibold">-1.00</span>
          <div className="w-20 h-2.5 rounded bg-linear-to-r from-rose-500 via-slate-100 to-emerald-500 border border-slate-200" />
          <span className="text-emerald-600 font-semibold">+1.00</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Original Order */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">1. Original Unordered Matrix</span>
            <span className="text-[10px] text-slate-400 font-mono">Raw Universe Sequence</span>
          </div>
          {renderGrid(original, 'original')}
        </div>

        {/* Panel 2: Quasi-Diagonalized Order */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">2. Quasi-Diagonalized Clustered Matrix</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-semibold">
              HRP Reordered
            </span>
          </div>
          {renderGrid(quasi, 'quasi')}
        </div>
      </div>

      {/* Hover Info Callout */}
      {hoveredCell && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
          <div className="text-slate-700">
            Selected Pair:{' '}
            <span className="font-mono font-bold text-slate-900">
              {hoveredCell.sym1} &amp; {hoveredCell.sym2}
            </span>
            <span className="text-slate-400 ml-2">({hoveredCell.matrixType === 'quasi' ? 'HRP Order' : 'Raw Order'})</span>
          </div>
          <div className="font-mono font-bold text-slate-900">
            Correlation: <span className={hoveredCell.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{hoveredCell.value.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
