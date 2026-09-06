'use client';

import React from 'react';
import { Shield, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Offline & Live Store Active
        </span>
        <span className="text-xs text-slate-500 hidden sm:inline">| 229 Months Historical Depth</span>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <Link
          href="/docs/reference-feature-audit.md"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          Feature Audit
        </Link>
        <Link
          href="/docs/feature-matrix.md"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
        >
          <Shield className="w-3.5 h-3.5 text-teal-400" />
          Feature Matrix
        </Link>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="hidden md:block">
        {/* Sidebar imported inside layout */}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
