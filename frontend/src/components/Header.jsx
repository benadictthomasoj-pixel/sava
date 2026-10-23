import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Database,
  ShieldCheck,
  User,
  LogOut,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

export default function Header({
  pageTitle,
  subtitle,
  onRefresh,
  loading,
  healthData,
  user,
  onLogout,
  isAdmin,
  isDemo = false,
  onExitDemo,
}) {
  const { t } = useLanguage();

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

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Prototype Mock Data Disclaimer Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{isDemo ? t('header.simulatedDemoEnv', 'Simulated Demo Environment') : t('header.prototypeDisclaimer', 'Local Prototype: Synthetic Data Seed')}</span>
        </div>

        {/* Database indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span id="header-db-indicator">{isDemo ? t('common.simulatedEnvironment', 'Simulated Environment') : t('common.sqliteConnected', 'SQLite Connected')}</span>
        </div>

        {/* Multilingual Selector */}
        <LanguageSelector compact />

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
            title={t('header.refreshTooltip', 'Refresh assets and health telemetry')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </button>
        )}

        {/* Demo Mode Exit Action */}
        {isDemo && onExitDemo && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <button
              id="btn-header-exit-demo"
              type="button"
              onClick={onExitDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer"
              title={t('header.exitDemoTooltip', 'Exit Demo Mode and return to sign in')}
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t('auth.exitDemo', 'Exit Demo')}</span>
            </button>
          </div>
        )}

        {/* Authenticated User Profile & Logout (Hidden in Demo Mode) */}
        {!isDemo && user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  isAdmin
                    ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[120px] md:max-w-[180px]">
                    {user.full_name || user.username}
                  </span>
                  <span
                    id="user-role-badge"
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isAdmin ? t('auth.administrator', 'Administrator') : t('auth.commonUser', 'Common User')}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                  @{user.username}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                title={t('header.logoutTooltip', 'Sign out of AAYAM')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
