import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import { NFS_PROPERTY_STEPS } from '@/lib/nfstay/constants';

type PropertyStep = (typeof NFS_PROPERTY_STEPS)[number];

interface UseNfsPropertyWizardReturn {
  currentStep: PropertyStep;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: string[];
  saving: boolean;
  error: string | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  saveAndNext: (fields: Record<string, unknown>) => Promise<void>;
  back: () => void;
  goToStep: (step: PropertyStep) => void;
}

export function useNfsPropertyWizard(propertyId: string | undefined): UseNfsPropertyWizardReturn {
  const { property, refetch } = useNfsProperty(propertyId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStep, setLocalStep] = useState<PropertyStep | null>(null);

  const currentStep: PropertyStep = localStep ?? (property?.current_step as PropertyStep) ?? 'propertyBasics';
  const currentStepIndex = NFS_PROPERTY_STEPS.indexOf(currentStep);
  const completedSteps = property?.completed_steps ?? [];

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === NFS_PROPERTY_STEPS.length - 1;

  const updateProperty = useCallback(async (updates: Record<string, unknown>) => {
    if (!propertyId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: dbErr } = await (supabase.from('nfs_properties') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', propertyId);
      if (dbErr) throw new Error(dbErr.message);
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [propertyId, refetch]);

  const saveAndNext = useCallback(async (fields: Record<string, unknown>) => {
    const nextStep = isLastStep ? currentStep : NFS_PROPERTY_STEPS[currentStepIndex + 1];
    const newCompleted = [...new Set([...completedSteps, currentStep])];

    await updateProperty({
      ...fields,
      current_step: nextStep,
      completed_steps: newCompleted,
    });

    if (!isLastStep) {
      setLocalStep(NFS_PROPERTY_STEPS[currentStepIndex + 1]);
    }
  }, [currentStep, currentStepIndex, isLastStep, completedSteps, updateProperty]);

  const back = useCallback(() => {
    if (isFirstStep) return;
    setLocalStep(NFS_PROPERTY_STEPS[currentStepIndex - 1]);
  }, [currentStepIndex, isFirstStep]);

  const goToStep = useCallback((step: PropertyStep) => {
    setLocalStep(step);
  }, []);

  return {
    currentStep,
    currentStepIndex,
    totalSteps: NFS_PROPERTY_STEPS.length,
    completedSteps,
    saving,
    error,
    isFirstStep,
    isLastStep,
    saveAndNext,
    back,
    goToStep,
  };
}
