import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, TrendingDown, ExternalLink, Info, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { searchDrugs, getDrugComparator } from '../api/index';
import Footer from '../components/common/Footer';

const POPULAR_SEARCHES = ['atorvastatin', 'metformin', 'amlodipine', 'pantoprazole', 'aspirin', 'paracetamol', 'omeprazole'];
const FILTER_OPTIONS = ['All', 'Jan Aushadhi', 'Online Pharmacy', 'Local Chemist'];

function SavingsBadge({ savings }) {
  const color =
    savings >= 75 ? 'bg-green-100 text-green-700' :
    savings >= 50 ? 'bg-secondary/15 text-secondary-dark' :
    'bg-amber-100 text-amber-700';
  return (
    <span className={`text-sm font-bold px-3 py-1 rounded-pill ${color} flex items-center gap-1`}>
      <TrendingDown className="w-3.5 h-3.5" />
      {savings}% saved
    </span>
  );
}

function DrugRow({ drug }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-bg-main transition-colors">
        <td className="px-4 py-4">
          <div>
            <p className="font-semibold text-text-primary">{drug.brand}</p>
            <span className="text-xs text-text-secondary">{drug.category}</span>
            {drug.strength && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {drug.strength}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-sm text-text-secondary">{drug.manufacturer}</td>
        <td className="px-4 py-4">
          <p className="cost-figure font-bold text-text-primary">₹{drug.brandPrice}</p>
          <p className="text-xs text-text-secondary">{drug.brandUnit}</p>
        </td>
        <td className="px-4 py-4">
          <p className="font-semibold text-secondary">{drug.generic}</p>
          <p className="text-xs text-text-secondary">{drug.genericManufacturer}</p>
        </td>
        <td className="px-4 py-4">
          <p className="cost-figure font-bold text-success">₹{drug.genericPrice}</p>
          <p className="text-xs text-text-secondary">{drug.genericUnit}</p>
        </td>
        <td className="px-4 py-4">
          <SavingsBadge savings={drug.savings} />
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-col gap-1">
            {drug.janAushadhi && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-center">
                🏪 Jan Aushadhi
              </span>
            )}
            {drug.onlineAvailable && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-center">
                🌐 Online
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4">
          {drug.allGenericVariants?.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1"
            >
              {drug.allGenericVariants.length} options
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </td>
      </tr>
      {expanded && drug.allGenericVariants?.slice(1).map((v, i) => (
        <tr key={i} className="bg-green-50/50 border-b border-green-100">
          <td colSpan={3} className="px-6 py-2 text-xs text-text-secondary">
            Alternative option {i + 2}
          </td>
          <td className="px-4 py-2">
            <p className="text-sm font-semibold text-secondary">{v.name}</p>
            <p className="text-xs text-text-secondary">{v.manufacturer}</p>
          </td>
          <td className="px-4 py-2">
            <p className="text-sm font-bold text-success">₹{v.price_per_unit}</p>
            <p className="text-xs text-text-secondary">per {v.unit}</p>
          </td>
          <td className="px-4 py-2">
            <SavingsBadge savings={drug.savings} />
          </td>
          <td className="px-4 py-2">
            {v.available_jan_aushadhi && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🏪 JA</span>
            )}
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export default function DrugComparator() {
  const [query, setQuery]     = useState('');
  const [drugs, setDrugs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('All');
  const debounceRef = useRef(null);

  const loadDrugs = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const results = q.trim().length >= 2
        ? await searchDrugs(q)
        : await getDrugComparator();
      setDrugs(results);
    } catch (err) {
      setError('Could not load drug data. Make sure the backend server is running.');
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load defaults on mount
  useEffect(() => {
    loadDrugs('');
  }, [loadDrugs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadDrugs(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, loadDrugs]);

  const filteredDrugs = filter === 'Jan Aushadhi'
    ? drugs.filter(d => d.janAushadhi)
    : filter === 'Online Pharmacy'
    ? drugs.filter(d => d.onlineAvailable)
    : filter === 'Local Chemist'
    ? drugs.filter(d => d.localChemist)
    : drugs;

  const avgSavings = drugs.length
    ? Math.round(drugs.reduce((acc, d) => acc + d.savings, 0) / drugs.length)
    : 0;

  return (
    <div className="min-h-screen bg-bg-main pt-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/10 to-primary/10 py-10 sm:py-14">
        <div className="page-container text-center">
          <div className="text-5xl mb-4">💊</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Generic Drug Comparator
          </h1>
          <p className="text-text-secondary text-base max-w-xl mx-auto">
            Search brand medicines — we'll show you generic alternatives from Jan Aushadhi and other sources.
            Save 60–80% with the same active ingredients.
          </p>
        </div>
      </div>

      <div className="page-container py-8 pb-32 lg:pb-8">

        {/* Stats banner */}
        <div className="bg-gradient-to-r from-secondary to-green-500 rounded-lg p-5 text-white mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-extrabold">{avgSavings}% Average Savings</p>
            <p className="text-white/80 text-sm mt-0.5">Switch to generics — same efficacy, fraction of the cost</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-extrabold">{drugs.length}</p>
            <p className="text-white/80 text-xs">results loaded</p>
          </div>
          <a
            href="https://janaushadhi.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white text-secondary font-bold px-4 py-2.5 rounded-pill text-sm hover:shadow-lg transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Find Jan Aushadhi Kendra
          </a>
        </div>

        {/* Search box */}
        <div className="bg-white rounded-lg border border-border shadow-card focus-within:border-primary focus-within:shadow-card-hover transition-all duration-300 mb-4">
          <div className="flex items-center p-3 gap-2">
            <Search className="w-5 h-5 text-text-secondary flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by drug name, generic name, or category — e.g. 'Ecosprin', 'metformin', 'statin'..."
              className="flex-1 border-0 outline-none text-text-primary text-base placeholder-text-secondary bg-transparent"
              aria-label="Drug search"
              id="drug-search-input"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            )}
          </div>
        </div>

        {/* Popular searches */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-text-secondary self-center">Popular:</span>
          {POPULAR_SEARCHES.map(s => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className={`text-sm px-3 py-1.5 rounded-pill font-medium border transition-all ${
                query.toLowerCase() === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-text-secondary self-center">Filter:</span>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`text-sm px-4 py-2 rounded-pill font-medium border transition-all ${
                filter === opt
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
              }`}
              aria-pressed={filter === opt}
            >
              {opt === 'Jan Aushadhi' && '🏪 '}{opt}
            </button>
          ))}
          <button
            onClick={() => loadDrugs(query)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-pill border border-border text-text-secondary hover:border-primary hover:text-primary transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Could not load data</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-lg shimmer" />
            ))}
          </div>
        )}

        {/* Drug table */}
        {!loading && !error && (
          <div className="bg-bg-card rounded-lg border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" aria-label="Drug comparison table">
                <thead className="bg-bg-main border-b border-border">
                  <tr>
                    {['Brand Name', 'Manufacturer', 'Brand Price', 'Generic Alternative', 'Generic Price', 'Savings', 'Availability', ''].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDrugs.map((drug) => (
                    <DrugRow key={drug.id} drug={drug} />
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDrugs.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">🔍</p>
                <p className="font-semibold text-text-primary">No drugs found</p>
                <p className="text-text-secondary text-sm mt-1">
                  Try searching for: atorvastatin, metformin, amlodipine, pantoprazole
                </p>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p><strong>Important:</strong> Always consult your doctor or pharmacist before switching from a brand to a generic medicine.</p>
            <p>Generic medicines contain the same active ingredients in the same dosage but may differ in inactive ingredients.</p>
            <p>Prices are indicative and may vary. Jan Aushadhi Kendras typically offer the lowest prices.</p>
          </div>
        </div>

        {/* Jan Aushadhi info */}
        <div className="mt-4 bg-secondary/10 border border-secondary/20 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-secondary mb-1">About Jan Aushadhi Kendras</p>
              <p className="text-sm text-text-secondary">
                Jan Aushadhi Kendras are government-run pharmacies providing high-quality generic medicines at affordable prices.
                Over 9,500 kendras are operational across India.
                <a href="https://janaushadhi.gov.in" target="_blank" rel="noopener noreferrer" className="text-secondary font-medium hover:underline ml-1">
                  Find nearest kendra →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
