import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, Globe } from 'lucide-react';
import { LANGUAGES } from '../../i18n/index';

export default function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="HealthAssist hero section"
    >
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Overlay patterns */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-light/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Language pills floating */}
      <div className="absolute top-24 right-4 sm:right-8 lg:right-16 animate-float" style={{ animationDelay: '2s' }}>
        <div className="glass rounded-pill px-4 py-2 flex items-center gap-2 shadow-lg">
          <Globe className="w-4 h-4 text-white/80" />
          <div className="flex gap-1.5">
            {LANGUAGES.slice(0, 4).map(lang => (
              <span key={lang.code} className="text-xs text-white/90 font-medium lang-pill">
                {lang.native}
              </span>
            ))}
            <span className="text-xs text-white/60">+{LANGUAGES.length - 4} more</span>
          </div>
        </div>
      </div>

      {/* Floating stats cards */}
      <div className="absolute bottom-32 left-4 sm:left-8 lg:left-16 animate-float hidden md:block" style={{ animationDelay: '1s' }}>
        <div className="glass rounded-lg px-4 py-3 shadow-lg">
          <p className="text-white/60 text-xs">Hospitals discovered</p>
          <p className="text-white font-bold text-xl font-mono">12,400+</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-slide-up pt-16">
        {/* AI Badge */}
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-pill px-4 py-2 mb-8">
          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
          <span className="text-white/90 text-sm font-medium">AI-Powered Healthcare Navigation</span>
        </div>

        {/* Main headline */}
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-tight mb-4">
          <span className="block">{t('hero.headline', 'Know Your Hospital.')}</span>
          <span className="block" style={{ textShadow: '0 0 40px rgba(0,168,150,0.4)' }}>
            {t('hero.headline2', 'Know Your Cost.')}
          </span>
          <span className="block text-secondary-light" style={{ color: '#7FE8D4' }}>
            {t('hero.headline3', 'Before You Go.')}
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-white/80 text-lg sm:text-xl lg:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed font-body">
          {t('hero.subheadline', 'AI-powered healthcare navigation for every Indian — in your language, in your budget')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/search"
            className="flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-pill text-base sm:text-lg hover:bg-gray-50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 shadow-xl group"
            id="hero-cta-search"
          >
            <Search className="w-5 h-5" />
            {t('hero.cta_primary', 'Start Free Search')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/pmjay-check"
            className="flex items-center gap-2 border-2 border-white/60 text-white font-bold px-8 py-4 rounded-pill text-base sm:text-lg hover:bg-white/10 hover:border-white transition-all duration-300 backdrop-blur-sm group"
            id="hero-cta-pmjay"
          >
            🏛️ {t('hero.cta_secondary', 'Check PMJAY Eligibility')}
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-white/60 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-success text-lg">✓</span> Free to use
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-success text-lg">✓</span> No registration required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-success text-lg">✓</span> 8 languages supported
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-success text-lg">✓</span> 12,400+ hospitals
          </span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
