import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, Mic, MapPin, SlidersHorizontal, 
  ChevronDown, ChevronUp, Navigation, X, AlertTriangle
} from 'lucide-react';
import { detectEmergency } from '../utils/emergencyKeywords';
import { useApp } from '../context/AppContext';
import { searchHospitals } from '../api/index';
import Footer from '../components/common/Footer';

const MAX_CHARS = 500;

const BUDGET_OPTIONS = [
  { label: '₹0 – ₹50K', value: '0_50k' },
  { label: '₹50K – ₹2L', value: '50k_2L' },
  { label: '₹2L – ₹5L', value: '2L_5L' },
  { label: '₹5L+', value: '5L_plus' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50];

const QUICK_CHIPS = [
  'Knee Replacement', 'Angioplasty', 'Cataract Surgery', 
  'Dialysis', 'Chemotherapy', 'C-Section', 
  'Appendectomy', 'Hip Replacement', 'Gallbladder Removal'
];

const COMORBIDITIES = ['Diabetes', 'Hypertension', 'Cardiac History', 'Kidney Disease', 'Asthma'];

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch, addToast } = useApp();
  
  const [query, setQuery] = useState(state.searchQuery || '');
  const [location, setLocation] = useState(state.searchLocation || '');
  const [radius, setRadius] = useState(state.searchRadius || 25);
  const [showFilters, setShowFilters] = useState(false);
  const [budget, setBudget] = useState(null);
  const [age, setAge] = useState('');
  const [comorbidities, setComorbidities] = useState([]);
  const [hospitalType, setHospitalType] = useState('both');
  const [accreditation, setAccreditation] = useState('any');
  const [isEmergencyDetected, setIsEmergencyDetected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Emergency detection on query change
  useEffect(() => {
    const emergency = detectEmergency(query);
    setIsEmergencyDetected(emergency);
    dispatch({ type: 'SET_EMERGENCY', payload: emergency });
  }, [query, dispatch]);

  // Voice input
  const startVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addToast({ type: 'warning', message: 'Voice input is not supported in your browser', duration: 3000 });
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery(prev => (prev ? `${prev} ${transcript}` : transcript).slice(0, MAX_CHARS));
    };
    recognition.onerror = () => {
      setIsListening(false);
      addToast({ type: 'error', message: 'Voice input failed. Please try again.', duration: 3000 });
    };
    recognition.start();
    recognitionRef.current = recognition;
  }, [addToast]);

  // Geolocation
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      addToast({ type: 'warning', message: 'Location not supported', duration: 3000 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation('My Location (Detected)');
        addToast({ type: 'success', title: 'Location detected', message: 'Using your current location', duration: 2000 });
      },
      () => {
        addToast({ type: 'error', message: 'Could not detect location. Please enter manually.', duration: 3000 });
      }
    );
  }, [addToast]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    
    if (isEmergencyDetected) {
      addToast({ type: 'error', title: 'Emergency Detected', message: 'Please call 112 immediately!', duration: 5000 });
      return;
    }

    if (!query.trim()) {
      addToast({ type: 'warning', message: 'Please describe your condition or procedure', duration: 3000 });
      inputRef.current?.focus();
      return;
    }

    setIsSearching(true);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    dispatch({ type: 'SET_LOCATION', payload: location });

    try {
      const results = await searchHospitals({
        query,
        location,
        radius,
        filters: { budgetRange: budget, patientAge: age, comorbidities, hospitalType, accreditation },
      });
      dispatch({ type: 'SET_RESULTS', payload: results });
      addToast({ type: 'success', title: 'Results ready', message: `Found ${results.total} hospitals`, duration: 3000 });
      navigate('/results');
    } catch (err) {
      addToast({ type: 'error', message: 'Search failed. Please try again.', duration: 4000 });
      dispatch({ type: 'SET_LOADING', payload: false });
    } finally {
      setIsSearching(false);
    }
  };

  const handleChip = (chip) => {
    setQuery(chip);
    inputRef.current?.focus();
  };

  const toggleComorbidity = (c) => {
    setComorbidities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  return (
    <div className="min-h-screen bg-bg-main pt-16">
      {/* Page header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent py-10 sm:py-14">
        <div className="page-container text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Find Your Hospital & Know Your Cost
          </h1>
          <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
            Describe your condition in plain language — we'll find ranked hospitals with transparent cost estimates.
          </p>
        </div>
      </div>

      <div className="page-container pb-32 lg:pb-8">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto" role="search" aria-label="Hospital search form">

          {/* Emergency Banner inline */}
          {isEmergencyDetected && (
            <div className="mb-4 bg-emergency text-white p-4 rounded-lg flex items-start gap-3 emergency-pulse animate-bounce-in">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">⚠️ This sounds like an emergency!</p>
                <p className="text-sm text-red-200 mt-0.5">Please call 112 immediately. Do not proceed with a normal search.</p>
              </div>
              <a href="tel:112" className="flex-shrink-0 bg-white text-emergency font-bold px-4 py-2 rounded-pill text-sm hover:bg-red-50 transition-colors">
                Call 112
              </a>
            </div>
          )}

          {/* Main Search Input */}
          <div className="bg-white rounded-lg border border-border shadow-card focus-within:border-primary focus-within:shadow-card-hover transition-all duration-300 mb-4">
            <div className="flex items-start p-3 gap-2">
              <Search className="w-5 h-5 text-text-secondary mt-1 flex-shrink-0" />
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, MAX_CHARS))}
                placeholder={t('search.placeholder', "Describe your condition or procedure... e.g. 'knee replacement in Pune'")}
                className="flex-1 resize-none border-0 outline-none bg-transparent text-text-primary text-base placeholder-text-secondary min-h-[64px] max-h-32 leading-relaxed font-body"
                rows={2}
                aria-label="Search query"
                id="search-query-input"
              />
              <button
                type="button"
                onClick={startVoice}
                className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                  isListening 
                    ? 'bg-emergency text-white emergency-pulse' 
                    : 'text-text-secondary hover:bg-bg-main hover:text-primary'
                }`}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                title="Voice search"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            {/* Character counter */}
            <div className="px-3 pb-2 flex justify-between items-center">
              <span className="text-xs text-text-secondary">
                {query.length > 0 && `${MAX_CHARS - query.length} characters remaining`}
              </span>
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-xs text-text-secondary hover:text-emergency transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Location input */}
          <div className="bg-white rounded-lg border border-border shadow-card focus-within:border-primary transition-all duration-300 mb-4">
            <div className="flex items-center p-3 gap-2">
              <MapPin className="w-5 h-5 text-text-secondary flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="📍 Enter pincode or city (e.g., 440012 or Nagpur)"
                className="flex-1 border-0 outline-none bg-transparent text-text-primary text-base placeholder-text-secondary font-body"
                aria-label="Location"
                id="search-location-input"
              />
              <button
                type="button"
                onClick={detectLocation}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium px-3 py-1.5 bg-primary/10 rounded-pill transition-colors flex-shrink-0"
                aria-label="Detect my location"
              >
                <Navigation className="w-3 h-3" /> Detect
              </button>
            </div>

            {/* Radius selector */}
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary">Search radius:</span>
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`text-xs px-3 py-1.5 rounded-pill font-medium transition-all duration-200 ${
                    radius === r 
                      ? 'bg-primary text-white' 
                      : 'bg-bg-main text-text-secondary hover:bg-border'
                  }`}
                  aria-pressed={radius === r}
                >
                  {r}km
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRadius(999)}
                className={`text-xs px-3 py-1.5 rounded-pill font-medium transition-all ${
                  radius === 999 ? 'bg-primary text-white' : 'bg-bg-main text-text-secondary hover:bg-border'
                }`}
              >
                Anywhere
              </button>
            </div>
          </div>

          {/* Filters accordion */}
          <div className="bg-white rounded-lg border border-border shadow-card mb-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary hover:bg-bg-main transition-colors"
              aria-expanded={showFilters}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Optional Filters
                {(budget || age || comorbidities.length > 0 || hospitalType !== 'both' || accreditation !== 'any') && (
                  <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFilters && (
              <div className="px-4 pb-4 space-y-4 animate-slide-down border-t border-border pt-4">
                {/* Budget */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Budget Range</label>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBudget(budget === opt.value ? null : opt.value)}
                        className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
                          budget === opt.value 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-border text-text-secondary hover:border-primary/40'
                        }`}
                        aria-pressed={budget === opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label htmlFor="patient-age" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Patient Age</label>
                  <input
                    id="patient-age"
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age (years)"
                    className="border border-border rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-primary bg-transparent"
                  />
                </div>

                {/* Comorbidities */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Comorbidities</label>
                  <div className="flex flex-wrap gap-2">
                    {COMORBIDITIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleComorbidity(c)}
                        className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
                          comorbidities.includes(c) 
                            ? 'border-warning bg-amber-50 text-amber-700' 
                            : 'border-border text-text-secondary hover:border-warning/40'
                        }`}
                        aria-pressed={comorbidities.includes(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hospital Type */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Hospital Type</label>
                  <div className="flex gap-2">
                    {['government', 'private', 'both'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setHospitalType(type)}
                        className={`text-xs px-4 py-2 rounded-lg border font-medium transition-all capitalize ${
                          hospitalType === type 
                            ? 'border-primary bg-primary text-white' 
                            : 'border-border text-text-secondary hover:border-primary/40'
                        }`}
                        aria-pressed={hospitalType === type}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accreditation */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Accreditation</label>
                  <div className="flex gap-2">
                    {['NABH', 'JCI', 'any'].map(acc => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => setAccreditation(acc)}
                        className={`text-xs px-4 py-2 rounded-lg border font-medium transition-all ${
                          accreditation === acc 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-border text-text-secondary hover:border-primary/40'
                        }`}
                        aria-pressed={accreditation === acc}
                      >
                        {acc === 'any' ? 'Any' : acc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={isSearching || isEmergencyDetected}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-pill text-lg font-bold transition-all duration-300 shadow-lg ${
              isEmergencyDetected 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isSearching 
                  ? 'bg-primary/70 text-white cursor-wait'
                  : 'bg-primary text-white hover:bg-primary-dark hover:shadow-xl hover:scale-[1.01]'
            }`}
            id="search-submit-btn"
          >
            {isSearching ? (
              <>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span>Analyzing your query...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                {t('search.button', 'Search')}
              </>
            )}
          </button>

          {/* Quick search chips */}
          <div className="mt-8">
            <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider mb-3">
              {t('search.quick_searches', 'Common Searches')}
            </p>
            <div className="swipe-container flex gap-2 pb-2">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChip(chip)}
                  className="swipe-item flex-shrink-0 text-sm px-4 py-2 bg-white border border-border rounded-pill text-text-primary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Responsible AI note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>🤖 Responsible AI:</strong> HealthAssist provides cost estimates and hospital suggestions to help you plan — not diagnose.
              Results are based on public data signals and may not reflect current availability or pricing. Always consult a qualified healthcare professional.
            </p>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
