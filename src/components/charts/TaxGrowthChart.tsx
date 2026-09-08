'use client';

import React, { useState, useMemo } from 'react';
import { TaxBacktestPeriodPoint } from '@/analytics/taxBacktest';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface TaxGrowthChartProps {
  timeSeries: TaxBacktestPeriodPoint[];
  height?: number;
}

export function TaxGrowthChart({ timeSeries, height = 360 }: TaxGrowthChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { minVal, maxVal, dates, len } = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) {
      return { minVal: 10000, maxVal: 10000, dates: [], len: 0 };
    }
    const dates = timeSeries.map((d) => d.date);
    let min = Infinity;
    let max = -Infinity;

    timeSeries.forEach((pt) => {
      if (pt.afterTaxBalance < min) min = pt.afterTaxBalance;
      if (pt.preTaxBalance < min) min = pt.preTaxBalance;
      if (pt.preTaxBalance > max) max = pt.preTaxBalance;
      if (pt.afterTaxBalance > max) max = pt.afterTaxBalance;
    });

    if (min === Infinity) min = 10000;
    if (max === -Infinity) max = 25000;

    return {
      minVal: Math.max(100, min * 0.95),
      maxVal: max * 1.05,
      dates,
      len: dates.length,
    };
  }, [timeSeries]);

  if (len === 0) {
    return <div className="p-8 text-center text-slate-500">No tax backtest data available</div>;
  }

  const padLeft = 70;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const width = 800;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (index: number) => {
    if (len <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (len - 1)) * plotW;
  };

  const getY = (val: number) => {
    const range = maxVal - minVal;
    if (range <= 0) return padTop + plotH / 2;
    const norm = (val - minVal) / range;
    return padTop + plotH - norm * plotH;
  };

  // Pre-tax and After-tax paths
  const prePoints = timeSeries.map((d, i) => [getX(i), getY(d.preTaxBalance)]);
  const afterPoints = timeSeries.map((d, i) => [getX(i), getY(d.afterTaxBalance)]);

  const prePath = prePoints.reduce((acc, [x, y], i) => (i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`), '');
  const afterPath = afterPoints.reduce((acc, [x, y], i) => (i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`), '');

  // Tax Wedge Polygon: traces pre-tax forward, then after-tax backward
  const wedgePath = [
    ...prePoints.map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`)),
    ...[...afterPoints].reverse().map(([x, y]) => `L ${x},${y}`),
    'Z',
  ].join(' ');

  // Y-axis grid ticks (5 intervals)
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((pct) => {
    const val = minVal + pct * (maxVal - minVal);
    return { val, y: getY(val) };
  });

  // X-axis year ticks
  const xTicks: { label: string; x: number }[] = [];
  let lastYear = '';
  timeSeries.forEach((d, i) => {
    const yr = d.date.split('-')[0];
    if (yr !== lastYear && (i === 0 || i % 24 === 0 || i === len - 1)) {
      xTicks.push({ label: yr, x: getX(i) });
      lastYear = yr;
    }
  });

  const activePt = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < len ? timeSeries[hoverIndex] : null;
  const activeX = hoverIndex !== null ? getX(hoverIndex) : 0;
  const activePreY = activePt ? getY(activePt.preTaxBalance) : 0;
  const activeAfterY = activePt ? getY(activePt.afterTaxBalance) : 0;

  const taxGapDollars = activePt ? Math.max(0, activePt.preTaxBalance - activePt.afterTaxBalance) : 0;

  return (
    <div className="relative w-full">
      {/* Legend & Stats Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-1 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            <span className="font-semibold text-slate-800">Pre-Tax (Gross)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
            <span className="font-semibold text-slate-800">After-Tax (Net)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-rose-500/20 border border-rose-400 inline-block rounded-xs" />
            <span className="text-slate-600">Cumulative Tax Drag Wedge</span>
          </div>
        </div>

        {activePt ? (
          <div className="flex items-center gap-3 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <span className="text-slate-500">{activePt.date}</span>
            <span className="text-blue-600 font-bold">Pre: {formatCurrency(activePt.preTaxBalance)}</span>
            <span className="text-emerald-600 font-bold">After: {formatCurrency(activePt.afterTaxBalance)}</span>
            <span className="text-rose-600 font-bold">Tax Drag: {formatCurrency(taxGapDollars)}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Hover along the curve to inspect tax wedge</span>
        )}
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-hidden select-none bg-slate-50/50 rounded-xl border border-slate-200 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const svgX = (mouseX / rect.width) * width;
            const ratio = (svgX - padLeft) / plotW;
            const idx = Math.round(ratio * (len - 1));
            if (idx >= 0 && idx < len) {
              setHoverIndex(idx);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="taxWedgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Y-axis Grid Lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={padLeft + plotW}
                y2={tick.y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize={10}
                fontFamily="monospace"
                fill="#64748b"
              >
                {formatCurrency(tick.val)}
              </text>
            </g>
          ))}

          {/* X-axis Year Ticks */}
          {xTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={padTop + plotH}
                x2={tick.x}
                y2={padTop + plotH + 5}
                stroke="#cbd5e1"
              />
              <text
                x={tick.x}
                y={padTop + plotH + 18}
                textAnchor="middle"
                fontSize={10}
                fontFamily="monospace"
                fill="#64748b"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Tax Wedge Area Fill */}
          <path d={wedgePath} fill="url(#taxWedgeGrad)" />

          {/* Pre-Tax Path (Blue) */}
          <path
            d={prePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="5 3"
          />

          {/* After-Tax Path (Emerald) */}
          <path
            d={afterPath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
          />

          {/* Hover Crosshair & Markers */}
          {activePt && (
            <g>
              <line
                x1={activeX}
                y1={padTop}
                x2={activeX}
                y2={padTop + plotH}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <circle cx={activeX} cy={activePreY} r={4.5} fill="#2563eb" stroke="#ffffff" strokeWidth={2} />
              <circle cx={activeX} cy={activeAfterY} r={5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
