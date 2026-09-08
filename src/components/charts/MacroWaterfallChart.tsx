'use client';

import React, { useState } from 'react';
import { formatPercent } from '@/utils/formatters';
import { AssetStressAttribution } from '@/analytics/macroStressTest';

interface MacroWaterfallChartProps {
  attributions: AssetStressAttribution[];
  totalPortfolioReturn: number;
  height?: number;
}

export const MacroWaterfallChart: React.FC<MacroWaterfallChartProps> = ({
  attributions,
  totalPortfolioReturn,
  height = 260,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!attributions || attributions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 font-mono">
        No asset attribution data available
      </div>
    );
  }

  const svgWidth = 800;
  const svgHeight = height;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;
  const usableWidth = svgWidth - paddingLeft - paddingRight;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  // Items to plot: each asset attribution + 1 summary total bar
  const items = [
    ...attributions.map((a) => ({
      name: a.symbol,
      value: a.weightedPortfolioReturn,
      unweighted: a.assetTotalReturn,
      weight: a.weight,
      isTotal: false,
      status: a.hedgeStatus,
    })),
    {
      name: 'Net Portfolio',
      value: totalPortfolioReturn,
      unweighted: totalPortfolioReturn,
      weight: 1.0,
      isTotal: true,
      status: totalPortfolioReturn >= 0 ? 'hedged' : 'loss_driver',
    },
  ];

  // Determine scale range
  let maxAbs = 0.05;
  items.forEach((item) => {
    const abs = Math.abs(item.value);
    if (abs > maxAbs) maxAbs = abs;
  });
  // Add 15% headroom
  maxAbs = maxAbs * 1.25;

  const zeroY = paddingTop + usableHeight / 2;
  const scale = (usableHeight / 2) / maxAbs;

  const barCount = items.length;
  const slotWidth = usableWidth / barCount;
  const barWidth = Math.min(48, Math.max(16, slotWidth * 0.65));

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none font-mono text-[11px]"
        >
          {/* Zero baseline */}
          <line
            x1={paddingLeft}
            y1={zeroY}
            x2={svgWidth - paddingRight}
            y2={zeroY}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Grid lines */}
          {[-maxAbs * 0.66, -maxAbs * 0.33, maxAbs * 0.33, maxAbs * 0.66].map((tickVal, i) => {
            const y = zeroY - tickVal * scale;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px]"
                >
                  {formatPercent(tickVal, 1)}
                </text>
              </g>
            );
          })}

          <text
            x={paddingLeft - 8}
            y={zeroY + 3}
            textAnchor="end"
            className="fill-slate-500 font-bold text-[9px]"
          >
            0.0%
          </text>

          {/* Bars */}
          {items.map((item, idx) => {
            const centerX = paddingLeft + idx * slotWidth + slotWidth / 2;
            const x = centerX - barWidth / 2;
            const barH = Math.max(2, Math.abs(item.value) * scale);
            const y = item.value >= 0 ? zeroY - barH : zeroY;

            let fillColor = '#ef4444'; // loss driver red
            if (item.isTotal) {
              fillColor = item.value >= 0 ? '#3b82f6' : '#6366f1'; // summary purple/blue
            } else if (item.value >= 0) {
              fillColor = '#10b981'; // positive hedge emerald
            }

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Column highlight on hover */}
                {isHovered && (
                  <rect
                    x={centerX - slotWidth / 2 + 2}
                    y={paddingTop}
                    width={slotWidth - 4}
                    height={usableHeight}
                    fill="#f8fafc"
                    opacity="0.8"
                    rx="4"
                  />
                )}

                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={fillColor}
                  opacity={isHovered ? 1 : 0.88}
                  rx="3"
                  className="transition-all duration-200"
                />

                {/* Value label above/below bar */}
                <text
                  x={centerX}
                  y={item.value >= 0 ? y - 6 : y + barH + 12}
                  textAnchor="middle"
                  className={`text-[10px] font-bold ${
                    item.value >= 0 ? 'fill-emerald-600' : 'fill-rose-600'
                  }`}
                >
                  {item.value >= 0 ? '+' : ''}
                  {formatPercent(item.value, 1)}
                </text>

                {/* X-axis label */}
                <text
                  x={centerX}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] ${
                    item.isTotal ? 'font-bold fill-indigo-600' : 'fill-slate-600 font-semibold'
                  }`}
                >
                  {item.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Tooltip Card */}
      {hoveredIndex !== null && items[hoveredIndex] && (
        <div className="mt-2.5 p-3 bg-slate-900 text-white rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                items[hoveredIndex].value >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span className="font-bold text-sm">{items[hoveredIndex].name}</span>
            {!items[hoveredIndex].isTotal && (
              <span className="text-slate-400 text-[11px]">
                Weight: {formatPercent(items[hoveredIndex].weight, 0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            {!items[hoveredIndex].isTotal && (
              <div>
                <span className="text-slate-400 block text-[10px]">Unweighted Asset Shock:</span>
                <span className={`font-bold ${items[hoveredIndex].unweighted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {items[hoveredIndex].unweighted >= 0 ? '+' : ''}
                  {formatPercent(items[hoveredIndex].unweighted, 2)}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[10px]">Weighted Contribution:</span>
              <span className={`font-bold ${items[hoveredIndex].value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {items[hoveredIndex].value >= 0 ? '+' : ''}
                {formatPercent(items[hoveredIndex].value, 2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Role:</span>
              <span className="uppercase text-slate-300 font-semibold text-[11px]">
                {items[hoveredIndex].isTotal ? 'Aggregate Portfolio' : items[hoveredIndex].value >= 0 ? 'Safe-Haven Buffer' : 'Drawdown Driver'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
