import { useEffect, useRef } from 'react';

/**
 * ConfidenceScore — Animated circular gauge
 * @param {number} value - 0 to 1
 * @param {boolean} showLabel
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
export default function ConfidenceScore({ value = 0.68, showLabel = true, size = 'md' }) {
  const circleRef = useRef(null);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value * circumference);

  const getColor = () => {
    if (value >= 0.7) return '#22C55E';   // green
    if (value >= 0.4) return '#F9A826';   // amber
    return '#DC2626';                      // red
  };

  const getEmoji = () => {
    if (value >= 0.7) return '🟢';
    if (value >= 0.4) return '🟡';
    return '🔴';
  };

  const getLabel = () => {
    if (value >= 0.7) return 'High Confidence';
    if (value >= 0.4) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  const getDescription = () => {
    if (value >= 0.7) return 'Strong data coverage — estimates are reliable';
    if (value >= 0.4) return 'Some data gaps — use as a planning estimate';
    return 'Limited data — wide range, treat with caution';
  };

  const sizeMap = {
    sm: { svgSize: 64, strokeWidth: 6, fontSize: 'text-xs' },
    md: { svgSize: 96, strokeWidth: 8, fontSize: 'text-sm' },
    lg: { svgSize: 120, strokeWidth: 10, fontSize: 'text-base' },
  };

  const { svgSize, strokeWidth, fontSize } = sizeMap[size] || sizeMap.md;
  const center = svgSize / 2;
  const r = center - strokeWidth - 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value * circ);

  const color = getColor();

  return (
    <div className="flex items-center gap-3 group relative" title={getDescription()}>
      {/* SVG Ring */}
      <div className="relative flex-shrink-0">
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          aria-label={`Confidence score: ${Math.round(value * 100)}%`}
          role="img"
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#DCE8F0"
            strokeWidth={strokeWidth}
          />
          {/* Foreground ring */}
          <circle
            ref={circleRef}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
          />
          {/* Percentage text */}
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="700"
            fontSize={size === 'sm' ? '14' : size === 'lg' ? '22' : '18'}
          >
            {Math.round(value * 100)}%
          </text>
        </svg>
      </div>

      {/* Label */}
      {showLabel && (
        <div>
          <div className="flex items-center gap-1">
            <span>{getEmoji()}</span>
            <span className={`font-semibold text-text-primary ${fontSize}`}>{getLabel()}</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 max-w-xs">{getDescription()}</p>
        </div>
      )}

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-text-primary text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
        <p className="font-semibold mb-1">About Confidence Score</p>
        <p>{getDescription()}</p>
        <p className="mt-1 text-gray-300">
          Based on: hospital pricing data availability, procedure complexity, and geographic data coverage.
        </p>
      </div>
    </div>
  );
}
