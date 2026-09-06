'use client';

import React, { useState } from 'react';
import { Search, Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useNav } from '@/context/NavContext';

export function Header() {
  const { toggleMobile } = useNav();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="h-14 sm:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 select-none">
      {/* Mobile Bar: [☰] QuantPulse ... [Search] */}
      <div className="flex md:hidden items-center justify-between w-full">
        {!mobileSearchOpen ? (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMobile}
                aria-label="Open navigation menu"
                className="p-2 -ml-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Zap className="w-3.5 h-3.5 fill-white" />
                </div>
                <span className="font-bold text-base tracking-tight text-slate-900">
                  QuantPulse
                </span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search tickers"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium cursor-pointer transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 w-full animate-in fade-in duration-150">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search tickers (e.g. SPY, QQQ, AAPL)..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Desktop Search */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickers (e.g. SPY, QQQ, AAPL)..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
          />
        </div>
      </div>

      {/* Global Status & External Links (Desktop only) */}
      <div className="hidden sm:flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-600 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Curated Historical + Live API</span>
        </div>

        <Link
          href="https://github.com/Chronus555/investment-analytics-platform"
          target="_blank"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition text-xs font-medium shadow-2xs"
        >
          <svg className="w-3.5 h-3.5 fill-current text-slate-800" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>GitHub</span>
        </Link>
      </div>
    </header>
  );
}