'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
} from 'lucide-react';
import { CURATED_SECURITIES } from '@/data/curatedData';
import { SecurityMetadata } from '@/data/types';
import { PresetSelector, PortfolioPreset } from './PresetSelector';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatPercent } from '@/utils/formatters';

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
  accentColor = '#6366f1',
}: PortfolioBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Calculate sum of weights
  const totalWeight = assets.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
  const isValid100 = Math.abs(totalWeight - 100) < 0.01;

  // Weighted average expense ratio
  const weightedExpenseRatio =
    totalWeight > 0
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
    <div className="w-full rounded-xl border border-slate-200/80 bg-white shadow-sm">
      {/* Portfolio Name & Presets Top Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
          {onNameChange ? (
            <input
              type="text"
              value={portfolioName}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-transparent font-semibold text-base sm:text-lg text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
            />
          ) : (
            <h3 className="font-semibold text-base sm:text-lg text-slate-900">{portfolioName}</h3>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Avg Expense: <span className="text-slate-800 font-semibold">{formatPercent(weightedExpenseRatio, 2)}</span>
          </div>
          <Button onClick={handleExportJSON} variant="ghost" size="sm">
            <Download className="w-3.5 h-3.5 text-slate-500" />
            JSON
          </Button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
        <PresetSelector onSelect={handleLoadPreset} />
      </div>

      {/* Asset Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase font-mono tracking-wider text-slate-500 bg-slate-50/50">
              <th className="py-2.5 pl-4 sm:pl-5 pr-2 font-medium">Ticker</th>
              <th className="py-2.5 px-3 font-medium">Asset Name</th>
              <th className="py-2.5 px-3 font-medium hidden md:table-cell">Class</th>
              <th className="py-2.5 px-3 font-medium text-right hidden sm:table-cell">Expense</th>
              <th className="py-2.5 px-3 font-medium text-right w-48">Allocation</th>
              <th className="py-2.5 pr-4 sm:pr-5 pl-2 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((asset) => (
              <tr key={asset.symbol} className="hover:bg-slate-50/60 transition-colors group">
                {/* Ticker */}
                <td className="py-2 pl-4 sm:pl-5 pr-2">
                  <span className="inline-flex items-center justify-center font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80">
                    {asset.symbol}
                  </span>
                </td>

                {/* Name */}
                <td className="py-2 px-3">
                  <span className="font-medium text-slate-800 block truncate max-w-[200px] sm:max-w-[240px]">
                    {asset.name}
                  </span>
                </td>

                {/* Asset Class */}
                <td className="py-2 px-3 text-slate-500 hidden md:table-cell font-mono text-[11px]">
                  {asset.assetClass}
                </td>

                {/* Expense Ratio */}
                <td className="py-2 px-3 text-slate-500 text-right font-mono text-[11px] hidden sm:table-cell">
                  {formatPercent(asset.expenseRatio, 2)}
                </td>

                {/* Allocation Input & Mini Slider */}
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-2.5">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={asset.weight}
                      onChange={(e) => handleWeightChange(asset.symbol, parseFloat(e.target.value) || 0)}
                      className="w-20 hidden lg:block accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded"
                    />
                    <div className="flex items-center h-8 bg-white border border-slate-200 rounded-md px-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={asset.weight}
                        onChange={(e) => handleWeightChange(asset.symbol, parseFloat(e.target.value) || 0)}
                        className="w-12 bg-transparent text-right font-mono text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                      <span className="text-slate-400 text-xs ml-1 font-mono">%</span>
                    </div>
                  </div>
                </td>

                {/* Remove */}
                <td className="py-2 pr-4 sm:pr-5 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemove(asset.symbol)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="Remove asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Asset & Table Footer */}
      <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Button
            onClick={() => setShowSearch(!showSearch)}
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Asset
          </Button>

          {/* Autocomplete Dropdown */}
          {showSearch && (
            <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 space-y-1">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
                />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {searchResults.map((sec) => (
                  <button
                    key={sec.symbol}
                    type="button"
                    onClick={() => handleAddSecurity(sec)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 text-left transition text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">{sec.symbol}</span>
                      <span className="text-slate-700 truncate max-w-[150px]">{sec.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{formatPercent(sec.expenseRatio, 2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Allocation Sum & Balance Tools */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isValid100
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isValid100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Total: {totalWeight.toFixed(1)}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button onClick={handleNormalize} variant="outline" size="sm">
              <RefreshCw className="w-3 h-3 text-blue-600" />
              Normalize
            </Button>
            <Button onClick={handleEqualWeight} variant="outline" size="sm">
              <Sliders className="w-3 h-3 text-slate-600" />
              Equal Weight
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}