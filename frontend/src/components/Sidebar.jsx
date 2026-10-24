import React from 'react';
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Activity,
  Bot,
  ExternalLink,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({
  currentRoute,
  onRouteChange,
  systemStatus,
  assetCount = 0,
  isDemo = false,
  isMobile = false,
  onClose,
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
    <aside className="w-full h-full bg-white border-r border-slate-200 flex flex-col select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-700 to-emerald-600 flex items-center justify-center shadow-md shadow-green-700/20 shrink-0">
            <Activity className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-slate-900">
                AAYAM
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-semibold">
                v0.1
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              {t('sidebar.brandTagline', 'Infrastructure Intelligence')}
            </p>
          </div>
        </div>
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {t('sidebar.intelligenceModules', 'Intelligence Modules')}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onRouteChange(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-green-100 text-green-800 font-semibold border-l-4 border-green-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-green-700' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-green-200 text-green-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {t('sidebar.environment', 'Environment')}
        </div>
        <div className="mx-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span>{t('sidebar.database', 'Database')}</span>
            <span className="font-mono text-[11px] text-green-700 font-semibold">
              {isDemo ? t('common.simulated', 'Simulated') : 'SQLite'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>{t('sidebar.datasetMode', 'Dataset Mode')}</span>
            <span className="font-semibold text-amber-700 text-[11px]">
              {isDemo ? t('sidebar.demoSpecimen', 'Demo Specimen') : t('sidebar.syntheticMock', 'Synthetic Mock')}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>{t('sidebar.apiDocs', 'API Docs')}</span>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-green-700 hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
            >
              Swagger <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDemo
                  ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                  : systemStatus === 'healthy'
                  ? 'bg-green-600 shadow-xs shadow-green-600/50 animate-pulse'
                  : 'bg-red-500 shadow-xs shadow-red-500/50'
              }`}
            />
            <span className="text-xs font-medium text-slate-700">
              {isDemo
                ? t('common.demoSandbox', 'Demo Sandbox')
                : systemStatus === 'healthy'
                ? t('common.online', 'API Online')
                : t('common.connecting', 'Connecting API...')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {isDemo ? t('common.isolated', 'Isolated') : 'Port 8000'}
          </span>
        </div>
      </div>
    </aside>
  );
}
