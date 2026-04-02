import { useState } from 'react';
import { Shield, X, User, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STEPS = [
  {
    title: 'Access Confirmation',
    text: 'This lead is protected by **nfstay**. By continuing, you agree to follow the platform rules when engaging with this tenant.',
    button: 'Continue',
  },
  {
    title: 'Introduction Fee',
    text: 'If this tenant secures a tenancy for this property, you agree to pay **nfstay** a £250 introduction fee for that property.',
    button: 'I confirm',
  },
  {
    title: 'Future Placements',
    text: 'If you place this same tenant into another property in the future, you agree to inform **nfstay** and pay a £250 introduction fee for each additional property.',
    button: 'I confirm',
  },
  {
    title: 'Platform Protection',
    text: 'You may communicate with this tenant outside the platform, however you agree not to bypass **nfstay** to avoid the agreed introduction fees for this lead or any future placements.',
    button: 'I confirm',
  },
  {
    title: 'Terms & Compliance',
    text: 'All activity is subject to **nfstay**\'s Terms and Conditions. Breaches may result in account restrictions and recovery of fees where applicable.',
    button: 'I agree',
  },
];

function renderText(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: '#1E9A80' }}>{part}</strong> : <span key={i}>{part}</span>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
  requiresClaim?: boolean;
  onClaimComplete?: () => void;
}

export default function LeadAccessAgreement({ open, onClose, onAgree, requiresClaim, onClaimComplete }: Props) {
  const [step, setStep] = useState(0);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claiming, setClaiming] = useState(false);

  if (!open) return null;

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];
  const totalSteps = STEPS.length + (requiresClaim ? 1 : 0);
  const currentStep = showClaimForm ? STEPS.length + 1 : step + 1;
  const progress = (currentStep / totalSteps) * 100;

  function handleNext() {
    if (isLastStep) {
      onAgree();
      if (requiresClaim) {
        setShowClaimForm(true);
      } else {
        setStep(0);
      }
    } else {
      setStep(step + 1);
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimName.trim() || !claimEmail.trim()) return;
    setClaiming(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) { toast.error('Not signed in'); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-landlord-account`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: claimEmail.trim().toLowerCase(), name: claimName.trim() }),
      });
      if (!res.ok) { toast.error('Failed to claim account'); return; }
      toast.success('Account claimed! You can now log in anytime.');
      setShowClaimForm(false);
      setStep(0);
      setClaimName('');
      setClaimEmail('');
      onClaimComplete?.();
    } catch { toast.error('Something went wrong'); } finally { setClaiming(false); }
  }

  function handleClose() {
    setStep(0);
    setShowClaimForm(false);
    setClaimName('');
    setClaimEmail('');
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal - bottom sheet on mobile, centered on desktop */}
      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full">
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0 sm:fade-in"
          style={{ maxHeight: '85dvh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECFDF5' }}>
                <Shield className="w-4 h-4" style={{ color: '#1E9A80' }} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Lead Access Agreement</h2>
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Step {step + 1} of {STEPS.length}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mx-5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: '#1E9A80' }}
            />
          </div>

          {showClaimForm ? (
            <>
              {/* Claim form */}
              <div className="px-5 py-6">
                <h3 className="text-base font-bold mb-2" style={{ color: '#1A1A1A' }}>Claim your account</h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Enter your real name and email to complete your account. You can then log in anytime.
                </p>
                <form onSubmit={handleClaim} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: '#525252' }}>Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                      <input value={claimName} onChange={e => setClaimName(e.target.value)} placeholder="Your full name" required className="w-full h-10 pl-10 pr-3 rounded-lg border text-sm" style={{ borderColor: '#E5E5E5' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: '#525252' }}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                      <input type="email" value={claimEmail} onChange={e => setClaimEmail(e.target.value)} placeholder="your@email.com" required className="w-full h-10 pl-10 pr-3 rounded-lg border text-sm" style={{ borderColor: '#E5E5E5' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={claiming || !claimName.trim() || !claimEmail.trim()} className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-[0.96] disabled:opacity-50" style={{ backgroundColor: '#1E9A80', boxShadow: 'rgba(30,154,128,0.35) 0 4px 16px' }}>
                    {claiming ? 'Claiming...' : 'Claim Account & View Lead'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* NDA Content */}
              <div className="px-5 py-6" key={step}>
                <h3 className="text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>{current.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  {renderText(current.text)}
                </p>
              </div>

              {/* Action */}
              <div className="px-5 pb-5">
                <button
                  onClick={handleNext}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-[0.96] active:scale-[0.98]"
                  style={{
                    backgroundColor: '#1E9A80',
                    boxShadow: isLastStep ? 'rgba(30,154,128,0.35) 0 4px 16px' : undefined,
                  }}
                >
                  {isLastStep ? (requiresClaim ? 'I Agree & Continue to Claim' : 'I Agree & View Lead') : current.button}
                </button>
                <p className="text-center text-[10px] mt-3" style={{ color: '#9CA3AF' }}>
                  This protects lead quality and ensures we can continue supplying high-quality tenant enquiries.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
