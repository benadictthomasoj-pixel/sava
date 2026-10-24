import React from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Activity,
  Layers,
  MapPin,
  Bot,
  Info,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';

export default function DashboardOverview({
  stats,
  assets = [],
  loading,
  error,
  onNavigate,
  onSelectAsset,
  isDemo = false,
}) {
  const { t } = useLanguage();

  // Filter assets that need immediate attention (Critical Attention or High Risk)
  const flaggedAssets = assets.filter(
    (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical' || a.risk_level === 'High'
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome / Mission Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm ${
        isDemo
          ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-amber-200'
          : 'bg-gradient-to-r from-white via-slate-50 to-emerald-50/40 border-slate-200'
      }`}>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDemo
              ? 'bg-amber-100 border border-amber-300 text-amber-800'
              : 'bg-green-100 border border-green-300 text-green-800'
          }`}>
            <Activity className="w-3.5 h-3.5 animate-pulse text-green-700" />
            <span>{isDemo ? t('demo.simulatedTelemetry', 'Simulated Digital Heartbeat Telemetry') : t('dashboard.telemetryActive', 'Digital Heartbeat Telemetry Active')}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">
            {isDemo ? t('demo.operationsOverview', 'AAYAM Demo Operations Overview') : t('dashboard.overviewTitle', 'AAYAM Infrastructure Intelligence Layer')}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isDemo
              ? t('demo.demoSpecimensDesc', 'Exploring simulated public infrastructure records across 3 benchmark specimens: Mandovi Estuary Bridge, Chambal WTP, and Kazhakootam Skyway.')
              : t('dashboard.overviewDesc', 'Bridging public infrastructure records to surface flagged assets, explain root vulnerabilities, and recommend actionable inspection priorities before structural failures occur.')}
          </p>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.monitoredAssets', 'Monitored Assets')}
          value={loading ? '...' : (stats?.total_assets ?? assets.length)}
          subtitle={t('dashboard.registeredPublicAssets', 'Registered public assets')}
          icon={Layers}
          highlightColor="brand"
          onClick={() => onNavigate('registry')}
        />
        <StatCard
          title={t('status.criticalAttention', 'Critical Attention')}
          value={loading ? '...' : (stats?.critical_assets ?? flaggedAssets.length)}
          subtitle={t('dashboard.immediateInvestigation', 'Immediate investigation required')}
          icon={AlertOctagon}
          trend={stats?.critical_assets ? t('dashboard.flaggedCount', '{count} Flagged', { count: stats.critical_assets }) : t('dashboard.zeroCritical', '0 Critical')}
          trendPositive={false}
          highlightColor="rose"
          onClick={() => onNavigate('registry')}
        />
        <StatCard
          title={t('dashboard.inspectionDue', 'Inspection Due')}
          value={loading ? '...' : (stats?.inspection_due ?? 0)}
          subtitle={t('dashboard.overdueStructuralAudits', 'Overdue structural audits')}
          icon={ClipboardCheck}
          highlightColor="amber"
          onClick={() => onNavigate('registry')}
        />
        <StatCard
          title={t('dashboard.networkHealthIndex', 'Network Health Index')}
          value={loading ? '...' : `${stats?.average_health_index ?? 68.4}%`}
          subtitle={t('dashboard.aggregateTelemetryScore', 'Aggregate telemetry score')}
          icon={Activity}
          highlightColor="emerald"
        />
      </div>

      {/* Section: Priority Flagged Assets Needing Attention */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('dashboard.flaggedRequiringInvestigation', 'Flagged Assets Requiring Investigation')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('dashboard.sortedByRisk', 'Sorted by AI Risk Score and degradation urgency')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('registry')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 transition-colors"
          >
            <span>{t('dashboard.viewAllRegistry', 'View All Registry')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">{t('dashboard.loadingTelemetry', 'Loading flagged infrastructure telemetry...')}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-red-600 font-medium">{t('dashboard.failedToLoadAssets', 'Failed to load asset records.')}</p>
            <p className="text-xs text-slate-500 font-mono">{error}</p>
          </div>
        ) : flaggedAssets.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">{t('dashboard.noCriticalFlagged', 'No critical assets flagged')}</p>
            <p className="text-xs text-slate-500">{t('dashboard.allWithinThresholds', 'All registered public assets are currently within normal operating thresholds.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
            <table className="w-full text-left border-collapse text-xs block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">{t('dashboard.assetCodeName', 'Asset Code & Name')}</th>
                  <th className="py-3 px-4">{t('common.category', 'Category')}</th>
                  <th className="py-3 px-4">{t('common.location', 'Location')}</th>
                  <th className="py-3 px-4">{t('common.status', 'Status')}</th>
                  <th className="py-3 px-4">{t('dashboard.riskScore', 'Risk Score')}</th>
                  <th className="py-3 px-4">{t('dashboard.identifiedRiskTriggers', 'Identified Risk Triggers')}</th>
                  <th className="py-3 px-4 text-right">{t('dashboard.action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 block md:table-row-group space-y-3 md:space-y-0 p-2 md:p-0">
                {flaggedAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50 transition-colors block md:table-row bg-white md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-slate-200 md:border-0"
                  >
                    <td className="py-1.5 md:py-3 px-1 md:px-4 block md:table-cell">
                      <div className="flex items-center justify-between md:block gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm md:text-xs">{asset.name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{asset.id}</div>
                        </div>
                        <div className="md:hidden shrink-0">
                          <StatusBadge status={asset.status} size="xs" />
                        </div>
                      </div>
                    </td>
                    <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell">
                      <div className="flex items-center justify-between md:block text-slate-600">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase md:hidden">{t('common.category', 'Category')}:</span>
                        <span className="font-medium text-slate-700">{asset.category}</span>
                      </div>
                    </td>
                    <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell text-slate-600">
                      <div className="flex items-center justify-between md:block">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase md:hidden">{t('common.location', 'Location')}:</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{asset.district}, {asset.state}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 md:py-3 px-1 md:px-4 hidden md:table-cell">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell">
                      <div className="flex items-center justify-between md:justify-start gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase md:hidden">{t('dashboard.riskScore', 'Risk Score')}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 md:w-12 bg-slate-100 border border-slate-200 rounded-full h-2 md:h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                asset.risk_score >= 80
                                  ? 'bg-red-600'
                                  : asset.risk_score >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${asset.risk_score}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            {asset.risk_score}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell max-w-xs">
                      <div className="text-slate-600">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase md:hidden block mb-0.5">{t('dashboard.identifiedRiskTriggers', 'Identified Risk Triggers')}:</span>
                        {asset.flagged_reasons && asset.flagged_reasons.length > 0 ? (
                          <span className="text-slate-700 line-clamp-2 md:line-clamp-1" title={asset.flagged_reasons.join('; ')}>
                            {asset.flagged_reasons[0]}
                            {asset.flagged_reasons.length > 1 && (
                              <span className="text-green-700 font-semibold ml-1">
                                {t('dashboard.moreFlags', '+{count} more', { count: asset.flagged_reasons.length - 1 })}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">{t('dashboard.routineMonitoring', 'Routine monitoring')}</span>
                        )}
                      </div>
                    </td>
                    <td className="pt-3 pb-1 md:py-3 px-1 md:px-4 block md:table-cell text-left md:text-right border-t border-slate-200 md:border-t-0 mt-2 md:mt-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectAsset) onSelectAsset(asset);
                          onNavigate('heartbeat');
                        }}
                        className="w-full md:w-auto px-3 py-2 md:py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border border-green-300 text-xs md:text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 min-h-[36px] md:min-h-0"
                      >
                        <Activity className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('dashboard.inspectHeartbeat', 'Inspect Heartbeat')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Concept Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div
          onClick={() => onNavigate('heartbeat')}
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-700 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-slate-900 text-sm">
                {t('dashboard.heartbeatConceptTitle', 'The Digital Heartbeat Concept')}
              </h4>
            </div>
            <span className="text-xs text-green-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              {t('dashboard.explore', 'Explore')} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('dashboard.heartbeatConceptDesc', 'A single explainable index synthesizing structural sensor signals, age wear curves, climate stress exposure, and inspection recency.')}
          </p>
        </div>

        <div
          onClick={() => onNavigate('copilot')}
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-green-700 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-slate-900 text-sm">
                {t('dashboard.copilotConceptTitle', 'AI Decision Copilot (Upcoming)')}
              </h4>
            </div>
            <span className="text-xs text-green-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              {t('dashboard.preview', 'Preview')} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('dashboard.copilotConceptDesc', 'Evidence-grounded RAG query interface to interrogate asset inspection logs, synthesize maintenance histories, and prioritize field dispatches.')}
          </p>
        </div>
      </div>
    </div>
  );
}
