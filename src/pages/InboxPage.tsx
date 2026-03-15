import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import ThreadList from '@/components/inbox/ThreadList';
import ChatWindow from '@/components/inbox/ChatWindow';
import InboxInquiryPanel from '@/components/inbox/InboxInquiryPanel';
import MessagingSettingsModal from '@/components/inbox/MessagingSettingsModal';
import { DUMMY_THREADS, DUMMY_MESSAGES } from '@/components/inbox/dummyData';
import type { Thread } from '@/components/inbox/types';

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>(DUMMY_THREADS);
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

  const selectedThread = threads.find(t => t.id === selectedId) || null;
  const messages = selectedId ? (DUMMY_MESSAGES[selectedId] || []) : [];

  const handleSelectThread = (id: string) => {
    setSelectedId(id);
    setShowDetails(true);
  };

  const handleSignNDA = () => {
    if (!selectedId) return;
    setThreads(prev => prev.map(t => t.id === selectedId ? { ...t, termsAccepted: true } : t));
  };

  // Mobile
  if (isMobile) {
    if (selectedId && selectedThread) {
      return (
        <div className="h-[calc(100vh-60px)]">
          <ChatWindow thread={selectedThread} messages={messages} onBack={() => setSelectedId(null)} onToggleDetails={() => setShowDetails(!showDetails)} showDetailsOpen={showDetails} isMobile />
        </div>
      );
    }
    return (
      <div className="h-[calc(100vh-60px)]">
        <ThreadList threads={threads} selectedId={selectedId} onSelect={handleSelectThread} onOpenSettings={() => setShowSettings(true)} />
        <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  const showRightPanel = showDetails && selectedThread && !selectedThread.isSupport;

  return (
    <div className="h-full w-full flex overflow-hidden flex-1">
      <div className="w-[320px] shrink-0">
        <ThreadList threads={threads} selectedId={selectedId} onSelect={handleSelectThread} onOpenSettings={() => setShowSettings(true)} />
      </div>
      <div className="flex-1 min-w-0">
        {selectedThread ? (
          <ChatWindow thread={selectedThread} messages={messages} onBack={() => setSelectedId(null)} onToggleDetails={() => setShowDetails(!showDetails)} showDetailsOpen={!!showRightPanel} isMobile={false} />
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
          <InboxInquiryPanel thread={selectedThread} onClose={() => setShowDetails(false)} onSignNDA={handleSignNDA} />
        </div>
      )}
      <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
