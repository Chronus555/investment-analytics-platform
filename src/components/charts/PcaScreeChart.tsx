'use client';

import React, { useState } from 'react';
import { PrincipalComponent } from '@/analytics/pca';
import { formatPercent } from '@/utils/formatters';

interface PcaScreeChartProps {
  components: PrincipalComponent[];
}

export const PcaScreeChart: React.FC<PcaScreeChartProps> = ({ components }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!components || components.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
        No principal components available.
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const padding = { top: 25, right: 45, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max individual variance explained determines left Y axis scale
  const maxVarExp = Math.max(0.4, ...components.map((c) => c.varianceExplained));
  const maxLeftY = Math.ceil(maxVarExp * 10) / 10; // Round to nearest 0.1

  const getBarX = (idx: number) => padding.left + (idx + 0.15) * (chartW / components.length);
  const barWidth = Math.max(12, (chartW / components.length) * 0.7);

  const getLeftY = (val: number) => padding.top + chartH - (val / maxLeftY) * chartH;
  const getRightY = (cumVal: number) => padding.top + chartH - cumVal * chartH;

  // Line path for cumulative variance
  let lineD = '';
  components.forEach((c, i) => {
    const x = getBarX(i) + barWidth / 2;
    const y = getRightY(c.cumulativeVariance);
    if (i === 0) {
      lineD += `M ${x} ${y}`;
    } else {
      lineD += ` L ${x} ${y}`;
    }
  });

  return (
    <div className="w-full space-y-2">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            <span className="text-slate-700 font-medium">Variance Explained (Bars, Left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-slate-700 font-medium">Cumulative Variance (Line, Right)</span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          EIGENVALUE SCREE PLOT
        </span>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          {/* Horizontal Grid lines based on Right Axis (Cumulative) */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
            const y = getRightY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                {/* Right label: Cumulative % */}
                <text
                  x={width - padding.right + 8}
                  y={y + 3.5}
                  textAnchor="start"
                  className="fill-emerald-600 font-mono text-[10px] font-semibold"
                >
                  {(val * 100).toFixed(0)}%
                </text>
                {/* Left label: Individual % */}
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {(val * maxLeftY * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Variance Explained Bars */}
          {components.map((c, i) => {
            const x = getBarX(i);
            const y = getLeftY(c.varianceExplained);
            const h = padding.top + chartH - y;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={c.component}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(1, h)}
                  fill={isHovered ? '#1d4ed8' : '#3b82f6'}
                  rx="3"
                  className="transition-colors"
                />
                {/* Component label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 14}
                  textAnchor="middle"
                  className="fill-slate-600 font-mono text-[11px] font-semibold"
                >
                  {c.component}
                </text>
              </g>
            );
          })}

          {/* Cumulative Variance Line */}
          <path
            d={lineD}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cumulative Points */}
          {components.map((c, i) => {
            const cx = getBarX(i) + barWidth / 2;
            const cy = getRightY(c.cumulativeVariance);
            const isHovered = hoveredIdx === i;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 3.5}
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="transition-all"
              />
            );
          })}
        </svg>

        {/* Hovered Tooltip */}
        {hoveredIdx !== null && components[hoveredIdx] && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-1.5 rounded-md shadow-md text-xs font-mono flex items-center gap-3 backdrop-blur-xs">
            <span className="font-semibold text-blue-300">{components[hoveredIdx].component}</span>
            <span>Individual: {formatPercent(components[hoveredIdx].varianceExplained, 1)}</span>
            <span className="text-emerald-300">
              Cumulative: {formatPercent(components[hoveredIdx].cumulativeVariance, 1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
