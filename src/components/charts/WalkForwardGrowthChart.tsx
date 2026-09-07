'use client';

import React, { useState, useMemo } from 'react';
import { OutOfSampleMonthPoint, BenchmarkSeriesResult } from '@/analytics/walkForwardOptimization';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface WalkForwardGrowthChartProps {
  series: OutOfSampleMonthPoint[];
  benchmarks: {
    equalWeight: BenchmarkSeriesResult;
    benchmark6040: BenchmarkSeriesResult;
    inSampleOverfit: BenchmarkSeriesResult;
  };
  height?: number;
}

export function WalkForwardGrowthChart({
  series,
  benchmarks,
  height = 420,
}: WalkForwardGrowthChartProps) {
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showOverfit, setShowOverfit] = useState<boolean>(true);

  const {
    wfPts,
    eqPts,
    b6040Pts,
    ofPts,
    minVal,
    maxVal,
    ddWfPts,
    ddEqPts,
    svgWf,
    svgEq,
    svg6040,
    svgOf,
    svgDdWf,
    width,
    mainHeight,
    ddHeight,
    padding,
  } = useMemo(() => {
    const width = 800;
    const padding = { top: 15, right: 25, bottom: 25, left: 60 };
    const innerWidth = width - padding.left - padding.right;

    const mainHeight = 250;
    const ddHeight = 100;
    const ddGap = 35;

    if (!series || series.length === 0) {
      return {
        wfPts: [],
        eqPts: [],
        b6040Pts: [],
        ofPts: [],
        minVal: 10000,
        maxVal: 20000,
        ddWfPts: [],
        ddEqPts: [],
        svgWf: '',
        svgEq: '',
        svg6040: '',
        svgOf: '',
        svgDdWf: '',
        width,
        mainHeight,
        ddHeight,
        padding,
      };
    }

    const allValues: number[] = [];
    series.forEach((p) => allValues.push(p.wealth));
    benchmarks.equalWeight.series.forEach((p) => allValues.push(p.wealth));
    benchmarks.benchmark6040.series.forEach((p) => allValues.push(p.wealth));
    if (showOverfit) {
      benchmarks.inSampleOverfit.series.forEach((p) => allValues.push(p.wealth));
    }

    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);

    const minVal = scale === 'log' ? Math.max(1000, rawMin * 0.9) : Math.max(0, rawMin * 0.9);
    const maxVal = rawMax * 1.08;

    function getY(val: number) {
      if (scale === 'log') {
        const logMin = Math.log(minVal);
        const logMax = Math.log(maxVal);
        const logVal = Math.log(Math.max(val, minVal));
        return padding.top + mainHeight * (1 - (logVal - logMin) / (logMax - logMin || 1));
      }
      return padding.top + mainHeight * (1 - (val - minVal) / (maxVal - minVal || 1));
    }

    const n = series.length;
    const wf = series.map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.wealth),
      val: p.wealth,
      drawdown: p.drawdown,
      date: p.date,
    }));

    const eq = benchmarks.equalWeight.series.slice(0, n).map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.wealth),
      val: p.wealth,
      drawdown: p.drawdown,
    }));

    const b6040 = benchmarks.benchmark6040.series.slice(0, n).map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.wealth),
      val: p.wealth,
      drawdown: p.drawdown,
    }));

    const of = benchmarks.inSampleOverfit.series.slice(0, n).map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(p.wealth),
      val: p.wealth,
      drawdown: p.drawdown,
    }));

    // Drawdown calculation (bottom panel)
    const ddTop = padding.top + mainHeight + ddGap;
    function getDdY(dd: number) {
      // dd in [-0.7, 0]
      const clamped = Math.max(-0.7, Math.min(0, dd));
      return ddTop + ddHeight * (-clamped / 0.7);
    }

    const ddWf = series.map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getDdY(p.drawdown),
      val: p.drawdown,
    }));

    const ddEq = benchmarks.equalWeight.series.slice(0, n).map((p, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getDdY(p.drawdown),
      val: p.drawdown,
    }));

    // Drawdown polygon path
    const ddPolyPoints = [
      `${padding.left},${ddTop}`,
      ...ddWf.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
      `${padding.left + innerWidth},${ddTop}`,
    ].join(' ');

    return {
      wfPts: wf,
      eqPts: eq,
      b6040Pts: b6040,
      ofPts: of,
      minVal,
      maxVal,
      ddWfPts: ddWf,
      ddEqPts: ddEq,
      svgWf: wf.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svgEq: eq.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svg6040: b6040.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svgOf: of.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svgDdWf: ddPolyPoints,
      width,
      mainHeight,
      ddHeight,
      padding,
    };
  }, [series, benchmarks, scale, showOverfit]);

  const activeIdx = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < wfPts.length ? hoverIndex : null;
  const activeWf = activeIdx !== null ? wfPts[activeIdx] : null;
  const activeEq = activeIdx !== null ? eqPts[activeIdx] : null;
  const active6040 = activeIdx !== null ? b6040Pts[activeIdx] : null;
  const activeOf = activeIdx !== null ? ofPts[activeIdx] : null;

  // Grid tick values for main panel
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      if (scale === 'log') {
        const logMin = Math.log(minVal);
        const logMax = Math.log(maxVal);
        const val = Math.exp(logMin + frac * (logMax - logMin));
        ticks.push(val);
      } else {
        ticks.push(minVal + frac * (maxVal - minVal));
      }
    }
    return ticks;
  }, [minVal, maxVal, scale]);

  const totalSvgHeight = padding.top + mainHeight + 35 + ddHeight + padding.bottom;

  return (
    <div className="flex flex-col gap-3">
      {/* Controls & Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 rounded-full" />
            <span className="font-medium text-slate-900">Walk-Forward (OOS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-600 rounded-full" />
            <span className="text-slate-600">Equal Weight (1/N)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-600 rounded-full" />
            <span className="text-slate-600">60/40 Equity/Bond</span>
          </div>
          <button
            type="button"
            onClick={() => setShowOverfit(!showOverfit)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              showOverfit ? 'opacity-100' : 'opacity-40 hover:opacity-75'
            }`}
          >
            <span className="w-3 h-0.5 bg-purple-600 border-dashed border-t border-purple-600" />
            <span className="text-slate-600">In-Sample Overfit (Look-Ahead)</span>
          </button>
        </div>

        {/* Scale Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
          <button
            type="button"
            onClick={() => setScale('linear')}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition ${
              scale === 'linear' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            LIN
          </button>
          <button
            type="button"
            onClick={() => setScale('log')}
            className={`px-2 py-0.5 rounded font-mono text-[11px] transition ${
              scale === 'log' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            LOG
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
        <svg
          viewBox={`0 0 ${width} ${totalSvgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const innerW = width - padding.left - padding.right;
            const frac = Math.max(0, Math.min(1, (mouseX - padding.left) / innerW));
            const idx = Math.round(frac * (wfPts.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="wfDdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="wfLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* MAIN WEALTH PANEL GRID */}
          {yTicks.map((val, i) => {
            let y = 0;
            if (scale === 'log') {
              const logMin = Math.log(minVal);
              const logMax = Math.log(maxVal);
              const logVal = Math.log(Math.max(val, minVal));
              y = padding.top + mainHeight * (1 - (logVal - logMin) / (logMax - logMin || 1));
            } else {
              y = padding.top + mainHeight * (1 - (val - minVal) / (maxVal - minVal || 1));
            }

            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {formatCurrency(Math.round(val))}
                </text>
              </g>
            );
          })}

          {/* BASELINE $10,000 REFERENCE LINE */}
          {minVal <= 10000 && maxVal >= 10000 && (
            <line
              x1={padding.left}
              y1={
                scale === 'log'
                  ? padding.top + mainHeight * (1 - (Math.log(10000) - Math.log(minVal)) / (Math.log(maxVal) - Math.log(minVal)))
                  : padding.top + mainHeight * (1 - (10000 - minVal) / (maxVal - minVal))
              }
              x2={width - padding.right}
              y2={
                scale === 'log'
                  ? padding.top + mainHeight * (1 - (Math.log(10000) - Math.log(minVal)) / (Math.log(maxVal) - Math.log(minVal)))
                  : padding.top + mainHeight * (1 - (10000 - minVal) / (maxVal - minVal))
              }
              stroke="#CBD5E1"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}

          {/* BENCHMARK LINES */}
          {showOverfit && svgOf && (
            <polyline
              fill="none"
              stroke="#9333EA"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgOf}
            />
          )}

          {svg6040 && (
            <polyline
              fill="none"
              stroke="#D97706"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svg6040}
            />
          )}

          {svgEq && (
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgEq}
            />
          )}

          {/* WALK-FORWARD OUT-OF-SAMPLE PRIMARY LINE */}
          {svgWf && (
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgWf}
            />
          )}

          {/* ---------------- DRAWDOWN PANEL (BOTTOM) ---------------- */}
          {(() => {
            const ddTop = padding.top + mainHeight + 35;
            const ddZeroY = ddTop;
            const dd20Y = ddTop + ddHeight * (0.2 / 0.7);
            const dd40Y = ddTop + ddHeight * (0.4 / 0.7);
            const dd60Y = ddTop + ddHeight * (0.6 / 0.7);

            return (
              <g>
                {/* Separator / Title */}
                <text
                  x={padding.left}
                  y={ddTop - 12}
                  className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono"
                >
                  OUT-OF-SAMPLE UNDERWATER DRAWDOWN (%)
                </text>

                {/* Grid lines */}
                {[
                  { y: ddZeroY, label: '0%' },
                  { y: dd20Y, label: '-20%' },
                  { y: dd40Y, label: '-40%' },
                  { y: dd60Y, label: '-60%' },
                ].map((gItem, idx) => (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={gItem.y}
                      x2={width - padding.right}
                      y2={gItem.y}
                      stroke={idx === 0 ? '#94A3B8' : '#F1F5F9'}
                      strokeWidth={idx === 0 ? '1' : '1'}
                    />
                    <text
                      x={padding.left - 8}
                      y={gItem.y + 3}
                      textAnchor="end"
                      className="text-[9px] fill-slate-400 font-mono"
                    >
                      {gItem.label}
                    </text>
                  </g>
                ))}

                {/* Drawdown Polygon Fill */}
                {svgDdWf && (
                  <polygon points={svgDdWf} fill="url(#wfDdGrad)" />
                )}

                {/* Drawdown Line */}
                {ddWfPts.length > 0 && (
                  <polyline
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={ddWfPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  />
                )}
              </g>
            );
          })()}

          {/* TIME AXIS TICKS */}
          {(() => {
            const step = Math.max(1, Math.floor(wfPts.length / 7));
            const ddBottomY = padding.top + mainHeight + 35 + ddHeight;
            return (
              <g>
                {wfPts.map((pt, i) => {
                  if (i % step !== 0 && i !== wfPts.length - 1) return null;
                  return (
                    <g key={i}>
                      <line
                        x1={pt.x}
                        y1={ddBottomY}
                        x2={pt.x}
                        y2={ddBottomY + 4}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                      <text
                        x={pt.x}
                        y={ddBottomY + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        {pt.date.substring(0, 7)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* ACTIVE CROSSHAIR */}
          {activeWf && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={activeWf.x}
                y1={padding.top}
                x2={activeWf.x}
                y2={padding.top + mainHeight + 35 + ddHeight}
                stroke="#64748B"
                strokeDasharray="2 2"
                strokeWidth="1"
              />

              {/* Dot on Walk-Forward */}
              <circle cx={activeWf.x} cy={activeWf.y} r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />

              {/* Dot on Equal Weight */}
              {activeEq && (
                <circle cx={activeEq.x} cy={activeEq.y} r="3.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
              )}

              {/* Dot on 60/40 */}
              {active6040 && (
                <circle cx={active6040.x} cy={active6040.y} r="3.5" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.5" />
              )}

              {/* Dot on Overfit */}
              {showOverfit && activeOf && (
                <circle cx={activeOf.x} cy={activeOf.y} r="3.5" fill="#9333EA" stroke="#FFFFFF" strokeWidth="1.5" />
              )}

              {/* Drawdown dot */}
              {ddWfPts[activeIdx!] && (
                <circle
                  cx={ddWfPts[activeIdx!].x}
                  cy={ddWfPts[activeIdx!].y}
                  r="3.5"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Box */}
        {activeWf && (
          <div
            className="pointer-events-none absolute top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs"
            style={{
              left: activeWf.x > width / 2 ? Math.max(10, (activeWf.x / width) * 100 - 32) + '%' : Math.min(68, (activeWf.x / width) * 100 + 2) + '%',
            }}
          >
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1 font-mono">
              {activeWf.date} (OOS Month {activeIdx! + 1})
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
              <span className="text-blue-600 font-medium">Walk-Forward:</span>
              <span className="font-semibold text-slate-900 text-right">{formatCurrency(Math.round(activeWf.val))}</span>

              <span className="text-emerald-600">Equal Weight:</span>
              <span className="text-slate-700 text-right">{activeEq ? formatCurrency(Math.round(activeEq.val)) : '—'}</span>

              <span className="text-amber-600">60/40 SPY/BND:</span>
              <span className="text-slate-700 text-right">{active6040 ? formatCurrency(Math.round(active6040.val)) : '—'}</span>

              {showOverfit && activeOf && (
                <>
                  <span className="text-purple-600">Look-Ahead:</span>
                  <span className="text-slate-700 text-right">{formatCurrency(Math.round(activeOf.val))}</span>
                </>
              )}

              <span className="text-slate-500 pt-1 border-t border-slate-100">Drawdown:</span>
              <span className="text-rose-600 font-semibold pt-1 border-t border-slate-100 text-right">
                {formatPercent(activeWf.drawdown, 1)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
