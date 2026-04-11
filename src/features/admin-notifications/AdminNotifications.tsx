/**
 * AdminNotifications — two tabs: Inbox (received) + Send (compose & history).
 *
 * Inbox: shows admin's notifications, mark read, bulk delete.
 * Send: user picker, message composer with optional button, broadcast history.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, CheckCheck, ExternalLink, Trash2, Send, Loader2, Search, Users, ChevronDown, Link2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  property_id: string | null;
  user_id: string | null;
  read: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
}

interface BroadcastRecord {
  title: string;
  body: string | null;
  created_at: string;
  recipientCount: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtDateTime(dateStr: string): string {
  const dt = new Date(dateStr);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
    dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inbox' | 'send'>('inbox');

  // ── Inbox state ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPin, setBulkPin] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Send state ──
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const [sendForm, setSendForm] = useState({ title: '', body: '', sendEmail: false, buttonLabel: '', buttonUrl: '' });
  const [showButton, setShowButton] = useState(false);
  const [sending, setSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedBroadcast, setExpandedBroadcast] = useState<number | null>(null);

  // ── Fetch notifications (inbox) ──
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('notifications') as any)
      .select('id, type, title, body, property_id, user_id, read, created_at')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Fetch users (send tab) ──
  const fetchUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    setUsersLoading(true);
    const { data } = await (supabase.from('profiles') as any)
      .select('id, name, email')
      .not('email', 'is', null)
      .order('name', { ascending: true });
    if (data) setAllUsers(data.filter((u: UserProfile) => u.email && !u.email.endsWith('@nfstay.internal')));
    setUsersLoading(false);
  }, [allUsers.length]);

  // ── Fetch broadcast history ──
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await (supabase.from('notifications') as any)
      .select('title, body, created_at, user_id')
      .eq('type', 'admin_broadcast')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) {
      // Group by title+created_at (same second = same broadcast)
      const groups = new Map<string, BroadcastRecord>();
      for (const row of data as Array<{ title: string; body: string | null; created_at: string; user_id: string | null }>) {
        // Round to same minute for grouping
        const key = `${row.title}__${row.created_at.slice(0, 16)}`;
        if (!groups.has(key)) {
          groups.set(key, { title: row.title, body: row.body, created_at: row.created_at, recipientCount: 0 });
        }
        groups.get(key)!.recipientCount++;
      }
      setBroadcastHistory(Array.from(groups.values()).slice(0, 10));
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'send') {
      fetchUsers();
      fetchHistory();
    }
  }, [activeTab, fetchUsers, fetchHistory]);

  // ── Filtered users by search ──
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  // ── Inbox actions ──
  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await (supabase.from('notifications') as any).update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await (supabase.from('notifications') as any).update({ read: true }).eq('user_id', user.id).eq('read', false);
    // Also mark broadcast notifications
    await (supabase.from('notifications') as any).update({ read: true }).is('user_id', null).eq('read', false);
  };

  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    if (notif.property_id) navigate('/admin/submissions');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkDeleteNotifications = async () => {
    if (bulkPin !== '5891') { toast.error('Wrong PIN'); return; }
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase.from('notifications') as any).delete().in('id', ids);
      if (error) throw error;
      if (user) logAdminAction(user.id, { action: 'bulk_delete_notifications', target_table: 'notifications', target_id: ids.join(','), metadata: { count: ids.length } });
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setBulkPin('');
      toast.success(`${ids.length} notification(s) deleted`);
    } catch (err) {
      toast.error('Delete failed: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      setBulkDeleting(false);
    }
  };

  // ── Send action ──
  const sendNotification = async () => {
    if (!sendForm.title.trim()) { toast.error('Title is required'); return; }
    if (selectedUserIds.size === 0) { toast.error('Select at least one user'); return; }
    setSending(true);
    try {
      // Build body with optional button
      let fullBody = sendForm.body.trim() || null;
      if (showButton && sendForm.buttonLabel.trim() && sendForm.buttonUrl.trim()) {
        const buttonText = `\n\n[${sendForm.buttonLabel.trim()}](${sendForm.buttonUrl.trim()})`;
        fullBody = (fullBody || '') + buttonText;
      }

      // Insert one notification per selected user
      const rows = Array.from(selectedUserIds).map(uid => ({
        user_id: uid,
        type: 'admin_broadcast',
        title: sendForm.title.trim(),
        body: fullBody,
      }));

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await (supabase.from('notifications') as any).insert(batch);
        if (error) throw error;
      }

      // Optionally send email
      if (sendForm.sendEmail) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'admin-broadcast',
            data: { title: sendForm.title.trim(), body: sendForm.body.trim() },
          },
        }).catch(() => {});
      }

      if (user) logAdminAction(user.id, {
        action: 'send_notification',
        target_table: 'notifications',
        target_id: 'broadcast',
        metadata: { title: sendForm.title, recipients: selectedUserIds.size },
      });

      toast.success(`Notification sent to ${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''}`);
      setSendForm({ title: '', body: '', sendEmail: false, buttonLabel: '', buttonUrl: '' });
      setShowButton(false);
      setSelectedUserIds(new Set());
      fetchHistory();
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to send: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      setSending(false);
    }
  };

  // ── User selection helpers ──
  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUsers = () => {
    if (selectedUserIds.size === allUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(allUsers.map(u => u.id)));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading && activeTab === 'inbox') {
    return <div className="text-center py-12" style={{ color: '#9CA3AF' }}>Loading notifications...</div>;
  }

  return (
    <div data-feature="ADMIN">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold" style={{ color: '#1A1A1A' }}>Notifications</h1>
          {unreadCount > 0 && activeTab === 'inbox' && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: '#F3F3EE' }}>
        {([
          { key: 'inbox' as const, label: 'Inbox' },
          { key: 'send' as const, label: 'Send' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={activeTab === t.key
              ? { backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: 'rgba(0,0,0,0.08) 0 1px 3px' }
              : { color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ INBOX TAB ═══════════════ */}
      {activeTab === 'inbox' && (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="h-8 px-3 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 inline-flex items-center gap-1.5"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: '#E5E7EB' }} />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No notifications yet.</p>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              {notifications.map((notif, i) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50"
                  style={{
                    backgroundColor: !notif.read ? 'rgba(236,253,245,0.4)' : undefined,
                    borderTop: i > 0 ? '1px solid #F3F4F6' : undefined,
                  }}
                  onClick={() => handleClick(notif)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notif.id)}
                    onChange={() => toggleSelect(notif.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer flex-shrink-0 mt-1"
                  />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: notif.type === 'new_deal' ? '#ECFDF5' : '#FEF3C7' }}>
                    <Bell className="w-4 h-4" style={{ color: notif.type === 'new_deal' ? '#1E9A80' : '#D97706' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!notif.read ? 'font-semibold' : 'font-medium'}`} style={{ color: '#1A1A1A' }}>
                        {notif.title}
                      </span>
                      {notif.property_id && <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: '#9CA3AF' }} />}
                    </div>
                    {notif.body && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>{notif.body}</p>
                    )}
                    <span className="text-[10px] mt-1 block" style={{ color: '#9CA3AF' }}>{timeAgo(notif.created_at)}</span>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                      className="text-[10px] font-medium hover:opacity-75 flex-shrink-0 mt-1"
                      style={{ color: '#1E9A80' }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Floating Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t px-6 py-3 flex items-center justify-between"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: 'rgba(0,0,0,0.08) 0 -4px 24px' }}>
              <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{selectedIds.size} selected</span>
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
                style={{ backgroundColor: '#DC2626' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          )}

          {/* Bulk Delete PIN Dialog */}
          {bulkDeleteOpen && (
            <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }}>
              <div className="rounded-2xl border p-6 w-full max-w-[400px]" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DC2626' }}>
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: '#1A1A1A' }}>Delete Notifications</h3>
                    <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>Permanently delete {selectedIds.size} notification(s)</p>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#1A1A1A' }}>Enter PIN to confirm</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={bulkPin}
                    onChange={e => setBulkPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="----"
                    className="w-full h-11 px-3 rounded-lg border text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ borderColor: '#E5E5E5' }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }} className="flex-1 h-11 rounded-lg border text-sm font-medium transition-colors" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>Cancel</button>
                  <button
                    onClick={bulkDeleteNotifications}
                    disabled={bulkDeleting || bulkPin.length !== 4}
                    className="flex-1 h-11 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    {bulkDeleting ? 'Deleting...' : 'Delete All'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ SEND TAB ═══════════════ */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          {/* Composer Card */}
          <div className="rounded-2xl border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <h2 className="text-base font-bold mb-4" style={{ color: '#1A1A1A' }}>Compose Notification</h2>

            {/* User Picker */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: '#525252' }}>Recipients *</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: '#1E9A80' }}>
                    {selectedUserIds.size} of {allUsers.length} selected
                  </span>
                  <button
                    onClick={selectAllUsers}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                    style={selectedUserIds.size === allUsers.length
                      ? { backgroundColor: '#1E9A80', color: '#FFFFFF' }
                      : { backgroundColor: '#ECFDF5', color: '#1E9A80' }}
                  >
                    {selectedUserIds.size === allUsers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full h-9 rounded-lg border pl-9 pr-3 text-xs"
                  style={{ borderColor: '#E5E5E5' }}
                />
              </div>

              {/* User list */}
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#E5E7EB', maxHeight: 200, overflowY: 'auto' }}>
                {usersLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: '#9CA3AF' }} />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs" style={{ color: '#9CA3AF' }}>No users found</div>
                ) : (
                  filteredUsers.map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ borderBottom: '1px solid #F3F4F6' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="w-3.5 h-3.5 rounded accent-[#1E9A80] cursor-pointer flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium block truncate" style={{ color: '#1A1A1A' }}>{u.name || 'No name'}</span>
                        <span className="text-[10px] block truncate" style={{ color: '#9CA3AF' }}>{u.email}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="text-xs font-semibold block mb-1" style={{ color: '#525252' }}>Title *</label>
              <input
                value={sendForm.title}
                onChange={e => setSendForm(p => ({ ...p, title: e.target.value }))}
                className="w-full h-10 rounded-lg border px-3 text-sm"
                style={{ borderColor: '#E5E5E5' }}
                placeholder="e.g. New feature launched!"
              />
            </div>

            {/* Body */}
            <div className="mb-3">
              <label className="text-xs font-semibold block mb-1" style={{ color: '#525252' }}>Message (optional)</label>
              <textarea
                value={sendForm.body}
                onChange={e => setSendForm(p => ({ ...p, body: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                style={{ borderColor: '#E5E5E5', minHeight: 80 }}
                rows={3}
                placeholder="Additional details..."
              />
            </div>

            {/* Optional Button */}
            <div className="mb-4">
              {!showButton ? (
                <button
                  onClick={() => setShowButton(true)}
                  className="text-xs font-medium inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ color: '#1E9A80' }}
                >
                  <Link2 className="w-3.5 h-3.5" /> Add a button with link
                </button>
              ) : (
                <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: '#525252' }}>Button</span>
                    <button onClick={() => { setShowButton(false); setSendForm(p => ({ ...p, buttonLabel: '', buttonUrl: '' })); }}>
                      <X className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={sendForm.buttonLabel}
                      onChange={e => setSendForm(p => ({ ...p, buttonLabel: e.target.value }))}
                      placeholder="Button label"
                      className="h-8 rounded-md border px-2 text-xs"
                      style={{ borderColor: '#E5E5E5' }}
                    />
                    <input
                      value={sendForm.buttonUrl}
                      onChange={e => setSendForm(p => ({ ...p, buttonUrl: e.target.value }))}
                      placeholder="https://..."
                      className="h-8 rounded-md border px-2 text-xs"
                      style={{ borderColor: '#E5E5E5' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Email toggle + Send */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendForm.sendEmail}
                  onChange={e => setSendForm(p => ({ ...p, sendEmail: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#1E9A80]"
                />
                <span className="text-sm" style={{ color: '#1A1A1A' }}>Also send via email</span>
              </label>
              <button
                onClick={sendNotification}
                disabled={sending}
                className="h-10 px-5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                style={{ backgroundColor: '#1E9A80' }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : `Send to ${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Broadcast History */}
          <div className="rounded-2xl border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: '#1E9A80' }} />
              <h2 className="text-base font-bold" style={{ color: '#1A1A1A' }}>Broadcast History</h2>
            </div>

            {historyLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: '#9CA3AF' }} />
              </div>
            ) : broadcastHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs" style={{ color: '#9CA3AF' }}>No broadcasts sent yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFA' }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Title</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Recipients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {broadcastHistory.map((b, i) => (
                      <tr key={i}>
                        <td colSpan={3} className="p-0">
                          <div
                            className="flex items-center cursor-pointer transition-colors hover:bg-gray-50 px-4 py-3"
                            style={{ borderBottom: '1px solid #F3F4F6' }}
                            onClick={() => setExpandedBroadcast(expandedBroadcast === i ? null : i)}
                          >
                            <span className="text-xs flex-shrink-0" style={{ color: '#6B7280', width: 160 }}>{fmtDateTime(b.created_at)}</span>
                            <span className="text-sm font-medium flex-1 truncate" style={{ color: '#1A1A1A' }}>
                              {b.title}
                              <ChevronDown className={`w-3 h-3 inline ml-1 transition-transform ${expandedBroadcast === i ? 'rotate-180' : ''}`} style={{ color: '#9CA3AF' }} />
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#ECFDF5', color: '#1E9A80' }}>
                              {b.recipientCount} user{b.recipientCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {expandedBroadcast === i && b.body && (
                            <div className="px-4 pb-3 pt-1" style={{ backgroundColor: '#FAFAFA' }}>
                              <p className="text-xs whitespace-pre-wrap" style={{ color: '#6B7280' }}>{b.body}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
