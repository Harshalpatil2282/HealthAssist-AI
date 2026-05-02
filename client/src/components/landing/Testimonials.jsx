import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Ramesh Patil',
    city: 'Nagpur, Maharashtra',
    condition: 'Angioplasty',
    rating: 5,
    text: 'HealthAssist showed me three hospitals for my heart stent and the real cost before I went. I was quoted ₹3.5L at a private hospital but found a NABH-accredited one for ₹2.1L. Saved ₹1.4 lakh!',
    savings: '₹1.4L saved',
    avatar: 'RP',
    avatarColor: 'bg-blue-500',
  },
  {
    name: 'Sunita Borse',
    city: 'Pune, Maharashtra',
    condition: 'C-Section',
    rating: 5,
    text: 'मुझे नहीं पता था कि मेरा PMJAY कार्ड C-section के लिए काम करेगा। HealthAssist ने बताया कि मैं पात्र हूं और पास का सरकारी अस्पताल कहां है। पूरा ऑपरेशन मुफ्त हुआ।',
    savings: 'Full PMJAY coverage',
    avatar: 'SB',
    avatarColor: 'bg-green-500',
  },
  {
    name: 'Dr. Vikram Nair',
    city: 'Chennai, Tamil Nadu',
    condition: 'Used for patients',
    rating: 5,
    text: 'As a GP, I recommend HealthAssist to patients who ask "doctor, how much will this cost?" It gives transparent cost ranges and generic drug alternatives — exactly what we need for informed consent.',
    savings: 'Better patient outcomes',
    avatar: 'VN',
    avatarColor: 'bg-purple-500',
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-24 bg-white" aria-label="Patient testimonials">
      <div className="page-container">
        <div className="text-center mb-14">
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-3">
            Real People. Real Savings.
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary">
            What Indians Are Saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={t.name}
              className="bg-bg-main rounded-lg border border-border p-6 relative card-hover group"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-primary/20 mb-4" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400" fill="#FBB724" />
                ))}
              </div>

              {/* Text */}
              <p className="text-text-primary text-sm leading-relaxed mb-6 italic">
                "{t.text}"
              </p>

              {/* Savings badge */}
              <div className="inline-flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold px-3 py-1.5 rounded-pill mb-5">
                ✅ {t.savings}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className={`w-10 h-10 rounded-full ${t.avatarColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{t.name}</p>
                  <p className="text-text-secondary text-xs">{t.city}</p>
                  <p className="text-primary text-xs">{t.condition}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary font-display">12,400+</p>
            <p className="text-text-secondary text-xs">Hospitals listed</p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary font-display">2.1L+</p>
            <p className="text-text-secondary text-xs">Searches done</p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary font-display">₹847 Cr</p>
            <p className="text-text-secondary text-xs">Potential savings identified</p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary font-display">4.8 ⭐</p>
            <p className="text-text-secondary text-xs">User rating</p>
          </div>
        </div>
      </div>
    </section>
  );
}
