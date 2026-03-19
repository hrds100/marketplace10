import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { NFS_ONBOARDING_STEPS } from '@/lib/nfstay/constants';

type OnboardingStep = (typeof NFS_ONBOARDING_STEPS)[number];

interface UseNfsOnboardingReturn {
  currentStep: OnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  saving: boolean;
  error: string | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  saveAndNext: (fields: Record<string, unknown>) => Promise<void>;
  skip: () => Promise<void>;
  back: () => void;
  goToStep: (step: OnboardingStep) => void;
}

const ACTIVE_STEPS = NFS_ONBOARDING_STEPS.filter(s => s !== 'completed');

export function useNfsOnboarding(): UseNfsOnboardingReturn {
  const { operator, refetch } = useNfsOperator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStep, setLocalStep] = useState<OnboardingStep | null>(null);

  const currentStep: OnboardingStep = localStep ?? (operator?.onboarding_step as OnboardingStep) ?? 'account_setup';
  const currentStepIndex = ACTIVE_STEPS.indexOf(currentStep);
  const completedSteps = operator?.onboarding_completed_steps ?? [];
  const skippedSteps = operator?.onboarding_skipped_steps ?? [];

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ACTIVE_STEPS.length - 1;

  const updateOperator = useCallback(async (updates: Record<string, unknown>) => {
    if (!operator?.id) return;
    setSaving(true);
    setError(null);
    try {
      const { error: dbErr } = await (supabase.from('nfs_operators') as any)
        .update(updates)
        .eq('id', operator.id);
      if (dbErr) throw new Error(dbErr.message);
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [operator?.id, refetch]);

  const advanceToNext = useCallback(() => {
    if (isLastStep) {
      setLocalStep(null);
    } else {
      const nextStep = ACTIVE_STEPS[currentStepIndex + 1];
      setLocalStep(nextStep);
    }
  }, [currentStepIndex, isLastStep]);

  const saveAndNext = useCallback(async (fields: Record<string, unknown>) => {
    const nextStep = isLastStep ? 'completed' : ACTIVE_STEPS[currentStepIndex + 1];
    const newCompleted = [...new Set([...completedSteps, currentStep])];

    await updateOperator({
      ...fields,
      onboarding_step: nextStep,
      onboarding_completed_steps: newCompleted,
      onboarding_updated_at: new Date().toISOString(),
    });

    advanceToNext();
  }, [currentStep, currentStepIndex, isLastStep, completedSteps, updateOperator, advanceToNext]);

  const skip = useCallback(async () => {
    if (isFirstStep) return; // Can't skip account_setup
    const nextStep = isLastStep ? 'completed' : ACTIVE_STEPS[currentStepIndex + 1];
    const newSkipped = [...new Set([...skippedSteps, currentStep])];

    await updateOperator({
      onboarding_step: nextStep,
      onboarding_skipped_steps: newSkipped,
      onboarding_updated_at: new Date().toISOString(),
    });

    advanceToNext();
  }, [currentStep, currentStepIndex, isFirstStep, isLastStep, skippedSteps, updateOperator, advanceToNext]);

  const back = useCallback(() => {
    if (isFirstStep) return;
    setLocalStep(ACTIVE_STEPS[currentStepIndex - 1]);
  }, [currentStepIndex, isFirstStep]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setLocalStep(step);
  }, []);

  return {
    currentStep,
    currentStepIndex,
    totalSteps: ACTIVE_STEPS.length,
    completedSteps,
    skippedSteps,
    saving,
    error,
    isFirstStep,
    isLastStep,
    saveAndNext,
    skip,
    back,
    goToStep,
  };
}
