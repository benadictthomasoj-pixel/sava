import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileText,
  Database,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar,
  Building,
  CheckCircle2,
  FileCheck,
  Hash,
  MapPin,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';
import { fetchSourceDocument } from '../services/api';
import { getDemoSourceDocument } from '../demo/demoService';
import StatusBadge from './StatusBadge';
import { useLanguage } from '../context/LanguageContext';

/**
 * Formats the retrieval match score.
 * The underlying score from the retrieval engine is an uncalibrated additive point score
 * (e.g. 50 pts, 85 pts, 270 pts based on keyword, section title, and asset match weights).
 * It is NOT a calibrated probability and must not be presented as a confidence percentage.
 */
export function formatRetrievalScore(evidence) {
  if (!evidence) return 'N/A';

  const raw = evidence.relevance_score !== undefined ? evidence.relevance_score : evidence.confidence_score;
  if (raw === null || raw === undefined) return 'N/A';

  const num = Number(raw);
  if (isNaN(num)) return 'N/A';

  // Out of range (negative) scores: clamp to 0 pts gracefully
  if (num < 0) return '0 pts';

  // If a legacy mock or external client passed a fraction <= 1.0, scale by 100
  let scoreVal = num;
  if (evidence.relevance_score === undefined && num > 0 && num <= 1.0) {
    scoreVal = num * 100;
  }

  return `${Math.round(scoreVal)} pts`;
}

/**
 * EvidenceViewerModal
 * Grounded evidence inspection modal for the AAYAM AI Decision Copilot.
 * Allows users to inspect retrieved source citations, metadata, verified excerpts,
 * and underlying source documents while clearly distinguishing retrieved evidence
 * from AI-synthesized explanations.
 */
