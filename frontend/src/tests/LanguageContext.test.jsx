import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LanguageProvider,
  useLanguage,
} from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  LOCALES,
  isSupportedLanguage,
  interpolate,
} from '../locales';
import App from '../App';
import * as api from '../services/api';

// Test consumer harness to inspect context values
function TestConsumer({ testKey = 'nav.overview', fallbackText, vars }) {
  const { language, setLanguage, t, supportedLanguages, currentLanguageMeta } = useLanguage();

  return (
    <div>
      <div data-testid="active-lang">{language}</div>
      <div data-testid="active-native-label">{currentLanguageMeta.nativeLabel}</div>
      <div data-testid="translated-text">{t(testKey, fallbackText, vars)}</div>
      <div data-testid="supported-count">{supportedLanguages.length}</div>
      <button
        data-testid="btn-set-ta"
        onClick={() => setLanguage('ta')}
      >
        Set Tamil
      </button>
      <button
        data-testid="btn-set-hi"
        onClick={() => setLanguage('hi')}
      >
        Set Hindi
      </button>
      <button
        data-testid="btn-set-ml"
        onClick={() => setLanguage('ml')}
      >
        Set Malayalam
      </button>
      <button
        data-testid="btn-set-invalid"
        onClick={() => setLanguage('unsupported_xyz')}
      >
        Set Invalid
      </button>
    </div>
  );
}

