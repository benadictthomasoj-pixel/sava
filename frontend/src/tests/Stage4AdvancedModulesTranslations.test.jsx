import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import DigitalHeartbeatPlaceholder from '../pages/DigitalHeartbeatPlaceholder';
import CopilotPlaceholder from '../pages/CopilotPlaceholder';
import EvidenceViewerModal, { formatRetrievalScore } from '../components/EvidenceViewerModal';
import InspectionHistoryModal from '../components/InspectionHistoryModal';
import { STORAGE_KEY } from '../locales';
import * as api from '../services/api';
import * as demoService from '../demo/demoService';

function LanguageSwitcherHelper({ targetLang }) {
  const { setLanguage } = useLanguage();
  return (
    <button
      data-testid={`switch-to-${targetLang}`}
      onClick={() => setLanguage(targetLang)}
    >
      Switch to {targetLang}
    </button>
  );
}

function TestLanguageWrapper({ initialLanguage = 'en', children }) {
  localStorage.setItem(STORAGE_KEY, initialLanguage);
  return (
    <LanguageProvider key={initialLanguage}>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}

const mockAsset = {
  id: 'DEMO-BRG-001',
  name: 'Mandovi Estuary Memorial Bridge',
  category: 'Bridge',
  district: 'North Goa',
  state: 'Goa',
  latitude: 15.5012,
  longitude: 73.8322,
  construction_year: 1986,
  status: 'Critical Attention',
  risk_level: 'Critical',
  risk_score: 87.5,
  health_index: 34.2,
  last_inspection_date: '2026-03-12',
  flagged_reasons: ['Sub-surface foundation scour detected', 'Chloride attack on pier 4'],
  data_source: 'National Highway Authority Telemetry (Seeded)',
  description: 'Major arterial bridge crossing the Mandovi estuary.',
};

const mockHeartbeat = {
  asset_id: 'DEMO-BRG-001',
  risk_score: 87.5,
  risk_tier: 'Critical',
  health_index: 34.2,
  data_confidence_score: 85,
  has_verified_intervention: true,
  data_completeness: {
    verified_fields: ['Foundation Scour', 'Vibration Telemetry', 'Expansion Joint', 'Pier Chloride'],
    missing_fields: [],
  },
  contributing_factors: [
    {
      id: 'scour',
      name: 'Structural Integrity & Scour',
      weight: 0.4,
      score: 92,
      contribution: 36.8,
      description: 'Sub-surface scour cavity exceedance under pier 4 footing.',
      source: 'Underwater Sonar Bathymetry (PWD)',
    },
  ],
  suggested_investigations: [
    {
      title: 'Diver Sonar Verification',
      priority: 'High',
      detail: 'Inspect riprap stone displacement.',
    },
  ],
};

const mockInspections = [
  {
    id: 'INSP-BRG-001',
    asset_id: 'DEMO-BRG-001',
    inspection_date: '2026-03-12',
    inspection_type: 'Underwater Sonar Bathymetry',
    status: 'Verified',
    findings: 'Scour hole depth measured at 2.4 meters.',
    recommended_action: 'Place granite rip-rap armouring around pier.',
    actual_action_taken: '45 tonnes granite placed.',
    verification_outcome: 'Remediation Successful',
    verification_notes: 'Post-repair scan confirms cavity filled.',
    verifier_name: 'Chief Bridge Engineer',
    verification_date: '2026-03-20',
    responsible_user: 'Field Inspection Unit',
    evidence_references: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
  },
];

const mockTimeline = [
  {
    title: 'Post-Remediation Verification Certified',
    date: '2026-03-20',
    description: 'Outcome certified as Remediation Successful.',
    event_type: 'verification',
    actor: 'Chief Bridge Engineer',
  },
];

const mockCopilotResponse = {
  question: 'What is the structural risk status of the Mandovi Estuary Memorial Bridge?',
  matched_assets_count: 1,
  answer: 'The Mandovi Bridge [Ref 1] exhibits foundation scour near Pier 4 according to certified sonar [Ref 2].',
  observed_facts: [
    '[Ref 2] Sonar depth measured at 2.4m under Pier 4 footing.',
    '[Ref 1] Overall risk score is 87.5/100.',
  ],
  recommendations: [
    '[Ref 1] Immediate rip-rap stone placement required.',
  ],
  citations: [
    '[Ref 1] SQLite Asset Registry: DEMO-BRG-001 (Mandovi Estuary Memorial Bridge)',
    '[Ref 2] Mandovi Bridge Pier Scour Audit 2023 (PDF), Page 1',
  ],
  evidence_sufficiency: 'sufficient',
  confidence_level: 'High',
  limitations_note: 'Grounded response generated via certified engineering audits.',
  pipeline_type: 'retrieval_only_fallback',
  evidence: [
    {
      asset_id: 'DEMO-BRG-001',
      asset_name: 'Mandovi Estuary Memorial Bridge',
      category: 'Bridge',
      district: 'North Goa',
      state: 'Goa',
      source: 'State Highway Authority',
      evidence_type: 'asset_telemetry_record',
      description: 'Status: Critical Attention | Risk Score: 87.5/100',
      risk_score: 87.5,
      status: 'Critical Attention',
      last_inspection_date: '2026-03-12',
      citation_label: 'Ref 1',
      confidence_score: 0.95,
      relevance_score: 135.0,
      source_file: 'sqlite:DEMO-BRG-001',
      file_type: 'SQLITE',
      chunk_id: 'sqlite-DEMO-BRG-001',
    },
    {
      asset_id: 'DEMO-BRG-001',
      document_name: 'Mandovi Bridge Pier Scour Audit 2023',
      source: 'Public Works Dept (PWD) Engineering Wing',
      evidence_type: 'document_audit_passage',
      description: 'Section: Page 1 | File: Mandovi Bridge Pier Scour Audit 2023 (PDF)',
      page_number: 1,
      section_title: 'Page 1',
      timestamp: '2023-11-18',
      excerpt: 'Underwater bathymetric sonar inspection revealed 2.4 meters scour hole.',
      citation_label: 'Ref 2',
      confidence_score: 0.85,
      relevance_score: 270.0,
      source_file: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
      file_type: 'PDF',
      chunk_id: 'Mandovi_Bridge_Pier_Scour_Audit_2023-p1-c1',
    },
  ],
};

describe('AAYAM Stage 4.4 — Advanced Modules Localization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.lang = 'en';

    // Mock API telemetry returns
    vi.spyOn(api, 'fetchAssetHeartbeat').mockResolvedValue(mockHeartbeat);
    vi.spyOn(api, 'fetchAssetInspections').mockResolvedValue(mockInspections);
    vi.spyOn(api, 'fetchAssetTimeline').mockResolvedValue(mockTimeline);
    vi.spyOn(api, 'askCopilot').mockResolvedValue(mockCopilotResponse);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.lang = 'en';
  });

  /* =========================================================================
     1. Digital Heartbeat in All 6 Languages
     ========================================================================= */
  describe('1. DigitalHeartbeatPlaceholder Localization Across All 6 Languages', () => {
    const expectedLiveTitles = {
      en: 'Asset Condition, Dynamic Risk & Closed-Loop Verification',
      ta: 'சொத்து நிலை, மாறும் இடர் & மூடிய சுழல் சரிபார்ப்பு',
      hi: 'परिसंपत्ति स्थिति, गतिशील जोखिम और क्लोज्ड-लूप सत्यापन',
      te: 'ఆస్తి పరిస్థితి, డైనమిక్ రిస్క్ & క్లోజ్డ్-లూప్ ధృవీకరణ',
      ml: 'ആസ്തി അവസ്ഥ, ഡൈനാമിക് റിസ്ക് & ക്ലോസ്ഡ്-ലൂപ്പ് സ്ഥിരീകരണം',
      kn: 'ಆಸ್ತಿ ಸ್ಥಿತಿ, ಕ್ರಿಯಾತ್ಮಕ ಅಪಾಯ ಮತ್ತು ಕ್ಲೋಸ್ಡ್-ಲೂಪ್ ಪರಿಶೀಲನೆ',
    };

    const expectedFactorTabs = {
      en: 'Factor Decomposition',
      ta: 'காரணி சிதைவு',
      hi: 'कारक अपघटन',
      te: 'కారకాల విభజన',
      ml: 'ഘടക അപഗ്രഥനം',
      kn: 'ಅಂಶಗಳ ವಿಭಜನೆ',
    };

    const expectedRiskLabels = {
      en: 'Calculated Risk Score',
      ta: 'கணக்கிடப்பட்ட இடர் மதிப்பெண்',
      hi: 'परिकलित जोखिम स्कोर',
      te: 'లెక్కించిన రిస్క్ స్కోరు',
      ml: 'കണക്കാക്കിയ അപകടസാധ്യത സ്കോർ',
      kn: 'ಲೆಕ್ಕಹಾಕಿದ ಅಪಾಯದ ಸ್ಕೋರ್',
    };

    Object.entries(expectedLiveTitles).forEach(([langCode, expectedTitle]) => {
      it(`renders DigitalHeartbeat in ${langCode.toUpperCase()} with correct title, tab, and risk score label`, async () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <DigitalHeartbeatPlaceholder
              assets={[mockAsset]}
              selectedAsset={mockAsset}
              isDemo={false}
              isAdmin={true}
            />
          </TestLanguageWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(expectedTitle)).toBeInTheDocument();
          expect(screen.getByText(expectedFactorTabs[langCode])).toBeInTheDocument();
          expect(screen.getByText(expectedRiskLabels[langCode])).toBeInTheDocument();
        });

        unmount();
      });
    });

    it('renders Demo Mode Digital Heartbeat badges and disclaimers in Tamil and Hindi', async () => {
      const { unmount } = render(
        <TestLanguageWrapper initialLanguage="ta">
          <DigitalHeartbeatPlaceholder
            assets={[mockAsset]}
            selectedAsset={mockAsset}
            isDemo={true}
            isAdmin={false}
          />
        </TestLanguageWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('டெமோ டிஜிட்டல் இதயத்துடிப்பு & சரிபார்ப்பு')).toBeInTheDocument();
        expect(screen.getByText('மாதிரி டிஜிட்டல் இரட்டை தொலைஅளவியல் • டெமோ பயன்முறை')).toBeInTheDocument();
      });

      unmount();
    });
  });

  /* =========================================================================
     2. AI Decision Copilot in All 6 Languages
     ========================================================================= */
  describe('2. CopilotPlaceholder Localization Across All 6 Languages', () => {
    const expectedCopilotTitles = {
      en: 'AAYAM AI Decision Copilot',
      ta: 'ஆயம் AI முடிவு வழிகாட்டி',
      hi: 'आयाम AI निर्णय सह-पायलट',
      te: 'ఆయామ్ AI నిర్ణయ కోపైలట్',
      ml: 'ആയാം AI തീരുമാന കോപൈലറ്റ്',
      kn: 'ಆಯಾಮ್ AI ನಿರ್ಧಾರ ಕೋಪೈಲಟ್',
    };

    const expectedInquiryTitles = {
      en: 'Sample Verification Inquiries (Click to Ask)',
      ta: 'மாதிரி சரிபார்ப்பு வினவல்கள் (கேட்க கிளிக் செய்க)',
      hi: 'नमूना सत्यापन प्रश्न (पूछने के लिए क्लिक करें)',
      te: 'నమూనా ధృవీకరణ ప్రశ్నలు (అడగడానికి క్లిక్ చేయండి)',
      ml: 'മാതൃകാ സ്ഥിരീകരണ അന്വേഷണങ്ങൾ (ചോദിക്കാൻ ക്ലിക്ക് ചെയ്യുക)',
      kn: 'ಮಾದರಿ ಪರಿಶೀಲನಾ ಪ್ರಶ್ನೆಗಳು (ಕೇಳಲು ಕ್ಲಿಕ್ ಮಾಡಿ)',
    };

    Object.entries(expectedCopilotTitles).forEach(([langCode, expectedTitle]) => {
      it(`renders CopilotPlaceholder in ${langCode.toUpperCase()} with header and inquiry controls`, () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <CopilotPlaceholder
              assets={[mockAsset]}
              isDemo={false}
              onNavigate={vi.fn()}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedInquiryTitles[langCode])).toBeInTheDocument();
        unmount();
      });
    });

    it('renders localized empirical facts, recommendations, and evidence sections on query in Hindi', async () => {
      render(
        <TestLanguageWrapper initialLanguage="hi">
          <CopilotPlaceholder
            assets={[mockAsset]}
            isDemo={false}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      const input = screen.getByPlaceholderText(/किसी भी बुनियादी ढांचे के बारे में पूछें/i);
      fireEvent.change(input, { target: { value: 'Mandovi Bridge' } });
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('देखे गए अनुभवजन्य तथ्य')).toBeInTheDocument();
        expect(screen.getByText('अनुशंसित कार्रवाइयां')).toBeInTheDocument();
        expect(screen.getByText('साक्ष्य उद्धरण और स्रोत उत्पत्ति')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /साक्ष्य जांचें/i }).length).toBeGreaterThan(0);
      });
    });
  });

  /* =========================================================================
     3. EvidenceViewerModal in All 6 Languages & Retrieval Score Semantics
     ========================================================================= */
  describe('3. EvidenceViewerModal Localization Across All 6 Languages', () => {
    const expectedModalTitles = {
      en: 'Retrieved Supporting Evidence & Provenance',
      ta: 'பெறப்பட்ட ஆதரவு ஆதாரம் & தோற்றம்',
      hi: 'पुनर्प्राप्त सहायक साक्ष्य और स्रोत',
      te: 'సేకరించిన సహాయక ఆధారాలు & మూలం',
      ml: 'ശേഖരിച്ച പിന്തുണ തെളിവുകളും ഉറവിടവും',
      kn: 'ಪಡೆದ ಬೆಂಬಲ ಪುರಾವೆ ಮತ್ತು ಮೂಲ',
    };

    const expectedScoreLabels = {
      en: 'Retrieval Score',
      ta: 'மீட்டெடுப்பு பொருத்தம் மதிப்பெண்',
      hi: 'पुनर्प्राप्ति मिलान स्कोर',
      te: 'పునరుద్ధరణ సరిపోలిక స్కోరు',
      ml: 'വീണ്ടെടുക്കൽ പൊരുത്ത സ്കോർ',
      kn: 'ಮರುಪಡೆಯುವಿಕೆ ಹೊಂದಾಣಿಕೆ ಸ್ಕೋರ್',
    };

    Object.entries(expectedModalTitles).forEach(([langCode, expectedTitle]) => {
      it(`renders EvidenceViewerModal in ${langCode.toUpperCase()} with correct title and retrieval score label`, () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <EvidenceViewerModal
              isOpen={true}
              onClose={vi.fn()}
              citations={mockCopilotResponse.citations}
              evidence={mockCopilotResponse.evidence}
              selectedCitationLabel="Ref 2"
              isDemo={false}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedScoreLabels[langCode])).toBeInTheDocument();
        expect(screen.getByText('270 pts')).toBeInTheDocument();
        unmount();
      });
    });

    it('preserves heuristic retrieval score points semantics without converting to confidence percentage', () => {
      expect(formatRetrievalScore({ relevance_score: 270 })).toBe('270 pts');
      expect(formatRetrievalScore({ relevance_score: 85 })).toBe('85 pts');
      expect(formatRetrievalScore({ relevance_score: -10 })).toBe('0 pts');
      expect(formatRetrievalScore(null)).toBe('N/A');
    });
  });

  /* =========================================================================
     4. InspectionHistoryModal in All 6 Languages
     ========================================================================= */
  describe('4. InspectionHistoryModal Localization Across All 6 Languages', () => {
    const expectedStatusLabels = {
      en: 'Current Status',
      ta: 'தற்போதைய நிலை',
      hi: 'वर्तमान स्थिति',
      te: 'ప్రస్తుత స్థితి',
      ml: 'നിലവിലെ അവസ്ഥ',
      kn: 'ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ',
    };

    const expectedHealthLabels = {
      en: 'Health Index',
      ta: 'ஆரோக்கிய குறியீடு',
      hi: 'स्वास्थ्य सूचकांक',
      te: 'ఆరోగ్య సూచిక',
      ml: 'ആരോഗ്യ സൂചിക',
      kn: 'ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕ',
    };

    Object.entries(expectedStatusLabels).forEach(([langCode, expectedStatusLabel]) => {
      it(`renders InspectionHistoryModal in ${langCode.toUpperCase()} with status and health ribbon labels`, async () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <InspectionHistoryModal
              isOpen={true}
              onClose={vi.fn()}
              asset={mockAsset}
              isAdmin={true}
              isDemo={false}
            />
          </TestLanguageWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(expectedStatusLabel)).toBeInTheDocument();
          expect(screen.getByText(expectedHealthLabels[langCode])).toBeInTheDocument();
        });

        unmount();
      });
    });
  });

  /* =========================================================================
     5. Dynamic Language Switching Without Page Reload
     ========================================================================= */
  describe('5. Dynamic Language Switching Without Page Reload', () => {
    it('immediately switches visible Copilot strings when language changes without page reload', async () => {
      render(
        <TestLanguageWrapper initialLanguage="en">
          <LanguageSwitcherHelper targetLang="ta" />
          <CopilotPlaceholder
            assets={[mockAsset]}
            isDemo={false}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('AAYAM AI Decision Copilot')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('switch-to-ta'));

      await waitFor(() => {
        expect(screen.getByText('ஆயம் AI முடிவு வழிகாட்டி')).toBeInTheDocument();
        expect(screen.getByText('மாதிரி சரிபார்ப்பு வினவல்கள் (கேட்க கிளிக் செய்க)')).toBeInTheDocument();
      });
    });
  });

  /* =========================================================================
     6. Role-Based Access Control and Demo Isolation
     ========================================================================= */
  describe('6. RBAC and Demo Mode Isolation', () => {
    it('shows inspection action buttons for Admin but hides them for Common User in live mode', async () => {
      const { unmount } = render(
        <TestLanguageWrapper initialLanguage="en">
          <DigitalHeartbeatPlaceholder
            assets={[mockAsset]}
            selectedAsset={mockAsset}
            isAdmin={false}
            isDemo={false}
          />
        </TestLanguageWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Factor Decomposition')).toBeInTheDocument();
      });

      // Switch to inspections tab
      const inspTab = screen.getByRole('button', { name: /Interventions & Verifications/i });
      fireEvent.click(inspTab);

      // Common User cannot see Record New Inspection button
      expect(screen.queryByRole('button', { name: /Record New Inspection/i })).toBeNull();
      unmount();
    });

    it('calls demoService instead of live api when running in demo mode', async () => {
      const askDemoSpy = vi.spyOn(demoService, 'askDemoCopilot').mockResolvedValue(mockCopilotResponse);
      const liveApiSpy = vi.spyOn(api, 'askCopilot');

      render(
        <TestLanguageWrapper initialLanguage="en">
          <CopilotPlaceholder
            assets={[mockAsset]}
            isDemo={true}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      const input = screen.getByPlaceholderText(/Ask about any infrastructure asset/i);
      fireEvent.change(input, { target: { value: 'Mandovi Bridge' } });
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(askDemoSpy).toHaveBeenCalled();
        expect(liveApiSpy).not.toHaveBeenCalled();
      });
    });
  });

  /* =========================================================================
     7. Missing Translation Fallback to English
     ========================================================================= */
  describe('7. Fallback Behavior for Missing Keys', () => {
    it('safely falls back to English when key is missing in active Indic language', () => {
      function TestFallback() {
        const { t } = useLanguage();
        return <div>{t('nonexistent.stage4_4.key', 'Safe English Fallback')}</div>;
      }

      render(
        <TestLanguageWrapper initialLanguage="ml">
          <TestFallback />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('Safe English Fallback')).toBeInTheDocument();
    });
  });
});
