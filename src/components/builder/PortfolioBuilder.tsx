'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Sliders, CheckCircle, AlertTriangle, RefreshCw, Download, Upload } from 'lucide-react';
import { CURATED_SECURITIES } from '@/data/curatedData';
import { SecurityMetadata } from '@/data/types';
import { PresetSelector, PortfolioPreset } from './PresetSelector';

export interface BuilderAsset {
  symbol: string;
  name: string;
  assetClass: string;
  weight: number; // 0 to 100 (%)
  expenseRatio: number; // Decimal (e.g. 0.0003 for 0.03%)
}

interface PortfolioBuilderProps {
  portfolioName: string;
  onNameChange?: (name: string) => void;
  assets: BuilderAsset[];
  onChange: (assets: BuilderAsset[]) => void;
  accentColor?: string;
}

export function PortfolioBuilder({
  portfolioName,
  onNameChange,
  assets,
  onChange,
  accentColor = '#38bdf8',
}: PortfolioBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Calculate sum of weights
  const totalWeight = assets.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
  const isValid100 = Math.abs(totalWeight - 100) < 0.01;

  // Weighted average expense ratio
  const weightedExpenseRatio = totalWeight > 0
    ? assets.reduce((sum, a) => sum + (a.weight / totalWeight) * a.expenseRatio, 0)
    : 0;

  // Search filtered securities
  const searchResults = searchQuery.trim()
    ? CURATED_SECURITIES.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : CURATED_SECURITIES.slice(0, 8);

  const handleAddSecurity = (sec: SecurityMetadata) => {
    if (assets.some((a) => a.symbol === sec.symbol)) return;
    const remaining = Math.max(0, 100 - totalWeight);
    const newAssets: BuilderAsset[] = [
      ...assets,
      {
        symbol: sec.symbol,
        name: sec.name,
        assetClass: sec.assetClass,
        weight: remaining > 0 ? remaining : 0,
        expenseRatio: sec.expenseRatio,
      },
    ];
    onChange(newAssets);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleRemove = (symbol: string) => {
    onChange(assets.filter((a) => a.symbol !== symbol));
  };

  const handleWeightChange = (symbol: string, val: number) => {
    const updated = assets.map((a) =>
      a.symbol === symbol ? { ...a, weight: Math.max(0, Math.min(100, val)) } : a
    );
    onChange(updated);
  };

  const handleNormalize = () => {
    if (totalWeight <= 0) return;
    const updated = assets.map((a) => ({
      ...a,
      weight: Math.round(((a.weight / totalWeight) * 100) * 100) / 100,
    }));
    onChange(updated);
  };

  const handleEqualWeight = () => {
    if (assets.length === 0) return;
    const eq = Math.round((100 / assets.length) * 100) / 100;
    const updated = assets.map((a) => ({ ...a, weight: eq }));
    onChange(updated);
  };

  const handleLoadPreset = (preset: PortfolioPreset) => {
    const loaded: BuilderAsset[] = preset.assets.map((pa) => {
      const meta = CURATED_SECURITIES.find((s) => s.symbol === pa.symbol);
      return {
        symbol: pa.symbol,
        name: meta?.name || pa.symbol,
        assetClass: meta?.assetClass || 'US Equity',
        weight: pa.weight,
        expenseRatio: meta?.expenseRatio || 0.0005,
      };
    });
    onChange(loaded);
    if (onNameChange) onNameChange(preset.name);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ name: portfolioName, assets }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portfolioName.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    a.click();
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: accentColor }} />
          {onNameChange ? (
            <input
              type="text"
              value={portfolioName}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-transparent font-semibold text-lg text-white border-b border-transparent hover:border-slate-700 focus:border-sky-400 focus:outline-none px-1"
            />
          ) : (
            <h3 className="font-semibold text-lg text-white">{portfolioName}</h3>
          )}
        </div>

        {/* Allocation Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
              isValid100
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
            }`}
          >
            {isValid100 ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Allocation: {totalWeight.toFixed(1)}%</span>
          </div>

          <div className="text-xs text-slate-400">
            Avg Fee: <span className="font-mono text-slate-200">{(weightedExpenseRatio * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Preset bar */}
      <PresetSelector onSelect={handleLoadPreset} />

      {/* Action Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNormalize}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-all"
          >
            <RefreshCw className="w-3 h-3 text-sky-400" />
            Normalize to 100%
          </button>
          <button
            type="button"
            onClick={handleEqualWeight}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-all"
          >
            <Sliders className="w-3 h-3 text-teal-400" />
            Equal Weight
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
        >
          <Download className="w-3 h-3" />
          Export JSON
        </button>
      </div>

      {/* Asset rows */}
      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.symbol}
            className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all"
          >
            {/* Ticker info */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="w-12 h-9 flex items-center justify-center bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono font-bold text-sm rounded-lg">
                {asset.symbol}
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-200">{asset.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{asset.assetClass}</span>
                  <span>•</span>
                  <span>Exp: {(asset.expenseRatio * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Slider and Input */}
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={asset.weight}
                onChange={(e) => handleWeightChange(asset.symbol, parseFloat(e.target.value) || 0)}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={asset.weight}
                  onChange={(e) => handleWeightChange(asset.symbol, parseFloat(e.target.value) || 0)}
                  className="w-12 bg-transparent text-right font-mono text-sm font-semibold text-white focus:outline-none"
                />
                <span className="text-slate-500 text-xs ml-1">%</span>
              </div>
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleRemove(asset.symbol)}
              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
            No assets in this portfolio yet. Use Search or select a Preset above.
          </div>
        )}
      </div>

      {/* Add Asset / Search Dropdown */}
      <div className="relative pt-1">
        {!showSearch ? (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="w-full py-2.5 flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-sky-400/60 rounded-xl text-xs font-semibold text-slate-400 hover:text-sky-400 transition-all bg-slate-950/40"
          >
            <Plus className="w-4 h-4" /> Add Security / Ticker
          </button>
        ) : (
          <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Search Security</span>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Close
              </button>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Search ticker (e.g. SPY, QQQ, VTI, BND, GLD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none font-mono"
            />
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
              {searchResults.map((sec) => (
                <div
                  key={sec.symbol}
                  onClick={() => handleAddSecurity(sec)}
                  className="p-2 flex items-center justify-between hover:bg-slate-900 cursor-pointer rounded-lg transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sky-400 w-12">{sec.symbol}</span>
                    <span className="text-slate-300 font-medium">{sec.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">{sec.assetClass}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
