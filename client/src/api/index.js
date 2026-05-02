/**
 * HealthAssist — API Client
 * All calls proxy through Vite's /api → http://localhost:8000
 * Adapts backend response shapes to frontend-expected formats.
 */

import axios from 'axios';

// All calls go through Vite proxy: /api → http://localhost:8000
// (no rewrite — backend routes are already /api/v1/...)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — logging ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.debug(`[HealthAssist API] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// ── Response interceptor — error normalizer ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail?.[0]?.msg ||
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
  }
);

// ── Adapters: Transform backend shapes → frontend shapes ─────────────────────

/**
 * Adapt a single hospital from backend (SearchResponse.hospitals[]) to
 * the shape the HospitalCard / Results page expects.
 */
function adaptHospital(h) {
  const sb = h.score_breakdown || {};
  return {
    id: h.id,
    name: h.name,
    address: h.address,
    city: h.city,
    state: h.state || '',
    lat: h.lat,
    lng: h.lng,
    type: h.hospital_type || 'private',
    tier: h.tier || 'mid',
    accreditations: Array.isArray(h.accreditation) ? h.accreditation : (h.accreditation ? [h.accreditation] : []),
    totalBeds: h.total_beds,
    icuBeds: h.icu_beds,
    rating: h.rating || h.google_rating || 0,
    reviewCount: h.review_count || 0,
    distance: h.distance_km,
    distanceLabel: h.distance_km != null ? `${h.distance_km.toFixed(1)} km` : null,
    acceptsPMJAY: h.accepts_pmjay,
    emergencyServices: h.emergency_services,
    phone: h.phone,
    website: h.website,
    specializations: h.specializations || [],
    proceduresOffered: h.procedures_offered || [],
    rank: h.rank || 0,
    scoreBreakdown: {
      clinical: sb.clinical ?? 0,
      reputation: sb.reputation ?? 0,
      accessibility: sb.accessibility ?? 0,
      affordability: sb.affordability ?? 0,
      overall: sb.overall ?? 0,
    },
    costRange: {
      min: h.cost_range?.min_amount ?? 0,
      max: h.cost_range?.max_amount ?? 0,
    },
  };
}

/**
 * Adapt CostEstimate from backend → CostEstimatePanel expected shape
 */
function adaptCostEstimate(cost) {
  if (!cost) return null;
  return {
    totalMin: cost.total_min,
    totalMax: cost.total_max,
    confidence: cost.confidence,
    disclaimer: cost.disclaimer,
    syntheticDataUsed: cost.synthetic_data_used,
    dataSources: cost.data_sources || [],
    riskFlags: cost.risk_flags || [],
    components: (cost.components || []).map((c) => ({
      name: c.name,
      min: c.min_amount,
      max: c.max_amount,
      notes: c.notes,
    })),
    pmjayEligible: true, // Show banner by default; check via /pmjay-check
    generatedAt: cost.generated_at,
  };
}

// ═══════════════════════════════════════════════════════════
// SEARCH  —  POST /api/v1/search
// ═══════════════════════════════════════════════════════════

