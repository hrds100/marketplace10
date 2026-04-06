import { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
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
  channel?: 'email' | 'whatsapp';
  contacted?: boolean;
}

const PLACEHOLDERS = [
  'Tell the landlord about your SA experience…',
  'Ask about viewings and availability…',
  'Mention your business plan or portfolio…',
  'Ask about rent terms and move-in dates…',
];

export default function InquiryChatModal({ open, listing, onClose, onContactSuccess, channel = 'email', contacted = false }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  // Earnings slider
  const monthlyRent = listing?.rent || 0;
  const [nightsBooked, setNightsBooked] = useState(27);
  const nightlyRate = (() => {
    const profit = listing?.profit || 0;
    if (profit > 0 && monthlyRent > 0) return Math.max(20, Math.min(500, Math.round((monthlyRent + profit) / 27)));
    return 85;
  })();
  const estimatedProfit = Math.max(0, (nightsBooked * nightlyRate) - monthlyRent);
  const sliderPercent = ((nightsBooked - 5) / 25) * 100;

  // Typewriter
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (sent || contacted || inputValue) return;
    const phrase = PLACEHOLDERS[phraseIdx];
    if (charIdx < phrase.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 40);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPhraseIdx(p => (p + 1) % PLACEHOLDERS.length);
      setCharIdx(0);
    }, 1200);
    return () => clearTimeout(t);
  }, [charIdx, phraseIdx, sent, contacted, inputValue]);

  useEffect(() => {
    if (sent || contacted) return;
    const id = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(id);
  }, [sent, contacted]);

  const typedText = PLACEHOLDERS[phraseIdx].slice(0, charIdx);
  const cursor = cursorVisible ? '▌' : ' ';

  // Reset on listing change
  const listingId = listing?.id;
  const [lastListingId, setLastListingId] = useState<string | null>(null);
  if (listingId && listingId !== lastListingId) {
    setLastListingId(listingId);
    setSent(false);
    setSentMessage('');
    setInputValue('');
    setNightsBooked(27);
    setPhraseIdx(0);
    setCharIdx(0);
  }

  if (!open || !listing) return null;

  const isContacted = contacted || sent;

  async function handleSend() {
    if (!inputValue.trim() || sending) return;
    if (!user) { toast.error('Please sign in to inquire'); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session?.access_token) {
        toast.error('Your session expired. Please sign out and sign back in.');
        setSending(false);
        return;
      }
      const { error } = await supabase.functions.invoke('process-inquiry', {
        body: {
          property_id: listing.id,
          channel,
          message: inputValue.trim(),
          tenant_name: user.user_metadata?.name || '',
          tenant_email: user.email || '',
          tenant_phone: user.user_metadata?.whatsapp || '',
          property_url: `https://hub.nfstay.com/deals/${listing.slug || listing.id}`,
        },
      });
      if (error) throw error;
      setSentMessage(inputValue.trim());
      setSent(true);
      setInputValue('');
      onContactSuccess?.(listing.id);

      // Auto-add to CRM
      try {
        const { data: existing } = await supabase.from('crm_deals').select('id').eq('user_id', user.id).eq('property_id', listing.id).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('crm_deals').insert({
            user_id: user.id, name: listing.name, city: listing.city, postcode: listing.postcode,
            rent: listing.rent, profit: listing.profit, type: listing.type, stage: 'New Lead',
            notes: 'Added after inquiry', property_id: listing.id,
          });
        }
      } catch { /* non-blocking */ }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('401') || msg.includes('expired')) toast.error('Your session expired. Please sign out and sign back in.');
      else if (msg.includes('404')) toast.error('This property could not be found.');
      else toast.error('Failed to send inquiry. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const accentColor = channel === 'whatsapp' ? '#25D366' : '#1E9A80';
  const propertyImage = listing.image && !listing.image.includes('placehold.co') ? listing.image : null;
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg mx-auto overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh', borderColor: '#E5E7EB' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1 rounded-lg hover:bg-gray-50 transition-colors">
          <X className="h-5 w-5" style={{ color: '#9CA3AF' }} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2">
          {/* Property header */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gray-100 shadow-sm overflow-hidden" style={{ borderRadius: '16px' }}>
                {propertyImage ? (
                  <img src={propertyImage} alt="" className="w-full h-full object-cover" style={{ borderRadius: '16px' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{listing.name}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{listing.city}{listing.postcode ? ` · ${listing.postcode}` : ''}</p>
            </div>
          </div>

          {/* Earnings section — hide after sent */}
          {!isContacted && (
            <div className="mb-4 space-y-2">
              <h2 className="text-2xl font-bold text-center leading-snug" style={{ color: '#1A1A1A' }}>
                You could earn{' '}
                <span style={{ color: '#1E9A80' }}>£{estimatedProfit.toLocaleString()}/month</span>
                {' '}hosting on Airbnb
              </h2>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Nights booked / month</span>
                  <span className="text-[10px] font-medium" style={{ color: '#1E9A80' }}>{nightsBooked} nights</span>
                </div>
                <input
                  type="range" min={5} max={30} step={1}
                  value={nightsBooked}
                  onChange={e => setNightsBooked(parseInt(e.target.value))}
                  className="w-full rounded-full appearance-none cursor-pointer outline-none"
                  style={{
                    height: '3px',
                    background: `linear-gradient(to right, #1E9A80 0%, #1E9A80 ${sliderPercent}%, #E5E7EB ${sliderPercent}%, #E5E7EB 100%)`,
                  }}
                />
                <div className="flex justify-between text-[9px]" style={{ color: '#9CA3AF' }}>
                  <span>5</span><span>30</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px]" style={{ color: '#9CA3AF' }}>
                <span>Nightly: £{nightlyRate}</span>
                <span>·</span>
                <span>Rent: £{monthlyRent.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Sent message bubble */}
          {isContacted && sentMessage && (
            <div className="flex justify-end mb-3">
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl" style={{ backgroundColor: '#111111' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{sentMessage}</p>
                <div className="text-[10px] mt-1 text-gray-400">{now}</div>
              </div>
            </div>
          )}

          {/* System confirmation */}
          {isContacted && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: accentColor }} />
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                Inquiry sent to the landlord or agent
              </p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                They'll be in touch with you shortly.
              </p>
            </div>
          )}

          {/* Already contacted notice (from prop) */}
          {contacted && !sentMessage && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: accentColor }} />
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                You've already contacted the landlord or agent
              </p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                Please wait for them to get back to you.
              </p>
            </div>
          )}
        </div>

        {/* Composer — or disabled state */}
        <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: '#E5E7EB' }}>
          {isContacted ? (
            <div className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
              <CheckCircle className="w-4 h-4" />
              Already contacted
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E5E7EB' }}>
              <div className="px-4 pt-3 pb-2 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm focus:outline-none leading-relaxed"
                  style={{ minHeight: 60, color: '#0A0A0A' }}
                />
                {!inputValue && (
                  <div className="absolute inset-0 px-4 pt-3 pointer-events-none">
                    <span className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
                      {typedText}<span style={{ color: '#D1D5DB' }}>{cursor}</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: '#F3F4F6' }}>
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  Personalise your message to increase your chance of a response
                </span>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className="p-2 rounded-lg transition-colors disabled:opacity-40"
                  style={{ backgroundColor: inputValue.trim() ? accentColor : '#E5E7EB', color: '#FFFFFF' }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
