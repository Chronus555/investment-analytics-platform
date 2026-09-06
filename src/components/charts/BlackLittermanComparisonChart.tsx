'use client';

import React from 'react';

interface BlackLittermanComparisonChartProps {
  symbols: string[];
  impliedReturns: Record<string, number>;
  posteriorReturns: Record<string, number>;
}

export const BlackLittermanComparisonChart: React.FC<BlackLittermanComparisonChartProps> = ({
  symbols,
  impliedReturns,
  posteriorReturns,
}) => {
  if (!symbols || symbols.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
        No asset data available.
      </div>
    );
  }

  const width = 600;
  const height = 260;
  const padding = { top: 20, right: 25, bottom: 45, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find return range
  const allVals = symbols.flatMap((s) => [impliedReturns[s] ?? 0, posteriorReturns[s] ?? 0]);
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(0.12, ...allVals);
  const range = maxVal - minVal || 0.1;

  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;
  const zeroY = getY(0);

  const groupWidth = chartW / symbols.length;
  const barWidth = Math.min(18, (groupWidth - 16) / 2);

  const formatPct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="w-full space-y-2.5">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
            <span className="text-slate-600 font-medium">Implied Equilibrium Return (Π)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            <span className="text-slate-900 font-semibold">Posterior BL Return (μ_BL)</span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          BAYESIAN TILT COMPARISON
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block select-none">
          {/* Y Axis Grid & Labels */}
          {[minVal, minVal + range * 0.33, minVal + range * 0.66, maxVal].map((val, i) => {
            const y = getY(val);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {formatPct(val)}
                </text>
              </g>
            );
          })}

          {/* Zero baseline */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#94A3B8"
            strokeWidth={1}
          />

          {/* Bars per symbol */}
          {symbols.map((sym, idx) => {
            const groupCenterX = padding.left + idx * groupWidth + groupWidth / 2;
            const impRet = impliedReturns[sym] ?? 0;
            const postRet = posteriorReturns[sym] ?? 0;

            const impBarH = Math.abs(getY(impRet) - zeroY);
            const impBarY = impRet >= 0 ? getY(impRet) : zeroY;

            const postBarH = Math.abs(getY(postRet) - zeroY);
            const postBarY = postRet >= 0 ? getY(postRet) : zeroY;

            const bar1X = groupCenterX - barWidth - 1.5;
            const bar2X = groupCenterX + 1.5;

            return (
              <g key={sym} className="hover:opacity-90">
                {/* Implied Return Bar */}
                <rect
                  x={bar1X}
                  y={impBarY}
                  width={barWidth}
                  height={Math.max(1, impBarH)}
                  fill="#94A3B8"
                  rx={2}
                />

                {/* Posterior Return Bar */}
                <rect
                  x={bar2X}
                  y={postBarY}
                  width={barWidth}
                  height={Math.max(1, postBarH)}
                  fill="#2563EB"
                  rx={2}
                />

                {/* X Axis Symbol Label */}
                <text
                  x={groupCenterX}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-800 text-[11px] font-bold font-mono"
                >
                  {sym}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
