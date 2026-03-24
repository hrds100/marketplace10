import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import { useNfsPropertyMutation } from '@/hooks/nfstay/use-nfs-property-mutation';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { useNfsImageUpload } from '@/hooks/nfstay/use-nfs-image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFS_ROUTES, NFS_PROPERTY_TYPES, NFS_RENTAL_TYPES, NFS_CANCELLATION_POLICIES, NFS_AMENITY_CATEGORIES } from '@/lib/nfstay/constants';
import NfsPhotoGallery from '@/components/nfstay/properties/NfsPhotoGallery';
import NfsPhotoUpload from '@/components/nfstay/properties/NfsPhotoUpload';
import PropertyCalendars from '@/components/nfstay/properties/PropertyCalendars';
import { ChevronLeft, Trash2 } from 'lucide-react';
import type { NfsProperty, NfsPropertyImage } from '@/lib/nfstay/types';

const STATUS_COLORS: Record<string, string> = {
  listed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  unlisted: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
};

type Tab = 'overview' | 'details' | 'photos' | 'availability' | 'pricing' | 'calendars';

export default function NfsPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { property, loading, error, refetch } = useNfsProperty(id || '');
  const { update, remove, saving } = useNfsPropertyMutation();
  const { operator } = useNfsOperator();
  const { upload, uploading } = useNfsImageUpload();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Property</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {error || 'Property not found.'}
        </div>
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    try {
      await update(property.id, { listing_status: status });
      refetch();
    } catch { /* error via hook */ }
  };

  const handleDelete = async () => {
    try {
      await remove(property.id);
      navigate(NFS_ROUTES.PROPERTIES, { replace: true });
    } catch { /* error via hook */ }
  };

  const handlePhotoUpload = async (file: File): Promise<string | null> => {
    if (!operator?.id) return null;
    try {
      const url = await upload(file, operator.id, property.id);
      if (url) {
        const newImages = [...(property.images || []), { url, caption: '', order: property.images?.length || 0 }];
        await update(property.id, { images: newImages });
        refetch();
        return url;
      }
      return null;
    } catch { return null; }
  };

  const handleImagesUpdate = async (images: NfsPropertyImage[]) => {
    try {
      await update(property.id, { images });
      refetch();
    } catch { /* error via hook */ }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'details', label: 'Details' },
    { key: 'photos', label: 'Photos' },
    { key: 'availability', label: 'Availability' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'calendars', label: 'Calendars' },
  ];

  const title = property.public_title || property.internal_title || 'Untitled Property';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(NFS_ROUTES.PROPERTIES)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Properties
          </Button>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[property.listing_status] || STATUS_COLORS.draft}`}>
            {property.listing_status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button data-feature="BOOKING_NFSTAY__DETAIL_DELETE" variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-destructive">Delete this property? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving}>Delete</Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/40">
        {tabs.map(tab => (
          <button
            key={tab.key}
            data-feature="BOOKING_NFSTAY__DETAIL_TAB"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab property={property} onStatusChange={handleStatusChange} saving={saving} />
      )}
      {activeTab === 'details' && (
        <DetailsTab property={property} onUpdate={async (fields) => { await update(property.id, fields); refetch(); }} saving={saving} />
      )}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <NfsPhotoUpload onUpload={handlePhotoUpload} uploading={uploading} />
          <NfsPhotoGallery
            images={property.images || []}
            onReorder={handleImagesUpdate}
            onDelete={async (idx) => {
              const newImages = [...(property.images || [])];
              newImages.splice(idx, 1);
              handleImagesUpdate(newImages.map((img, i) => ({ ...img, order: i })));
            }}
            onCaptionChange={async (idx, caption) => {
              const newImages = [...(property.images || [])];
              newImages[idx] = { ...newImages[idx], caption };
              handleImagesUpdate(newImages);
            }}
          />
        </div>
      )}
      {activeTab === 'availability' && (
        <div className="space-y-4 max-w-lg">
          <h3 className="text-lg font-semibold">Availability Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Availability Window</p>
              <p className="font-medium text-sm">{property.availability_window?.replace('_', ' ') || '2 years'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Advance Notice</p>
              <p className="font-medium text-sm">{property.advance_notice} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Minimum Stay</p>
              <p className="font-medium text-sm">{property.minimum_stay} nights</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Manage iCal feeds and blocked dates in the Calendars tab.</p>
        </div>
      )}
      {activeTab === 'pricing' && (
        <PricingTab property={property} onUpdate={async (fields) => { await update(property.id, fields); refetch(); }} saving={saving} />
      )}
      {activeTab === 'calendars' && (
        <PropertyCalendars property={property} onUpdate={async (fields) => { await update(property.id, fields); refetch(); }} saving={saving} />
      )}
    </div>
  );
}

function OverviewTab({ property, onStatusChange, saving }: { property: NfsProperty; onStatusChange: (s: string) => void; saving: boolean }) {
  const location = [property.city, property.country].filter(Boolean).join(', ');
  const enabledAmenities = Object.entries(property.amenities || {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-xl border border-border/40 p-5 space-y-3">
          <h3 className="font-semibold text-sm">Property Info</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Type:</span> {property.property_type || '—'}</div>
            <div><span className="text-muted-foreground">Rental:</span> {property.rental_type?.replace('_', ' ') || '—'}</div>
            <div><span className="text-muted-foreground">Guests:</span> {property.max_guests || '—'}</div>
            <div><span className="text-muted-foreground">Location:</span> {location || '—'}</div>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 p-5 space-y-3">
          <h3 className="font-semibold text-sm">Pricing</h3>
          <p className="text-2xl font-bold">{property.base_rate_currency} {property.base_rate_amount}<span className="text-sm font-normal text-muted-foreground"> / night</span></p>
          {property.cleaning_fee?.enabled && <p className="text-sm text-muted-foreground">Cleaning: {property.base_rate_currency} {property.cleaning_fee.amount}</p>}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-border/40 p-5 space-y-3">
          <h3 className="font-semibold text-sm">Status</h3>
          <div className="flex flex-wrap gap-2">
            {['listed', 'unlisted', 'archived', 'draft'].map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                disabled={saving || property.listing_status === s}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  property.listing_status === s
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border/40 hover:border-primary/30'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {enabledAmenities.length > 0 && (
          <div className="rounded-xl border border-border/40 p-5 space-y-3">
            <h3 className="font-semibold text-sm">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {enabledAmenities.map(a => (
                <span key={a} className="px-2.5 py-1 text-xs bg-muted/40 rounded-full">
                  {a.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsTab({ property, onUpdate, saving }: { property: NfsProperty; onUpdate: (f: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [title, setTitle] = useState(property.public_title || '');
  const [desc, setDesc] = useState(property.description || '');
  const [rules, setRules] = useState(property.rules || '');

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label>Public Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} disabled={saving} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          maxLength={2000}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">{desc.length}/2000</p>
      </div>
      <div className="space-y-2">
        <Label>House Rules</Label>
        <textarea
          className="w-full min-h-[80px] rounded-lg border border-border/40 bg-background px-3 py-2 text-sm"
          value={rules}
          onChange={e => setRules(e.target.value)}
          disabled={saving}
        />
      </div>
      <Button
        data-feature="BOOKING_NFSTAY__DETAIL_SAVE"
        onClick={() => onUpdate({ public_title: title || null, description: desc || null, rules: rules || null })}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}

function PricingTab({ property, onUpdate, saving }: { property: NfsProperty; onUpdate: (f: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [rate, setRate] = useState(property.base_rate_amount);
  const [currency, setCurrency] = useState(property.base_rate_currency);

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-6 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base Rate</Label>
          <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} disabled={saving} />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <select
            className="w-full h-10 rounded-lg border border-border/40 bg-background px-3 text-sm"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            disabled={saving}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>
      <Button
        data-feature="BOOKING_NFSTAY__DETAIL_SAVE"
        onClick={() => onUpdate({ base_rate_amount: rate, base_rate_currency: currency })}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}
