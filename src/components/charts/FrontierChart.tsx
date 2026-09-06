'use client';

import React, { useState } from 'react';
import { EfficientFrontierPoint } from '@/analytics/optimization';

interface FrontierChartProps {
  frontier: EfficientFrontierPoint[];
  currentPortfolio?: { return: number; volatility: number; name: string };
  maxSharpePortfolio?: EfficientFrontierPoint;
  minVarPortfolio?: EfficientFrontierPoint;
  individualAssets?: { symbol: string; return: number; volatility: number }[];
  height?: number;
}

export function FrontierChart({
  frontier,
  currentPortfolio,
  maxSharpePortfolio,
  minVarPortfolio,
  individualAssets = [],
  height = 360,
}: FrontierChartProps) {
  const [hoverPoint, setHoverPoint] = useState<EfficientFrontierPoint | null>(null);

  if (!frontier || frontier.length === 0) return null;

  // Find min/max bounds
  const allVols = [
    ...frontier.map((p) => p.volatility),
    ...individualAssets.map((a) => a.volatility),
    currentPortfolio?.volatility || 0.1,
  ].filter((v) => v > 0);

  const allRets = [
    ...frontier.map((p) => p.return),
    ...individualAssets.map((a) => a.return),
    currentPortfolio?.return || 0.05,
  ];

  const minVol = Math.max(0, Math.min(...allVols) * 0.8);
  const maxVol = Math.max(...allVols) * 1.15;
  const minRet = Math.min(...allRets) * 0.8;
  const maxRet = Math.max(...allRets) * 1.15;

  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const width = 800;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (vol: number) => {
    return padLeft + ((vol - minVol) / (maxVol - minVol || 1)) * plotW;
  };

  const getY = (ret: number) => {
    return padTop + (1 - (ret - minRet) / (maxRet - minRet || 1)) * plotH;
  };

  // Line path
  const linePath = frontier
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(pt.volatility).toFixed(1)} ${getY(pt.return).toFixed(1)}`)
    .join(' ');

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Markowitz Efficient Frontier</h3>
          <p className="text-xs text-slate-500 mt-0.5">Optimal risk/return curve with Tangency and Minimum Variance portfolios</p>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {/* Grid lines */}
          {[minRet, (minRet + maxRet) / 2, maxRet].map((r, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={getY(r)}
                x2={width - padRight}
                y2={getY(r)}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x={padLeft - 8} y={getY(r) + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                {(r * 100).toFixed(1)}%
              </text>
            </g>
          ))}

          {/* X Grid & Axis */}
          {[minVol, (minVol + maxVol) / 2, maxVol].map((v, i) => (
            <g key={i}>
              <line
                x1={getX(v)}
                y1={padTop}
                x2={getX(v)}
                y2={height - padBottom}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x={getX(v)} y={height - 15} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                {(v * 100).toFixed(1)}%
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          <text x={width / 2} y={height - 2} textAnchor="middle" fill="#475569" fontSize="11" fontWeight="500">
            Annualized Volatility (Risk)
          </text>
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            fill="#475569"
            fontSize="11"
            fontWeight="500"
            transform={`rotate(-90 15 ${height / 2})`}
          >
            Expected Return
          </text>

          {/* Frontier Curve */}
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" />

          {/* Individual Assets */}
          {individualAssets.map((asset) => (
            <g key={asset.symbol}>
              <circle
                cx={getX(asset.volatility)}
                cy={getY(asset.return)}
                r="4"
                fill="#64748b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={getX(asset.volatility) + 6}
                y={getY(asset.return) + 3}
                fill="#475569"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="500"
              >
                {asset.symbol}
              </text>
            </g>
          ))}

          {/* Interactive Frontier Points */}
          {frontier.map((pt, i) => (
            <circle
              key={i}
              cx={getX(pt.volatility)}
              cy={getY(pt.return)}
              r="4"
              fill="#3b82f6"
              className="cursor-pointer hover:scale-125 transition-all"
              onMouseEnter={() => setHoverPoint(pt)}
            />
          ))}

          {/* Minimum Variance Portfolio */}
          {minVarPortfolio && (
            <g>
              <circle
                cx={getX(minVarPortfolio.volatility)}
                cy={getY(minVarPortfolio.return)}
                r="7"
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={getX(minVarPortfolio.volatility) - 10}
                y={getY(minVarPortfolio.return) - 10}
                fill="#d97706"
                fontSize="11"
                fontWeight="bold"
              >
                Min Variance
              </text>
            </g>
          )}

          {/* Max Sharpe Portfolio (Tangency) */}
          {maxSharpePortfolio && (
            <g>
              <circle
                cx={getX(maxSharpePortfolio.volatility)}
                cy={getY(maxSharpePortfolio.return)}
                r="7"
                fill="#10b981"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={getX(maxSharpePortfolio.volatility) + 10}
                y={getY(maxSharpePortfolio.return) - 10}
                fill="#059669"
                fontSize="11"
                fontWeight="bold"
              >
                Max Sharpe (Tangency)
              </text>
            </g>
          )}

          {/* Current Portfolio */}
          {currentPortfolio && (
            <g>
              <circle
                cx={getX(currentPortfolio.volatility)}
                cy={getY(currentPortfolio.return)}
                r="7"
                fill="#ec4899"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={getX(currentPortfolio.volatility) + 10}
                y={getY(currentPortfolio.return) + 15}
                fill="#db2777"
                fontSize="11"
                fontWeight="bold"
              >
                Current Portfolio
              </text>
            </g>
          )}
        </svg>

        {/* Hover Inspector Card */}
        {hoverPoint && (
          <div className="absolute top-4 right-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg text-xs z-20 w-64">
            <div className="font-semibold text-blue-700 border-b border-slate-100 pb-1 mb-2">
              Frontier Portfolio Details
            </div>
            <div className="space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Return:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {(hoverPoint.return * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Annual Volatility:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {(hoverPoint.volatility * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sharpe Ratio:</span>
                <span className="font-mono font-semibold text-blue-700">
                  {hoverPoint.sharpeRatio.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <div className="text-[11px] font-medium text-slate-500 mb-1">Asset Allocation:</div>
              <div className="space-y-0.5 max-h-28 overflow-y-auto">
                {Object.entries(hoverPoint.weights)
                  .filter(([_, w]) => w > 0.001)
                  .map(([sym, w]) => (
                    <div key={sym} className="flex justify-between text-[11px]">
                      <span className="text-slate-700 font-medium">{sym}:</span>
                      <span className="font-mono text-slate-900">
                        {(w * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
