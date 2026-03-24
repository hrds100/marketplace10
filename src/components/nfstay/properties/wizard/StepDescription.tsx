import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { NfsProperty } from '@/lib/nfstay/types';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepDescription({ property, onSave, saving }: Props) {
  const [publicTitle, setPublicTitle] = useState(property.public_title ?? '');
  const [internalTitle, setInternalTitle] = useState(property.internal_title ?? '');
  const [description, setDescription] = useState(property.description ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      public_title: publicTitle || null,
      internal_title: internalTitle || null,
      description: description || null,
    });
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Description</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Give your property a title and description that guests will see.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="publicTitle">Public title</Label>
          <span className="text-xs text-muted-foreground">
            {publicTitle.length}/100
          </span>
        </div>
        <Input
          data-feature="BOOKING_NFSTAY__WIZARD_INPUT"
          id="publicTitle"
          value={publicTitle}
          onChange={(e) => setPublicTitle(e.target.value.slice(0, 100))}
          maxLength={100}
          placeholder="e.g. Stylish 2-bed flat in central London"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="internalTitle">Internal name (only you see this)</Label>
        <Input
          data-feature="BOOKING_NFSTAY__WIZARD_INPUT"
          id="internalTitle"
          value={internalTitle}
          onChange={(e) => setInternalTitle(e.target.value)}
          placeholder="e.g. London Flat #3"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <span className="text-xs text-muted-foreground">
            {description.length}/2000
          </span>
        </div>
        <Textarea
          data-feature="BOOKING_NFSTAY__WIZARD_INPUT"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          maxLength={2000}
          rows={6}
          placeholder="Describe your property, the neighbourhood, and what makes it special..."
          disabled={saving}
        />
      </div>
    </form>
  );
}
