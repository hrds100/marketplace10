import { useEffect } from 'react';
import { User, MessageSquare, List, Clock, FileText, ChevronRight, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { ObsProfile, ObsThread, ObsAuditEntry } from '@/hooks/useObservatory';

interface Props {
  selectedUser: ObsProfile | null;
  threads: ObsThread[];
  threadsLoading: boolean;
  activity: ObsAuditEntry[];
  activityLoading: boolean;
  messageCount: number;
  listingCount: number;
  onSelectThread: (t: ObsThread) => void;
  selectedThreadId: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tierColor(tier: string | null): string {
  switch (tier) {
    case 'lifetime':
    case 'yearly':
    case 'monthly':
      return 'bg-[#ECFDF5] text-[#1E9A80]';
    default:
      return 'bg-gray-100 text-[#6B7280]';
  }
}

export default function ObservatoryUserDetail({
  selectedUser,
  threads,
  threadsLoading,
  activity,
  activityLoading,
  messageCount,
  listingCount,
  onSelectThread,
  selectedThreadId,
}: Props) {
  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full bg-white border-r border-[#E5E7EB]">
        <div className="text-center text-[#9CA3AF]">
          <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-[13px]">Select a user to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E7EB]">
      {/* Profile card */}
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-[#1E9A80]/10 text-[#1E9A80] flex items-center justify-center text-[14px] font-semibold flex-shrink-0">
            {getInitials(selectedUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[#1A1A1A] truncate">
              {selectedUser.name || 'Unnamed'}
            </div>
            <div className="text-[12px] text-[#6B7280] truncate">
              {selectedUser.whatsapp || 'No phone'}
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${tierColor(selectedUser.tier)}`}>
            {selectedUser.tier || 'free'}
          </Badge>
          {selectedUser.suspended && (
            <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
              Suspended
            </Badge>
          )}
          {selectedUser.whatsapp_verified && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-[#ECFDF5] text-[#1E9A80]">
              Verified
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg py-1.5">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">{messageCount}</div>
            <div className="text-[10px] text-[#6B7280]">Messages</div>
          </div>
          <div className="bg-gray-50 rounded-lg py-1.5">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">{listingCount}</div>
            <div className="text-[10px] text-[#6B7280]">Listings</div>
          </div>
          <div className="bg-gray-50 rounded-lg py-1.5">
            <div className="text-[10px] font-medium text-[#1A1A1A]">{formatDate(selectedUser.created_at)}</div>
            <div className="text-[10px] text-[#6B7280]">Joined</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conversations" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 bg-gray-50 h-8">
          <TabsTrigger value="conversations" className="text-[11px] h-6 data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">
            Conversations
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-[11px] h-6 data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            {threadsLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#9CA3AF]">
                <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-40" />
                No conversations
              </div>
            ) : (
              <div className="p-1.5">
                {threads.map((t) => {
                  const otherName =
                    t.operator_id === selectedUser.id
                      ? t.landlord_name || 'Unknown'
                      : t.operator_name || 'Unknown';
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectThread(t)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                        selectedThreadId === t.id
                          ? 'bg-[#ECFDF5] border border-[#1E9A80]/20'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[#1A1A1A] truncate">
                          {t.property_name || 'No property'}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] truncate">
                          with {otherName} &middot; {formatDate(t.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {t.terms_accepted && (
                          <Shield className="w-3 h-3 text-[#1E9A80]" />
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            {activityLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#9CA3AF]">
                <Clock className="w-6 h-6 mx-auto mb-1 opacity-40" />
                No activity logged
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {activity.map((a) => (
                  <div
                    key={a.id}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#1A1A1A]">{a.action}</span>
                      <span className="text-[#9CA3AF]">{formatTime(a.created_at)}</span>
                    </div>
                    <div className="text-[#6B7280]">
                      {a.target_table} &middot; {a.target_id.slice(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
