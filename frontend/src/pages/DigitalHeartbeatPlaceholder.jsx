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
import { useLanguage } from '../context/LanguageContext';
import {
  fetchAssetHeartbeat,
  fetchAssetInspections,
  createInspection,
  updateInspection,
  verifyInspectionOutcome,
  fetchAssetTimeline,
} from '../services/api';
import {
  getDemoHeartbeat,
  getDemoInspections,
  getDemoTimeline,
  createDemoInspection,
  updateDemoInspection,
  verifyDemoInspectionOutcome,
} from '../demo/demoService';

export default function DigitalHeartbeatPlaceholder({
  assets = [],
  selectedAsset,
  onSelectAsset,
  onNavigate,
  onRefresh,
  isAdmin = false,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const currentAsset = selectedAsset || assets[0] || null;
  const [heartbeat, setHeartbeat] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
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
  const [verificationDate, setVerificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [verifierName, setVerifierName] = useState('Senior Verification Engineer');
  const [verificationOutcome, setVerificationOutcome] = useState('Remediation Successful');
  const [verificationActionTaken, setVerificationActionTaken] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const canManage = isAdmin || isDemo;

  // Fetch heartbeat, inspections, and timeline whenever currentAsset changes
  const loadAssetTelemetry = async (assetId) => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const [hbData, inspData, timelineData] = await Promise.all([
          getDemoHeartbeat(assetId),
          getDemoInspections(assetId),
          getDemoTimeline(assetId),
        ]);
        setHeartbeat(hbData);
        setInspections(inspData || []);
        setTimeline(timelineData || []);
        return;
      }

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
      setActionSuccess(null);
      setActionError(null);
    }
  }, [currentAsset?.id]);

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    if (!formFindings.trim() || submittingInsp) return;

    setActionError(null);
    setActionSuccess(null);
    setSubmittingInsp(true);

    if (isDemo) {
      try {
        await createDemoInspection();
      } catch (err) {
        setActionError(err.message || 'Demo Mode: Recording inspections is disabled.');
      } finally {
        setSubmittingInsp(false);
      }
      return;
    }

    try {
      const res = await createInspection(currentAsset.id, {
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
      setActionSuccess(`Inspection ${res.id} recorded successfully! Risk score recalculated.`);
      await loadAssetTelemetry(currentAsset.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save inspection:', err);
      setActionError(`Failed to save inspection: ${err.message}`);
    } finally {
      setSubmittingInsp(false);
    }
  };

  const handleVerifySubmit = async (inspectionId) => {
    if (!verificationNotes.trim() || submittingVerify) return;
    setActionError(null);
    setActionSuccess(null);
    setSubmittingVerify(true);

    if (isDemo) {
      try {
        await verifyDemoInspectionOutcome();
      } catch (err) {
        setActionError(err.message || 'Demo Mode: Verification is disabled.');
      } finally {
        setSubmittingVerify(false);
      }
      return;
    }

    try {
      await verifyInspectionOutcome(inspectionId, {
        verification_notes: verificationNotes.trim(),
        verification_date: verificationDate.trim() || undefined,
        verifier_name: verifierName.trim() || undefined,
        outcome: verificationOutcome,
        actual_action_taken: verificationActionTaken.trim() || undefined,
      });
      setVerifyingInspId(null);
      setVerificationNotes('');
      setVerificationActionTaken('');
      setVerificationOutcome('Remediation Successful');
      setActionSuccess(`Outcome verified as "${verificationOutcome}" for inspection ${inspectionId}! Asset risk score updated.`);
      await loadAssetTelemetry(currentAsset.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Verification failed:', err);
      setActionError(`Verification failed: ${err.message}`);
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleStatusChange = async (inspectionId, newStatus) => {
    setActionError(null);
    setActionSuccess(null);

    if (isDemo) {
      try {
        await updateDemoInspection();
      } catch (err) {
        setActionError(err.message || 'Demo Mode: Status updates are disabled.');
      }
      return;
    }

    try {
      await updateInspection(inspectionId, { status: newStatus });
      setActionSuccess(`Status for ${inspectionId} updated to "${newStatus}".`);
      await loadAssetTelemetry(currentAsset.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Status update failed:', err);
      setActionError(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Asset Selector */}
      <div className={`p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDemo
          ? 'bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/30'
          : 'bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border-slate-800'
      }`}>
        <div className="space-y-1 max-w-2xl">
          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isDemo
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
              : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
          }`}>
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{isDemo ? t('heartbeat.badgeDemo', 'Simulated Digital Twin Telemetry • Demo Mode') : t('heartbeat.badgeLive', 'Explainable Digital Heartbeat • Closed-Loop System')}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {isDemo ? t('heartbeat.titleDemo', 'Demo Digital Heartbeat & Verification') : t('heartbeat.titleLive', 'Asset Condition, Dynamic Risk & Closed-Loop Verification')}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isDemo
              ? t('heartbeat.descDemo', 'Multi-factor decomposition of simulated scour, structural vibration, and telemetry for synthetic specimens. All actions are locally simulated and blocked from database mutations.')
              : t('heartbeat.descLive', 'Real-time derivation of multi-factor risk, structural health indices, data confidence, and recorded remediation interventions with outcome certification.')}
          </p>
        </div>

        {/* Asset Selector */}
        <div className="w-full md:w-80 bg-slate-950 p-2.5 rounded-xl border border-slate-800 shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            {t('heartbeat.activeAssetTarget', 'Active Asset Target')}
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
          <p className="text-sm text-slate-400">{t('heartbeat.noAssets', 'No assets available to display.')}</p>
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
                    <span>{t('heartbeat.verifiedRemediation', 'Verified Remediation')}</span>
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
                  {t('heartbeat.calculatedRiskScore', 'Calculated Risk Score')}
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
                  {t('heartbeat.tier', 'Tier: {tier}', { tier: heartbeat?.risk_tier || 'Dynamic' })}
                </span>
              </div>

              <div className="text-right border-l border-slate-800 pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t('heartbeat.structuralHealth', 'Structural Health')}
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {loading ? '...' : `${heartbeat?.health_index ?? currentAsset.health_index}%`}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {t('heartbeat.safetyMargin', 'Safety Margin')}
                </span>
              </div>

              <div className="text-right border-l border-slate-800 pl-6 hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t('heartbeat.dataConfidence', 'Data Confidence')}
                </span>
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {loading ? '...' : `${heartbeat?.data_confidence_score ?? 80}%`}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {t('heartbeat.fieldsVerified', '{count} fields verified', { count: heartbeat?.data_completeness?.verified_fields?.length ?? 4 })}
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
              <span>{t('heartbeat.tabFactors', 'Factor Decomposition')}</span>
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
              <span>{t('heartbeat.tabInterventions', 'Interventions & Verifications ({count})', { count: inspections.length })}</span>
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
              <span>{t('heartbeat.tabTimeline', 'Asset Timeline ({count})', { count: timeline.length })}</span>
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
                          {t('heartbeat.factorWeight', 'Weight: {weight}%', { weight: Math.round(f.weight * 100) })}
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
                        <span>{t('heartbeat.factorContribution', 'Contribution:')}</span>
                        <span className="font-bold text-slate-200">+{f.contribution} pts</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {f.description}
                    </p>
                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 truncate">
                      {t('heartbeat.sourcePrefix', 'Source: {source}', { source: f.source })}
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
                      {t('heartbeat.telemetryCompleteness', 'Telemetry Completeness & Missing Fields')}
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                        {t('heartbeat.verifiedBaseline', 'Verified Baseline Records ({count})', { count: heartbeat?.data_completeness?.verified_fields?.length || 0 })}
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
                          {t('heartbeat.missingRecords', 'Missing or Uncertified Records')}
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
                        {t('heartbeat.recommendedInvestigations', 'Recommended Next Investigations')}
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
                      <span>{t('heartbeat.recordAction', 'Record Action')}</span>
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
                    {t('heartbeat.closedLoopHeader', 'Closed-Loop Field Actions & Remediation Log')}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {t('heartbeat.closedLoopWorkflow', 'Workflow: Detect • Understand • Prioritise • Intervene • Verify • Learn')}
                  </p>
                </div>
                {canManage && (
                  <button
                    id="btn-dh-record-inspection"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md cursor-pointer ${
                      isDemo
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{showAddForm ? t('heartbeat.closeForm', 'Close Form') : isDemo ? t('heartbeat.scheduleInspectionDemo', 'Schedule Inspection (Demo)') : t('heartbeat.recordNewInspection', 'Record New Inspection')}</span>
                  </button>
                )}
              </div>

              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                  <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">
                    &times;
                  </button>
                </div>
              )}

              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                  <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
                    &times;
                  </button>
                </div>
              )}

              {/* Inspection Form (Admin / Demo Protected) */}
              {showAddForm && canManage && (
                <div className="p-5 rounded-xl bg-slate-900 border border-cyan-800/60 shadow-xl space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>{t('heartbeat.recordFieldInspectionFor', 'Record Field Inspection for {id}', { id: currentAsset.id })}</span>
                  </h5>

                  <form onSubmit={handleCreateInspection} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">{t('heartbeat.inspectionDate', 'Inspection Date')}</label>
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">{t('heartbeat.inspectionType', 'Inspection / Audit Type')}</label>
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
                      <label className="text-slate-400 block mb-1">{t('heartbeat.observedFindings', 'Observed Structural Findings')}</label>
                      <textarea
                        rows="2"
                        value={formFindings}
                        onChange={(e) => setFormFindings(e.target.value)}
                        placeholder={t('heartbeat.findingsPlaceholder', 'Document verified anomalies, crack widths, scour depths, sensor discrepancies...')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">{t('heartbeat.recommendedAction', 'Recommended Action')}</label>
                        <input
                          type="text"
                          value={formRecommendedAction}
                          onChange={(e) => setFormRecommendedAction(e.target.value)}
                          placeholder="e.g. Boulder dumping, impeller replacement..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">{t('heartbeat.actionTaken', 'Actual Action Taken')}</label>
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
                      <label className="text-slate-400 block mb-1">{t('heartbeat.evidenceRef', 'Evidence Reference (PDF / Photos)')}</label>
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
                        <span>{t('heartbeat.saveAndRecalculate', 'Save & Recalculate Risk')}</span>
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
                    <p className="text-xs text-slate-400">{t('heartbeat.noInspectionsLogged', 'No inspection records logged for this asset yet.')}</p>
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

                        {/* Status Transition & Verify Buttons (Admin / Demo Protected) */}
                        {canManage && (
                          <div className="flex items-center gap-1.5">
                            {insp.status !== 'Verified' && (
                              <>
                                <select
                                  id={`select-dh-status-${insp.id}`}
                                  value={insp.status}
                                  onChange={(e) => handleStatusChange(insp.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 p-1.5 rounded-lg focus:outline-none"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>

                                <button
                                  id={`btn-dh-verify-${insp.id}`}
                                  onClick={() => {
                                    setVerifyingInspId(insp.id);
                                    setVerificationActionTaken(insp.actual_action_taken || '');
                                    setVerificationOutcome('Remediation Successful');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>{t('heartbeat.verifyOutcome', 'Verify Outcome')}</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Findings & Actions */}
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">
                            {t('heartbeat.observedFindings', 'Observed Findings')}
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
                        {insp.status === 'Verified' && (
                          <div
                            className={`p-3 rounded-lg text-xs space-y-1 ${
                              insp.verification_outcome === 'Remediation Successful'
                                ? 'bg-emerald-950/20 border border-emerald-800/40 text-emerald-200'
                                : insp.verification_outcome === 'Remediation Unsuccessful'
                                ? 'bg-rose-950/20 border border-rose-800/40 text-rose-200'
                                : 'bg-amber-950/20 border border-amber-800/40 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('heartbeat.verifiedOn', 'Verified on {date} by {verifier}', { date: insp.verification_date || 'Recent', verifier: insp.verifier_name || 'Inspector' })}</span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  insp.verification_outcome === 'Remediation Successful'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : insp.verification_outcome === 'Remediation Unsuccessful'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {insp.verification_outcome || 'Verified'}
                              </span>
                            </div>
                            {insp.verification_notes && (
                              <p className="text-[11px] text-slate-300 leading-snug">
                                {insp.verification_notes}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{t('heartbeat.signOff', 'Sign-off: {user}', { user: insp.responsible_user || 'Engineering Authority' })}</span>
                          {insp.evidence_references && (
                            <span>{t('heartbeat.ref', 'Ref: {ref}', { ref: insp.evidence_references })}</span>
                          )}
                        </div>
                      </div>

                      {/* Verification Input Modal / Inline Prompt (Admin / Demo Protected) */}
                      {verifyingInspId === insp.id && canManage && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-600/50 space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{t('heartbeat.certifyVerification', 'Certify Inspection Verification')}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {t('heartbeat.currentStatus', 'Current Status: {status}', { status: insp.status })}
                            </span>
                          </div>

                          {insp.status !== 'Completed' ? (
                            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span>
                                {t('heartbeat.statusMustBeCompleted', '⚠️ Inspection must reach Completed status before verification.')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(insp.id, 'Completed')}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shrink-0"
                              >
                                Transition to Completed
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  {t('heartbeat.outcomeDecision', 'Outcome Decision *')}
                                </label>
                                <select
                                  value={verificationOutcome}
                                  onChange={(e) => setVerificationOutcome(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="Remediation Successful">
                                    Remediation Successful (Certify Defect Resolution)
                                  </option>
                                  <option value="Remediation Unsuccessful">
                                    Remediation Unsuccessful (Defect Persists — Maintain Penalty)
                                  </option>
                                  <option value="Further Assessment Required">
                                    Further Assessment Required (Needs NDT/Sonar — Maintain Penalty)
                                  </option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  {t('heartbeat.documentedActionTaken', 'Documented Intervention / Action Taken')} {verificationOutcome === 'Remediation Successful' && <span className="text-rose-400">*</span>}
                                </label>
                                <input
                                  type="text"
                                  value={verificationActionTaken}
                                  onChange={(e) => setVerificationActionTaken(e.target.value)}
                                  placeholder="e.g., Riprap scour armouring placed around pier P3; crack epoxy injected"
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-[10px] text-slate-500">
                                  {t('heartbeat.actionTakenRequiredNote', "Required when outcome is 'Remediation Successful' to confirm tangible engineering action.")}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  {t('heartbeat.verificationNotes', 'Engineering Verification Notes *')}
                                </label>
                                <textarea
                                  rows="2"
                                  value={verificationNotes}
                                  onChange={(e) => setVerificationNotes(e.target.value)}
                                  placeholder={t('heartbeat.verificationNotesPlaceholder', "Enter engineer verification notes (e.g. 'Post-repair sonar confirmed scour hole refilled; vibration amplitude returned below 2.0 mm/s')...")}
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] text-slate-400 block">{t('heartbeat.inspectionDate', 'Verification Date')}</label>
                                  <input
                                    type="date"
                                    value={verificationDate}
                                    onChange={(e) => setVerificationDate(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 block">{t('heartbeat.signingAuthority', 'Signing Authority')}</label>
                                  <input
                                    type="text"
                                    value={verifierName}
                                    onChange={(e) => setVerifierName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingInspId(null);
                                setVerificationNotes('');
                                setVerificationActionTaken('');
                              }}
                              className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                            {insp.status === 'Completed' && (
                              <button
                                type="button"
                                onClick={() => handleVerifySubmit(insp.id)}
                                disabled={submittingVerify || !verificationNotes.trim()}
                                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-md"
                              >
                                {submittingVerify ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                <span>{t('heartbeat.certifyAndRecalculate', 'Certify & Recalculate Risk')}</span>
                              </button>
                            )}
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
                  <span>{t('heartbeat.unifiedTimeline', 'Unified Event Timeline for {id}', { id: currentAsset.id })}</span>
                </h4>
                <span className="text-xs font-mono text-slate-400">
                  {t('heartbeat.recordedLifecycleEvents', '{count} Recorded Lifecycle Events', { count: timeline.length })}
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
                          {t('heartbeat.signed', 'Signed: {actor}', { actor: event.actor })}
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
