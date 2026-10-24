import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  Filter,
  Search,
  Building2,
  Calendar,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import InspectionHistoryModal from '../components/InspectionHistoryModal';
import { useLanguage } from '../context/LanguageContext';
import { fetchAssetInspections } from '../services/api';
import { getDemoInspections } from '../demo/demoService';

export default function InspectionsInterventionsPage({
  assets = [],
  selectedAsset = null,
  onSelectAsset,
  onOpenProfile,
  onRefresh,
  isAdmin = false,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [allInspections, setAllInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAssetId, setFilterAssetId] = useState(selectedAsset?.id || 'All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalAsset, setModalAsset] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAllInspections = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = [];
      for (const a of assets) {
        try {
          if (isDemo) {
            const insp = await getDemoInspections(a.id);
            records.push(...insp.map((i) => ({ ...i, asset_name: a.name, category: a.category })));
          } else {
            const insp = await fetchAssetInspections(a.id);
            records.push(...insp.map((i) => ({ ...i, asset_name: a.name, category: a.category })));
          }
        } catch {
          // continue
        }
      }
      // Sort newest first
      records.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
      setAllInspections(records);
    } catch (err) {
      console.error('Failed to load inspections:', err);
      setError('Unable to load inspection registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assets.length > 0) {
      loadAllInspections();
    }
  }, [assets, isDemo]);

  useEffect(() => {
    if (selectedAsset) {
      setFilterAssetId(selectedAsset.id);
    }
  }, [selectedAsset]);

  const filteredInspections = allInspections.filter((i) => {
    if (filterAssetId !== 'All' && i.asset_id !== filterAssetId) return false;
    if (filterStatus !== 'All') {
      if (filterStatus === 'Verified' && !i.verification_outcome) return false;
      if (filterStatus === 'Pending' && (i.verification_outcome || i.status === 'Scheduled')) return false;
      if (filterStatus === 'Scheduled' && i.status !== 'Scheduled') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (i.findings && i.findings.toLowerCase().includes(q)) ||
        (i.asset_name && i.asset_name.toLowerCase().includes(q)) ||
        (i.asset_id && i.asset_id.toLowerCase().includes(q)) ||
        (i.responsible_user && i.responsible_user.toLowerCase().includes(q)) ||
        (i.inspection_type && i.inspection_type.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const totalCount = allInspections.length;
  const verifiedCount = allInspections.filter((i) => i.verification_outcome).length;
  const inProgressCount = allInspections.filter((i) => i.status === 'In Progress').length;
  const pendingCount = allInspections.filter((i) => !i.verification_outcome && i.status === 'Completed').length;

  const handleOpenInspectModal = (assetId) => {
    const target = assets.find((a) => a.id === assetId) || { id: assetId, name: assetId };
    setModalAsset(target);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center shadow-md shadow-green-700/20 shrink-0">
            <ClipboardCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Inspections & Interventions Registry
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Field evaluations, civil maintenance tracking, and closed-loop engineering verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadAllInspections}
            disabled={loading}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
            title="Refresh inspections"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-700' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenInspectModal(filterAssetId !== 'All' ? filterAssetId : assets[0]?.id)}
            className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Field Inspection</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Audits
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across all registered infrastructure</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Closed-Loop Verified
          </span>
          <p className="text-2xl font-black text-green-700 mt-1">{verifiedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Certified remediations with risk mitigation</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            In Progress Repairs
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{inProgressCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active field maintenance work orders</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Sign-Off
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Completed tasks awaiting verification</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by findings, asset ID, inspector name, or audit type..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500 font-semibold">Asset:</span>
            <select
              value={filterAssetId}
              onChange={(e) => setFilterAssetId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="All">All Monitored Assets</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="All">All Statuses</option>
              <option value="Verified">Verified Outcomes Only</option>
              <option value="Pending">Pending Verification</option>
              <option value="Scheduled">Scheduled Inspections</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inspections List */}
      <div className="space-y-3">
        {loading && allInspections.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-green-700 animate-spin" />
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
              Loading Inspection Records...
            </p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No matching inspection records found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filters or recording a new field inspection.
            </p>
          </div>
        ) : (
          filteredInspections.map((insp) => (
            <div
              key={insp.id}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-800 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {insp.asset_id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {insp.asset_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                        {insp.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Audit: <strong className="text-slate-800">{insp.inspection_type}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {insp.inspection_date}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      insp.verification_outcome
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : insp.status === 'In Progress'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {insp.verification_outcome ? 'Verified Closed-Loop' : insp.status}
                  </span>
                </div>
              </div>

              {/* Findings & Actions */}
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Observed Findings: </span>
                  <span className="text-slate-800">{insp.findings || 'No acute anomalies recorded.'}</span>
                </div>
                {insp.recommended_action && (
                  <div>
                    <span className="text-slate-500 font-semibold">Recommended Action: </span>
                    <span className="text-slate-800">{insp.recommended_action}</span>
                  </div>
                )}
                {insp.actual_action_taken && (
                  <div className="p-2.5 rounded-lg bg-green-50/70 border border-green-200 text-green-900">
                    <span className="font-bold">Remediation Executed: </span>
                    <span>{insp.actual_action_taken}</span>
                  </div>
                )}
              </div>

              {/* Verification & Inspector Audit Trail */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Auditor: <strong className="text-slate-700">{insp.responsible_user}</strong>
                  </span>
                  {insp.verifier_name && (
                    <span className="flex items-center gap-1 text-green-800 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                      Sign-off: {insp.verifier_name} ({insp.verification_date})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onOpenProfile && (
                    <button
                      onClick={() => onOpenProfile(insp.asset_id)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Intelligence Profile</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenInspectModal(insp.asset_id)}
                    className="px-3 py-1 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Manage Audit Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspection Modal */}
      {isModalOpen && modalAsset && (
        <InspectionHistoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          asset={modalAsset}
          onAssetUpdated={() => {
            loadAllInspections();
            if (onRefresh) onRefresh();
          }}
          onRefreshGlobal={() => {
            loadAllInspections();
            if (onRefresh) onRefresh();
          }}
          isAdmin={isAdmin}
          isDemo={isDemo}
        />
      )}
    </div>
  );
}
