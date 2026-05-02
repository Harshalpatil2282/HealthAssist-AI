import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Phone, ExternalLink, ChevronLeft,
  CheckCircle, AlertTriangle, Stethoscope,
  Building2, Shield, Bed, Activity, Users
} from 'lucide-react';
import { getHospitalById } from '../api/index';
import { HospitalCardSkeleton } from '../components/common/LoadingSkeleton';
import Footer from '../components/common/Footer';

function StarRating({ rating, size = 'sm' }) {
  const filled = Math.round(rating || 0);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} ${i < filled ? 'text-amber-400' : 'text-gray-200'}`}
          fill={i < filled ? '#FBB724' : 'none'}
        />
      ))}
    </div>
  );
}

function Badge({ children, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-pill font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function ScoreBar({ label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-bold text-text-primary">{value?.toFixed(1) ?? '—'}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Derive procedure costs from the CGHS benchmark data on the frontend
const PROCEDURE_COST_HINTS = {
  'Coronary Angioplasty': { min: 150000, max: 250000 },
  'CABG': { min: 250000, max: 400000 },
  'Total Knee Arthroplasty': { min: 150000, max: 280000 },
  'Hip Replacement': { min: 160000, max: 300000 },
  'Cataract Surgery': { min: 15000, max: 50000 },
  'Caesarean Section': { min: 50000, max: 120000 },
  'Appendectomy': { min: 40000, max: 80000 },
  'Laparoscopic Cholecystectomy': { min: 40000, max: 90000 },
  'Hernia Repair': { min: 30000, max: 70000 },
  'Stroke Management': { min: 50000, max: 150000 },
  'Chemotherapy': { min: 15000, max: 50000 },
  'Normal Delivery': { min: 20000, max: 60000 },
  'Fracture Management': { min: 20000, max: 60000 },
  'Kidney Stone Treatment': { min: 50000, max: 120000 },
  'Spine Surgery': { min: 200000, max: 500000 },
  'Robotic Surgery': { min: 300000, max: 700000 },
  'Bone Marrow Transplant': { min: 800000, max: 2000000 },
  'Neurosurgery': { min: 300000, max: 800000 },
  'Kidney Transplant': { min: 500000, max: 1200000 },
  'Liver Transplant': { min: 1000000, max: 2500000 },
  'Radiotherapy': { min: 50000, max: 150000 },
  'Immunotherapy': { min: 100000, max: 500000 },
  'Dialysis (per session)': { min: 800, max: 2000 },
};

function formatINR(amount) {
  if (!amount && amount !== 0) return '—';
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export default function HospitalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) { setError('No hospital ID'); setLoading(false); return; }
    getHospitalById(id)
      .then(data => setHospital(data))
      .catch((err) => setError(err?.message || 'Hospital not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main pt-16">
        <div className="page-container py-8 space-y-4">
          <div className="h-8 w-40 rounded shimmer" />
          <HospitalCardSkeleton />
          <HospitalCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-bg-main pt-16 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-5xl mb-4">🏥</p>
          <p className="text-2xl font-bold text-text-primary mb-2">Hospital not found</p>
          <p className="text-text-secondary mb-6">{error || 'The hospital data could not be loaded.'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(-1)} className="btn-secondary">← Go Back</button>
            <Link to="/search" className="btn-primary">New Search</Link>
          </div>
        </div>
      </div>
    );
  }

  const accreditations = hospital.accreditations || hospital.accreditation || [];
  const specializations = hospital.specializations || [];
  const proceduresOffered = hospital.proceduresOffered || hospital.procedures_offered || [];
  const scoreBreakdown = hospital.scoreBreakdown || {};
  const tierLabel = { premium: 'Premium', mid: 'Mid-Range', budget: 'Budget / Govt' }[hospital.tier] || hospital.tier;
  const typeColor = hospital.type === 'government' ? 'green' : hospital.type === 'trust' ? 'purple' : 'blue';

  // Map lat/lng from backend fields
  const lat = hospital.lat;
  const lng = hospital.lng;
  const hasMap = lat && lng;

  return (
    <div className="min-h-screen bg-bg-main pt-16">
      {/* Back button bar */}
      <div className="bg-white border-b border-border">
        <div className="page-container py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
            id="detail-back-btn"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Results
          </button>
          <span className="text-border">|</span>
          <span className="text-xs text-text-secondary truncate">{hospital.name}</span>
        </div>
      </div>

      <div className="page-container py-6 pb-32 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left / Main ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hospital Header Card */}
            <div className="bg-bg-card rounded-xl border border-border shadow-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl">
                  🏥
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-2xl font-bold text-text-primary mb-1 truncate">{hospital.name}</h1>
                  <div className="flex items-center gap-1.5 text-text-secondary mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{hospital.address}{hospital.city ? `, ${hospital.city}` : ''}</span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {accreditations.map(acc => (
                      <Badge key={acc} color="primary">
                        <Shield className="w-3 h-3" /> {acc}
                      </Badge>
                    ))}
                    <Badge color={typeColor}>
                      <Building2 className="w-3 h-3" /> {hospital.type || 'Private'}
                    </Badge>
                    <Badge color="amber">
                      {tierLabel}
                    </Badge>
                    {hospital.acceptsPMJAY && (
                      <Badge color="green">
                        <CheckCircle className="w-3 h-3" /> PMJAY Accepted
                      </Badge>
                    )}
                    {hospital.emergencyServices && (
                      <Badge color="red">
                        <Activity className="w-3 h-3" /> 24/7 Emergency
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  {hospital.rating > 0 && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={hospital.rating} size="md" />
                      <span className="font-bold text-text-primary">{hospital.rating?.toFixed(1)}</span>
                      {hospital.reviewCount > 0 && (
                        <span className="text-text-secondary text-sm">({hospital.reviewCount?.toLocaleString()} reviews)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bed stats */}
              {(hospital.totalBeds || hospital.icuBeds) && (
                <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4 text-center">
                  {hospital.totalBeds && (
                    <div>
                      <Bed className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold text-text-primary">{hospital.totalBeds}</p>
                      <p className="text-xs text-text-secondary">Total Beds</p>
                    </div>
                  )}
                  {hospital.icuBeds && (
                    <div>
                      <Activity className="w-5 h-5 text-emergency mx-auto mb-1" />
                      <p className="text-lg font-bold text-text-primary">{hospital.icuBeds}</p>
                      <p className="text-xs text-text-secondary">ICU Beds</p>
                    </div>
                  )}
                  {hospital.distance != null && (
                    <div>
                      <MapPin className="w-5 h-5 text-text-secondary mx-auto mb-1" />
                      <p className="text-lg font-bold text-text-primary">{hospital.distance?.toFixed(1)} km</p>
                      <p className="text-xs text-text-secondary">Distance</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Score Breakdown */}
            {scoreBreakdown.overall > 0 && (
              <div className="bg-bg-card rounded-xl border border-border shadow-card p-6">
                <h2 className="font-display font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> AI Quality Score Breakdown
                </h2>
                <div className="space-y-3">
                  <ScoreBar label="Clinical Quality" value={scoreBreakdown.clinical} color="primary" />
                  <ScoreBar label="Reputation & Reviews" value={scoreBreakdown.reputation} color="blue" />
                  <ScoreBar label="Accessibility" value={scoreBreakdown.accessibility} color="green" />
                  <ScoreBar label="Affordability" value={scoreBreakdown.affordability} color="amber" />
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-semibold text-text-primary">Overall Score</span>
                  <span className="text-2xl font-bold text-primary">{scoreBreakdown.overall?.toFixed(1)}<span className="text-sm text-text-secondary font-normal">/100</span></span>
                </div>
                <p className="text-xs text-text-secondary mt-3">
                  Scores are computed from public data signals (NABH accreditation, ratings, distance, pricing tier). Not an endorsement.
                </p>
              </div>
            )}

            {/* Map */}
            {hasMap && (
              <div className="bg-bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-display font-bold text-text-primary flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Location
                  </h2>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(hospital.address + ', ' + (hospital.city || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in Google Maps
                  </a>
                </div>
                <iframe
                  title={`Map showing ${hospital.name}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}&layer=mapnik&marker=${lat},${lng}`}
                  className="w-full h-56"
                  loading="lazy"
                  aria-label={`Map location of ${hospital.name}`}
                />
              </div>
            )}

            {/* Procedures & Cost Estimates */}
            {proceduresOffered.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border shadow-card p-6">
                <h2 className="font-display font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" /> Procedures Offered & Estimated Costs
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full" aria-label="Procedure cost estimates">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider py-2 pr-4">Procedure</th>
                        <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wider py-2">Est. Cost Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proceduresOffered.map((proc) => {
                        const hint = Object.entries(PROCEDURE_COST_HINTS).find(([k]) =>
                          proc.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(proc.toLowerCase())
                        );
                        const costs = hint?.[1];
                        return (
                          <tr key={proc} className="border-b border-border/50 hover:bg-bg-main transition-colors">
                            <td className="py-3 pr-4 text-sm text-text-primary">{proc}</td>
                            <td className="py-3 text-right text-sm font-semibold text-text-primary cost-figure">
                              {costs
                                ? `${formatINR(costs.min)} – ${formatINR(costs.max)}`
                                : <span className="text-text-secondary font-normal">Contact hospital</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-text-secondary mt-3 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
                  Indicative ranges only — based on CGHS/PMJAY benchmark data. Actual costs vary. Verify with hospital billing.
                </p>
              </div>
            )}

            {/* Specializations */}
            {specializations.length > 0 && (
              <div className="bg-bg-card rounded-xl border border-border shadow-card p-6">
                <h2 className="font-display font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Specializations
                </h2>
                <div className="flex flex-wrap gap-2">
                  {specializations.map(spec => (
                    <span key={spec} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-pill font-medium">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Sidebar ────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Contact & Actions */}
            <div className="bg-bg-card rounded-xl border border-border shadow-card p-5 lg:sticky lg:top-24">
              <h3 className="font-display font-bold text-text-primary mb-4">Contact & Directions</h3>
              <div className="space-y-3">
                {hospital.phone && (
                  <a
                    href={`tel:${hospital.phone}`}
                    className="flex items-center justify-center gap-2 w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-colors"
                    id="detail-call-btn"
                  >
                    <Phone className="w-4 h-4" /> Call Hospital
                  </a>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent((hospital.address || '') + ', ' + (hospital.city || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-border text-text-primary font-medium py-3 rounded-lg hover:bg-bg-main transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Get Directions
                </a>
                {hospital.website && (
                  <a
                    href={hospital.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full border border-primary text-primary font-medium py-3 rounded-lg hover:bg-primary/5 transition-colors"
                    id="detail-website-btn"
                  >
                    <ExternalLink className="w-4 h-4" /> Visit Website
                  </a>
                )}
              </div>
              {hospital.phone && (
                <p className="text-xs text-text-secondary mt-4 text-center">{hospital.phone}</p>
              )}
            </div>

            {/* Hospital Facts */}
            <div className="bg-bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-display font-bold text-text-primary mb-3">Quick Facts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Type</span>
                  <span className="font-medium text-text-primary capitalize">{hospital.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tier</span>
                  <span className="font-medium text-text-primary">{tierLabel}</span>
                </div>
                {hospital.totalBeds && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Beds</span>
                    <span className="font-medium text-text-primary">{hospital.totalBeds}</span>
                  </div>
                )}
                {hospital.icuBeds && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">ICU Beds</span>
                    <span className="font-medium text-text-primary">{hospital.icuBeds}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary">PMJAY</span>
                  <span className={`font-medium ${hospital.acceptsPMJAY ? 'text-green-600' : 'text-text-secondary'}`}>
                    {hospital.acceptsPMJAY ? '✓ Accepted' : 'Not empanelled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Emergency</span>
                  <span className={`font-medium ${hospital.emergencyServices ? 'text-green-600' : 'text-text-secondary'}`}>
                    {hospital.emergencyServices ? '✓ Available' : 'Not available'}
                  </span>
                </div>
                {accreditations.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Accreditation</span>
                    <span className="font-medium text-text-primary">{accreditations.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PMJAY Banner */}
            {hospital.acceptsPMJAY && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">PMJAY Empanelled</p>
                    <p className="text-xs text-green-700 mt-0.5">This hospital accepts Ayushman Bharat coverage up to ₹5 lakh/year</p>
                  </div>
                </div>
                <Link
                  to="/pmjay-check"
                  className="block text-center text-xs font-semibold text-white bg-green-600 hover:bg-green-700 py-2 px-4 rounded-lg transition-colors mt-2"
                  id="detail-pmjay-check-btn"
                >
                  Check Your Eligibility →
                </Link>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>ℹ️ Important:</strong> Hospital information is sourced from public data (NABH records, pricing benchmarks, user reviews).
                Cost estimates are indicative and may vary. Always verify current availability and costs directly with the hospital before planning treatment.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
