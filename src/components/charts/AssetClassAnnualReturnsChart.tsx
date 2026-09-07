'use client';

import React, { useState, useMemo } from 'react';
import { AssetClassPortfolioResult } from '@/analytics/assetClassBacktest';
import { formatPercent } from '@/utils/formatters';

interface AssetClassAnnualReturnsChartProps {
  portfolios: AssetClassPortfolioResult[];
  benchmark: AssetClassPortfolioResult;
  height?: number;
}

export function AssetClassAnnualReturnsChart({
  portfolios,
  benchmark,
  height = 300,
}: AssetClassAnnualReturnsChartProps) {
  const [hoverYearIndex, setHoverYearIndex] = useState<number | null>(null);

  const allPortfolios = useMemo(() => {
    return [...portfolios, benchmark];
  }, [portfolios, benchmark]);

  const years = useMemo(() => {
    return benchmark?.annualSeries?.map((p) => p.year) || [];
  }, [benchmark]);

  const {
    width,
    innerHeight,
    padding,
    minRet,
    maxRet,
    zeroY,
    barGroups,
  } = useMemo(() => {
    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    if (!benchmark || !benchmark.annualSeries || benchmark.annualSeries.length === 0) {
      return {
        width,
        innerHeight,
        padding,
        minRet: -0.4,
        maxRet: 0.5,
        zeroY: padding.top + innerHeight / 2,
        barGroups: [],
      };
    }

    // Collect all returns
    const allReturns: number[] = [];
    allPortfolios.forEach((p) => {
      p.annualSeries.forEach((s) => allReturns.push(s.nominalReturn));
    });

    const rawMin = Math.min(-0.35, ...allReturns);
    const rawMax = Math.max(0.40, ...allReturns);

    const minRet = Math.floor(rawMin * 10) / 10;
    const maxRet = Math.ceil(rawMax * 10) / 10;

    function getY(val: number) {
      return padding.top + innerHeight * (1 - (val - minRet) / (maxRet - minRet || 1));
    }

    const zeroY = getY(0);
    const n = years.length;
    const groupWidth = innerWidth / n;
    const barCount = allPortfolios.length;
    const singleBarWidth = Math.max(1.5, Math.min(6, (groupWidth * 0.8) / barCount));

    const bGroups = years.map((y, yIdx) => {
      const groupCenterX = padding.left + (yIdx + 0.5) * groupWidth;
      const startX = groupCenterX - ((barCount * singleBarWidth) / 2);

      const bars = allPortfolios.map((p, pIdx) => {
        const ret = p.annualSeries[yIdx]?.nominalReturn || 0;
        const barY = getY(ret);
        const barX = startX + pIdx * singleBarWidth;

        const top = Math.min(barY, zeroY);
        const h = Math.max(1, Math.abs(barY - zeroY));

        return {
          portfolioId: p.id,
          name: p.name,
          color: p.color,
          returnVal: ret,
          x: barX,
          y: top,
          height: h,
          width: singleBarWidth - 0.5,
        };
      });

      return {
        year: y,
        yearIndex: yIdx,
        centerX: groupCenterX,
        bars,
      };
    });

    return {
      width,
      innerHeight,
      padding,
      minRet,
      maxRet,
      zeroY,
      barGroups: bGroups,
    };
  }, [allPortfolios, benchmark, years, height]);

  const activeGroup =
    hoverYearIndex !== null && hoverYearIndex >= 0 && hoverYearIndex < barGroups.length
      ? barGroups[hoverYearIndex]
      : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {allPortfolios.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-medium text-slate-800">{p.name}</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          54 CALENDAR YEAR PERFORMANCE (1972–2025)
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
        <svg
          viewBox={`0 0 ${width} ${height - 40}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const innerW = width - padding.left - padding.right;
            const frac = Math.max(0, Math.min(1, (mouseX - padding.left) / innerW));
            const idx = Math.min(years.length - 1, Math.floor(frac * years.length));
            setHoverYearIndex(idx);
          }}
          onMouseLeave={() => setHoverYearIndex(null)}
        >
          {/* Y Gridlines */}
          {[-0.4, -0.2, 0.0, 0.2, 0.4, 0.6].map((val) => {
            if (val < minRet || val > maxRet) return null;
            const y = padding.top + innerHeight * (1 - (val - minRet) / (maxRet - minRet));
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={val === 0 ? '#94A3B8' : '#F1F5F9'}
                  strokeWidth={val === 0 ? '1.2' : '1'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {formatPercent(val, 0)}
                </text>
              </g>
            );
          })}

          {/* Bar Groups */}
          {barGroups.map((group) => (
            <g key={group.year}>
              {group.bars.map((bar) => (
                <rect
                  key={bar.portfolioId}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={bar.color}
                  rx="1"
                  opacity={hoverYearIndex === null || hoverYearIndex === group.yearIndex ? 1 : 0.45}
                />
              ))}
            </g>
          ))}

          {/* X Axis Year Labels */}
          {(() => {
            const step = Math.max(1, Math.floor(years.length / 8));
            return (
              <g>
                {barGroups.map((group, i) => {
                  if (i % step !== 0 && i !== barGroups.length - 1) return null;
                  return (
                    <g key={group.year}>
                      <line
                        x1={group.centerX}
                        y1={padding.top + innerHeight}
                        x2={group.centerX}
                        y2={padding.top + innerHeight + 4}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                      <text
                        x={group.centerX}
                        y={padding.top + innerHeight + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        {group.year}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Active Hover Column Shading */}
          {activeGroup && (
            <rect
              x={activeGroup.centerX - (width - padding.left - padding.right) / years.length / 2}
              y={padding.top}
              width={(width - padding.left - padding.right) / years.length}
              height={innerHeight}
              fill="#2563EB"
              opacity={0.06}
            />
          )}
        </svg>

        {/* Hover Tooltip Box */}
        {activeGroup && (
          <div
            className="pointer-events-none absolute top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs z-10"
            style={{
              left:
                activeGroup.yearIndex > years.length / 2
                  ? Math.max(8, (activeGroup.yearIndex / years.length) * 100 - 32) + '%'
                  : Math.min(70, (activeGroup.yearIndex / years.length) * 100 + 2) + '%',
            }}
          >
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1 font-mono">
              Year {activeGroup.year} Annual Returns
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
              {activeGroup.bars.map((b) => (
                <React.Fragment key={b.portfolioId}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-slate-600 truncate">{b.name}:</span>
                  </span>
                  <span
                    className={`font-semibold text-right ${
                      b.returnVal >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {b.returnVal >= 0 ? `+${formatPercent(b.returnVal, 2)}` : formatPercent(b.returnVal, 2)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
