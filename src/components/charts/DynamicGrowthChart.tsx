'use client';

import React, { useState, useMemo } from 'react';
import { DynamicPeriodResult } from '@/analytics/dynamicAllocation';

interface DynamicGrowthChartProps {
  periods: DynamicPeriodResult[];
  benchmarkPeriods: { date: string; value: number }[];
  benchmark6040Periods: { date: string; value: number }[];
  height?: number;
}

export function DynamicGrowthChart({
  periods,
  benchmarkPeriods,
  benchmark6040Periods,
  height = 320,
}: DynamicGrowthChartProps) {
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const {
    strategyPts,
    spyPts,
    b6040Pts,
    minVal,
    maxVal,
    svgStrat,
    svgSpy,
    svg6040,
  } = useMemo(() => {
    if (!periods || periods.length === 0) {
      return {
        strategyPts: [],
        spyPts: [],
        b6040Pts: [],
        minVal: 10000,
        maxVal: 20000,
        svgStrat: '',
        svgSpy: '',
        svg6040: '',
      };
    }

    const allValues: number[] = [];
    periods.forEach((p) => allValues.push(p.value));
    benchmarkPeriods.forEach((p) => allValues.push(p.value));
    benchmark6040Periods.forEach((p) => allValues.push(p.value));

    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);

    const minVal = scale === 'log' ? Math.max(1000, rawMin * 0.9) : Math.max(0, rawMin * 0.9);
    const maxVal = rawMax * 1.08;

    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 55 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    function getY(val: number) {
      if (scale === 'log') {
        const logMin = Math.log(minVal);
        const logMax = Math.log(maxVal);
        const logVal = Math.log(Math.max(val, minVal));
        return padding.top + innerHeight * (1 - (logVal - logMin) / (logMax - logMin || 1));
      }
      return padding.top + innerHeight * (1 - (val - minVal) / (maxVal - minVal || 1));
    }

    const n = periods.length;
    const strat = periods.map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.value),
      val: p.value,
      date: p.date,
    }));

    const spy = benchmarkPeriods.slice(0, n).map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.value),
      val: p.value,
    }));

    const b6040 = benchmark6040Periods.slice(0, n).map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.value),
      val: p.value,
    }));

    return {
      strategyPts: strat,
      spyPts: spy,
      b6040Pts: b6040,
      minVal,
      maxVal,
      svgStrat: strat.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svgSpy: spy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svg6040: b6040.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    };
  }, [periods, benchmarkPeriods, benchmark6040Periods, scale, height]);

  if (!periods || periods.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No growth data available
      </div>
    );
  }

  const activeStrat = hoverIndex !== null && strategyPts[hoverIndex] ? strategyPts[hoverIndex] : null;
  const activeSpy = hoverIndex !== null && spyPts[hoverIndex] ? spyPts[hoverIndex] : null;
  const active6040 = hoverIndex !== null && b6040Pts[hoverIndex] ? b6040Pts[hoverIndex] : null;

  return (
    <div className="w-full relative select-none">
      {/* Header controls & stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 bg-blue-600 rounded-full" />
            <span className="font-bold text-slate-900">Dynamic Strategy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-600 stroke-dasharray" />
            <span className="text-slate-600 font-medium">60/40 Benchmark</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-slate-400" />
            <span className="text-slate-500">100% SPY</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeStrat ? (
            <div className="font-mono text-xs flex items-center gap-3">
              <span className="text-slate-500">{activeStrat.date}</span>
              <span className="font-bold text-blue-700">${Math.round(activeStrat.val).toLocaleString()}</span>
              {active6040 && (
                <span className="text-emerald-700 text-[11px]">
                  (60/40: ${Math.round(active6040.val).toLocaleString()})
                </span>
              )}
              {activeSpy && (
                <span className="text-slate-500 text-[11px]">
                  (SPY: ${Math.round(activeSpy.val).toLocaleString()})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setScale('linear')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition ${
                  scale === 'linear'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Linear
              </button>
              <button
                type="button"
                onClick={() => setScale('log')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition ${
                  scale === 'log'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 800 280"
          className="w-full h-auto"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Axis Grid lines */}
          {[10000, 20000, 30000, 50000, 75000, 100000]
            .filter((v) => v >= minVal && v <= maxVal)
            .map((val) => {
              let y = 15 + 240 * (1 - (val - minVal) / (maxVal - minVal || 1));
              if (scale === 'log') {
                const logMin = Math.log(minVal);
                const logMax = Math.log(maxVal);
                y = 15 + 240 * (1 - (Math.log(val) - logMin) / (logMax - logMin || 1));
              }
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
                    ${(val / 1000).toFixed(0)}k
                  </text>
                </g>
              );
            })}

          {/* SPY Benchmark Line (slate) */}
          {spyPts.length > 1 && (
            <polyline
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              points={svgSpy}
            />
          )}

          {/* 60/40 Benchmark Line (emerald) */}
          {b6040Pts.length > 1 && (
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="1.8"
              strokeDasharray="3 3"
              points={svg6040}
            />
          )}

          {/* Dynamic Strategy Line (bold blue) */}
          {strategyPts.length > 1 && (
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgStrat}
            />
          )}

          {/* Hover crosshair */}
          {activeStrat && (
            <g>
              <line
                x1={activeStrat.x}
                y1="15"
                x2={activeStrat.x}
                y2="255"
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeStrat.x}
                cy={activeStrat.y}
                r="4.5"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Hover triggers */}
          {strategyPts.map((pt, i) => {
            const stepW = 720 / (strategyPts.length || 1);
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

      {/* Date timeline labels */}
      <div className="flex justify-between pl-14 pr-6 text-[10px] text-slate-400 font-mono mt-1">
        <span>{periods[0]?.date}</span>
        {periods.length > 24 && <span>{periods[Math.floor(periods.length / 2)]?.date}</span>}
        <span>{periods[periods.length - 1]?.date}</span>
      </div>
    </div>
  );
}
