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
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
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
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">
              Geospatial Infrastructure Intelligence Map
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              OpenStreetMap Basemap
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Monitoring {assets.length} registered public infrastructure assets across Indian states
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
              placeholder="Search map assets..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                statusFilter === 'All'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({assets.length})
            </button>
            <button
              onClick={() => setStatusFilter('Critical')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                statusFilter === 'Critical'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold'
                  : 'text-rose-400 hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Critical ({criticalCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('Inspection')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                statusFilter === 'Inspection'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 font-bold'
                  : 'text-amber-400 hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Inspection ({inspectionCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('Operational')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                statusFilter === 'Operational'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold'
                  : 'text-emerald-400 hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Operational ({operationalCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 shadow-xl relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-3 z-[1000]">
            <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading geospatial asset telemetry...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-2 z-[1000]">
            <p className="text-sm font-bold text-rose-400">Map Loading Error</p>
            <p className="text-xs text-slate-400 font-mono">{error}</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
          >
            {/* Standard OpenStreetMap Tile Layer (Free, Permitted, No API Key Required) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

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
                          <span className="font-mono text-[10px] text-slate-500 font-bold uppercase block">
                            {asset.id}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">
                            {asset.name}
                          </h4>
                        </div>
                        <StatusBadge status={asset.status} size="xs" />
                      </div>

                      {/* Location & Metadata */}
                      <div className="space-y-1 text-slate-600 text-[11px]">
                        <p>
                          <strong className="text-slate-800">Category:</strong> {asset.category}
                        </p>
                        <p>
                          <strong className="text-slate-800">Location:</strong> {asset.district}, {asset.state}
                        </p>
                        <p>
                          <strong className="text-slate-800">GPS:</strong> {asset.latitude.toFixed(4)}°N, {asset.longitude.toFixed(4)}°E
                        </p>
                        <p>
                          <strong className="text-slate-800">Risk Score:</strong>{' '}
                          <span
                            className={`font-mono font-bold ${
                              asset.risk_score >= 80
                                ? 'text-rose-600'
                                : asset.risk_score >= 50
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {asset.risk_score} / 100
                          </span>{' '}
                          &bull; Health: {asset.health_index}%
                        </p>
                      </div>

                      {/* Flagged Triggers Preview */}
                      {asset.flagged_reasons && asset.flagged_reasons.length > 0 && (
                        <div className="p-1.5 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-800 leading-tight">
                          <strong>Active Flag:</strong> {asset.flagged_reasons[0]}
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
                          className="flex-1 py-1 px-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Heartbeat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectAsset) onSelectAsset(asset);
                            if (onNavigate) onNavigate('registry');
                          }}
                          className="py-1 px-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-[11px] transition-colors flex items-center gap-1"
                          title="View Asset in Registry"
                        >
                          <span>Registry</span>
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
        <div className="absolute bottom-4 left-4 z-[1000] max-w-sm p-3 rounded-lg bg-slate-950/90 border border-slate-800 backdrop-blur text-xs space-y-1.5 shadow-2xl">
          <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>GIS Asset Telemetry Layer</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {filteredAssets.length} Visible
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            All markers represent synthetic prototype assets plotted on real coordinates across India. 
            Tile service powered by standard OpenStreetMap.
          </p>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-800/80 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-slate-300">Critical</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-300">Inspection Due</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Operational</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
