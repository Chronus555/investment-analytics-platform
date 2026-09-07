'use client';

import React, { useState, useMemo } from 'react';
import { RebalanceEvent } from '@/analytics/walkForwardOptimization';
import { formatRatio } from '@/utils/formatters';

interface WalkForwardDecayChartProps {
  events: RebalanceEvent[];
  height?: number;
}

export function WalkForwardDecayChart({
  events,
  height = 280,
}: WalkForwardDecayChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const {
    ptsIs,
    ptsOos,
    minY,
    maxY,
    width,
    innerHeight,
    padding,
    svgIs,
    svgOos,
  } = useMemo(() => {
    const width = 800;
    const chartHeight = height - 40;
    const padding = { top: 15, right: 25, bottom: 25, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    if (!events || events.length === 0) {
      return {
        ptsIs: [],
        ptsOos: [],
        minY: -1,
        maxY: 2,
        width,
        innerHeight,
        padding,
        svgIs: '',
        svgOos: '',
      };
    }

    const allSharpes: number[] = [];
    events.forEach((e) => {
      allSharpes.push(e.inSampleSharpe);
      allSharpes.push(e.outOfSampleSharpe);
    });

    const rawMin = Math.min(...allSharpes);
    const rawMax = Math.max(...allSharpes);

    const minY = Math.min(-0.5, Math.floor(rawMin * 1.2));
    const maxY = Math.max(1.5, Math.ceil(rawMax * 1.2));

    function getY(val: number) {
      const clamped = Math.max(minY, Math.min(maxY, val));
      return padding.top + innerHeight * (1 - (clamped - minY) / (maxY - minY || 1));
    }

    const n = events.length;
    const isPts = events.map((e, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(e.inSampleSharpe),
      val: e.inSampleSharpe,
      date: e.date,
    }));

    const oosPts = events.map((e, i) => ({
      x: padding.left + (i / (n - 1 || 1)) * innerWidth,
      y: getY(e.outOfSampleSharpe),
      val: e.outOfSampleSharpe,
      date: e.date,
    }));

    return {
      ptsIs: isPts,
      ptsOos: oosPts,
      minY,
      maxY,
      width,
      innerHeight,
      padding,
      svgIs: isPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      svgOos: oosPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    };
  }, [events, height]);

  const activeIdx = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < events.length ? hoverIndex : null;
  const activeEvent = activeIdx !== null ? events[activeIdx] : null;
  const activeIs = activeIdx !== null ? ptsIs[activeIdx] : null;
  const activeOos = activeIdx !== null ? ptsOos[activeIdx] : null;

  // Zero reference line
  const zeroY = useMemo(() => {
    if (minY <= 0 && maxY >= 0) {
      return padding.top + innerHeight * (1 - (0 - minY) / (maxY - minY));
    }
    return null;
  }, [minY, maxY, padding, innerHeight]);

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-purple-600 border-dashed border-t border-purple-600" />
            <span className="font-medium text-slate-700">In-Sample Expected Sharpe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 rounded-full" />
            <span className="font-medium text-slate-900">Out-of-Sample Realized Sharpe</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          SHARPE EFFICIENCY GAP (OVERFITTING TAX)
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
            const idx = Math.round(frac * (events.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Gridlines */}
          {[-1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5].map((val) => {
            if (val < minY || val > maxY) return null;
            const y = padding.top + innerHeight * (1 - (val - minY) / (maxY - minY));
            return (
              <g key={val}>
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
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Zero reference line */}
          {zeroY !== null && (
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="#94A3B8"
              strokeWidth="1.2"
            />
          )}

          {/* Decay Area fill between In-Sample and Out-of-Sample */}
          {ptsIs.length > 1 &&
            ptsIs.map((pt, i) => {
              if (i === ptsIs.length - 1) return null;
              const nextPt = ptsIs[i + 1];
              const oosPt = ptsOos[i];
              const nextOosPt = ptsOos[i + 1];
              const poly = `${pt.x},${pt.y} ${nextPt.x},${nextPt.y} ${nextOosPt.x},${nextOosPt.y} ${oosPt.x},${oosPt.y}`;
              const isOverfit = pt.val > oosPt.val;
              return (
                <polygon
                  key={i}
                  points={poly}
                  fill={isOverfit ? '#F43F5E' : '#10B981'}
                  opacity={0.12}
                />
              );
            })}

          {/* In-Sample Line (Dashed Purple) */}
          {svgIs && (
            <polyline
              fill="none"
              stroke="#9333EA"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgIs}
            />
          )}

          {/* Out-of-Sample Line (Solid Blue) */}
          {svgOos && (
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgOos}
            />
          )}

          {/* Point markers */}
          {ptsOos.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="2.5"
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          ))}

          {/* X Axis Date Labels */}
          {(() => {
            const step = Math.max(1, Math.floor(events.length / 7));
            return (
              <g>
                {events.map((e, i) => {
                  if (i % step !== 0 && i !== events.length - 1) return null;
                  const x = padding.left + (i / (events.length - 1)) * (width - padding.left - padding.right);
                  return (
                    <g key={i}>
                      <line
                        x1={x}
                        y1={padding.top + innerHeight}
                        x2={x}
                        y2={padding.top + innerHeight + 4}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={padding.top + innerHeight + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-mono"
                      >
                        {e.date.substring(0, 7)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Active Crosshair */}
          {activeEvent && activeIs && activeOos && (
            <g>
              <line
                x1={activeIs.x}
                y1={padding.top}
                x2={activeIs.x}
                y2={padding.top + innerHeight}
                stroke="#64748B"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle cx={activeIs.x} cy={activeIs.y} r="4" fill="#9333EA" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx={activeOos.x} cy={activeOos.y} r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Box */}
        {activeEvent && activeIs && activeOos && (
          <div
            className="pointer-events-none absolute top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs z-10"
            style={{
              left:
                activeIdx! > events.length / 2
                  ? Math.max(8, (activeIdx! / events.length) * 100 - 32) + '%'
                  : Math.min(70, (activeIdx! / events.length) * 100 + 2) + '%',
            }}
          >
            <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1 font-mono">
              Rebalance #{activeEvent.rebalanceIndex} ({activeEvent.date})
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
              <span className="text-purple-600 font-medium">IS Expected Sharpe:</span>
              <span className="font-semibold text-slate-900 text-right">
                {formatRatio(activeEvent.inSampleSharpe, 2)}
              </span>

              <span className="text-blue-600 font-medium">OOS Realized Sharpe:</span>
              <span className="font-semibold text-slate-900 text-right">
                {formatRatio(activeEvent.outOfSampleSharpe, 2)}
              </span>

              <span className="text-slate-500 pt-1 border-t border-slate-100">Overfitting Gap:</span>
              <span
                className={`font-semibold pt-1 border-t border-slate-100 text-right ${
                  activeEvent.outOfSampleSharpe >= activeEvent.inSampleSharpe
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {formatRatio(activeEvent.outOfSampleSharpe - activeEvent.inSampleSharpe, 2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
