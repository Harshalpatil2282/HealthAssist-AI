import { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [start, target, duration]);

  return count;
}

const STATS = [
  {
    number: 500000000,
    display: '50 Cr+',
    label: 'Indians with no cost info',
    sublabel: 'before seeking treatment',
    color: 'text-primary',
    icon: '👥',
  },
  {
    number: 10,
    display: '3–10×',
    label: 'Cost variation',
    sublabel: 'for the same procedure',
    color: 'text-warning',
    icon: '📊',
  },
  {
    number: 680000000,
    display: '68 Cr',
    label: 'PMJAY-eligible citizens',
    sublabel: 'unaware of their coverage',
    color: 'text-secondary',
    icon: '🏛️',
  },
];

function StatCard({ stat, inView }) {
  return (
    <div className="text-center p-6 sm:p-8 bg-bg-card rounded-lg border border-border shadow-card card-hover group">
      <div className="text-4xl mb-3">{stat.icon}</div>
      <div className={`font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl mb-2 ${stat.color} transition-all duration-300`}>
        {stat.display}
      </div>
      <p className="font-semibold text-text-primary text-base sm:text-lg">{stat.label}</p>
      <p className="text-text-secondary text-sm mt-1">{stat.sublabel}</p>
    </div>
  );
}

export default function StatsBar() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-16 sm:py-20 bg-bg-main"
      aria-label="Healthcare statistics"
    >
      <div className="page-container">
        <div className="text-center mb-12">
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-3">
            The Problem We're Solving
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary">
            Healthcare Cost Blindness in India
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} inView={inView} />
          ))}
        </div>
        <p className="text-center text-xs text-text-secondary mt-6">
          Sources: National Health Authority, PMJAY Annual Report 2024, NSSO Health Survey
        </p>
      </div>
    </section>
  );
}
