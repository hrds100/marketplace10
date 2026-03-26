import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ObsProfile, ObsThread } from '@/hooks/useObservatory';

interface Props {
  users: ObsProfile[];
  usersLoading: boolean;
  userSearch: string;
  setUserSearch: (v: string) => void;
  tierFilter: string;
  setTierFilter: (v: string) => void;
  userPage: number;
  setUserPage: (v: number) => void;
  pageSize: number;
  selectedUserId: string | null;
  onSelectUser: (u: ObsProfile) => void;
  listMode: 'users' | 'threads';
  setListMode: (m: 'users' | 'threads') => void;
  allThreads: ObsThread[];
  allThreadsLoading: boolean;
  onSelectThread: (t: ObsThread) => void;
  selectedThreadId: string | null;
}

const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'free', label: 'Free' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'lifetime', label: 'Lifetime' },
];

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function tierColor(tier: string | null): string {
  switch (tier) {
    case 'lifetime':
      return 'bg-[#ECFDF5] text-[#1E9A80]';
    case 'yearly':
      return 'bg-[#ECFDF5] text-[#1E9A80]';
    case 'monthly':
      return 'bg-[#ECFDF5] text-[#1E9A80]';
    default:
      return 'bg-gray-100 text-[#6B7280]';
  }
}

export default function ObservatoryUserList({
  users,
  usersLoading,
  userSearch,
  setUserSearch,
  tierFilter,
  setTierFilter,
  userPage,
  setUserPage,
  pageSize,
  selectedUserId,
  onSelectUser,
  listMode,
  setListMode,
  allThreads,
  allThreadsLoading,
  onSelectThread,
  selectedThreadId,
}: Props) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E7EB]">
      {/* Search + Filters */}
      <div className="p-3 space-y-2 border-b border-[#E5E7EB]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#9CA3AF]" />
          <Input
            placeholder="Search name or phone..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setUserPage(0);
            }}
            className="pl-8 h-8 text-[13px] rounded-lg border-[#E5E7EB] focus-visible:ring-[#1E9A80]"
          />
        </div>
        {listMode === 'users' && (
          <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setUserPage(0); }}>
            <SelectTrigger className="h-8 text-[12px] border-[#E5E7EB] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-[12px]">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* List content */}
      <ScrollArea className="flex-1">
        {listMode === 'users' ? (
          <>
            {usersLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#6B7280]">No users found</div>
            ) : (
              <div className="p-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      selectedUserId === u.id
                        ? 'bg-[#ECFDF5] border border-[#1E9A80]/20'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[#1E9A80]/10 text-[#1E9A80] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                        {u.name || 'Unnamed'}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] truncate">
                        {u.whatsapp || 'No phone'}
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 ${tierColor(u.tier)}`}>
                      {u.tier || 'free'}
                    </Badge>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                  </button>
                ))}

                {/* Pagination */}
                {users.length >= pageSize && (
                  <div className="flex justify-center gap-2 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={userPage === 0}
                      onClick={() => setUserPage(Math.max(0, userPage - 1))}
                      className="h-7 text-[11px]"
                    >
                      Prev
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserPage(userPage + 1)}
                      className="h-7 text-[11px]"
                    >
                      More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* All Threads mode */
          <>
            {allThreadsLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : allThreads.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#6B7280]">No threads found</div>
            ) : (
              <div className="p-1.5">
                {allThreads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectThread(t)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
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
                        {t.operator_name || 'Unknown'} &harr; {t.landlord_name || 'Unknown'}
                      </div>
                    </div>
                    {t.terms_accepted && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-[#ECFDF5] text-[#1E9A80]">
                        NDA
                      </Badge>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Bottom toggle */}
      <div className="p-2 border-t border-[#E5E7EB] flex gap-1">
        <Button
          variant={listMode === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setListMode('users')}
          className={`flex-1 h-7 text-[11px] font-medium ${
            listMode === 'users'
              ? 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
              : 'text-[#6B7280]'
          }`}
        >
          Users
        </Button>
        <Button
          variant={listMode === 'threads' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setListMode('threads')}
          className={`flex-1 h-7 text-[11px] font-medium ${
            listMode === 'threads'
              ? 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
              : 'text-[#6B7280]'
          }`}
        >
          All Threads
        </Button>
      </div>
    </div>
  );
}
