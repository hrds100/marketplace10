import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { useNfsPropertyMutation } from '@/hooks/nfstay/use-nfs-property-mutation';
import { useNfsPropertyWizard } from '@/hooks/nfstay/use-nfs-property-wizard';
import { Button } from '@/components/ui/button';
import { NFS_ROUTES, NFS_PROPERTY_STEP_LABELS, NFS_PROPERTY_STEPS } from '@/lib/nfstay/constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import StepPropertyBasics from '@/components/nfstay/properties/wizard/StepPropertyBasics';
import StepLocation from '@/components/nfstay/properties/wizard/StepLocation';
import StepGuestsAndRooms from '@/components/nfstay/properties/wizard/StepGuestsAndRooms';
import StepPhotos from '@/components/nfstay/properties/wizard/StepPhotos';
import StepAmenities from '@/components/nfstay/properties/wizard/StepAmenities';
import StepDescription from '@/components/nfstay/properties/wizard/StepDescription';
import StepHouseRules from '@/components/nfstay/properties/wizard/StepHouseRules';
import StepAvailability from '@/components/nfstay/properties/wizard/StepAvailability';
import StepPricing from '@/components/nfstay/properties/wizard/StepPricing';
import StepReview from '@/components/nfstay/properties/wizard/StepReview';

const ACTIVE_STEPS = NFS_PROPERTY_STEPS.filter(s => s !== 'review');

export default function NfsPropertyNew() {
  const navigate = useNavigate();
  const { operator, loading: opLoading } = useNfsOperator();
  const { create } = useNfsPropertyMutation();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create draft property on mount
  useEffect(() => {
    if (!operator?.id || propertyId || creating) return;
    setCreating(true);
    create({ status: 'draft', listing_status: 'draft' })
      .then((id) => { if (id) setPropertyId(id); })
      .catch(() => {})
      .finally(() => setCreating(false));
  }, [operator?.id, propertyId, creating, create]);

  const wizard = useNfsPropertyWizard(propertyId);

  if (opLoading || creating || !propertyId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (wizard.error && !wizard.property) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">New Property</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {wizard.error}
        </div>
      </div>
    );
  }

  if (!wizard.property) return null;

  const handleSaveAndNext = async (fields: Record<string, unknown>) => {
    try {
      await wizard.saveAndNext(fields);
      if (wizard.isLastStep) {
        navigate(NFS_ROUTES.PROPERTIES, { replace: true });
      }
    } catch {
      // Error displayed via wizard.error
    }
  };

  const stepProps = { property: wizard.property, onSave: handleSaveAndNext, saving: wizard.saving };

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 'propertyBasics': return <StepPropertyBasics {...stepProps} />;
      case 'location': return <StepLocation {...stepProps} />;
      case 'guestsAndRooms': return <StepGuestsAndRooms {...stepProps} />;
      case 'photos': return <StepPhotos {...stepProps} />;
      case 'amenities': return <StepAmenities {...stepProps} />;
      case 'description': return <StepDescription {...stepProps} />;
      case 'houseRules': return <StepHouseRules {...stepProps} />;
      case 'availability': return <StepAvailability {...stepProps} />;
      case 'pricing': return <StepPricing {...stepProps} />;
      case 'review': return <StepReview {...stepProps} />;
      default: return null;
    }
  };

  const allSteps = NFS_PROPERTY_STEPS;

  return (
    <div data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(NFS_ROUTES.PROPERTIES)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Properties
        </Button>
        <h1 className="text-xl font-bold tracking-tight">New Property</h1>
      </div>

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {wizard.currentStepIndex + 1} of {allSteps.length}</span>
          <span>{NFS_PROPERTY_STEP_LABELS[wizard.currentStep as keyof typeof NFS_PROPERTY_STEP_LABELS]}</span>
        </div>
        <div className="flex gap-1.5">
          {allSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < wizard.currentStepIndex
                  ? 'bg-primary'
                  : i === wizard.currentStepIndex
                    ? 'bg-primary/60'
                    : 'bg-border/40'
              }`}
            />
          ))}
        </div>
      </div>

      {wizard.error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {wizard.error}
        </div>
      )}

      <div className="bg-white dark:bg-card rounded-xl border border-border/40 p-6">
        {renderStep()}
      </div>

      {wizard.currentStep !== 'review' && (
        <div className="flex items-center justify-between">
          <div>
            {!wizard.isFirstStep && (
              <Button type="button" variant="ghost" onClick={wizard.back} disabled={wizard.saving}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <Button type="submit" form="property-step-form" disabled={wizard.saving}>
            {wizard.saving ? 'Saving...' : 'Next'}
            {!wizard.saving && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      )}
    </div>
  );
}
