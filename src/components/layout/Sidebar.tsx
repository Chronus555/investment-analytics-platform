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
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Portfolio Lab',
    items: [
      { href: '/backtest', label: 'Backtest & Compare', icon: LineChart },
    ],
  },
  {
    title: 'Quantitative Analysis',
    items: [
      { href: '/optimization', label: 'Optimization & Frontier', icon: PieChart },
      { href: '/monte-carlo', label: 'Monte Carlo & Longevity', icon: Shuffle },
      { href: '/correlations', label: 'Correlations & Matrix', icon: Grid },
      { href: '/factors', label: 'Factor Attribution', icon: TrendingUp },
    ],
  },
  {
    title: 'Strategies',
    items: [
      { href: '/tactical', label: 'Tactical & Momentum Lab', icon: Compass },
    ],
  },
  {
    title: 'Library',
    items: [
      { href: '/saved', label: 'Saved Experiments', icon: BookmarkCheck },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-950">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              QuantPulse
            </span>
            <span className="text-[9px] text-slate-500 font-mono block -mt-0.5 tracking-wider uppercase">
              Analytics Terminal
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="p-3 space-y-5 overflow-y-auto flex-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-2 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-medium">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between h-9 px-2.5 rounded-lg text-xs transition-colors ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-300 font-semibold border-l-2 border-indigo-500 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Engine Active</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">v1.2</span>
        </div>
      </div>
    </aside>
  );
}