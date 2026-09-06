'use client';

import React from 'react';

export interface PortfolioPreset {
  id: string;
  name: string;
  description: string;
  assets: { symbol: string; weight: number }[];
}

export const PORTFOLIO_PRESETS: PortfolioPreset[] = [
  {
    id: 'classic-60-40',
    name: 'Classic 60/40',
    description: 'Bogleheads traditional balanced equity & bond allocation',
    assets: [
      { symbol: 'SPY', weight: 60 },
      { symbol: 'BND', weight: 40 },
    ],
  },
  {
    id: 'ivy-portfolio',
    name: 'Ivy Portfolio',
    description: 'Equal 20% exposure across US stocks, international, bonds, real estate, and gold',
    assets: [
      { symbol: 'VTI', weight: 20 },
      { symbol: 'VXUS', weight: 20 },
      { symbol: 'BND', weight: 20 },
      { symbol: 'VNQ', weight: 20 },
      { symbol: 'GLD', weight: 20 },
    ],
  },
  {
    id: 'permanent-portfolio',
    name: 'Permanent Portfolio',
    description: 'Designed for resilience across prosperity, deflation, recession, and inflation',
    assets: [
      { symbol: 'VTI', weight: 25 },
      { symbol: 'TLT', weight: 25 },
      { symbol: 'GLD', weight: 25 },
      { symbol: 'BIL', weight: 25 },
    ],
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    description: 'Risk-balanced portfolio designed to weather all economic regimes',
    assets: [
      { symbol: 'VTI', weight: 30 },
      { symbol: 'TLT', weight: 40 },
      { symbol: 'BND', weight: 15 },
      { symbol: 'GLD', weight: 15 },
    ],
  },
  {
    id: 'core-four',
    name: 'Core Four',
    description: 'Total market US equities, international equities, aggregate bonds, and REITs',
    assets: [
      { symbol: 'VTI', weight: 48 },
      { symbol: 'VXUS', weight: 24 },
      { symbol: 'BND', weight: 20 },
      { symbol: 'VNQ', weight: 8 },
    ],
  },
  {
    id: 'tech-growth',
    name: 'Tech Growth',
    description: 'High-growth tech tilt balanced with long duration Treasuries and Gold',
    assets: [
      { symbol: 'QQQ', weight: 50 },
      { symbol: 'SPY', weight: 20 },
      { symbol: 'AVUV', weight: 10 },
      { symbol: 'TLT', weight: 10 },
      { symbol: 'GLD', weight: 10 },
    ],
  },
];

export function PresetSelector({ onSelect }: { onSelect: (preset: PortfolioPreset) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto text-xs py-0.5">
      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 whitespace-nowrap">
        Presets:
      </span>
      <div className="flex items-center gap-1.5">
        {PORTFOLIO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            title={p.description}
            className="whitespace-nowrap h-7 px-2.5 bg-slate-900 hover:bg-indigo-600/10 hover:border-indigo-500/40 border border-slate-800 rounded-md text-slate-300 hover:text-indigo-300 transition-colors text-[11px] font-medium"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}