'use client';

import React from 'react';
import { FanChartYearPoint } from '@/analytics/monteCarlo';

interface FanChartProps {
  data: FanChartYearPoint[];
  height?: number;
}

export function FanChart({ data, height = 340 }: FanChartProps) {
  if (!data || data.length === 0) return null;

  const len = data.length;
  const maxVal = Math.max(...data.map((d) => d.p95)) * 1.08;
  const minVal = 0;

  const padLeft = 70;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const width = 800;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (yearIdx: number) => {
    return padLeft + (yearIdx / Math.max(1, len - 1)) * plotW;
  };

  const getY = (val: number) => {
    const norm = (val - minVal) / (maxVal - minVal || 1);
    return padTop + (1 - norm) * plotH;
  };

  // Generate ribbon polygons between percentile pairs
  const makeRibbon = (upperKey: keyof FanChartYearPoint, lowerKey: keyof FanChartYearPoint) => {
    const forward = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d[upperKey] as number).toFixed(1)}`);
    const backward = [...data].reverse().map((d, i) => {
      const origIdx = len - 1 - i;
      return `${getX(origIdx).toFixed(1)},${getY(d[lowerKey] as number).toFixed(1)}`;
    });
    return `M ${forward.join(' L ')} L ${backward.join(' L ')} Z`;
  };

  // Median line
  const medianLine = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.p50).toFixed(1)}`)
    .join(' ');

  // Y-axis ticks
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Monte Carlo Wealth Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">Simulated portfolio wealth trajectory across percentiles (5th to 95th)</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded" />
            <span className="text-slate-600">5th – 95th</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-200 border border-blue-300 rounded" />
            <span className="text-slate-600">25th – 75th</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-600 rounded" />
            <span className="text-emerald-700 font-semibold">Median (50th)</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {/* Y Grid */}
          {yTicks.map((val, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={getY(val)}
                x2={width - padRight}
                y2={getY(val)}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x={padLeft - 8} y={getY(val) + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                ${Math.round(val).toLocaleString()}
              </text>
            </g>
          ))}

          {/* Ribbons */}
          {/* 5th - 95th */}
          <path d={makeRibbon('p95', 'p5')} fill="#3b82f6" fillOpacity="0.08" />
          {/* 10th - 90th */}
          <path d={makeRibbon('p90', 'p10')} fill="#3b82f6" fillOpacity="0.12" />
          {/* 25th - 75th */}
          <path d={makeRibbon('p75', 'p25')} fill="#3b82f6" fillOpacity="0.22" />

          {/* Median Line */}
          <path d={medianLine} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />

          {/* X Axis */}
          {data.filter((_, i) => i % 5 === 0 || i === len - 1).map((d) => (
            <g key={d.year}>
              <text
                x={getX(d.year)}
                y={height - 10}
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
                fontFamily="monospace"
              >
                Year {d.year}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
