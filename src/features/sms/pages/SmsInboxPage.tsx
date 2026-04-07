import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import ConversationList from '../components/inbox/ConversationList';
import MessageThread from '../components/inbox/MessageThread';
import ComposeBox from '../components/inbox/ComposeBox';
import ContactInfoPanel from '../components/inbox/ContactInfoPanel';
import type { SmsInternalNote, SmsMessage } from '../types';
import { mockConversations } from '../data/mockConversations';
import { mockMessages as initialMockMessages } from '../data/mockMessages';
import { mockTemplates } from '../data/mockTemplates';
import { mockQuickReplies } from '../data/mockQuickReplies';
import { mockLabels } from '../data/mockLabels';
import { mockStages } from '../data/mockStages';

// Mock internal notes for the contact info panel
const mockInternalNotes: SmsInternalNote[] = [
  {
    id: 'note-1',
    conversationId: 'conv-1',
    authorId: 'user-1',
    authorName: 'Hugo',
    body: 'Inbound from Google Ads campaign. Responded within 5 mins.',
    createdAt: '2026-04-06T18:10:00.000Z',
  },
  {
    id: 'note-2',
    conversationId: 'conv-2',
    authorId: 'user-1',
    authorName: 'Hugo',
    body: 'Very interested after viewing. Follow up with agreement ASAP.',
    createdAt: '2026-04-05T10:30:00.000Z',
  },
];

export default function SmsInboxPage() {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<SmsMessage[]>(initialMockMessages);

  const selectedConversation = useMemo(
    () => mockConversations.find((c) => c.id === selectedId) ?? null,
    [selectedId]
  );

  const selectedContact = selectedConversation?.contact ?? null;

  const threadMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messages
      .filter((m) => m.contactId === selectedContact.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedContact]);

  const notesForConversation = useMemo(() => {
    if (!selectedId) return [];
    return mockInternalNotes.filter((n) => n.conversationId === selectedId);
  }, [selectedId]);

  const handleSend = useCallback(
    (body: string) => {
      if (!selectedContact) return;
      const newMsg: SmsMessage = {
        id: `msg-new-${Date.now()}`,
        twilioSid: `SM-local-${Date.now()}`,
        fromNumber: '+447911234567',
        toNumber: selectedContact.phoneNumber,
        body,
        direction: 'outbound',
        status: 'sent',
        mediaUrls: [],
        numberId: 'num-1',
        contactId: selectedContact.id,
        campaignId: null,
        errorCode: null,
        errorMessage: null,
        scheduledAt: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    [selectedContact]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setContactInfoOpen(false);
  }, []);

  // Mobile: show either list or thread
  if (isMobile) {
    if (selectedId && selectedContact) {
      return (
        <div className="flex flex-col h-full bg-[#F3F3EE]">
          {/* Mobile header with back */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E5E7EB] bg-white">
            <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                {selectedContact.displayName ?? selectedContact.phoneNumber}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <MessageThread
              messages={threadMessages}
              contact={selectedContact}
              onOpenContactInfo={() => setContactInfoOpen(true)}
            />
          </div>

          <ComposeBox
            onSend={handleSend}
            templates={mockTemplates}
            quickReplies={mockQuickReplies}
          />

          <ContactInfoPanel
            contact={selectedContact}
            open={contactInfoOpen}
            onClose={() => setContactInfoOpen(false)}
            stages={mockStages}
            internalNotes={notesForConversation}
          />
        </div>
      );
    }

    return (
      <div className="h-full bg-white">
        <ConversationList
          conversations={mockConversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          labels={mockLabels}
        />
      </div>
    );
  }

  // Desktop: resizable split layout
  return (
    <div className="h-full bg-[#F3F3EE]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
          <ConversationList
            conversations={mockConversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            labels={mockLabels}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel>
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <MessageThread
                messages={threadMessages}
                contact={selectedContact}
                onOpenContactInfo={() => setContactInfoOpen(true)}
              />
            </div>

            {selectedContact && (
              <ComposeBox
                onSend={handleSend}
                templates={mockTemplates}
                quickReplies={mockQuickReplies}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ContactInfoPanel
        contact={selectedContact}
        open={contactInfoOpen}
        onClose={() => setContactInfoOpen(false)}
        stages={mockStages}
        internalNotes={notesForConversation}
      />
    </div>
  );
}
