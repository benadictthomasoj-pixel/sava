import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDemoAssets,
  getDemoAssetById,
  getDemoAssetStats,
  getDemoAssetCategories,
  getDemoHeartbeat,
  getDemoInspections,
  getDemoTimeline,
  getDemoQuestions,
  askDemoCopilot,
  getDemoSourceDocument,
  createDemoAsset,
  createDemoInspection,
  updateDemoInspection,
  verifyDemoInspectionOutcome,
  DemoIsolationError,
} from '../demo/demoService';
import { DEMO_ASSETS, DEMO_DISCLAIMER } from '../demo/demoData';

describe('AAYAM Demo Service & Data Layer (Stage 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Sample Infrastructure Assets & Filtering', () => {
    it('provides exactly three distinct sample assets with required condition variations', async () => {
      const res = await getDemoAssets();
      expect(res.total).toBe(3);
      expect(res.count).toBe(3);
      expect(res.items).toHaveLength(3);

      const bridge = res.items.find((a) => a.id === 'DEMO-BRG-001');
      const wtp = res.items.find((a) => a.id === 'DEMO-WTP-002');
      const hwy = res.items.find((a) => a.id === 'DEMO-HWY-003');

      expect(bridge).toBeDefined();
      expect(bridge.status).toBe('Critical Attention');
      expect(bridge.risk_level).toBe('Critical');
      expect(bridge.risk_score).toBeGreaterThan(80);
      expect(bridge.flagged_reasons.some((r) => r.includes('scour'))).toBe(true);

      expect(wtp).toBeDefined();
      expect(wtp.status).toBe('Operational');
      expect(wtp.risk_level).toBe('Low');
      expect(wtp.health_index).toBeGreaterThan(90);

      expect(hwy).toBeDefined();
      expect(hwy.status).toBe('Requires Inspection');
      expect(hwy.risk_level).toBe('Moderate');
      expect(hwy.flagged_reasons.some((r) => r.includes('bearing') || r.includes('audit'))).toBe(true);
    });

    it('correctly filters demo assets by category, status, and search query', async () => {
      const bridgeFilter = await getDemoAssets({ category: 'Bridge' });
      expect(bridgeFilter.items).toHaveLength(1);
      expect(bridgeFilter.items[0].id).toBe('DEMO-BRG-001');

      const operationalFilter = await getDemoAssets({ status: 'Operational' });
      expect(operationalFilter.items).toHaveLength(1);
      expect(operationalFilter.items[0].id).toBe('DEMO-WTP-002');

      const searchFilter = await getDemoAssets({ search: 'scour' });
      expect(searchFilter.items).toHaveLength(1);
      expect(searchFilter.items[0].id).toBe('DEMO-BRG-001');

      const noMatch = await getDemoAssets({ search: 'nonexistent-query-xyz' });
      expect(noMatch.items).toHaveLength(0);
      expect(noMatch.total).toBe(3);
    });

    it('retrieves single demo asset by ID and safely rejects missing IDs', async () => {
      const asset = await getDemoAssetById('DEMO-WTP-002');
      expect(asset.id).toBe('DEMO-WTP-002');
      expect(asset.name).toContain('Chambal Valley');

      await expect(getDemoAssetById('NONEXISTENT-ASSET')).rejects.toThrow(
        /not found in simulated registry/i
      );
      await expect(getDemoAssetById('')).rejects.toThrow(/asset id is required/i);
    });

    it('returns consistent summary statistics for demo assets', async () => {
      const stats = await getDemoAssetStats();
      expect(stats.total_assets).toBe(3);
      expect(stats.critical_assets).toBe(1);
      expect(stats.operational_assets).toBe(1);
      expect(stats.inspection_due).toBe(1);
      expect(stats.average_health_index).toBeCloseTo(63.33, 1);
    });

    it('returns categories matching demo assets', async () => {
      const cats = await getDemoAssetCategories();
      expect(cats).toEqual(['Bridge', 'Water Supply', 'Highway']);
    });
  });

  describe('2. Simulated-Source Labels & Compliance Notices', () => {
    it('marks all demo asset records with simulated data sources', async () => {
      const res = await getDemoAssets();
      expect(res.disclaimer).toBe(DEMO_DISCLAIMER);
      res.items.forEach((item) => {
        expect(item.data_source).toMatch(/simulated|fictional|demo/i);
        expect(item.name).toMatch(/demo specimen/i);
      });
    });

    it('includes simulated disclaimers in Digital Heartbeat telemetry', async () => {
      const hb = await getDemoHeartbeat('DEMO-BRG-001');
      expect(hb.asset_id).toBe('DEMO-BRG-001');
      expect(hb.contributing_factors.length).toBeGreaterThan(0);
      hb.contributing_factors.forEach((f) => {
        expect(f.source).toMatch(/simulated|specimen/i);
      });
    });

    it('clearly labels all synthetic documents with simulated disclaimers', async () => {
      const doc = await getDemoSourceDocument('SIMULATED-DOC-BRG-01-SCOUR.pdf');
      expect(doc.content).toContain('SIMULATED DEMO SPECIMEN');
      expect(doc.source_agency).toContain('Simulated Specimen');
      expect(doc.pages.length).toBe(doc.total_pages);
    });
  });

  describe('3. Deterministic Copilot Answers & Citations', () => {
    it('returns starter interactive questions for demo exploration', async () => {
      const questions = await getDemoQuestions();
      expect(questions).toHaveLength(3);
      expect(questions[0].prompt).toContain('Mandovi Estuary Memorial Bridge');
      expect(questions[1].prompt).toContain('Chambal Valley Water Treatment Plant');
      expect(questions[2].prompt).toContain('Kazhakootam Skyway Corridor');
    });

    it('answers Mandovi Bridge inquiry with grounded scour citations and bed depth details', async () => {
      const res = await askDemoCopilot('What is the scour risk for Mandovi Bridge?');
      expect(res.answer).toContain('Pier P-04');
      expect(res.answer).toContain('-4.20 meters');
      expect(res.citations).toContain('[Ref 1]');
      expect(res.evidence.length).toBeGreaterThan(0);
      expect(res.evidence[0].citation_label).toBe('[Ref 1]');
      expect(res.evidence[0].document_name).toBe('SIMULATED-DOC-BRG-01-SCOUR.pdf');
      expect(res.pipeline_type).toBe('simulated_demo_pipeline');
    });

    it('answers Chambal WTP inquiry with nominal telemetry details', async () => {
      const res = await askDemoCopilot('How is the Chambal Valley Water Treatment Plant operating?');
      expect(res.answer).toContain('0.38 NTU');
      expect(res.answer).toContain('ISO 10816');
      expect(res.citations).toContain('[Ref 1]');
      expect(res.evidence[0].document_name).toBe('SIMULATED-DOC-WTP-01-ANNUAL.pdf');
    });

    it('answers Kazhakootam Skyway inquiry with overdue bearing audit details', async () => {
      const res = await askDemoCopilot('Why is Kazhakootam Skyway flagged?');
      expect(res.answer).toContain('45 days');
      expect(res.answer).toContain('Span S-12');
      expect(res.citations).toContain('[Ref 1]');
      expect(res.evidence[0].document_name).toBe('SIMULATED-DOC-HWY-01-VIADUCT.pdf');
    });

    it('handles unexpected generic queries with helpful structured guidance', async () => {
      const res = await askDemoCopilot('How do sensors work in smart cities?');
      expect(res.answer).toContain('AAYAM Infrastructure Intelligence Layer');
      expect(res.citations).toContain('[Ref 1]');
      expect(res.evidence_sufficiency).toBe('sufficient');
    });

    it('rejects empty or whitespace-only inquiries', async () => {
      await expect(askDemoCopilot('')).rejects.toThrow(/enter a question/i);
      await expect(askDemoCopilot('   ')).rejects.toThrow(/enter a question/i);
    });
  });

  describe('4. Cloned Data Immutability Guarantees', () => {
    it('prevents callers from mutating underlying demo assets array', async () => {
      const res1 = await getDemoAssets();
      res1.items[0].name = 'MUTATED NAME BY CONSUMER';
      res1.items.pop();

      const res2 = await getDemoAssets();
      expect(res2.items).toHaveLength(3);
      expect(res2.items[0].name).toBe('Mandovi Estuary Memorial Bridge (Demo Specimen)');
    });

    it('prevents callers from mutating underlying heartbeat telemetry fixtures', async () => {
      const hb1 = await getDemoHeartbeat('DEMO-BRG-001');
      hb1.risk_score = 999.9;
      hb1.contributing_factors.push({ name: 'ROGUE FACTOR' });

      const hb2 = await getDemoHeartbeat('DEMO-BRG-001');
      expect(hb2.risk_score).toBe(86.5);
      expect(hb2.contributing_factors).toHaveLength(3);
    });

    it('prevents callers from mutating inspection lists', async () => {
      const insp1 = await getDemoInspections('DEMO-BRG-001');
      insp1[0].findings = 'COMPROMISED FINDING';

      const insp2 = await getDemoInspections('DEMO-BRG-001');
      expect(insp2[0].findings).toContain('Acoustic sonar survey confirmed');
    });
  });

  describe('5. Defense-in-Depth Mutation Rejection (DemoIsolationError)', () => {
    it('strictly throws DemoIsolationError on createDemoAsset', async () => {
      await expect(createDemoAsset({ name: 'New Bridge' })).rejects.toThrow(DemoIsolationError);
      try {
        await createDemoAsset();
      } catch (err) {
        expect(err.name).toBe('DemoIsolationError');
        expect(err.status).toBe(403);
        expect(err.isDemoError).toBe(true);
        expect(err.message).toContain('register new infrastructure asset');
      }
    });

    it('strictly throws DemoIsolationError on createDemoInspection', async () => {
      await expect(createDemoInspection()).rejects.toThrow(DemoIsolationError);
    });

    it('strictly throws DemoIsolationError on updateDemoInspection', async () => {
      await expect(updateDemoInspection()).rejects.toThrow(DemoIsolationError);
    });

    it('strictly throws DemoIsolationError on verifyDemoInspectionOutcome', async () => {
      await expect(verifyDemoInspectionOutcome()).rejects.toThrow(DemoIsolationError);
    });
  });

  describe('6. Zero Network & Zero Session Storage Guarantees', () => {
    it('executes demo getters without triggering fetch', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      await getDemoAssets();
      await getDemoAssetById('DEMO-BRG-001');
      await getDemoAssetStats();
      await getDemoHeartbeat('DEMO-BRG-001');
      await getDemoInspections('DEMO-BRG-001');
      await getDemoTimeline('DEMO-BRG-001');
      await askDemoCopilot('What is the scour depth?');
      await getDemoSourceDocument('SIMULATED-DOC-BRG-01-SCOUR.pdf');

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('executes without reading or writing authentication session storage', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      await getDemoAssets();
      await askDemoCopilot('What is the scour depth?');

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(getItemSpy).not.toHaveBeenCalled();
    });
  });
});
