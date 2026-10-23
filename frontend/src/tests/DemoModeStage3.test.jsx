import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import DashboardOverview from '../pages/DashboardOverview';
import AssetRegistry from '../pages/AssetRegistry';
import MapViewPlaceholder from '../pages/MapViewPlaceholder';
import DigitalHeartbeatPlaceholder from '../pages/DigitalHeartbeatPlaceholder';
import CopilotPlaceholder from '../pages/CopilotPlaceholder';
import EvidenceViewerModal from '../components/EvidenceViewerModal';
import * as api from '../services/api';
import * as demoService from '../demo/demoService';

describe('AAYAM Demo Mode — Stage 3: Dashboard Modules Wiring & Isolation', () => {
  let apiSpies = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    window.location.hash = '';

    // Spy on all live API methods to verify complete isolation
    apiSpies = {
      fetchAssets: vi.spyOn(api, 'fetchAssets').mockResolvedValue({ total: 0, items: [], categories: [] }),
      fetchAssetStats: vi.spyOn(api, 'fetchAssetStats').mockResolvedValue({ total_assets: 0 }),
      createAsset: vi.spyOn(api, 'createAsset').mockResolvedValue({ id: 'LIVE-001' }),
      fetchAssetHeartbeat: vi.spyOn(api, 'fetchAssetHeartbeat').mockResolvedValue({}),
      fetchAssetInspections: vi.spyOn(api, 'fetchAssetInspections').mockResolvedValue([]),
      createInspection: vi.spyOn(api, 'createInspection').mockResolvedValue({}),
      updateInspection: vi.spyOn(api, 'updateInspection').mockResolvedValue({}),
      verifyInspectionOutcome: vi.spyOn(api, 'verifyInspectionOutcome').mockResolvedValue({}),
      askCopilot: vi.spyOn(api, 'askCopilot').mockResolvedValue({}),
      fetchSourceDocument: vi.spyOn(api, 'fetchSourceDocument').mockResolvedValue({}),
      fetchHealth: vi.spyOn(api, 'fetchHealth').mockResolvedValue({ status: 'healthy', database: 'connected' }),
    };
  });

  afterEach(() => {
    window.location.hash = '';
    sessionStorage.clear();
  });

  /* =========================================================================
     1. Dashboard Overview in Demo Mode
     ========================================================================= */
  describe('1. Dashboard Overview Isolation & Demo Metrics', () => {
    it('renders the 3 demo assets with correct risk levels and simulated metrics', async () => {
      const demoStats = await demoService.getDemoAssetStats();
      const demoAssetsRes = await demoService.getDemoAssets();
      const demoAssets = demoAssetsRes.items;

      render(
        <DashboardOverview
          assets={demoAssets}
          stats={demoStats}
          loading={false}
          error={null}
          isDemo={true}
        />
      );

      // Verify simulated environment indicator is rendered
      expect(screen.getByText(/simulated digital heartbeat telemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/aayam demo operations overview/i)).toBeInTheDocument();

      // Verify stats derived from demo data
      expect(screen.getByText('3')).toBeInTheDocument(); // Total Assets
      expect(screen.getByText(/63.33%/)).toBeInTheDocument(); // Avg health index

      // Verify flagged demo assets are visible in table and banner
      expect(screen.getByText('Mandovi Estuary Memorial Bridge (Demo Specimen)')).toBeInTheDocument();
      expect(screen.getByText(/Kazhakootam Skyway/i)).toBeInTheDocument();

      // Verify no live API was invoked
      expect(apiSpies.fetchAssets).not.toHaveBeenCalled();
      expect(apiSpies.fetchAssetStats).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     2. Asset Registry in Demo Mode
     ========================================================================= */
  describe('2. Asset Registry Isolation & Mutation Protection', () => {
    it('lists and filters demo assets without requesting real database', async () => {
      const demoAssetsRes = await demoService.getDemoAssets();
      const demoAssets = demoAssetsRes.items;
      const demoCategories = await demoService.getDemoAssetCategories();

      render(
        <AssetRegistry
          assets={demoAssets}
          categories={demoCategories}
          selectedAsset={null}
          onSelectAsset={vi.fn()}
          onNavigate={vi.fn()}
          isDemo={true}
        />
      );

      // Verify demo banner indicator in registry
      expect(screen.getByTestId('demo-registry-banner')).toBeInTheDocument();

      // Verify search/filter works for demo assets
      const searchInput = screen.getByPlaceholderText(/search by asset code, name/i);
      fireEvent.change(searchInput, { target: { value: 'Water Treatment' } });

      expect(screen.getByText('Chambal Valley Water Treatment Plant (Demo Specimen)')).toBeInTheDocument();
      expect(screen.queryByText('Mandovi Estuary Memorial Bridge (Demo Specimen)')).not.toBeInTheDocument();

      // Ensure no live fetch occurred
      expect(apiSpies.fetchAssets).not.toHaveBeenCalled();
    });

    it('blocks asset creation in demo mode and does not call api.createAsset', async () => {
      const demoAssetsRes = await demoService.getDemoAssets();
      const demoAssets = demoAssetsRes.items;
      const demoCategories = await demoService.getDemoAssetCategories();

      const { container } = render(
        <AssetRegistry
          assets={demoAssets}
          categories={demoCategories}
          selectedAsset={null}
          onSelectAsset={vi.fn()}
          onNavigate={vi.fn()}
          isDemo={true}
        />
      );

      // Open new asset modal
      const registerBtn = screen.getByRole('button', { name: /register asset/i });
      fireEvent.click(registerBtn);

      // Fill in demo asset form
      const idInput = container.querySelector('#input-asset-id');
      const nameInput = container.querySelector('#input-asset-name');
      const districtInput = container.querySelector('#input-asset-district');
      const stateInput = container.querySelector('#input-asset-state');
      const latInput = container.querySelector('#input-asset-latitude');
      const lngInput = container.querySelector('#input-asset-longitude');

      fireEvent.change(idInput, { target: { value: 'DEMO-NEW-999' } });
      fireEvent.change(nameInput, { target: { value: 'Synthetic Test Asset' } });
      fireEvent.change(districtInput, { target: { value: 'Kanpur' } });
      fireEvent.change(stateInput, { target: { value: 'Uttar Pradesh' } });
      fireEvent.change(latInput, { target: { value: '26.84' } });
      fireEvent.change(lngInput, { target: { value: '80.94' } });

      // Submit form
      const submitBtn = container.querySelector('#btn-submit-registration');
      fireEvent.click(submitBtn);

      // Expect demo explanatory rejection message in the UI
      await waitFor(() => {
        expect(
          screen.getByText(/infrastructure mutations and records creation are disabled in simulated demo mode/i)
        ).toBeInTheDocument();
      });

      // Assert zero calls to api.createAsset
      expect(apiSpies.createAsset).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     3. Geospatial Map in Demo Mode
     ========================================================================= */
  describe('3. Geospatial Map Isolation & Offline Tile Fallback', () => {
    it('renders the 3 demo assets on coordinates and labels as simulated GIS telemetry', async () => {
      const demoAssetsRes = await demoService.getDemoAssets();
      const demoAssets = demoAssetsRes.items;

      render(
        <MapViewPlaceholder
          assets={demoAssets}
          selectedAsset={demoAssets[0]}
          onSelectAsset={vi.fn()}
          onNavigate={vi.fn()}
          isDemo={true}
        />
      );

      // Verify demo GIS notice
      expect(screen.getByText(/simulated demo gis telemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/3 demo visible/i)).toBeInTheDocument();
    });

    it('renders the map container without calling live API', async () => {
      const demoAssetsRes = await demoService.getDemoAssets();
      const demoAssets = demoAssetsRes.items;

      const { container } = render(
        <MapViewPlaceholder
          assets={demoAssets}
          selectedAsset={demoAssets[0]}
          onSelectAsset={vi.fn()}
          onNavigate={vi.fn()}
          isDemo={true}
        />
      );

      // Check map container rendered
      expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
      expect(apiSpies.fetchAssets).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     4. Digital Heartbeat in Demo Mode
     ========================================================================= */
  describe('4. Digital Heartbeat Isolation & Mutation Handling', () => {
    it('loads heartbeat factor decomposition and telemetry exclusively from demoService', async () => {
      const demoAsset = await demoService.getDemoAssetById('DEMO-BRG-001');

      render(
        <DigitalHeartbeatPlaceholder
          assets={[demoAsset]}
          selectedAsset={demoAsset}
          onBackToRegistry={vi.fn()}
          isDemo={true}
        />
      );

      // Verify simulated indicator appears
      await waitFor(() => {
        expect(screen.getByText(/simulated digital twin telemetry/i)).toBeInTheDocument();
      });

      // Verify contributing factors from DEMO-BRG-001
      expect(screen.getByText(/pier scour hydraulic degradation/i)).toBeInTheDocument();

      // Verify zero calls to live api methods
      expect(apiSpies.fetchAssetHeartbeat).not.toHaveBeenCalled();
      expect(apiSpies.fetchAssetInspections).not.toHaveBeenCalled();
    });

    it('blocks inspection scheduling and verification in demo mode', async () => {
      const demoAsset = await demoService.getDemoAssetById('DEMO-BRG-001');

      render(
        <DigitalHeartbeatPlaceholder
          assets={[demoAsset]}
          selectedAsset={demoAsset}
          onBackToRegistry={vi.fn()}
          isDemo={true}
        />
      );

      // Wait for initial telemetry to load
      await screen.findByText(/pier scour hydraulic degradation/i);

      // Switch to inspections tab
      const inspectionsTab = await screen.findByRole('button', { name: /interventions & verifications/i });
      fireEvent.click(inspectionsTab);

      // Click schedule inspection button
      const scheduleBtn = await screen.findByRole('button', { name: /schedule inspection/i });
      fireEvent.click(scheduleBtn);

      // Fill in scheduled inspection form
      const findingsInput = screen.getByPlaceholderText(/document verified anomalies/i);
      fireEvent.change(findingsInput, { target: { value: 'Demo Scour Check' } });

      const submitBtn = screen.getByRole('button', { name: /save & recalculate risk/i });
      fireEvent.submit(findingsInput.closest('form'));

      // Expect demo explanatory message
      await waitFor(() => {
        expect(
          screen.getByText(/cannot record.*inspection/i)
        ).toBeInTheDocument();
      });

      // Verify zero network calls were made
      expect(apiSpies.createInspection).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     5. AI Decision Copilot & Evidence Viewer in Demo Mode
     ========================================================================= */
  describe('5. Copilot & Evidence Viewer Isolation', () => {
    it('displays the three predefined demo questions as clickable prompts', async () => {
      const demoAsset = await demoService.getDemoAssetById('DEMO-BRG-001');

      render(
        <CopilotPlaceholder
          assets={[demoAsset]}
          onNavigate={vi.fn()}
          isDemo={true}
        />
      );

      expect(screen.getByText(/simulated decision copilot/i)).toBeInTheDocument();
      expect(screen.getByText('Mandovi Estuary Bridge (PDF)')).toBeInTheDocument();
      expect(screen.getByText('Chambal Valley WTP (PDF)')).toBeInTheDocument();
      expect(screen.getByText('Kazhakootam Skyway (PDF)')).toBeInTheDocument();
    });

    it('clicking a demo question invokes askDemoCopilot deterministically and blocks live /api/copilot/ask', async () => {
      const askDemoSpy = vi.spyOn(demoService, 'askDemoCopilot');
      const demoAsset = await demoService.getDemoAssetById('DEMO-BRG-001');

      render(
        <CopilotPlaceholder
          assets={[demoAsset]}
          onNavigate={vi.fn()}
          isDemo={true}
        />
      );

      const promptBtn = screen.getByRole('button', { name: /mandovi estuary bridge/i });
      fireEvent.click(promptBtn);

      // Verify deterministic answer appears
      await waitFor(() => {
        expect(screen.getByText(/-4.20 meters/i)).toBeInTheDocument();
      });

      // Verify askDemoCopilot was called
      expect(askDemoSpy).toHaveBeenCalled();

      // Verify live askCopilot was NOT called
      expect(apiSpies.askCopilot).not.toHaveBeenCalled();

      // Verify simulated disclaimer and citation label
      expect(screen.getByTestId('copilot-demo-disclaimer')).toBeInTheDocument();
      expect(screen.getAllByText(/simulated demonstration material/i).length).toBeGreaterThanOrEqual(1);
    });

    it('opens EvidenceViewerModal with synthetic specimen and does not call live fetchSourceDocument', async () => {
      const getDemoDocSpy = vi.spyOn(demoService, 'getDemoSourceDocument');

      const mockEvidence = [
        {
          citation_label: '[Ref 1]',
          source: 'Simulated Underwater Sonar Survey (Specimen #SONAR-2024-03)',
          document_name: 'Mandovi Estuary Bridge Pier Scour Underwater Bathymetric Audit (Simulated Specimen)',
          filename: 'SIMULATED-DOC-BRG-01-SCOUR.pdf',
          section_title: 'Section 3.2: Pier P-04 Bathymetric Scour Profile',
          page_number: 3,
          excerpt: 'High-density multibeam acoustic depth sounding across navigation channel recorded -4.20m.',
          evidence_type: 'document_audit_passage',
          relevance_score: 96.0,
          description: 'Simulated sonar multibeam audit documenting 4.2m bed degradation at Pier P-04.',
          asset_id: 'DEMO-BRG-001',
          asset_name: 'Mandovi Estuary Memorial Bridge (Demo Specimen)',
        },
      ];

      render(
        <EvidenceViewerModal
          isOpen={true}
          onClose={vi.fn()}
          selectedCitationLabel="Ref 1"
          citations={['[Ref 1] SIMULATED-DOC-BRG-01-SCOUR.pdf']}
          evidence={mockEvidence}
          isDemo={true}
        />
      );

      // Verify simulated specimen banner is displayed
      await waitFor(() => {
        expect(screen.getByText(/simulated demonstration specimen/i)).toBeInTheDocument();
      });

      // Verify excerpt content
      expect(screen.getByText(/high-density multibeam acoustic depth sounding/i)).toBeInTheDocument();

      // Switch to Document tab
      const docTabBtn = screen.getByRole('button', { name: /full source document/i });
      fireEvent.click(docTabBtn);

      // Verify getDemoSourceDocument called
      await waitFor(() => {
        expect(getDemoDocSpy).toHaveBeenCalledWith(mockEvidence[0].document_name);
      });

      // Verify live fetchSourceDocument was never invoked
      expect(apiSpies.fetchSourceDocument).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     6. Complete Application Integration (#demo route)
     ========================================================================= */
  describe('6. Full App Navigation & Module Switching in Demo Mode', () => {
    it('wires all modules in App without requesting live asset endpoints', async () => {
      window.location.hash = '#demo';
      render(<App />);

      // Wait for Demo Banner
      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Verify Dashboard overview rendered with demo assets
      expect(await screen.findByText('Mandovi Estuary Memorial Bridge (Demo Specimen)')).toBeInTheDocument();

      // Navigate to Asset Registry
      const registryNav = screen.getByRole('button', { name: /asset registry/i });
      fireEvent.click(registryNav);
      expect(await screen.findByTestId('demo-registry-banner')).toBeInTheDocument();

      // Navigate to Digital Heartbeat
      const heartbeatNav = screen.getByRole('button', { name: /digital heartbeat/i });
      fireEvent.click(heartbeatNav);
      expect(await screen.findByText(/pier scour hydraulic degradation/i)).toBeInTheDocument();

      // Navigate to Decision Copilot
      const copilotNav = screen.getByRole('button', { name: /ai decision copilot/i });
      fireEvent.click(copilotNav);
      expect(await screen.findByText(/simulated decision copilot/i)).toBeInTheDocument();

      // Ensure no live asset, stats, heartbeat, or copilot API calls occurred
      expect(apiSpies.fetchAssets).not.toHaveBeenCalled();
      expect(apiSpies.fetchAssetStats).not.toHaveBeenCalled();
      expect(apiSpies.fetchAssetHeartbeat).not.toHaveBeenCalled();
      expect(apiSpies.askCopilot).not.toHaveBeenCalled();
    });
  });
});
