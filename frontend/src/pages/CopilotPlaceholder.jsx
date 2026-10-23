import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Database,
  ExternalLink,
  Layers,
  BookOpen,
  Bookmark,
  Cpu,
  Info,
} from 'lucide-react';
import { askCopilot } from '../services/api';
import { askDemoCopilot } from '../demo/demoService';
import StatusBadge from '../components/StatusBadge';
import EvidenceViewerModal from '../components/EvidenceViewerModal';
import { useLanguage } from '../context/LanguageContext';

/**
 * Parses and formats inline bold text and citation tags like [Ref 1], [Ref 2].
 * Makes citations interactive triggers that open the supporting Evidence Viewer.
 */
function renderInlineContent(content, onOpenCitation) {
  if (!content) return null;
  const regex = /(\*\*.*?\*\*|\[Ref\s*\d+\])/g;
  const parts = content.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[Ref\s*\d+\]$/.test(part)) {
      const refLabel = part.replace(/[\[\]]/g, '').trim();
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onOpenCitation && onOpenCitation(refLabel)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded text-[10px] font-mono font-bold bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 hover:border-cyan-400 shadow-sm align-baseline transition-all cursor-pointer hover:scale-105 active:scale-95"
          title={`Click to inspect verified supporting evidence for ${part}`}
        >
          <BookOpen className="w-2.5 h-2.5" />
          <span>{part}</span>
        </button>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Clean markdown-aware renderer for technical synthesis answers with interactive citations
 */
function MarkdownAnswer({ text, onOpenCitation }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let currentList = [];

  const flushList = () => {
    if (inList && currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {currentList}
        </ul>
      );
      currentList = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('####')) {
      flushList();
      elements.push(
        <h5 key={index} className="text-xs font-bold uppercase tracking-wider text-cyan-400 mt-3 mb-1">
          {renderInlineContent(trimmed.replace(/^####\s*/, ''), onOpenCitation)}
        </h5>
      );
    } else if (trimmed.startsWith('###')) {
      flushList();
      elements.push(
        <h4 key={index} className="text-sm font-bold text-white mt-3 mb-1.5 border-b border-slate-800 pb-1">
          {renderInlineContent(trimmed.replace(/^###\s*/, ''), onOpenCitation)}
        </h4>
      );
    } else if (trimmed.startsWith('>')) {
      flushList();
      elements.push(
        <blockquote key={index} className="p-3 my-2 rounded-lg bg-slate-900/90 border-l-2 border-cyan-500 text-xs text-slate-200 italic leading-relaxed">
          {renderInlineContent(trimmed.replace(/^>\s*/, ''), onOpenCitation)}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      currentList.push(
        <li key={index} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
          <div className="flex-1">{renderInlineContent(trimmed.slice(2), onOpenCitation)}</div>
        </li>
      );
    } else {
      flushList();
      elements.push(
        <p key={index} className="text-xs text-slate-200 leading-relaxed mb-2">
          {renderInlineContent(trimmed, onOpenCitation)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function CopilotPlaceholder({ assets = [], onNavigate, isDemo = false }) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [selectedAssetScope, setSelectedAssetScope] = useState('ALL');
  const [activeQuery, setActiveQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Evidence Viewer Modal State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedCitationLabel, setSelectedCitationLabel] = useState('Ref 1');

  const handleOpenCitation = (label) => {
    setSelectedCitationLabel(label || 'Ref 1');
    setViewerOpen(true);
  };

  const demoPrompts = [
    {
      title: 'Mandovi Estuary Bridge (PDF)',
      prompt: 'What is the structural risk status of the Mandovi Estuary Memorial Bridge?',
      previewHint: 'PDF Doc & Sonar: -4.20m foundation scour cavity & riprap armor plan',
    },
    {
      title: 'Chambal Valley WTP (PDF)',
      prompt: 'Are there any anomalies or maintenance requirements for the Chambal Valley Water Treatment Plant?',
      previewHint: 'PDF Doc & SCADA: 1.62 mm/s RMS vibration (ISO 10816 Zone A) & 0.38 NTU turbidity',
    },
    {
      title: 'Kazhakootam Skyway (PDF)',
      prompt: 'Why is the Kazhakootam Skyway Corridor flagged for inspection?',
      previewHint: 'PDF Doc & Drone: 45-day overdue bearing audit & Span S-12 joint debonding',
    },
  ];

  const samplePrompts = [
    {
      title: 'Mandovi Bridge Audit (PDF)',
      prompt: 'What did the underwater sonar scour audit find for Mandovi Bridge Pier 4?',
      previewHint: 'PDF Doc & Telemetry: 2.4m scour hole depth & 48mm expansion joint gap',
    },
    {
      title: 'Chambal WTP Diagnostics (TXT)',
      prompt: 'Summarize pump motor vibration RMS velocity and clarifier torque anomalies for Chambal Unit 3.',
      previewHint: 'TXT Doc & Telemetry: 7.82 mm/s vibration & 142% torque spike',
    },
    {
      title: 'Western Ghats Culvert (TXT)',
      prompt: 'What is the culvert barrel silt blockage percentage and landslide risk in Idukki?',
      previewHint: 'Hydrology Doc: 68% cross-sectional block and 12mm slope creep',
    },
  ];

  const activePrompts = isDemo ? demoPrompts : samplePrompts;

  const handleAsk = async (questionToAsk) => {
    const q = (questionToAsk !== undefined ? questionToAsk : inputValue).trim();
    if (!q) {
      setError('Please type an infrastructure question before asking.');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveQuery(q);

    try {
      const options = {};
      if (selectedAssetScope && selectedAssetScope !== 'ALL') {
        options.asset_id = selectedAssetScope;
      }

      if (isDemo) {
        const data = await askDemoCopilot(q, options);
        setResponse(data);
        return;
      }

      const data = await askCopilot(q, options);
      setResponse(data);
    } catch (err) {
      console.error('Copilot request failed:', err);
      setError(err.message || 'Failed to query the AI Decision Copilot. Ensure the backend is running.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = (promptText) => {
    if (loading) return;
    setInputValue(promptText);
    handleAsk(promptText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleAsk();
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Copilot Header */}
      <div className={`p-6 rounded-2xl border shadow-xl space-y-2 ${
        isDemo
          ? 'bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/30'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800'
      }`}>
        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isDemo
            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
        }`}>
          <Bot className="w-3.5 h-3.5" />
          <span>{isDemo ? t('copilot.badgeDemo', 'Simulated Decision Copilot • Demo Mode') : t('copilot.badgeLive', 'Evidence-Grounded RAG Intelligence • Milestone 2')}</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">
          {isDemo ? t('copilot.titleDemo', 'AAYAM Demo Decision Copilot') : t('copilot.titleLive', 'AAYAM AI Decision Copilot')}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          {isDemo
            ? t('copilot.descDemo', 'Interactive intelligence demo answering infrastructure questions using synthetic engineering audit specimens. All responses and citations are simulated demonstration material.')
            : t('copilot.descLive', 'Answers complex public infrastructure inquiries grounded in indexed engineering audit PDFs, technical inspection logs, and verified SQLite asset telemetry.')}
        </p>
      </div>

      {/* Transparent Pipeline Status Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-200">
              {t('copilot.pipelineTitle', 'Evidence-Grounded RAG Architecture Active')}
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {t('copilot.pipelineDesc', 'Hybrid retrieval indexes SQLite asset records along with certified engineering PDF/TXT audit documents. Supports external LLM synthesis when configured (Google Gemini / OpenAI), with deterministic citation fallback.')}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
          RAG v2.1
        </span>
      </div>

      {/* Interactive Sample Verification Prompts */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('copilot.sampleInquiriesTitle', 'Sample Verification Inquiries (Click to Ask)')}
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {t('copilot.sampleInquiriesSubtitle', 'Queries live SQLite entities + indexed PDF/TXT audit documents')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activePrompts.map((p, idx) => {
            const isCurrent = activeQuery === p.prompt;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSampleClick(p.prompt)}
                disabled={loading}
                className={`p-4 rounded-xl text-left border transition-all disabled:opacity-50 ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide">
                    {p.title}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <p className="text-xs font-medium text-slate-200 mb-2">
                  "{p.prompt}"
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                  {t('copilot.keyEvidencePrefix', 'Key evidence: {hint}', { hint: p.previewHint })}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Copilot Chat & Output Canvas */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
        {/* Output Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">{t('copilot.outputWindowTitle', 'Copilot Output Window')}</span>
            {response && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                response.evidence_sufficiency === 'sufficient'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                Sufficiency: {response.evidence_sufficiency} ({response.confidence_level} Confidence)
              </span>
            )}
          </div>

          {response && (
            <div className="flex items-center gap-1.5">
              {response.pipeline_type.startsWith('llm_grounded_rag') ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px]">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{response.pipeline_type}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px]">
                  <Database className="w-3 h-3 text-amber-400" />
                  <span>{response.pipeline_type}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Output Content Area */}
        <div className="p-6 min-h-[220px] flex flex-col justify-center">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-200">
                Searching SQLite telemetry records & indexed PDF/TXT audit documents...
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Query: "{activeQuery}"
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Copilot Query Error</span>
              </div>
              <p className="text-xs text-rose-200 font-mono">{error}</p>
              <p className="text-[11px] text-slate-400">
                Please verify that the backend is running at <code className="text-cyan-400">http://127.0.0.1:8000</code> and try again.
              </p>
            </div>
          ) : response ? (
            <div className="space-y-6">
              {/* Active Query Display */}
              <div className="flex items-start gap-3 pb-4 border-b border-slate-800/80">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    User Inquiry
                  </span>
                  <p className="text-sm font-semibold text-white">
                    "{response.question}"
                  </p>
                </div>
              </div>

              {/* Zero matches notification banner */}
              {response.matched_assets_count === 0 && response.evidence.length === 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>No Matching Infrastructure Records Found</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    The inquiry does not match any indexed asset primary keys, component names, or engineering audit documents.
                  </p>
                </div>
              )}

              {/* Understandable Grounded Answer with Citations */}
              <div className="space-y-2">
                {isDemo && (
                  <div
                    data-testid="copilot-demo-disclaimer"
                    className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-300"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>
                      Simulated Demonstration Material: response and citations are synthetic specimens authored for offline walkthrough. Not verified real-world evidence.
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                      {isDemo ? 'Simulated Technical Synthesis' : 'Grounded Technical Synthesis'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                      <span>{isDemo ? t('copilot.synthesisDemo', 'Simulated Demonstration Synthesis') : t('copilot.synthesisLive', 'AI Model Synthesis')}</span>
                    </span>
                  </div>
                  {response.citations && response.citations.length > 0 && (
                    <span className="text-[10px] font-mono text-amber-400">
                      {isDemo ? t('copilot.simulatedCitationsCited', '{count} Simulated Citations Cited', { count: response.citations.length }) : t('copilot.verifiedSourcesCited', '{count} Verified Sources Cited', { count: response.citations.length })}
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans shadow-inner">
                  <MarkdownAnswer text={response.answer} onOpenCitation={handleOpenCitation} />
                </div>
              </div>

              {/* Citations Box with Deduplicated Source References (Interactive) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isDemo ? t('copilot.evidenceCitationsTitleDemo', 'Simulated Demonstration Citations & Source Provenance') : t('copilot.evidenceCitationsTitleLive', 'Evidence Citations & Source Provenance')}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    {t('copilot.clickCitationHint', 'Click any citation to inspect underlying evidence passage & document')}
                  </span>
                </div>

                {response.citations && response.citations.length > 0 ? (
                  <div className="space-y-2">
                    {response.citations.map((cite, idx) => {
                      const match = cite.match(/\[(Ref\s*\d+)\]/i);
                      const refLabel = match ? match[1] : `Ref ${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-800/80 flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-1.5 py-0.5 rounded shrink-0">
                              [{refLabel}]
                            </span>
                            <span className="font-mono text-[11px] text-slate-300 truncate" title={cite}>
                              {cite.replace(/^\[Ref\s*\d+\]\s*/, '')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCitation(refLabel)}
                            className="px-2.5 py-1 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 hover:border-cyan-500 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                            title={`Inspect supporting evidence for ${refLabel}`}
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{t('copilot.inspectEvidence', 'Inspect Evidence')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{t('copilot.noCitationsReturned', 'No citations were returned for this inquiry.')}</span>
                  </div>
                )}
              </div>

              {/* Observed Facts vs Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Verified Observed Facts */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        {t('copilot.observedFactsTitle', 'Observed Empirical Facts')}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t('copilot.groundTruthBadge', 'Ground Truth')}
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {response.observed_facts.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <div>{renderInlineContent(fact, handleOpenCitation)}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Engineering Next Steps */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        {t('copilot.recommendedActionsTitle', 'Recommended Actions')}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {t('copilot.aiGuidanceBadge', 'AI Guidance')}
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {response.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <div>{renderInlineContent(rec, handleOpenCitation)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Supporting Evidence Records (Structured Assets + PDF/TXT Documents) */}
              {response.evidence && response.evidence.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {t('copilot.retrievedEvidenceTitle', 'Retrieved Evidence Passages & Records ({count})', { count: response.evidence.length })}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {t('copilot.unalteredArchiveBadge', 'Unaltered Archive')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {t('copilot.retrievedEvidenceSource', 'Source: SQLite + Indexed Documents')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {response.evidence.map((ev, idx) => {
                      const isDoc = ev.evidence_type === 'document_audit_passage';
                      const label = ev.citation_label || `Ref ${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase block">
                                  [{label}]{' '}
                                  {ev.asset_id || (isDoc ? 'DOCUMENT AUDIT' : 'ASSET')}
                                </span>
                                <h5 className="font-bold text-white text-xs">
                                  {ev.document_name || ev.asset_name || 'Engineering Evidence'}
                                </h5>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                {isDoc ? t('copilot.docExcerptBadge', 'Doc Excerpt') : t('copilot.dbTelemetryBadge', 'DB Telemetry')}
                              </span>
                            </div>

                            {isDoc ? (
                              <div className="text-[11px] text-slate-300 space-y-1.5">
                                <p className="text-slate-400 text-[10px]">
                                  {ev.section_title && <span>{ev.section_title} &bull; </span>}
                                  {ev.page_number && <span>Page {ev.page_number} &bull; </span>}
                                  <span>Audit Date: {ev.timestamp || 'N/A'}</span>
                                </p>
                                {ev.excerpt && (
                                  <blockquote className="p-2 rounded bg-slate-900 border-l-2 border-cyan-500 text-[11px] text-slate-200 italic leading-snug">
                                    "{ev.excerpt.slice(0, 260)}..."
                                  </blockquote>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-300 space-y-1">
                                <p>
                                  <span className="text-slate-400">Location:</span> {ev.district}, {ev.state} ({ev.category})
                                </p>
                                <p>
                                  <span className="text-slate-400">Risk Score:</span>{' '}
                                  <span className="font-bold text-rose-400">{ev.risk_score}/100</span> &bull;{' '}
                                  <span className="text-slate-400">Last Audit:</span> {ev.last_inspection_date || 'N/A'}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between gap-2">
                            <span className="truncate max-w-[150px]" title={ev.source}>
                              {ev.source}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenCitation(label)}
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold text-[10px] transition-colors"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>{t('copilot.inspectButton', 'Inspect')}</span>
                              </button>
                              {ev.asset_id && onNavigate && (
                                <button
                                  type="button"
                                  onClick={() => onNavigate('registry')}
                                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium text-[10px]"
                                >
                                  {t('copilot.registryButton', 'Registry')} <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Limitations Notice */}
              {response.limitations_note && (
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{response.limitations_note}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-2 text-slate-400 py-8">
              <Bot className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-300">
                {t('copilot.readyForInquiries', 'Ready for infrastructure inquiries')}
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {t('copilot.readyHint', 'Type an asset question below or click one of the verification prompt cards above.')}
              </p>
            </div>
          )}
        </div>

        {/* Input Bar with Optional Scope Dropdown */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) handleAsk();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            {/* Optional Asset Scope Filter */}
            <div className="sm:w-48 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('copilot.scopeLabel', 'Scope:')}</span>
              <select
                value={selectedAssetScope}
                onChange={(e) => setSelectedAssetScope(e.target.value)}
                disabled={loading}
                className="bg-transparent text-xs text-white focus:outline-none w-full truncate cursor-pointer disabled:opacity-50"
              >
                <option value="ALL" className="bg-slate-900 text-white">{t('copilot.allInfrastructure', 'All Infrastructure')}</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.id} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder={t('copilot.inputPlaceholder', "Ask about any infrastructure asset (e.g. 'What did the underwater sonar scour audit find?')...")}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-4 pr-10 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
              />
              {inputValue && !loading && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('copilot.queryingButton', 'Processing...')}</span>
                </>
              ) : (
                <>
                  <span>{t('copilot.askButton', 'Ask Copilot')}</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Grounded Evidence Inspection Modal */}
      <EvidenceViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        selectedCitationLabel={selectedCitationLabel}
        citations={response?.citations || []}
        evidence={response?.evidence || []}
        onNavigate={onNavigate}
        isDemo={isDemo}
      />
    </div>
  );
}
