import { useNavigate } from 'react-router-dom';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { useNfsOnboarding } from '@/hooks/nfstay/use-nfs-onboarding';
import { Button } from '@/components/ui/button';
import { NFS_ROUTES } from '@/lib/nfstay/constants';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

import StepAccountSetup from '@/components/nfstay/onboarding/StepAccountSetup';
import StepPersona from '@/components/nfstay/onboarding/StepPersona';
import StepUsageIntent from '@/components/nfstay/onboarding/StepUsageIntent';
import StepBusiness from '@/components/nfstay/onboarding/StepBusiness';
import StepLandingPage from '@/components/nfstay/onboarding/StepLandingPage';
import StepWebsiteCustomization from '@/components/nfstay/onboarding/StepWebsiteCustomization';
import StepContactInfo from '@/components/nfstay/onboarding/StepContactInfo';
import StepPaymentMethods from '@/components/nfstay/onboarding/StepPaymentMethods';

const STEP_LABELS = [
  'Account',
  'Persona',
  'Usage',
  'Business',
  'Landing Page',
  'Customization',
  'Contact',
  'Payments',
] as const;

export default function NfsOnboarding() {
  const navigate = useNavigate();
  const { operator, loading, error: operatorError } = useNfsOperator();
  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    saving,
    error: onboardingError,
    isFirstStep,
    isLastStep,
    saveAndNext,
    skip,
    back,
  } = useNfsOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (operatorError || !operator) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {operatorError || 'No operator account found. Please sign up first.'}
        </div>
      </div>
    );
  }

  // Already completed — redirect to dashboard
  if (operator.onboarding_step === 'completed') {
    navigate(NFS_ROUTES.DASHBOARD, { replace: true });
    return null;
  }

  const handleSaveAndNext = async (fields: Record<string, unknown>) => {
    try {
      await saveAndNext(fields);
      if (isLastStep) {
        navigate(NFS_ROUTES.DASHBOARD, { replace: true });
      }
    } catch {
      // Error is displayed via onboardingError
    }
  };

  const handleSkip = async () => {
    try {
      await skip();
      if (isLastStep) {
        navigate(NFS_ROUTES.DASHBOARD, { replace: true });
      }
    } catch {
      // Error is displayed via onboardingError
    }
  };

  const stepProps = { operator, onSave: handleSaveAndNext, saving };

  const renderStep = () => {
    switch (currentStep) {
      case 'account_setup': return <StepAccountSetup {...stepProps} />;
      case 'persona': return <StepPersona {...stepProps} />;
      case 'usage_intent': return <StepUsageIntent {...stepProps} />;
      case 'business': return <StepBusiness {...stepProps} />;
      case 'landing_page': return <StepLandingPage {...stepProps} />;
      case 'website_customization': return <StepWebsiteCustomization {...stepProps} />;
      case 'contact_info': return <StepContactInfo {...stepProps} />;
      case 'payment_methods': return <StepPaymentMethods {...stepProps} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{STEP_LABELS[currentStepIndex]}</span>
        </div>
        <div className="flex gap-1.5">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStepIndex
                  ? 'bg-primary'
                  : i === currentStepIndex
                    ? 'bg-primary/60'
                    : 'bg-border/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error display */}
      {onboardingError && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {onboardingError}
        </div>
      )}

      {/* Step content */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/40 p-6">
        {renderStep()}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <div>
          {!isFirstStep && (
            <Button type="button" variant="ghost" onClick={back} disabled={saving}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button type="button" variant="outline" onClick={handleSkip} disabled={saving}>
              <SkipForward className="w-4 h-4 mr-1" /> Skip
            </Button>
          )}
          <Button
            type="submit"
            form="onboarding-step-form"
            disabled={saving}
          >
            {saving ? 'Saving...' : isLastStep ? 'Complete setup' : 'Next'}
            {!isLastStep && !saving && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
