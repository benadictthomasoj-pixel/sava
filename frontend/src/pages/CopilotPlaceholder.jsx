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
} from 'lucide-react';
import { askCopilot } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function CopilotPlaceholder({ assets = [], onNavigate }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedAssetScope, setSelectedAssetScope] = useState('ALL');
  const [activeQuery, setActiveQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Bot className="w-3.5 h-3.5" />
          <span>Evidence-Grounded RAG Intelligence &bull; Milestone 2</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">
          AAYAM AI Decision Copilot
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Answers complex public infrastructure inquiries grounded in indexed engineering audit PDFs, technical inspection logs, and verified SQLite asset telemetry.
        </p>
      </div>

      {/* Transparent Pipeline Status Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-200">
              Evidence-Grounded RAG Architecture Active
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Hybrid retrieval indexes SQLite asset records along with certified engineering PDF/TXT audit documents. 
              Supports external LLM synthesis when configured, with deterministic citation fallback.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
          RAG v2.0
        </span>
      </div>

      {/* Interactive Sample Verification Prompts */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sample Verification Inquiries (Click to Ask)
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Queries live SQLite entities + indexed PDF/TXT audit documents
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {samplePrompts.map((p, idx) => {
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
                  Key evidence: {p.previewHint}
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
            <span className="text-xs font-bold text-white">Copilot Output Window</span>
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
          <span className="text-[10px] font-mono text-slate-400">
            Pipeline: {response?.pipeline_type || 'retrieval_only_fallback'}
          </span>
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

              {/* Understandable Grounded Answer with Citations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                    Grounded Technical Synthesis
                  </span>
                  {response.citations && response.citations.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {response.citations.length} Verified Sources Cited
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                  {response.answer}
                </div>
              </div>

              {/* Citations Box */}
              {response.citations && response.citations.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Bookmark className="w-3 h-3 text-cyan-400" />
                    <span>Evidence Citations & Source Provenance</span>
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {response.citations.map((cite, idx) => (
                      <li key={idx} className="font-mono text-[10px] text-cyan-300">
                        {cite}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Observed Facts vs Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Verified Observed Facts */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      Observed Empirical Facts
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {response.observed_facts.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Engineering Next Steps */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      Recommended Engineering Actions
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {response.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300 text-[11px] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Supporting Evidence Records (Structured Assets + PDF/TXT Documents) */}
              {response.evidence && response.evidence.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Retrieved Evidence Passages & Records ({response.evidence.length})
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Source: SQLite + Indexed Documents
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {response.evidence.map((ev, idx) => {
                      const isDoc = ev.evidence_type === 'document_audit_passage';
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase block">
                                {ev.citation_label ? `[${ev.citation_label}] ` : ''}
                                {ev.asset_id || (isDoc ? 'DOCUMENT AUDIT' : 'ASSET')}
                              </span>
                              <h5 className="font-bold text-white text-xs">
                                {ev.document_name || ev.asset_name || 'Engineering Evidence'}
                              </h5>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {isDoc ? 'Doc Excerpt' : 'DB Telemetry'}
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
                                  "{ev.excerpt.slice(0, 240)}..."
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

                          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                            <span className="truncate max-w-[200px]" title={ev.source}>
                              Source: {ev.source}
                            </span>
                            {ev.asset_id && onNavigate && (
                              <button
                                type="button"
                                onClick={() => onNavigate('registry')}
                                className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                              >
                                Registry <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
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
                Ready for infrastructure inquiries
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Type an asset question below or click one of the verification prompt cards above.
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
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Scope:</span>
              <select
                value={selectedAssetScope}
                onChange={(e) => setSelectedAssetScope(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none w-full truncate cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Infrastructure</option>
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
                placeholder="Ask about any infrastructure asset (e.g. 'What did the underwater sonar scour audit find?')..."
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
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Ask Copilot</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
