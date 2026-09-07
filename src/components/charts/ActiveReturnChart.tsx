'use client';

import React, { useState, useMemo } from 'react';
import { ActivePoint } from '@/analytics/attribution';

interface ActiveReturnChartProps {
  data: ActivePoint[];
  managerLabel?: string;
  benchmarkLabel?: string;
  height?: number;
}

export function ActiveReturnChart({
  data,
  managerLabel = 'Manager',
  benchmarkLabel = 'Benchmark',
  height = 320,
}: ActiveReturnChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, minVal, maxVal, zeroY, svgPoints, zeroBaseline } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], minVal: 0, maxVal: 0, zeroY: 0, svgPoints: '', zeroBaseline: 0 };
    }

    const values = data.map((d) => d.activeExcessPercent);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max(Math.abs(rawMin), Math.abs(rawMax), 5) * 0.15;
    const minVal = Math.min(0, rawMin - pad);
    const maxVal = Math.max(0, rawMax + pad);
    const range = maxVal - minVal || 1;

    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 55 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const zeroY = padding.top + innerHeight * (1 - (0 - minVal) / range);

    const pts = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth;
      const y = padding.top + innerHeight * (1 - (d.activeExcessPercent - minVal) / range);
      return { x, y, data: d };
    });

    const svgPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return {
      points: pts,
      minVal,
      maxVal,
      zeroY,
      svgPoints,
      zeroBaseline: zeroY,
    };
  }, [data, height]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No active return data available
      </div>
    );
  }

  const activeHover = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="w-full relative select-none">
      {/* Chart Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
            <span className="font-semibold text-slate-900">{managerLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-slate-400" />
            <span className="text-slate-500">{benchmarkLabel} (0.0% Parity)</span>
          </div>
        </div>

        {activeHover ? (
          <div className="flex items-center gap-3 font-mono">
            <span className="text-slate-500">{activeHover.data.date}</span>
            <span
              className={`font-semibold ${
                activeHover.data.activeExcessPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              Excess: {activeHover.data.activeExcessPercent >= 0 ? '+' : ''}
              {activeHover.data.activeExcessPercent.toFixed(2)}%
            </span>
            <span className="text-slate-400 text-[11px]">
              (M: {(activeHover.data.managerReturn * 100).toFixed(1)}% vs B:{' '}
              {(activeHover.data.benchmarkReturn * 100).toFixed(1)}%)
            </span>
          </div>
        ) : (
          <div className="text-slate-400 font-mono text-[11px]">Hover curve to inspect</div>
        )}
      </div>

      {/* SVG Container */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 800 280"
          className="w-full h-auto"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="activeGradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="activeGradNeg" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1="55"
            y1={zeroBaseline}
            x2="775"
            y2={zeroBaseline}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Y Axis ticks */}
          {[-20, -10, 0, 10, 20, 30, 40, 60]
            .filter((val) => val >= minVal && val <= maxVal)
            .map((val) => {
              const y = 15 + (280 - 40) * (1 - (val - minVal) / (maxVal - minVal || 1));
              return (
                <g key={val}>
                  <line x1="55" y1={y} x2="775" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                  <text
                    x="48"
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748B"
                    fontFamily="monospace"
                  >
                    {val > 0 ? `+${val}%` : `${val}%`}
                  </text>
                </g>
              );
            })}

          {/* Zero reference label */}
          <text
            x="778"
            y={zeroBaseline + 3}
            textAnchor="start"
            fontSize="9"
            fill="#94A3B8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            0%
          </text>

          {/* Active Return Line */}
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgPoints}
            />
          )}

          {/* Hover Crosshair */}
          {activeHover && (
            <g>
              <line
                x1={activeHover.x}
                y1="15"
                x2={activeHover.x}
                y2="255"
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeHover.x}
                cy={activeHover.y}
                r="4.5"
                fill={activeHover.data.activeExcessPercent >= 0 ? '#2563EB' : '#E11D48'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Interactive Mouse Rectangles */}
          {points.map((pt, i) => {
            const stepW = 720 / (points.length || 1);
            return (
              <rect
                key={i}
                x={pt.x - stepW / 2}
                y="15"
                width={stepW}
                height="240"
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>
      </div>

      {/* X Axis Date labels */}
      <div className="flex justify-between pl-14 pr-6 text-[10px] text-slate-400 font-mono mt-1">
        <span>{data[0]?.date}</span>
        {data.length > 24 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
