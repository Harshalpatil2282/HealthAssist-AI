const STEPS = [
  {
    step: '01',
    icon: '💬',
    title: 'Describe in Your Words',
    description: 'Type your condition or procedure in any language. Our AI understands medical terms as well as common language like "problem with knee" or "heart blockage".',
    color: 'bg-primary/10 border-primary/20',
    numColor: 'text-primary',
  },
  {
    step: '02',
    icon: '🏥',
    title: 'See Ranked Hospitals',
    description: 'Receive a ranked list of nearby hospitals scored on clinical quality, reputation, accessibility, and affordability — transparently explained.',
    color: 'bg-secondary/10 border-secondary/20',
    numColor: 'text-secondary',
  },
  {
    step: '03',
    icon: '💰',
    title: 'Get Cost Estimate',
    description: 'See component-level cost breakdowns with confidence scores. Check PMJAY eligibility and generic drug alternatives to reduce your out-of-pocket spend.',
    color: 'bg-primary/10 border-primary/20',
    numColor: 'text-primary',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-white" aria-label="How it works">
      <div className="page-container">
        <div className="text-center mb-14">
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-3">
            Simple. Transparent. Trustworthy.
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary">
            How HealthAssist Works
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Dashed connector line — desktop only */}
          <div className="absolute top-16 left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-0.5 border-t-2 border-dashed border-border hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {STEPS.map((step, idx) => (
              <div
                key={step.step}
                className="flex flex-col items-center text-center group animate-slide-up"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                {/* Icon circle */}
                <div className={`w-20 h-20 rounded-full ${step.color} border-2 flex items-center justify-center text-4xl mb-6 shadow-card group-hover:shadow-card-hover group-hover:scale-110 transition-all duration-300`}>
                  {step.icon}
                </div>

                {/* Step number */}
                <span className={`text-xs font-bold uppercase tracking-widest ${step.numColor} mb-2`}>
                  Step {step.step}
                </span>

                <h3 className="font-display text-xl font-bold text-text-primary mb-3">
                  {step.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
