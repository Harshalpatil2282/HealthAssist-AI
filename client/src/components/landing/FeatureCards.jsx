import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: '🏥',
    title: 'Hospital Discovery',
    description: 'Ranked by clinical quality, distance, affordability and reputation. NABH and JCI accreditation badges shown prominently.',
    cta: 'Find Hospitals',
    to: '/search',
    gradient: 'from-blue-500 to-primary',
    bg: 'bg-blue-50',
    badge: 'Smart Ranking',
  },
  {
    icon: '💰',
    title: 'Cost Estimator',
    description: 'Component-level breakdown — procedure, stay, medications, diagnostics, contingency. With confidence score and risk flags.',
    cta: 'Estimate Cost',
    to: '/search',
    gradient: 'from-teal-500 to-secondary',
    bg: 'bg-teal-50',
    badge: 'AI Powered',
  },
  {
    icon: '🏛️',
    title: 'PMJAY Checker',
    description: 'Instant Ayushman Bharat eligibility check. Covers 68 Cr Indians for up to ₹5 lakh per family per year at empanelled hospitals.',
    cta: 'Check Eligibility',
    to: '/pmjay-check',
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    badge: 'Govt Scheme',
  },
  {
    icon: '💊',
    title: 'Generic Drugs',
    description: 'Compare brand vs generic medicines. Save 60–80% on post-operative medications from Jan Aushadhi Kendras near you.',
    cta: 'Compare Drugs',
    to: '/drug-comparator',
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    badge: 'Save 80%',
  },
];

export default function FeatureCards() {
  return (
    <section className="py-16 sm:py-24 bg-bg-main" aria-label="Platform features">
      <div className="page-container">
        <div className="text-center mb-14">
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-3">
            Complete Healthcare Navigation
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary">
            Everything You Need, In One Place
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {FEATURES.map((feature, idx) => (
            <Link
              key={feature.title}
              to={feature.to}
              className="group bg-bg-card rounded-lg border border-border p-6 sm:p-8 card-hover block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={`${feature.title} — ${feature.description}`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`${feature.bg} w-14 h-14 rounded-lg flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-pill bg-gradient-to-r ${feature.gradient} text-white`}>
                  {feature.badge}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-text-primary mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-5">
                {feature.description}
              </p>

              <div className={`inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent group-hover:gap-2.5 transition-all duration-300`}>
                {feature.cta}
                <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
