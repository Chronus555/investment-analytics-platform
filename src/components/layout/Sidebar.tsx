'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  PieChart,
  Shuffle,
  Compass,
  Grid,
  TrendingUp,
  BookmarkCheck,
  ShieldCheck
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
  { href: '/backtest', label: 'Backtest & Compare', icon: LineChart, badge: 'P0' },
  { href: '/optimization', label: 'Optimization & Frontier', icon: PieChart },
  { href: '/monte-carlo', label: 'Monte Carlo & Goals', icon: Shuffle },
  { href: '/tactical', label: 'Tactical Strategies', icon: Compass },
  { href: '/correlations', label: 'Asset Correlations', icon: Grid },
  { href: '/factors', label: 'Factor Analysis', icon: TrendingUp },
  { href: '/saved', label: 'Saved Analyses', icon: BookmarkCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <LineChart className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              QUANT<span className="text-sky-400">PULSE</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono font-medium tracking-wider uppercase">
              Institutional Analytics
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto flex-1 text-xs font-medium">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Research Workspaces
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-300">Deterministic Engine</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Strict mathematical compounding with no look-ahead bias. Net of fees.
        </p>
      </div>
    </aside>
  );
}
