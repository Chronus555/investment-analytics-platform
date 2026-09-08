'use client';

import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface TlhGrowthChartProps {
  history: Array<{
    date: string;
    monthIndex: number;
    baselineValue: number;
    harvestedValue: number;
    cumulativeTaxSavings: number;
  }>;
  harvestDates?: string[];
  height?: number;
}

export const TlhGrowthChart: React.FC<TlhGrowthChartProps> = ({
  history,
  harvestDates = [],
  height = 320,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 font-mono">
        No TLH simulation history available
      </div>
    );
  }

  const svgWidth = 800;
  const svgHeight = height;
  const paddingX = 55;
  const paddingTop = 25;
  const paddingBottom = 35;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  // Min and max wealth values
  let minVal = Infinity;
  let maxVal = -Infinity;
  history.forEach((h) => {
    if (h.baselineValue < minVal) minVal = h.baselineValue;
    if (h.harvestedValue < minVal) minVal = h.harvestedValue;
    if (h.baselineValue > maxVal) maxVal = h.baselineValue;
    if (h.harvestedValue > maxVal) maxVal = h.harvestedValue;
  });

  const valRange = Math.max(1, maxVal - minVal);
  const n = history.length;

  const getX = (idx: number) => paddingX + (idx / (n - 1)) * usableWidth;
  const getY = (val: number) => paddingTop + (1 - (val - minVal) / valRange) * usableHeight;

  // Path 1: Baseline Taxable (No TLH)
  const baselinePath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.baselineValue).toFixed(1)}`)
    .join(' ');

  // Path 2: Harvested Portfolio (With TLH)
  const harvestedPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.harvestedValue).toFixed(1)}`)
    .join(' ');

  // Shaded Tax Alpha Wedge between Harvested and Baseline
  const wedgePath = [
    ...history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.harvestedValue).toFixed(1)}`),
    ...history
      .slice()
      .reverse()
      .map((h, i) => `L ${getX(n - 1 - i).toFixed(1)} ${getY(h.baselineValue).toFixed(1)}`),
    'Z',
  ].join(' ');

  const activePoint = hoverIndex !== null ? history[hoverIndex] : history[history.length - 1];
  const activeX = hoverIndex !== null ? getX(hoverIndex) : getX(history.length - 1);
  const netAlphaGain = activePoint ? activePoint.harvestedValue - activePoint.baselineValue : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs relative space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Tax-Loss Harvesting Compounded Wealth &amp; Tax Alpha Wedge
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-mono">
              Direct Indexing
            </span>
          </h4>
          <p className="text-xs text-slate-500">
            Compares after-tax wealth accumulation with continuous proxy harvesting vs standard unharvested taxable account
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-600 rounded" />
            <span className="text-slate-700 font-medium">TLH Harvested</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 border-b border-dashed border-slate-400" />
            <span className="text-slate-500">Baseline (No TLH)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-emerald-700">Tax Alpha Wedge</span>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            const clampedX = Math.max(paddingX, Math.min(svgWidth - paddingX, relX));
            const idx = Math.round(((clampedX - paddingX) / usableWidth) * (n - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="tlhWedgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
            const y = paddingTop + ratio * usableHeight;
            const val = maxVal - ratio * valRange;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="#94a3b8"
                  className="font-mono"
                >
                  ${Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Shaded Tax Alpha Wedge */}
          <path d={wedgePath} fill="url(#tlhWedgeGrad)" />

          {/* Baseline Taxable Line (Dashed Slate) */}
          <path
            d={baselinePath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.75}
            strokeDasharray="4 4"
          />

          {/* Harvested Portfolio Line (Emerald Solid) */}
          <path
            d={harvestedPath}
            fill="none"
            stroke="#059669"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Crosshair on Hover */}
          {activePoint && (
            <g>
              <line
                x1={activeX}
                y1={paddingTop}
                x2={activeX}
                y2={svgHeight - paddingBottom}
                stroke="#059669"
                strokeWidth={1.25}
                strokeDasharray="2 2"
              />
              <circle
                cx={activeX}
                cy={getY(activePoint.harvestedValue)}
                r={4.5}
                fill="#059669"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <circle
                cx={activeX}
                cy={getY(activePoint.baselineValue)}
                r={3.5}
                fill="#94a3b8"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </g>
          )}

          {/* X-axis Year Ticks */}
          {history
            .filter((_, i) => i % Math.max(1, Math.floor(n / 6)) === 0 || i === n - 1)
            .map((h, i) => {
              const x = getX(history.indexOf(h));
              return (
                <text
                  key={i}
                  x={x}
                  y={svgHeight - paddingBottom + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#64748b"
                  className="font-mono"
                >
                  {h.date.substring(0, 7)}
                </text>
              );
            })}
        </svg>

        {/* Active Inspection Tooltip */}
        {activePoint && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-mono mt-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-sans">Date:</span>
              <span className="font-bold text-slate-800">{activePoint.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-sans">Harvested:</span>
              <span className="font-bold text-emerald-700">${activePoint.harvestedValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-sans">Baseline:</span>
              <span className="font-bold text-slate-700">${activePoint.baselineValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-700 font-sans">Net Tax Alpha Gain:</span>
              <span className="font-bold text-indigo-700">
                {netAlphaGain >= 0 ? `+$${netAlphaGain.toLocaleString()}` : `-$${Math.abs(netAlphaGain).toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-sans">Taxes Saved:</span>
              <span className="font-bold text-slate-800">${activePoint.cumulativeTaxSavings.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
