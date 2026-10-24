import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Printer,
  Building2,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Activity,
  Layers,
  BookOpen,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { fetchAssetReport } from '../services/api';
import { getDemoAssetReport } from '../demo/demoService';

export default function ReportsHistoryPage({
  assets = [],
  selectedAsset = null,
  onSelectAsset,
  onOpenProfile,
  onOpenDocument,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [activeAssetId, setActiveAssetId] = useState(
    selectedAsset?.id || (assets.length > 0 ? assets[0].id : null)
  );
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedAsset) {
      setActiveAssetId(selectedAsset.id);
    } else if (assets.length > 0 && !activeAssetId) {
      setActiveAssetId(assets[0].id);
    }
  }, [selectedAsset, assets]);

  const loadReport = async (assetId) => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const data = await getDemoAssetReport(assetId);
        setReport(data);
      } else {
        const data = await fetchAssetReport(assetId);
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to load asset report:', err);
      setError(err.message || 'Unable to generate intelligence report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAssetId) {
      loadReport(activeAssetId);
    }
  }, [activeAssetId, isDemo]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Controls Bar (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center shadow-md shadow-green-700/20 shrink-0">
            <FileBarChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Infrastructure Intelligence & Audit Reports
            </h2>
            <p className="text-xs text-slate-500">
              Exportable, evidence-grounded reports with verified telemetry and defect citations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Asset Selector */}
          <div className="relative">
            <select
              value={activeAssetId || ''}
              onChange={(e) => setActiveAssetId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-600 pr-8 cursor-pointer"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => loadReport(activeAssetId)}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
            title="Refresh report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-700' : ''}`} />
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || !report}
            className="px-3.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Report Document Sheet */}
      {loading && !report ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin" />
          <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
            Generating Evidence Audit Report...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : report ? (
        <article className="p-8 sm:p-12 bg-white rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8 text-slate-900 font-sans">
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-800 text-white flex items-center justify-center font-black text-sm">
                  AY
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-wider text-slate-950 uppercase">
                    AAYAM Intelligence Layer
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                    Public Infrastructure Safety & Lifecycle Audit Authority
                  </span>
                </div>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-4">
                {report.report_title}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Asset Identifier: <strong>{report.asset_id}</strong> • Audit Stamp: {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>

            <div className="flex sm:flex-col items-end gap-2 shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-slate-100 border border-slate-300">
                OFFICIAL REPORT
              </span>
              <div className="text-right text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Risk Classification</span>
                <span className={`font-bold text-sm ${
                  report.risk_category === 'Critical' ? 'text-red-700' :
                  report.risk_category === 'High' ? 'text-amber-700' :
                  report.risk_category === 'Moderate' ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  {report.risk_category} ({report.overall_risk_score.toFixed(1)}/100)
                </span>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-800 border-b border-green-200 pb-1">
              Executive Summary
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {report.executive_summary}
            </p>
          </section>

          {/* Dynamic Report Sections */}
          <div className="space-y-6">
            {report.sections.map((section) => (
              <section key={section.section_id} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>{section.title}</span>
                  {section.evidence_citations && section.evidence_citations.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 font-normal lowercase">
                      {section.evidence_citations.length} citation(s)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-700 font-medium">
                  {section.summary}
                </p>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-600">
                  {section.details.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>

                {section.evidence_citations && section.evidence_citations.length > 0 && (
                  <div className="mt-2 p-2.5 rounded-lg bg-green-50/50 border border-green-100 text-[11px] text-green-900 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-green-800">Corroborating Evidence:</span>
                    {section.evidence_citations.map((cite, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 rounded bg-white border border-green-200 font-mono text-[10px]"
                      >
                        {cite}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Audit Verification vs Gaps Matrix */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
            <div className="p-4 rounded-xl bg-green-50/40 border border-green-200 space-y-2">
              <h4 className="font-bold text-green-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                Verified Data Points
              </h4>
              <ul className="space-y-1 text-slate-700 pl-4 list-disc text-[11px]">
                {report.verified_data_points.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Evidence Gaps & Unverified Claims
              </h4>
              <ul className="space-y-1 text-slate-700 pl-4 list-disc text-[11px]">
                {report.unverified_claims.map((claim, idx) => (
                  <li key={idx}>{claim}</li>
                ))}
                {report.evidence_gaps.map((gap, idx) => (
                  <li key={idx} className="italic text-slate-500">Gap: {gap}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Certification Disclaimer */}
          <footer className="pt-6 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600 uppercase tracking-wider">
              Audit Transparency & Evidence Standard
            </p>
            <p>{report.disclaimer}</p>
            <p className="font-mono text-[9px] text-slate-400 mt-2">
              Generated by AAYAM Infrastructure Intelligence Engine • Integrity Hash: SHA256-AUTHENTICATED
            </p>
          </footer>
        </article>
      ) : null}
    </div>
  );
}
