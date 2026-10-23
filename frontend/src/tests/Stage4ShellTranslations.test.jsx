import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import LoginScreen from '../components/LoginScreen';
import DemoBanner from '../components/DemoBanner';
import StatusBadge from '../components/StatusBadge';
import { SUPPORTED_LANGUAGES, STORAGE_KEY } from '../locales';

// Test wrapper that provides controlled language and auth context
function TestLanguageWrapper({ initialLanguage = 'en', children }) {
  localStorage.setItem(STORAGE_KEY, initialLanguage);
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}

describe('AAYAM Multilingual Shell — Stage 4.2', () => {
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
     1. Header Component in All 6 Languages
     ========================================================================= */
  describe('1. Header Component Translations', () => {
    const adminUser = { username: 'chief_eng', full_name: 'Dr. S. Raman', role: 'admin' };
    const commonUser = { username: 'citizen_priya', full_name: 'Priya Sharma', role: 'common_user' };

    it('renders role badges and action buttons correctly in English', () => {
      render(
        <TestLanguageWrapper initialLanguage="en">
          <Header
            pageTitle="Infrastructure Dashboard"
            subtitle="Central telemetry view"
            user={adminUser}
            isAdmin={true}
            onRefresh={vi.fn()}
            onLogout={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('SQLite Connected')).toBeInTheDocument();
      expect(screen.getByText('Local Prototype: Synthetic Data Seed')).toBeInTheDocument();
    });

    it('renders Header in Tamil with native role badge and simulated environment notice', () => {
      render(
        <TestLanguageWrapper initialLanguage="ta">
          <Header
            pageTitle="கண்காணிப்பு"
            subtitle="தொலைஅளவியல்"
            isDemo={true}
            onExitDemo={vi.fn()}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('மாதிரி டெமோ சூழல்')).toBeInTheDocument();
      expect(screen.getByText('மாதிரி சூழல்')).toBeInTheDocument();
      expect(screen.getByText('டெமோவிலிருந்து வெளியேறு')).toBeInTheDocument();
    });

    it('renders Common User badge in all six languages', () => {
      const expectedCommonLabels = {
        en: 'Common User',
        ta: 'பொது பயனர்',
        hi: 'सामान्य उपयोगकर्ता',
        te: 'సాధారణ వినియోగదారు',
        ml: 'സാധാരണ ഉപയോക്താവ്',
        kn: 'ಸಾಮಾನ್ಯ ಬಳಕೆದಾರ',
      };

      Object.entries(expectedCommonLabels).forEach(([langCode, expectedText]) => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <Header
              pageTitle="Overview"
              user={commonUser}
              isAdmin={false}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedText)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders Administrator badge in all six languages', () => {
      const expectedAdminLabels = {
        en: 'Administrator',
        ta: 'நிர்வாகி',
        hi: 'प्रशासक',
        te: 'నిర్వాహకుడు',
        ml: 'അഡ്മിനിസ്ട്രേറ്റർ',
        kn: 'ನಿರ್ವಾಹಕರು',
      };

      Object.entries(expectedAdminLabels).forEach(([langCode, expectedText]) => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <Header
              pageTitle="Overview"
              user={adminUser}
              isAdmin={true}
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedText)).toBeInTheDocument();
        unmount();
      });
    });
  });

  /* =========================================================================
     2. Sidebar Component in All 6 Languages
     ========================================================================= */
  describe('2. Sidebar Component Translations', () => {
    it('renders navigation items and environmental metadata in Hindi', () => {
      render(
        <TestLanguageWrapper initialLanguage="hi">
          <Sidebar
            currentRoute="overview"
            onRouteChange={vi.fn()}
            systemStatus="healthy"
            assetCount={13}
            isDemo={false}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('अवसंरचना आसूचना')).toBeInTheDocument();
      expect(screen.getByText('आसूचना मॉड्यूल')).toBeInTheDocument();
      expect(screen.getByText('डैशबोर्ड अवलोकन')).toBeInTheDocument();
      expect(screen.getByText('परिसंपत्ति रजिस्ट्री')).toBeInTheDocument();
      expect(screen.getByText('भू-स्थानिक मानचित्र')).toBeInTheDocument();
      expect(screen.getByText('डिजिटल हार्टबीट')).toBeInTheDocument();
      expect(screen.getByText('एआई निर्णय कोपायलट')).toBeInTheDocument();
      expect(screen.getByText('API ऑनलाइन')).toBeInTheDocument();
    });

    it('renders navigation items across all 6 languages', () => {
      const expectedNavRegistry = {
        en: 'Asset Registry',
        ta: 'சொத்து பதிவேடு',
        hi: 'परिसंपत्ति रजिस्ट्री',
        te: 'ఆస్తుల రిజిస్ట్రీ',
        ml: 'അസറ്റ് രജിസ്ട്രി',
        kn: 'ಆಸ್ತಿ ನೋಂದಣಿ',
      };

      Object.entries(expectedNavRegistry).forEach(([langCode, expectedText]) => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <Sidebar
              currentRoute="registry"
              onRouteChange={vi.fn()}
              systemStatus="healthy"
            />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(expectedText)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders demo sandbox status labels in Telugu', () => {
      render(
        <TestLanguageWrapper initialLanguage="te">
          <Sidebar
            currentRoute="overview"
            onRouteChange={vi.fn()}
            systemStatus="demo"
            assetCount={3}
            isDemo={true}
          />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('డెమో శాండ్‌బాక్స్')).toBeInTheDocument();
      expect(screen.getByText('వేరుచేయబడింది')).toBeInTheDocument();
      expect(screen.getByText('డెమో నమూనా')).toBeInTheDocument();
      expect(screen.getByText('సిమ్యులేటెడ్')).toBeInTheDocument();
    });
  });

  /* =========================================================================
     3. LoginScreen Component in All 6 Languages
     ========================================================================= */
  describe('3. LoginScreen Component Translations', () => {
    it('renders sign-in and registration forms in Malayalam', () => {
      render(
        <TestLanguageWrapper initialLanguage="ml">
          <LoginScreen onEnterDemo={vi.fn()} />
        </TestLanguageWrapper>
      );

      // Verify sign in title in Malayalam
      expect(screen.getByText('ആയാമിലേക്ക് (AAYAM) ലോഗിൻ ചെയ്യുക')).toBeInTheDocument();
      expect(screen.getByText('ഉപയോക്തൃനാമം അല്ലെങ്കിൽ ഇമെയിൽ')).toBeInTheDocument();
      expect(screen.getByText('പാസ്‌വേഡ്')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ലോഗിൻ ചെയ്യുക' })).toBeInTheDocument();
      expect(screen.getByText('ഡെമോ മോഡ് കാണുക')).toBeInTheDocument();

      // Switch to Register mode
      const toggleRegBtn = screen.getByText('സാധാരണ ഉപയോക്താവായി രജിസ്റ്റർ ചെയ്യുക');
      fireEvent.click(toggleRegBtn);

      expect(screen.getByText('സാധാരണ ഉപയോക്തൃ അക്കൗണ്ട് സൃഷ്ടിക്കുക')).toBeInTheDocument();
      expect(screen.getByText('ആവശ്യമുള്ള ഉപയോക്തൃനാമം')).toBeInTheDocument();
      expect(screen.getByText('ഇമെയിൽ വിലാസം')).toBeInTheDocument();
      expect(screen.getByText('പൂർണ്ണമായ പേര്')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'സാധാരണ ഉപയോക്തൃ അക്കൗണ്ട് രജിസ്റ്റർ ചെയ്യുക' })).toBeInTheDocument();
    });

    it('renders validation error messages in Kannada when submitting empty fields', () => {
      render(
        <TestLanguageWrapper initialLanguage="kn">
          <LoginScreen onEnterDemo={vi.fn()} />
        </TestLanguageWrapper>
      );

      const submitBtn = screen.getByRole('button', { name: 'ಸೈನ್ ಇನ್ ಮಾಡಿ' });
      fireEvent.click(submitBtn);

      expect(screen.getByText('ದಯವಿಟ್ಟು ನಿಮ್ಮ ಬಳಕೆದಾರ ಹೆಸರು/ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಎರಡನ್ನೂ ನಮೂದಿಸಿ.')).toBeInTheDocument();
    });

    it('renders platform access control guidance boxes in Tamil', () => {
      render(
        <TestLanguageWrapper initialLanguage="ta">
          <LoginScreen onEnterDemo={vi.fn()} />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('தள அணுகல் கட்டுப்பாடு')).toBeInTheDocument();
      expect(screen.getByText('நிர்வாகி')).toBeInTheDocument();
      expect(screen.getByText('பொது பயனர்')).toBeInTheDocument();
    });
  });

  /* =========================================================================
     4. DemoBanner Component Safety Disclaimer in All 6 Languages
     ========================================================================= */
  describe('4. DemoBanner Component Translations & Disclaimer Integrity', () => {
    it('renders DemoBanner disclaimer across all six languages without weakening safety warning', () => {
      const expectedKeywords = {
        en: 'All infrastructure assets, sensor telemetry, Copilot responses',
        ta: 'அனைத்து உள்கட்டமைப்பு சொத்துக்கள், சென்சார் தரவுகள்',
        hi: 'सभी अवसंरचना संपत्तियां, सेंसर टेलीमेट्री',
        te: 'అన్ని మౌలిక సదుపాయాల ఆస్తులు, సెన్సార్ టెలిమెట్రీ',
        ml: 'എല്ലാ ഇൻഫ്രാസ്ട്രക്ചർ അസറ്റുകളും സെൻസർ ഡാറ്റയും',
        kn: 'ಎಲ್ಲಾ ಮೂಲಸೌಕರ್ಯ ಆಸ್ತಿಗಳು, ಸಂವೇದಕ ಟೆಲಿಮೆಟ್ರಿ',
      };

      Object.entries(expectedKeywords).forEach(([langCode, expectedSnippet]) => {
        const { unmount } = render(
          <TestLanguageWrapper initialLanguage={langCode}>
            <DemoBanner onExitDemo={vi.fn()} />
          </TestLanguageWrapper>
        );

        expect(screen.getByText(new RegExp(expectedSnippet, 'i'))).toBeInTheDocument();
        unmount();
      });
    });

    it('renders exit button with localized text', () => {
      render(
        <TestLanguageWrapper initialLanguage="ta">
          <DemoBanner onExitDemo={vi.fn()} />
        </TestLanguageWrapper>
      );

      expect(screen.getByText('டெமோவிலிருந்து வெளியேறி உள்நுழைக')).toBeInTheDocument();
    });
  });

  /* =========================================================================
     5. StatusBadge Component in All 6 Languages
     ========================================================================= */
  describe('5. StatusBadge Translations', () => {
    it('renders localized status labels across all six languages', () => {
      const statusExpectations = [
        {
          status: 'Critical Attention',
          translations: {
            en: 'Critical Attention',
            ta: 'முக்கிய கவனம்',
            hi: 'गंभीर ध्यान',
            te: 'తీవ్ర శ్రద్ధ',
            ml: 'അടിയന്തിര ശ്രദ്ധ',
            kn: 'ತೀವ್ರ ಗಮನ',
          },
        },
        {
          status: 'Operational',
          translations: {
            en: 'Operational',
            ta: 'இயக்கத்தில் உள்ளது',
            hi: 'परिचालन में',
            te: 'కార్యాచరణలో ఉంది',
            ml: 'പ്രവർത്തനക്ഷമം',
            kn: 'ಕಾರ್ಯಾಚರಣೆಯಲ್ಲಿದೆ',
          },
        },
        {
          status: 'Requires Inspection',
          translations: {
            en: 'Requires Inspection',
            ta: 'ஆய்வு தேவை',
            hi: 'निरीक्षण आवश्यक',
            te: 'తనిఖీ అవసరం',
            ml: 'പരിശോധന ആവശ്യമാണ്',
            kn: 'ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ',
          },
        },
      ];

      statusExpectations.forEach(({ status, translations }) => {
        Object.entries(translations).forEach(([langCode, expectedLabel]) => {
          const { unmount } = render(
            <TestLanguageWrapper initialLanguage={langCode}>
              <StatusBadge status={status} />
            </TestLanguageWrapper>
          );

          expect(screen.getByText(expectedLabel)).toBeInTheDocument();
          unmount();
        });
      });
    });
  });

  /* =========================================================================
     6. Dynamic Language Switching & State Independence
     ========================================================================= */
  describe('6. Dynamic Switching Across Shell Components', () => {
    function ShellHarness() {
      const { setLanguage } = useLanguage();
      return (
        <div>
          <button data-testid="switch-te" onClick={() => setLanguage('te')}>
            Telugu
          </button>
          <DemoBanner onExitDemo={vi.fn()} />
          <StatusBadge status="Critical Attention" />
        </div>
      );
    }

    it('updates DemoBanner and StatusBadge text immediately upon switching language', () => {
      render(
        <TestLanguageWrapper initialLanguage="en">
          <ShellHarness />
        </TestLanguageWrapper>
      );

      // Verify initially English
      expect(screen.getByText('Critical Attention')).toBeInTheDocument();
      expect(screen.getByText('Exit Demo & Return to Sign In')).toBeInTheDocument();

      // Switch to Telugu
      fireEvent.click(screen.getByTestId('switch-te'));

      // Verify immediate update to Telugu
      expect(screen.getByText('తీవ్ర శ్రద్ధ')).toBeInTheDocument();
      expect(screen.getByText('డెమో నుండి నిష్క్రమించి లాగిన్ అవ్వండి')).toBeInTheDocument();
    });

    it('never tampers with sessionStorage tokens or demo hashes during shell language changes', () => {
      sessionStorage.setItem('aayam_auth_token', 'secure_admin_jwt');
      sessionStorage.setItem('aayam_user', JSON.stringify({ username: 'admin' }));
      window.location.hash = '#demo';

      render(
        <TestLanguageWrapper initialLanguage="en">
          <ShellHarness />
        </TestLanguageWrapper>
      );

      fireEvent.click(screen.getByTestId('switch-te'));

      expect(sessionStorage.getItem('aayam_auth_token')).toBe('secure_admin_jwt');
      expect(window.location.hash).toBe('#demo');
    });
  });
});