export async function searchHospitals({ query, location, radius, filters }) {
  // Resolve location: both pincode and city name go into location.pincode
  // (backend accepts 6-digit numerics OR city names in the same field)
  let locationPayload = undefined;
  if (location && !location.includes('My Location')) {
    const trimmed = location.trim();
    if (trimmed.length >= 2) {
      locationPayload = { pincode: trimmed };  // backend accepts pincode OR city name here
    }
  }

  // When using city/pincode (no GPS coords), set radius high so the backend
  // skips the distance filter and returns all matched-city hospitals.
  const effectiveRadius = locationPayload ? 999 : (radius || 999);

  // Budget conversion
  const budgetMap = {
    '0_50k':  { min: 0,       max: 50_000 },
    '50k_2L': { min: 50_000,  max: 200_000 },
    '2L_5L':  { min: 200_000, max: 500_000 },
    '5L_plus':{ min: 500_000, max: null },
  };
  const budgetRange = budgetMap[filters?.budgetRange] || null;

  const payload = {
    query,
    language: 'en',
    location: locationPayload,
    radius_km: effectiveRadius,
    hospital_type: filters?.hospitalType || 'both',
    patient_age: filters?.patientAge ? parseInt(filters.patientAge) : undefined,
    comorbidities: Array.isArray(filters?.comorbidities)
      ? filters.comorbidities.map((c) => c.toLowerCase())
      : [],
    budget_min: budgetRange?.min,
    budget_max: budgetRange?.max,
    accreditation_filter: filters?.accreditation !== 'any' ? filters?.accreditation : undefined,
  };

  const { data } = await api.post('/api/v1/search', payload);

  // Adapt backend response → frontend shape
  const hospitals = (data.hospitals || []).map((h, idx) => ({
    ...adaptHospital(h),
    rank: idx + 1,  // Assign rank by position (backend already sorted best-first)
  }));
  return {
    query_id: data.query_id,
    query,
    location: location || '',
    total: hospitals.length,
    hospitals,
    costEstimate: adaptCostEstimate(data.cost_estimate),
    emergencyAlert: data.emergency_alert || null,
    parsedIntent: data.parsed_intent || {},
    pmjayPrompt: data.pmjay_prompt || false,
    dataConfidence: data.data_confidence || 0,
    disclaimer: data.disclaimer,
  };
}

// ═══════════════════════════════════════════════════════════
// HOSPITALS  —  GET /api/v1/hospitals
// ═══════════════════════════════════════════════════════════

export async function getHospitalById(id) {
  const { data } = await api.get(`/api/v1/hospitals/${id}`);
  return adaptHospital(data);
}

export async function listHospitals({ city, hospitalType, acceptsPmjay, page = 1, perPage = 10 } = {}) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (hospitalType && hospitalType !== 'both') params.set('hospital_type', hospitalType);
  if (acceptsPmjay != null) params.set('accepts_pmjay', acceptsPmjay);
  params.set('page', page);
  params.set('per_page', perPage);
  const { data } = await api.get(`/api/v1/hospitals?${params}`);
  return { ...data, hospitals: (data.hospitals || []).map(adaptHospital) };
}

// ═══════════════════════════════════════════════════════════
// COST ESTIMATE  —  POST /api/v1/cost-estimate
// ═══════════════════════════════════════════════════════════

export async function getCostEstimate({ procedureName, hospitalTier, city, patientAge, comorbidities, roomPreference }) {
  const { data } = await api.post('/api/v1/cost-estimate', {
    procedure_name: procedureName,
    hospital_tier: hospitalTier || 'mid',
    city: city || 'Pune',
    patient_age: patientAge || 40,
    comorbidities: comorbidities || [],
    room_preference: roomPreference || 'general',
  });
  return adaptCostEstimate(data);
}

// ═══════════════════════════════════════════════════════════
// PMJAY  —  POST /api/v1/pmjay-check
// ═══════════════════════════════════════════════════════════

export async function checkPMJAYEligibility(formData) {
  const { state, annualIncome, rationCardType, familySize } = formData;

  // Convert frontend income options to numbers
  const incomeMap = {
    below_1L: 80_000,
    '1L_2L':  150_000,
    '2L_3L':  250_000,
    above_3L: 500_000,
  };
  const incomeNum = typeof annualIncome === 'number'
    ? annualIncome
    : (incomeMap[annualIncome] ?? 250_000);

  const { data } = await api.post('/api/v1/pmjay-check', {
    state: state || 'Maharashtra',
    annual_income: incomeNum,
    ration_card_type: rationCardType || 'APL',
    family_size: familySize || 4,
  });

  // Adapt to frontend-expected shape
  const isEligible = data.likely_eligible;
  return {
    status: isEligible ? 'eligible' : 'not_eligible',
    message: isEligible ? 'Likely Eligible' : 'Not Likely Eligible',
    coverage: data.coverage_amount,
    proceduresCovered: data.procedures_covered,
    nextSteps: data.next_steps || [],
    alternativeSchemes: !isEligible
      ? ['Central Government Health Scheme (CGHS)', 'ESI — Employee State Insurance', 'State Health Scheme']
      : [],
    eligibilityReason: data.eligibility_reason,
    officialPortal: data.official_portal,
    helpline: data.helpline,
    disclaimer: data.disclaimer,
    // Raw for full display
    raw: data,
  };
}

