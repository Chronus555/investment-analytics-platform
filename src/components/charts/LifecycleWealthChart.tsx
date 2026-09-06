'use client';

import React, { useState } from 'react';
import { PercentileAgePoint } from '@/analytics/retirement';

interface LifecycleWealthChartProps {
  trajectories: PercentileAgePoint[];
  retirementAge: number;
  socialSecurityAge?: number;
}

export const LifecycleWealthChart: React.FC<LifecycleWealthChartProps> = ({
  trajectories,
  retirementAge,
  socialSecurityAge = 67,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!trajectories || trajectories.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No simulation data available.
      </div>
    );
  }

  // Dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 24, right: 30, bottom: 40, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max wealth for scaling
  const maxWealth = Math.max(...trajectories.map((t) => t.p90), 100000);
  const minAge = trajectories[0].age;
  const maxAge = trajectories[trajectories.length - 1].age;
  const ageSpan = Math.max(1, maxAge - minAge);

  const getX = (age: number) => padding.left + ((age - minAge) / ageSpan) * chartW;
  const getY = (val: number) => padding.top + chartH - (Math.max(0, val) / maxWealth) * chartH;

  // Helper to format currency ($1.2M, $450k)
  const formatCur = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${Math.round(val)}`;
  };

  // Build SVG path for median line
  const p50Points = trajectories.map((t) => `${getX(t.age).toFixed(1)},${getY(t.p50).toFixed(1)}`);
  const p50Path = `M ${p50Points.join(' L ')}`;

  // Build ribbon area for p10 to p90
  const upperPoints = trajectories.map((t) => `${getX(t.age).toFixed(1)},${getY(t.p90).toFixed(1)}`);
  const lowerPoints = [...trajectories].reverse().map((t) => `${getX(t.age).toFixed(1)},${getY(t.p10).toFixed(1)}`);
  const ribbonPath = `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;

  // Grid tick values
  const yTicks = [0, maxWealth * 0.25, maxWealth * 0.5, maxWealth * 0.75, maxWealth];
  const ageStep = Math.ceil(ageSpan / 6 / 5) * 5 || 5;
  const xTicks: number[] = [];
  for (let a = minAge; a <= maxAge; a += ageStep) {
    xTicks.push(a);
  }
  if (!xTicks.includes(maxAge)) xTicks.push(maxAge);

  // Active point inspector
  const activePoint = hoveredIdx !== null ? trajectories[hoveredIdx] : trajectories[Math.floor(trajectories.length / 2)];

  return (
    <div className="w-full space-y-3">
      {/* Legend & Milestone Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/20 border border-blue-500" />
            <span className="text-slate-600 font-medium">10th–90th Percentile Band</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 rounded-full" />
            <span className="text-slate-900 font-semibold">Median (p50)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Retire: Age {retirementAge}</span>
          </span>
          {socialSecurityAge && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>SS: Age {socialSecurityAge}</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y-axis grid lines & labels */}
          {yTicks.map((val, i) => {
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
                  {formatCur(val)}
                </text>
              </g>
            );
          })}

          {/* X-axis age grid & labels */}
          {xTicks.map((age, i) => {
            const x = getX(age);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartH}
                  stroke="#F1F5F9"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  Age {age}
                </text>
              </g>
            );
          })}

          {/* Retirement Age Vertical Marker */}
          {retirementAge >= minAge && retirementAge <= maxAge && (
            <g>
              <line
                x1={getX(retirementAge)}
                y1={padding.top}
                x2={getX(retirementAge)}
                y2={padding.top + chartH}
                stroke="#D97706"
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />
              <text
                x={getX(retirementAge)}
                y={padding.top - 6}
                textAnchor="middle"
                className="fill-amber-700 text-[9px] font-semibold"
              >
                Retire ({retirementAge})
              </text>
            </g>
          )}

          {/* Social Security Age Vertical Marker */}
          {socialSecurityAge >= minAge && socialSecurityAge <= maxAge && (
            <g>
              <line
                x1={getX(socialSecurityAge)}
                y1={padding.top}
                x2={getX(socialSecurityAge)}
                y2={padding.top + chartH}
                stroke="#10B981"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            </g>
          )}

          {/* Confidence Ribbon (p10 to p90) */}
          <path
            d={ribbonPath}
            fill="rgb(37, 99, 235)"
            fillOpacity={0.12}
          />

          {/* Median Line */}
          <path
            d={p50Path}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active / Hover point crosshair */}
          {activePoint && (
            <g>
              <line
                x1={getX(activePoint.age)}
                y1={padding.top}
                x2={getX(activePoint.age)}
                y2={padding.top + chartH}
                stroke="#64748B"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              <circle
                cx={getX(activePoint.age)}
                cy={getY(activePoint.p50)}
                r={4.5}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <circle
                cx={getX(activePoint.age)}
                cy={getY(activePoint.p90)}
                r={3}
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <circle
                cx={getX(activePoint.age)}
                cy={getY(activePoint.p10)}
                r={3}
                fill="#DC2626"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            </g>
          )}

          {/* Transparent click/hover targets across age columns */}
          {trajectories.map((t, idx) => {
            const x = getX(t.age);
            const colW = chartW / trajectories.length;
            return (
              <rect
                key={idx}
                x={x - colW / 2}
                y={padding.top}
                width={colW}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Docked Inspector Card */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
          <div className="font-semibold text-slate-800">
            Age {activePoint.age}{' '}
            <span className="font-normal text-slate-500">
              ({activePoint.age < retirementAge ? 'Accumulation Phase' : 'Retirement Decumulation'})
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="text-slate-600">
              p10:{' '}
              <strong className="text-red-600 font-semibold">{formatCur(activePoint.p10)}</strong>
            </span>
            <span className="text-slate-700">
              Median:{' '}
              <strong className="text-blue-600 font-semibold">{formatCur(activePoint.p50)}</strong>
            </span>
            <span className="text-slate-600">
              p90:{' '}
              <strong className="text-emerald-600 font-semibold">{formatCur(activePoint.p90)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
