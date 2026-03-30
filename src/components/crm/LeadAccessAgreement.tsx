import { useState } from 'react';
import { Shield, X } from 'lucide-react';

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
}

export default function LeadAccessAgreement({ open, onClose, onAgree }: Props) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function handleNext() {
    if (isLastStep) {
      setStep(0);
      onAgree();
    } else {
      setStep(step + 1);
    }
  }

  function handleClose() {
    setStep(0);
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

          {/* Content */}
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
              {isLastStep ? 'I Agree & View Lead' : current.button}
            </button>
            <p className="text-center text-[10px] mt-3" style={{ color: '#9CA3AF' }}>
              This protects lead quality and ensures we can continue supplying high-quality tenant enquiries.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
