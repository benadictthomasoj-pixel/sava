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

export default function DashboardOverview({
  stats,
  assets = [],
  loading,
  error,
  onNavigate,
  onSelectAsset,
}) {
  // Filter assets that need immediate attention (Critical Attention or High Risk)
  const flaggedAssets = assets.filter(
    (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical' || a.risk_level === 'High'
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome / Mission Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Digital Heartbeat Telemetry Active</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
            AAYAM Infrastructure Intelligence Layer
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Bridging public infrastructure records to surface flagged assets, explain root vulnerabilities, and recommend actionable inspection priorities before structural failures occur.
          </p>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Assets"
          value={loading ? '...' : (stats?.total_assets ?? assets.length)}
          subtitle="Registered public assets"
          icon={Layers}
          highlightColor="brand"
          onClick={() => onNavigate('registry')}
        />
        <StatCard
          title="Critical Attention"
          value={loading ? '...' : (stats?.critical_assets ?? flaggedAssets.length)}
          subtitle="Immediate investigation required"
          icon={AlertOctagon}
          trend={stats?.critical_assets ? `${stats.critical_assets} Flagged` : '0 Critical'}
          trendPositive={false}
          highlightColor="rose"
          onClick={() => onNavigate('registry')}
        />
        <StatCard
          title="Inspection Due"
          value={loading ? '...' : (stats?.inspection_due ?? 0)}
          subtitle="Overdue structural audits"
          icon={ClipboardCheck}
          highlightColor="amber"
          onClick={() => onNavigate('registry')}
        />
        <StatCard
          title="Network Health Index"
          value={loading ? '...' : `${stats?.average_health_index ?? 68.4}%`}
          subtitle="Aggregate telemetry score"
          icon={Activity}
          highlightColor="emerald"
        />
      </div>

      {/* Section: Priority Flagged Assets Needing Attention */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Flagged Assets Requiring Investigation
              </h3>
              <p className="text-xs text-slate-400">
                Sorted by AI Risk Score and degradation urgency
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('registry')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View All Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading flagged infrastructure telemetry...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-rose-400 font-medium">Failed to load asset records.</p>
            <p className="text-xs text-slate-400 font-mono">{error}</p>
          </div>
        ) : flaggedAssets.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">No critical assets flagged</p>
            <p className="text-xs text-slate-400">All registered public assets are currently within normal operating thresholds.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Asset Code & Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Identified Risk Triggers</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {flaggedAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{asset.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{asset.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-300">{asset.category}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{asset.district}, {asset.state}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              asset.risk_score >= 80
                                ? 'bg-rose-500'
                                : asset.risk_score >= 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${asset.risk_score}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200">
                          {asset.risk_score}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {asset.flagged_reasons && asset.flagged_reasons.length > 0 ? (
                        <span className="text-slate-300 line-clamp-1" title={asset.flagged_reasons.join('; ')}>
                          {asset.flagged_reasons[0]}
                          {asset.flagged_reasons.length > 1 && (
                            <span className="text-cyan-400 font-semibold ml-1">
                              +{asset.flagged_reasons.length - 1} more
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Routine monitoring</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (onSelectAsset) onSelectAsset(asset);
                          onNavigate('heartbeat');
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-colors"
                      >
                        Inspect Heartbeat
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
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-white text-sm">
                The Digital Heartbeat Concept
              </h4>
            </div>
            <span className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              Explore <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A single explainable index synthesizing structural sensor signals, age wear curves, climate stress exposure, and inspection recency.
          </p>
        </div>

        <div
          onClick={() => onNavigate('copilot')}
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <h4 className="font-bold text-white text-sm">
                AI Decision Copilot (Upcoming)
              </h4>
            </div>
            <span className="text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              Preview <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Evidence-grounded RAG query interface to interrogate asset inspection logs, synthesize maintenance histories, and prioritize field dispatches.
          </p>
        </div>
      </div>
    </div>
  );
}
