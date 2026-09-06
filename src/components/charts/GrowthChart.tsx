'use client';

import React, { useState, useMemo } from 'react';

export interface GrowthSeriesPoint {
  date: string;
  value: number;
}

export interface GrowthChartSeries {
  id: string;
  name: string;
  color: string;
  data: GrowthSeriesPoint[];
}

interface GrowthChartProps {
  series: GrowthChartSeries[];
  height?: number;
}

export function GrowthChart({ series, height = 360 }: GrowthChartProps) {
  const [isLog, setIsLog] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { minVal, maxVal, dates, len } = useMemo(() => {
    if (!series || series.length === 0 || !series[0].data.length) {
      return { minVal: 10000, maxVal: 10000, dates: [], len: 0 };
    }
    const dates = series[0].data.map((d) => d.date);
    let min = Infinity;
    let max = -Infinity;

    series.forEach((s) => {
      s.data.forEach((pt) => {
        if (pt.value < min) min = pt.value;
        if (pt.value > max) max = pt.value;
      });
    });

    if (min === Infinity) min = 1000;
    if (max === -Infinity) max = 50000;

    return { minVal: Math.max(1, min), maxVal: max * 1.05, dates, len: dates.length };
  }, [series]);

  if (len === 0) {
    return <div className="p-8 text-center text-slate-500">No chart data available</div>;
  }

  // Coordinate mapping
  const padLeft = 70;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const width = 800; // viewBox width

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getY = (val: number) => {
    if (isLog) {
      const logMin = Math.log10(Math.max(1, minVal));
      const logMax = Math.log10(Math.max(10, maxVal));
      const logVal = Math.log10(Math.max(1, val));
      const norm = (logVal - logMin) / (logMax - logMin);
      return padTop + plotH * (1 - norm);
    } else {
      const norm = (val - minVal) / (maxVal - minVal);
      return padTop + plotH * (1 - norm);
    }
  };

  const getX = (index: number) => {
    return padLeft + (index / Math.max(1, len - 1)) * plotW;
  };

  // Generate SVG Path
  const makePath = (data: GrowthSeriesPoint[]) => {
    if (data.length === 0) return '';
    return data
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.value).toFixed(1)}`)
      .join(' ');
  };

  // Y-axis grid ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (isLog) {
        const logMin = Math.log10(Math.max(1, minVal));
        const logMax = Math.log10(Math.max(10, maxVal));
        const val = Math.pow(10, logMin + (i / (count - 1)) * (logMax - logMin));
        ticks.push(val);
      } else {
        ticks.push(minVal + (i / (count - 1)) * (maxVal - minVal));
      }
    }
    return ticks;
  }, [minVal, maxVal, isLog]);

  // X-axis sample labels (every ~3 years)
  const xLabels = useMemo(() => {
    const labels: { index: number; text: string }[] = [];
    const step = Math.max(1, Math.floor(len / 6));
    for (let i = 0; i < len; i += step) {
      labels.push({ index: i, text: dates[i].substring(0, 7) });
    }
    if (labels[labels.length - 1]?.index !== len - 1) {
      labels.push({ index: len - 1, text: dates[len - 1].substring(0, 7) });
    }
    return labels;
  }, [dates, len]);

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white tracking-wide">Portfolio Growth</h3>
          <p className="text-xs text-slate-400">Growth of an initial investment of $10,000</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setIsLog(false)}
            className={`px-3 py-1 rounded transition-all font-medium ${
              !isLog ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Linear
          </button>
          <button
            type="button"
            onClick={() => setIsLog(true)}
            className={`px-3 py-1 rounded transition-all font-medium ${
              isLog ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Logarithmic
          </button>
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

      {/* SVG Container */}
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
          {/* Horizontal Grid lines */}
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
                  ${Math.round(val).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {xLabels.map((lbl, i) => (
            <text
              key={i}
              x={getX(lbl.index)}
              y={height - 8}
              textAnchor="middle"
              fill="#64748b"
              fontSize="11"
              fontFamily="monospace"
            >
              {lbl.text}
            </text>
          ))}

          {/* Paths */}
          {series.map((s) => (
            <path
              key={s.id}
              d={makePath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Crosshair & Hover Tooltip */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={height - padBottom}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {series.map((s) => {
                const pt = s.data[hoverIndex];
                if (!pt) return null;
                return (
                  <circle
                    key={s.id}
                    cx={getX(hoverIndex)}
                    cy={getY(pt.value)}
                    r="4"
                    fill={s.color}
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Tooltip Box */}
        {hoverIndex !== null && (
          <div
            className="absolute top-4 left-20 bg-slate-950/95 border border-slate-700/80 rounded-lg p-2.5 shadow-2xl text-xs z-20 pointer-events-none"
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
                    <span className="font-mono font-semibold text-white">
                      ${Math.round(pt.value).toLocaleString()}
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
