import React from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

export default function Header({
  pageTitle,
  subtitle,
  onRefresh,
  loading,
  healthData,
}) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {pageTitle}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Prototype Mock Data Disclaimer Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Local Prototype: Synthetic Data Seed</span>
        </div>

        {/* Database indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>SQLite Connected</span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
            title="Refresh assets and health telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}
