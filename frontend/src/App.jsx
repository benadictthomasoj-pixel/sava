import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DemoBanner from './components/DemoBanner';
import LoginScreen from './components/LoginScreen';
import DashboardOverview from './pages/DashboardOverview';
import AssetRegistry from './pages/AssetRegistry';
import MapViewPlaceholder from './pages/MapViewPlaceholder';
import DigitalHeartbeatPlaceholder from './pages/DigitalHeartbeatPlaceholder';
import CopilotPlaceholder from './pages/CopilotPlaceholder';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { fetchHealth, fetchAssets, fetchAssetStats } from './services/api';
import {
  getDemoAssets,
  getDemoAssetStats,
  getDemoAssetCategories,
} from './demo/demoService';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export function DashboardView({ isDemo = false, onExitDemo }) {
  const { user, logout, isAdmin } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('overview');
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(isDemo ? 'demo' : 'connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    if (isDemo) {
      try {
        const [demoAssetsData, demoStatsData, demoCats] = await Promise.all([
          getDemoAssets(),
          getDemoAssetStats(),
          getDemoAssetCategories(),
        ]);
        setAssets(demoAssetsData.items || []);
        setCategories(demoCats || []);
        setStats(demoStatsData);
        if (!selectedAsset && demoAssetsData.items && demoAssetsData.items.length > 0) {
          const highRisk = demoAssetsData.items.find(
            (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
          );
          setSelectedAsset(highRisk || demoAssetsData.items[0]);
        }
        setSystemStatus('demo');
      } catch (err) {
        console.error('Demo data initialization failed:', err);
        setError('Failed to load simulated demo assets.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Check backend health
      const health = await fetchHealth();
      setHealthData(health);
      setSystemStatus(health.status === 'healthy' ? 'healthy' : 'degraded');

      // 2. Fetch assets list
      const assetsData = await fetchAssets();
      setAssets(assetsData.items || []);
      setCategories(assetsData.categories || []);

      // 3. Fetch summary stats
      try {
        const statsData = await fetchAssetStats();
        setStats(statsData);
      } catch (statsErr) {
        console.warn('Could not load summary stats:', statsErr);
      }

      // If no asset is selected, pick the first flagged or first asset
      if (assetsData.items && assetsData.items.length > 0 && !selectedAsset) {
        const highRisk = assetsData.items.find(
          (a) => a.status === 'Critical Attention' || a.risk_level === 'Critical'
        );
        setSelectedAsset(highRisk || assetsData.items[0]);
      }
    } catch (err) {
      console.error('Data initialization failed:', err);
      setError(
        err.message || 'Unable to connect to AAYAM FastAPI backend on port 8000.'
      );
      setSystemStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isDemo]);

  // Route titles and subtitles for header
  const routeMeta = {
    overview: {
      title: 'Infrastructure Operations Dashboard',
      subtitle: 'Real-time telemetry overview, condition health index, and priority investigations',
    },
    registry: {
      title: 'Public Infrastructure Asset Registry',
      subtitle: 'Searchable inventory with technical specifications, district mapping, and audit records',
    },
    map: {
      title: 'Geospatial Asset Map',
      subtitle: 'Spatial distribution of monitored assets with risk-coded location pins',
    },
    heartbeat: {
      title: 'Digital Heartbeat Diagnostics',
      subtitle: 'Explainable risk breakdown, degradation indicators, and engineering audit history',
    },
    copilot: {
      title: 'AI Decision Copilot',
      subtitle: 'Grounding conversational queries in verified infrastructure records (Roadmap Preview)',
    },
  };

  const currentMeta = routeMeta[currentRoute] || routeMeta.overview;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Persistent Demo Mode Banner */}
      {isDemo && <DemoBanner onExitDemo={onExitDemo} />}

      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Left Navigation Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onRouteChange={(route) => setCurrentRoute(route)}
          systemStatus={isDemo ? 'demo' : systemStatus}
          assetCount={assets.length}
          isDemo={isDemo}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Header */}
          <Header
            pageTitle={currentMeta.title}
            subtitle={currentMeta.subtitle}
            onRefresh={!isDemo ? loadData : undefined}
            loading={loading}
            healthData={isDemo ? null : healthData}
            user={isDemo ? null : user}
            onLogout={!isDemo ? logout : undefined}
            isAdmin={isDemo ? false : isAdmin}
            isDemo={isDemo}
            onExitDemo={onExitDemo}
          />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Backend Offline Warning Banner if connection failed */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-300">
                    Backend Connection Required
                  </h4>
                  <p className="text-xs text-rose-200/80">
                    {error}
                  </p>
                  <p className="text-xs text-slate-400">
                    Run <code className="text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">cd backend && source venv/bin/activate && uvicorn app.main:app --port 8000</code> to start the FastAPI server.
                  </p>
                </div>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Render Active Route */}
          {currentRoute === 'overview' && (
            <DashboardOverview
              stats={stats}
              assets={assets}
              loading={loading}
              error={error}
              onNavigate={(route) => setCurrentRoute(route)}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'registry' && (
            <AssetRegistry
              assets={assets}
              categories={categories}
              loading={loading}
              error={error}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onNavigate={(route) => setCurrentRoute(route)}
              onRefresh={loadData}
              isAdmin={isAdmin}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'map' && (
            <MapViewPlaceholder
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onNavigate={(route) => setCurrentRoute(route)}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'heartbeat' && (
            <DigitalHeartbeatPlaceholder
              assets={assets}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
              onNavigate={(route) => setCurrentRoute(route)}
              onRefresh={loadData}
              isAdmin={isAdmin}
              isDemo={isDemo}
            />
          )}

          {currentRoute === 'copilot' && (
            <CopilotPlaceholder
              assets={assets}
              onNavigate={(route) => setCurrentRoute(route)}
              isDemo={isDemo}
            />
          )}
        </main>
      </div>
    </div>
  </div>
  );
}

function getIsDemoFromHash() {
  if (typeof window === 'undefined') return false;
  return window.location.hash.toLowerCase() === '#demo';
}

function AppRoot() {
  const { isAuthenticated, loading } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(() => getIsDemoFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setIsDemoMode(getIsDemoFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    if (window.location.hash !== '#demo') {
      window.location.hash = '#demo';
    }
  };

  const handleExitDemo = () => {
    setIsDemoMode(false);
    if (window.location.hash === '#demo') {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    }
  };

  // Direct access to demo mode does not require waiting for auth session verification
  if (isDemoMode) {
    return <DashboardView isDemo={true} onExitDemo={handleExitDemo} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">
            Verifying AAYAM Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onEnterDemo={handleEnterDemo} />;
  }

  return <DashboardView isDemo={false} />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </LanguageProvider>
  );
}
