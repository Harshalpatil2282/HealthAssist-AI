import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, ChevronDown, Info } from 'lucide-react';
import { checkPMJAYEligibility } from '../api/index';
import { useApp } from '../context/AppContext';
import Footer from '../components/common/Footer';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const INCOME_RANGES = [
  { value: 'below_1L', label: 'Below ₹1 Lakh/year' },
  { value: '1L_2L', label: '₹1L – ₹2L/year' },
  { value: '2L_3L', label: '₹2L – ₹3L/year' },
  { value: 'above_3L', label: 'Above ₹3L/year' },
];

const RATION_TYPES = [
  { value: 'AAY', label: 'AAY (Antyodaya Anna Yojana — Poorest)' },
  { value: 'BPL', label: 'BPL (Below Poverty Line)' },
  { value: 'APL', label: 'APL (Above Poverty Line)' },
  { value: 'none', label: 'No Ration Card' },
];

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  aadhaarLast4: z.string().length(4, 'Enter exactly 4 digits').regex(/^\d{4}$/, 'Must be digits only'),
  state: z.string().min(1, 'Please select your state'),
  annualIncome: z.string().min(1, 'Please select income range'),
  rationCardType: z.string().min(1, 'Please select ration card type'),
  familySize: z.number({ invalid_type_error: 'Enter a valid number' }).min(1).max(20),
});

