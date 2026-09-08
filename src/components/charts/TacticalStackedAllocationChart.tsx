'use client';

import React, { useState } from 'react';

interface TacticalSignalData {
  date: string;
  selectedAssets: Record<string, number>;
  cashWeight?: number;
}

interface TacticalStackedAllocationChartProps {
  signals: TacticalSignalData[];
  height?: number;
}

const ASSET_COLORS: Record<string, string> = {
  SPY: '#2563EB',
  QQQ: '#7C3AED',
  IWM: '#0284C7',
  EFA: '#0D9488',
  EEM: '#E11D48',
  VNQ: '#EA580C',
  GLD: '#D97706',
  TLT: '#16A34A',
  DBC: '#B45309',
  BND: '#64748B',
  BIL: '#94A3B8',
  CASH: '#94A3B8',
};

const DEFAULT_COLOR = '#6B7280';

export function TacticalStackedAllocationChart({
  signals,
  height = 260,
}: TacticalStackedAllocationChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!signals || signals.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-600">
        No allocation history available
      </div>
    );
  }

  const allSymbolsSet = new Set<string>();
  signals.forEach((sig) => {
    Object.keys(sig.selectedAssets).forEach((sym) => {
      if ((sig.selectedAssets[sym] || 0) > 0.001) {
        allSymbolsSet.add(sym);
      }
    });
    if ((sig.cashWeight || 0) > 0.001 && !sig.selectedAssets['CASH'] && !sig.selectedAssets['BIL'] && !sig.selectedAssets['BND']) {
      allSymbolsSet.add('CASH');
    }
  });
  const symbols = Array.from(allSymbolsSet);

  const width = 800;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepWidth = signals.length > 1 ? chartWidth / (signals.length - 1) : chartWidth;

  const stackedPoints: { symbol: string; points: { x: number; y0: number; y1: number; pct: number }[] }[] = symbols.map(
    (sym) => ({ symbol: sym, points: [] })
  );

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const x = padding.left + i * stepWidth;
    let currentY = 0;

    symbols.forEach((sym, symIdx) => {
      let weight = sig.selectedAssets[sym] || 0;
      if (sym === 'CASH' && weight === 0 && (sig.cashWeight || 0) > 0.001) {
        weight = sig.cashWeight || 0;
      }
      const y0 = currentY;
      const y1 = currentY + weight;
      currentY = y1;

      stackedPoints[symIdx].points.push({
        x,
        y0: padding.top + chartHeight * (1 - y0),
        y1: padding.top + chartHeight * (1 - Math.min(1.0, y1)),
        pct: weight,
      });
    });
  }

  const paths = stackedPoints.map(({ symbol, points }) => {
    if (points.length === 0) return { symbol, d: '' };
    let d = 'M ' + points[0].x + ' ' + points[0].y1;
    for (let i = 1; i < points.length; i++) {
      d += ' L ' + points[i].x + ' ' + points[i].y1;
    }
    for (let i = points.length - 1; i >= 0; i--) {
      d += ' L ' + points[i].x + ' ' + points[i].y0;
    }
    d += ' Z';
    return { symbol, d };
  });

  const activeSignal = hoverIndex !== null ? signals[hoverIndex] : null;

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="text-xs font-medium text-slate-700">
          Historical Dynamic Allocation Drift (0% to 100%)
        </div>
        <div className="flex flex-wrap gap-3">
          {symbols.map((sym) => (
            <div key={sym} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: ASSET_COLORS[sym] || DEFAULT_COLOR }}
              />
              <span className="font-semibold text-slate-800">{sym}</span>
            </div>
          ))}
        </div>
      </div>

      <svg
        viewBox={'0 0 ' + width + ' ' + height}
        className="w-full select-none overflow-visible"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1.0].map((pct) => {
          const y = padding.top + chartHeight * (1 - pct);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#64748B"
                fontSize="10"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                {Math.round(pct * 100)}%
              </text>
            </g>
          );
        })}

        {paths.map(({ symbol, d }) => (
          <path
            key={symbol}
            d={d}
            fill={ASSET_COLORS[symbol] || DEFAULT_COLOR}
            fillOpacity={0.82}
            stroke="#FFFFFF"
            strokeWidth="0.75"
          />
        ))}

        {signals.length > 0 &&
          [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
            const dataIdx = Math.min(signals.length - 1, Math.floor(frac * (signals.length - 1)));
            const sig = signals[dataIdx];
            const x = padding.left + dataIdx * stepWidth;
            return (
              <text
                key={idx}
                x={x}
                y={height - 8}
                fill="#64748B"
                fontSize="10"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {sig.date.substring(0, 7)}
              </text>
            );
          })}

        {hoverIndex !== null && (
          <g>
            <line
              x1={padding.left + hoverIndex * stepWidth}
              y1={padding.top}
              x2={padding.left + hoverIndex * stepWidth}
              y2={padding.top + chartHeight}
              stroke="#0F172A"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {signals.map((_, idx) => {
          const x = padding.left + idx * stepWidth - stepWidth / 2;
          return (
            <rect
              key={idx}
              x={Math.max(padding.left, x)}
              y={padding.top}
              width={stepWidth}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          );
        })}
      </svg>

      {activeSignal && (
        <div className="mt-2 flex flex-wrap items-center justify-between rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
          <span className="font-semibold text-slate-800">
            Rebalance Date: {activeSignal.date}
          </span>
          <div className="flex flex-wrap gap-3">
            {symbols.map((sym) => {
              const weight = activeSignal.selectedAssets[sym] || (sym === 'CASH' ? activeSignal.cashWeight : 0) || 0;
              if (weight < 0.001) return null;
              return (
                <div key={sym} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ASSET_COLORS[sym] || DEFAULT_COLOR }}
                  />
                  <span className="text-slate-600">{sym}:</span>
                  <span className="font-bold text-slate-900">
                    {(weight * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}