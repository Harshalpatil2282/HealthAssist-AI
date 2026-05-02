import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { LANGUAGES } from '../../i18n/index';

export default function LanguageSwitcher({ compact = false, scrolled = true }) {
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-pill text-sm font-medium transition-all duration-200 ${
          scrolled
            ? 'bg-gray-100 text-text-primary hover:bg-gray-200'
            : 'bg-white/15 text-white hover:bg-white/25'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        id="language-switcher-btn"
      >
        <Globe className="w-4 h-4" />
        {!compact && (
          <span className="hidden sm:inline">{currentLang.native}</span>
        )}
        <span className="sm:hidden">{currentLang.flag}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-card-hover border border-border overflow-hidden z-50 animate-slide-down"
          role="listbox"
          aria-label="Language options"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-primary/5 transition-colors duration-150 ${
                lang.code === i18n.language ? 'text-primary font-semibold bg-primary/5' : 'text-text-primary'
              }`}
              role="option"
              aria-selected={lang.code === i18n.language}
            >
              <div className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.native}</span>
              </div>
              {lang.code === i18n.language && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
