import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsProperties } from '@/hooks/nfstay/use-nfs-properties';
import { useNfsReservationMutation } from '@/hooks/nfstay/use-nfs-reservation-mutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Save, AlertCircle } from 'lucide-react';

export default function NfsCreateReservation() {
  const navigate = useNavigate();
  const { properties, loading: propertiesLoading } = useNfsProperties();
  const { createReservation, creating, error } = useNfsReservationMutation();

  const [form, setForm] = useState({
    property_id: '',
    guest_first_name: '',
    guest_last_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    check_in_time: '15:00',
    check_out_time: '11:00',
    adults: 1,
    children: 0,
    pets: 0,
    total_amount: '',
    payment_currency: 'GBP',
    guest_message: '',
    status: 'confirmed',
  });

  const set = (field: string, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const listedProperties = properties.filter(p => p.listing_status !== 'archived');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.property_id || !form.check_in || !form.check_out || !form.total_amount) return;

    const result = await createReservation({
      property_id: form.property_id,
      guest_first_name: form.guest_first_name || null,
      guest_last_name: form.guest_last_name || null,
      guest_email: form.guest_email || null,
      guest_phone: form.guest_phone || null,
      check_in: form.check_in,
      check_out: form.check_out,
      check_in_time: form.check_in_time,
      check_out_time: form.check_out_time,
      adults: form.adults,
      children: form.children,
      pets: form.pets,
      total_amount: parseFloat(form.total_amount),
      payment_currency: form.payment_currency,
      guest_message: form.guest_message,
      status: form.status as any,
      payment_status: 'pending',
      booking_source: 'operator_direct',
    });

    if (result) {
      navigate('/nfstay/reservations');
    }
  };

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/nfstay/reservations')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Reservation</h1>
          <p className="text-sm text-muted-foreground mt-1">Manually create a booking for a guest.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
        {/* Property selection */}
        <div data-feature="BOOKING_NFSTAY__CREATE_PROPERTY" className="space-y-3">
          <h2 className="text-lg font-semibold">Property</h2>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.property_id}
            onChange={e => set('property_id', e.target.value)}
            required
          >
            <option value="">Select a property...</option>
            {propertiesLoading ? (
              <option disabled>Loading...</option>
            ) : (
              listedProperties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.public_title || p.internal_title || 'Untitled'} — {p.listing_status}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Guest info */}
        <div data-feature="BOOKING_NFSTAY__CREATE_GUEST" className="space-y-3">
          <h2 className="text-lg font-semibold">Guest Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="First name" value={form.guest_first_name} onChange={e => set('guest_first_name', e.target.value)} />
            <Input placeholder="Last name" value={form.guest_last_name} onChange={e => set('guest_last_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="email" placeholder="Email" value={form.guest_email} onChange={e => set('guest_email', e.target.value)} />
            <Input placeholder="Phone" value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)} />
          </div>
        </div>

        {/* Dates */}
        <div data-feature="BOOKING_NFSTAY__CREATE_DATES" className="space-y-3">
          <h2 className="text-lg font-semibold">Dates</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Check-in</label>
              <Input type="date" value={form.check_in} onChange={e => set('check_in', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Check-out</label>
              <Input type="date" value={form.check_out} onChange={e => set('check_out', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Check-in time</label>
              <Input type="time" value={form.check_in_time} onChange={e => set('check_in_time', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Check-out time</label>
              <Input type="time" value={form.check_out_time} onChange={e => set('check_out_time', e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Guests */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Guests</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Adults</label>
              <Input type="number" min={1} value={form.adults} onChange={e => set('adults', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Children</label>
              <Input type="number" min={0} value={form.children} onChange={e => set('children', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Pets</label>
              <Input type="number" min={0} value={form.pets} onChange={e => set('pets', parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Total amount</label>
              <Input type="number" step="0.01" min={0} placeholder="0.00" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Currency</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
                value={form.payment_currency}
                onChange={e => set('payment_currency', e.target.value)}
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Status</h2>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Textarea placeholder="Guest message or internal notes..." value={form.guest_message} onChange={e => set('guest_message', e.target.value)} />
        </div>

        <Button data-feature="BOOKING_NFSTAY__CREATE_SUBMIT" type="submit" disabled={creating}>
          <Save className="w-4 h-4 mr-2" />
          {creating ? 'Creating...' : 'Create Reservation'}
        </Button>
      </form>
    </div>
  );
}
