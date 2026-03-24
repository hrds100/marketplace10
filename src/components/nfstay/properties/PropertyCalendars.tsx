import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Plus, Trash2, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import type { NfsProperty } from '@/lib/nfstay/types';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';

interface InboundCalendar {
  url: string;
  name: string;
  added_at: string;
}

interface Props {
  property: NfsProperty;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function PropertyCalendars({ property, onUpdate, saving }: Props) {
  const [copied, setCopied] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  const outboundUrl = `${SUPABASE_URL}/functions/v1/nfs-ical-feed?property_id=${property.id}`;
  const inboundCalendars = (property.inbound_calendars || []) as InboundCalendar[];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outboundUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = outboundUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddInbound = async () => {
    setAddError('');
    const trimmed = newUrl.trim();

    if (!trimmed) {
      setAddError('Please enter a calendar URL.');
      return;
    }

    // Basic URL validation
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setAddError('URL must start with http:// or https://');
        return;
      }
    } catch {
      setAddError('Please enter a valid URL.');
      return;
    }

    // Check for duplicates
    if (inboundCalendars.some(c => c.url === trimmed)) {
      setAddError('This calendar URL is already added.');
      return;
    }

    const updated: InboundCalendar[] = [
      ...inboundCalendars,
      {
        url: trimmed,
        name: newName.trim() || new URL(trimmed).hostname,
        added_at: new Date().toISOString(),
      },
    ];

    try {
      await onUpdate({ inbound_calendars: updated });
      setNewUrl('');
      setNewName('');
    } catch {
      setAddError('Failed to save. Please try again.');
    }
  };

  const handleRemoveInbound = async (index: number) => {
    const updated = inboundCalendars.filter((_, i) => i !== index);
    try {
      await onUpdate({ inbound_calendars: updated });
    } catch {
      // Error handled by parent hook
    }
  };

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-8 max-w-2xl">
      {/* Outbound Calendar */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Outbound Calendar (Export)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Share this URL with Airbnb, VRBO, Booking.com, or Google Calendar to sync your availability.
          </p>
        </div>

        {property.listing_status !== 'listed' && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-800">
              Property must be <strong>listed</strong> for the calendar feed to be accessible. Current status: <strong>{property.listing_status}</strong>.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border/40 p-4 space-y-3">
          <Label className="text-xs text-muted-foreground">iCal Feed URL</Label>
          <div className="flex gap-2">
            <Input
              data-feature="BOOKING_NFSTAY__ICAL_OUTBOUND"
              value={outboundUrl}
              readOnly
              className="font-mono text-xs bg-muted/30"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              data-feature="BOOKING_NFSTAY__ICAL_COPY"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 min-w-[80px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This feed includes confirmed reservations and blocked dates. External platforms typically refresh every 15–60 minutes.
          </p>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-border/40" />

      {/* Inbound Calendars */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Inbound Calendars (Import)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add iCal feed URLs from other platforms to import their bookings and blocked dates into this property.
          </p>
        </div>

        {/* Existing inbound calendars */}
        {inboundCalendars.length > 0 ? (
          <div data-feature="BOOKING_NFSTAY__ICAL_INBOUND" className="space-y-2">
            {inboundCalendars.map((cal, index) => (
              <div
                key={`${cal.url}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border/40 p-3"
              >
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cal.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{cal.url}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveInbound(index)}
                  disabled={saving}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No inbound calendars yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add an iCal URL from Airbnb, VRBO, or any other platform below.
            </p>
          </div>
        )}

        {/* Add new inbound calendar */}
        <div className="rounded-xl border border-border/40 p-4 space-y-3">
          <Label className="text-sm font-medium">Add Calendar Feed</Label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Input
                placeholder="https://www.airbnb.com/calendar/ical/12345.ics"
                value={newUrl}
                onChange={(e) => { setNewUrl(e.target.value); setAddError(''); }}
                className="font-mono text-xs"
                disabled={saving}
              />
              <Input
                placeholder="Name (e.g. Airbnb, VRBO)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={saving}
              />
            </div>
            <Button
              data-feature="BOOKING_NFSTAY__ICAL_ADD"
              onClick={handleAddInbound}
              disabled={saving || !newUrl.trim()}
              className="self-start"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          {addError && (
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {addError}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Paste the iCal/ICS feed URL from your other booking platform. You can find this in your platform's calendar export settings.
          </p>
        </div>
      </section>
    </div>
  );
}
