import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit2, SlidersHorizontal, ChevronDown, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import HospitalCard from '../components/results/HospitalCard';
import CostEstimatePanel from '../components/results/CostEstimatePanel';
import { HospitalCardSkeleton, CostPanelSkeleton, TypingIndicator } from '../components/common/LoadingSkeleton';
import ConfidenceScore from '../components/common/ConfidenceScore';
import Footer from '../components/common/Footer';

const SORT_OPTIONS = [
  { value: 'best_match', label: 'Best Match' },
  { value: 'distance',   label: 'Nearest First' },
  { value: 'cost_low',   label: 'Lowest Cost' },
  { value: 'rating',     label: 'Highest Rated' },
];

export default function Results() {
  const { state } = useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab]           = useState('hospitals');
  const [sortBy, setSortBy]                 = useState('best_match');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showSort, setShowSort]             = useState(false);

  // Redirect if no results
  useEffect(() => {
    if (!state.isLoading && !state.results) navigate('/search');
  }, [state.results, state.isLoading, navigate]);

  const results  = state.results;
  const costData = results?.costEstimate;

  // Emergency banner from real API
  const emergencyAlert = results?.emergencyAlert;

  const sortedHospitals = results?.hospitals
    ? [...results.hospitals].sort((a, b) => {
        switch (sortBy) {
          case 'distance': return (a.distance ?? 999) - (b.distance ?? 999);
          case 'cost_low': return (a.costRange?.min ?? 0) - (b.costRange?.min ?? 0);
          case 'rating':   return (b.rating ?? 0) - (a.rating ?? 0);
          default:         return (a.rank ?? 0) - (b.rank ?? 0);
        }
      })
    : [];

  return (
    <div className="min-h-screen bg-bg-main pt-16">

      {/* Emergency alert from backend */}
      {emergencyAlert && (
        <div className="bg-emergency text-white px-4 py-3 flex items-center gap-3 emergency-pulse">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{emergencyAlert.action || '⚠️ Emergency Detected'}</p>
            <p className="text-sm text-red-200">
              Call <strong>{emergencyAlert.helpline_national}</strong> immediately.
              {emergencyAlert.helpline_aiims && ` AIIMS: ${emergencyAlert.helpline_aiims}`}
            </p>
          </div>
          <a href="tel:112" className="flex-shrink-0 bg-white text-emergency font-bold px-4 py-2 rounded-pill text-sm">
            Call 112
          </a>
        </div>
      )}

      {/* Sticky results header */}
      <div className="bg-white border-b border-border sticky top-16 z-30 shadow-sm">
        <div className="page-container py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-text-primary text-base">
                  {state.searchQuery || 'Healthcare Search'}
                  {state.searchLocation && ` · ${state.searchLocation}`}
                </h1>
                {results?.parsedIntent?.procedure_category && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {results.parsedIntent.procedure_category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-text-secondary">
                  Showing <strong>{sortedHospitals.length}</strong> hospitals
                </span>
                {results?.dataConfidence != null && (
                  <ConfidenceScore value={results.dataConfidence} size="sm" showLabel={false} />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSort(!showSort)}
                  className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-bg-main transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSort && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-border rounded-lg shadow-card-hover z-10 overflow-hidden animate-slide-down">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors ${
                          sortBy === opt.value ? 'text-primary font-semibold bg-primary/5' : 'text-text-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link
                to="/search"
                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary-dark transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Search
              </Link>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="flex lg:hidden border border-border rounded-lg overflow-hidden mt-3 bg-bg-main">
            {['hospitals', 'cost'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all capitalize ${
                  activeTab === tab ? 'bg-primary text-white' : 'text-text-secondary hover:text-primary'
                }`}
                aria-pressed={activeTab === tab}
              >
                {tab === 'hospitals' ? `🏥 Hospitals (${sortedHospitals.length})` : '💰 Cost Estimate'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="page-container py-6 pb-32 lg:pb-8">

        {/* PMJAY banner */}
        {results?.pmjayPrompt && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-secondary text-sm">Some hospitals here accept PMJAY</p>
                <p className="text-xs text-secondary/70 mt-0.5">Ayushman Bharat covers up to ₹5 lakh per family per year</p>
              </div>
            </div>
            <Link
              to="/pmjay-check"
              className="flex-shrink-0 bg-secondary text-white font-semibold px-4 py-2 rounded-pill text-sm hover:bg-secondary-dark transition-colors"
              id="results-pmjay-banner-btn"
            >
              Check Eligibility →
            </Link>
          </div>
        )}

        {/* Intent context card */}
        {results?.parsedIntent?.procedure_category && !state.isLoading && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">AI understood: </span>
              {results.parsedIntent.procedure_category}
              {results.parsedIntent.body_system && ` (${results.parsedIntent.body_system})`}
              {results.parsedIntent.urgency_level && ` · Urgency: ${results.parsedIntent.urgency_level}`}
            </p>
          </div>
        )}

        {/* Loading state */}
        {state.isLoading && (
          <div className="space-y-4">
            <TypingIndicator />
            {[1, 2, 3].map(i => <HospitalCardSkeleton key={i} />)}
          </div>
        )}

        {/* Results layout */}
        {!state.isLoading && results && (
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Hospital list — 60% */}
            <div className={`lg:w-3/5 space-y-4 ${activeTab === 'cost' ? 'hidden lg:block' : ''}`}>
              {sortedHospitals.map(hospital => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  isSelected={selectedHospital === hospital.id}
                  onSelect={setSelectedHospital}
                />
              ))}
              {sortedHospitals.length === 0 && (
                <div className="text-center py-16 bg-white rounded-lg border border-border">
                  <p className="text-4xl mb-3">🏥</p>
                  <p className="font-semibold text-text-primary mb-1">No hospitals found</p>
                  <p className="text-text-secondary text-sm">Try expanding your radius or changing filters.</p>
                </div>
              )}
              <div className="text-center pt-4">
                <p className="text-xs text-text-secondary">
                  ℹ️ Ranking based on clinical signals, reputation, accessibility, and affordability scores.
                  Not an endorsement — always verify before booking.
                </p>
                {results.disclaimer && (
                  <p className="text-xs text-amber-600 mt-2 max-w-lg mx-auto">{results.disclaimer}</p>
                )}
              </div>
            </div>

            {/* Cost panel — 40% sticky */}
            <div className={`lg:w-2/5 ${activeTab === 'hospitals' ? 'hidden lg:block' : ''}`}>
              <div className="lg:sticky lg:top-36">
                {costData ? (
                  <CostEstimatePanel costData={costData} />
                ) : (
                  <CostPanelSkeleton />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
