import React, { useState } from 'react';
import {
  Search,
  X,
  Layers,
  MapPin,
  AlertTriangle,
  Activity,
  ChevronRight,
  Database,
  PlusCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import InspectionHistoryModal from '../components/InspectionHistoryModal';
import { createAsset } from '../services/api';
import { createDemoAsset } from '../demo/demoService';
import { useLanguage } from '../context/LanguageContext';

export default function AssetRegistry({
  assets = [],
  categories = [],
  loading,
  error,
  selectedAsset,
  onSelectAsset,
  onNavigate,
  onRefresh,
  isAdmin = false,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Registration modal and form state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const initialFormState = {
    id: '',
    name: '',
    category: 'Bridge',
    district: '',
    state: '',
    latitude: '',
    longitude: '',
    construction_year: '',
    status: 'Operational',
    data_source: 'Field Officer Registration (AAYAM Portal)',
    risk_score: '15.0',
    risk_level: 'Low',
    health_index: '85.0',
    last_inspection_date: '',
    flagged_reasons: '',
    description: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto derive risk level when risk_score changes
      if (field === 'risk_score') {
        const num = parseFloat(value);
        if (!Number.isNaN(num)) {
          if (num >= 80) next.risk_level = 'Critical';
          else if (num >= 50) next.risk_level = 'High';
          else if (num >= 25) next.risk_level = 'Moderate';
          else next.risk_level = 'Low';
        }
      }
      return next;
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setFormSuccess(null);

    // Required fields validation
    const trimmedId = formData.id.trim();
    if (!trimmedId) {
      setFormError(t('registry.errIdRequired', 'Asset ID is required (e.g. ASSET-BRG-010).'));
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError(t('registry.errNameRequired', 'Asset Name is required.'));
      return;
    }

    const trimmedCategory = formData.category.trim();
    if (!trimmedCategory) {
      setFormError(t('registry.errCategoryRequired', 'Category is required.'));
      return;
    }

    const trimmedDistrict = formData.district.trim();
    if (!trimmedDistrict) {
      setFormError(t('registry.errDistrictRequired', 'District is required.'));
      return;
    }

    const trimmedState = formData.state.trim();
    if (!trimmedState) {
      setFormError(t('registry.errStateRequired', 'State is required.'));
      return;
    }

    // Latitude validation
    if (formData.latitude === '' || formData.latitude === null || formData.latitude === undefined) {
      setFormError(t('registry.errLatRequired', 'Latitude coordinate is required.'));
      return;
    }
    const lat = parseFloat(formData.latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setFormError(t('registry.errLatValid', 'Latitude must be a valid number between -90 and 90.'));
      return;
    }

    // Longitude validation
    if (formData.longitude === '' || formData.longitude === null || formData.longitude === undefined) {
      setFormError(t('registry.errLngRequired', 'Longitude coordinate is required.'));
      return;
    }
    const lng = parseFloat(formData.longitude);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setFormError(t('registry.errLngValid', 'Longitude must be a valid number between -180 and 180.'));
      return;
    }

    // Construction year validation (optional, but must be valid if entered)
    let constructionYear = null;
    if (formData.construction_year && formData.construction_year.toString().trim()) {
      constructionYear = parseInt(formData.construction_year, 10);
      if (Number.isNaN(constructionYear) || constructionYear < 1800 || constructionYear > 2100) {
        setFormError(t('registry.errYearValid', 'Construction year must be a valid 4-digit year between 1800 and 2100.'));
        return;
      }
    }

    // Risk score validation
    const riskScore = formData.risk_score !== '' ? parseFloat(formData.risk_score) : 15.0;
    if (Number.isNaN(riskScore) || riskScore < 0 || riskScore > 100) {
      setFormError(t('registry.errRiskValid', 'Risk score must be a number between 0 and 100.'));
      return;
    }

    // Health index validation
    const healthIndex = formData.health_index !== '' ? parseFloat(formData.health_index) : 85.0;
    if (Number.isNaN(healthIndex) || healthIndex < 0 || healthIndex > 100) {
      setFormError(t('registry.errHealthValid', 'Health index must be a number between 0 and 100.'));
      return;
    }

    // Flagged reasons parsing
    const flags = formData.flagged_reasons
      ? formData.flagged_reasons
          .split(/[\n;,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const payload = {
      id: trimmedId,
      name: trimmedName,
      category: trimmedCategory,
      district: trimmedDistrict,
      state: trimmedState,
      latitude: lat,
      longitude: lng,
      construction_year: constructionYear,
      status: formData.status || 'Operational',
      data_source: formData.data_source.trim() || 'Field Officer Registration (AAYAM Portal)',
      risk_score: riskScore,
      risk_level: formData.risk_level || 'Low',
      health_index: healthIndex,
      last_inspection_date: formData.last_inspection_date ? formData.last_inspection_date.trim() : null,
      flagged_reasons: flags,
      description: formData.description ? formData.description.trim() : null,
    };

    setSubmitting(true);

    if (isDemo) {
      try {
        await createDemoAsset(payload);
      } catch (err) {
        setFormError(err.message || t('registry.errDemoDisabled', 'Demo Mode: Asset creation is disabled. Real database mutation requires an authenticated administrator session.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const createdAsset = await createAsset(payload);
      setFormSuccess(t('registry.registerSuccess', "Asset '{id}' ({name}) registered successfully!", { id: createdAsset.id, name: createdAsset.name }));

      // Refresh list using parent reload
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }

      // Automatically select newly registered asset
      if (typeof onSelectAsset === 'function') {
        onSelectAsset(createdAsset);
      }

      // Auto close modal after user feedback
      setTimeout(() => {
        setFormData(initialFormState);
        setShowRegisterModal(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Registration failed:', err);
      if (err.status === 409) {
        setFormError(t('registry.errConflict409', "Asset ID '{id}' already exists in registry (HTTP 409 Conflict). Please choose a unique Asset ID.", { id: trimmedId }));
      } else if (err.status === 422) {
        setFormError(t('registry.errValidation422', 'Validation error (HTTP 422): {message}', { message: err.message }));
      } else {
        setFormError(err.message || t('registry.errNetwork', 'Network error occurred connecting to backend.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

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
      {/* Demo Mode Notice Banner */}
      {isDemo && (
        <div
          data-testid="demo-registry-banner"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900"
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase tracking-wider text-[10px]">
              {t('registry.demoRegistryBadge', 'Demo Registry')}
            </span>
            <span>
              {t('registry.demoRegistryNotice', 'Simulated Asset Registry: displaying 3 synthetic demonstration assets. New registrations and record modifications are isolated from backend.')}
            </span>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('registry.searchPlaceholder', 'Search by asset code, name, district, or state...')}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-500 font-medium">{t('registry.filterType', 'Type:')}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              {uniqueCategories.map((c) => (
                <option key={c} value={c} className="bg-white text-slate-900">
                  {c === 'All' ? t('common.all', 'All') : c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-500 font-medium">{t('registry.filterStatus', 'Status:')}</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st} className="bg-white text-slate-900">
                  {st === 'All'
                    ? t('common.all', 'All')
                    : st === 'Critical Attention'
                    ? t('status.criticalAttention', 'Critical Attention')
                    : st === 'Requires Inspection'
                    ? t('status.requiresInspection', 'Requires Inspection')
                    : st === 'Operational'
                    ? t('status.operational', 'Operational')
                    : st}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All') && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            >
              {t('registry.resetFilters', 'Reset')}
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Table + Optional Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Assets Table (Left side) */}
        <div className={`${selectedAsset ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'} rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-bold text-slate-900">
                {t('registry.publicRegistryTitle', 'Public Infrastructure Registry')}
              </h3>
              <span className="text-xs font-mono text-green-700 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 font-semibold">
                {t('registry.assetCountRatio', '{filtered} of {total}', { filtered: filteredAssets.length, total: assets.length })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                {t('registry.clickRowHint', 'Click any row to inspect full telemetry')}
              </span>
              {(isAdmin || isDemo) && (
                <button
                  id="btn-register-asset-open"
                  onClick={() => {
                    setFormError(null);
                    setFormSuccess(null);
                    setShowRegisterModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    isDemo
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                      : 'bg-green-700 hover:bg-green-800 text-white'
                  }`}
                  title={isDemo ? t('registry.registerDemoTooltip', 'Asset registration is simulated and protected in demo mode') : t('registry.registerTooltip', 'Register a new asset')}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isDemo ? t('registry.registerAssetDemo', 'Register Asset (Demo)') : t('registry.registerAsset', 'Register Asset')}</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">{t('registry.loadingSQLite', 'Loading asset records from SQLite database...')}</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm text-red-600 font-semibold">{t('registry.errorRetrieving', 'Error retrieving assets')}</p>
              <p className="text-xs text-slate-500 font-mono">{error}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">{t('registry.noMatchingAssets', 'No matching assets found')}</p>
              <p className="text-xs text-slate-500">
                {t('registry.tryAdjustingFilters', 'Try adjusting your search criteria or reset filters.')}
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-green-700 rounded-md font-medium border border-slate-300"
              >
                {t('registry.clearAllFilters', 'Clear all filters')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
              <table className="w-full text-left border-collapse text-xs block md:table">
                <thead className="hidden md:table-header-group">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">{t('registry.assetId', 'Asset ID')}</th>
                    <th className="py-3 px-4">{t('dashboard.assetName', 'Asset Name')}</th>
                    <th className="py-3 px-4">{t('common.category', 'Category')}</th>
                    <th className="py-3 px-4">{t('registry.districtAndState', 'District & State')}</th>
                    <th className="py-3 px-4">{t('registry.built', 'Built')}</th>
                    <th className="py-3 px-4">{t('common.status', 'Status')}</th>
                    <th className="py-3 px-4">{t('registry.risk', 'Risk')}</th>
                    <th className="py-3 px-4 text-right">{t('registry.view', 'View')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 block md:table-row-group space-y-3 md:space-y-0 p-2 md:p-0">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={`cursor-pointer transition-colors block md:table-row p-4 md:p-0 rounded-xl md:rounded-none border border-slate-200 md:border-0 ${
                          isSelected
                            ? 'bg-green-50/70 border-l-4 md:border-l-2 border-l-green-700'
                            : 'bg-white md:bg-transparent hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-1.5 md:py-3 px-1 md:px-4 block md:table-cell">
                          <div className="flex items-center justify-between md:block gap-2">
                            <span className="font-mono font-medium text-green-800 md:text-slate-600 text-xs">
                              {asset.id}
                            </span>
                            <div className="md:hidden shrink-0">
                              <StatusBadge status={asset.status} size="xs" />
                            </div>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell">
                          <span className="font-bold text-slate-900 hover:text-green-700 transition-colors text-sm md:text-xs">
                            {asset.name}
                          </span>
                        </td>
                        <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell text-slate-600">
                          <div className="flex items-center justify-between md:block">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase md:hidden">{t('common.category', 'Category')}:</span>
                            <span className="font-medium text-slate-700">{asset.category}</span>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell text-slate-600">
                          <div className="flex items-center justify-between md:block">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase md:hidden">{t('registry.districtAndState', 'District & State')}:</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 md:hidden" />
                              <span>{asset.district}, {asset.state}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell font-mono text-slate-600">
                          <div className="flex items-center justify-between md:block">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase font-sans md:hidden">{t('registry.built', 'Built')}:</span>
                            <span>{asset.construction_year || '—'}</span>
                          </div>
                        </td>
                        <td className="py-1.5 md:py-3 px-1 md:px-4 hidden md:table-cell">
                          <StatusBadge status={asset.status} size="xs" />
                        </td>
                        <td className="py-1 md:py-3 px-1 md:px-4 block md:table-cell font-mono font-semibold">
                          <div className="flex items-center justify-between md:justify-start gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase font-sans md:hidden">{t('registry.risk', 'Risk')}:</span>
                            <span
                              className={
                                asset.risk_score >= 80
                                  ? 'text-red-700'
                                  : asset.risk_score >= 50
                                  ? 'text-amber-700'
                                  : 'text-green-700'
                              }
                            >
                              {asset.risk_score} / 100
                            </span>
                          </div>
                        </td>
                        <td className="pt-2 md:py-3 px-1 md:px-4 block md:table-cell text-right border-t border-slate-200 md:border-t-0 mt-2 md:mt-0">
                          <div className="flex items-center justify-between md:justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAsset(asset);
                                setShowInspectionModal(true);
                              }}
                              className="px-2.5 py-1.5 md:p-1 rounded-lg md:rounded text-slate-600 md:text-slate-500 hover:text-green-700 bg-slate-100 md:bg-transparent hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs md:text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                              title={t('registry.viewRecordInspections', 'View & Record Inspections')}
                            >
                              <ClipboardList className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-700" />
                              <span className="md:hidden">{t('registry.viewRecordInspections', 'View & Record Inspections')}</span>
                            </button>
                            <span className="text-xs text-green-700 md:text-slate-500 flex items-center gap-1 font-medium md:font-normal">
                              <span className="md:hidden">{isSelected ? t('common.selected', 'Selected') : t('registry.viewDetails', 'Details')}</span>
                              <ChevronRight
                                className={`w-4 h-4 inline-block transition-transform ${
                                  isSelected ? 'text-green-700 translate-x-1' : 'text-slate-400'
                                }`}
                              />
                            </span>
                          </div>
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
          <div className="lg:col-span-5 xl:col-span-4 rounded-xl bg-white border border-slate-200 shadow-sm p-5 space-y-4 sticky top-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-mono text-green-700 font-semibold uppercase">
                  {selectedAsset.id}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedAsset.name}
                </h4>
              </div>
              <button
                onClick={() => onSelectAsset(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedAsset.status} />
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {selectedAsset.category}
              </span>
            </div>

            {/* Core Fields Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('registry.districtAndState', 'District & State')}</span>
                  <span className="font-semibold text-slate-800">
                    {selectedAsset.district}, {selectedAsset.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('registry.constructionYear', 'Construction Year')}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedAsset.construction_year || t('registry.unknown', 'Unknown')}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('registry.gpsCoordinates', 'GPS Coordinates')}</span>
                  <span className="font-mono text-slate-800 text-[11px]">
                    {selectedAsset.latitude.toFixed(4)}°N, {selectedAsset.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t('common.lastInspection', 'Last Inspection')}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedAsset.last_inspection_date || t('registry.noneOnRecord', 'None on record')}
                  </span>
                </div>
              </div>

              {/* Digital Heartbeat Telemetry Snapshot */}
              <div className="p-3 rounded-lg bg-green-50/50 border border-green-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-green-700" />
                    <span className="font-bold text-green-900 text-xs">{t('registry.heartbeatSnapshot', 'Digital Heartbeat Snapshot')}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {t('registry.scoreLabel', 'Score: {score} / 100', { score: selectedAsset.risk_score })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">{t('common.healthIndex', 'Health Index')}</span>
                    <span className="font-bold text-green-700 text-sm font-mono">
                      {selectedAsset.health_index}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('registry.riskTier', 'Risk Tier')}</span>
                    <span className={`font-bold text-sm ${
                      selectedAsset.risk_level === 'Critical' ? 'text-red-700' : selectedAsset.risk_level === 'High' ? 'text-amber-700' : 'text-green-700'
                    }`}>
                      {selectedAsset.risk_level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Identified Risk Factors / Flagged Triggers */}
              {selectedAsset.flagged_reasons && selectedAsset.flagged_reasons.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-slate-500 font-semibold uppercase text-[10px] block">
                    {t('registry.flaggedRiskTriggers', 'Flagged Risk Triggers')}
                  </span>
                  <ul className="space-y-1">
                    {selectedAsset.flagged_reasons.map((reason, idx) => (
                      <li
                        key={idx}
                        className="p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Description */}
              {selectedAsset.description && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold uppercase text-[10px] block">
                    {t('registry.engineeringContext', 'Engineering Context')}
                  </span>
                  <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                    {selectedAsset.description}
                  </p>
                </div>
              )}

              {/* Data Source Disclaimer */}
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-500 flex items-start gap-1.5">
                <Database className="w-3 h-3 text-green-700 shrink-0 mt-0.5" />
                <span>{t('registry.sourcePrefix', 'Source: {source}', { source: selectedAsset.data_source })}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                id="btn-open-inspections"
                type="button"
                onClick={() => setShowInspectionModal(true)}
                className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <ClipboardList className="w-4 h-4" />
                <span>{t('registry.inspectionHistoryAndVerification', 'Inspection History & Verification')}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('heartbeat')}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-green-700" />
                  <span>{t('registry.openFullHeartbeat', 'Open Full Heartbeat')}</span>
                </button>
                <button
                  onClick={() => onNavigate('map')}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors flex items-center gap-1.5"
                  title={t('registry.locateOnMapTooltip', 'Locate on GIS Map')}
                >
                  <MapPin className="w-3.5 h-3.5 text-green-700" />
                  <span>{t('registry.map', 'Map')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Asset Registration Modal (Admin / Demo Protected) */}
      {showRegisterModal && (isAdmin || isDemo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-green-700">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isDemo ? t('registry.registerModalTitleDemo', 'Register Infrastructure Asset (Demo)') : t('registry.registerModalTitle', 'Register Infrastructure Asset')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('registry.registerModalDesc', 'Add a verified public infrastructure entity to the AAYAM intelligence registry.')}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-modal"
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setShowRegisterModal(false);
                    setFormError(null);
                    setFormSuccess(null);
                  }
                }}
                disabled={submitting}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Alert */}
            {formSuccess && (
              <div
                id="banner-registration-success"
                className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2.5 animate-fadeIn"
              >
                <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                <span className="font-medium">{formSuccess}</span>
              </div>
            )}

            {/* Error Alert */}
            {formError && (
              <div
                id="banner-registration-error"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {/* Row 1: Asset ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.assetId', 'Asset ID')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-id"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder={t('registry.assetIdPlaceholder', 'e.g. ASSET-BRG-010')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{t('registry.assetIdHint', 'Unique official identifier (e.g. ASSET-BRG-010)')}</span>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('dashboard.assetName', 'Asset Name')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-name"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('registry.assetNamePlaceholder', 'e.g. Narmada Cable-Stayed Bridge')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{t('registry.assetNameHint', 'Full descriptive name of structural facility')}</span>
                </div>
              </div>

              {/* Row 2: Category & Operating Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('common.category', 'Category')} <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="select-asset-category"
                    required
                    disabled={submitting}
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {[
                      'Bridge',
                      'Water Treatment Plant',
                      'Culvert',
                      'Canal',
                      'Power Substation',
                      'Drainage',
                      'Health Infrastructure',
                      'Flyover',
                      'Highways & Expressways',
                    ].map((cat) => (
                      <option key={cat} value={cat} className="bg-white text-slate-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.operationalStatus', 'Operational Status')} <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="select-asset-status"
                    required
                    disabled={submitting}
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <option value="Operational" className="bg-white text-slate-900">{t('registry.statusOperationalNormal', 'Operational (Normal)')}</option>
                    <option value="Requires Inspection" className="bg-white text-slate-900">{t('status.requiresInspection', 'Requires Inspection')}</option>
                    <option value="Critical Attention" className="bg-white text-slate-900">{t('status.criticalAttention', 'Critical Attention')}</option>
                  </select>
                </div>
              </div>

              {/* Row 3: District & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('common.district', 'District')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-district"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    placeholder={t('registry.districtPlaceholder', 'e.g. Bharuch')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('common.state', 'State')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-state"
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder={t('registry.statePlaceholder', 'e.g. Gujarat')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 4: Latitude & Longitude */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.latitude', 'Latitude (°N)')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-latitude"
                    type="number"
                    step="any"
                    required
                    disabled={submitting}
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    placeholder={t('registry.latPlaceholder', 'e.g. 21.7051')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{t('registry.latHint', 'Decimal degrees (-90.0 to 90.0)')}</span>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.longitude', 'Longitude (°E)')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="input-asset-longitude"
                    type="number"
                    step="any"
                    required
                    disabled={submitting}
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    placeholder={t('registry.lngPlaceholder', 'e.g. 72.9959')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{t('registry.lngHint', 'Decimal degrees (-180.0 to 180.0)')}</span>
                </div>
              </div>

              {/* Row 5: Construction Year & Last Inspection Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.constructionYearOptional', 'Construction Year (Optional)')}
                  </label>
                  <input
                    id="input-asset-year"
                    type="number"
                    disabled={submitting}
                    value={formData.construction_year}
                    onChange={(e) => handleInputChange('construction_year', e.target.value)}
                    placeholder={t('registry.yearPlaceholder', 'e.g. 2017')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {t('registry.lastInspectionDateOptional', 'Last Inspection Date (Optional)')}
                  </label>
                  <input
                    id="input-asset-last-inspection"
                    type="date"
                    disabled={submitting}
                    value={formData.last_inspection_date}
                    onChange={(e) => handleInputChange('last_inspection_date', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 6: Risk Score & Health Index */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      {t('registry.initialRiskScore', 'Initial Risk Score (0 - 100)')}
                    </label>
                    <span className="font-mono text-green-700 font-bold">
                      {formData.risk_score} ({formData.risk_level})
                    </span>
                  </div>
                  <input
                    id="input-asset-risk-score"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={submitting}
                    value={formData.risk_score}
                    onChange={(e) => handleInputChange('risk_score', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      {t('registry.structuralHealthIndex', 'Structural Health Index (0 - 100%)')}
                    </label>
                    <span className="font-mono text-green-700 font-bold">
                      {formData.health_index}%
                    </span>
                  </div>
                  <input
                    id="input-asset-health-index"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={submitting}
                    value={formData.health_index}
                    onChange={(e) => handleInputChange('health_index', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Row 7: Flagged Risk Triggers */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {t('registry.identifiedRiskTriggers', 'Identified Risk Triggers & Defect Flags')}
                </label>
                <textarea
                  id="textarea-asset-flagged-reasons"
                  rows="2"
                  disabled={submitting}
                  value={formData.flagged_reasons}
                  onChange={(e) => handleInputChange('flagged_reasons', e.target.value)}
                  placeholder={t('registry.flaggedReasonsPlaceholder', 'e.g. Sub-surface scour detected; Bearing pad wear; High vibration anomaly (separate multiple flags with semicolons or newlines)')}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Row 8: Description */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {t('registry.engineeringContextDesc', 'Engineering Context & Physical Description')}
                </label>
                <textarea
                  id="textarea-asset-description"
                  rows="2"
                  disabled={submitting}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('registry.descriptionPlaceholder', 'e.g. Major arterial transit crossing with heavy container traffic. Sub-surface foundations exposed to seasonal monsoon scour.')}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  id="btn-cancel-registration"
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setShowRegisterModal(false);
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  id="btn-submit-registration"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('registry.registeringAsset', 'Registering Asset...')}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{t('registry.registerAsset', 'Register Asset')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspection History & Verification Modal */}
      {selectedAsset && (
        <InspectionHistoryModal
          isOpen={showInspectionModal}
          onClose={() => setShowInspectionModal(false)}
          asset={selectedAsset}
          isAdmin={isAdmin}
          isDemo={isDemo}
          onAssetUpdated={(updatedAsset) => {
            onSelectAsset(updatedAsset);
          }}
          onRefreshGlobal={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
