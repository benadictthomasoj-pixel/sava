import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Info,
  Activity,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  AlertOctagon,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';

// Helper to create clean custom HTML pin markers for Leaflet with pulsing effects
function createMarkerIcon(status, isSelected = false) {
  let color = '#10b981'; // Operational: Green (Emerald)
  let glowColor = 'rgba(16, 185, 129, 0.4)';

  if (status === 'Critical Attention' || status === 'Critical') {
    color = '#ef4444'; // Critical Attention: Red (Rose)
    glowColor = 'rgba(239, 68, 68, 0.6)';
  } else if (status === 'Requires Inspection' || status === 'High Risk' || status === 'Moderate') {
    color = '#f59e0b'; // Requires Inspection: Amber
    glowColor = 'rgba(245, 158, 11, 0.5)';
  }

  const size = isSelected ? 28 : 22;
  const innerDot = isSelected ? 8 : 6;
  const borderWidth = isSelected ? 3 : 2;

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 ${isSelected ? '18px' : '10px'} ${glowColor}, 0 2px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="width: ${innerDot}px; height: ${innerDot}px; background-color: #ffffff; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

// Controller component to smoothly center or fit bounds
function MapController({ assets, selectedAsset }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size to handle container resizes correctly
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [map]);

  useEffect(() => {
    if (selectedAsset && selectedAsset.latitude && selectedAsset.longitude) {
      map.flyTo([selectedAsset.latitude, selectedAsset.longitude], 9, {
        duration: 1.2,
      });
    } else if (assets && assets.length > 0) {
      const bounds = L.latLngBounds(assets.map((a) => [a.latitude, a.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 });
    }
  }, [selectedAsset, assets, map]);

  return null;
}

export default function MapViewPlaceholder({
  assets = [],
  loading = false,
  error = null,
  selectedAsset,
  onSelectAsset,
  onNavigate,
  isDemo = false,
}) {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tileError, setTileError] = useState(false);

  // Default center roughly on central India
  const defaultCenter = [21.5, 78.9629];
  const defaultZoom = 5;

  const filteredAssets = assets.filter((asset) => {
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Critical'
        ? asset.status === 'Critical Attention'
        : statusFilter === 'Inspection'
        ? asset.status === 'Requires Inspection'
        : statusFilter === 'Operational'
        ? asset.status === 'Operational'
        : true;

    const matchesSearch =
      searchQuery.trim() === '' ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.state.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const criticalCount = assets.filter((a) => a.status === 'Critical Attention').length;
  const inspectionCount = assets.filter((a) => a.status === 'Requires Inspection').length;
  const operationalCount = assets.filter((a) => a.status === 'Operational').length;

  return (
    <div className="space-y-4 h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Top Controls & Status Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-700" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('map.mapTitle', 'Geospatial Infrastructure Intelligence Map')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
              {t('map.osmBasemap', 'OpenStreetMap Basemap')}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {t('map.monitoringCount', 'Monitoring {count} registered public infrastructure assets across Indian states', { count: assets.length })}
          </p>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('map.searchMapPlaceholder', 'Search map assets...')}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-300 text-xs">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                statusFilter === 'All'
                  ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('map.filterAll', 'All ({count})', { count: assets.length })}
            </button>
            <button
              onClick={() => setStatusFilter('Critical')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                statusFilter === 'Critical'
                  ? 'bg-red-50 text-red-700 border border-red-200 font-bold'
                  : 'text-red-700 hover:bg-red-50/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>{t('map.filterCritical', 'Critical ({count})', { count: criticalCount })}</span>
            </button>
            <button
              onClick={() => setStatusFilter('Inspection')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                statusFilter === 'Inspection'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                  : 'text-amber-800 hover:bg-amber-50/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{t('map.filterInspection', 'Inspection ({count})', { count: inspectionCount })}</span>
            </button>
            <button
              onClick={() => setStatusFilter('Operational')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                statusFilter === 'Operational'
                  ? 'bg-green-50 text-green-700 border border-green-200 font-bold'
                  : 'text-green-700 hover:bg-green-50/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-600" />
              <span>{t('map.filterOperational', 'Operational ({count})', { count: operationalCount })}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center space-y-3 z-[1000]">
            <div className="w-10 h-10 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">{t('map.loadingTelemetry', 'Loading geospatial asset telemetry...')}</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2 z-[1000]">
            <p className="text-sm font-bold text-red-600">{t('map.errorTitle', 'Map Loading Error')}</p>
            <p className="text-xs text-slate-500 font-mono">{error}</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#F8FAFC' }}
          >
            {/* Standard OpenStreetMap Tile Layer (Free, Permitted, No API Key Required) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              eventHandlers={{
                tileerror: () => setTileError(true),
              }}
            />

            {/* Offline / Tile Error Banner */}
            {tileError && (
              <div
                data-testid="tile-fallback-notice"
                className="absolute top-4 right-4 z-[1000] p-3 rounded-lg bg-white/95 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 max-w-sm shadow-xl backdrop-blur"
              >
                <AlertOctagon className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  {t('map.tileFallbackNotice', 'Map tile service is currently unreachable. Displaying plotted demo asset coordinates on the vector grid fallback.')}
                </span>
              </div>
            )}

            {/* Controller for smooth recentering */}
            <MapController assets={filteredAssets} selectedAsset={selectedAsset} />

            {/* Plotted Asset Markers */}
            {filteredAssets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              return (
                <Marker
                  key={asset.id}
                  position={[asset.latitude, asset.longitude]}
                  icon={createMarkerIcon(asset.status, isSelected)}
                  eventHandlers={{
                    click: () => {
                      if (onSelectAsset) onSelectAsset(asset);
                    },
                  }}
                >
                  <Popup className="custom-popup" closeButton={true}>
                    <div className="p-1 space-y-2 text-xs min-w-[240px]">
                      {/* Popup Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5">
                        <div>
                          <span className="font-mono text-[10px] text-green-700 font-bold uppercase block">
                            {asset.id}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                            {asset.name}
                          </h4>
                        </div>
                        <StatusBadge status={asset.status} size="xs" />
                      </div>

                      {/* Location & Metadata */}
                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <p>
                          <strong className="text-slate-500 font-medium">{t('common.category', 'Category')}:</strong>{' '}
                          <span className="text-slate-800">{asset.category}</span>
                        </p>
                        <p>
                          <strong className="text-slate-500 font-medium">{t('common.location', 'Location')}:</strong>{' '}
                          <span className="text-slate-800">{asset.district}, {asset.state}</span>
                        </p>
                        <p>
                          <strong className="text-slate-500 font-medium">{t('map.gps', 'GPS:')}</strong>{' '}
                          <span className="font-mono text-slate-800">{asset.latitude.toFixed(4)}°N, {asset.longitude.toFixed(4)}°E</span>
                        </p>
                        <p>
                          <strong className="text-slate-500 font-medium">{t('dashboard.riskScore', 'Risk Score')}:</strong>{' '}
                          <span
                            className={`font-mono font-bold ${
                              asset.risk_score >= 80
                                ? 'text-red-700'
                                : asset.risk_score >= 50
                                ? 'text-amber-700'
                                : 'text-green-700'
                            }`}
                          >
                            {asset.risk_score} / 100
                          </span>{' '}
                          &bull; <span className="text-slate-500">{t('map.health', 'Health:')}</span>{' '}
                          <span className="font-mono text-slate-800">{asset.health_index}%</span>
                        </p>
                      </div>

                      {/* Flagged Triggers Preview */}
                      {asset.flagged_reasons && asset.flagged_reasons.length > 0 && (
                        <div className="p-1.5 rounded bg-red-50 border border-red-200 text-[10px] text-red-800 leading-tight">
                          <strong className="text-red-900">{t('map.activeFlag', 'Active Flag:')}</strong> {asset.flagged_reasons[0]}
                        </div>
                      )}

                      {/* Action Links */}
                      <div className="pt-2 flex items-center gap-1.5 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectAsset) onSelectAsset(asset);
                            if (onNavigate) onNavigate('heartbeat');
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 shadow-sm"
                        >
                          <Activity className="w-3 h-3" />
                          <span>{t('map.heartbeat', 'Heartbeat')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectAsset) onSelectAsset(asset);
                            if (onNavigate) onNavigate('registry');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                          title={t('map.viewInRegistry', 'View Asset in Registry')}
                        >
                          <span>{t('map.registry', 'Registry')}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* Informative Legend & Synthetic Disclaimer Floating Card */}
        <div className="absolute bottom-4 left-4 z-[1000] max-w-sm p-3 rounded-lg bg-white/95 border border-slate-200 backdrop-blur text-xs space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-green-700 font-bold text-[11px]">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>{isDemo ? t('demo.gisNotice', 'Simulated Demo GIS Telemetry') : t('map.legendTitle', 'GIS Asset Telemetry Layer')}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {isDemo
                ? t('demo.visibleCount', '{count} Demo Visible', { count: filteredAssets.length })
                : t('map.visibleCount', '{count} Visible', { count: filteredAssets.length })}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            {isDemo
              ? t('map.legendDescDemo', 'Displaying 3 synthetic demo assets with isolated simulated coordinates. No live database connection.')
              : t('map.legendDescLive', 'All markers represent prototype assets plotted on real coordinates across India. Tile service powered by standard OpenStreetMap.')}
          </p>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-200 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-slate-700">{t('status.critical', 'Critical')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-700">{t('dashboard.inspectionDue', 'Inspection Due')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-slate-700">{t('status.operational', 'Operational')}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