// ═══════════════════════════════════════════════════════════
// DRUGS  —  GET /api/v1/drugs/compare
// ═══════════════════════════════════════════════════════════

export async function searchDrugs(query) {
  if (!query || query.trim().length < 2) {
    // Return a default set for empty query
    return _getDefaultDrugs();
  }
  try {
    const { data } = await api.get(`/api/v1/drugs/compare?name=${encodeURIComponent(query.trim())}`);
    return _adaptDrugComparison(data);
  } catch (err) {
    if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Drug')) return [];
    throw err;
  }
}

export async function getDrugComparator() {
  return _getDefaultDrugs();
}

// ── Drug adapters ─────────────────────────────────────────────────────────────

const DEFAULT_DRUG_NAMES = [
  'atorvastatin', 'metformin', 'amlodipine', 'pantoprazole',
  'paracetamol', 'aspirin', 'ibuprofen', 'cetirizine',
  'amoxicillin', 'azithromycin', 'omeprazole', 'ramipril',
];

async function _getDefaultDrugs() {
  const results = await Promise.allSettled(
    DEFAULT_DRUG_NAMES.map((name) => api.get(`/api/v1/drugs/compare?name=${name}`))
  );
  const drugs = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const adapted = _adaptDrugComparison(r.value.data);
      drugs.push(...adapted);
    }
  });
  return drugs;
}

let _drugIdCounter = 1;

function _adaptDrugComparison(data) {
  // data: { brand_drug, molecule, strength, brand_variants[], generic_variants[], potential_savings_pct }
  const brandVariants = data.brand_variants || [];
  const genericVariants = data.generic_variants || [];

  if (!brandVariants.length || !genericVariants.length) return [];

  // Pick the best generic: Jan Aushadhi first, then cheapest
  const bestGeneric =
    genericVariants.find((v) => v.available_jan_aushadhi) ||
    [...genericVariants].sort((a, b) => a.price_per_unit - b.price_per_unit)[0];

  const savings = Math.round(data.potential_savings_pct || 0);

  // Check if ANY generic is available online (non-JA generics are available online)
  const hasOnlineGeneric = genericVariants.some((v) => !v.available_jan_aushadhi);
  // Check if available at Jan Aushadhi
  const hasJanAushadhi = genericVariants.some((v) => v.available_jan_aushadhi);

  // Return one row per brand variant for richer display
  return brandVariants.map((bv, idx) => ({
    id: `drug-${data.molecule?.replace(/\s+/g, '-').toLowerCase()}-${idx}`,
    brand: bv.name,
    generic: data.molecule,
    genericManufacturer: bestGeneric.manufacturer,
    manufacturer: bv.manufacturer,
    brandPrice: bv.price_per_unit,
    genericPrice: bestGeneric.price_per_unit,
    brandUnit: `per ${bv.unit}`,
    genericUnit: `per ${bestGeneric.unit}`,
    savings,
    category: data.molecule?.split(' ')?.[0] || 'Medicine',
    janAushadhi: hasJanAushadhi,
    onlineAvailable: hasOnlineGeneric,
    localChemist: true, // generics always available at local chemists
    prescription: false,
    strength: data.strength,
    allBrandVariants: brandVariants,
    allGenericVariants: genericVariants,
  }));
}

// ═══════════════════════════════════════════════════════════
// TRIAGE  —  POST /api/v1/triage
// ═══════════════════════════════════════════════════════════

export async function checkTriage(symptoms, severity = 'moderate') {
  const { data } = await api.post('/api/v1/triage', {
    symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
    severity,
  });
  return data;
}

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK  —  GET /health
// ═══════════════════════════════════════════════════════════

export async function getServerHealth() {
  const { data } = await api.get('/health');
  return data;
}

export default api;
