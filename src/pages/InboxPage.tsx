import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import ThreadList from '@/components/inbox/ThreadList';
import ChatWindow from '@/components/inbox/ChatWindow';
import InboxInquiryPanel from '@/components/inbox/InboxInquiryPanel';
import MessagingSettingsModal from '@/components/inbox/MessagingSettingsModal';
import { DUMMY_THREADS, DUMMY_MESSAGES } from '@/components/inbox/dummyData';

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
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
    setShowDetails(false);
  };

  // Mobile: show chat fullscreen when thread selected
  if (isMobile) {
    if (selectedId && selectedThread) {
      return (
        <div className="h-[calc(100vh-60px)]">
          <ChatWindow
            thread={selectedThread}
            messages={messages}
            onBack={() => setSelectedId(null)}
            onToggleDetails={() => setShowDetails(!showDetails)}
            isMobile
          />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-60px)]">
        <ThreadList
          threads={DUMMY_THREADS}
          selectedId={selectedId}
          onSelect={handleSelectThread}
          onOpenSettings={() => setShowSettings(true)}
        />
        <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  // Desktop: 3-panel layout
  return (
    <div className="h-[calc(100vh-68px)] flex overflow-hidden -m-6 md:-m-8">
      {/* Left panel — thread list */}
      <div className="w-[320px] flex-shrink-0">
        <ThreadList
          threads={DUMMY_THREADS}
          selectedId={selectedId}
          onSelect={handleSelectThread}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Centre panel — chat */}
      <div className="flex-1 min-w-0">
        {selectedThread ? (
          <ChatWindow
            thread={selectedThread}
            messages={messages}
            onBack={() => setSelectedId(null)}
            onToggleDetails={() => setShowDetails(!showDetails)}
            isMobile={false}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Your messages</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">Select a conversation from the left to start messaging landlords and agents.</p>
          </div>
        )}
      </div>

      {/* Right panel — inquiry details */}
      {showDetails && selectedThread && !selectedThread.isSupport && (
        <div className="w-[320px] flex-shrink-0">
          <InboxInquiryPanel thread={selectedThread} onClose={() => setShowDetails(false)} />
        </div>
      )}

      <MessagingSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
