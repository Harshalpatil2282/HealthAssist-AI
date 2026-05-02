import { Shield, Heart, Users, Brain, ExternalLink } from 'lucide-react';
import Footer from '../components/common/Footer';

const PRINCIPLES = [
  {
    icon: Shield,
    title: 'Never Diagnose',
    description: 'HealthAssist never provides a medical diagnosis. All outputs use "may relate to" language and explicitly state they are planning tools, not diagnostic tools.',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Brain,
    title: 'Transparent Uncertainty',
    description: 'Every cost estimate includes a mandatory confidence score and shows data ranges — never false precision. Low confidence is always clearly communicated.',
    color: 'text-secondary bg-secondary/10',
  },
  {
    icon: Heart,
    title: 'Emergency First',
    description: 'Emergency keyword detection is non-negotiable. When red-flag symptoms are detected, we stop the search and direct to 112 immediately.',
    color: 'text-emergency bg-red-50',
  },
  {
    icon: Users,
    title: 'Data Attribution',
    description: 'Every cost estimate attributes its data source — PMJAY package rates, public tariff data, NHA studies. Synthetic data is always clearly labeled.',
    color: 'text-warning bg-amber-50',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-bg-main pt-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary py-16 sm:py-20">
        <div className="page-container text-center text-white">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold mb-4">About HealthAssist</h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Democratizing healthcare cost information for 140 crore Indians — 
            with transparency, accountability, and Responsible AI at our core.
          </p>
        </div>
      </div>

      <div className="page-container py-12 pb-32 lg:pb-12 space-y-16">

        {/* Mission */}
        <section aria-label="Our mission">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-6">Our Mission</h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              In India, 50 crore people don't know the cost of a hospital visit before they go. 
              The same procedure can cost 3–10x more at different hospitals in the same city. 
              68 crore PMJAY-eligible citizens don't know they're covered.
            </p>
            <p className="text-text-secondary text-lg leading-relaxed mt-4">
              HealthAssist exists to close this information gap — giving every Indian the ability to make 
              informed decisions about their healthcare, in their own language, before they step foot in a hospital.
            </p>
          </div>
        </section>

        {/* Responsible AI */}
        <section aria-label="Responsible AI principles">
          <h2 className="font-display text-3xl font-bold text-text-primary mb-8 text-center">
            Our Responsible AI Pledge
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PRINCIPLES.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="bg-bg-card rounded-lg border border-border shadow-card p-6 card-hover">
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-text-primary text-lg mb-2">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section aria-label="Data sources">
          <div className="bg-bg-card rounded-lg border border-border shadow-card p-8">
            <h2 className="font-display text-2xl font-bold text-text-primary mb-6">Data Sources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { source: 'National Health Authority', desc: 'PMJAY package rates and hospital empanelment data', link: 'https://nha.gov.in' },
                { source: 'NABH Registry', desc: 'Accreditation status of hospitals across India', link: 'https://nabh.co' },
                { source: 'Ministry of Health', desc: 'Public health facility data and costing studies', link: 'https://mohfw.gov.in' },
                { source: 'Jan Aushadhi', desc: 'Generic medicine prices and Kendra locations', link: 'https://janaushadhi.gov.in' },
                { source: 'NHA Costing Studies', desc: 'Procedure-level cost estimates from national surveys', link: '#' },
                { source: 'Community Pricing Data', desc: 'Crowdsourced, anonymized hospital bill data', link: '#' },
              ].map(({ source, desc, link }) => (
                <div key={source} className="flex items-start gap-3 p-3 bg-bg-main rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary text-sm flex items-center gap-1 hover:text-primary transition-colors">
                      {source} <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full disclaimer */}
        <section aria-label="Full disclaimer">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-8">
            <h2 className="font-display text-xl font-bold text-amber-800 mb-4">⚠️ Full Platform Disclaimer</h2>
            <div className="space-y-3 text-sm text-amber-800">
              <p>HealthAssist Healthcare Navigator is a healthcare information and planning tool. It is <strong>NOT</strong> a medical device, diagnostic tool, or substitute for professional medical advice.</p>
              <p>All cost estimates are indicative ranges based on aggregated public data. Actual costs may differ significantly based on the specific clinical situation, hospital, doctor, implant/stent type, insurance coverage, and other factors.</p>
              <p>Hospital rankings are based on publicly available signals and do not constitute an endorsement of any hospital or healthcare provider.</p>
              <p>PMJAY eligibility checks are indicative only. Official eligibility must be verified at pmjay.gov.in.</p>
              <p>In case of a medical emergency, call <strong>112</strong> immediately and go to the nearest emergency room.</p>
              <p className="font-semibold">By using HealthAssist, you acknowledge that this is a planning tool only, and agree to verify all information directly with healthcare providers before making any medical decisions.</p>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
