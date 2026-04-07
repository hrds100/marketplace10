// Admin: Operator detail view with stats, properties, and reservations
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  ArrowLeft, Globe, Building2, Phone, Mail, Loader2, RefreshCw,
  AlertCircle, CheckCircle, Clock, XCircle, Users, Calendar,
  DollarSign, TrendingUp, Percent, MapPin, ExternalLink, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OperatorDetail {
  id: string;
  profile_id: string;
  brand_name: string | null;
  legal_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  accent_color: string | null;
  listings_count: number;
  onboarding_step: string;
  created_at: string;
}

interface PropertyRow {
  id: string;
  public_title: string | null;
  city: string | null;
  country: string | null;
  listing_status: string;
  base_rate_amount: number | null;
  base_rate_currency: string | null;
  max_guests: number | null;
  created_at: string;
}

interface ReservationRow {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  payment_currency: string;
  status: string;
  payment_status: string;
  created_at: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  propertyTitle?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed:  { label: 'Confirmed',  color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700',  icon: Clock },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700',      icon: XCircle },
  completed:  { label: 'Completed',  color: 'bg-blue-100 text-blue-700',    icon: CheckCircle },
  no_show:    { label: 'No-show',    color: 'bg-gray-100 text-gray-600',    icon: AlertCircle },
  expired:    { label: 'Expired',    color: 'bg-gray-100 text-gray-500',    icon: Clock },
};

const LISTING_STATUS_COLORS: Record<string, string> = {
  listed:   'bg-green-100 text-green-700',
  draft:    'bg-amber-100 text-amber-700',
  unlisted: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-700',
};

