'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateRollingReturns,
  calculateRollingVolatility,
  calculateRollingSharpe,
  calculateRollingBeta,
} from '@/analytics/returns';

interface RollingSeriesData {
  name: string;
  color: string;
  returns: number[];
}

interface RollingMetricsChartProps {
  dates: string[];
  series: RollingSeriesData[];
  benchmarkReturns?: number[];
  riskFreeRate?: number;
}

export const RollingMetricsChart: React.FC<RollingMetricsChartProps> = ({
  dates,
  series,
  benchmarkReturns = [],
  riskFreeRate = 0.04,
}) => {
  const [metric, setMetric] = useState<'returns' | 'volatility' | 'sharpe' | 'beta'>('returns');
  const [windowMonths, setWindowMonths] = useState<number>(36);

  const rollingData = useMemo(() => {
    return series.map((s) => {
      let values: number[] = [];
      if (metric === 'returns') {
        values = calculateRollingReturns(s.returns, windowMonths, 12);
      } else if (metric === 'volatility') {
        values = calculateRollingVolatility(s.returns, windowMonths, 12);
      } else if (metric === 'sharpe') {
        values = calculateRollingSharpe(s.returns, windowMonths, riskFreeRate, 12);
      } else if (metric === 'beta') {
        const bench = benchmarkReturns.length > 0 ? benchmarkReturns : s.returns;
        values = calculateRollingBeta(s.returns, bench, windowMonths);
      }
      return {
        name: s.name,
        color: s.color,
        values,
      };
    });
  }, [series, metric, windowMonths, riskFreeRate, benchmarkReturns]);

  // Adjusted date array for rolling window
  const rollingDates = useMemo(() => {
    if (dates.length < windowMonths) return [];
    return dates.slice(windowMonths - 1);
  }, [dates, windowMonths]);

  // Determine min and max across all series for scaling
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    rollingData.forEach((s) => {
      s.values.forEach((v) => {
        if (!isNaN(v) && isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (min === Infinity) return { minVal: 0, maxVal: 0.2 };
    // Add 10% padding
    const range = max - min || 0.1;
    return {
      minVal: min - range * 0.05,
      maxVal: max + range * 0.05,
    };
  }, [rollingData]);

  const chartWidth = 700;
  const chartHeight = 260;
  const padding = { top: 20, right: 30, bottom: 30, left: 55 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const pointsCount = rollingDates.length;

  const getX = (index: number) => {
    if (pointsCount <= 1) return padding.left;
    return padding.left + (index / (pointsCount - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    if (maxVal === minVal) return padding.top + plotHeight / 2;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + plotHeight - ((clamped - minVal) / (maxVal - minVal)) * plotHeight;
  };

  const formatValue = (val: number) => {
    if (metric === 'returns' || metric === 'volatility') {
      return `${(val * 100).toFixed(1)}%`;
    }
    return val.toFixed(2);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-semibold text-slate-900 tracking-tight">Rolling Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sliding window performance to observe regime-dependent volatility and stability
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70 text-xs">
            {(['returns', 'volatility', 'sharpe', 'beta'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`rounded px-2.5 py-1 font-medium transition cursor-pointer capitalize ${
                  metric === m ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'returns' ? 'CAGR' : m}
              </button>
            ))}
          </div>

          {/* Window Selector */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70 text-xs">
            {[
              { val: 12, label: '1 Year' },
              { val: 36, label: '3 Years' },
              { val: 60, label: '5 Years' },
            ].map((w) => (
              <button
                key={w.val}
                type="button"
                onClick={() => setWindowMonths(w.val)}
                className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
                  windowMonths === w.val ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pointsCount < 2 ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-500">
          Insufficient historical duration for {windowMonths}-month rolling window.
        </div>
      ) : (
        <div className="mt-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = padding.top + plotHeight * ratio;
              const val = maxVal - ratio * (maxVal - minVal);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatValue(val)}
                  </text>
                </g>
              );
            })}

            {/* Zero line if within range */}
            {minVal < 0 && maxVal > 0 && (
              <line
                x1={padding.left}
                y1={getY(0)}
                x2={chartWidth - padding.right}
                y2={getY(0)}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            )}

            {/* Series Paths */}
            {rollingData.map((s) => {
              const pathD = s.values
                .map((val, idx) => {
                  const x = getX(idx);
                  const y = getY(val);
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ');

              return (
                <path
                  key={s.name}
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* X Axis Date labels */}
            {rollingDates.length > 0 && (
              <>
                <text
                  x={padding.left}
                  y={chartHeight - 8}
                  textAnchor="start"
                  fill="#64748b"
                  fontSize="10"
                >
                  {rollingDates[0]?.slice(0, 7)}
                </text>
                <text
                  x={padding.left + plotWidth / 2}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                >
                  {rollingDates[Math.floor(rollingDates.length / 2)]?.slice(0, 7)}
                </text>
                <text
                  x={chartWidth - padding.right}
                  y={chartHeight - 8}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                >
                  {rollingDates[rollingDates.length - 1]?.slice(0, 7)}
                </text>
              </>
            )}
          </svg>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs">
            {rollingData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-700 font-medium">{s.name}</span>
                {s.values.length > 0 && (
                  <span className="text-slate-500 font-mono">
                    ({formatValue(s.values[s.values.length - 1])})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};