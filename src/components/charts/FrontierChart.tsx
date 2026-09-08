'use client';

import React, { useState } from 'react';
import { EfficientFrontierPoint } from '@/analytics/optimization';

export interface LandmarkPortfolio {
  id: string;
  name: string;
  shortName: string;
  color: string;
  return: number;
  volatility: number;
  sharpe: number;
  weights?: Record<string, number>;
}

interface FrontierChartProps {
  frontier: EfficientFrontierPoint[];
  currentPortfolio?: { return: number; volatility: number; name: string };
  maxSharpePortfolio?: EfficientFrontierPoint;
  minVarPortfolio?: EfficientFrontierPoint;
  landmarkPortfolios?: LandmarkPortfolio[];
  individualAssets?: { symbol: string; return: number; volatility: number }[];
  height?: number;
}

export function FrontierChart({
  frontier,
  currentPortfolio,
  maxSharpePortfolio,
  minVarPortfolio,
  landmarkPortfolios,
  individualAssets = [],
}: FrontierChartProps) {
  const [hoverPoint, setHoverPoint] = useState<{
    return: number;
    volatility: number;
    sharpeRatio: number;
    name?: string;
    weights?: Record<string, number>;
  } | null>(null);

  if (!frontier || frontier.length === 0) return null;

  // Find min/max bounds
  const allVols = [
    ...frontier.map((p) => p.volatility),
    ...individualAssets.map((a) => a.volatility),
    ...(landmarkPortfolios || []).map((l) => l.volatility),
    currentPortfolio?.volatility || 0.1,
  ].filter((v) => v > 0);

  const allRets = [
    ...frontier.map((p) => p.return),
    ...individualAssets.map((a) => a.return),
    ...(landmarkPortfolios || []).map((l) => l.return),
    currentPortfolio?.return || 0.05,
  ];

  const minVol = Math.max(0, Math.min(...allVols) * 0.85);
  const maxVol = Math.max(...allVols) * 1.12;
  const minRet = Math.min(...allRets) * 0.85;
  const maxRet = Math.max(...allRets) * 1.12;

  const width = 520;
  const height = 320;
  const padLeft = 48;
  const padRight = 24;
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
          Markowitz Efficient Frontier &amp; Landmark Portfolios
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Risk/return geometry showing Tangency, Minimum Variance, Risk Parity, Choueifaty MDP, Min CVaR, Sortino, and Kelly models
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

          {/* X Grid lines & tick labels */}
          {[minVol, (minVol + maxVol) / 2, maxVol].map((v, i) => (
            <g key={i}>
              <line
                x1={getX(v)}
                y1={padTop}
                x2={getX(v)}
                y2={padTop + plotH}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={getX(v)}
                y={padTop + plotH + 16}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {(v * 100).toFixed(1)}%
              </text>
            </g>
          ))}

          {/* X Axis Label */}
          <text
            x={padLeft + plotW / 2}
            y={height - 6}
            textAnchor="middle"
            fill="#475569"
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            Annualized Volatility (Risk)
          </text>

          {/* Y Axis Label */}
          <text
            x={14}
            y={padTop + plotH / 2}
            textAnchor="middle"
            fill="#475569"
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="600"
            transform={`rotate(-90 14 ${padTop + plotH / 2})`}
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
                fill="#94a3b8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={getX(asset.volatility) + 4}
                y={getY(asset.return) + 3}
                fill="#64748b"
                fontSize="8.5"
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
              fill="#3b82f6"
              className="cursor-pointer hover:scale-125 transition-all"
              onMouseEnter={() =>
                setHoverPoint({
                  name: `Frontier Point #${i + 1}`,
                  return: pt.return,
                  volatility: pt.volatility,
                  sharpeRatio: pt.sharpeRatio,
                  weights: pt.weights,
                })
              }
              onClick={() =>
                setHoverPoint({
                  name: `Frontier Point #${i + 1}`,
                  return: pt.return,
                  volatility: pt.volatility,
                  sharpeRatio: pt.sharpeRatio,
                  weights: pt.weights,
                })
              }
            />
          ))}

          {/* Landmark Portfolios (If Provided) */}
          {landmarkPortfolios && landmarkPortfolios.length > 0 ? (
            landmarkPortfolios.map((lm) => (
              <g
                key={lm.id}
                className="cursor-pointer hover:opacity-90"
                onMouseEnter={() =>
                  setHoverPoint({
                    name: lm.name,
                    return: lm.return,
                    volatility: lm.volatility,
                    sharpeRatio: lm.sharpe,
                    weights: lm.weights,
                  })
                }
                onClick={() =>
                  setHoverPoint({
                    name: lm.name,
                    return: lm.return,
                    volatility: lm.volatility,
                    sharpeRatio: lm.sharpe,
                    weights: lm.weights,
                  })
                }
              >
                <circle
                  cx={getX(lm.volatility)}
                  cy={getY(lm.return)}
                  r="6"
                  fill={lm.color}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={getX(lm.volatility) + 8}
                  y={getY(lm.return) - 4}
                  fill={lm.color}
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {lm.shortName}
                </text>
              </g>
            ))
          ) : (
            <>
              {/* Fallback Min Var */}
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

              {/* Fallback Max Sharpe */}
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
            </>
          )}
        </svg>

        {/* Responsive Hover/Selected Point Inspector */}
        {hoverPoint && (
          <div className="mt-3 sm:mt-0 sm:absolute sm:top-2 sm:right-2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-3 shadow-md text-xs sm:w-56 z-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2">
              <span className="font-semibold text-blue-700">
                {hoverPoint.name || 'Point Details'}
              </span>
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
                <span className="font-mono font-medium text-slate-800">
                  {(hoverPoint.return * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Volatility:</span>
                <span className="font-mono font-medium text-slate-800">
                  {(hoverPoint.volatility * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sharpe:</span>
                <span className="font-mono font-medium text-blue-600">
                  {hoverPoint.sharpeRatio.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Weights Preview if available */}
            {hoverPoint.weights && (
              <div className="border-t border-slate-100 pt-1.5 space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Top Holdings
                </div>
                {Object.entries(hoverPoint.weights)
                  .filter(([, w]) => w > 0.01)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([sym, w]) => (
                    <div key={sym} className="flex justify-between text-[11px]">
                      <span className="font-mono text-slate-600">{sym}</span>
                      <span className="font-mono text-slate-800">
                        {(w * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual Model Chips Legend */}
      {landmarkPortfolios && landmarkPortfolios.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {landmarkPortfolios.map((lm) => (
            <div
              key={lm.id}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-medium"
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: lm.color }} />
              <span className="text-slate-700">{lm.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
