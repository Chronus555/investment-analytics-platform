'use client';

import React, { useState, useMemo } from 'react';
import { RollingActivePoint } from '@/analytics/attribution';

interface RollingAlphaBetaChartProps {
  data: RollingActivePoint[];
  windowMonths?: number;
  height?: number;
}

export function RollingAlphaBetaChart({
  data,
  windowMonths = 24,
  height = 300,
}: RollingAlphaBetaChartProps) {
  const [metric, setMetric] = useState<'alpha' | 'beta' | 'ir'>('alpha');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, minVal, maxVal, zeroY, svgPoints } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], minVal: 0, maxVal: 0, zeroY: 0, svgPoints: '' };
    }

    const values = data.map((d) =>
      metric === 'alpha' ? d.alpha : metric === 'beta' ? d.beta : d.informationRatio
    );
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const baseline = metric === 'beta' ? 1.0 : 0.0;

    const pad = Math.max(Math.abs(rawMax - baseline), Math.abs(rawMin - baseline), 0.5) * 0.2;
    const minVal = Math.min(baseline - 0.2, rawMin - pad);
    const maxVal = Math.max(baseline + 0.2, rawMax + pad);
    const range = maxVal - minVal || 1;

    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const zeroY = padding.top + innerHeight * (1 - (baseline - minVal) / range);

    const pts = data.map((d, i) => {
      const val = metric === 'alpha' ? d.alpha : metric === 'beta' ? d.beta : d.informationRatio;
      const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth;
      const y = padding.top + innerHeight * (1 - (val - minVal) / range);
      return { x, y, val, data: d };
    });

    const svgPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    return { points: pts, minVal, maxVal, zeroY, svgPoints };
  }, [data, metric, height]);

  if (!data || data.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
        Insufficient historical depth for {windowMonths}-month rolling window
      </div>
    );
  }

  const activeHover = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="w-full relative select-none">
      {/* Metric Selector & Tooltip Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setMetric('alpha')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              metric === 'alpha'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rolling Alpha (Ann %)
          </button>
          <button
            type="button"
            onClick={() => setMetric('beta')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              metric === 'beta'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rolling Beta
          </button>
          <button
            type="button"
            onClick={() => setMetric('ir')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              metric === 'ir'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Information Ratio
          </button>
        </div>

        {activeHover ? (
          <div className="text-xs font-mono">
            <span className="text-slate-500 mr-2">{activeHover.data.date}</span>
            <span className="font-bold text-blue-700">
              {metric === 'alpha'
                ? `Alpha: ${activeHover.val > 0 ? '+' : ''}${activeHover.val.toFixed(2)}%`
                : metric === 'beta'
                ? `Beta: ${activeHover.val.toFixed(2)}`
                : `IR: ${activeHover.val.toFixed(2)}`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-mono">{windowMonths}M Rolling Window</span>
        )}
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 800 260"
          className="w-full h-auto"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Reference Line */}
          <line
            x1="50"
            y1={zeroY}
            x2="775"
            y2={zeroY}
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x="778"
            y={zeroY + 3}
            textAnchor="start"
            fontSize="9"
            fill="#94A3B8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {metric === 'beta' ? '1.0' : '0.0'}
          </text>

          {/* Line Path */}
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

          {/* Hover indicator */}
          {activeHover && (
            <g>
              <line
                x1={activeHover.x}
                y1="15"
                x2={activeHover.x}
                y2="235"
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeHover.x}
                cy={activeHover.y}
                r="4.5"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Mouse tracking */}
          {points.map((pt, i) => {
            const stepW = 725 / (points.length || 1);
            return (
              <rect
                key={i}
                x={pt.x - stepW / 2}
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

      <div className="flex justify-between pl-12 pr-6 text-[10px] text-slate-400 font-mono mt-1">
        <span>{data[0]?.date}</span>
        {data.length > 24 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
