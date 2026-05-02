import HeroSection from '../components/landing/HeroSection';
import StatsBar from '../components/landing/StatsBar';
import HowItWorks from '../components/landing/HowItWorks';
import FeatureCards from '../components/landing/FeatureCards';
import Testimonials from '../components/landing/Testimonials';
import Footer from '../components/common/Footer';
import { Link } from 'react-router-dom';
import { Search, Shield } from 'lucide-react';

export default function Landing() {
  return (
    <main>
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <FeatureCards />
      <Testimonials />

      {/* CTA Banner */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary to-secondary" aria-label="Call to action">
        <div className="page-container text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Navigate Your Healthcare?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Join millions of Indians making smarter, more informed healthcare decisions with HealthAssist.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-pill hover:shadow-2xl hover:scale-105 transition-all duration-300"
              id="landing-bottom-cta"
            >
              <Search className="w-5 h-5" />
              Start Free Search
            </Link>
            <Link
              to="/about"
              className="flex items-center justify-center gap-2 border-2 border-white/60 text-white font-bold px-8 py-4 rounded-pill hover:bg-white/10 transition-all duration-300"
            >
              <Shield className="w-5 h-5" />
              Our Responsible AI Pledge
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
