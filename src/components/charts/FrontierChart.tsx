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

  const minVol = Math.max(0, Math.min(...allVols) * 0.85);
  const maxVol = Math.max(...allVols) * 1.12;
  const minRet = Math.min(...allRets) * 0.85;
  const maxRet = Math.max(...allRets) * 1.12;

  const width = 480;
  const height = 300;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 24;
  const padBottom = 36;

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
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs max-w-full overflow-hidden">
      <div className="mb-3">
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
          Markowitz Efficient Frontier
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Optimal risk/return curve with Tangency and Minimum Variance portfolios
        </p>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none block"
        >
          {/* Y Grid lines & tick labels */}
          {[minRet, (minRet + maxRet) / 2, maxRet].map((r, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={getY(r)}
                x2={width - padRight}
                y2={getY(r)}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 6}
                y={getY(r) + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
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
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={getX(v)}
                y={height - 12}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {(v * 100).toFixed(1)}%
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          <text
            x={width / 2}
            y={height - 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="600"
          >
            Annualized Volatility (Risk)
          </text>
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="600"
            transform={`rotate(-90 12 ${height / 2})`}
          >
            Expected Return
          </text>

          {/* Frontier Curve */}
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

          {/* Individual Assets */}
          {individualAssets.map((asset) => (
            <g key={asset.symbol}>
              <circle
                cx={getX(asset.volatility)}
                cy={getY(asset.return)}
                r="3"
                fill="#64748b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={getX(asset.volatility) + 4}
                y={getY(asset.return) + 3}
                fill="#475569"
                fontSize="9"
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
              r="3.5"
              fill="#2563eb"
              className="cursor-pointer hover:scale-125 transition-all"
              onMouseEnter={() => setHoverPoint(pt)}
              onClick={() => setHoverPoint(pt)}
            />
          ))}

          {/* Minimum Variance Portfolio */}
          {minVarPortfolio && (
            <g>
              <circle
                cx={getX(minVarPortfolio.volatility)}
                cy={getY(minVarPortfolio.return)}
                r="5.5"
                fill="#d97706"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={getX(minVarPortfolio.volatility) - 6}
                y={getY(minVarPortfolio.return) - 8}
                fill="#b45309"
                fontSize="10"
                fontWeight="bold"
                textAnchor="end"
              >
                Min Var
              </text>
            </g>
          )}

          {/* Max Sharpe Portfolio (Tangency) */}
          {maxSharpePortfolio && (
            <g>
              <circle
                cx={getX(maxSharpePortfolio.volatility)}
                cy={getY(maxSharpePortfolio.return)}
                r="5.5"
                fill="#16a34a"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={getX(maxSharpePortfolio.volatility) + 6}
                y={getY(maxSharpePortfolio.return) - 8}
                fill="#15803d"
                fontSize="10"
                fontWeight="bold"
              >
                Max Sharpe
              </text>
            </g>
          )}
        </svg>

        {/* Responsive Hover/Selected Point Inspector */}
        {hoverPoint && (
          <div className="mt-3 sm:mt-0 sm:absolute sm:top-2 sm:right-2 bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs sm:w-56 z-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2">
              <span className="font-semibold text-blue-700">Point Details</span>
              <button
                type="button"
                onClick={() => setHoverPoint(null)}
                className="text-slate-400 hover:text-slate-700 sm:hidden cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Exp. Return:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {(hoverPoint.return * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Annual Vol:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {(hoverPoint.volatility * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sharpe Ratio:</span>
                <span className="font-mono font-semibold text-blue-600">
                  {hoverPoint.sharpeRatio.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                Weights
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {Object.entries(hoverPoint.weights)
                  .filter(([_, w]) => w > 0.001)
                  .map(([sym, w]) => (
                    <span
                      key={sym}
                      className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                    >
                      {sym}: {(w * 100).toFixed(0)}%
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
