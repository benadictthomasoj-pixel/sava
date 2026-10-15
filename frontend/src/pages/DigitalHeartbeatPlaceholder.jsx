import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  Clock,
  Gauge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Compass,
  FileText,
  PlusCircle,
  CheckSquare,
  History,
  Send,
  Loader2,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  fetchAssetHeartbeat,
  fetchAssetInspections,
  createInspection,
  updateInspection,
  verifyInspectionOutcome,
  fetchAssetTimeline,
} from '../services/api';

export default function DigitalHeartbeatPlaceholder({
  assets = [],
  selectedAsset,
  onSelectAsset,
  onNavigate,
}) {
  const currentAsset = selectedAsset || assets[0] || null;
  const [heartbeat, setHeartbeat] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('heartbeat'); // 'heartbeat', 'inspections', 'timeline'

  // New Inspection Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState('Structural Audit');
  const [formFindings, setFormFindings] = useState('');
  const [formRecommendedAction, setFormRecommendedAction] = useState('');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formEvidenceRef, setFormEvidenceRef] = useState('');
  const [submittingInsp, setSubmittingInsp] = useState(false);

  // Verification Modal State
  const [verifyingInspId, setVerifyingInspId] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Fetch live heartbeat, inspections, and timeline whenever currentAsset changes
  const loadAssetTelemetry = async (assetId) => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const [hbData, inspData, timelineData] = await Promise.all([
        fetchAssetHeartbeat(assetId),
        fetchAssetInspections(assetId),
        fetchAssetTimeline(assetId),
      ]);
      setHeartbeat(hbData);
      setInspections(inspData || []);
      setTimeline(timelineData || []);
    } catch (err) {
      console.error('Failed to load asset telemetry:', err);
      setError(err.message || 'Error communicating with Digital Heartbeat API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAsset?.id) {
      loadAssetTelemetry(currentAsset.id);
    }
  }, [currentAsset?.id]);

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    if (!formFindings.trim()) return;

    setSubmittingInsp(true);
    try {
      await createInspection(currentAsset.id, {
        inspection_date: formDate,
        inspection_type: formType,
        findings: formFindings.trim(),
        recommended_action: formRecommendedAction.trim() || undefined,
        actual_action_taken: formActionTaken.trim() || undefined,
        evidence_references: formEvidenceRef.trim() || undefined,
      });

      // Reset form and reload
      setFormFindings('');
      setFormRecommendedAction('');
      setFormActionTaken('');
      setFormEvidenceRef('');
      setShowAddForm(false);
      await loadAssetTelemetry(currentAsset.id);
    } catch (err) {
      alert(`Failed to save inspection: ${err.message}`);
    } finally {
      setSubmittingInsp(false);
    }
  };

  const handleVerifySubmit = async (inspectionId) => {
    if (!verificationNotes.trim()) return;
    setSubmittingVerify(true);
    try {
      await verifyInspectionOutcome(inspectionId, {
        verification_notes: verificationNotes.trim(),
      });
      setVerifyingInspId(null);
      setVerificationNotes('');
      await loadAssetTelemetry(currentAsset.id);
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleStatusChange = async (inspectionId, newStatus) => {
    try {
      await updateInspection(inspectionId, { status: newStatus });
      await loadAssetTelemetry(currentAsset.id);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Asset Selector */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Explainable Digital Heartbeat &bull; Closed-Loop System</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Asset Condition, Dynamic Risk & Closed-Loop Verification
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Real-time derivation of multi-factor risk, structural health indices, data confidence, and recorded remediation interventions with outcome certification.
          </p>
        </div>

        {/* Asset Selector */}
        <div className="w-full md:w-80 bg-slate-950 p-2.5 rounded-xl border border-slate-800 shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Active Asset Target
          </label>
          <select
            value={currentAsset?.id || ''}
            onChange={(e) => {
              const found = assets.find((a) => a.id === e.target.value);
              if (found && onSelectAsset) onSelectAsset(found);
            }}
            className="w-full bg-slate-900 text-xs font-medium text-white p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} — {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!currentAsset ? (
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-sm text-slate-400">No assets available to display.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Identity & KPI Score Bar */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400">
                  {currentAsset.id}
                </span>
                <StatusBadge status={heartbeat?.risk_tier ? `${heartbeat.risk_tier} Risk` : currentAsset.status} />
                <span className="text-xs text-slate-400 font-medium">
                  {currentAsset.category}
                </span>
                {heartbeat?.has_verified_intervention && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Remediation</span>
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white">
                {currentAsset.name}
              </h3>
              <p className="text-xs text-slate-400">
                {currentAsset.district}, {currentAsset.state} &bull; Commissioned {currentAsset.construction_year || 'N/A'}
              </p>
            </div>

            {/* Live Backend Metrics */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Calculated Risk Score
                </span>
                <span
                  className={`text-2xl font-black font-mono ${
                    (heartbeat?.risk_score ?? currentAsset.risk_score) >= 80
                      ? 'text-rose-400'
                      : (heartbeat?.risk_score ?? currentAsset.risk_score) >= 60
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {loading ? '...' : (heartbeat?.risk_score ?? currentAsset.risk_score)}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Tier: {heartbeat?.risk_tier || 'Dynamic'}
                </span>
              </div>

              <div className="text-right border-l border-slate-800 pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Structural Health
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {loading ? '...' : `${heartbeat?.health_index ?? currentAsset.health_index}%`}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Safety Margin
                </span>
              </div>

              <div className="text-right border-l border-slate-800 pl-6 hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Data Confidence
                </span>
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {loading ? '...' : `${heartbeat?.data_confidence_score ?? 80}%`}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {heartbeat?.data_completeness?.verified_fields?.length ?? 4} fields verified
                </span>
              </div>
            </div>
          </div>

          {/* Module Sub-Navigation: Heartbeat vs Inspections/Actions vs Lifecycle Timeline */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('heartbeat')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'heartbeat'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Factor Decomposition</span>
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'inspections'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Interventions & Verifications ({inspections.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Asset Timeline ({timeline.length})</span>
            </button>
          </div>

          {/* TAB 1: Digital Heartbeat Factor Decomposition */}
          {activeTab === 'heartbeat' && (
            <div className="space-y-5">
              {/* Factor Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {heartbeat?.contributing_factors?.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Weight: {Math.round(f.weight * 100)}%
                        </span>
                        <h4 className="text-xs font-bold text-white mt-0.5">
                          {f.name}
                        </h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {f.score}/100
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            f.score >= 75
                              ? 'bg-rose-500'
                              : f.score >= 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Contribution:</span>
                        <span className="font-bold text-slate-200">+{f.contribution} pts</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {f.description}
                    </p>
                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 truncate">
                      Source: {f.source}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Completeness & Suggested Investigations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Data Completeness Card */}
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-white text-sm">
                      Telemetry Completeness & Missing Fields
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                        Verified Baseline Records ({heartbeat?.data_completeness?.verified_fields?.length || 0})
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {heartbeat?.data_completeness?.verified_fields?.map((vf, idx) => (
                          <li key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{vf}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {heartbeat?.data_completeness?.missing_fields?.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                          Missing or Uncertified Records
                        </span>
                        <ul className="space-y-1">
                          {heartbeat.data_completeness.missing_fields.map((mf, idx) => (
                            <li key={idx} className="p-2 rounded bg-amber-950/20 border border-amber-900/30 text-amber-300 flex items-center gap-1.5 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{mf}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggested Next Investigations */}
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white text-sm">
                        Recommended Next Investigations
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('inspections');
                        setShowAddForm(true);
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>Record Action</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {heartbeat?.suggested_investigations?.map((inv, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-cyan-300 text-xs">
                            {inv.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {inv.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {inv.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Closed-Loop Inspection Recording & Outcome Verification */}
          {activeTab === 'inspections' && (
            <div className="space-y-5">
              {/* Top Action Header */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Closed-Loop Field Actions & Remediation Log
                  </h4>
                  <p className="text-xs text-slate-400">
                    Workflow: Detect &bull; Understand &bull; Prioritise &bull; Intervene &bull; Verify &bull; Learn
                  </p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-600/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{showAddForm ? 'Close Form' : 'Record New Inspection'}</span>
                </button>
              </div>

              {/* Inspection Form */}
              {showAddForm && (
                <div className="p-5 rounded-xl bg-slate-900 border border-cyan-800/60 shadow-xl space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>Record Field Inspection for {currentAsset.id}</span>
                  </h5>

                  <form onSubmit={handleCreateInspection} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Inspection Date</label>
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Inspection / Audit Type</label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option>Structural Audit</option>
                          <option>Underwater Sonar Bathymetry</option>
                          <option>Tri-axial Vibration Spectrum</option>
                          <option>NDT Ultrasonic Crack Depth</option>
                          <option>Emergency Post-Weather Survey</option>
                          <option>Routine Maintenance Clearing</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Observed Structural Findings</label>
                      <textarea
                        rows="2"
                        value={formFindings}
                        onChange={(e) => setFormFindings(e.target.value)}
                        placeholder="Document verified anomalies, crack widths, scour depths, sensor discrepancies..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Recommended Action</label>
                        <input
                          type="text"
                          value={formRecommendedAction}
                          onChange={(e) => setFormRecommendedAction(e.target.value)}
                          placeholder="e.g. Boulder dumping, impeller replacement..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Actual Action Taken</label>
                        <input
                          type="text"
                          value={formActionTaken}
                          onChange={(e) => setFormActionTaken(e.target.value)}
                          placeholder="e.g. Speed limited to 30 km/h, contract issued..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Evidence Reference (PDF / Photos)</label>
                      <input
                        type="text"
                        value={formEvidenceRef}
                        onChange={(e) => setFormEvidenceRef(e.target.value)}
                        placeholder="e.g. Mandovi_Bridge_Pier_Scour_Audit_2023.pdf, Photo-01.jpg"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingInsp}
                        className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submittingInsp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Save & Recalculate Risk</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Inspection Records List */}
              <div className="space-y-3">
                {inspections.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <CheckSquare className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No inspection records logged for this asset yet.</p>
                  </div>
                ) : (
                  inspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-400 uppercase">
                              {insp.id}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              &bull; {insp.inspection_date}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                insp.status === 'Verified'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : insp.status === 'Completed'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : insp.status === 'In Progress'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {insp.status}
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-sm mt-0.5">
                            {insp.inspection_type}
                          </h5>
                        </div>

                        {/* Status Transition Buttons */}
                        <div className="flex items-center gap-1.5">
                          {insp.status !== 'Verified' && (
                            <>
                              <select
                                value={insp.status}
                                onChange={(e) => handleStatusChange(insp.id, e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 p-1.5 rounded-lg focus:outline-none"
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>

                              <button
                                onClick={() => setVerifyingInspId(insp.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Verify Outcome</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Findings & Actions */}
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">
                            Observed Findings
                          </span>
                          <p className="text-slate-200 mt-0.5 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                            {insp.findings}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {insp.recommended_action && (
                            <div className="p-2.5 rounded bg-cyan-950/20 border border-cyan-800/30 text-cyan-200">
                              <span className="font-bold block text-[10px] uppercase text-cyan-400">
                                Recommended Action
                              </span>
                              <span>{insp.recommended_action}</span>
                            </div>
                          )}

                          {insp.actual_action_taken && (
                            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                              <span className="font-bold block text-[10px] uppercase text-slate-400">
                                Actual Action Taken
                              </span>
                              <span>{insp.actual_action_taken}</span>
                            </div>
                          )}
                        </div>

                        {/* Outcome Verification Banner */}
                        {insp.status === 'Verified' && insp.verification_notes && (
                          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Outcome Verification Certified on {insp.verification_date || 'Recent'}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">
                              {insp.verification_notes}
                            </p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Sign-off: {insp.responsible_user || 'Engineering Authority'}</span>
                          {insp.evidence_references && (
                            <span>Ref: {insp.evidence_references}</span>
                          )}
                        </div>
                      </div>

                      {/* Verification Input Modal / Inline Prompt */}
                      {verifyingInspId === insp.id && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-600/50 space-y-2 mt-2">
                          <span className="text-xs font-bold text-emerald-400 block">
                            Record Certified Outcome Verification
                          </span>
                          <textarea
                            rows="2"
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder="Enter engineer verification notes (e.g. 'Post-repair sonar confirmed scour hole refilled; vibration amplitude returned below 2.0 mm/s')..."
                            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingInspId(null);
                                setVerificationNotes('');
                              }}
                              className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifySubmit(insp.id)}
                              disabled={submittingVerify}
                              className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1"
                            >
                              {submittingVerify ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>Certify & Recalculate Risk</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Unified Lifecycle Timeline */}
          {activeTab === 'timeline' && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Unified Event Timeline for {currentAsset.id}</span>
                </h4>
                <span className="text-xs font-mono text-slate-400">
                  {timeline.length} Recorded Lifecycle Events
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative group">
                    <span
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        event.event_type === 'verification'
                          ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                          : event.event_type === 'intervention'
                          ? 'bg-cyan-500 ring-4 ring-cyan-500/20'
                          : event.event_type === 'commissioning'
                          ? 'bg-indigo-500'
                          : 'bg-amber-500 ring-4 ring-amber-500/20'
                      }`}
                    />
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                          {event.title}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {event.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {event.description}
                      </p>
                      {event.actor && (
                        <div className="pt-1 text-[10px] text-slate-400 font-mono">
                          Signed: {event.actor}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
