import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ThreadList from '@/components/inbox/ThreadList';
import ChatWindow from '@/components/inbox/ChatWindow';
import InboxInquiryPanel from '@/components/inbox/InboxInquiryPanel';
import MessagingSettingsModal from '@/components/inbox/MessagingSettingsModal';
import AgreementModal from '@/components/inbox/AgreementModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useInquiry } from '@/hooks/useInquiry';
import type { Thread } from '@/components/inbox/types';

const SUPPORT_THREAD: Thread = {
  id: 'support',
  propertyId: null,
  propertyTitle: 'NFsTay Support',
  propertyCity: '',
  propertyPostcode: '',
  propertyImage: null,
  propertyProfit: 0,
  propertyRent: 0,
  propertyBedrooms: null,
  dealType: '',
  contactName: 'NFsTay Team',
  contactPhone: '',
  contactEmail: 'support@nfstay.com',
  lastMessage: 'Welcome to NFsTay! How can we help you today?',
  lastMessageAt: 'Ongoing',
  lastMessageSenderIsOperator: false,
  unread: false,
  isSupport: true,
  isOnline: true,
  termsAccepted: true,
  landlordId: null,
  operatorId: null,
};

export default function InboxPage() {
  const { user } = useAuth();
  const [dbThreads, setDbThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('operator');

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data?.role) setUserRole(data.role); });
  }, [user?.id]);

  const [searchParams, setSearchParams] = useSearchParams();
  const dealQueryParam = searchParams.get('deal');
  const tokenParam = searchParams.get('token');
  const { threadId: inquiryThreadId } = useInquiry(dealQueryParam);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNDAModal, setShowNDAModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-select thread from Inquire Now
  useEffect(() => {
    if (inquiryThreadId) {
      setSelectedId(inquiryThreadId);
      setShowDetails(true);
      loadThreads();
    }
  }, [inquiryThreadId]);

  // Clear stale selection when deal param changes
  useEffect(() => {
    if (dealQueryParam) setSelectedId(null);
  }, [dealQueryParam]);

  // Magic link: ?token= → find thread, select it, mark invite used
  useEffect(() => {
    if (!tokenParam || !user?.id) return;
    (async () => {
      const { data } = await (supabase.from('landlord_invites') as any)
        .select('thread_id')
        .eq('magic_token', tokenParam)
        .eq('used', false)
        .maybeSingle();
      if (data?.thread_id) {
        setSelectedId(data.thread_id);
        setShowDetails(true);
        // Mark invite as used — fire-and-forget
        (supabase.from('landlord_invites') as any)
          .update({ used: true })
          .eq('magic_token', tokenParam)
          .then(() => {});
        loadThreads();
      }
      // Strip token from URL
      setSearchParams(prev => { prev.delete('token'); return prev; }, { replace: true });
    })();
  }, [tokenParam, user?.id]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load threads for BOTH operator and landlord roles
  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('chat_threads')
        .select('*, properties(*), operator:profiles!chat_threads_operator_id_fkey(name, email, whatsapp), landlord:profiles!chat_threads_landlord_id_fkey(name, email, whatsapp)')
        .or(`operator_id.eq.${user.id},landlord_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const mapped: Thread[] = (data || []).map((row: Record<string, unknown>) => {
        const prop = row.properties as Record<string, unknown> | null;
        const operatorProfile = row.operator as Record<string, unknown> | null;
        const landlordProfile = row.landlord as Record<string, unknown> | null;
        const isOperatorView = (row.operator_id as string) === user.id;

        const city = (prop?.city as string) || '';
        const type = (prop?.type as string) || '';
        const displayTitle = city && type ? `${city} · ${type}` : city || 'Untitled Thread';

        // Contact info depends on which role the current user has
        const contactName = isOperatorView
          ? (prop?.contact_name as string) || (landlordProfile?.name as string) || 'Unknown'
          : (operatorProfile?.name as string) || 'Operator';
        const contactPhone = isOperatorView
          ? (prop?.contact_phone as string) || ''
          : (operatorProfile?.whatsapp as string) || '';
        const contactEmail = isOperatorView
          ? (prop?.contact_email as string) || ''
          : (operatorProfile?.email as string) || '';

        return {
          id: row.id as string,
          propertyId: (prop?.id as string) || null,
          propertyTitle: displayTitle,
          propertyCity: city,
          propertyPostcode: (prop?.postcode as string) || '',
          propertyImage: ((prop?.photos as string[]) || [])[0] || null,
          propertyProfit: (prop?.profit_est as number) || 0,
          propertyRent: (prop?.rent_monthly as number) || 0,
          propertyBedrooms: (prop?.bedrooms as number) || null,
          dealType: 'Serviced Accommodation',
          contactName,
          contactPhone,
          contactEmail,
          lastMessage: '',
          lastMessageAt: new Date(row.created_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          lastMessageSenderIsOperator: false,
          unread: !(row.is_read as boolean),
          isSupport: false,
          isOnline: false,
          termsAccepted: row.terms_accepted as boolean,
          landlordId: (row.landlord_id as string) || null,
          operatorId: (row.operator_id as string) || null,
        };
      });

      setDbThreads(mapped);
    } catch (err) {
      console.error('Failed to load threads:', err);
      setError('Could not load messages. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Realtime for operator threads
  useEffect(() => {
    if (!user?.id) return;
    const ch1 = supabase
      .channel('inbox-threads-operator')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads', filter: `operator_id=eq.${user.id}` }, () => loadThreads())
      .subscribe();
    // Realtime for landlord threads
    const ch2 = supabase
      .channel('inbox-threads-landlord')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads', filter: `landlord_id=eq.${user.id}` }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user?.id, loadThreads]);

  // Visibility-based 6s poll fallback — ensures new threads appear even if Realtime fails
  useEffect(() => {
    if (!user?.id) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!intervalId) intervalId = setInterval(loadThreads, 6000); };
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    const onVis = () => { document.visibilityState === 'visible' ? start() : stop(); };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [user?.id, loadThreads]);

  const allThreads = [SUPPORT_THREAD, ...dbThreads];
  const selectedThread = allThreads.find(t => t.id === selectedId) || null;
  const isOperator = !selectedThread?.isSupport && selectedThread?.operatorId === user?.id;

  // Mark thread as read on open
  const handleSelectThread = (id: string) => {
    setSelectedId(id);
    setShowDetails(true);
    if (id !== 'support' && user?.id) {
      supabase.from('chat_threads')
        .update({ is_read: true })
        .eq('id', id)
        .or(`operator_id.eq.${user.id},landlord_id.eq.${user.id}`)
        .then(() => {});
      // Optimistic local update
      setDbThreads(prev => prev.map(t => t.id === id ? { ...t, unread: false } : t));
    }
  };

  const handleSignNDA = async () => {
    if (!selectedId || selectedId === 'support') return;
    const { error: updateError } = await supabase
      .from('chat_threads')
      .update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() })
      .eq('id', selectedId);
    if (updateError) {
      toast.error('Failed to save signature. Try again.');
      return;
    }
    // Insert agreement acceptance audit trail
    const thread = allThreads.find(t => t.id === selectedId);
    (supabase.from('agreement_acceptances') as any).insert({
      thread_id: selectedId,
      landlord_id: thread?.landlordId ?? user?.id,
      accepted_at: new Date().toISOString(),
    }).then(({ error: insertErr }: { error: unknown }) => {
      if (insertErr) console.error('Failed to log agreement acceptance:', insertErr);
    });
    // Optimistic local update
    setDbThreads(prev => prev.map(t => t.id === selectedId ? { ...t, termsAccepted: true } : t));
  };

  const handleArchiveThread = async (threadId: string) => {
    const { error: archiveError } = await supabase
      .from('chat_threads')
      .update({ status: 'archived' })
      .eq('id', threadId);
    if (archiveError) {
      toast.error('Failed to archive thread');
      return;
    }
    setDbThreads(prev => prev.filter(t => t.id !== threadId));
    if (selectedId === threadId) setSelectedId(null);
    toast.success('Thread archived');
  };

  if (loading && dbThreads.length === 0) {
    return (
      <div className="h-full w-full flex overflow-hidden flex-1">
        <div className="w-[320px] shrink-0 border-r border-gray-100 bg-white p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-3/4" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center bg-white"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      </div>
    );
  }

  if (error && dbThreads.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{error}</p>
          <button onClick={loadThreads} className="mt-3 text-sm text-primary font-medium hover:underline">Try again</button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    if (selectedId && selectedThread) {
      return (
        <div className="h-[calc(100vh-60px)]">
          <ChatWindow thread={selectedThread} onBack={() => setSelectedId(null)} onToggleDetails={() => setShowDetails(!showDetails)} showDetailsOpen={showDetails} isMobile onOpenNDA={() => setShowNDAModal(true)} />
        </div>
      );
    }
    return (
      <div className="h-[calc(100vh-60px)]">
        <ThreadList threads={allThreads} selectedId={selectedId} onSelect={handleSelectThread} onOpenSettings={() => setShowSettings(true)} onArchive={handleArchiveThread} />
        <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  const showRightPanel = showDetails && selectedThread && !selectedThread.isSupport;

  return (
    <div className="h-full w-full flex overflow-hidden flex-1">
      <div className="w-[320px] shrink-0">
        <ThreadList threads={allThreads} selectedId={selectedId} onSelect={handleSelectThread} onOpenSettings={() => setShowSettings(true)} onArchive={handleArchiveThread} />
      </div>
      <div className="flex-1 min-w-0">
        {selectedThread ? (
          <ChatWindow thread={selectedThread} onBack={() => setSelectedId(null)} onToggleDetails={() => setShowDetails(!showDetails)} showDetailsOpen={!!showRightPanel} isMobile={false} onOpenNDA={() => setShowNDAModal(true)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center bg-white">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Your messages</h3>
            <p className="text-sm text-gray-400 mt-1">Select a conversation to get started</p>
          </div>
        )}
      </div>
      {showRightPanel && (
        <div className="w-[320px] shrink-0">
          <InboxInquiryPanel thread={selectedThread} onClose={() => setShowDetails(false)} onSignNDA={handleSignNDA} isOperator={isOperator} onOpenAgreement={() => setShowNDAModal(true)} />
        </div>
      )}
      <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      {showNDAModal && selectedThread && !selectedThread.isSupport && (
        <AgreementModal
          thread={selectedThread}
          isOperator={isOperator}
          onClose={() => setShowNDAModal(false)}
          onSign={handleSignNDA}
        />
      )}
    </div>
  );
}
