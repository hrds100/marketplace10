import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

/* ── Types ─────────────────────────────────────────────────── */

export interface ObsProfile {
  id: string;
  name: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  tier: string | null;
  suspended: boolean | null;
  whatsapp_verified: boolean | null;
  created_at?: string;
}

export interface ObsThread {
  id: string;
  operator_id: string | null;
  landlord_id: string | null;
  property_id: string | null;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  status: string;
  created_at: string;
  is_read: boolean;
  // joined
  property_name?: string | null;
  operator_name?: string | null;
  landlord_name?: string | null;
}

export interface ObsMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  body_receiver: string | null;
  is_masked: boolean;
  message_type: string;
  created_at: string;
}

export interface ObsAuditEntry {
  id: string;
  user_id: string;
  action: string;
  target_table: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ObsStats {
  totalUsers: number;
  totalThreads: number;
  activeThreads: number;
  onlineRecent: number;
}

/* ── Hook ──────────────────────────────────────────────────── */

export function useObservatory() {
  const { user } = useAuth();

  /* stats */
  const [stats, setStats] = useState<ObsStats>({
    totalUsers: 0,
    totalThreads: 0,
    activeThreads: 0,
    onlineRecent: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  /* users */
  const [users, setUsers] = useState<ObsProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [userPage, setUserPage] = useState(0);
  const PAGE_SIZE = 30;

  /* threads for selected user */
  const [userThreads, setUserThreads] = useState<ObsThread[]>([]);
  const [userThreadsLoading, setUserThreadsLoading] = useState(false);

  /* all threads mode */
  const [allThreads, setAllThreads] = useState<ObsThread[]>([]);
  const [allThreadsLoading, setAllThreadsLoading] = useState(false);
  const [listMode, setListMode] = useState<'users' | 'threads'>('users');

  /* messages for selected thread */
  const [messages, setMessages] = useState<ObsMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  /* user activity */
  const [userActivity, setUserActivity] = useState<ObsAuditEntry[]>([]);
  const [userActivityLoading, setUserActivityLoading] = useState(false);

  /* user message + listing counts */
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [userListingCount, setUserListingCount] = useState(0);

  /* ── Fetch stats ───────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const [usersRes, threadsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('chat_threads').select('id', { count: 'exact', head: true }),
      ]);

      // active = threads with status 'active' or terms_accepted
      const { count: activeCount } = await supabase
        .from('chat_threads')
        .select('id', { count: 'exact', head: true })
        .eq('terms_accepted', true);

      // "online" = profiles created or updated recently (proxy — last 24h signups)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: onlineCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalThreads: threadsRes.count ?? 0,
        activeThreads: activeCount ?? 0,
        onlineRecent: onlineCount ?? 0,
      });
    } catch (err) {
      console.error('[Observatory] Stats fetch error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 30_000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  /* ── Fetch users ───────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      let q = supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })
        .range(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE - 1);

      if (tierFilter !== 'all') {
        q = q.eq('tier', tierFilter);
      }
      if (userSearch.trim()) {
        q = q.or(`name.ilike.%${userSearch.trim()}%,email.ilike.%${userSearch.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setUsers((data as ObsProfile[]) ?? []);
    } catch (err) {
      console.error('[Observatory] Users fetch error:', err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, tierFilter, userSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Fetch threads for a user ──────────────────────────── */
  const fetchUserThreads = useCallback(async (userId: string) => {
    setUserThreadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*, property:properties(name), operator:profiles!chat_threads_operator_id_fkey(name), landlord:profiles!chat_threads_landlord_id_fkey(name)')
        .or(`operator_id.eq.${userId},landlord_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ObsThread[] = (data ?? []).map((t: any) => ({
        id: t.id,
        operator_id: t.operator_id,
        landlord_id: t.landlord_id,
        property_id: t.property_id,
        terms_accepted: t.terms_accepted,
        terms_accepted_at: t.terms_accepted_at,
        status: t.status,
        created_at: t.created_at,
        is_read: t.is_read,
        property_name: t.property?.name ?? null,
        operator_name: t.operator?.name ?? null,
        landlord_name: t.landlord?.name ?? null,
      }));

      setUserThreads(mapped);
    } catch (err) {
      console.error('[Observatory] User threads error:', err);
      setUserThreads([]);
    } finally {
      setUserThreadsLoading(false);
    }
  }, []);

  /* ── Fetch all threads ─────────────────────────────────── */
  const fetchAllThreads = useCallback(async () => {
    setAllThreadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*, property:properties(name), operator:profiles!chat_threads_operator_id_fkey(name), landlord:profiles!chat_threads_landlord_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const mapped: ObsThread[] = (data ?? []).map((t: any) => ({
        id: t.id,
        operator_id: t.operator_id,
        landlord_id: t.landlord_id,
        property_id: t.property_id,
        terms_accepted: t.terms_accepted,
        terms_accepted_at: t.terms_accepted_at,
        status: t.status,
        created_at: t.created_at,
        is_read: t.is_read,
        property_name: t.property?.name ?? null,
        operator_name: t.operator?.name ?? null,
        landlord_name: t.landlord?.name ?? null,
      }));

      setAllThreads(mapped);
    } catch (err) {
      console.error('[Observatory] All threads error:', err);
      setAllThreads([]);
    } finally {
      setAllThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (listMode === 'threads') {
      fetchAllThreads();
    }
  }, [listMode, fetchAllThreads]);

  /* ── Fetch messages for a thread ───────────────────────── */
  const fetchMessages = useCallback(async (threadId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as ObsMessage[]) ?? []);
    } catch (err) {
      console.error('[Observatory] Messages error:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  /* ── Fetch user activity (audit log) ───────────────────── */
  const fetchUserActivity = useCallback(async (userId: string) => {
    setUserActivityLoading(true);
    try {
      const { data, error } = await (supabase.from('admin_audit_log') as any)
        .select('*')
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserActivity((data as ObsAuditEntry[]) ?? []);
    } catch (err) {
      console.error('[Observatory] User activity error:', err);
      setUserActivity([]);
    } finally {
      setUserActivityLoading(false);
    }
  }, []);

  /* ── Fetch user counts (messages + listings) ───────────── */
  const fetchUserCounts = useCallback(async (userId: string) => {
    try {
      const [msgRes, listRes] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', userId),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('submitted_by', userId),
      ]);
      setUserMessageCount(msgRes.count ?? 0);
      setUserListingCount(listRes.count ?? 0);
    } catch {
      setUserMessageCount(0);
      setUserListingCount(0);
    }
  }, []);

  /* ── Audit: log view action ────────────────────────────── */
  const logView = useCallback(
    (action: string, targetTable: string, targetId: string, metadata?: Record<string, unknown>) => {
      if (!user?.id) return;
      logAdminAction(user.id, {
        action,
        target_table: targetTable,
        target_id: targetId,
        metadata,
      });
    },
    [user?.id],
  );

  return {
    stats,
    statsLoading,
    users,
    usersLoading,
    userSearch,
    setUserSearch,
    tierFilter,
    setTierFilter,
    userPage,
    setUserPage,
    PAGE_SIZE,
    listMode,
    setListMode,
    userThreads,
    userThreadsLoading,
    fetchUserThreads,
    allThreads,
    allThreadsLoading,
    messages,
    messagesLoading,
    fetchMessages,
    userActivity,
    userActivityLoading,
    fetchUserActivity,
    userMessageCount,
    userListingCount,
    fetchUserCounts,
    logView,
  };
}
