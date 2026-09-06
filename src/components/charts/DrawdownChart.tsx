'use client';

import React, { useState, useMemo } from 'react';

export interface DrawdownSeriesPoint {
  date: string;
  drawdown: number; // Decimal: 0 to -1.0
}

export interface DrawdownChartSeries {
  id: string;
  name: string;
  color: string;
  data: DrawdownSeriesPoint[];
}

interface DrawdownChartProps {
  series: DrawdownChartSeries[];
  height?: number;
}

export function DrawdownChart({ series, height = 280 }: DrawdownChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { minDD, dates, len } = useMemo(() => {
    if (!series || series.length === 0 || !series[0].data.length) {
      return { minDD: -0.5, dates: [], len: 0 };
    }
    const dates = series[0].data.map((d) => d.date);
    let min = 0;
    series.forEach((s) => {
      s.data.forEach((pt) => {
        if (pt.drawdown < min) min = pt.drawdown;
      });
    });
    return { minDD: Math.min(-0.1, min * 1.1), dates, len: dates.length };
  }, [series]);

  if (len === 0) return null;

  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const width = 800;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getY = (dd: number) => {
    // 0 is at padTop, minDD is at padTop + plotH
    const norm = dd / minDD; // 0 at top, 1 at bottom
    return padTop + norm * plotH;
  };

  const getX = (index: number) => {
    return padLeft + (index / Math.max(1, len - 1)) * plotW;
  };

  const makeAreaPath = (data: DrawdownSeriesPoint[]) => {
    if (data.length === 0) return '';
    const points = data.map((pt, i) => `${getX(i).toFixed(1)},${getY(pt.drawdown).toFixed(1)}`).join(' ');
    return `M ${getX(0)},${getY(0)} L ${points} L ${getX(data.length - 1)},${getY(0)} Z`;
  };

  const makeLinePath = (data: DrawdownSeriesPoint[]) => {
    if (data.length === 0) return '';
    return data
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.drawdown).toFixed(1)}`)
      .join(' ');
  };

  // Ticks
  const yTicks = [0, minDD * 0.25, minDD * 0.5, minDD * 0.75, minDD];

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white tracking-wide">Underwater Drawdowns</h3>
          <p className="text-xs text-slate-400">Historical peak-to-trough decline over time</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
        {series.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-300 font-medium">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            if (relX >= padLeft && relX <= width - padRight) {
              const idx = Math.round(((relX - padLeft) / plotW) * (len - 1));
              setHoverIndex(Math.max(0, Math.min(len - 1, idx)));
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Zero line */}
          <line
            x1={padLeft}
            y1={getY(0)}
            x2={width - padRight}
            y2={getY(0)}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Grid lines */}
          {yTicks.map((val, i) => {
            const y = getY(val);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {(val * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Areas & Lines */}
          {series.map((s) => (
            <g key={s.id}>
              <path d={makeAreaPath(s.data)} fill={s.color} fillOpacity="0.15" />
              <path
                d={makeLinePath(s.data)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Crosshair */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={height - padBottom}
              stroke="#94a3b8"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Hover details */}
        {hoverIndex !== null && (
          <div
            className="absolute top-4 bg-slate-950/95 border border-slate-700/80 rounded-lg p-2.5 shadow-2xl text-xs z-20 pointer-events-none"
            style={{
              left: `${Math.min(75, Math.max(15, (getX(hoverIndex) / width) * 100))}%`,
            }}
          >
            <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 font-mono">
              {dates[hoverIndex]}
            </div>
            <div className="space-y-1">
              {series.map((s) => {
                const pt = s.data[hoverIndex];
                if (!pt) return null;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}:
                    </span>
                    <span
                      className={`font-mono font-semibold ${
                        pt.drawdown < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {(pt.drawdown * 100).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
