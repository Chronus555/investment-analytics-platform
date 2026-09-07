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
  Zap,
  X,
  ShieldCheck,
  Filter,
  Award,
} from 'lucide-react';
import { useNav } from '@/context/NavContext';

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
    title: 'Portfolio',
    items: [
      { href: '/backtest', label: 'Backtest & Compare', icon: LineChart },
      { href: '/saved', label: 'Saved Portfolios', icon: BookmarkCheck },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { href: '/attribution', label: 'Manager Performance', icon: Award },
      { href: '/optimization', label: 'Optimization & Frontier', icon: PieChart },
      { href: '/monte-carlo', label: 'Monte Carlo & Longevity', icon: Shuffle },
      { href: '/screener', label: 'Fund & ETF Screener', icon: Filter },
      { href: '/correlations', label: 'Correlations & Matrix', icon: Grid },
      { href: '/factors', label: 'Factor Attribution', icon: TrendingUp },
    ],
  },
  {
    title: 'Strategies',
    items: [
      { href: '/retirement', label: 'Retirement & Withdrawal', icon: ShieldCheck },
      { href: '/tactical', label: 'Tactical Strategy Lab', icon: Compass },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useNav();

  const renderNavContent = () => (
    <>
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <Link href="/" onClick={closeMobile} className="flex items-center gap-2.5 group no-underline">
          <div className="w-7.5 h-7.5 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
              QuantPulse
            </span>
            <span className="text-[10px] text-slate-500 font-mono block tracking-wider uppercase">
              Portfolio Terminal
            </span>
          </div>
        </Link>
        {mobileOpen && (
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="p-3 space-y-5 overflow-y-auto flex-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                    onClick={closeMobile}
                    className={`flex items-center justify-between h-9 px-2.5 rounded-lg text-xs transition-all no-underline ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-700 font-medium">
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
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700">Online & Active</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v2.0</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
        {renderNavContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 select-none animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}