import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ThreadList from '@/components/inbox/ThreadList';
import ChatWindow from '@/components/inbox/ChatWindow';
import InboxInquiryPanel from '@/components/inbox/InboxInquiryPanel';
import MessagingSettingsModal from '@/components/inbox/MessagingSettingsModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Thread } from '@/components/inbox/types';

// Support thread is always pinned, never from DB
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
};

export default function InboxPage() {
  const { user } = useAuth();
  const [dbThreads, setDbThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('operator');

  // Fetch user role from profiles
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data?.role) setUserRole(data.role); });
  }, [user?.id]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load threads from Supabase
  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('chat_threads')
        .select('*, properties(*)')
        .eq('operator_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const mapped: Thread[] = (data || []).map((row) => {
        const prop = row.properties as Record<string, unknown> | null;
        // Display name: use city + type if available, fallback to contact name, never show raw IDs
        const propName = (prop?.name as string) || '';
        const city = (prop?.city as string) || '';
        const type = (prop?.type as string) || '';
        const contactName = (prop?.contact_name as string) || '';
        // Build a human-friendly title: "Manchester · 2-bed flat" or contact name or "Untitled Thread"
        const displayTitle = city && type ? `${city} · ${type}` : city || contactName || 'Untitled Thread';
        return {
          id: row.id,
          propertyId: (prop?.id as string) || null,
          propertyTitle: displayTitle,
          propertyCity: (prop?.city as string) || '',
          propertyPostcode: (prop?.postcode as string) || '',
          propertyImage: ((prop?.photos as string[]) || [])[0] || null,
          propertyProfit: (prop?.profit_est as number) || 0,
          propertyRent: (prop?.rent_monthly as number) || 0,
          propertyBedrooms: (prop?.bedrooms as number) || null,
          dealType: 'Serviced Accommodation',
          contactName: (prop?.contact_name as string) || 'Unknown',
          contactPhone: (prop?.contact_phone as string) || '',
          contactEmail: (prop?.contact_email as string) || '',
          lastMessage: '',
          lastMessageAt: new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          lastMessageSenderIsOperator: false,
          unread: false,
          isSupport: false,
          isOnline: false, // TODO: wire to presence when available
          termsAccepted: row.terms_accepted,
          landlordId: (row.landlord_id as string) || null,
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

  // Realtime: listen for thread changes (new threads, NDA updates)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('inbox-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads', filter: `operator_id=eq.${user.id}` }, () => {
        loadThreads(); // Refresh on any change
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadThreads]);

  const allThreads = [SUPPORT_THREAD, ...dbThreads];
  const selectedThread = allThreads.find(t => t.id === selectedId) || null;

  const handleSelectThread = (id: string) => {
    setSelectedId(id);
    setShowDetails(true);
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

  // Loading state
  if (loading && dbThreads.length === 0) {
    return (
      <div className="h-full w-full flex overflow-hidden flex-1">
        <div className="w-[320px] shrink-0 border-r border-gray-100 bg-white p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center bg-white">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
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

  // Mobile
  if (isMobile) {
    if (selectedId && selectedThread) {
      return (
        <div className="h-[calc(100vh-60px)]">
          <ChatWindow thread={selectedThread} onBack={() => setSelectedId(null)} onToggleDetails={() => setShowDetails(!showDetails)} showDetailsOpen={showDetails} isMobile />
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
          <ChatWindow thread={selectedThread} onBack={() => setSelectedId(null)} onToggleDetails={() => setShowDetails(!showDetails)} showDetailsOpen={!!showRightPanel} isMobile={false} />
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
          <InboxInquiryPanel thread={selectedThread} onClose={() => setShowDetails(false)} onSignNDA={handleSignNDA} isOperator={userRole === 'operator' || userRole === 'admin'} />
        </div>
      )}
      <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