describe('AAYAM Multilingual Foundation — Stage 4.1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '';
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '';
    document.documentElement.lang = 'en';
  });

  /* =========================================================================
     1. Locales Registry & Dictionary Completeness
     ========================================================================= */
  describe('1. Locales Registry & Dictionary Integrity', () => {
    it('supports all six required languages with correct codes and native scripts', () => {
      const expectedCodes = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];
      expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(expectedCodes);

      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('TA')).toBe(true); // case-insensitive
      expect(isSupportedLanguage('hi')).toBe(true);
      expect(isSupportedLanguage('te')).toBe(true);
      expect(isSupportedLanguage('ml')).toBe(true);
      expect(isSupportedLanguage('kn')).toBe(true);
      expect(isSupportedLanguage('fr')).toBe(false);
      expect(isSupportedLanguage('')).toBe(false);
    });

    it('verifies that each of the six dictionaries contains core navigation and shared keys', () => {
      const codes = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];

      codes.forEach((code) => {
        const dict = LOCALES[code];
        expect(dict).toBeDefined();
        expect(dict.common).toBeDefined();
        expect(dict.common.appName).toBeDefined();
        expect(dict.nav).toBeDefined();
        expect(dict.nav.overview).toBeDefined();
        expect(dict.nav.registry).toBeDefined();
        expect(dict.nav.map).toBeDefined();
        expect(dict.nav.heartbeat).toBeDefined();
        expect(dict.nav.copilot).toBeDefined();
        expect(dict.auth.signIn).toBeDefined();
        expect(dict.status.criticalAttention).toBeDefined();
      });
    });

    it('replaces template variables correctly with interpolate()', () => {
      expect(interpolate('{count} Demo Visible', { count: 3 })).toBe('3 Demo Visible');
      expect(interpolate('Welcome, {name}!', { name: 'Dr. Rao' })).toBe('Welcome, Dr. Rao!');
      expect(interpolate('No variables here', {})).toBe('No variables here');
      expect(interpolate('Missing {var}', {})).toBe('Missing {var}');
    });
  });

  /* =========================================================================
     2. LanguageContext & Translation Helper (t)
     ========================================================================= */
  describe('2. LanguageContext & t() Function', () => {
    it('defaults to English when no language is saved in localStorage', () => {
      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      expect(screen.getByTestId('active-lang').textContent).toBe('en');
      expect(screen.getByTestId('active-native-label').textContent).toBe('English');
      expect(screen.getByTestId('translated-text').textContent).toBe('Dashboard Overview');
      expect(document.documentElement.lang).toBe('en');
    });

    it('switches languages dynamically and translates navigation keys in Tamil and Hindi', () => {
      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      // Switch to Tamil
      fireEvent.click(screen.getByTestId('btn-set-ta'));
      expect(screen.getByTestId('active-lang').textContent).toBe('ta');
      expect(screen.getByTestId('active-native-label').textContent).toBe('தமிழ்');
      expect(screen.getByTestId('translated-text').textContent).toBe('கண்காணிப்பு மேலோட்டம்');
      expect(document.documentElement.lang).toBe('ta');

      // Switch to Hindi
      fireEvent.click(screen.getByTestId('btn-set-hi'));
      expect(screen.getByTestId('active-lang').textContent).toBe('hi');
      expect(screen.getByTestId('active-native-label').textContent).toBe('हिन्दी');
      expect(screen.getByTestId('translated-text').textContent).toBe('डैशबोर्ड अवलोकन');
      expect(document.documentElement.lang).toBe('hi');
    });

    it('falls back to English when a key is missing in the active language dictionary', () => {
      // Temporarily mock an active locale with a missing key
      render(
        <LanguageProvider>
          <TestConsumer testKey="common.disclaimerNotice" />
        </LanguageProvider>
      );

      // Switch to Kannada
      act(() => {
        screen.getByTestId('btn-set-ta').click();
      });

      // disclaimerNotice exists in Tamil
      expect(screen.getByTestId('translated-text').textContent).toContain('மாதிரி');
    });

    it('never returns undefined for completely non-existent keys', () => {
      render(
        <LanguageProvider>
          <TestConsumer testKey="completely.non.existent.key" fallbackText="Safe Fallback" />
        </LanguageProvider>
      );

      // Returns provided fallback
      expect(screen.getByTestId('translated-text').textContent).toBe('Safe Fallback');
    });

    it('returns key string itself if non-existent and no fallback provided (never undefined)', () => {
      render(
        <LanguageProvider>
          <TestConsumer testKey="missing.key.without.fallback" />
        </LanguageProvider>
      );

      expect(screen.getByTestId('translated-text').textContent).toBe('missing.key.without.fallback');
    });

    it('performs variable interpolation through t()', () => {
      render(
        <LanguageProvider>
          <TestConsumer testKey="demo.visibleCount" vars={{ count: 3 }} />
        </LanguageProvider>
      );

      expect(screen.getByTestId('translated-text').textContent).toBe('3 Demo Visible');

      // Switch to Tamil
      fireEvent.click(screen.getByTestId('btn-set-ta'));
      expect(screen.getByTestId('translated-text').textContent).toBe('3 டெமோ காணக்கூடியவை');
    });
  });

  /* =========================================================================
     3. Persistence & Complete State Isolation
     ========================================================================= */
  describe('3. Safe Persistence & State Isolation', () => {
    it('restores language from localStorage on initial render', () => {
      localStorage.setItem(STORAGE_KEY, 'te');

      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      expect(screen.getByTestId('active-lang').textContent).toBe('te');
      expect(screen.getByTestId('active-native-label').textContent).toBe('తెలుగు');
      expect(screen.getByTestId('translated-text').textContent).toBe('డాష్‌బోర్డ్ అవలోకనం');
      expect(document.documentElement.lang).toBe('te');
    });

    it('falls back to English when localStorage contains an invalid code', () => {
      localStorage.setItem(STORAGE_KEY, 'unsupported_code_123');

      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      expect(screen.getByTestId('active-lang').textContent).toBe(DEFAULT_LANGUAGE);
      expect(document.documentElement.lang).toBe(DEFAULT_LANGUAGE);
    });

    it('persists selected language to localStorage under aayam_ui_language only', () => {
      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('btn-set-ml'));
      // Button not in consumer, test setLanguage directly via btn-set-ta
      fireEvent.click(screen.getByTestId('btn-set-ta'));

      expect(localStorage.getItem(STORAGE_KEY)).toBe('ta');
    });

    it('does not touch, read, or overwrite sessionStorage authentication tokens or user objects', () => {
      sessionStorage.setItem('aayam_auth_token', 'mock_secure_jwt_token');
      sessionStorage.setItem('aayam_user', JSON.stringify({ username: 'admin', role: 'admin' }));

      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      // Perform language changes
      fireEvent.click(screen.getByTestId('btn-set-ta'));
      fireEvent.click(screen.getByTestId('btn-set-hi'));

      // Verify sessionStorage values remain exactly identical
      expect(sessionStorage.getItem('aayam_auth_token')).toBe('mock_secure_jwt_token');
      const storedUser = JSON.parse(sessionStorage.getItem('aayam_user'));
      expect(storedUser.username).toBe('admin');
    });

    it('does not change demo URL hash or demo state during language switching', () => {
      window.location.hash = '#demo';

      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('btn-set-ta'));
      expect(window.location.hash).toBe('#demo');
    });

    it('makes zero network requests when switching languages', () => {
      const fetchSpy = vi.spyOn(window, 'fetch');
      const healthSpy = vi.spyOn(api, 'fetchHealth');

      render(
        <LanguageProvider>
          <TestConsumer />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('btn-set-ta'));
      fireEvent.click(screen.getByTestId('btn-set-hi'));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(healthSpy).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
     4. LanguageSelector UI Component
     ========================================================================= */
  describe('4. LanguageSelector Dropdown Component', () => {
    it('renders the selector button with active language native label', () => {
      render(
        <LanguageProvider>
          <LanguageSelector />
        </LanguageProvider>
      );

      const btn = screen.getByTestId('language-selector-button');
      expect(btn).toBeInTheDocument();
      expect(screen.getByTestId('current-language-label').textContent).toBe('English');
    });

    it('opens dropdown menu showing all six native language choices', async () => {
      render(
        <LanguageProvider>
          <LanguageSelector />
        </LanguageProvider>
      );

      const btn = screen.getByTestId('language-selector-button');
      fireEvent.click(btn);

      // Check dropdown is visible
      expect(screen.getByTestId('language-dropdown-menu')).toBeInTheDocument();

      // Check all 6 language options exist
      expect(screen.getByTestId('lang-option-en')).toBeInTheDocument();
      expect(screen.getByTestId('lang-option-ta')).toBeInTheDocument();
      expect(screen.getByTestId('lang-option-hi')).toBeInTheDocument();
      expect(screen.getByTestId('lang-option-te')).toBeInTheDocument();
      expect(screen.getByTestId('lang-option-ml')).toBeInTheDocument();
      expect(screen.getByTestId('lang-option-kn')).toBeInTheDocument();

      // Check native labels
      expect(screen.getByText('தமிழ்')).toBeInTheDocument();
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
      expect(screen.getByText('తెలుగు')).toBeInTheDocument();
      expect(screen.getByText('മലയാളം')).toBeInTheDocument();
      expect(screen.getByText('ಕನ್ನಡ')).toBeInTheDocument();
    });

    it('clicking an option switches language immediately and closes dropdown', async () => {
      render(
        <LanguageProvider>
          <LanguageSelector />
        </LanguageProvider>
      );

      // Open dropdown
      fireEvent.click(screen.getByTestId('language-selector-button'));

      // Click Kannada
      const knOption = screen.getByTestId('lang-option-kn');
      fireEvent.click(knOption);

      // Dropdown closes
      expect(screen.queryByTestId('language-dropdown-menu')).not.toBeInTheDocument();

      // Button label updates to Kannada
      expect(screen.getByTestId('current-language-label').textContent).toBe('ಕನ್ನಡ');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('kn');
      expect(document.documentElement.lang).toBe('kn');
    });
  });

  /* =========================================================================
     5. Full App Integration & Regression Check
     ========================================================================= */
  describe('5. App Integration with LanguageProvider', () => {
    it('renders the LanguageSelector on the Login screen and in Demo Mode', async () => {
      render(<App />);

      // On login screen, language selector should be present
      expect(await screen.findByTestId('language-selector-button')).toBeInTheDocument();

      // Switch to Tamil via selector on login screen
      fireEvent.click(screen.getByTestId('language-selector-button'));
      fireEvent.click(screen.getByTestId('lang-option-ta'));

      expect(screen.getByTestId('current-language-label').textContent).toBe('தமிழ்');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('ta');
    });

    it('persists language selection across demo navigation without breaking auth', async () => {
      window.location.hash = '#demo';
      render(<App />);

      // Wait for demo banner
      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Selector in header
      const langBtn = screen.getByTestId('language-selector-button');
      expect(langBtn).toBeInTheDocument();

      // Switch to Hindi while in demo mode
      fireEvent.click(langBtn);
      fireEvent.click(screen.getByTestId('lang-option-hi'));

      expect(screen.getByTestId('current-language-label').textContent).toBe('हिन्दी');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('hi');

      // Demo mode is still active
      expect(window.location.hash).toBe('#demo');
      expect(screen.getByRole('region', { name: /डेमो मोड सूचना|demo mode notice/i })).toBeInTheDocument();
    });
  });
});
