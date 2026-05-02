import { useState } from 'react';
import { Video, Phone, MessageSquare, Star, Shield, CheckCircle, AlertTriangle, Send, Loader, X, Calendar, Clock, User } from 'lucide-react';
import { checkTriage } from '../api/index';
import Footer from '../components/common/Footer';

const DOCTORS = [
  { id: 1, name: 'Dr. Ananya Sharma',  spec: 'General Physician', exp: 12, rating: 4.8, online: true,  langs: ['Hindi','English'],              wait: '~5 min',  fee: 299 },
  { id: 2, name: 'Dr. Pradeep Nair',   spec: 'Internal Medicine',  exp: 18, rating: 4.9, online: true,  langs: ['English','Malayalam','Hindi'],   wait: '~8 min',  fee: 399 },
  { id: 3, name: 'Dr. Kavitha Reddy',  spec: 'General Physician', exp: 9,  rating: 4.7, online: false, langs: ['Telugu','English'],              wait: 'Offline', fee: 249 },
  { id: 4, name: 'Dr. Suresh Gupta',   spec: 'Diabetologist',      exp: 22, rating: 4.9, online: true,  langs: ['Hindi','English'],              wait: '~12 min', fee: 499 },
  { id: 5, name: 'Dr. Meera Iyer',     spec: 'Cardiologist',       exp: 15, rating: 4.8, online: true,  langs: ['Tamil','English','Hindi'],       wait: '~10 min', fee: 599 },
];

const SYMPTOMS = ['Fever','Cold & Cough','Headache','Stomach Pain','Back Pain','Chest Pain','Breathlessness','Diabetes Management','Blood Pressure','Skin Issues','Joint Pain','Dizziness','Fatigue','General Checkup'];
const SEVERITY = [
  { value: 'mild',     label: 'Mild',     desc: 'Manageable, not affecting daily life', cls: 'text-green-600 border-green-300 bg-green-50' },
  { value: 'moderate', label: 'Moderate', desc: 'Affecting daily activities',            cls: 'text-amber-600 border-amber-300 bg-amber-50' },
  { value: 'severe',   label: 'Severe',   desc: 'Significantly impaired / very painful', cls: 'text-red-600 border-red-300 bg-red-50' },
];
const URGENCY = {
  emergency:     { color: 'bg-red-600 text-white',     icon: '🚨', label: 'EMERGENCY' },
  urgent:        { color: 'bg-orange-500 text-white',  icon: '⚠️', label: 'URGENT' },
  'semi-urgent': { color: 'bg-amber-400 text-white',   icon: '🔶', label: 'SEMI-URGENT' },
  routine:       { color: 'bg-green-600 text-white',   icon: '✅', label: 'ROUTINE' },
};

const TIME_SLOTS = ['09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','02:00 PM','02:30 PM','03:00 PM','04:00 PM','04:30 PM'];

