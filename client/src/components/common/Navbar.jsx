import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Search, Heart, Phone, Pill, Video, Info } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  // Is the current page the landing/hero page (transparent navbar)
  const isHeroPage = location.pathname === '/';

  // On hero page: transparent until scrolled. On all other pages: always white
  const alwaysWhite = !isHeroPage;
  const showWhiteBg = alwaysWhite || scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also call once on mount to set correct state
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    // Reset scroll state on page change so non-hero pages always show white
    if (location.pathname !== '/') setScrolled(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/search',          label: t('nav.search'),       icon: Search },
    { to: '/pmjay-check',     label: t('nav.pmjay'),        icon: Heart  },
    { to: '/drug-comparator', label: t('nav.drugs'),        icon: Pill   },
    { to: '/telemedicine',    label: t('nav.telemedicine'), icon: Video  },
    { to: '/about',           label: t('nav.about'),        icon: Info   },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showWhiteBg
            ? 'bg-white/97 backdrop-blur-md shadow-nav border-b border-border'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link
              to="/"
              className="flex items-center gap-2 group"
              aria-label="HealthAssist — Home"
            >
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:bg-primary-dark transition-colors flex-shrink-0">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              <div>
                <span className={`font-display font-extrabold text-lg leading-none block transition-colors duration-300 ${
                  showWhiteBg ? 'text-primary' : 'text-white'
                }`}>
                  HealthAssist
                </span>
                <span className={`text-xs leading-none hidden sm:block transition-colors duration-300 ${
                  showWhiteBg ? 'text-text-secondary' : 'text-white/70'
                }`}>
                  Healthcare Navigator
                </span>
              </div>
            </Link>

            {/* ── Desktop Nav Links ── */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(to)
                      ? 'bg-primary/10 text-primary'
                      : showWhiteBg
                        ? 'text-text-primary hover:bg-gray-100 hover:text-primary'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher compact scrolled={showWhiteBg} />
              </div>

              {/* Emergency 112 — always red, always visible */}
              <a
                href="tel:112"
                className="flex items-center gap-1.5 bg-emergency text-white text-sm font-semibold px-3 py-2 rounded-pill shadow-emergency hover:bg-red-700 transition-all duration-200 emergency-pulse"
                aria-label="Emergency - Call 112"
                id="nav-emergency-btn"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden xs:inline">112</span>
              </a>

              {/* Hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`lg:hidden p-2 rounded-md transition-colors ${
                  showWhiteBg
                    ? 'text-text-primary hover:bg-gray-100'
                    : 'text-white hover:bg-white/10'
                }`}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                id="mobile-menu-toggle"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Full-Screen Drawer ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl animate-slide-down overflow-y-auto">
            <div className="p-6 pt-20">
              {/* Brand in drawer */}
              <div className="flex items-center gap-2 mb-6 pb-6 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" fill="white" />
                </div>
                <div>
                  <span className="font-display font-extrabold text-primary">HealthAssist</span>
                  <p className="text-xs text-text-secondary">Healthcare Navigator</p>
                </div>
              </div>

              <nav className="space-y-1">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isActive(to)
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-primary hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 pt-6 border-t border-border">
                <LanguageSwitcher scrolled={true} />
              </div>

              <div className="mt-6">
                <a
                  href="tel:112"
                  className="flex items-center justify-center gap-2 w-full bg-emergency text-white font-bold py-3 rounded-pill text-base"
                >
                  <Phone className="w-5 h-5" />
                  Emergency: Call 112
                </a>
              </div>

              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>Disclaimer:</strong> For planning purposes only. Not a medical diagnosis tool.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
