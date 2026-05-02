import { Link } from 'react-router-dom';
import { Heart, ExternalLink, Shield, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-text-primary text-white" role="contentinfo">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-white">HealthAssist</span>
                <p className="text-xs text-gray-400 leading-none">Healthcare Navigator</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              AI-powered healthcare cost navigation for every Indian.
            </p>
            <div className="mt-4">
              <LanguageSwitcher scrolled={true} />
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-display">Platform</h3>
            <ul className="space-y-2">
              {[
                { to: '/search', label: 'Hospital Search' },
                { to: '/results', label: 'Cost Estimator' },
                { to: '/pmjay-check', label: 'PMJAY Checker' },
                { to: '/drug-comparator', label: 'Drug Comparator' },
                { to: '/telemedicine', label: 'Telemedicine' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-display">Company</h3>
            <ul className="space-y-2">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/about', label: 'Privacy Policy' },
                { to: '/about', label: 'Disclaimer' },
                { to: '/about', label: 'Contact' },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-display">Emergency</h3>
            <div className="space-y-3">
              <a
                href="tel:112"
                className="flex items-center gap-2 bg-emergency/20 border border-emergency/30 rounded-lg px-4 py-3 text-emergency hover:bg-emergency/30 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="font-bold">112 — National Emergency</span>
              </a>
              <a
                href="tel:1800111945"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                1800-111-945 (AIIMS Helpline)
              </a>
              <a
                href="https://pmjay.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-secondary transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                pmjay.gov.in
              </a>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 pt-8 border-t border-gray-700">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            {[
              { icon: Shield, label: 'Responsible AI', color: 'text-secondary' },
              { icon: Heart, label: 'NABH Partner Network', color: 'text-primary' },
              { icon: Shield, label: 'Privacy First', color: 'text-success' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 bg-white/5 rounded-pill px-4 py-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-sm text-gray-300">{label}</span>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-4 mb-6">
            <p className="text-xs text-amber-300 text-center leading-relaxed">
              <strong>⚠️ Important Disclaimer:</strong> {t('footer.disclaimer', 'For planning purposes only. Not a medical diagnosis tool. Always consult a qualified healthcare professional before making medical decisions. Cost estimates are indicative ranges based on aggregated public data.')}
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            © 2026 HealthAssist Healthcare Navigator. Built with ❤️ for India's healthcare access challenge.
          </p>
        </div>
      </div>
    </footer>
  );
}
