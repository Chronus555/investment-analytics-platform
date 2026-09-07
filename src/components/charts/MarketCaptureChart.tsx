'use client';

import React from 'react';

interface MarketCaptureChartProps {
  upCapture: number;
  downCapture: number;
  captureRatio: number;
}

export function MarketCaptureChart({
  upCapture,
  downCapture,
  captureRatio,
}: MarketCaptureChartProps) {
  const maxVal = Math.max(120, upCapture, downCapture, 100) * 1.15;

  const upWidth = Math.min(100, Math.max(5, (upCapture / maxVal) * 100));
  const downWidth = Math.min(100, Math.max(5, (downCapture / maxVal) * 100));
  const parityX = (100 / maxVal) * 100;

  const isFavorable = upCapture > downCapture;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">Market Capture Profile</span>
        <div
          className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${
            isFavorable
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {isFavorable ? 'Asymmetric Upside' : 'Downside Vulnerable'} ({captureRatio.toFixed(2)}x)
        </div>
      </div>

      {/* Up Capture Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-600 font-medium">Up-Market Capture</span>
          <span className="font-bold text-slate-900">{upCapture.toFixed(1)}%</span>
        </div>
        <div className="w-full h-7 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200/70 flex items-center">
          <div
            className="h-full bg-blue-600 rounded-xs transition-all duration-500"
            style={{ width: `${upWidth}%` }}
          />
          {/* Parity 100% indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
            style={{ left: `${parityX}%` }}
          />
        </div>
      </div>

      {/* Down Capture Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-600 font-medium">Down-Market Capture</span>
          <span
            className={`font-bold ${
              downCapture <= 100 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {downCapture.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-7 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200/70 flex items-center">
          <div
            className={`h-full rounded-xs transition-all duration-500 ${
              downCapture <= 100 ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${downWidth}%` }}
          />
          {/* Parity 100% indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
            style={{ left: `${parityX}%` }}
          />
        </div>
      </div>

      {/* Legend / Baseline */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-0.5 bg-slate-400" />
          <span>100% = Benchmark Parity</span>
        </div>
        <span>
          Spread: {(upCapture - downCapture >= 0 ? '+' : '')}
          {(upCapture - downCapture).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
