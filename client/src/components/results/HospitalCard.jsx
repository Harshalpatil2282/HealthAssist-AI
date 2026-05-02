import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Phone, ExternalLink, CheckCircle, Activity, Shield, Zap, TrendingDown } from 'lucide-react';
import { formatCostRange } from '../../utils/formatCurrency';

const RANK_STYLES = {
  1: { badge: 'rank-badge-gold',   label: '#1', emoji: '🥇' },
  2: { badge: 'rank-badge-silver', label: '#2', emoji: '🥈' },
  3: { badge: 'rank-badge-bronze', label: '#3', emoji: '🥉' },
};

function ScoreBar({ label, score, color = 'bg-primary', icon }) {
  const pct = Math.min(100, Math.round(score));
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-24 flex-shrink-0">
        {icon && <span className="w-3.5 h-3.5 text-text-secondary">{icon}</span>}
        <span className="text-xs text-text-secondary truncate">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-border rounded-pill overflow-hidden">
        <div
          className={`h-full ${color} rounded-pill score-bar-fill`}
          style={{ width: `${pct}%` }}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
      <span className="text-xs font-semibold text-text-primary w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function HospitalCard({ hospital, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  const rank = hospital.rank || 0;
  const rankStyle = RANK_STYLES[rank] || { badge: 'rank-badge-default', label: `#${rank}`, emoji: '' };

  // Score breakdown from backend (already adapted in api/index.js)
  const sb = hospital.scoreBreakdown || {};
  const hasScores = sb.overall > 0;

  const typeLabel = hospital.type === 'government' ? 'Government'
    : hospital.type === 'trust' ? 'Trust / NGO'
    : 'Private';

  const typeBadgeClass = hospital.type === 'government'
    ? 'bg-green-100 text-green-700'
    : hospital.type === 'trust'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <article
      className={`bg-bg-card rounded-lg border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-primary shadow-card-hover ring-2 ring-primary/20'
          : 'border-border shadow-card card-hover hover:border-primary/40'
      }`}
      onClick={() => onSelect && onSelect(hospital.id)}
      aria-label={`Hospital: ${hospital.name}, Rank ${rank}`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {/* Rank badge */}
          <div className={`w-10 h-10 rounded-lg ${rankStyle.badge} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
            {rank <= 3 ? rankStyle.emoji : `#${rank}`}
          </div>

          {/* Name & location */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base text-text-primary leading-tight">{hospital.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <MapPin className="w-3 h-3" />
                {hospital.city}{hospital.state ? `, ${hospital.state}` : ''}
              </span>
              {hospital.distance != null && (
                <>
                  <span className="text-xs text-text-secondary">·</span>
                  <span className="text-xs text-primary font-medium">{hospital.distance.toFixed(1)} km away</span>
                </>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-end flex-shrink-0">
            {hospital.rating != null && (
              <>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400" fill="#FBB724" />
                  <span className="font-bold text-text-primary">{hospital.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-text-secondary">
                  {(hospital.reviewCount || 0).toLocaleString()} reviews
                </span>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={`text-xs px-2 py-1 rounded-md font-medium ${typeBadgeClass}`}>
            {typeLabel}
          </span>
          {hospital.tier && (
            <span className="text-xs px-2 py-1 rounded-md font-medium bg-gray-100 text-gray-600 capitalize">
              {hospital.tier}
            </span>
          )}
          {(hospital.accreditations || []).map(acc => (
            <span key={acc} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-semibold">
              {acc}
            </span>
          ))}
          {hospital.acceptsPMJAY && (
            <span className="pmjay-badge">
              <CheckCircle className="w-3 h-3" /> PMJAY
            </span>
          )}
          {hospital.emergencyServices && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md font-medium flex items-center gap-1">
              🚑 24/7 Emergency
            </span>
          )}
        </div>

        {/* Score bars — from real backend scoring engine */}
        {hasScores && (
          <div className="space-y-2 mb-4">
            <ScoreBar label="Clinical"      score={sb.clinical}      color="bg-primary"      />
            <ScoreBar label="Reputation"    score={sb.reputation}    color="bg-secondary"    />
            <ScoreBar label="Accessibility" score={sb.accessibility} color="bg-purple-500"   />
            <ScoreBar label="Affordability" score={sb.affordability} color="bg-green-500"    />
          </div>
        )}

        {/* Overall score pill */}
        {hasScores && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-text-secondary">HealthAssist Score</span>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 w-24 bg-border rounded-pill overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-pill"
                  style={{ width: `${sb.overall}%` }}
                />
              </div>
              <span className="text-sm font-bold text-primary">{Math.round(sb.overall)}/100</span>
            </div>
          </div>
        )}

        {/* Specializations chips */}
        {expanded && hospital.specializations?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-text-secondary mb-1.5">Specializations:</p>
            <div className="flex flex-wrap gap-1.5">
              {hospital.specializations.slice(0, 8).map((s) => (
                <span key={s} className="text-xs bg-bg-main border border-border px-2 py-0.5 rounded-full text-text-secondary">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expand/collapse specializations */}
        {hospital.specializations?.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-xs text-primary hover:text-primary-dark font-medium mb-4 block"
          >
            {expanded ? '▲ Show less' : `▼ ${hospital.specializations.length} specializations`}
          </button>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            to={`/hospital/${hospital.id}`}
            className="flex items-center justify-center gap-1 bg-primary text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
            onClick={(e) => e.stopPropagation()}
            id={`view-details-${hospital.id}`}
          >
            View Details
          </Link>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(hospital.name + ' ' + hospital.city)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 border border-border text-text-primary text-xs font-medium py-2.5 rounded-lg hover:bg-bg-main transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" /> Directions
          </a>
          {hospital.phone ? (
            <a
              href={`tel:${hospital.phone}`}
              className="flex items-center justify-center gap-1 border border-border text-text-primary text-xs font-medium py-2.5 rounded-lg hover:bg-bg-main transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3" /> Call
            </a>
          ) : (
            <span className="flex items-center justify-center text-xs text-text-secondary py-2.5 border border-border rounded-lg">
              No phone
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
