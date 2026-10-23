import React from 'react';
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Activity,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({
  currentRoute,
  onRouteChange,
  systemStatus,
  assetCount = 0,
  isDemo = false,
}) {
  const { t } = useLanguage();

  const navItems = [
    {
      id: 'overview',
      label: t('nav.overview', 'Dashboard Overview'),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'registry',
      label: t('nav.registry', 'Asset Registry'),
      icon: Layers,
      badge: assetCount > 0 ? `${assetCount}` : null,
    },
    {
      id: 'map',
      label: t('nav.map', 'Geospatial Map'),
      icon: MapPin,
      badge: 'GIS',
    },
    {
      id: 'heartbeat',
      label: t('nav.heartbeat', 'Digital Heartbeat'),
      icon: Activity,
      badge: 'Core',
    },
    {
      id: 'copilot',
      label: t('nav.copilot', 'AI Decision Copilot'),
      icon: Bot,
      badge: 'AI',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-white">
                AAYAM
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v0.1
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              {t('sidebar.brandTagline', 'Infrastructure Intelligence')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t('sidebar.intelligenceModules', 'Intelligence Modules')}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t('sidebar.environment', 'Environment')}
        </div>
        <div className="mx-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>{t('sidebar.database', 'Database')}</span>
            <span className="font-mono text-[11px] text-cyan-400">
              {isDemo ? t('common.simulated', 'Simulated') : 'SQLite'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>{t('sidebar.datasetMode', 'Dataset Mode')}</span>
            <span className="font-semibold text-amber-400 text-[11px]">
              {isDemo ? t('sidebar.demoSpecimen', 'Demo Specimen') : t('sidebar.syntheticMock', 'Synthetic Mock')}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>{t('sidebar.apiDocs', 'API Docs')}</span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline inline-flex items-center gap-1 text-[11px]"
            >
              Swagger <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDemo
                  ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                  : systemStatus === 'healthy'
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                  : 'bg-rose-500 shadow-sm shadow-rose-500/50'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {isDemo
                ? t('common.demoSandbox', 'Demo Sandbox')
                : systemStatus === 'healthy'
                ? t('common.online', 'API Online')
                : t('common.connecting', 'Connecting API...')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {isDemo ? t('common.isolated', 'Isolated') : 'Port 8000'}
          </span>
        </div>
      </div>
    </aside>
  );
}
