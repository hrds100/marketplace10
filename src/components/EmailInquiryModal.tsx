import { useState } from 'react';
import { X, Mail, Loader2, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ListingShape } from '@/components/InquiryPanel';

interface Props {
  open: boolean;
  listing: ListingShape | null;
  onClose: () => void;
  onContactSuccess?: (propertyId: string) => void;
}

export default function EmailInquiryModal({ open, listing, onClose, onContactSuccess }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.user_metadata?.whatsapp || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset form when listing changes
  const listingId = listing?.id;
  const [lastListingId, setLastListingId] = useState<string | null>(null);
  if (listingId && listingId !== lastListingId) {
    setLastListingId(listingId);
    setSent(false);
    setName(user?.user_metadata?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.user_metadata?.whatsapp || '');
    setMessage(
      listing
        ? `I would like to inquire about your property on nfstay.\nLink: https://hub.nfstay.com/deals/${listing.slug || listing.id}\nReference no.: ${listing.id.slice(0, 5).toUpperCase()}\nPlease contact me at your earliest convenience.`
        : '',
    );
  }

  if (!open || !listing) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('process-inquiry', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          property_id: listing!.id,
          channel: 'email',
          message: message.trim(),
          tenant_name: name.trim(),
          tenant_email: email.trim(),
          tenant_phone: phone.trim(),
          property_url: `https://hub.nfstay.com/deals/${listing!.slug || listing!.id}`,
        },
      });
      if (error) throw error;
      setSent(true);
      onContactSuccess?.(listing!.id);
    } catch (err) {
      toast.error('Failed to send inquiry. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl border w-full max-w-md mx-auto overflow-hidden"
        style={{ borderColor: '#E5E7EB' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: '#1E9A80' }} />
            <h3 className="text-base font-bold" style={{ color: '#1A1A1A' }}>
              Email for more information
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="h-5 w-5" style={{ color: '#9CA3AF' }} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: '#1E9A80' }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>
              Your message has been sent!
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Our partner will get in touch with you soon.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#1E9A80' }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name*"
              required
              className="w-full h-11 rounded-[10px] border px-3 text-sm"
              style={{ borderColor: '#E5E5E5', color: '#0A0A0A' }}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email*"
              required
              type="email"
              className="w-full h-11 rounded-[10px] border px-3 text-sm"
              style={{ borderColor: '#E5E5E5', color: '#0A0A0A' }}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 phone number"
              className="w-full h-11 rounded-[10px] border px-3 text-sm"
              style={{ borderColor: '#E5E5E5', color: '#0A0A0A' }}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border px-3 py-2.5 text-sm resize-none"
              style={{ borderColor: '#E5E5E5', color: '#0A0A0A' }}
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full h-11 rounded-[10px] text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1E9A80' }}
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Mail className="h-4 w-4" /> Send Email</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
