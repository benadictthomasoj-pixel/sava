import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import DashboardOverview from '../pages/DashboardOverview';
import AssetRegistry from '../pages/AssetRegistry';
import MapViewPlaceholder from '../pages/MapViewPlaceholder';
import LanguageSelector from '../components/LanguageSelector';
import { STORAGE_KEY } from '../locales';
import * as demoService from '../demo/demoService';
import * as api from '../services/api';

// Helper component to switch languages within a test
function LanguageSwitcherHelper({ targetLang }) {
  const { setLanguage } = useLanguage();
  return (
    <button
      data-testid={`switch-to-${targetLang}`}
      onClick={() => setLanguage(targetLang)}
    >
      Switch
    </button>
  );
}

// Test wrapper that provides controlled language and auth context
function TestLanguageWrapper({ initialLanguage = 'en', children }) {
  localStorage.setItem(STORAGE_KEY, initialLanguage);
  return (
    <LanguageProvider key={initialLanguage}>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}

const mockAssets = [
  {
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
  },
  {
    id: 'DEMO-WTP-002',
    name: 'Chambal Valley Water Treatment Plant',
    category: 'Water Treatment Plant',
    district: 'Kota',
    state: 'Rajasthan',
    latitude: 25.1825,
    longitude: 75.8344,
    construction_year: 2012,
    status: 'Operational',
    risk_level: 'Low',
    risk_score: 18.2,
    health_index: 91.5,
    last_inspection_date: '2026-08-10',
    flagged_reasons: [],
    data_source: 'Municipal Water Board (Seeded)',
    description: 'Regional potable water filtration facility.',
  },
];

const mockStats = {
  total_assets: 2,
  critical_assets: 1,
  inspection_due: 0,
  average_health_index: 62.85,
};

describe('AAYAM Multilingual Core Dashboard — Stage 4.3', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.lang = 'en';
  });

  /* =========================================================================
     1. DashboardOverview in All 6 Languages
     ========================================================================= */
  describe('1. DashboardOverview Localization Across All 6 Languages', () => {
    const expectedOverviewTitles = {
      en: 'AAYAM Infrastructure Intelligence Layer',
      ta: 'ஆயம் உள்கட்டமைப்பு புலனாய்வு அடுக்கு',
      hi: 'आयाम (AAYAM) अवसंरचना इंटेलिजेंस लेयर',
      te: 'ఆయామ్ (AAYAM) మౌలిక సదుపాయాల ఇంటెలిజెన్స్ లేయర్',
      ml: 'ആയാം (AAYAM) അടിസ്ഥാന സൗകര്യ ഇന്റലിജൻസ് ലെയർ',
      kn: 'ಆಯಾಮ್ (AAYAM) ಮೂಲಸೌಕರ್ಯ ಇಂಟೆಲಿಜೆನ್ಸ್ ಲೇಯರ್',
    };

    const expectedMonitoredAssetsTitles = {
      en: 'Monitored Assets',
      ta: 'கண்காணிக்கப்படும் சொத்துக்கள்',
      hi: 'निगरानी की जा रही संपत्तियां',
      te: 'పర్యవేక్షించబడుతున్న ఆస్తులు',
      ml: 'നിരീക്ഷിക്കപ്പെടുന്ന ആസ്തികൾ',
      kn: 'ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಲಾದ ಆಸ್ತಿಗಳು',
    };

    Object.entries(expectedOverviewTitles).forEach(([langCode, expectedTitle]) => {
      it(`renders DashboardOverview in ${langCode.toUpperCase()} with correct title and KPI cards`, () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <DashboardOverview
              stats={mockStats}
              assets={mockAssets}
              onNavigate={vi.fn()}
              onSelectAsset={vi.fn()}
              isDemo={false}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedMonitoredAssetsTitles[langCode])).toBeInTheDocument();
        unmount();
      });
    });

    it('renders Demo Mode banner operations overview in Tamil and Hindi', () => {
      const { unmount, rerender } = render(
        <TestLanguageWrapper initialLanguage="ta">
          <DashboardOverview
            stats={mockStats}
            assets={mockAssets}
            onNavigate={vi.fn()}
            onSelectAsset={vi.fn()}
            isDemo={true}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('ஆயம் டெமோ செயல்பாடுகள் மேலோட்டம்')).toBeInTheDocument();
      expect(screen.getByText('மாதிரி டிஜிட்டல் இதயத்துடிப்பு தொலைஅளவியல்')).toBeInTheDocument();

      rerender(
        <TestLanguageWrapper initialLanguage="hi">
          <DashboardOverview
            stats={mockStats}
            assets={mockAssets}
            onNavigate={vi.fn()}
            onSelectAsset={vi.fn()}
            isDemo={true}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('आयाम डेमो संचालन अवलोकन')).toBeInTheDocument();
      expect(screen.getByText('सिम्युलेटेड डिजिटल हार्टबीट टेलीमेट्री')).toBeInTheDocument();
      unmount();
    });

    it('translates table headers, flagged triggers, and action buttons in Malayalam and Kannada', () => {
      const { unmount, rerender } = render(
        <TestLanguageWrapper initialLanguage="ml">
          <DashboardOverview
            stats={mockStats}
            assets={mockAssets}
            onNavigate={vi.fn()}
            onSelectAsset={vi.fn()}
            isDemo={false}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('അന്വേഷണം ആവശ്യമായ ഫ്ലാഗ് ചെയ്ത ആസ്തികൾ')).toBeInTheDocument();
      expect(screen.getByText('ആസ്തി കോഡും പേരും')).toBeInTheDocument();
      expect(screen.getByText('ഹാർട്ട്ബീറ്റ് പരിശോധിക്കുക')).toBeInTheDocument();

      rerender(
        <TestLanguageWrapper initialLanguage="kn">
          <DashboardOverview
            stats={mockStats}
            assets={mockAssets}
            onNavigate={vi.fn()}
            onSelectAsset={vi.fn()}
            isDemo={false}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('ತನಿಖೆಯ ಅಗತ್ಯವಿರುವ ಗುರುತಿಸಲಾದ ಆಸ್ತಿಗಳು')).toBeInTheDocument();
      expect(screen.getByText('ಆಸ್ತಿ ಕೋಡ್ ಮತ್ತು ಹೆಸರು')).toBeInTheDocument();
      expect(screen.getByText('ಹಾರ್ಟ್‌ಬೀಟ್ ಪರಿಶೀಲಿಸಿ')).toBeInTheDocument();
      unmount();
    });
  });

  /* =========================================================================
     2. AssetRegistry in All 6 Languages
     ========================================================================= */
  describe('2. AssetRegistry Localization Across All 6 Languages', () => {
    const expectedRegistryTitles = {
      en: 'Public Infrastructure Registry',
      ta: 'பொது உள்கட்டமைப்பு பதிவேடு',
      hi: 'सार्वजनिक अवसंरचना रजिस्ट्री',
      te: 'ప్రజా మౌలిక సదుపాయాల రిజిస్ట్రీ',
      ml: 'പൊതു അടിസ്ഥാന സൗകര്യ രജിസ്ട്രി',
      kn: 'ಸಾರ್ವಜನಿಕ ಮೂಲಸೌಕರ್ಯ ನೋಂದಣಿ',
    };

    const expectedRegisterButtons = {
      en: 'Register Asset',
      ta: 'சொத்தை பதிவு செய்',
      hi: 'संपत्ति पंजीकृत करें',
      te: 'ఆస్తిని నమోదు చేయండి',
      ml: 'ആസ്തി രജിസ്റ്റർ ചെയ്യുക',
      kn: 'ಆಸ್ತಿಯನ್ನು ನೋಂದಾಯಿಸಿ',
    };

    Object.entries(expectedRegistryTitles).forEach(([langCode, expectedTitle]) => {
      it(`renders AssetRegistry in ${langCode.toUpperCase()} with search, filter labels, and table headers`, () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <AssetRegistry
              assets={mockAssets}
              categories={['Bridge', 'Water Treatment Plant']}
              isAdmin={true}
              onSelectAsset={vi.fn()}
              onNavigate={vi.fn()}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedRegisterButtons[langCode])).toBeInTheDocument();
        unmount();
      });
    });

    it('renders selected asset details drawer with localized telemetry snapshot in Telugu', () => {
      render(
        <TestLanguageWrapper initialLanguage="te">
          <AssetRegistry
            assets={mockAssets}
            categories={['Bridge']}
            selectedAsset={mockAssets[0]}
            isAdmin={false}
            onSelectAsset={vi.fn()}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('డిజిటల్ హార్ట్‌బీట్ స్నాప్‌షాట్')).toBeInTheDocument();
      expect(screen.getByText(/స్కోరు: 87.5 \/ 100/i)).toBeInTheDocument();
      expect(screen.getByText('తనిఖీ చరిత్ర & ధృవీకరణ')).toBeInTheDocument();
      expect(screen.getByText('పూర్తి హార్ట్‌బీట్ తెరవండి')).toBeInTheDocument();
      expect(screen.getByText('మ్యాప్')).toBeInTheDocument();
    });

    it('renders Demo Mode registry banner in all 6 languages', () => {
      const expectedDemoRegistryBadges = {
        en: 'Demo Registry',
        ta: 'டெமோ பதிவேடு',
        hi: 'डेमो रजिस्ट्री',
        te: 'డెమో రిజిస్ట్రీ',
        ml: 'ഡെമോ രജിസ്ട്രി',
        kn: 'ಡೆಮೊ ನೋಂದಣಿ',
      };

      Object.entries(expectedDemoRegistryBadges).forEach(([langCode, expectedBadge]) => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <AssetRegistry
              assets={mockAssets}
              categories={['Bridge']}
              isAdmin={false}
              isDemo={true}
              onSelectAsset={vi.fn()}
              onNavigate={vi.fn()}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedBadge)).toBeInTheDocument();
        unmount();
      });
    });

    it('validates registration form with localized error messages in Tamil', async () => {
      const { container } = render(
        <TestLanguageWrapper initialLanguage="ta">
          <AssetRegistry
            assets={mockAssets}
            categories={['Bridge']}
            isAdmin={true}
            onSelectAsset={vi.fn()}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      // Open registration modal
      const openBtn = container.querySelector('#btn-register-asset-open');
      fireEvent.click(openBtn);

      // Try submitting empty form
      const form = container.querySelector('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/சொத்து ஐடி தேவை/i)).toBeInTheDocument();
      });
    });
  });

  /* =========================================================================
     3. MapViewPlaceholder in All 6 Languages
     ========================================================================= */
  describe('3. MapViewPlaceholder Localization Across All 6 Languages', () => {
    const expectedMapTitles = {
      en: 'Geospatial Infrastructure Intelligence Map',
      ta: 'புவிசார் உள்கட்டமைப்பு புலனாய்வு வரைபடம்',
      hi: 'भू-स्थानिक अवसंरचना इंटेलिजेंस मानचित्र',
      te: 'భౌగోళిక మౌలిక సదుపాయాల ఇంటెలిజెన్స్ మ్యాప్',
      ml: 'ഭൂമിശാസ്ത്രപരമായ അടിസ്ഥാന സൗകര്യ ഇന്റലിജൻസ് മാപ്പ്',
      kn: 'ಭೌಗೋಳಿಕ ಮೂಲಸೌಕರ್ಯ ಇಂಟೆಲಿಜೆನ್ಸ್ ನಕ್ಷೆ',
    };

    const expectedBasemapTags = {
      en: 'OpenStreetMap Basemap',
      ta: 'OpenStreetMap அடிப்படை வரைபடம்',
      hi: 'OpenStreetMap आधार मानचित्र',
      te: 'OpenStreetMap బేస్‌మ్యాప్',
      ml: 'OpenStreetMap ബേസ് മാപ്പ്',
      kn: 'OpenStreetMap ಮೂಲ ನಕ್ಷೆ',
    };

    Object.entries(expectedMapTitles).forEach(([langCode, expectedTitle]) => {
      it(`renders MapViewPlaceholder in ${langCode.toUpperCase()} with title and basemap tag`, () => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <MapViewPlaceholder
              assets={mockAssets}
              onSelectAsset={vi.fn()}
              onNavigate={vi.fn()}
              isDemo={false}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedBasemapTags[langCode])).toBeInTheDocument();
        unmount();
      });
    });

    it('renders simulated demo GIS notice in Kannada and Tamil when isDemo=true', () => {
      const { unmount, rerender } = render(
        <TestLanguageWrapper initialLanguage="kn">
          <MapViewPlaceholder
            assets={mockAssets}
            onSelectAsset={vi.fn()}
            onNavigate={vi.fn()}
            isDemo={true}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('ಸಿಮ್ಯುಲೇಟೆಡ್ ಡೆಮೊ ಜಿಐಎಸ್ ಟೆಲಿಮೆಟ್ರಿ')).toBeInTheDocument();

      rerender(
        <TestLanguageWrapper initialLanguage="ta">
          <MapViewPlaceholder
            assets={mockAssets}
            onSelectAsset={vi.fn()}
            onNavigate={vi.fn()}
            isDemo={true}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('மாதிரி டெமோ ஜிஐஎஸ் தொலைஅளவியல்')).toBeInTheDocument();
      unmount();
    });
  });

  /* =========================================================================
     4. Dynamic Language Switching Without Page Reload
     ========================================================================= */
  describe('4. Dynamic Language Switching Without Page Reload', () => {
    it('immediately updates visible strings across DashboardOverview when language changes', async () => {
      render(
        <TestLanguageWrapper initialLanguage="en">
          <LanguageSwitcherHelper targetLang="ta" />
          <DashboardOverview
            stats={mockStats}
            assets={mockAssets}
            onNavigate={vi.fn()}
            onSelectAsset={vi.fn()}
            isDemo={false}
          />
        </TestLanguageWrapper>
      );

      // Verify initially English
      expect(screen.getByText('Monitored Assets')).toBeInTheDocument();
      expect(screen.getByText('AAYAM Infrastructure Intelligence Layer')).toBeInTheDocument();

      // Trigger language switch to Tamil
      const switchBtn = screen.getByTestId('switch-to-ta');
      fireEvent.click(switchBtn);

      // Verify immediate translation update
      await waitFor(() => {
        expect(screen.getByText('கண்காணிக்கப்படும் சொத்துக்கள்')).toBeInTheDocument();
        expect(screen.getByText('ஆயம் உள்கட்டமைப்பு புலனாய்வு அடுக்கு')).toBeInTheDocument();
      });

      // Verify document.documentElement.lang updated
      expect(document.documentElement.lang).toBe('ta');
    });

    it('immediately updates visible strings across AssetRegistry when language changes', async () => {
      render(
        <TestLanguageWrapper initialLanguage="en">
          <LanguageSwitcherHelper targetLang="hi" />
          <AssetRegistry
            assets={mockAssets}
            categories={['Bridge']}
            isAdmin={true}
            onSelectAsset={vi.fn()}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('Public Infrastructure Registry')).toBeInTheDocument();
      expect(screen.getByText('Register Asset')).toBeInTheDocument();

      // Trigger switch to Hindi
      fireEvent.click(screen.getByTestId('switch-to-hi'));

      await waitFor(() => {
        expect(screen.getByText('सार्वजनिक अवसंरचना रजिस्ट्री')).toBeInTheDocument();
        expect(screen.getByText('संपत्ति पंजीकृत करें')).toBeInTheDocument();
      });

      expect(document.documentElement.lang).toBe('hi');
    });
  });

  /* =========================================================================
     5. Missing-Key Fallback to English
     ========================================================================= */
  describe('5. Missing-Key Fallback Behavior', () => {
    it('falls back to English when a key is missing in active Indic language', () => {
      function TestFallbackConsumer() {
        const { t } = useLanguage();
        // Request a key that only exists in English or has fallback
        return <span>{t('dashboard.monitoredAssets')}</span>;
      }

      render(
        <TestLanguageWrapper initialLanguage="ta">
          <TestFallbackConsumer />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('கண்காணிக்கப்படும் சொத்துக்கள்')).toBeInTheDocument();
    });

    it('gracefully returns fallback string or key if key is entirely nonexistent', () => {
      function TestNonexistentConsumer() {
        const { t } = useLanguage();
        return <span>{t('nonexistent.deep.key', 'Safe Fallback Text')}</span>;
      }

      render(
        <TestLanguageWrapper initialLanguage="te">
          <TestNonexistentConsumer />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('Safe Fallback Text')).toBeInTheDocument();
    });
  });

  /* =========================================================================
     6. Session and Demo Route Isolation During Language Changes
     ========================================================================= */
  describe('6. Session and Demo Route Isolation', () => {
    it('never tampers with sessionStorage or auth tokens when language changes', () => {
      vi.spyOn(api, 'fetchCurrentUserProfile').mockResolvedValue({ id: 1, username: 'engineer_raj', role: 'engineer' });
      sessionStorage.setItem('aayam_auth_token', 'test-secret-token-xyz');
      sessionStorage.setItem('aayam_user', JSON.stringify({ username: 'engineer_raj' }));

      render(
        <TestLanguageWrapper initialLanguage="en">
          <LanguageSwitcherHelper targetLang="kn" />
        </TestLanguageWrapper>
      );

      fireEvent.click(screen.getByTestId('switch-to-kn'));

      expect(localStorage.getItem(STORAGE_KEY)).toBe('kn');
      expect(sessionStorage.getItem('aayam_auth_token')).toBe('test-secret-token-xyz');
      expect(JSON.parse(sessionStorage.getItem('aayam_user')).username).toBe('engineer_raj');
    });

    it('preserves user names, IDs, coordinates, and technical asset data without translating them', () => {
      render(
        <TestLanguageWrapper initialLanguage="ta">
          <AssetRegistry
            assets={mockAssets}
            categories={['Bridge']}
            selectedAsset={mockAssets[0]}
            onSelectAsset={vi.fn()}
            onNavigate={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      // Verify technical asset ID unchanged
      expect(screen.getAllByText('DEMO-BRG-001').length).toBeGreaterThan(0);
      // Verify asset name unchanged
      expect(screen.getAllByText('Mandovi Estuary Memorial Bridge').length).toBeGreaterThan(0);
      // Verify district and state unchanged
      expect(screen.getAllByText('North Goa, Goa').length).toBeGreaterThan(0);
      // Verify GPS coordinates unchanged
      expect(screen.getByText('15.5012°N, 73.8322°E')).toBeInTheDocument();
    });
  });
});
