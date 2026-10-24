import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * DemoBanner Component
 *
 * Persistent notice shown across all views when AAYAM is running in isolated Demo Mode.
 * Clearly identifies simulated environment, states engineering safety disclaimer,
 * and provides a one-click exit action back to the sign-in screen.
 */
export default function DemoBanner({ onExitDemo }) {
  const { t } = useLanguage();

  return (
    <aside
      id="demo-mode-banner"
      role="region"
      aria-label={t('demo.bannerAriaLabel', 'Demo Mode Notice')}
      className="w-full shrink-0 bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-amber-900 z-30 transition-all select-none shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 text-xs text-left">
          <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded bg-amber-600 text-white font-black tracking-wider text-[11px] uppercase shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span id="demo-mode-badge">{t('auth.demoModeBadge', 'DEMO MODE')}</span>
          </div>
          <p className="text-amber-900/90 text-xs font-medium leading-relaxed">
            {t('demo.bannerDisclaimer', 'All infrastructure assets, sensor telemetry, Copilot responses, and evidence documents are simulated specimens for demonstration purposes. They must not be used for real engineering, structural, or life-safety decisions.')}
          </p>
        </div>

        {onExitDemo && (
          <button
            id="btn-exit-demo"
            type="button"
            onClick={onExitDemo}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 hover:border-amber-400 transition-all cursor-pointer shadow-xs active:scale-95"
            title={t('auth.exitDemoTooltip', 'Exit Demo Mode and return to sign in')}
          >
            <LogOut className="w-3.5 h-3.5 text-amber-700" />
            <span>{t('auth.exitDemoAndSignIn', 'Exit Demo & Return to Sign In')}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
