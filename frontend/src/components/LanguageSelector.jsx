import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * LanguageSelector Component
 *
 * Accessible dropdown allowing instant switching between:
 * - English
 * - தமிழ் (Tamil)
 * - हिन्दी (Hindi)
 * - తెలుగు (Telugu)
 * - മലയാളം (Malayalam)
 * - ಕನ್ನಡ (Kannada)
 *
 * Designed to seamlessly blend into the dark slate aesthetic of AAYAM.
 */
export default function LanguageSelector({ compact = false, className = '' }) {
  const { language, setLanguage, supportedLanguages, currentLanguageMeta } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      data-testid="language-selector-container"
    >
      <button
        id="btn-language-selector"
        data-testid="language-selector-button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select Interface Language. Current language: ${currentLanguageMeta.nativeLabel}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer select-none ${
          compact
            ? 'px-2 py-1 text-xs'
            : 'px-2.5 py-1.5 text-xs font-medium'
        } ${
          isOpen
            ? 'bg-slate-100 border-green-600 text-slate-900 shadow-xs ring-1 ring-green-500'
            : 'bg-white hover:bg-slate-50 border-slate-300 hover:border-slate-400 text-slate-800 shadow-xs'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-green-700 shrink-0" aria-hidden="true" />
        <span
          className="font-medium tracking-wide truncate max-w-[90px] sm:max-w-none text-slate-900"
          data-testid="current-language-label"
        >
          {currentLanguageMeta.nativeLabel}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-green-700' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available Interface Languages"
          data-testid="language-dropdown-menu"
          className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200 shadow-xl z-50 py-1 focus:outline-none animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Select Language</span>
            <span className="text-green-700 font-mono">மொழி / भाषा</span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  role="option"
                  id={`lang-option-${lang.code}`}
                  data-testid={`lang-option-${lang.code}`}
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-green-50 text-green-800 font-semibold border-l-2 border-green-700'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium tracking-wide text-slate-900 group-hover:text-green-800">
                      {lang.nativeLabel}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {lang.label} ({lang.script})
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-green-700 shrink-0 ml-2" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
