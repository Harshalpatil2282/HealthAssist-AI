/**
 * LoadingSkeleton — Shimmer loading placeholders
 */

export function HospitalCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-border p-5 space-y-4" aria-label="Loading hospital card">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded shimmer" />
          <div className="h-4 w-1/2 rounded shimmer" />
        </div>
        <div className="h-8 w-12 rounded shimmer" />
      </div>
      {/* Badges */}
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-pill shimmer" />
        <div className="h-6 w-16 rounded-pill shimmer" />
      </div>
      {/* Score bars */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-3 flex-1 rounded-pill shimmer" />
            <div className="h-3 w-8 rounded shimmer" />
          </div>
        ))}
      </div>
      {/* Cost */}
      <div className="h-6 w-40 rounded shimmer" />
      {/* Actions */}
      <div className="flex gap-2">
        <div className="h-10 flex-1 rounded-lg shimmer" />
        <div className="h-10 flex-1 rounded-lg shimmer" />
        <div className="h-10 flex-1 rounded-lg shimmer" />
      </div>
    </div>
  );
}

export function CostPanelSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-border p-5 space-y-4" aria-label="Loading cost estimate">
      <div className="h-6 w-1/2 rounded shimmer" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 w-32 rounded shimmer" />
            <div className="h-4 w-28 rounded shimmer" />
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div className="flex justify-between items-center">
        <div className="h-5 w-24 rounded shimmer" />
        <div className="h-6 w-36 rounded shimmer" />
      </div>
      <div className="h-32 rounded-lg shimmer" />
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="h-16 w-full rounded-pill shimmer" />
      <div className="flex gap-2">
        <div className="h-12 flex-1 rounded-lg shimmer" />
        <div className="h-12 w-32 rounded-lg shimmer" />
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-sm text-text-secondary font-medium">AI is analyzing your query...</span>
    </div>
  );
}
