import { useEffect, useRef } from 'react';
import { Lock, MessageSquare, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { ObsMessage, ObsThread } from '@/hooks/useObservatory';

interface Props {
  thread: ObsThread | null;
  messages: ObsMessage[];
  loading: boolean;
  selectedUserId: string | null;
  /** Map of profile id → name for displaying sender names */
  profileNames: Record<string, string>;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ObservatoryConversationViewer({
  thread,
  messages,
  loading,
  selectedUserId,
  profileNames,
}: Props) {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F3F3EE]">
        <div className="text-center text-[#9CA3AF]">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-[14px] font-medium">Select a conversation</p>
          <p className="text-[12px] mt-1">Messages will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F3F3EE]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#1A1A1A] truncate">
            {thread.property_name || 'No property'}
          </div>
          <div className="text-[11px] text-[#6B7280] truncate">
            {thread.operator_name || 'Unknown'} &harr; {thread.landlord_name || 'Unknown'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {thread.terms_accepted ? (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-[#ECFDF5] text-[#1E9A80]">
              <Shield className="w-3 h-3 mr-1" />
              NDA Signed
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100 text-[#6B7280]">
              No NDA
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-12 w-[60%] rounded-xl" />
                </div>
              ))}
            </>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-[#9CA3AF] text-[13px]">
              No messages in this thread
            </div>
          ) : (
            messages.map((m) => {
              const isSelectedUser = m.sender_id === selectedUserId;
              const isSystem = m.message_type === 'system';
              const senderName = profileNames[m.sender_id] || 'Unknown';

              if (isSystem) {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <div className="bg-gray-200/60 text-[#6B7280] text-[11px] px-3 py-1 rounded-full">
                      {m.body}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex ${isSelectedUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isSelectedUser
                        ? 'bg-[#1E9A80] text-white rounded-br-md'
                        : 'bg-white text-[#1A1A1A] border border-[#E5E7EB] rounded-bl-md'
                    }`}
                  >
                    <div className={`text-[10px] font-medium mb-0.5 ${isSelectedUser ? 'text-white/70' : 'text-[#9CA3AF]'}`}>
                      {senderName}
                    </div>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
                      {m.body}
                    </div>
                    {m.is_masked && m.body_receiver && (
                      <div className={`text-[10px] mt-1 italic ${isSelectedUser ? 'text-white/60' : 'text-[#9CA3AF]'}`}>
                        Receiver sees: {m.body_receiver}
                      </div>
                    )}
                    <div className={`text-[9px] mt-1 ${isSelectedUser ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>

      {/* Read-only bar */}
      <div className="bg-white border-t border-[#E5E7EB] px-4 py-2.5 flex items-center justify-center gap-2 flex-shrink-0">
        <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[12px] text-[#9CA3AF] font-medium">Read-only view</span>
      </div>
    </div>
  );
}
