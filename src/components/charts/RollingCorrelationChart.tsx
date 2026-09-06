'use client';

import React, { useState } from 'react';
import { RollingCorrelationPoint } from '@/analytics/statistics';
import { formatPercent } from '@/utils/formatters';

interface RollingCorrelationChartProps {
  series: RollingCorrelationPoint[];
  assetA: string;
  assetB: string;
  windowMonths: number;
}

export const RollingCorrelationChart: React.FC<RollingCorrelationChartProps> = ({
  series,
  assetA,
  assetB,
  windowMonths,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!series || series.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-slate-400 text-xs font-mono">
        Insufficient historical data for a {windowMonths}-month rolling correlation window.
      </div>
    );
  }

  const width = 720;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Correlation is bounded by [-1.0, 1.0]
  const minVal = -1.0;
  const maxVal = 1.0;
  const range = 2.0;

  const getX = (idx: number) => padding.left + (idx / Math.max(1, series.length - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;
  const zeroY = getY(0);

  // Generate path string
  let pathD = '';
  series.forEach((pt, i) => {
    const x = getX(i);
    const y = getY(pt.correlation);
    if (i === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Area path above 0
  let positiveAreaD = `M ${getX(0)} ${zeroY}`;
  series.forEach((pt, i) => {
    const x = getX(i);
    const y = Math.min(zeroY, getY(pt.correlation));
    positiveAreaD += ` L ${x} ${y}`;
  });
  positiveAreaD += ` L ${getX(series.length - 1)} ${zeroY} Z`;

  // Area path below 0
  let negativeAreaD = `M ${getX(0)} ${zeroY}`;
  series.forEach((pt, i) => {
    const x = getX(i);
    const y = Math.max(zeroY, getY(pt.correlation));
    negativeAreaD += ` L ${x} ${y}`;
  });
  negativeAreaD += ` L ${getX(series.length - 1)} ${zeroY} Z`;

  const hoveredPoint = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < series.length ? series[hoverIdx] : null;

  return (
    <div className="w-full space-y-2">
      {/* Header & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between text-xs border-b border-slate-100 pb-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">
            {assetA} vs {assetB}
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            {windowMonths}-Month Rolling Window
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500/20 border border-blue-500" />
            <span className="text-slate-600">Positive Co-movement</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/20 border border-emerald-500" />
            <span className="text-slate-600">Diversification Benefit (&lt; 0)</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            if (relX >= padding.left && relX <= width - padding.right) {
              const frac = (relX - padding.left) / chartW;
              const idx = Math.min(series.length - 1, Math.max(0, Math.round(frac * (series.length - 1))));
              setHoverIdx(idx);
            }
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[-1.0, -0.5, 0.0, 0.5, 1.0].map((val) => {
            const y = getY(val);
            const isZero = Math.abs(val) < 0.01;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isZero ? '#94a3b8' : '#f1f5f9'}
                  strokeWidth={isZero ? 1.25 : 1}
                  strokeDasharray={isZero ? '4 3' : undefined}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Positive & Negative Area Fills */}
          <path d={positiveAreaD} fill="url(#posGrad)" />
          <path d={negativeAreaD} fill="url(#negGrad)" />

          {/* Main Correlation Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Date labels on X axis */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
            const sIdx = Math.min(series.length - 1, Math.round(frac * (series.length - 1)));
            const pt = series[sIdx];
            if (!pt) return null;
            const x = getX(sIdx);
            return (
              <text
                key={idx}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[10px]"
              >
                {pt.date.slice(0, 7)}
              </text>
            );
          })}

          {/* Interactive Crosshair & Tooltip */}
          {hoverIdx !== null && hoveredPoint && (
            <g>
              <line
                x1={getX(hoverIdx)}
                y1={padding.top}
                x2={getX(hoverIdx)}
                y2={padding.top + chartH}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIdx)}
                cy={getY(hoveredPoint.correlation)}
                r="4.5"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoverIdx !== null && hoveredPoint && (
          <div
            className="absolute top-3 right-5 pointer-events-none bg-slate-900/90 text-white px-2.5 py-1.5 rounded-md shadow-md text-xs font-mono flex items-center gap-3 backdrop-blur-xs"
          >
            <span className="text-slate-300">{hoveredPoint.date.slice(0, 7)}</span>
            <span className="font-semibold text-blue-300">
              ρ = {hoveredPoint.correlation >= 0 ? '+' : ''}
              {hoveredPoint.correlation.toFixed(3)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
