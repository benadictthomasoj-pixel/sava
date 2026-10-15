import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  Layers,
  MapPin,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ExternalLink,
  ChevronRight,
  Database,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function AssetRegistry({
  assets = [],
  categories = [],
  loading,
  error,
  selectedAsset,
  onSelectAsset,
  onNavigate,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Filter assets locally based on user controls
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.state.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || asset.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'All' || asset.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const uniqueCategories = ['All', ...new Set(categories.length > 0 ? categories : assets.map((a) => a.category))];
  const statusOptions = ['All', 'Critical Attention', 'Requires Inspection', 'Operational'];

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedStatus('All');
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by asset code, name, district, or state..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Type:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              {uniqueCategories.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All') && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Table + Optional Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Assets Table (Left side) */}
        <div className={`${selectedAsset ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'} rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden`}>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Public Infrastructure Registry
              </h3>
              <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                {filteredAssets.length} of {assets.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 italic hidden sm:inline">
              Click any row to inspect full telemetry
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading asset records from SQLite database...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm text-rose-400 font-semibold">Error retrieving assets</p>
              <p className="text-xs text-slate-400 font-mono">{error}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">No matching assets found</p>
              <p className="text-xs text-slate-400">
                Try adjusting your search criteria or reset filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-md font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">District & State</th>
                    <th className="py-3 px-4">Built</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Risk</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-300">
                          {asset.id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white hover:text-cyan-400 transition-colors">
                            {asset.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {asset.category}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {asset.district}, {asset.state}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {asset.construction_year || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={asset.status} size="xs" />
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          <span
                            className={
                              asset.risk_score >= 80
                                ? 'text-rose-400'
                                : asset.risk_score >= 50
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {asset.risk_score}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ChevronRight
                            className={`w-4 h-4 inline-block transition-transform ${
                              isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-400'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Asset Detail Inspector Drawer (Right side) */}
        {selectedAsset && (
          <div className="lg:col-span-5 xl:col-span-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-5 space-y-4 sticky top-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
                  {selectedAsset.id}
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {selectedAsset.name}
                </h4>
              </div>
              <button
                onClick={() => onSelectAsset(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedAsset.status} />
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {selectedAsset.category}
              </span>
            </div>

            {/* Core Fields Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">District & State</span>
                  <span className="font-semibold text-slate-200">
                    {selectedAsset.district}, {selectedAsset.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Construction Year</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {selectedAsset.construction_year || 'Unknown'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block text-[10px] uppercase">GPS Coordinates</span>
                  <span className="font-mono text-slate-200 text-[11px]">
                    {selectedAsset.latitude.toFixed(4)}°N, {selectedAsset.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block text-[10px] uppercase">Last Inspection</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {selectedAsset.last_inspection_date || 'None on record'}
                  </span>
                </div>
              </div>

              {/* Digital Heartbeat Telemetry Snapshot */}
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-cyan-300 text-xs">Digital Heartbeat Snapshot</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-white">
                    Score: {selectedAsset.risk_score} / 100
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block">Health Index</span>
                    <span className="font-bold text-emerald-400 text-sm font-mono">
                      {selectedAsset.health_index}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Risk Tier</span>
                    <span className="font-bold text-rose-400 text-sm">
                      {selectedAsset.risk_level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Identified Risk Factors / Flagged Triggers */}
              {selectedAsset.flagged_reasons && selectedAsset.flagged_reasons.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                    Flagged Risk Triggers
                  </span>
                  <ul className="space-y-1">
                    {selectedAsset.flagged_reasons.map((reason, idx) => (
                      <li
                        key={idx}
                        className="p-2 rounded bg-rose-950/20 border border-rose-900/30 text-[11px] text-rose-300 flex items-start gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Description */}
              {selectedAsset.description && (
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                    Engineering Context
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed bg-slate-950/50 p-2.5 rounded border border-slate-800/60">
                    {selectedAsset.description}
                  </p>
                </div>
              )}

              {/* Data Source Disclaimer */}
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1.5">
                <Database className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                <span>Source: {selectedAsset.data_source}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => onNavigate('heartbeat')}
                className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Full Heartbeat</span>
              </button>
              <button
                onClick={() => onNavigate('map')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
                title="Locate on GIS Map"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Map</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
