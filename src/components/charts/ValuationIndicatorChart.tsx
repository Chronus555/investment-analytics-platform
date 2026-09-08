'use client';

import React, { useState, useRef } from 'react';
import { ValuationSignal, ValuationMetric } from '@/analytics/valuationAllocation';

interface ValuationIndicatorChartProps {
  signals: ValuationSignal[];
  metric: ValuationMetric;
  upperThreshold: number;
  lowerThreshold: number;
  height?: number;
}

export const ValuationIndicatorChart: React.FC<ValuationIndicatorChartProps> = ({
  signals,
  metric,
  upperThreshold,
  lowerThreshold,
  height = 300,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!signals || signals.length === 0) return null;

  const width = 800;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Values range
  const values = signals.map((s) => s.metricValue);
  const minVal = Math.min(...values, lowerThreshold) * 0.92;
  const maxVal = Math.max(...values, upperThreshold) * 1.08;
  const valRange = maxVal - minVal || 1;

  const getX = (i: number) => padding.left + (i / (signals.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - ((val - minVal) / valRange) * innerHeight;

  // SVG Path for metric series
  const linePoints = signals.map((s, i) => `${getX(i)},${getY(s.metricValue)}`).join(' ');

  // Y positions for thresholds
  const yUpper = getY(upperThreshold);
  const yLower = getY(lowerThreshold);

  // Background areas:
  // Overvalued zone
  const yTop = padding.top;
  const yBottom = padding.top + innerHeight;

  const activeSignal = hoverIndex !== null ? signals[hoverIndex] : signals[signals.length - 1];
  const activeX = hoverIndex !== null ? getX(hoverIndex) : getX(signals.length - 1);
  const activeY = hoverIndex !== null ? getY(activeSignal.metricValue) : getY(activeSignal.metricValue);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) * width;
    const clampedX = Math.max(padding.left, Math.min(width - padding.right, relX));
    const idx = Math.round(((clampedX - padding.left) / innerWidth) * (signals.length - 1));
    setHoverIndex(Math.max(0, Math.min(signals.length - 1, idx)));
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Y axis ticks (5 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((pct) => minVal + pct * valRange);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900">
              {metric === 'shiller_cape' ? 'Historical Shiller CAPE Ratio' : 'Equity Risk Premium (ERP Yield Gap)'}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                activeSignal.regime === 'overvalued'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : activeSignal.regime === 'undervalued'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              {activeSignal.regime === 'overvalued'
                ? 'Overvalued (De-risk)'
                : activeSignal.regime === 'undervalued'
                ? 'Undervalued (Risk-On)'
                : 'Fair Value'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {activeSignal.date}:{' '}
            <strong className="text-slate-800">
              {metric === 'shiller_cape'
                ? `${activeSignal.cape.toFixed(2)}x`
                : `${(activeSignal.erp * 100).toFixed(2)}%`}
            </strong>{' '}
            | Equity Target: <strong className="text-blue-600">{(activeSignal.targetEquityWeight * 100).toFixed(0)}%</strong>{' '}
            | Safe Buffer: <strong className="text-slate-600">{(activeSignal.targetSafeWeight * 100).toFixed(0)}%</strong>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block rounded-full" />
            <span>Valuation Multiplier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
            <span>Overvalued Barrier ({metric === 'shiller_cape' ? upperThreshold : `${(upperThreshold * 100).toFixed(1)}%`})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
            <span>Undervalued Barrier ({metric === 'shiller_cape' ? lowerThreshold : `${(lowerThreshold * 100).toFixed(1)}%`})</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Shaded Valuation Zones */}
          {/* Overvalued Zone (Top) */}
          <rect
            x={padding.left}
            y={Math.min(yTop, yUpper)}
            width={innerWidth}
            height={Math.max(0, yUpper - yTop)}
            fill="rgb(244, 63, 94)"
            fillOpacity={0.06}
          />

          {/* Undervalued Zone (Bottom) */}
          <rect
            x={padding.left}
            y={yLower}
            width={innerWidth}
            height={Math.max(0, yBottom - yLower)}
            fill="rgb(16, 185, 129)"
            fillOpacity={0.06}
          />

          {/* Grid lines */}
          {yTicks.map((tickVal, idx) => {
            const yPos = getY(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#94a3b8"
                >
                  {metric === 'shiller_cape' ? tickVal.toFixed(1) : `${(tickVal * 100).toFixed(1)}%`}
                </text>
              </g>
            );
          })}

          {/* Upper Threshold Line */}
          <line
            x1={padding.left}
            y1={yUpper}
            x2={width - padding.right}
            y2={yUpper}
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={width - padding.right - 4}
            y={yUpper - 5}
            textAnchor="end"
            fontSize="9"
            fontWeight="600"
            fill="#e11d48"
          >
            DE-RISK THRESHOLD ({metric === 'shiller_cape' ? upperThreshold : `${(upperThreshold * 100).toFixed(1)}%`})
          </text>

          {/* Lower Threshold Line */}
          <line
            x1={padding.left}
            y1={yLower}
            x2={width - padding.right}
            y2={yLower}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={width - padding.right - 4}
            y={yLower + 12}
            textAnchor="end"
            fontSize="9"
            fontWeight="600"
            fill="#059669"
          >
            BUY / RISK-ON THRESHOLD ({metric === 'shiller_cape' ? lowerThreshold : `${(lowerThreshold * 100).toFixed(1)}%`})
          </text>

          {/* Metric Time Series Line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linePoints}
          />

          {/* Year Markers on X-Axis */}
          {signals.map((s, i) => {
            if (s.date.endsWith('-01-01') && parseInt(s.date.split('-')[0], 10) % 2 === 0) {
              const xPos = getX(i);
              return (
                <g key={s.date}>
                  <line x1={xPos} y1={yBottom} x2={xPos} y2={yBottom + 4} stroke="#cbd5e1" strokeWidth="1" />
                  <text
                    x={xPos}
                    y={yBottom + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="monospace"
                    fill="#64748b"
                  >
                    {s.date.split('-')[0]}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Active Hover / Crosshair */}
          <line
            x1={activeX}
            y1={padding.top}
            x2={activeX}
            y2={yBottom}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx={activeX}
            cy={activeY}
            r="4.5"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="2"
            className="drop-shadow-xs"
          />
        </svg>
      </div>
    </div>
  );
};
