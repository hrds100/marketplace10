import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Copy, Check, User, Mail, Phone, MapPin, MessageSquare, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LOGO_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/public-assets/nfstay-logo-email.png';

interface Inquiry {
  id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_id: string | null;
  lister_type: string | null;
  nda_signed: boolean;
  message: string | null;
  status: string | null;
  viewed_at: string | null;
  created_at: string;
}

interface Property {
  name: string;
  city: string;
  postcode: string;
}

export default function LeadDetailsPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'nfstay - Lead Details';
  }, []);

  useEffect(() => {
    if (!token) return;

    async function fetchInquiry() {
      try {
        // Fetch inquiry by token (RLS allows public read by token)
        const { data, error: fetchErr } = await (supabase
          .from('inquiries') as any)
          .select('*')
          .eq('token', token)
          .single();

        if (fetchErr || !data) {
          setError('This link has expired or is invalid.');
          setLoading(false);
          return;
        }

        const inq = data as Inquiry;

        // If deal sourcer and NDA not signed, redirect to NDA page
        if (inq.lister_type === 'deal_sourcer' && !inq.nda_signed) {
          navigate(`/lead/${token}/nda`, { replace: true });
          return;
        }

        setInquiry(inq);

        // Mark as viewed if not already
        if (!inq.viewed_at) {
          await (supabase.from('inquiries') as any)
            .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
            .eq('token', token);
        }

        // Fetch property details
        if (inq.property_id) {
          const { data: prop } = await (supabase
            .from('properties') as any)
            .select('name, city, postcode')
            .eq('id', inq.property_id)
            .single();

          if (prop) setProperty(prop as Property);
        }
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchInquiry();
  }, [token, navigate]);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F3EE' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1E9A80' }} />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F3F3EE' }}>
        <div className="max-w-md w-full text-center">
          <a href="https://hub.nfstay.com">
            <img src={LOGO_URL} alt="nfstay" className="mx-auto mb-6" style={{ width: 100 }} />
          </a>
          <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#E5E7EB' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>Link not found</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {error || 'This link has expired or is invalid.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16" style={{ backgroundColor: '#F3F3EE' }}>
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <a href="https://hub.nfstay.com">
            <img src={LOGO_URL} alt="nfstay" className="mx-auto" style={{ width: 100 }} />
          </a>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-xl border p-6 sm:p-8" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>Tenant Details</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            A tenant has inquired about your property.
          </p>

          {/* Tenant info rows */}
          <div className="space-y-3 mb-6">
            {inquiry.tenant_name && (
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 flex-shrink-0" style={{ color: '#6B7280' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Name</p>
                    <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{inquiry.tenant_name}</p>
                  </div>
                </div>
              </div>
            )}

            {inquiry.tenant_phone && (
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: '#6B7280' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Phone</p>
                    <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{inquiry.tenant_phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(inquiry.tenant_phone!, 'phone')}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-50"
                  aria-label="Copy phone"
                >
                  {copiedField === 'phone'
                    ? <Check className="h-4 w-4" style={{ color: '#1E9A80' }} />
                    : <Copy className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                  }
                </button>
              </div>
            )}

            {inquiry.tenant_email && (
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 flex-shrink-0" style={{ color: '#6B7280' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Email</p>
                    <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{inquiry.tenant_email}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(inquiry.tenant_email!, 'email')}
                  className="p-2 rounded-lg transition-colors hover:bg-gray-50"
                  aria-label="Copy email"
                >
                  {copiedField === 'email'
                    ? <Check className="h-4 w-4" style={{ color: '#1E9A80' }} />
                    : <Copy className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                  }
                </button>
              </div>
            )}
          </div>

          {/* Property info */}
          {property && (
            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#F3F3EE' }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4" style={{ color: '#1E9A80' }} />
                <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{property.name}</p>
              </div>
              <p className="text-xs ml-6" style={{ color: '#6B7280' }}>
                {property.city}{property.postcode ? `, ${property.postcode}` : ''}
              </p>
            </div>
          )}

          {/* Message */}
          {inquiry.message && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4" style={{ color: '#6B7280' }} />
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Message</p>
              </div>
              <p className="text-sm rounded-lg p-3" style={{ color: '#374151', backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                {inquiry.message}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
            <Clock className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Received {formatDate(inquiry.created_at)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            nfstay &middot;{' '}
            <a href="https://hub.nfstay.com" className="hover:underline" style={{ color: '#1E9A80' }}>
              hub.nfstay.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
