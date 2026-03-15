import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, Plus, LayoutGrid, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Thread, Message } from './types';
import MessageBubble from './MessageBubble';
import QuickRepliesModal from './QuickRepliesModal';
import ChatEmptyState from './ChatEmptyState';

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
}

export default function ChatWindow({ thread, onBack, onToggleDetails, showDetailsOpen, isMobile }: Props) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        body: 'Welcome to NFsTay! How can we help you today?',
        bodyReceiver: null, isMasked: false, maskType: null,
        messageType: 'system', createdAt: new Date().toISOString(),
      }]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data || []).map(row => mapRow(row as Record<string, unknown>, user?.id)));
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [thread.id, thread.isSupport, thread.termsAccepted, user?.id, mapRow]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime subscription
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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user?.id) return;
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

      // n8n webhooks — fire-and-forget after DB success
      const n8nBase = (import.meta.env.VITE_N8N_WEBHOOK_URL || '').replace(/\/$/, '');
      if (n8nBase) {
        const ac = new AbortController();
        const timeout = setTimeout(() => ac.abort(), 5000);
        const endpoint = isFirstMessage ? '/webhook/inbox-new-inquiry' : '/webhook/inbox-new-message';
        fetch(`${n8nBase}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: thread.id,
            property_title: thread.propertyTitle,
            sender_name: user.user_metadata?.name || 'NFsTay User',
            is_masked: isMasked,
          }),
          signal: ac.signal,
        }).catch(() => {}).finally(() => clearTimeout(timeout));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error('Message failed to send');
      setInput(body);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectStarter = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const isEmpty = !loading && messages.length === 0;

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    if (date !== lastDate) { grouped.push({ date, msgs: [msg] }); lastDate = date; }
    else { grouped[grouped.length - 1].msgs.push(msg); }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        {isMobile && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary mr-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">{thread.isSupport ? 'NFsTay Support' : thread.contactName}</span>
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
        ) : isEmpty ? (
          <ChatEmptyState propertyTitle={thread.propertyTitle} onSelectStarter={handleSelectStarter} />
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

      {/* NDA warning banner */}
      {!thread.isSupport && !thread.termsAccepted && (
        <div className="bg-amber-50 border-t border-amber-200 text-amber-800 text-xs px-4 py-2 shrink-0">
          🔒 Share contact details only after NDA is signed. Phone numbers in messages will be masked until the NDA is complete.
        </div>
      )}

      {/* Input bar */}
      <div className="relative border-t border-gray-200 bg-white px-4 py-3 flex items-end gap-2 shrink-0">
        <QuickRepliesModal open={showQuickReplies} onClose={() => setShowQuickReplies(false)} onSelect={text => setInput(text)} />
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"><Plus className="w-5 h-5 text-muted-foreground" /></button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" onClick={() => setShowQuickReplies(!showQuickReplies)}><LayoutGrid className="w-5 h-5 text-muted-foreground" /></button>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-2 max-h-[120px]" style={{ minHeight: 36 }} />
        <button onClick={handleSend} disabled={!input.trim()}
          className={`p-2 rounded-lg transition-colors shrink-0 ${input.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
