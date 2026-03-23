import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, Plus, LayoutGrid, Send, LockKeyhole, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';
import type { Thread, Message } from './types';
import MessageBubble from './MessageBubble';
import QuickRepliesModal from './QuickRepliesModal';
import ChatEmptyState from './ChatEmptyState';
import PaymentSheet from '@/components/PaymentSheet';

// ── Masking utility ──────────────────────────────────────────────
interface MaskResult { maskedBody: string; isMasked: boolean; maskType: string }

function maskMessage(body: string): MaskResult {
  let result = body;
  let isMasked = false;
  let maskType = 'none';

  // WhatsApp bypass attempt — replace entire message (intentional)
  if (/(whatsapp|wa\.me|chat\.whatsapp)/gi.test(body)) {
    return { maskedBody: 'Contact details hidden. Sign the NDA to unlock.', isMasked: true, maskType: 'contact' };
  }

  // Phone — inline replace match only, preserve surrounding text
  result = result.replace(/(\+44\s?|0)(\d[\s\d]{8,10})/g, () => { isMasked = true; maskType = 'phone'; return '[Hidden number]'; });

  // Email — inline replace match only
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, () => { isMasked = true; maskType = maskType === 'phone' ? 'contact' : 'email'; return '[Hidden email]'; });

  // Address — inline replace match only
  result = result.replace(/\d+\s+[A-Za-z]+\s+(Road|Street|Avenue|Lane|Drive|Close|Way|Place|Rd|St|Ave)\b/gi, () => { isMasked = true; maskType = maskType !== 'none' ? 'contact' : 'address'; return '[Hidden address]'; });

  return { maskedBody: result, isMasked, maskType };
}

// ── Phone masking for display (legacy — used when NDA not signed) ──
const PHONE_DISPLAY_REGEX = /(\+44|0)[0-9\s]{9,}/g;
const maskPhonesForDisplay = (text: string, termsAccepted: boolean): string => {
  if (termsAccepted) return text;
  return text.replace(PHONE_DISPLAY_REGEX, '[number hidden — sign NDA to reveal]');
};

// ── Component ────────────────────────────────────────────────────
interface Props {
  thread: Thread;
  onBack: () => void;
  onToggleDetails: () => void;
  showDetailsOpen: boolean;
  isMobile: boolean;
  onOpenNDA?: () => void;
  onOpenDetails?: () => void;
  displayProfit?: number | null;
}