export default function EvidenceViewerModal({
  isOpen,
  onClose,
  selectedCitationLabel,
  citations = [],
  evidence = [],
  onNavigate,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [activeLabel, setActiveLabel] = useState(null);
  const [activeTab, setActiveTab] = useState('excerpt'); // 'excerpt' | 'document'
  const [fullDoc, setFullDoc] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);

  // Sync active label when modal opens or selected citation changes
  useEffect(() => {
    if (isOpen) {
      if (selectedCitationLabel) {
        setActiveLabel(selectedCitationLabel);
      } else if (evidence.length > 0 && evidence[0].citation_label) {
        setActiveLabel(evidence[0].citation_label);
      } else if (citations.length > 0) {
        // extract e.g. "Ref 1" from "[Ref 1] ..."
        const match = citations[0].match(/\[(Ref\s*\d+)\]/i);
        setActiveLabel(match ? match[1] : 'Ref 1');
      } else {
        setActiveLabel('Ref 1');
      }
      setActiveTab('excerpt');
      setFullDoc(null);
      setDocError(null);
    }
  }, [isOpen, selectedCitationLabel, citations, evidence]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean label string for matching
  const cleanActiveLabel = (activeLabel || '')
    .replace(/[\[\]]/g, '')
    .trim()
    .toLowerCase();

  // Find matching evidence item
  const matchedEvidence = evidence.find((item) => {
    if (!item.citation_label) return false;
    const cleanItemLabel = item.citation_label.replace(/[\[\]]/g, '').trim().toLowerCase();
    return cleanItemLabel === cleanActiveLabel;
  });

  // Find matching citation string
  const matchedCitationString = citations.find((cite) => {
    return cite.toLowerCase().includes(cleanActiveLabel);
  });

  // Load underlying source document when user switches to 'document' tab
  const handleLoadDocument = async (docNameOrFile) => {
    if (!docNameOrFile) {
      setDocError('No source document identifier associated with this citation.');
      return;
    }

    setDocLoading(true);
    setDocError(null);
    try {
      if (isDemo) {
        const data = await getDemoSourceDocument(docNameOrFile);
        setFullDoc(data);
        return;
      }
      const data = await fetchSourceDocument(docNameOrFile);
      setFullDoc(data);
    } catch (err) {
      console.warn('Could not load source document:', err);
      setDocError(
        err.message || 'Source document file is unavailable in the server evidence archive.'
      );
      setFullDoc(null);
    } finally {
      setDocLoading(false);
    }
  };

  // Trigger document load when user clicks the document reader tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'document' && !fullDoc && !docLoading && !docError) {
      const docTarget = matchedEvidence?.source_file || matchedEvidence?.document_name;
      if (docTarget) {
        handleLoadDocument(docTarget);
      } else {
        setDocError('This citation refers to a structured database record, not an external document file.');
      }
    }
  };

  // Reset doc state when switching citation tabs
  const handleSelectCitation = (label) => {
    setActiveLabel(label);
    setActiveTab('excerpt');
    setFullDoc(null);
    setDocError(null);
  };

  if (!isOpen) return null;

  const isDoc = matchedEvidence?.evidence_type === 'document_audit_passage';
  const isDb = matchedEvidence?.evidence_type === 'asset_telemetry_record';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/90 border border-cyan-800/80 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  {t('evidence.copilotEvidenceViewer', 'Copilot Evidence Viewer')}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {t('evidence.groundTruthVerification', 'Ground Truth Verification')}
                </span>
              </div>
              <h3 id="evidence-viewer-title" className="text-base sm:text-lg font-bold text-white truncate">
                {t('evidence.viewerTitle', 'Retrieved Supporting Evidence & Provenance')}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Evidence Viewer"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clear AI-vs-Evidence Distinction Banner */}
        <div className={`px-5 py-2.5 border-b flex items-center justify-between gap-3 text-xs ${
          isDemo
            ? 'bg-amber-950/40 border-amber-800/40 text-amber-300'
            : 'bg-cyan-950/40 border-cyan-800/40 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isDemo ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span className="font-semibold text-[11px] sm:text-xs">
              {isDemo
                ? t('evidence.badgeDemo', 'Simulated Demonstration Specimen • Offline Audit Record')
                : t('evidence.badgeLive', '100% Unaltered Retrieval Evidence • Ground Truth Record')}
            </span>
          </div>
          <span className={`text-[10px] hidden sm:inline ${isDemo ? 'text-amber-200/80' : 'text-cyan-200/80'}`}>
            {isDemo
              ? t('evidence.subNoticeDemo', 'Authored for demonstration • Not verified real-world evidence')
              : t('evidence.subNoticeLive', 'Directly sourced prior to AI synthesis • Zero generative hallucination')}
          </span>
        </div>

        {/* Citation Selector Tabs (if multiple citations available) */}
        {evidence.length > 0 && (
          <div className="px-5 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              {t('evidence.citationsLabel', 'Citations:')}
            </span>
            {evidence.map((ev, idx) => {
              const label = ev.citation_label || `Ref ${idx + 1}`;
              const cleanEvLabel = label.replace(/[\[\]]/g, '').trim().toLowerCase();
              const isSelected = cleanEvLabel === cleanActiveLabel;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCitation(label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>[{label}]</span>
                  <span className="text-[10px] opacity-75 font-sans">
                    {ev.evidence_type === 'document_audit_passage' ? '(Doc)' : '(DB)'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {matchedEvidence ? (
            <>
              {/* Full Citation Provenance Summary String */}
              {matchedCitationString && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-cyan-300 flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold mb-0.5">
                      {t('evidence.provenanceRecord', 'Citation Provenance Record:')}
                    </span>
                    {matchedCitationString}
                  </div>
                </div>
              )}

              {/* Source Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>{t('evidence.evidenceType', 'Evidence Type')}</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-200">
                    {isDoc ? t('copilot.docExcerptBadge', 'Audit Document Excerpt') : t('copilot.dbTelemetryBadge', 'SQLite DB Telemetry')}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Building className="w-3 h-3 text-indigo-400" />
                    <span>{t('evidence.sourceAgency', 'Source Agency')}</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-200 truncate" title={matchedEvidence.source}>
                    {matchedEvidence.source || 'State Engineering Wing'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>{t('evidence.auditDate', 'Audit Date')}</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-200">
                    {matchedEvidence.timestamp || matchedEvidence.last_inspection_date || 'On Record'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{t('evidence.retrievalScore', 'Retrieval Score')}</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-200">
                    {formatRetrievalScore(matchedEvidence)}
                  </p>
                </div>
              </div>

              {/* View Mode Switcher for Documents */}
              {isDoc && (
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange('excerpt')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'excerpt'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {t('evidence.tabExcerpt', 'Verified Excerpt Passage')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('document')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      activeTab === 'document'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t('evidence.tabDocument', 'Full Source Document')}</span>
                    {matchedEvidence.file_type && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                        {matchedEvidence.file_type}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 1: Verified Retrieved Excerpt */}
              {activeTab === 'excerpt' && (
                <div className="space-y-4">
                  {/* Document Specific Info Card */}
                  {isDoc && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                            {t('evidence.docTitleSection', 'Document Title & Section')}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {matchedEvidence.document_name || 'Engineering Audit Document'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {matchedEvidence.section_title && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {matchedEvidence.section_title}
                            </span>
                          )}
                          {matchedEvidence.page_number && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {t('evidence.pageNumber', 'Page {page}', { page: matchedEvidence.page_number })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Verbatim Excerpt */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          {t('evidence.retrievedPassage', 'Actual Retrieved Supporting Passage:')}
                        </span>
                        <blockquote className="p-4 rounded-xl bg-slate-900 border-l-4 border-cyan-500 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed shadow-inner">
                          "{matchedEvidence.excerpt || matchedEvidence.description}"
                        </blockquote>
                      </div>

                      {matchedEvidence.asset_id && (
                        <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                          <span>
                            {t('evidence.boundAssetId', 'Bound Asset ID: {id}', { id: matchedEvidence.asset_id })}
                          </span>
                          {onNavigate && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onNavigate('registry');
                              }}
                              className="text-cyan-400 hover:underline flex items-center gap-1 font-medium text-[11px]"
                            >
                              {t('evidence.openInRegistry', 'Open in Asset Registry')} <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SQLite Database Record Specific Card */}
                  {isDb && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                            {t('evidence.sqliteEntityTitle', 'SQLite Asset Primary Entity')}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {matchedEvidence.asset_name || matchedEvidence.asset_id}
                          </h4>
                        </div>
                        {matchedEvidence.status && (
                          <StatusBadge status={matchedEvidence.status} />
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                          <span className="text-slate-400 text-[11px] block">{t('evidence.locationClassification', 'Location & Classification')}</span>
                          <p className="text-white font-medium">
                            {matchedEvidence.district}, {matchedEvidence.state}
                          </p>
                          <p className="text-slate-400 text-[11px]">{t('evidence.categoryLabel', 'Category: {category}', { category: matchedEvidence.category || 'Infrastructure' })}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                          <span className="text-slate-400 text-[11px] block">{t('evidence.riskEvaluation', 'Risk Evaluation')}</span>
                          <p className="text-rose-400 font-bold">
                            {t('evidence.riskScore', 'Risk Score: {score}/100', { score: matchedEvidence.risk_score })}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            {t('evidence.lastAudit', 'Last Audit: {date}', { date: matchedEvidence.last_inspection_date || 'N/A' })}
                          </p>
                        </div>
                      </div>

                      {matchedEvidence.description && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {t('evidence.conditionRecord', 'Registered Condition Record')}
                          </span>
                          <p className="p-3 rounded-lg bg-slate-900 text-xs font-mono text-slate-200">
                            {matchedEvidence.description}
                          </p>
                        </div>
                      )}

                      {onNavigate && (
                        <div className="pt-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigate('registry');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                          >
                            <span>{t('evidence.inspectInRegistry', 'Inspect Asset in Registry')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Full Source Document Reader */}
              {activeTab === 'document' && (
                <div className="space-y-3">
                  {docLoading ? (
                    <div className="p-12 text-center space-y-3 bg-slate-950 rounded-xl border border-slate-800">
                      <Loader2 className="w-7 h-7 text-indigo-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-300 font-medium">
                        {t('evidence.loadingDoc', 'Loading verified source document archive...')}
                      </p>
                    </div>
                  ) : docError ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{t('evidence.archiveNotice', 'Source Document Archive Notice')}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{docError}</p>
                      <p className="text-[11px] text-slate-400">
                        {t('evidence.archiveNoticeSub', 'The verified excerpt passage displayed on the primary tab was captured directly during RAG document indexing and remains valid ground truth.')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('excerpt')}
                        className="mt-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs font-medium transition-colors"
                      >
                        {t('evidence.returnToExcerpt', 'Return to Verified Excerpt')}
                      </button>
                    </div>
                  ) : fullDoc ? (
                    <div className="space-y-3">
                      {/* Document Meta Header */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">{fullDoc.document_name}</span>
                          <span className="text-slate-400 text-[11px]">
                            {t('evidence.fileLabel', 'File: {filename} • Total Pages: {pages}', { filename: fullDoc.filename, pages: fullDoc.total_pages })}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {t('evidence.certifiedArchiveFile', 'Certified Archive File')}
                        </span>
                      </div>

                      {/* Content Reader */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-[360px] overflow-y-auto space-y-4">
                        {fullDoc.pages && fullDoc.pages.length > 0 ? (
                          fullDoc.pages.map((p) => (
                            <div key={p.page_number} className="space-y-1.5 pb-4 border-b border-slate-800/80 last:border-0">
                              <div className="text-[10px] uppercase font-bold text-cyan-400 font-sans flex items-center justify-between">
                                <span>{t('evidence.pageNumber', 'Page {page}', { page: p.page_number })}</span>
                                {matchedEvidence.page_number === p.page_number && (
                                  <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    {t('evidence.citedPage', 'Cited Page')}
                                  </span>
                                )}
                              </div>
                              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/50">
                                {p.text}
                              </pre>
                            </div>
                          ))
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                            {fullDoc.content}
                          </pre>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            /* Missing Citation State (Requirement 5) */
            <div className="p-8 text-center space-y-3 bg-slate-950 rounded-xl border border-slate-800">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">
                {t('evidence.citationNotFoundTitle', 'Citation [{label}] Not Found in Retrieved Set', { label: activeLabel || selectedCitationLabel })}
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                {t('evidence.citationNotFoundDesc', 'No supporting evidence passage was returned for this citation tag by the retrieval engine. To prevent hallucination, source content is never fabricated.')}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {t('evidence.closeViewer', 'Close Viewer')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{t('evidence.evidenceGuarantee', 'AAYAM Evidence-Grounded Guarantee: Every claim is linked to verified public audits.')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors ml-auto"
          >
            {t('evidence.closeViewer', 'Close Viewer')}
          </button>
        </div>
      </div>
    </div>
  );
}
