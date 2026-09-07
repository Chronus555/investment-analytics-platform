'use client';

import React, { useState, useMemo } from 'react';
import { DynamicPeriodResult } from '@/analytics/dynamicAllocation';

interface GlidePathWeightsChartProps {
  periods: DynamicPeriodResult[];
  height?: number;
}

const ASSET_COLORS: Record<string, string> = {
  SPY: '#2563EB', // Blue
  QQQ: '#0284C7', // Sky
  VTI: '#4F46E5', // Indigo
  EFA: '#7C3AED', // Violet
  BND: '#059669', // Emerald
  TLT: '#10B981', // Green
  TIP: '#14B8A6', // Teal
  GLD: '#D97706', // Amber
  VNQ: '#EA580C', // Orange
  SHV: '#64748B', // Slate
  BIL: '#94A3B8', // Gray
};

export function GlidePathWeightsChart({
  periods,
  height = 300,
}: GlidePathWeightsChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Extract all unique symbols across periods
  const symbols = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    const symSet = new Set<string>();
    for (const p of periods) {
      for (const s of Object.keys(p.weights)) {
        if (p.weights[s] > 0.001) symSet.add(s);
      }
    }
    return Array.from(symSet);
  }, [periods]);

  // Compute stacked area paths
  const { paths, width, innerHeight, padding } = useMemo(() => {
    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 45 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    if (!periods || periods.length < 2 || symbols.length === 0) {
      return { paths: [], width, innerHeight, padding };
    }

    // Stacked cumulative weights per period
    // stackLevels[symIndex][periodIndex] = { y0, y1 } where y in [0, 1]
    const stackData: { symbol: string; color: string; pathD: string }[] = [];
    const n = periods.length;

    // cumulative baseline per period
    const curBase = new Array(n).fill(0);

    for (let sIdx = 0; sIdx < symbols.length; sIdx++) {
      const sym = symbols[sIdx];
      const color = ASSET_COLORS[sym] || '#64748B';

      const topCoords: { x: number; y: number }[] = [];
      const bottomCoords: { x: number; y: number }[] = [];

      for (let i = 0; i < n; i++) {
        const x = padding.left + (i / (n - 1)) * innerWidth;
        const w = periods[i].weights[sym] || 0;
        const y0 = curBase[i];
        const y1 = Math.min(1.0, y0 + w);
        curBase[i] = y1;

        const screenY0 = padding.top + innerHeight * (1 - y0);
        const screenY1 = padding.top + innerHeight * (1 - y1);

        topCoords.push({ x, y: screenY1 });
        bottomCoords.push({ x, y: screenY0 });
      }

      // Build closed SVG path: topCoords forward, bottomCoords backward
      let pathD = `M ${topCoords[0].x.toFixed(1)} ${topCoords[0].y.toFixed(1)}`;
      for (let i = 1; i < topCoords.length; i++) {
        pathD += ` L ${topCoords[i].x.toFixed(1)} ${topCoords[i].y.toFixed(1)}`;
      }
      for (let i = bottomCoords.length - 1; i >= 0; i--) {
        pathD += ` L ${bottomCoords[i].x.toFixed(1)} ${bottomCoords[i].y.toFixed(1)}`;
      }
      pathD += ' Z';

      stackData.push({ symbol: sym, color, pathD });
    }

    return { paths: stackData, width, innerHeight, padding };
  }, [periods, symbols, height]);

  if (!periods || periods.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
        No allocation data available
      </div>
    );
  }

  const activePeriod = hoverIndex !== null && periods[hoverIndex] ? periods[hoverIndex] : null;

  return (
    <div className="w-full relative select-none">
      {/* Legend & Hover Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {symbols.map((sym) => (
            <div key={sym} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: ASSET_COLORS[sym] || '#64748B' }}
              />
              <span className="font-semibold text-slate-700">{sym}</span>
            </div>
          ))}
        </div>

        {activePeriod ? (
          <div className="font-mono text-xs text-slate-600 flex items-center gap-2">
            <span className="font-bold text-slate-900">{activePeriod.date}:</span>
            {symbols.map((s) => {
              const w = (activePeriod.weights[s] || 0) * 100;
              if (w < 0.5) return null;
              return (
                <span key={s} className="font-medium">
                  {s}: {w.toFixed(1)}%
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-mono">
            Hover timeline to inspect allocation weights
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 800 260"
          className="w-full h-auto"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Axis Grid lines: 0%, 25%, 50%, 75%, 100% */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((pct) => {
            const y = 15 + (260 - 40) * (1 - pct);
            return (
              <g key={pct}>
                <line x1="45" y1={y} x2="775" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text
                  x="40"
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748B"
                  fontFamily="monospace"
                >
                  {Math.round(pct * 100)}%
                </text>
              </g>
            );
          })}

          {/* Stacked Areas */}
          {paths.map((p) => (
            <path
              key={p.symbol}
              d={p.pathD}
              fill={p.color}
              opacity={0.88}
              stroke="#FFFFFF"
              strokeWidth="0.5"
            />
          ))}

          {/* Hover line */}
          {hoverIndex !== null && (
            <line
              x1={45 + (hoverIndex / (periods.length - 1 || 1)) * (800 - 45 - 25)}
              y1="15"
              x2={45 + (hoverIndex / (periods.length - 1 || 1)) * (800 - 45 - 25)}
              y2="235"
              stroke="#0F172A"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Hover triggers */}
          {periods.map((_, i) => {
            const stepW = 730 / (periods.length || 1);
            const x = 45 + (i / (periods.length - 1 || 1)) * (800 - 45 - 25);
            return (
              <rect
                key={i}
                x={x - stepW / 2}
                y="15"
                width={stepW}
                height="220"
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>
      </div>

      {/* Date timeline labels */}
      <div className="flex justify-between pl-12 pr-6 text-[10px] text-slate-400 font-mono mt-1">
        <span>{periods[0]?.date}</span>
        {periods.length > 24 && <span>{periods[Math.floor(periods.length / 2)]?.date}</span>}
        <span>{periods[periods.length - 1]?.date}</span>
      </div>
    </div>
  );
}
