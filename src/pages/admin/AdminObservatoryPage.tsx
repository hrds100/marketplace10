import { useState, useCallback, useMemo } from 'react';
import ObservatoryTopBar from '@/components/admin/ObservatoryTopBar';
import ObservatoryUserList from '@/components/admin/ObservatoryUserList';
import ObservatoryUserDetail from '@/components/admin/ObservatoryUserDetail';
import ObservatoryConversationViewer from '@/components/admin/ObservatoryConversationViewer';
import { useObservatory } from '@/hooks/useObservatory';
import type { ObsProfile, ObsThread } from '@/hooks/useObservatory';

type MobileTab = 'users' | 'detail' | 'chat';

export default function AdminObservatoryPage() {
  const obs = useObservatory();

  const [selectedUser, setSelectedUser] = useState<ObsProfile | null>(null);
  const [selectedThread, setSelectedThread] = useState<ObsThread | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('users');

  /* Profile name map for conversation viewer */
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  const handleSelectUser = useCallback(
    (u: ObsProfile) => {
      setSelectedUser(u);
      setSelectedThread(null);
      obs.fetchUserThreads(u.id);
      obs.fetchUserActivity(u.id);
      obs.fetchUserCounts(u.id);
      obs.logView('observatory_view_user', 'profiles', u.id, {
        name: u.name,
        whatsapp: u.whatsapp,
      });
      // Build profile names for this user
      setProfileNames((prev) => ({
        ...prev,
        [u.id]: u.name || 'Unknown',
      }));
      setMobileTab('detail');
    },
    [obs],
  );

  const handleSelectThread = useCallback(
    (t: ObsThread) => {
      setSelectedThread(t);
      obs.fetchMessages(t.id);
      obs.logView('observatory_view_thread', 'chat_threads', t.id, {
        property_name: t.property_name,
      });
      // Add both party names to profile map
      setProfileNames((prev) => ({
        ...prev,
        ...(t.operator_id ? { [t.operator_id]: t.operator_name || 'Unknown' } : {}),
        ...(t.landlord_id ? { [t.landlord_id]: t.landlord_name || 'Unknown' } : {}),
      }));
      setMobileTab('chat');
    },
    [obs],
  );

  /* For "All Threads" mode: selecting a thread directly */
  const handleSelectThreadDirect = useCallback(
    (t: ObsThread) => {
      setSelectedThread(t);
      setSelectedUser(null);
      obs.fetchMessages(t.id);
      obs.logView('observatory_view_thread', 'chat_threads', t.id, {
        property_name: t.property_name,
      });
      setProfileNames((prev) => ({
        ...prev,
        ...(t.operator_id ? { [t.operator_id]: t.operator_name || 'Unknown' } : {}),
        ...(t.landlord_id ? { [t.landlord_id]: t.landlord_name || 'Unknown' } : {}),
      }));
      setMobileTab('chat');
    },
    [obs],
  );

  const effectiveUserId = useMemo(() => {
    if (selectedUser) return selectedUser.id;
    if (selectedThread?.operator_id) return selectedThread.operator_id;
    return null;
  }, [selectedUser, selectedThread]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col -m-6 md:-m-8">
      {/* Top bar */}
      <div className="p-3 flex-shrink-0">
        <ObservatoryTopBar stats={obs.stats} loading={obs.statsLoading} />
      </div>

      {/* Mobile tab switcher — visible only below lg */}
      <div className="flex lg:hidden border-b border-[#E5E7EB] px-3 gap-1">
        {(['users', 'detail', 'chat'] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-[12px] font-medium capitalize transition-colors rounded-t-lg ${
              mobileTab === tab
                ? 'bg-white text-[#1E9A80] border-b-2 border-[#1E9A80]'
                : 'text-[#6B7280]'
            }`}
          >
            {tab === 'users' ? 'Users' : tab === 'detail' ? 'Detail' : 'Chat'}
          </button>
        ))}
      </div>

      {/* Three-panel layout — desktop */}
      <div className="flex-1 flex min-h-0">
        {/* Panel A — User List (240px) */}
        <div className={`w-[240px] flex-shrink-0 ${mobileTab === 'users' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`}>
          <ObservatoryUserList
            users={obs.users}
            usersLoading={obs.usersLoading}
            userSearch={obs.userSearch}
            setUserSearch={obs.setUserSearch}
            tierFilter={obs.tierFilter}
            setTierFilter={obs.setTierFilter}
            userPage={obs.userPage}
            setUserPage={obs.setUserPage}
            pageSize={obs.PAGE_SIZE}
            selectedUserId={selectedUser?.id ?? null}
            onSelectUser={handleSelectUser}
            listMode={obs.listMode}
            setListMode={obs.setListMode}
            allThreads={obs.allThreads}
            allThreadsLoading={obs.allThreadsLoading}
            onSelectThread={handleSelectThreadDirect}
            selectedThreadId={selectedThread?.id ?? null}
          />
        </div>

        {/* Panel B — User Detail (340px) */}
        <div className={`w-[340px] flex-shrink-0 ${mobileTab === 'detail' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`}>
          <ObservatoryUserDetail
            selectedUser={selectedUser}
            threads={obs.userThreads}
            threadsLoading={obs.userThreadsLoading}
            activity={obs.userActivity}
            activityLoading={obs.userActivityLoading}
            messageCount={obs.userMessageCount}
            listingCount={obs.userListingCount}
            onSelectThread={handleSelectThread}
            selectedThreadId={selectedThread?.id ?? null}
          />
        </div>

        {/* Panel C — Conversation Viewer (flex fill) */}
        <div className={`flex-1 min-w-0 ${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`}>
          <ObservatoryConversationViewer
            thread={selectedThread}
            messages={obs.messages}
            loading={obs.messagesLoading}
            selectedUserId={effectiveUserId}
            profileNames={profileNames}
          />
        </div>
      </div>
    </div>
  );
}