export default function AdminNfsOperatorDetail() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();

  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!operatorId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch operator
      const { data: opData, error: opErr } = await (supabase.from('nfs_operators') as any)
        .select('id, profile_id, brand_name, legal_name, contact_email, contact_phone, contact_whatsapp, subdomain, custom_domain, accent_color, listings_count, onboarding_step, created_at')
        .eq('id', operatorId)
        .single();

      if (opErr) { setError(opErr.message); setLoading(false); return; }
      setOperator(opData);

      // 2. Fetch properties
      const { data: propData, error: propErr } = await (supabase.from('nfs_properties') as any)
        .select('id, public_title, city, country, listing_status, base_rate_amount, base_rate_currency, max_guests, created_at')
        .eq('operator_id', operatorId)
        .order('created_at', { ascending: false });

      if (propErr) { setError(propErr.message); setLoading(false); return; }
      setProperties(propData || []);

      // 3. Fetch reservations via property IDs
      const propIds = (propData || []).map((p: PropertyRow) => p.id);
      if (propIds.length > 0) {
        const { data: resData, error: resErr } = await (supabase.from('nfs_reservations') as any)
          .select('id, property_id, check_in, check_out, adults, children, total_amount, payment_currency, status, payment_status, created_at, guest_first_name, guest_last_name, guest_email')
          .in('property_id', propIds)
          .order('created_at', { ascending: false })
          .limit(200);

        if (resErr) { setError(resErr.message); setLoading(false); return; }

        // Map property titles
        const titleMap: Record<string, string> = {};
        (propData || []).forEach((p: PropertyRow) => {
          titleMap[p.id] = p.public_title || 'Untitled';
        });

        setReservations((resData || []).map((r: any) => ({
          ...r,
          propertyTitle: titleMap[r.property_id] || 'Unknown',
        })));
      } else {
        setReservations([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load operator');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="p-6 max-w-7xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/booking-site/operators')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Operators
        </Button>
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error || 'Operator not found'}
        </div>
      </div>
    );
  }

  // Compute stats
  const totalProperties = properties.length;
  const activeListings = properties.filter(p => p.listing_status === 'listed').length;
  const totalBookings = reservations.length;
  const confirmedBookings = reservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length;
  const pendingBookings = reservations.filter(r => r.status === 'pending').length;
  const cancelledBookings = reservations.filter(r => r.status === 'cancelled').length;
  const revenue = reservations
    .filter(r => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const avgBookingValue = confirmedBookings > 0 ? revenue / confirmedBookings : 0;
  const cancelRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

  // Average length of stay
  const stayLengths = reservations
    .filter(r => r.status === 'confirmed' || r.status === 'completed')
    .map(r => Math.ceil((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 86400000));
  const avgStay = stayLengths.length > 0
    ? (stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length).toFixed(1)
    : '0';

  // Top performing property (most bookings)
  const bookingsPerProperty: Record<string, number> = {};
  reservations.forEach(r => {
    bookingsPerProperty[r.property_id] = (bookingsPerProperty[r.property_id] || 0) + 1;
  });
  let topPropertyId = '';
  let topPropertyCount = 0;
  Object.entries(bookingsPerProperty).forEach(([pid, count]) => {
    if (count > topPropertyCount) { topPropertyId = pid; topPropertyCount = count; }
  });
  const topProperty = properties.find(p => p.id === topPropertyId);

  // Monthly revenue (last 6 months)
  const monthlyRevenue: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = format(d, 'MMM yyyy');
    const amount = reservations
      .filter(r => {
        if (r.status !== 'confirmed' && r.status !== 'completed') return false;
        const rd = new Date(r.created_at);
        return rd.getFullYear() === year && rd.getMonth() === month;
      })
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
    monthlyRevenue.push({ month: label, amount });
  }
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.amount), 1);

  // Recent 10 reservations
  const recentReservations = reservations.slice(0, 10);

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/booking-site/operators')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {operator.brand_name || operator.legal_name || 'Unnamed Operator'}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">ID: {operator.id}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Profile Section */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {operator.brand_name && (
            <div>
              <p className="text-xs text-muted-foreground">Brand Name</p>
              <p className="font-medium">{operator.brand_name}</p>
            </div>
          )}
          {operator.legal_name && (
            <div>
              <p className="text-xs text-muted-foreground">Legal Name</p>
              <p className="font-medium">{operator.legal_name}</p>
            </div>
          )}
          {operator.contact_email && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                {operator.contact_email}
              </p>
            </div>
          )}
          {operator.contact_phone && (
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                {operator.contact_phone}
              </p>
            </div>
          )}
          {operator.contact_whatsapp && (
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="font-medium flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                {operator.contact_whatsapp}
              </p>
            </div>
          )}
          {operator.subdomain && (
            <div>
              <p className="text-xs text-muted-foreground">Subdomain</p>
              <a
                href={`https://${operator.subdomain}.nfstay.app`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium flex items-center gap-1.5 text-[#1E9A80] hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {operator.subdomain}.nfstay.app
              </a>
            </div>
          )}
          {operator.custom_domain && (
            <div>
              <p className="text-xs text-muted-foreground">Custom Domain</p>
              <a
                href={`https://${operator.custom_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium flex items-center gap-1.5 text-[#1E9A80] hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {operator.custom_domain}
              </a>
            </div>
          )}
          {operator.accent_color && (
            <div>
              <p className="text-xs text-muted-foreground">Accent Color</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: operator.accent_color }}
                />
                <span className="font-mono text-xs">{operator.accent_color}</span>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Onboarding Step</p>
            <p className="font-medium capitalize">{operator.onboarding_step.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account Created</p>
            <p className="font-medium">{format(new Date(operator.created_at), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Properties', value: totalProperties, icon: Building2, color: 'text-foreground' },
          { label: 'Active Listings', value: activeListings, icon: CheckCircle, color: 'text-[#1E9A80]' },
          { label: 'Total Bookings', value: totalBookings, icon: Calendar, color: 'text-foreground' },
          { label: 'Confirmed', value: confirmedBookings, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Pending', value: pendingBookings, icon: Clock, color: 'text-amber-600' },
          { label: 'Revenue', value: `£${revenue.toFixed(0)}`, icon: DollarSign, color: 'text-blue-600' },
          { label: 'Avg Booking Value', value: `£${avgBookingValue.toFixed(0)}`, icon: TrendingUp, color: 'text-blue-600' },
          { label: 'Cancel Rate', value: `${cancelRate.toFixed(1)}%`, icon: Percent, color: cancelRate > 20 ? 'text-red-600' : 'text-foreground' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Extra stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Avg Length of Stay</p>
          <p className="text-2xl font-bold mt-1">{avgStay} nights</p>
        </div>
        {topProperty && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Top Property</p>
            <p className="text-sm font-semibold mt-1 line-clamp-1">{topProperty.public_title || 'Untitled'}</p>
            <p className="text-xs text-muted-foreground">{topPropertyCount} booking{topPropertyCount !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {/* Monthly Revenue Breakdown */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Monthly Revenue (Last 6 Months)</h2>
        <div className="space-y-2">
          {monthlyRevenue.map(m => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{m.month}</span>
              <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-[#1E9A80] rounded-full transition-all"
                  style={{ width: `${(m.amount / maxMonthlyRevenue) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold w-16 text-right">£{m.amount.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Properties List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Properties ({totalProperties})</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties yet.</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-muted/30">
                    {['Title', 'Location', 'Status', 'Nightly Rate', 'Max Guests', 'Created'].map(h => (
                      <th key={h} className="p-4 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {properties.map(p => {
                    const location = [p.city, p.country].filter(Boolean).join(', ');
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium line-clamp-1">{p.public_title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}...</p>
                        </td>
                        <td className="px-4 py-3">
                          {location && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" /> {location}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${LISTING_STATUS_COLORS[p.listing_status] || 'bg-gray-100 text-gray-600'}`}>
                            {p.listing_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {p.base_rate_amount ? `${p.base_rate_currency || '£'} ${p.base_rate_amount}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {p.max_guests ? (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" /> {p.max_guests}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {format(new Date(p.created_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Bookings ({totalBookings} total)</h2>
        {recentReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reservations yet.</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-muted/30">
                    {['Guest', 'Property', 'Dates', 'Status', 'Amount'].map(h => (
                      <th key={h} className="p-4 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map(r => {
                    const statusCfg = STATUS_CONFIG[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600', icon: Clock };
                    const StatusIcon = statusCfg.icon;
                    const nights = Math.ceil(
                      (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 86400000
                    );
                    const guestName = [r.guest_first_name, r.guest_last_name].filter(Boolean).join(' ') || '-';

                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{guestName}</p>
                          <p className="text-xs text-muted-foreground">{r.guest_email || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium line-clamp-1">{r.propertyTitle}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{format(new Date(r.check_in), 'MMM d')} - {format(new Date(r.check_out), 'MMM d, yy')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{nights} night{nights !== 1 ? 's' : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {r.payment_currency} {r.total_amount?.toFixed(2) || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
