import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Calendar,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Activity,
  History,
  Image as ImageIcon,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Maximize2,
  PlusCircle,
  FileCheck,
  Loader2,
  RefreshCw,
  Printer,
  Compass,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchAssetIntelligence,
  uploadAssetMedia,
  createAssetFinding,
} from '../services/api';
import {
  getDemoAssetIntelligence,
  uploadDemoAssetMedia,
  createDemoAssetFinding,
} from '../demo/demoService';

export default function AssetIntelligenceProfile({
  assetId,
  initialAsset = null,
  isOpen = true,
  onClose,
  onOpenDocument,
  onOpenInspections,
  onNavigate,
  isDemo = false,
  isAdmin = false,
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'timeline' | 'media' | 'heartbeat' | 'findings' | 'sources'
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded Image Viewer Modal
  const [selectedImage, setSelectedImage] = useState(null);

  // Upload Media Dialog
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Visible Damage');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadUploader, setUploadUploader] = useState('Field Inspection Engineer');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Add Finding Dialog
  const [showAddFindingModal, setShowAddFindingModal] = useState(false);
  const [findingTitle, setFindingTitle] = useState('');
  const [findingPlain, setFindingPlain] = useState('');
  const [findingTechnical, setFindingTechnical] = useState('');
  const [findingSeverity, setFindingSeverity] = useState('Medium');
  const [findingComponent, setFindingComponent] = useState('');
  const [findingEvidence, setFindingEvidence] = useState('');
  const [findingRecommendation, setFindingRecommendation] = useState('');
  const [submittingFinding, setSubmittingFinding] = useState(false);
  const [findingError, setFindingError] = useState(null);

  // Media category filter
  const [mediaFilter, setMediaFilter] = useState('All');

  const loadIntelligence = async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const data = await getDemoAssetIntelligence(assetId);
        setIntel(data);
      } else {
        const data = await fetchAssetIntelligence(assetId);
        setIntel(data);
      }
    } catch (err) {
      console.error('Failed to load asset intelligence:', err);
      setError(err.message || 'Unable to load asset intelligence profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, [assetId, isDemo]);

  if (!isOpen) return null;

  const asset = intel?.asset || initialAsset;
  const heartbeat = intel?.heartbeat;
  const findings = intel?.findings || [];
  const sources = intel?.sources || [];
  const media = intel?.media || [];
  const timeline = intel?.timeline || [];
  const completeness = intel?.completeness || { percentage: 0, verified_fields: [], missing_fields: [] };

  const filteredMedia = mediaFilter === 'All'
    ? media
    : media.filter((m) => m.category.toLowerCase() === mediaFilter.toLowerCase());

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select an image file to upload.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('caption', uploadCaption);
      formData.append('source_uploader', uploadUploader);

      if (isDemo) {
        await uploadDemoAssetMedia();
      } else {
        await uploadAssetMedia(assetId, formData);
      }
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadCaption('');
      await loadIntelligence();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload media file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddFindingSubmit = async (e) => {
    e.preventDefault();
    if (!findingTitle.trim() || !findingPlain.trim()) {
      setFindingError('Title and plain-language explanation are required.');
      return;
    }
    setSubmittingFinding(true);
    setFindingError(null);
    try {
      const payload = {
        title: findingTitle.trim(),
        plain_explanation: findingPlain.trim(),
        technical_explanation: findingTechnical.trim() || null,
        severity: findingSeverity,
        affected_component: findingComponent.trim() || 'General Structure',
        supporting_evidence: findingEvidence.trim() || null,
        recommended_intervention: findingRecommendation.trim() || null,
      };

      if (isDemo) {
        await createDemoAssetFinding();
      } else {
        await createAssetFinding(assetId, payload);
      }
      setShowAddFindingModal(false);
      setFindingTitle('');
      setFindingPlain('');
      setFindingTechnical('');
      setFindingComponent('');
      setFindingEvidence('');
      setFindingRecommendation('');
      await loadIntelligence();
    } catch (err) {
      setFindingError(err.message || 'Failed to create finding.');
    } finally {
      setSubmittingFinding(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Identity & Overview', count: null },
    { id: 'timeline', label: 'History & Timeline', count: timeline.length },
    { id: 'media', label: 'Images & Visual Evidence', count: media.length },
    { id: 'heartbeat', label: 'Condition & Heartbeat', count: heartbeat ? `${heartbeat.risk_score.toFixed(0)}` : null },
    { id: 'findings', label: 'Findings & Recommendations', count: findings.length },
    { id: 'sources', label: 'Sources & Provenance', count: sources.length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-intel-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Profile Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-green-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center shadow-md shadow-green-700/20 shrink-0">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {asset?.id || assetId}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                  {asset?.category || 'Infrastructure'}
                </span>
                {asset?.status && <StatusBadge status={asset.status} size="sm" />}
              </div>
              <h2 id="asset-intel-title" className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {asset?.name || 'Infrastructure Asset Profile'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {asset?.district}, {asset?.state}
                </span>
                {asset?.ownership_authority && (
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Compass className="w-3.5 h-3.5 text-green-700" />
                    {asset.ownership_authority}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Built: {asset?.construction_year || 'Unrecorded'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Data Completeness Pill */}
            <div className="hidden md:flex flex-col items-end px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Data Completeness
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-green-700 rounded-full transition-all duration-500"
                    style={{ width: `${completeness.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {completeness.percentage}%
                </span>
              </div>
            </div>

            <button
              onClick={loadIntelligence}
              disabled={loading}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
              title="Refresh intelligence data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-700' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
              aria-label="Close intelligence profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-white px-5 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'border-green-700 text-green-800 bg-green-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-green-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50">
          {loading && !intel ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-green-700 animate-spin" />
              <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                Synthesizing Infrastructure Intelligence Profile...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: IDENTITY & OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Operational Status
                      </span>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={asset?.status} size="md" />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Last Audit: {asset?.last_inspection_date || 'No recent audit'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Digital Heartbeat
                      </span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">
                          {heartbeat ? heartbeat.risk_score.toFixed(1) : asset?.risk_score?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">/ 100 Risk</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-medium">Health Index:</span>
                        <span className="font-bold text-green-700">
                          {heartbeat ? heartbeat.health_index.toFixed(1) : asset?.health_index?.toFixed(1) || 'N/A'}/100
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Geographic Coordinates
                      </span>
                      <div className="mt-2 flex items-baseline gap-1 font-mono text-sm font-bold text-slate-800">
                        <span>{asset?.latitude?.toFixed(4)}°N</span>, <span>{asset?.longitude?.toFixed(4)}°E</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {asset?.district}, {asset?.state}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Audit Completeness
                      </span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-green-800">
                          {completeness.percentage}%
                        </span>
                        <span className="text-xs text-slate-500">
                          ({completeness.verified_fields.length}/{completeness.total_fields} verified)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {completeness.missing_fields.length === 0
                          ? 'Zero unverified data parameters'
                          : `Missing: ${completeness.missing_fields.join(', ')}`}
                      </p>
                    </div>
                  </div>

                  {/* Asset Description & Identity Card */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-green-700" />
                      Engineering Specifications & Identity
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {asset?.description || 'No engineering narrative provided for this infrastructure asset.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block">Responsible Authority</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {asset?.ownership_authority || 'Unassigned / Unrecorded in Registry'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Commissioning & Construction</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {asset?.construction_year ? `Year ${asset.construction_year}` : 'Date Unknown'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Telemetry Telemetry Source</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                          {asset?.data_source || 'Standard Registry Entry'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Flagged Reasons (if any) */}
                  {Array.isArray(asset?.flagged_reasons) && asset.flagged_reasons.length > 0 && (
                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Identified Vulnerabilities & Flagged Conditions
                      </h4>
                      <ul className="space-y-1.5">
                        {asset.flagged_reasons.map((reason, idx) => (
                          <li key={idx} className="text-xs text-amber-800 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: HISTORY & TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Chronological Audit & Life-Cycle History
                      </h3>
                      <p className="text-xs text-slate-500">
                        Documented milestones, engineering inspections, and verified interventions.
                      </p>
                    </div>
                    {onOpenInspections && (
                      <button
                        onClick={() => onOpenInspections(asset)}
                        className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Manage Inspections</span>
                      </button>
                    )}
                  </div>

                  {timeline.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No historical events recorded</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Historical inspections or maintenance records have not been filed for this asset yet.
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {timeline.map((event, idx) => {
                        const isVerified = event.is_verified || event.type === 'intervention_verified';
                        return (
                          <div key={idx} className="relative group">
                            {/* Marker dot */}
                            <div
                              className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-colors ${
                                isVerified
                                  ? 'border-green-600 ring-2 ring-green-100'
                                  : 'border-slate-400'
                              }`}
                            />
                            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {event.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.date || 'Date Unknown'}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      isVerified
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {isVerified ? 'Documented Fact' : 'Registry Entry'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                                {event.description}
                              </p>
                              {event.responsible_user && (
                                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                                  Lead Inspector / Authority: <span className="text-slate-700">{event.responsible_user}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: IMAGES & VISUAL EVIDENCE */}
              {activeTab === 'media' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                      {['All', 'Visible Damage', 'Structural Components', 'General Infrastructure', 'Inspection Photographs'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setMediaFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            mediaFilter === cat
                              ? 'bg-green-700 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Evidence Media</span>
                    </button>
                  </div>

                  {filteredMedia.length === 0 ? (
                    <div className="py-14 text-center bg-white rounded-xl border border-slate-200">
                      <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No infrastructure media available</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        No verified photographs or diagrams have been submitted under category "{mediaFilter}". Click upload to attach verified imagery.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredMedia.map((m) => (
                        <div
                          key={m.id}
                          className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
                        >
                          <div
                            onClick={() => setSelectedImage(m)}
                            className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                          >
                            <img
                              src={m.media_url}
                              alt={m.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/api/media/placeholder.svg';
                              }}
                            />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-white/90 text-slate-900 shadow-md transition-opacity">
                                <Maximize2 className="w-4 h-4" />
                              </span>
                            </div>
                            <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/95 text-slate-800 shadow-xs border border-slate-200">
                              {m.category}
                            </span>
                          </div>

                          <div className="p-3.5 flex-1 flex flex-col justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                                {m.caption}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                                <FileCheck className="w-3.5 h-3.5 text-green-700 shrink-0" />
                                <span className="truncate">{m.verification_status}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                              <span>Captured: {m.capture_date || 'Unknown'}</span>
                              <span className="truncate max-w-[120px]">{m.source_uploader}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CONDITION & HEARTBEAT */}
              {activeTab === 'heartbeat' && (
                <div className="space-y-6">
                  {/* Heartbeat Gauge & Metrics */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-green-700" />
                          <h3 className="text-base font-bold text-slate-900">
                            Digital Heartbeat Telemetry & Degradation Model
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Authoritative deterministic 4-factor risk calculation from backend engine.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Risk Tier
                          </span>
                          <span className={`text-sm font-bold ${
                            heartbeat?.risk_tier === 'Critical' ? 'text-red-700' :
                            heartbeat?.risk_tier === 'High' ? 'text-amber-700' :
                            heartbeat?.risk_tier === 'Moderate' ? 'text-yellow-700' : 'text-green-700'
                          }`}>
                            {heartbeat?.risk_tier || 'Moderate'}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Confidence
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {heartbeat ? (heartbeat.data_confidence_score * 100).toFixed(0) : '90'}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contributing Factors Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {(heartbeat?.contributing_factors || []).map((factor) => (
                        <div
                          key={factor.id}
                          className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              {factor.name}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {factor.score.toFixed(1)} / 100
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                factor.score >= 70 ? 'bg-red-600' :
                                factor.score >= 40 ? 'bg-amber-500' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, factor.score))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {factor.explanation}
                          </p>
                          <p className="text-[10px] text-slate-500 italic">
                            Evidence: {factor.supporting_evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Engineering Investigations */}
                  {Array.isArray(heartbeat?.suggested_investigations) && heartbeat.suggested_investigations.length > 0 && (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-green-700" />
                        Recommended Next Investigations & Priority Interventions
                      </h4>
                      <div className="space-y-2">
                        {heartbeat.suggested_investigations.map((inv, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{inv.title}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                                  inv.priority === 'High' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-200 text-slate-800'
                                }`}>
                                  {inv.priority} Priority
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{inv.detail}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              Rec #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FINDINGS & RECOMMENDATIONS */}
              {activeTab === 'findings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Observed Engineering Findings & Defects
                      </h3>
                      <p className="text-xs text-slate-500">
                        Individual structured defect records with evidence linkages and resolution status.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddFindingModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Register Finding</span>
                    </button>
                  </div>

                  {findings.length === 0 ? (
                    <div className="py-14 text-center bg-white rounded-xl border border-slate-200">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No acute findings registered</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Infrastructure baseline has zero recorded defect anomalies.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {findings.map((f) => (
                        <div
                          key={f.id}
                          className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  f.severity === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  f.severity === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  f.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                  'bg-green-100 text-green-800 border border-green-200'
                                }`}
                              >
                                {f.severity}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              Status: {f.resolution_status}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <p className="text-slate-800 font-medium leading-relaxed">
                              {f.plain_explanation}
                            </p>
                            {f.technical_explanation && (
                              <p className="text-slate-600 font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                                Technical Note: {f.technical_explanation}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">Affected Component</span>
                              <span className="font-semibold text-slate-800">{f.affected_component}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Supporting Evidence</span>
                              <span className="font-semibold text-slate-800">{f.supporting_evidence || 'Direct Sensor Reading'}</span>
                            </div>
                          </div>

                          {f.recommended_intervention && (
                            <div className="p-2.5 rounded-lg bg-green-50/60 border border-green-200 text-xs text-green-900 flex items-start gap-2">
                              <ShieldCheck className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Recommended Intervention: </span>
                                <span>{f.recommended_intervention}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: SOURCES & PROVENANCE */}
              {activeTab === 'sources' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Traceable Evidence Sources & Grounded Provenance
                    </h3>
                    <p className="text-xs text-slate-500">
                      Factual claims corroborated by official documents, telemetry feeds, and field surveys.
                    </p>
                  </div>

                  {sources.length === 0 ? (
                    <div className="py-14 text-center bg-white rounded-xl border border-slate-200">
                      <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No primary sources attached</p>
                      <p className="text-xs text-slate-500 mt-1">
                        No external audit files or telemetry sources mapped to this asset ID.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sources.map((s) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                                {s.source_type}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-700" />
                              {s.verification_status}
                            </span>
                          </div>

                          {s.exact_excerpt && (
                            <blockquote className="text-xs text-slate-700 italic bg-slate-50 border-l-2 border-green-700 pl-3 py-1.5 rounded-r">
                              "{s.exact_excerpt}"
                            </blockquote>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-slate-600">
                              <span>Origin: <strong className="text-slate-800">{s.origin_provider}</strong></span>
                              {s.page_reference && (
                                <span>Ref: <strong className="text-slate-800">{s.page_reference}</strong></span>
                              )}
                            </div>

                            {onOpenDocument && s.document_name && (
                              <button
                                onClick={() => onOpenDocument(s.document_name)}
                                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-green-700" />
                                <span>Inspect Source Document</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            <span>AAYAM Evidence Engine • Zero Hallucination Guarantee</span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('reports');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Full Audit Report</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-900">{selectedImage.caption}</span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] bg-slate-950 flex items-center justify-center p-2">
              <img
                src={selectedImage.media_url}
                alt={selectedImage.caption}
                className="max-h-[58vh] max-w-full object-contain"
              />
            </div>
            <div className="p-4 bg-white space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Category: <strong className="text-slate-800">{selectedImage.category}</strong></span>
                <span>Verification: <strong className="text-green-700">{selectedImage.verification_status}</strong></span>
              </div>
              <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100">
                <span>Uploader: {selectedImage.source_uploader}</span>
                <span>Captured: {selectedImage.capture_date}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Media Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-700" />
                Upload Infrastructure Photographic Evidence
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Evidence Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                >
                  <option value="Visible Damage">Visible Damage</option>
                  <option value="Structural Components">Structural Components</option>
                  <option value="General Infrastructure">General Infrastructure</option>
                  <option value="Inspection Photographs">Inspection Photographs</option>
                  <option value="Repairs and Remediation">Repairs and Remediation</option>
                  <option value="Historical Photographs">Historical Photographs</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Image Caption / Technical Annotation
                </label>
                <input
                  type="text"
                  required
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="e.g. Ultrasonic inspection of Pier P-04 scour bed"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source / Uploader Authority
                </label>
                <input
                  type="text"
                  value={uploadUploader}
                  onChange={(e) => setUploadUploader(e.target.value)}
                  placeholder="e.g. State Highway Inspection Drone Team"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Image File (PNG, JPG, SVG, WebP up to 10MB)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploading ? 'Uploading...' : 'Submit Evidence'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Finding Modal */}
      {showAddFindingModal && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddFindingModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-green-700" />
                Register Engineering Defect Finding
              </h3>
              <button
                onClick={() => setShowAddFindingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {findingError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {findingError}
              </div>
            )}

            <form onSubmit={handleAddFindingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Finding Title
                </label>
                <input
                  type="text"
                  required
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  placeholder="e.g. Elastomer joint gland rupture on Span S-12"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Affected Component
                  </label>
                  <input
                    type="text"
                    value={findingComponent}
                    onChange={(e) => setFindingComponent(e.target.value)}
                    placeholder="e.g. Expansion Joint J-08"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plain-Language Explanation
                </label>
                <textarea
                  required
                  rows={2}
                  value={findingPlain}
                  onChange={(e) => setFindingPlain(e.target.value)}
                  placeholder="Explain the problem in terms an ordinary user or auditor can understand..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Technical Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={findingTechnical}
                  onChange={(e) => setFindingTechnical(e.target.value)}
                  placeholder="Engineering standards, formulas, measurements, or code references..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recommended Engineering Intervention
                </label>
                <input
                  type="text"
                  value={findingRecommendation}
                  onChange={(e) => setFindingRecommendation(e.target.value)}
                  placeholder="e.g. Reseal joint gland and install drainage deflection shield"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-green-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddFindingModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFinding}
                  className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingFinding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>{submittingFinding ? 'Saving...' : 'Register Finding'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
