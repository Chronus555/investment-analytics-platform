'use client';

import React, { useState, useRef } from 'react';
import { RollingFactorPoint } from '@/analytics/factors';

interface RollingFactorChartProps {
  data: RollingFactorPoint[];
  factorNames: string[];
  windowMonths: number;
  height?: number;
}

const FACTOR_COLORS: Record<string, string> = {
  'MKT-RF': '#2563eb', // blue-600
  'SMB (Size)': '#10b981', // emerald-500
  'HML (Value)': '#d97706', // amber-600
  'MOM (Momentum)': '#8b5cf6', // purple-500
  'SMB': '#10b981',
  'HML': '#d97706',
  'MOM': '#8b5cf6',
  'Alpha (Ann %)': '#ec4899', // pink-500
};

export const RollingFactorChart: React.FC<RollingFactorChartProps> = ({
  data,
  factorNames,
  windowMonths,
  height = 320,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      'Alpha (Ann %)': true,
    };
    factorNames.forEach((fn) => {
      initial[fn] = true;
    });
    return initial;
  });

  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        Insufficient historical periods for {windowMonths}-month rolling regression.
      </div>
    );
  }

  const toggleSeries = (name: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const width = 850;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Collect all active values to determine Y scale
  const allActiveValues: number[] = [0]; // always include 0 baseline
  data.forEach((pt) => {
    factorNames.forEach((fn) => {
      if (visibleSeries[fn] && pt.betas[fn] !== undefined) {
        allActiveValues.push(pt.betas[fn]);
      }
    });
    if (visibleSeries['Alpha (Ann %)']) {
      allActiveValues.push(pt.annualizedAlpha * 100); // in percent
    }
  });

  const rawMin = Math.min(...allActiveValues);
  const rawMax = Math.max(...allActiveValues);
  const yPadding = (rawMax - rawMin) * 0.12 || 0.2;
  const minVal = rawMin - yPadding;
  const maxVal = rawMax + yPadding;
  const valRange = maxVal - minVal || 1;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - ((val - minVal) / valRange) * innerHeight;

  const yZero = getY(0);

  const activeIndex = hoverIndex !== null ? hoverIndex : data.length - 1;
  const activePt = data[activeIndex];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) * width;
    const clampedX = Math.max(padding.left, Math.min(width - padding.right, relX));
    const idx = Math.round(((clampedX - padding.left) / innerWidth) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // 5 Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((pct) => minVal + pct * valRange);

  // 6 X-axis tick indices
  const xTickIndices = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((pct) =>
    Math.min(data.length - 1, Math.round(pct * (data.length - 1)))
  );

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {windowMonths}-Month Rolling Factor Loadings &amp; Alpha
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
              {data.length} Rolling Windows
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Hover over time-series to inspect historical factor exposure drift and alpha stability
          </p>
        </div>

        {/* Series Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          {factorNames.map((fn) => {
            const isVisible = visibleSeries[fn];
            const color = FACTOR_COLORS[fn] || '#64748b';
            return (
              <button
                key={fn}
                onClick={() => toggleSeries(fn)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                  isVisible
                    ? 'bg-slate-50 text-slate-900 border-slate-300 shadow-2xs font-semibold'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600 line-through'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: isVisible ? color : '#cbd5e1' }}
                />
                {fn}
              </button>
            );
          })}
          <button
            onClick={() => toggleSeries('Alpha (Ann %)')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-all cursor-pointer ${
              visibleSeries['Alpha (Ann %)']
                ? 'bg-slate-50 text-slate-900 border-slate-300 shadow-2xs font-semibold'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600 line-through'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{
                backgroundColor: visibleSeries['Alpha (Ann %)']
                  ? FACTOR_COLORS['Alpha (Ann %)']
                  : '#cbd5e1',
              }}
            />
            Alpha (Ann %)
          </button>
        </div>
      </div>

      {/* Active Inspector Banner */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50/80 rounded-lg px-3 py-2 text-xs font-mono border border-slate-100">
        <div>
          <span className="text-slate-400 text-[11px]">Period: </span>
          <span className="font-semibold text-slate-800">{activePt.date}</span>
        </div>

        {factorNames.map((fn) => {
          if (!visibleSeries[fn] || activePt.betas[fn] === undefined) return null;
          const val = activePt.betas[fn];
          const color = FACTOR_COLORS[fn] || '#64748b';
          return (
            <div key={fn} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-slate-500">{fn}:</span>
              <span className="font-bold text-slate-900">
                {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
              </span>
            </div>
          );
        })}

        {visibleSeries['Alpha (Ann %)'] && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FACTOR_COLORS['Alpha (Ann %)'] }} />
            <span className="text-slate-500">Alpha:</span>
            <span
              className={`font-bold ${
                activePt.annualizedAlpha >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {(activePt.annualizedAlpha * 100) >= 0 ? '+' : ''}
              {(activePt.annualizedAlpha * 100).toFixed(2)}%
            </span>
          </div>
        )}

        <div className="ml-auto text-slate-400 text-[11px]">
          R²: <strong className="text-slate-700">{(activePt.rSquared * 100).toFixed(1)}%</strong>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Zero Baseline */}
          {minVal <= 0 && maxVal >= 0 && (
            <g>
              <line
                x1={padding.left}
                y1={yZero}
                x2={width - padding.right}
                y2={yZero}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text
                x={width - padding.right + 6}
                y={yZero + 3}
                fontSize="9"
                fill="#64748b"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              >
                0.0
              </text>
            </g>
          )}

          {/* X-Axis Ticks & Dates */}
          {xTickIndices.map((idx) => {
            const x = getX(idx);
            const date = data[idx].date;
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padding.top + innerHeight}
                  x2={x}
                  y2={padding.top + innerHeight + 4}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  {date}
                </text>
              </g>
            );
          })}

          {/* Factor Lines */}
          {factorNames.map((fn) => {
            if (!visibleSeries[fn]) return null;
            const points = data
              .map((pt, i) => {
                const val = pt.betas[fn];
                return val !== undefined ? `${getX(i)},${getY(val)}` : null;
              })
              .filter(Boolean)
              .join(' ');

            const color = FACTOR_COLORS[fn] || '#64748b';

            return (
              <polyline
                key={fn}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Alpha Line */}
          {visibleSeries['Alpha (Ann %)'] && (
            <polyline
              points={data
                .map((pt, i) => `${getX(i)},${getY(pt.annualizedAlpha * 100)}`)
                .join(' ')}
              fill="none"
              stroke={FACTOR_COLORS['Alpha (Ann %)']}
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Highlight points on active lines */}
              {factorNames.map((fn) => {
                if (!visibleSeries[fn] || activePt.betas[fn] === undefined) return null;
                const val = activePt.betas[fn];
                const color = FACTOR_COLORS[fn] || '#64748b';
                return (
                  <circle
                    key={fn}
                    cx={getX(hoverIndex)}
                    cy={getY(val)}
                    r="4"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
              })}
              {visibleSeries['Alpha (Ann %)'] && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(activePt.annualizedAlpha * 100)}
                  r="4"
                  fill={FACTOR_COLORS['Alpha (Ann %)']}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
