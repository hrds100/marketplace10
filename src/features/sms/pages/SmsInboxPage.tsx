import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
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
import type { SmsInternalNote } from '../types';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useMarkRead } from '../hooks/useMarkRead';
import { useUpdateContact } from '../hooks/useUpdateContact';
import { useAutomations } from '../hooks/useAutomations';
import { useConversationAutomation } from '../hooks/useConversationAutomation';
import { mockTemplates } from '../data/mockTemplates';
import { mockQuickReplies } from '../data/mockQuickReplies';
import { mockLabels } from '../data/mockLabels';

// Mock internal notes — not yet in DB for this phase
const mockInternalNotes: SmsInternalNote[] = [];

export default function SmsInboxPage() {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { markRead } = useMarkRead();
  const { sendMessage, isSending } = useSendMessage();
  const { updateContact } = useUpdateContact();
  const { automations } = useAutomations();
  const {
    automationState,
    toggleAutomation,
    isToggling: isTogglingAutomation,
    resumeAutomation,
    isResuming,
  } = useConversationAutomation(selectedId);

  const handleUpdateName = useCallback(
    async (contactId: string, newName: string) => {
      await updateContact(contactId, { display_name: newName || null as never });
      toast.success('Contact name updated');
    },
    [updateContact]
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const selectedContact = selectedConversation?.contact ?? null;

  const { messages: threadMessages, isLoading: messagesLoading } = useMessages(
    selectedContact?.id ?? null
  );

  const notesForConversation = useMemo(() => {
    if (!selectedId) return [];
    return mockInternalNotes.filter((n) => n.conversationId === selectedId);
  }, [selectedId]);

  const handleSend = useCallback(
    (body: string) => {
      if (!selectedContact) return;
      sendMessage({
        to: selectedContact.phoneNumber,
        body,
        contactId: selectedContact.id,
      });
    },
    [selectedContact, sendMessage]
  );

  const handleToggleAutomation = useCallback(
    async (automationId: string | null, enabled: boolean) => {
      if (!selectedId) return;
      const automation = automations.find((a) => a.id === automationId);
      try {
        await toggleAutomation({
          conversationId: selectedId,
          automationId,
          enabled,
          flowJson: automation?.flowJson ?? null,
        });
        toast.success(enabled ? 'Automation enabled' : 'Automation paused');
      } catch {
        // Error toast handled by hook
      }
    },
    [selectedId, automations, toggleAutomation]
  );

  const handleResumeAutomation = useCallback(async () => {
    if (!automationState) return;
    try {
      await resumeAutomation(automationState.id);
    } catch {
      // Error toast handled by hook
    }
  }, [automationState, resumeAutomation]);

  const handlePauseAutomation = useCallback(async () => {
    if (!selectedId) return;
    try {
      await toggleAutomation({
        conversationId: selectedId,
        automationId: null,
        enabled: false,
      });
      toast.success('Automation paused');
    } catch {
      // Error toast handled by hook
    }
  }, [selectedId, toggleAutomation]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setContactInfoOpen(false);
      // Mark conversation as read when selected
      const conv = conversations.find((c) => c.id === id);
      if (conv && conv.unreadCount > 0) {
        markRead(id);
      }
    },
    [conversations, markRead]
  );

  // Mobile: show either list or thread
  if (isMobile) {
    if (selectedId && selectedContact) {
      return (
        <div className="flex flex-col h-full bg-white">
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
              isLoading={messagesLoading}
              onUpdateName={handleUpdateName}
              automationEnabled={selectedConversation?.automationEnabled}
              automationName={selectedConversation?.automationName}
              automations={automations}
              onToggleAutomation={handleToggleAutomation}
              isTogglingAutomation={isTogglingAutomation}
            />
          </div>

          <ComposeBox
            onSend={handleSend}
            templates={mockTemplates}
            quickReplies={mockQuickReplies}
            disabled={isSending}
          />

          <ContactInfoPanel
            contact={selectedContact}
            open={contactInfoOpen}
            onClose={() => setContactInfoOpen(false)}
            internalNotes={notesForConversation}
            automationState={automationState}
            automationName={selectedConversation?.automationName}
            onResumeAutomation={handleResumeAutomation}
            onPauseAutomation={handlePauseAutomation}
            isResuming={isResuming}
          />
        </div>
      );
    }

    return (
      <div className="h-full bg-white">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          labels={mockLabels}
          isLoading={conversationsLoading}
        />
      </div>
    );
  }

  // Desktop: resizable split layout
  return (
    <div className="h-full bg-white">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            labels={mockLabels}
            isLoading={conversationsLoading}
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
                isLoading={messagesLoading}
                onUpdateName={handleUpdateName}
                automationEnabled={selectedConversation?.automationEnabled}
                automationName={selectedConversation?.automationName}
                automations={automations}
                onToggleAutomation={handleToggleAutomation}
                isTogglingAutomation={isTogglingAutomation}
              />
            </div>

            {selectedContact && (
              <ComposeBox
                onSend={handleSend}
                templates={mockTemplates}
                quickReplies={mockQuickReplies}
                disabled={isSending}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ContactInfoPanel
        contact={selectedContact}
        open={contactInfoOpen}
        onClose={() => setContactInfoOpen(false)}
        internalNotes={notesForConversation}
        automationState={automationState}
        automationName={selectedConversation?.automationName}
        onResumeAutomation={handleResumeAutomation}
        onPauseAutomation={handlePauseAutomation}
        isResuming={isResuming}
      />
    </div>
  );
}
