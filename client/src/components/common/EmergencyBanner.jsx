import { Phone, AlertTriangle, MapPin, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function EmergencyBanner() {
  const { state, dispatch } = useApp();

  if (!state.isEmergency) return null;

  const dismiss = () => dispatch({ type: 'SET_EMERGENCY', payload: false });

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 bg-emergency text-white shadow-emergency emergency-pulse"
      role="alert"
      aria-live="assertive"
      aria-label="Emergency alert"
    >
      <div className="page-container py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <p className="font-bold text-sm sm:text-base">
              ⚠️ This sounds like an emergency. <span className="font-extrabold">Call 112 immediately.</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="tel:112"
              className="flex items-center gap-1.5 bg-white text-emergency font-bold px-4 py-2 rounded-pill text-sm hover:bg-red-50 transition-colors"
              id="emergency-call-112"
            >
              <Phone className="w-4 h-4" />
              Call 112
            </a>
            <a
              href="tel:1800111945"
              className="flex items-center gap-1.5 bg-white/20 text-white font-semibold px-4 py-2 rounded-pill text-sm hover:bg-white/30 transition-colors border border-white/30"
            >
              AIIMS Helpline
            </a>
            <a
              href="https://www.google.com/maps/search/emergency+hospital+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white/20 text-white font-semibold px-4 py-2 rounded-pill text-sm hover:bg-white/30 transition-colors border border-white/30"
            >
              <MapPin className="w-4 h-4" />
              Find Nearest ER
            </a>
            <button
              onClick={dismiss}
              className="ml-auto p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss emergency alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-red-200 mt-2">
          Do not proceed with normal search for emergencies. Get immediate medical attention.
        </p>
      </div>
    </div>
  );
}
