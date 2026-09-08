'use client';

import React, { useState } from 'react';
import { TargetFactorExposures } from '@/analytics/factorAllocation';

interface FactorMatchBarChartProps {
  targetBetas: TargetFactorExposures;
  achievedBetas: TargetFactorExposures;
  height?: number;
}

export function FactorMatchBarChart({
  targetBetas,
  achievedBetas,
  height = 240,
}: FactorMatchBarChartProps) {
  const [hoverFactor, setHoverFactor] = useState<string | null>(null);

  const factors = [
    { id: 'mkt', name: 'Market (MKT-Rf)', target: targetBetas.mkt, achieved: achievedBetas.mkt },
    { id: 'smb', name: 'Size (SMB)', target: targetBetas.smb, achieved: achievedBetas.smb },
    { id: 'hml', name: 'Value (HML)', target: targetBetas.hml, achieved: achievedBetas.hml },
    { id: 'mom', name: 'Momentum (MOM)', target: targetBetas.mom, achieved: achievedBetas.mom },
  ];

  const width = 640;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Determine Y domain: typically -0.6 to +1.6
  const allVals = factors.flatMap((f) => [f.target, f.achieved]);
  const minVal = Math.min(-0.4, Math.floor(Math.min(...allVals) * 10) / 10 - 0.1);
  const maxVal = Math.max(1.2, Math.ceil(Math.max(...allVals) * 10) / 10 + 0.1);
  const valRange = maxVal - minVal || 1.0;

  const getY = (val: number) => padding.top + chartHeight * (1 - (val - minVal) / valRange);
  const zeroY = getY(0);

  const groupWidth = chartWidth / factors.length;
  const barWidth = Math.min(24, groupWidth * 0.28);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="text-xs font-semibold text-slate-800">
          Target vs. Achieved Systematic Factor Loadings
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-blue-600" />
            <span className="text-slate-600 font-medium">Target Exposure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-600" />
            <span className="text-slate-600 font-medium">Achieved Loading</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={'0 0 ' + width + ' ' + height}
        className="w-full select-none overflow-visible"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoverFactor(null)}
      >
        {/* Y-axis gridlines */}
        {[-0.4, 0.0, 0.4, 0.8, 1.2].map((tick) => {
          if (tick < minVal || tick > maxVal) return null;
          const y = getY(tick);
          const isZero = Math.abs(tick) < 0.01;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isZero ? '#94A3B8' : '#E2E8F0'}
                strokeWidth={isZero ? 1.5 : 1}
                strokeDasharray={isZero ? undefined : '3 3'}
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                fill={isZero ? '#0F172A' : '#64748B'}
                fontSize="10"
                fontWeight={isZero ? 'bold' : 'normal'}
                textAnchor="end"
                fontFamily="sans-serif"
              >
                {tick > 0 ? '+' : ''}{tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Factor Groups */}
        {factors.map((f, i) => {
          const groupCenterX = padding.left + i * groupWidth + groupWidth / 2;
          const targetBarX = groupCenterX - barWidth - 3;
          const achievedBarX = groupCenterX + 3;

          const targetY = getY(f.target);
          const targetH = Math.abs(targetY - zeroY);
          const targetTop = f.target >= 0 ? targetY : zeroY;

          const achievedY = getY(f.achieved);
          const achievedH = Math.abs(achievedY - zeroY);
          const achievedTop = f.achieved >= 0 ? achievedY : zeroY;

          const delta = Math.abs(f.achieved - f.target);
          const isHovered = hoverFactor === f.id;

          return (
            <g
              key={f.id}
              onMouseEnter={() => setHoverFactor(f.id)}
              className="cursor-pointer transition-opacity"
              opacity={hoverFactor && !isHovered ? 0.6 : 1.0}
            >
              {/* Target Bar */}
              <rect
                x={targetBarX}
                y={targetTop}
                width={barWidth}
                height={Math.max(1, targetH)}
                fill="#2563EB"
                rx="2"
              />
              {/* Target value label */}
              <text
                x={targetBarX + barWidth / 2}
                y={f.target >= 0 ? targetTop - 5 : targetTop + targetH + 11}
                fill="#1D4ED8"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {f.target.toFixed(2)}
              </text>

              {/* Achieved Bar */}
              <rect
                x={achievedBarX}
                y={achievedTop}
                width={barWidth}
                height={Math.max(1, achievedH)}
                fill="#059669"
                rx="2"
              />
              {/* Achieved value label */}
              <text
                x={achievedBarX + barWidth / 2}
                y={f.achieved >= 0 ? achievedTop - 5 : achievedTop + achievedH + 11}
                fill="#047857"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {f.achieved.toFixed(2)}
              </text>

              {/* X-axis factor label */}
              <text
                x={groupCenterX}
                y={height - 15}
                fill="#0F172A"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {f.name}
              </text>

              {/* Delta badge */}
              <text
                x={groupCenterX}
                y={height - 2}
                fill={delta < 0.05 ? '#059669' : delta < 0.15 ? '#D97706' : '#DC2626'}
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                Δ {delta.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}