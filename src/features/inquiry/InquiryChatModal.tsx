import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, CheckCircle, LayoutGrid, Plus, Pencil, Trash2 } from 'lucide-react';
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

const DEFAULT_TEMPLATES = [
  { title: 'Arrange viewing', body: "Hi, I'd love to arrange a viewing for this property. What day works best for you?", category: 'Viewing' },
  { title: 'Ask about property', body: "Could you tell me more about the property? I'm particularly interested in the SA approval status and any existing tenancy.", category: 'Property Info' },
  { title: 'Express interest', body: "I'm very interested in this opportunity. I run a serviced accommodation business and would love to discuss terms.", category: 'Interest' },
  { title: 'Request documents', body: 'Could you share the compliance documents and any existing EPC/gas safety certificates?', category: 'Documents' },
];

interface Template { id: string; title: string; body: string; category: string }

export default function InquiryChatModal({ open, listing, onClose, onContactSuccess, channel = 'email', contacted = false }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const loadTemplates = useCallback(async () => {
    if (!user?.id || templatesLoaded) return;
    try {
      const { data, error, count } = await supabase
        .from('message_templates')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      if (count === 0 || !data || data.length === 0) {
        const seedRows = DEFAULT_TEMPLATES.map(r => ({ ...r, user_id: user.id }));
        const { data: seeded } = await supabase.from('message_templates').insert(seedRows).select();
        setTemplates((seeded || []).map(r => ({ id: r.id, title: r.title, body: r.body, category: r.category || '' })));
      } else {
        setTemplates(data.map(r => ({ id: r.id, title: r.title, body: r.body, category: r.category || '' })));
      }
      setTemplatesLoaded(true);
    } catch { toast.error('Could not load templates'); }
  }, [user?.id, templatesLoaded]);

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from('message_templates').delete().eq('id', id);
    setTemplates(t => t.filter(r => r.id !== id));
  };

  const handleSaveTemplate = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user?.id) return;
    if (editingTemplate) {
      await supabase.from('message_templates').update({ title: newTitle.trim(), body: newBody.trim() }).eq('id', editingTemplate.id);
      setTemplates(t => t.map(r => r.id === editingTemplate.id ? { ...r, title: newTitle.trim(), body: newBody.trim() } : r));
    } else {
      const { data } = await supabase.from('message_templates').insert({ title: newTitle.trim(), body: newBody.trim(), category: 'Custom', user_id: user.id }).select().single();
      if (data) setTemplates(t => [...t, { id: data.id, title: data.title, body: data.body, category: data.category || '' }]);
    }
    setEditingTemplate(null);
    setNewTitle('');
    setNewBody('');
  };

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
    const t = setTimeout(() => { setPhraseIdx(p => (p + 1) % PLACEHOLDERS.length); setCharIdx(0); }, 1200);
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
    setShowTemplates(false);
  }

  if (!open || !listing) return null;

  const isContacted = contacted || sent;

  async function handleSend() {
    if (!inputValue.trim() || sending) return;
    if (!user) { toast.error('Please sign in to inquire'); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session?.access_token) { toast.error('Your session expired. Please sign out and sign back in.'); setSending(false); return; }
      const { error } = await supabase.functions.invoke('process-inquiry', {
        body: {
          property_id: listing.id, channel,
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

      // Auto-add to CRM with the message
      try {
        const { data: existing } = await supabase.from('crm_deals').select('id').eq('user_id', user.id).eq('property_id', listing.id).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('crm_deals').insert({
            user_id: user.id, name: listing.name, city: listing.city, postcode: listing.postcode,
            rent: listing.rent, profit: listing.profit, type: listing.type, stage: 'New Lead',
            notes: inputValue.trim(), property_id: listing.id,
          });
        }
      } catch { /* non-blocking */ }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('401') || msg.includes('expired')) toast.error('Your session expired. Please sign out and sign back in.');
      else if (msg.includes('404')) toast.error('This property could not be found.');
      else toast.error('Failed to send inquiry. Please try again.');
    } finally { setSending(false); }
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
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1 rounded-lg hover:bg-gray-50 transition-colors">
          <X className="h-5 w-5" style={{ color: '#9CA3AF' }} />
        </button>

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

          {/* Earnings section */}
          {!isContacted && (
            <div className="mb-4 space-y-2">
              <h2 className="text-2xl font-bold text-center leading-snug" style={{ color: '#1A1A1A' }}>
                You could earn{' '}
                <span style={{ color: '#1E9A80' }}>£{estimatedProfit.toLocaleString()}/month</span>
                {' '}hosting this property on Airbnb
              </h2>
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Nights booked / month</span>
                  <span className="text-[10px] font-medium" style={{ color: '#1E9A80' }}>{nightsBooked} nights</span>
                </div>
                <input type="range" min={5} max={30} step={1} value={nightsBooked}
                  onChange={e => setNightsBooked(parseInt(e.target.value))}
                  className="w-full rounded-full appearance-none cursor-pointer outline-none"
                  style={{ height: '3px', background: `linear-gradient(to right, #1E9A80 0%, #1E9A80 ${sliderPercent}%, #E5E7EB ${sliderPercent}%, #E5E7EB 100%)` }} />
                <div className="flex justify-between text-[9px]" style={{ color: '#9CA3AF' }}><span>5</span><span>30</span></div>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px]" style={{ color: '#9CA3AF' }}>
                <span>Nightly: £{nightlyRate}</span><span>·</span><span>Rent: £{monthlyRent.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Sent message bubble — CENTRED */}
          {isContacted && sentMessage && (
            <div className="flex justify-center mb-3">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl" style={{ backgroundColor: '#111111' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{sentMessage}</p>
                <div className="text-[10px] mt-1 text-gray-400 text-right">{now}</div>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {isContacted && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: accentColor }} />
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                {contacted && !sent ? "You've already contacted the landlord or agent" : "We've sent your inquiry to the landlord or agent"}
              </p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                {contacted && !sent ? 'Please wait for them to get back to you.' : "They'll be in touch with you shortly."}
              </p>
            </div>
          )}
        </div>

        {/* Composer or disabled state */}
        <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: '#E5E7EB' }}>
          {isContacted ? (
            <div className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm" style={{ backgroundColor: '#F3F3EE', color: '#6B7280' }}>
              <CheckCircle className="w-4 h-4" /> Already contacted
            </div>
          ) : (
            <div className="relative">
              <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#E5E7EB' }}>
                <div className="px-4 pt-3 pb-2 relative">
                  <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="" rows={2}
                    className="w-full resize-none bg-transparent text-sm focus:outline-none leading-relaxed"
                    style={{ minHeight: 60, color: '#0A0A0A' }} />
                  {!inputValue && (
                    <div className="absolute inset-0 px-4 pt-3 pointer-events-none">
                      <span className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
                        {typedText}<span style={{ color: '#D1D5DB' }}>{cursor}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: '#F3F4F6' }}>
                  <button
                    type="button"
                    onClick={() => { setShowTemplates(!showTemplates); if (!templatesLoaded) loadTemplates(); }}
                    className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Message templates"
                  >
                    <LayoutGrid className={`w-5 h-5 ${!inputValue ? 'text-emerald-500' : ''}`} style={{ color: inputValue ? '#9CA3AF' : undefined }} />
                  </button>
                  <span className="text-[10px] flex-1 text-center" style={{ color: '#9CA3AF' }}>
                    Personalise your message to increase your chance of a response
                  </span>
                  <button onClick={handleSend} disabled={!inputValue.trim() || sending}
                    className="p-2 rounded-lg transition-colors disabled:opacity-40"
                    style={{ backgroundColor: inputValue.trim() ? accentColor : '#E5E7EB', color: '#FFFFFF' }}>
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Templates popup */}
              {showTemplates && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-2xl shadow-xl overflow-hidden z-20" style={{ borderColor: '#E5E7EB', maxHeight: 320 }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                    <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                      {editingTemplate !== null ? (editingTemplate ? 'Edit Template' : 'New Template') : 'Message Templates'}
                    </span>
                    <button onClick={() => { setShowTemplates(false); setEditingTemplate(null); setNewTitle(''); setNewBody(''); }}
                      className="p-1 rounded-lg hover:bg-gray-50">
                      <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                    </button>
                  </div>

                  {editingTemplate !== null ? (
                    <div className="p-4 space-y-3">
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Template name"
                        className="w-full h-9 rounded-lg border px-3 text-sm" style={{ borderColor: '#E5E5E5' }} />
                      <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Template message"
                        className="w-full rounded-lg border px-3 py-2 text-sm resize-none" style={{ borderColor: '#E5E5E5', minHeight: 80 }} />
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingTemplate(null); setNewTitle(''); setNewBody(''); }}
                          className="flex-1 h-9 rounded-lg border text-xs font-medium" style={{ borderColor: '#E5E7EB' }}>Cancel</button>
                        <button onClick={handleSaveTemplate} disabled={!newTitle.trim() || !newBody.trim()}
                          className="flex-1 h-9 rounded-lg text-xs font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#1E9A80' }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
                      {templates.map(t => (
                        <div key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer group border-b" style={{ borderColor: '#F3F4F6' }}
                          onClick={() => { setInputValue(t.body); setShowTemplates(false); inputRef.current?.focus(); }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>{t.title}</p>
                            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: '#6B7280' }}>{t.body}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={e => { e.stopPropagation(); setEditingTemplate(t); setNewTitle(t.title); setNewBody(t.body); }}
                              className="p-1 rounded hover:bg-gray-100"><Pencil className="w-3 h-3" style={{ color: '#9CA3AF' }} /></button>
                            <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                              className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3" style={{ color: '#EF4444' }} /></button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => { setEditingTemplate({ id: '', title: '', body: '', category: '' }); setNewTitle(''); setNewBody(''); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-medium hover:bg-gray-50 transition-colors" style={{ color: '#1E9A80' }}>
                        <Plus className="w-4 h-4" /> Add new template
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
