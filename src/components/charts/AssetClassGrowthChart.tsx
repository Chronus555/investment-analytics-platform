'use client';

import React, { useState, useMemo } from 'react';
import { AssetClassPortfolioResult } from '@/analytics/assetClassBacktest';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface AssetClassGrowthChartProps {
  portfolios: AssetClassPortfolioResult[];
  benchmark: AssetClassPortfolioResult;
  height?: number;
}

export function AssetClassGrowthChart({
  portfolios,
  benchmark,
  height = 420,
}: AssetClassGrowthChartProps) {
  const [scale, setScale] = useState<'linear' | 'log'>('log');
  const [inflationMode, setInflationMode] = useState<'nominal' | 'real'>('nominal');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const allPortfolios = useMemo(() => {
    return [...portfolios, benchmark];
  }, [portfolios, benchmark]);

  const years = useMemo(() => {
    return benchmark?.annualSeries?.map((p) => p.year) || [];
  }, [benchmark]);

  const {
    portfolioPaths,
    ddPaths,
    minVal,
    maxVal,
    width,
    mainHeight,
    ddHeight,
    padding,
  } = useMemo(() => {
    const width = 800;
    const padding = { top: 15, right: 25, bottom: 25, left: 65 };
    const innerWidth = width - padding.left - padding.right;

    const mainHeight = 240;
    const ddHeight = 90;
    const ddGap = 35;

    if (!benchmark || !benchmark.annualSeries || benchmark.annualSeries.length === 0) {
      return {
        portfolioPaths: [],
        ddPaths: [],
        minVal: 10000,
        maxVal: 20000,
        width,
        mainHeight,
        ddHeight,
        padding,
      };
    }

    // Collect all values to find min and max
    const allVals: number[] = [];
    allPortfolios.forEach((p) => {
      p.annualSeries.forEach((s) => {
        allVals.push(inflationMode === 'real' ? s.realWealth : s.nominalWealth);
      });
    });

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);

    const minVal = scale === 'log' ? Math.max(1000, rawMin * 0.85) : Math.max(0, rawMin * 0.85);
    const maxVal = rawMax * 1.12;

    function getY(val: number) {
      if (scale === 'log') {
        const logMin = Math.log(minVal);
        const logMax = Math.log(maxVal);
        const logVal = Math.log(Math.max(val, minVal));
        return padding.top + mainHeight * (1 - (logVal - logMin) / (logMax - logMin || 1));
      }
      return padding.top + mainHeight * (1 - (val - minVal) / (maxVal - minVal || 1));
    }

    const n = years.length;

    // Build line points for each portfolio
    const pPaths = allPortfolios.map((p) => {
      const pts = p.annualSeries.map((s, i) => {
        const val = inflationMode === 'real' ? s.realWealth : s.nominalWealth;
        const x = padding.left + (i / (n - 1 || 1)) * innerWidth;
        const y = getY(val);
        return { x, y, val, year: s.year, return: s.nominalReturn, realReturn: s.realReturn };
      });

      const polyString = pts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

      return {
        id: p.id,
        name: p.name,
        color: p.color,
        isBenchmark: p.id === benchmark.id,
        points: pts,
        polyString,
      };
    });

    // Drawdown paths (bottom panel)
    const ddTop = padding.top + mainHeight + ddGap;
    function getDdY(dd: number) {
      const clamped = Math.max(-0.7, Math.min(0, dd));
      return ddTop + ddHeight * (-clamped / 0.7);
    }

    const dPaths = allPortfolios.map((p) => {
      const ddPts = p.annualSeries.map((s, i) => {
        const dd = inflationMode === 'real' ? s.drawdownReal : s.drawdownNominal;
        const x = padding.left + (i / (n - 1 || 1)) * innerWidth;
        const y = getDdY(dd);
        return { x, y, dd, year: s.year };
      });

      const polyString = ddPts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

      return {
        id: p.id,
        name: p.name,
        color: p.color,
        isBenchmark: p.id === benchmark.id,
        points: ddPts,
        polyString,
      };
    });

    return {
      portfolioPaths: pPaths,
      ddPaths: dPaths,
      minVal,
      maxVal,
      width,
      mainHeight,
      ddHeight,
      padding,
    };
  }, [allPortfolios, benchmark, years, scale, inflationMode]);

  const activeIdx = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < years.length ? hoverIndex : null;
  const activeYear = activeIdx !== null ? years[activeIdx] : null;

  // Y Axis ticks for main panel
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
      {/* Controls & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {allPortfolios.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-medium text-slate-800">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Nominal vs Real Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setInflationMode('nominal')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                inflationMode === 'nominal'
                  ? 'bg-white shadow-xs font-semibold text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              NOMINAL
            </button>
            <button
              type="button"
              onClick={() => setInflationMode('real')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                inflationMode === 'real'
                  ? 'bg-white shadow-xs font-semibold text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              REAL (CPI-U)
            </button>
          </div>

          {/* Scale Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setScale('log')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                scale === 'log'
                  ? 'bg-white shadow-xs font-semibold text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              LOG
            </button>
            <button
              type="button"
              onClick={() => setScale('linear')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                scale === 'linear'
                  ? 'bg-white shadow-xs font-semibold text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              LIN
            </button>
          </div>
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
            const idx = Math.round(frac * (years.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
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

          {/* PORTFOLIO GROWTH POLYLINES */}
          {portfolioPaths.map((p) => (
            <polyline
              key={p.id}
              fill="none"
              stroke={p.color}
              strokeWidth={p.isBenchmark ? '1.5' : '2.5'}
              strokeDasharray={p.isBenchmark ? '3 3' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={p.polyString}
            />
          ))}

          {/* ---------------- DRAWDOWN PANEL (BOTTOM) ---------------- */}
          {(() => {
            const ddTop = padding.top + mainHeight + 35;
            const ddZeroY = ddTop;
            const dd20Y = ddTop + ddHeight * (0.2 / 0.7);
            const dd40Y = ddTop + ddHeight * (0.4 / 0.7);
            const dd60Y = ddTop + ddHeight * (0.6 / 0.7);

            return (
              <g>
                <text
                  x={padding.left}
                  y={ddTop - 12}
                  className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono"
                >
                  {inflationMode === 'real' ? 'REAL PURCHASING POWER' : 'NOMINAL'} UNDERWATER DRAWDOWN (%)
                </text>

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
                      strokeWidth="1"
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

                {ddPaths.map((p) => (
                  <polyline
                    key={p.id}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.isBenchmark ? '1.2' : '1.8'}
                    strokeDasharray={p.isBenchmark ? '2 2' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={p.polyString}
                  />
                ))}
              </g>
            );
          })()}

          {/* TIME AXIS YEARS */}
          {(() => {
            const ddBottomY = padding.top + mainHeight + 35 + ddHeight;
            const innerW = width - padding.left - padding.right;
            const step = Math.max(1, Math.floor(years.length / 8));

            return (
              <g>
                {years.map((y, i) => {
                  if (i % step !== 0 && i !== years.length - 1) return null;
                  const x = padding.left + (i / (years.length - 1)) * innerW;
                  return (
                    <g key={y}>
                      <line
                        x1={x}
                        y1={ddBottomY}
                        x2={x}
                        y2={ddBottomY + 4}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={ddBottomY + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        {y}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* ACTIVE HOVER CROSSHAIR */}
          {activeIdx !== null && (
            <g>
              {(() => {
                const innerW = width - padding.left - padding.right;
                const x = padding.left + (activeIdx / (years.length - 1)) * innerW;
                return (
                  <>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + mainHeight + 35 + ddHeight}
                      stroke="#64748B"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                    {portfolioPaths.map((p) => {
                      const pt = p.points[activeIdx];
                      return (
                        <circle
                          key={p.id}
                          cx={pt.x}
                          cy={pt.y}
                          r={p.isBenchmark ? '3.5' : '4.5'}
                          fill={p.color}
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Box */}
        {activeIdx !== null && (
          <div
            className="pointer-events-none absolute top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs z-10"
            style={{
              left:
                activeIdx > years.length / 2
                  ? Math.max(8, (activeIdx / years.length) * 100 - 32) + '%'
                  : Math.min(70, (activeIdx / years.length) * 100 + 2) + '%',
            }}
          >
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1 font-mono">
              Year {activeYear} ({inflationMode === 'real' ? 'Real Purchasing Power' : 'Nominal'})
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              {portfolioPaths.map((p) => {
                const pt = p.points[activeIdx];
                const ret = inflationMode === 'real' ? pt.realReturn : pt.return;
                return (
                  <React.Fragment key={p.id}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-600 truncate">{p.name}:</span>
                    </span>
                    <span className="font-semibold text-slate-900 text-right">
                      {formatCurrency(Math.round(pt.val))} ({formatPercent(ret, 1)})
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
