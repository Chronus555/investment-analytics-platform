'use client';

import React, { useState, useMemo } from 'react';
import { OutOfSampleMonthPoint } from '@/analytics/walkForwardOptimization';
import { formatPercent } from '@/utils/formatters';

interface WalkForwardWeightsChartProps {
  series: OutOfSampleMonthPoint[];
  height?: number;
}

const ASSET_COLORS: Record<string, string> = {
  SPY: '#2563EB', // Blue
  QQQ: '#0284C7', // Sky
  VTI: '#4F46E5', // Indigo
  BND: '#059669', // Emerald
  AGG: '#10B981', // Green
  TLT: '#14B8A6', // Teal
  GLD: '#D97706', // Amber
  VNQ: '#EA580C', // Orange
  VXUS: '#7C3AED', // Violet
  EFA: '#8B5CF6', // Purple
  EEM: '#EC4899', // Pink
  BIL: '#64748B', // Slate
  IWM: '#0D9488', // Dark Teal
  AVUV: '#F59E0B', // Light Amber
  TQQQ: '#DC2626', // Red
  UPRO: '#E11D48', // Rose
};

export function WalkForwardWeightsChart({
  series,
  height = 320,
}: WalkForwardWeightsChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Extract all unique symbols present in the series
  const symbols = useMemo(() => {
    if (!series || series.length === 0) return [];
    const symSet = new Set<string>();
    for (const p of series) {
      for (const s of Object.keys(p.weights)) {
        if (p.weights[s] > 0.001) symSet.add(s);
      }
    }
    return Array.from(symSet);
  }, [series]);

  // Compute stacked area paths
  const { paths, width, innerHeight, padding } = useMemo(() => {
    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    if (!series || series.length < 2 || symbols.length === 0) {
      return { paths: [], width, innerHeight, padding };
    }

    const n = series.length;
    const curBase = new Array(n).fill(0);
    const stackData: { symbol: string; color: string; pathD: string }[] = [];

    for (let sIdx = 0; sIdx < symbols.length; sIdx++) {
      const sym = symbols[sIdx];
      const color = ASSET_COLORS[sym] || '#64748B';

      const topCoords: { x: number; y: number }[] = [];
      const bottomCoords: { x: number; y: number }[] = [];

      for (let i = 0; i < n; i++) {
        const x = padding.left + (i / (n - 1)) * innerWidth;
        const w = series[i].weights[sym] || 0;
        const y0 = curBase[i];
        const y1 = Math.min(1.0, y0 + w);
        curBase[i] = y1;

        const screenY0 = padding.top + innerHeight * (1 - y0);
        const screenY1 = padding.top + innerHeight * (1 - y1);

        topCoords.push({ x, y: screenY1 });
        bottomCoords.push({ x, y: screenY0 });
      }

      let d = `M ${topCoords[0].x.toFixed(1)} ${topCoords[0].y.toFixed(1)}`;
      for (let i = 1; i < topCoords.length; i++) {
        d += ` L ${topCoords[i].x.toFixed(1)} ${topCoords[i].y.toFixed(1)}`;
      }
      for (let i = bottomCoords.length - 1; i >= 0; i--) {
        d += ` L ${bottomCoords[i].x.toFixed(1)} ${bottomCoords[i].y.toFixed(1)}`;
      }
      d += ' Z';

      stackData.push({ symbol: sym, color, pathD: d });
    }

    return { paths: stackData, width, innerHeight, padding };
  }, [series, symbols, height]);

  const activeIdx = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < series.length ? hoverIndex : null;
  const activePoint = activeIdx !== null ? series[activeIdx] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {symbols.map((sym) => (
          <div key={sym} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs"
              style={{ backgroundColor: ASSET_COLORS[sym] || '#64748B' }}
            />
            <span className="font-mono text-slate-700 font-medium">{sym}</span>
          </div>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
        <svg
          viewBox={`0 0 ${width} ${height - 40}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const innerW = width - padding.left - padding.right;
            const frac = Math.max(0, Math.min(1, (mouseX - padding.left) / innerW));
            const idx = Math.round(frac * (series.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Axis percentage gridlines (0%, 25%, 50%, 75%, 100%) */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
            const y = padding.top + innerHeight * (1 - pct);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
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

          {/* X Axis Time Labels */}
          {(() => {
            const step = Math.max(1, Math.floor(series.length / 7));
            const innerW = width - padding.left - padding.right;
            return (
              <g>
                {series.map((pt, i) => {
                  if (i % step !== 0 && i !== series.length - 1) return null;
                  const x = padding.left + (i / (series.length - 1)) * innerW;
                  return (
                    <g key={i}>
                      <line
                        x1={x}
                        y1={padding.top + innerHeight}
                        x2={x}
                        y2={padding.top + innerHeight + 4}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={padding.top + innerHeight + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        {pt.date.substring(0, 7)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Active Crosshair */}
          {activePoint && (
            <g>
              {(() => {
                const innerW = width - padding.left - padding.right;
                const x = padding.left + (activeIdx! / (series.length - 1)) * innerW;
                return (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + innerHeight}
                    stroke="#0F172A"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  />
                );
              })()}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Box */}
        {activePoint && (
          <div
            className="pointer-events-none absolute top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs z-10"
            style={{
              left:
                activeIdx! > series.length / 2
                  ? Math.max(8, (activeIdx! / series.length) * 100 - 32) + '%'
                  : Math.min(70, (activeIdx! / series.length) * 100 + 2) + '%',
            }}
          >
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1 font-mono">
              {activePoint.date} (Rebalanced Allocation)
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
              {symbols.map((sym) => {
                const w = activePoint.weights[sym] || 0;
                if (w < 0.005) return null;
                return (
                  <React.Fragment key={sym}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-xs"
                        style={{ backgroundColor: ASSET_COLORS[sym] || '#64748B' }}
                      />
                      <span className="text-slate-600 font-medium">{sym}:</span>
                    </span>
                    <span className="font-semibold text-slate-900 text-right">
                      {formatPercent(w, 1)}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