function EligibilityResult({ result }) {
  const statusConfig = {
    eligible: {
      icon: CheckCircle,
      iconColor: 'text-success',
      bg: 'bg-green-50 border-green-200',
      title: '✅ Likely Eligible for PMJAY',
      titleColor: 'text-green-800',
    },
    not_eligible: {
      icon: XCircle,
      iconColor: 'text-emergency',
      bg: 'bg-red-50 border-red-200',
      title: '❌ Not Likely Eligible for PMJAY',
      titleColor: 'text-red-800',
    },
    verify: {
      icon: AlertCircle,
      iconColor: 'text-warning',
      bg: 'bg-amber-50 border-amber-200',
      title: '🔄 Verification Required',
      titleColor: 'text-amber-800',
    },
  };

  const config = statusConfig[result.status] || statusConfig.verify;
  const Icon = config.icon;

  return (
    <div className={`border-2 rounded-lg p-6 animate-bounce-in ${config.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-8 h-8 ${config.iconColor}`} />
        <h3 className={`font-display text-xl font-bold ${config.titleColor}`}>{config.title}</h3>
      </div>

      {/* Eligibility reason from backend */}
      {result.eligibilityReason && (
        <div className="bg-white/60 rounded-lg p-3 mb-4">
          <p className="text-sm text-text-secondary">📋 {result.eligibilityReason}</p>
        </div>
      )}

      {result.coverage && (
        <div className="bg-white/60 rounded-lg p-4 mb-4">
          <p className="text-sm text-text-secondary">PMJAY Coverage Amount</p>
          <p className="font-display text-3xl font-extrabold text-success">
            ₹{(result.coverage).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-text-secondary mt-1">per family per year at empanelled hospitals</p>
        </div>
      )}

      {result.nextSteps?.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold text-text-primary mb-2">Next Steps:</p>
          <ul className="space-y-2">
            {result.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-primary mt-0.5 font-bold">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.alternativeSchemes?.length > 0 && (
        <div className="bg-white/50 rounded-lg p-4 mb-4">
          <p className="font-semibold text-text-primary mb-2">Alternative Healthcare Schemes:</p>
          <ul className="space-y-1">
            {result.alternativeSchemes.map((scheme, i) => (
              <li key={i} className="text-sm text-text-secondary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                {scheme}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={result.officialPortal || 'https://pmjay.gov.in'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-secondary text-white font-semibold px-4 py-2.5 rounded-pill text-sm hover:bg-secondary-dark transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Official PMJAY Portal
        </a>
        <a
          href={`tel:${result.helpline || '14555'}`}
          className="flex items-center gap-1.5 border border-border bg-white text-text-primary font-semibold px-4 py-2.5 rounded-pill text-sm hover:bg-bg-main transition-colors"
        >
          📞 Call {result.helpline || '14555'} (Helpline)
        </a>
      </div>

      {result.disclaimer && (
        <p className="text-xs text-text-secondary mt-4 border-t border-black/10 pt-3">
          ⚠️ {result.disclaimer}
        </p>
      )}
    </div>
  );
}

export default function PMJAYCheck() {
  const { addToast } = useApp();
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { familySize: 4 },
  });

  const onSubmit = async (data) => {
    setChecking(true);
    setResult(null);
    try {
      const res = await checkPMJAYEligibility(data);
      setResult(res);
      addToast({ type: 'success', title: 'Check complete', message: 'Eligibility result ready', duration: 3000 });
    } catch {
      addToast({ type: 'error', message: 'Check failed. Please try again.', duration: 4000 });
    } finally {
      setChecking(false);
    }
  };

  const InputClass = (hasError) => `w-full border rounded-lg px-4 py-3 text-base bg-white focus:outline-none transition-colors ${
    hasError ? 'border-emergency focus:border-emergency' : 'border-border focus:border-primary'
  }`;

  return (
    <div className="min-h-screen bg-bg-main pt-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/10 to-primary/10 py-10 sm:py-14">
        <div className="page-container text-center">
          <div className="text-5xl mb-4">🏛️</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            PMJAY Eligibility Checker
          </h1>
          <p className="text-text-secondary text-base max-w-xl mx-auto">
            Check if you qualify for Ayushman Bharat — India's largest health coverage scheme providing ₹5 lakh/year to eligible families.
          </p>
        </div>
      </div>

      <div className="page-container py-8 pb-32 lg:pb-8">
        <div className="max-w-2xl mx-auto">

          {/* Info box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <strong className="text-text-primary">Privacy Note:</strong> We collect only the minimum information needed. 
              Your Aadhaar last 4 digits are never stored or transmitted. This check is performed locally.
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-bg-card rounded-lg border border-border shadow-card p-6 space-y-5" aria-label="PMJAY eligibility form">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Full Name <span className="text-emergency">*</span>
                  <span className="text-xs text-text-secondary font-normal ml-1">(as per Aadhaar)</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  {...register('fullName')}
                  placeholder="e.g. Ramesh Kumar Sharma"
                  className={InputClass(errors.fullName)}
                />
                {errors.fullName && <p className="text-xs text-emergency mt-1">{errors.fullName.message}</p>}
              </div>

              {/* Aadhaar last 4 */}
              <div>
                <label htmlFor="aadhaarLast4" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Aadhaar Last 4 Digits <span className="text-emergency">*</span>
                </label>
                <input
                  id="aadhaarLast4"
                  type="text"
                  maxLength={4}
                  {...register('aadhaarLast4')}
                  placeholder="e.g. 4321"
                  className={`${InputClass(errors.aadhaarLast4)} font-mono tracking-widest`}
                />
                {errors.aadhaarLast4 && <p className="text-xs text-emergency mt-1">{errors.aadhaarLast4.message}</p>}
                <p className="text-xs text-text-secondary mt-1">🔒 Only last 4 digits — never stored</p>
              </div>

              {/* Family size */}
              <div>
                <label htmlFor="familySize" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Family Size <span className="text-emergency">*</span>
                </label>
                <input
                  id="familySize"
                  type="number"
                  min={1}
                  max={20}
                  {...register('familySize', { valueAsNumber: true })}
                  className={InputClass(errors.familySize)}
                />
                {errors.familySize && <p className="text-xs text-emergency mt-1">{errors.familySize.message}</p>}
              </div>

              {/* State */}
              <div className="sm:col-span-2">
                <label htmlFor="state" className="block text-sm font-semibold text-text-primary mb-1.5">
                  State / Union Territory <span className="text-emergency">*</span>
                </label>
                <select
                  id="state"
                  {...register('state')}
                  className={InputClass(errors.state)}
                >
                  <option value="">Select your state...</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <p className="text-xs text-emergency mt-1">{errors.state.message}</p>}
              </div>

              {/* Annual Income */}
              <div>
                <label htmlFor="annualIncome" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Annual Family Income <span className="text-emergency">*</span>
                </label>
                <select
                  id="annualIncome"
                  {...register('annualIncome')}
                  className={InputClass(errors.annualIncome)}
                >
                  <option value="">Select income range...</option>
                  {INCOME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.annualIncome && <p className="text-xs text-emergency mt-1">{errors.annualIncome.message}</p>}
              </div>

              {/* Ration Card */}
              <div>
                <label htmlFor="rationCardType" className="block text-sm font-semibold text-text-primary mb-1.5">
                  Ration Card Type <span className="text-emergency">*</span>
                </label>
                <select
                  id="rationCardType"
                  {...register('rationCardType')}
                  className={InputClass(errors.rationCardType)}
                >
                  <option value="">Select type...</option>
                  {RATION_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.rationCardType && <p className="text-xs text-emergency mt-1">{errors.rationCardType.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-white font-bold py-4 rounded-pill text-lg hover:bg-secondary-dark transition-all duration-300 hover:shadow-xl disabled:opacity-60 disabled:cursor-wait"
              id="pmjay-check-btn"
            >
              {checking ? (
                <>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  Checking eligibility...
                </>
              ) : (
                '🏛️ Check PMJAY Eligibility'
              )}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className="mt-6">
              <EligibilityResult result={result} />
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 text-center">
              ⚠️ This is an indicative check. Official eligibility must be verified at{' '}
              <a href="https://pmjay.gov.in" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                pmjay.gov.in
              </a>{' '}
              or by calling <strong>14555</strong> (toll-free).
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
