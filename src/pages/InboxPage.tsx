import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import ThreadList from '@/components/inbox/ThreadList';
import ChatWindow from '@/components/inbox/ChatWindow';
import InboxInquiryPanel from '@/components/inbox/InboxInquiryPanel';
import MessagingSettingsModal from '@/components/inbox/MessagingSettingsModal';
import { DUMMY_THREADS, DUMMY_MESSAGES } from '@/components/inbox/dummyData';

export default function InboxPage() {
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

  const selectedThread = DUMMY_THREADS.find(t => t.id === selectedId) || null;
  const messages = selectedId ? (DUMMY_MESSAGES[selectedId] || []) : [];

  const handleSelectThread = (id: string) => {
    setSelectedId(id);
    setShowDetails(true);
  };

  // Mobile: full-screen chat when thread selected
  if (isMobile) {
    if (selectedId && selectedThread) {
      return (
        <div className="h-[calc(100vh-60px)]">
          <ChatWindow
            thread={selectedThread}
            messages={messages}
            onBack={() => setSelectedId(null)}
            onToggleDetails={() => setShowDetails(!showDetails)}
            showDetailsOpen={showDetails}
            isMobile
          />
        </div>
      );
    }
    return (
      <div className="h-[calc(100vh-60px)]">
        <ThreadList threads={DUMMY_THREADS} selectedId={selectedId} onSelect={handleSelectThread} onOpenSettings={() => setShowSettings(true)} />
        <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  const showRightPanel = showDetails && selectedThread && !selectedThread.isSupport;

  // Desktop: 3-panel layout — fills all available space from DashboardLayout
  return (
    <div className="h-full w-full flex overflow-hidden flex-1">
      {/* Left panel — thread list */}
      <div className="w-[320px] shrink-0">
        <ThreadList threads={DUMMY_THREADS} selectedId={selectedId} onSelect={handleSelectThread} onOpenSettings={() => setShowSettings(true)} />
      </div>

      {/* Centre panel — chat or empty state */}
      <div className="flex-1 min-w-0">
        {selectedThread ? (
          <ChatWindow
            thread={selectedThread}
            messages={messages}
            onBack={() => setSelectedId(null)}
            onToggleDetails={() => setShowDetails(!showDetails)}
            showDetailsOpen={!!showRightPanel}
            isMobile={false}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center bg-white">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Your messages</h3>
            <p className="text-sm text-gray-400 mt-1">Select a conversation to get started</p>
          </div>
        )}
      </div>

      {/* Right panel — inquiry details */}
      {showRightPanel && (
        <div className="w-[320px] shrink-0">
          <InboxInquiryPanel thread={selectedThread} onClose={() => setShowDetails(false)} />
        </div>
      )}

      <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