export default function ChatWindow({ thread, onBack, onToggleDetails, showDetailsOpen, isMobile, onOpenNDA, onOpenDetails, displayProfit }: Props) {
  const { user } = useAuth();
  const { tier, loading: tierLoading, refreshTier } = useUserTier();
  const paid = isPaidTier(tier);

  // Derive role from thread membership (not from profiles.role).
  // Landlord takes priority: if the same account appears in both fields (e.g. test env),
  // treat the user as the landlord so they never see the operator promo shell.
  const isCurrentUserLandlord = !thread.isSupport && !!user?.id && user.id === thread.landlordId;
  const isCurrentUserOperator = !thread.isSupport && !!user?.id && user.id === thread.operatorId && !isCurrentUserLandlord;

  // Always refetch tier when operator opens/switches thread — prevents stale paid=true
  useEffect(() => { if (isCurrentUserOperator) refreshTier(); }, [thread.id, isCurrentUserOperator]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [hasExistingMessages, setHasExistingMessages] = useState(false);
  const [hasAttemptedSend, setHasAttemptedSend] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMsgLoadDone = useRef(false);
  // Keep a stable ref to onOpenDetails so effects can call the latest version
  // without adding the inline function to their dependency arrays.
  const onOpenDetailsRef = useRef(onOpenDetails);
  useEffect(() => { onOpenDetailsRef.current = onOpenDetails; });
  // Track previous message count to detect the first message arriving
  const prevMsgCountRef = useRef(0);

  // placeholderIdx no longer used in ChatWindow — animated placeholder moved to ChatEmptyState

  // Map DB row to Message
  const mapRow = useCallback((row: Record<string, unknown>, userId?: string): Message => {
    const senderId = row.sender_id as string;
    const isSender = senderId === userId;
    const rawBody = row.body as string;
    return {
      id: row.id as string,
      threadId: row.thread_id as string,
      senderId: isSender ? 'me' : 'other',
      body: isSender ? rawBody : maskPhonesForDisplay(rawBody, thread.termsAccepted),
      bodyReceiver: (row.body_receiver as string | null) || null,
      isMasked: (row.is_masked as boolean) || false,
      maskType: (row.mask_type as string | null) || null,
      messageType: (row.message_type as string) as Message['messageType'],
      createdAt: row.created_at as string,
    };
  }, [thread.termsAccepted]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (thread.isSupport) {
      setMessages([{
        id: 'support-welcome', threadId: 'support', senderId: 'system',
        body: 'Welcome to nfstay! How can we help you today?',
        bodyReceiver: null, isMasked: false, maskType: null,
        messageType: 'system', createdAt: new Date().toISOString(),
      }]);
      setLoading(false);
      return;
    }
    try {
      if (!initialMsgLoadDone.current) setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map(row => mapRow(row as Record<string, unknown>, user?.id));
      setMessages(mapped);
      setHasExistingMessages(mapped.length > 0);
    } catch (err) {
      console.error('Failed to load messages:', err);
      if (!initialMsgLoadDone.current) { setMessages([]); setHasExistingMessages(false); }
    } finally {
      setLoading(false);
      initialMsgLoadDone.current = true;
    }
  }, [thread.id, thread.isSupport, thread.termsAccepted, user?.id, mapRow]);

  useEffect(() => { initialMsgLoadDone.current = false; loadMessages(); }, [loadMessages]);

  // Realtime subscription — both operator and landlord receive the same INSERT
  // event for the thread, so no polling is needed. mapRow determines me/other.
  useEffect(() => {
    if (thread.isSupport) return;
    const channel = supabase
      .channel(`messages-${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `thread_id=eq.${thread.id}`,
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const newMsg = mapRow(row, user?.id);
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const optIdx = prev.findIndex(m => m.id.startsWith('optimistic-') && m.body === newMsg.body);
          if (optIdx >= 0) { const next = [...prev]; next[optIdx] = newMsg; return next; }
          return [...prev, newMsg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [thread.id, thread.isSupport, thread.termsAccepted, user?.id, mapRow]);

  // Visibility-based 5s poll fallback — ensures messages appear even if Realtime fails
  useEffect(() => {
    if (thread.isSupport) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!intervalId) intervalId = setInterval(loadMessages, 5000); };
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    const onVisChange = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisChange);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisChange); };
  }, [thread.id, thread.isSupport, loadMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-expand right details panel the moment the first message appears in the thread.
  // Fires regardless of how the message arrived (optimistic, Realtime, poll, DB insert).
  // Uses ref so the inline onOpenDetails prop never causes a stale closure or loop.
  useEffect(() => {
    const hadMessages = prevMsgCountRef.current > 0;
    prevMsgCountRef.current = messages.length;
    if (!hadMessages && messages.length > 0 && !thread.isSupport) {
      onOpenDetailsRef.current?.();
    }
  }, [messages.length, thread.isSupport]);

  const handleSend = async () => {
    if (!input.trim() || !user?.id) return;
    // Enforce payment gate: operator cannot send first message without paying
    if (isCurrentUserOperator && !paid && !hasExistingMessages) {
      // Defensive: refetch tier, show payment strip, open sheet
      setHasAttemptedSend(true);
      refreshTier();
      setPaymentSheetOpen(true);
      return;
    }
    const body = input.trim();
    setInput('');

    // Run masking (bypassed if NDA is signed)
    const { maskedBody, isMasked, maskType } = thread.termsAccepted
      ? { maskedBody: body, isMasked: false, maskType: 'none' }
      : maskMessage(body);

    const isFirstMessage = messages.length === 0;

    // Optimistic add (sender always sees original)
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId, threadId: thread.id, senderId: 'me',
      body, bodyReceiver: isMasked ? maskedBody : null,
      isMasked, maskType, messageType: 'text', createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    if (thread.isSupport) return;

    try {
      const { error } = await supabase.from('chat_messages').insert({
        thread_id: thread.id,
        sender_id: user.id,
        body,
        body_receiver: isMasked ? maskedBody : null,
        is_masked: isMasked,
        mask_type: maskType === 'none' ? null : maskType,
        message_type: 'text',
      });
      if (error) throw error;

      // Auto-expand right details panel on first message sent
      if (isFirstMessage) onOpenDetails?.();

      // n8n webhooks — fire-and-forget after DB success
      const n8nBase = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');
      if (n8nBase) {
        const ac = new AbortController();
        const timeout = setTimeout(() => ac.abort(), 5000);
        const isLandlord = user.id === thread.landlordId;
        const payload = JSON.stringify({
          thread_id: thread.id,
          property_title: thread.propertyTitle,
          property_city: thread.propertyCity,
          sender_name: user.user_metadata?.name || 'nfstay User',
          sender_role: isLandlord ? 'landlord' : 'operator',
          is_masked: isMasked,
          mask_type: maskType,
          landlord_id: thread.landlordId ?? null,
          operator_id: thread.operatorId ?? null,
          // WhatsApp notification fields — other party's contact + property label for templates
          recipient_phone: thread.contactPhone,
          recipient_name: thread.contactName,
          property_label: thread.propertyCity || thread.propertyTitle,
        });
        // Determine which webhook to fire based on sender role.
        // nfstay_new_inquiry template is Pending (Meta-blocked) — use inbox-new-message
        // for ALL operator→landlord flows (first message and subsequent messages).
        let endpoint: string;
        if (isLandlord) {
          endpoint = '/webhook/inbox-landlord-replied';
        } else {
          endpoint = '/webhook/inbox-new-message';
        }
        fetch(`${n8nBase}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: ac.signal,
        }).then(res => {
          if (res.ok) {
            console.log(`[nfstay webhook] ✅ ${endpoint} fired successfully`);
          } else {
            console.warn(`[nfstay webhook] ⚠️ ${endpoint} returned ${res.status}`);
          }
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.warn(`[nfstay webhook] ❌ ${endpoint} failed:`, err.message);
          }
        }).finally(() => clearTimeout(timeout));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error('Message failed to send');
      setInput(body);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Free operator on new thread → show payment strip + open sheet
      if (isCurrentUserOperator && !paid && !hasExistingMessages) {
        setHasAttemptedSend(true);
        setPaymentSheetOpen(true);
        return;
      }
      handleSend();
    }
  };

  // Role-aware empty state: the "You could earn £X" promo shell is only for operators.
  // Landlords/agents with 0 messages still need the NDA gate + composer — not the promo shell.
  const showOperatorPreChat = !loading && messages.length === 0 && isCurrentUserOperator;

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    if (date !== lastDate) { grouped.push({ date, msgs: [msg] }); lastDate = date; }
    else { grouped[grouped.length - 1].msgs.push(msg); }
  }

  return (
    // relative — gives QuickRepliesModal (absolute bottom-16) a position context anchored to the chat panel
    <div className="relative h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        {isMobile && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary mr-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">{thread.isSupport ? 'nfstay Support' : thread.contactName}</span>
            {!thread.isSupport && (
              <span className={`flex items-center gap-1 text-[10px] ${thread.isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${thread.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                {thread.isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
          {!thread.isSupport && (
            <div className="text-[11px] text-muted-foreground">{thread.propertyTitle} · {thread.propertyCity}</div>
          )}
        </div>
        {!thread.isSupport && !isMobile && (
          <button onClick={onToggleDetails} className="p-1.5 rounded-lg hover:bg-secondary" title={showDetailsOpen ? 'Hide details' : 'Show details'}>
            {showDetailsOpen ? <ChevronRight className="w-5 h-5 text-muted-foreground" /> : <ChevronLeft className="w-5 h-5 text-muted-foreground" />}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="px-4 py-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`animate-pulse flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`h-10 rounded-2xl bg-gray-100 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        ) : showOperatorPreChat ? (
          <ChatEmptyState
            thread={thread}
            onOpenDetails={() => onOpenDetailsRef.current?.()}
            inputValue={input}
            onInputChange={setInput}
            onSend={() => {
              if (isCurrentUserOperator && !paid && !hasExistingMessages) {
                setHasAttemptedSend(true);
                setPaymentSheetOpen(true);
                return;
              }
              handleSend();
            }}
            onKeyDown={handleKeyDown}
            onOpenQuickReplies={() => setShowQuickReplies(!showQuickReplies)}
            inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
            displayProfit={displayProfit}
          />
        ) : !loading && messages.length === 0 && !thread.isSupport ? (
          // Landlord (or unresolved role) with no messages yet
          <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Send className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 max-w-xs">
              {isCurrentUserLandlord
                ? 'The operator will send you their first message soon.'
                : 'Start the conversation below.'}
            </p>
          </div>
        ) : (
          <div className="px-4 py-4">
            {grouped.map(group => (
              <div key={group.date}>
                <div className="text-center py-3"><span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{group.date}</span></div>
                {group.msgs.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isSender={msg.senderId === 'me'}
                    termsAccepted={thread.termsAccepted}
                  />
                ))}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* QuickRepliesModal — always mounted so it works in both empty and conversation states */}
      <QuickRepliesModal open={showQuickReplies} onClose={() => setShowQuickReplies(false)} onSelect={text => { if (typeof text === 'string') setInput(text); }} />
      {/* Hidden file input for Plus/attach button */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) toast.info(`Selected: ${f.name} — image upload coming soon`); e.target.value = ''; }} />

      {/* Bottom controls — hidden when operator pre-chat empty state shows its own composer */}
      {!showOperatorPreChat && <>
      {/* LANDLORD NDA GATE — landlord must sign NDA before replying */}
      {isCurrentUserLandlord && !thread.termsAccepted && (
        <div className="bg-amber-50 border-t border-amber-200 text-amber-800 text-xs px-4 py-2 shrink-0">
          🔒 Sign the NDA to reply. Contact details will be shared after signing.
        </div>
      )}

      {/* OPERATOR PAYMENT GATE — visible only after send attempt (operator + free tier + no messages) */}
      {isCurrentUserOperator && !paid && !hasExistingMessages && hasAttemptedSend && (
        <div className="flex items-center justify-between bg-amber-50 border-t border-amber-200 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <LockKeyhole className="h-4 w-4 shrink-0" />
            <span>Send your first message — upgrade to unlock</span>
          </div>
          <button onClick={() => setPaymentSheetOpen(true)} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shrink-0 transition-colors animate-pulse">
            Unlock Now
          </button>
        </div>
      )}

      {/* Input bar — role-aware */}
      <div className="relative border-t border-gray-200 bg-white px-4 py-3 flex items-end gap-2 shrink-0">
        {/* While tier is loading, show neutral placeholder so we don't flash wrong UI */}
        {tierLoading && isCurrentUserOperator ? (
          <div className="flex-1 text-sm text-muted-foreground py-2 px-3">Checking access…</div>
        ) :
        /* LANDLORD: NDA unsigned → "Sign NDA to reply" button instead of input */
        isCurrentUserLandlord && !thread.termsAccepted ? (
          <button
            onClick={() => onOpenNDA?.()}
            className="flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" /> Sign NDA to reply
          </button>
        ) : /* OPERATOR: free tier, no messages → real input but send opens payment sheet */
        isCurrentUserOperator && !paid && !hasExistingMessages ? (
          <>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach files"><Plus className="w-5 h-5 text-muted-foreground" /></button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" onClick={() => setShowQuickReplies(!showQuickReplies)}><LayoutGrid className="w-5 h-5 text-muted-foreground" /></button>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-2 max-h-[120px] transition-all" style={{ minHeight: 36 }} />
            <button onClick={() => { setHasAttemptedSend(true); setPaymentSheetOpen(true); }}
              className={`p-2 rounded-lg transition-colors shrink-0 ${input.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}>
              <Send className="w-5 h-5" />
            </button>
          </>
        ) : (
          /* NORMAL: paid operator, landlord with NDA signed, or support → full input */
          <>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach files"><Plus className="w-5 h-5 text-muted-foreground" /></button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" onClick={() => setShowQuickReplies(!showQuickReplies)}><LayoutGrid className="w-5 h-5 text-muted-foreground" /></button>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-2 max-h-[120px] transition-all" style={{ minHeight: 36 }} />
            <button onClick={handleSend} disabled={!input.trim()}
              className={`p-2 rounded-lg transition-colors shrink-0 ${input.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}>
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      </>}

      {/* Payment sheet — ONLY for operators, never rendered for landlords */}
      {isCurrentUserOperator && (
        <PaymentSheet
          open={paymentSheetOpen}
          onOpenChange={(v) => {
            setPaymentSheetOpen(v);
            // Refresh tier on every close (manual X or success) so stale paid=false
            // never blocks Send after a completed payment.
            if (!v) refreshTier();
          }}
          onUnlocked={() => {
            setPaymentSheetOpen(false);
            refreshTier();
            onOpenDetails?.(); // Auto-expand right panel after payment
            setTimeout(() => inputRef.current?.focus(), 300);
          }}
        />
      )}
    </div>
  );
}
