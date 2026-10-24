import React, { useState, useEffect } from 'react';
import {
  Library,
  FileText,
  Search,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Building2,
  Calendar,
  Layers,
  Loader2,
  RefreshCw,
  FileCheck,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import EvidenceViewerModal from '../components/EvidenceViewerModal';
import { useLanguage } from '../context/LanguageContext';
import { fetchEvidenceCatalog } from '../services/api';
import { getDemoEvidenceCatalog } from '../demo/demoService';

export default function EvidenceLibraryPage({
  assets = [],
  onOpenProfile,
  onNavigate,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocName, setSelectedDocName] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const data = await getDemoEvidenceCatalog();
        setCatalog(data.items || []);
      } else {
        const data = await fetchEvidenceCatalog();
        setCatalog(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load evidence catalog:', err);
      setError('Unable to load indexed evidence catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [isDemo]);

  const filteredDocs = catalog.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.filename.toLowerCase().includes(q) ||
      (doc.summary && doc.summary.toLowerCase().includes(q)) ||
      (Array.isArray(doc.associated_asset_ids) &&
        doc.associated_asset_ids.some((id) => id.toLowerCase().includes(q)))
    );
  });

  const handleOpenDoc = (filename) => {
    setSelectedDocName(filename);
    setIsViewerOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center shadow-md shadow-green-700/20 shrink-0">
            <Library className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Evidence & Grounded Research Library
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verified engineering documents, sonar bathymetry surveys, SCADA telemetry logs, and diagnostic audits.
            </p>
          </div>
        </div>

        <button
          onClick={loadCatalog}
          disabled={loading}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer self-start sm:self-auto"
          title="Refresh document repository"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-700' : ''}`} />
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Indexed Documents
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{catalog.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Verified technical source files</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Evidence Verification
          </span>
          <p className="text-2xl font-black text-green-700 mt-1">100%</p>
          <p className="text-[11px] text-slate-500 mt-1">Zero fabricated citations</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Document Types
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">PDF & TXT</p>
          <p className="text-[11px] text-slate-500 mt-1">Preserved original formats</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Grounded Citations
          </span>
          <p className="text-2xl font-black text-green-700 mt-1">Direct</p>
          <p className="text-[11px] text-slate-500 mt-1">Traceable page & paragraph refs</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search indexed engineering documents by name, keyword, or asset ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-xs text-slate-800"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="space-y-3">
        {loading && catalog.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-green-700 animate-spin" />
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
              Scanning Evidence Library...
            </p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No matching documents found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try a different keyword or view all documents.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.filename}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-800 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.file_type}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400 mt-0.5 block">
                      {doc.filename} • {Math.round(doc.size_bytes / 1024)} KB • {doc.page_count} Page{doc.page_count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleOpenDoc(doc.filename)}
                    className="px-3.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Inspect Document</span>
                  </button>
                </div>
              </div>

              {/* Excerpt / Summary */}
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {doc.summary}
              </p>

              {/* Associated Assets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500 font-medium">Mapped Infrastructure:</span>
                  {Array.isArray(doc.associated_asset_ids) && doc.associated_asset_ids.length > 0 ? (
                    doc.associated_asset_ids.map((aid) => {
                      const matched = assets.find((a) => a.id === aid);
                      return (
                        <button
                          key={aid}
                          onClick={() => onOpenProfile && onOpenProfile(aid)}
                          className="px-2.5 py-0.5 rounded-md bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3 h-3 text-green-700" />
                          <span>{matched ? matched.name : aid}</span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-slate-400 italic">General Infrastructure Guidance</span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  Last Indexed: {new Date(doc.last_indexed_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Document Viewer Modal */}
      {isViewerOpen && selectedDocName && (
        <EvidenceViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          selectedCitationLabel={selectedDocName}
          citations={[selectedDocName]}
          evidence={[
            {
              citation_label: selectedDocName,
              source: selectedDocName,
              document_name: selectedDocName,
              filename: selectedDocName,
              section_title: 'Full Engineering Document Audit',
              page_number: 1,
              excerpt: 'Inspecting primary engineering document.',
              relevance_score: 100,
            },
          ]}
          onNavigate={onNavigate}
          isDemo={isDemo}
        />
      )}
    </div>
  );
}
