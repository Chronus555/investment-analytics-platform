'use client';

import React from 'react';

export interface AnnualBarSeries {
  id: string;
  name: string;
  color: string;
  returns: { year: number; return: number }[];
}

interface AnnualReturnsBarProps {
  series: AnnualBarSeries[];
  height?: number;
}

export function AnnualReturnsBar({ series, height = 300 }: AnnualReturnsBarProps) {
  if (!series || series.length === 0 || !series[0].returns.length) return null;

  // Extract all unique years sorted
  const years = Array.from(
    new Set(series.flatMap((s) => s.returns.map((r) => r.year)))
  ).sort((a, b) => a - b);

  // Find min and max return
  let minRet = -0.1;
  let maxRet = 0.1;
  series.forEach((s) => {
    s.returns.forEach((r) => {
      if (r.return < minRet) minRet = r.return;
      if (r.return > maxRet) maxRet = r.return;
    });
  });

  const padLeft = 50;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const width = 800;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const range = maxRet - minRet;
  const getY = (val: number) => {
    const norm = (val - minRet) / (range || 1);
    return padTop + plotH * (1 - norm);
  };

  const zeroY = getY(0);

  const groupWidth = plotW / years.length;
  const numSeries = series.length;
  const barWidth = Math.max(2, (groupWidth * 0.75) / numSeries);

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Annual Returns</h3>
          <p className="text-xs text-slate-500 mt-0.5">Calendar year comparison across portfolios</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
        {series.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-700 font-medium">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none min-w-[600px]">
          {/* Zero reference line */}
          <line
            x1={padLeft}
            y1={zeroY}
            x2={width - padRight}
            y2={zeroY}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Grid lines */}
          {[minRet, minRet / 2, 0, maxRet / 2, maxRet].map((val, i) => {
            const y = getY(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {(val * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {years.map((year, groupIdx) => {
            const groupX = padLeft + groupIdx * groupWidth;

            return (
              <g key={year}>
                {series.map((s, seriesIdx) => {
                  const item = s.returns.find((r) => r.year === year);
                  if (!item) return null;
                  const val = item.return;
                  const barX = groupX + (groupWidth - numSeries * barWidth) / 2 + seriesIdx * barWidth;
                  const y = getY(val);
                  const h = Math.abs(y - zeroY);
                  const top = val >= 0 ? y : zeroY;

                  return (
                    <rect
                      key={s.id}
                      x={barX}
                      y={top}
                      width={barWidth - 1}
                      height={Math.max(1, h)}
                      fill={s.color}
                      opacity={0.9}
                      rx="1"
                    />
                  );
                })}

                {/* Year label */}
                <text
                  x={groupX + groupWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {year.toString().slice(-2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