function ConsultModal({ doctor, onClose }) {
  const [step, setStep] = useState(1); // 1=slot, 2=info, 3=confirm
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState('video');
  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  const confirm = () => setStep(3);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">
              {step === 3 ? 'Booking Confirmed' : `Step ${step} of 2`}
            </p>
            <h3 className="font-display font-bold text-lg mt-0.5">{doctor.name}</h3>
            <p className="text-sm opacity-80">{doctor.spec} · ₹{doctor.fee}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {step === 3 ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-display font-bold text-xl text-text-primary mb-1">Booking Confirmed!</h4>
              <p className="text-text-secondary text-sm mb-4">
                Your consultation with <strong>{doctor.name}</strong> is scheduled for <strong>{today}</strong> at <strong>{slot}</strong>.
              </p>
              <div className="bg-bg-main rounded-lg p-4 text-left space-y-2 mb-4">
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Mode</span><span className="font-semibold capitalize">{mode === 'video' ? '📹 Video Call' : '📞 Voice Call'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Patient</span><span className="font-semibold">{name}, {age} yrs</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Fee</span><span className="font-semibold text-primary">₹{doctor.fee}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Booking ID</span><span className="font-mono text-xs">HA-{Math.random().toString(36).substr(2,8).toUpperCase()}</span></div>
              </div>
              <p className="text-xs text-text-secondary">A confirmation link will be shared on WhatsApp. Join the call 5 minutes before your slot.</p>
              <button onClick={onClose} className="mt-4 w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors">
                Done
              </button>
            </div>
          ) : step === 1 ? (
            <>
              {/* Consultation mode */}
              <p className="text-sm font-semibold text-text-primary mb-2">Consultation Mode</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[{v:'video',label:'📹 Video Call'},{v:'voice',label:'📞 Voice Call'}].map(m => (
                  <button key={m.v} onClick={() => setMode(m.v)}
                    className={`py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${mode===m.v?'border-primary bg-primary/5 text-primary':'border-border text-text-secondary hover:border-primary/40'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {/* Date */}
              <div className="flex items-center gap-2 mb-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-secondary">Date</p>
                  <p className="font-semibold text-text-primary text-sm">{today}</p>
                </div>
              </div>
              {/* Time slots */}
              <p className="text-sm font-semibold text-text-primary mb-2">Available Slots</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {TIME_SLOTS.map(t => (
                  <button key={t} onClick={() => setSlot(t)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all ${slot===t?'bg-primary text-white border-primary':'border-border text-text-secondary hover:border-primary hover:text-primary'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />{t}
                  </button>
                ))}
              </div>
              <button disabled={!slot} onClick={() => setStep(2)}
                className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40 text-sm">
                Next: Patient Details →
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-text-primary mb-3">Patient Information</p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Age *</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Age in years" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Brief Symptoms / Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe your main concern..." rows={3} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
                ⚠️ Payment of <strong>₹{doctor.fee}</strong> is collected at consultation time. Secure UPI/card accepted.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setStep(1)} className="border border-border text-text-primary font-semibold py-3 rounded-lg text-sm hover:bg-bg-main transition-colors">← Back</button>
                <button disabled={!name || !age} onClick={confirm} className="bg-primary text-white font-semibold py-3 rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-40">Confirm Booking</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Telemedicine() {
  const [selected, setSelected]   = useState([]);
  const [custom, setCustom]       = useState('');
  const [severity, setSeverity]   = useState('moderate');
  const [triage, setTriage]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [consulting, setConsulting] = useState(null); // doctor being consulted

  const toggle = s => setSelected(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const addCustom = () => {
    const t = custom.trim();
    if (t && !selected.includes(t)) setSelected(p => [...p, t]);
    setCustom('');
  };

  const assess = async () => {
    const all = [...selected, ...(custom.trim() ? [custom.trim()] : [])];
    if (!all.length) { setError('Please select at least one symptom.'); return; }
    setError(null); setLoading(true); setTriage(null);
    try { setTriage(await checkTriage(all, severity)); }
    catch(e) { setError(e?.message || 'Assessment failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const urgCfg = triage ? (URGENCY[triage.urgency_level] || URGENCY.routine) : null;

  return (
    <div className="min-h-screen bg-bg-main pt-16">
      {consulting && <ConsultModal doctor={consulting} onClose={() => setConsulting(null)} />}

      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-10 sm:py-14">
        <div className="page-container text-center">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-2">Telemedicine & Symptom Triage</h1>
          <p className="text-text-secondary text-base max-w-xl mx-auto">Get an AI urgency assessment, then book a video consultation with a verified doctor.</p>
        </div>
      </div>

      <div className="page-container py-8 pb-32 lg:pb-8">
        {/* Steps */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[{icon:MessageSquare,s:'1',t:'Describe Symptoms',c:'text-primary bg-primary/10'},
            {icon:Video,s:'2',t:'AI Assessment',c:'text-secondary bg-secondary/10'},
            {icon:CheckCircle,s:'3',t:'Book Consultation',c:'text-success bg-success/10'}].map(({icon:I,s,t,c})=>(
            <div key={s} className="text-center">
              <div className={`w-12 h-12 rounded-full ${c} flex items-center justify-center mx-auto mb-2`}><I className="w-5 h-5"/></div>
              <p className="text-xs text-text-secondary">Step {s}</p>
              <p className="text-sm font-semibold text-text-primary">{t}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left — symptom input */}
          <div className="space-y-4">
            <div className="bg-bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-display font-bold text-lg text-text-primary mb-4">1. Select Your Symptoms</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {SYMPTOMS.map(s=>(
                  <button key={s} onClick={()=>toggle(s)}
                    className={`text-sm px-3 py-1.5 rounded-pill border font-medium transition-all ${selected.includes(s)?'border-primary bg-primary text-white':'border-border text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5'}`}
                    aria-pressed={selected.includes(s)}>{s}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustom()}
                  placeholder="Type other symptom & press Enter…"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-transparent" />
                <button onClick={addCustom} disabled={!custom.trim()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-40">Add</button>
              </div>
              {selected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selected.map(s=>(
                    <span key={s} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-pill">
                      {s}<button onClick={()=>toggle(s)} className="hover:text-emergency ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-display font-bold text-lg text-text-primary mb-4">2. Severity Level</h2>
              <div className="space-y-2">
                {SEVERITY.map(o=>(
                  <button key={o.value} onClick={()=>setSeverity(o.value)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${severity===o.value?o.cls:'border-border bg-transparent text-text-primary hover:border-border'}`}
                    aria-pressed={severity===o.value}>
                    <span className="font-semibold text-sm">{o.label}</span>
                    <span className="text-xs ml-2 opacity-70">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0"/>{error}</div>}

            <button onClick={assess} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 shadow-lg text-base"
              id="triage-assess-btn">
              {loading ? <><Loader className="w-5 h-5 animate-spin"/>Assessing…</> : <><Send className="w-5 h-5"/>Get AI Triage Assessment</>}
            </button>
          </div>

          {/* Right — result + doctors */}
          <div className="space-y-4">
            {triage && urgCfg ? (
              <div className="bg-bg-card rounded-xl border border-border shadow-card overflow-hidden animate-bounce-in">
                <div className={`p-5 ${urgCfg.color}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{urgCfg.icon}</span>
                    <div>
                      <p className="font-display font-extrabold text-xl">{urgCfg.label}</p>
                      <p className="text-sm opacity-80">Urgency Level</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {triage.emergency_services && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"/>
                      <div>
                        <p className="font-bold text-red-800">Emergency — Call 112 Now!</p>
                        <a href="tel:112" className="inline-block mt-2 bg-red-600 text-white font-bold px-6 py-2 rounded-lg text-sm">📞 Call 112</a>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Recommended Action</p>
                    <p className="text-text-primary font-semibold leading-relaxed">{triage.recommended_action}</p>
                  </div>
                  {triage.specialist_type && (
                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl flex-shrink-0">👨‍⚕️</div>
                      <div>
                        <p className="text-xs text-text-secondary">Recommended Specialist</p>
                        <p className="font-bold text-text-primary">{triage.specialist_type}</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800 leading-relaxed"><strong>⚠️ Important: </strong>{triage.disclaimer}</p>
                  </div>
                  <a href="/search" className="block text-center w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors">Find Nearby Hospitals →</a>
                </div>
              </div>
            ) : (
              <div className="bg-bg-card rounded-xl border border-border shadow-card p-8 text-center">
                <div className="text-5xl mb-3">🩺</div>
                <p className="font-semibold text-text-primary mb-1">AI Triage Assessment</p>
                <p className="text-sm text-text-secondary">Select symptoms and click <strong>Get AI Triage Assessment</strong> for an instant urgency rating.</p>
              </div>
            )}

            {/* Doctors list */}
            <div className="bg-bg-card rounded-xl border border-border shadow-card p-5">
              <h2 className="font-display font-bold text-text-primary mb-3 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary"/>Available Doctors
              </h2>
              <div className="space-y-3">
                {DOCTORS.map(d=>(
                  <div key={d.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${d.online?'border-border hover:border-primary/40 card-hover':'border-border opacity-60'}`}>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl flex-shrink-0">👨‍⚕️</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-text-primary text-sm truncate">{d.name}</p>
                        {d.online
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">● Online</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Offline</span>}
                      </div>
                      <p className="text-xs text-primary">{d.spec}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {Array.from({length:5}).map((_,i)=>(
                            <Star key={i} className={`w-3 h-3 ${i<Math.round(d.rating)?'text-amber-400':'text-gray-200'}`} fill={i<Math.round(d.rating)?'#FBB724':'none'}/>
                          ))}
                        </div>
                        <span className="text-xs text-text-secondary">{d.rating} · {d.exp}yr exp</span>
                        <span className="text-xs font-bold text-primary ml-auto">₹{d.fee}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">Wait: {d.wait} · {d.langs.join(', ')}</p>
                    </div>
                    {d.online && (
                      <button
                        onClick={() => setConsulting(d)}
                        className="flex-shrink-0 flex items-center gap-1 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                        id={`consult-btn-${d.id}`}>
                        <Video className="w-3 h-3"/>Consult
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>⚠️ Telemedicine Disclaimer:</strong> AI triage and online consultations are for general medical guidance only.
            For life-threatening emergencies, call <strong>112</strong> immediately.
            Telemedicine services are governed by <strong>Telemedicine Practice Guidelines 2020</strong> by NMC, India.
            This platform does not store any health information you enter.
          </p>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
