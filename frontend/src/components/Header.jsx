import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Database,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
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
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) {
  const { t } = useLanguage();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 shrink-0 cursor-pointer"
            aria-label={isMobileMenuOpen ? t('nav.closeMenu', 'Close navigation menu') : t('nav.openMenu', 'Open navigation menu')}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-sidebar-drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-green-700" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 truncate">
            {pageTitle}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden xs:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Prototype Mock Data Disclaimer Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{isDemo ? t('header.simulatedDemoEnv', 'Simulated Demo Environment') : t('header.prototypeDisclaimer', 'Local Prototype: Synthetic Data Seed')}</span>
        </div>

        {/* Database indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-700 font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          <Database className="w-3.5 h-3.5 text-green-700" />
          <span id="header-db-indicator">{isDemo ? t('common.simulatedEnvironment', 'Simulated Environment') : t('common.sqliteConnected', 'SQLite Connected')}</span>
        </div>

        {/* Multilingual Selector */}
        <LanguageSelector compact />

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            title={t('header.refreshTooltip', 'Refresh assets and health telemetry')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-green-700' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </button>
        )}

        {/* Demo Mode Exit Action */}
        {isDemo && onExitDemo && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <button
              id="btn-header-exit-demo"
              type="button"
              onClick={onExitDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 transition-colors cursor-pointer shadow-xs"
              title={t('header.exitDemoTooltip', 'Exit Demo Mode and return to sign in')}
            >
              <LogOut className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">{t('auth.exitDemo', 'Exit Demo')}</span>
            </button>
          </div>
        )}

        {/* Authenticated User Profile & Logout (Hidden in Demo Mode) */}
        {!isDemo && user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  isAdmin
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-green-700" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                  <span className="truncate max-w-[120px] md:max-w-[180px]">
                    {user.full_name || user.username}
                  </span>
                  <span
                    id="user-role-badge"
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isAdmin ? t('auth.administrator', 'Administrator') : t('auth.commonUser', 'Common User')}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono leading-none mt-0.5">
                  @{user.username}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
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
