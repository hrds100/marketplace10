import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LOGO_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/public-assets/nfstay-logo-email.png';

export default function LeadNDAPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'nfstay - Partnership Agreement';
  }, []);

  useEffect(() => {
    if (!token) return;

    async function fetchInquiry() {
      try {
        const { data, error: fetchErr } = await (supabase
          .from('inquiries') as any)
          .select('id, nda_signed')
          .eq('token', token)
          .single();

        if (fetchErr || !data) {
          setError('This link has expired or is invalid.');
          setLoading(false);
          return;
        }

        // If NDA already signed, redirect to lead details
        if (data.nda_signed) {
          navigate(`/lead/${token}`, { replace: true });
          return;
        }

        setInquiryId(data.id);
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchInquiry();
  }, [token, navigate]);

  async function handleAgree() {
    if (!agreed || !inquiryId || !token) return;
    setSubmitting(true);

    try {
      const { error: updateErr } = await (supabase
        .from('inquiries') as any)
        .update({
          nda_signed: true,
          nda_signed_at: new Date().toISOString(),
        })
        .eq('token', token);

      if (updateErr) {
        toast.error('Failed to save agreement. Please try again.');
        setSubmitting(false);
        return;
      }

      toast.success('Agreement accepted');
      navigate(`/lead/${token}`, { replace: true });
    } catch {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F3EE' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1E9A80' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F3F3EE' }}>
        <div className="max-w-md w-full text-center">
          <a href="https://hub.nfstay.com">
            <img src={LOGO_URL} alt="nfstay" className="mx-auto mb-6" style={{ width: 100 }} />
          </a>
          <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#E5E7EB' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>Link not found</h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>{error}</p>
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

        {/* NDA card */}
        <div className="bg-white rounded-xl border p-6 sm:p-8" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
              <FileText className="h-5 w-5" style={{ color: '#1E9A80' }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
              Quick Partnership Agreement
            </h2>
          </div>

          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              As part of our deal sourcer programme, if you successfully close a deal with this tenant, a
              {' '}<strong>£250 introduction fee</strong> applies. In return, we commit to consistently
              sending you quality leads.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#374151' }}>
              Non-payment results in removal from the platform and discontinued lead flow.
            </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 focus:ring-2"
              style={{ accentColor: '#1E9A80' }}
            />
            <span className="text-sm" style={{ color: '#374151' }}>
              I have read and agree to the above terms
            </span>
          </label>

          {/* Submit button */}
          <button
            onClick={handleAgree}
            disabled={!agreed || submitting}
            className="w-full py-3 px-6 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              backgroundColor: agreed ? '#1E9A80' : '#9CA3AF',
              cursor: agreed && !submitting ? 'pointer' : 'not-allowed',
              opacity: agreed ? 1 : 0.6,
            }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              'I Agree - Show Me The Lead'
            )}
          </button>
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
