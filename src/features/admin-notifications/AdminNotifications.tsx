/**
 * AdminNotifications — shows platform notifications for admin users.
 *
 * Expected behaviour:
 * - Loads notifications for current admin user, ordered by created_at DESC
 * - Unread rows have accent background, read rows are plain
 * - "Mark read" per row, "Mark all read" button at top
 * - Click notification title navigates to the property in admin
 * - Refreshes count every 30 seconds via polling
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, ExternalLink, Trash2, Send, Loader2 } from 'lucide-react';
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

export default function AdminNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'admin' | 'user'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPin, setBulkPin] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ title: '', body: '', sendEmail: false });
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // notifications table not in generated types — cast needed
    // Admin sees own + admin-wide (user_id IS NULL)
    const { data } = await (supabase.from('notifications') as any)
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const sendToAll = async () => {
    if (!sendForm.title.trim()) { toast.error('Title is required'); return; }
    setSending(true);
    try {
      // Insert bell notification for all users (user_id = null means admin-wide)
      const { error } = await (supabase.from('notifications') as any).insert({
        user_id: null,
        type: 'admin_broadcast',
        title: sendForm.title.trim(),
        body: sendForm.body.trim() || null,
      });
      if (error) throw error;

      // Optionally send email to all users
      if (sendForm.sendEmail) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'admin-broadcast',
            data: { title: sendForm.title.trim(), body: sendForm.body.trim() },
          },
        }).catch(() => {});
      }

      toast.success('Notification sent to all users');
      setSendOpen(false);
      setSendForm({ title: '', body: '', sendEmail: false });
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to send: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      setSending(false);
    }
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await (supabase.from('notifications') as any).update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await (supabase.from('notifications') as any)
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  };

  const filtered = tab === 'all' ? notifications
    : tab === 'admin' ? notifications.filter(n => !n.user_id)
    : notifications.filter(n => !!n.user_id);
  const unreadCount = filtered.filter(n => !n.read).length;

  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    if (notif.property_id) {
      navigate(`/admin/submissions`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(n => n.id)));
    }
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

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Loading notifications...</div>
    );
  }

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden mr-2">
            {(['all', 'admin', 'user'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-primary text-white' : 'text-foreground hover:bg-secondary'}`}>{t === 'admin' ? 'Platform' : t === 'user' ? 'Personal' : 'All'}</button>
            ))}
          </div>
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground">
              <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer" />
              Select all
            </label>
          )}
          <button
            onClick={() => setSendOpen(true)}
            className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> Send to all
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div data-feature="ADMIN__NOTIFICATIONS_LIST" className="bg-card border border-border rounded-2xl overflow-hidden">
          {filtered.map((notif, i) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
                !notif.read ? 'bg-accent-light/50' : ''
              } ${i > 0 ? 'border-t border-border' : ''}`}
              onClick={() => handleClick(notif)}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(notif.id)}
                onChange={() => toggleSelect(notif.id)}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 rounded border-border accent-[#1E9A80] cursor-pointer flex-shrink-0 mt-1"
              />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                notif.type === 'new_deal' ? 'bg-emerald-100' : 'bg-amber-100'
              }`}>
                <Bell className={`w-4 h-4 ${
                  notif.type === 'new_deal' ? 'text-emerald-700' : 'text-amber-700'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${!notif.read ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                    {notif.title}
                  </span>
                  {notif.property_id && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </div>
                {notif.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 block">{timeAgo(notif.created_at)}</span>
              </div>
              {!notif.read && (
                <button
                  data-feature="ADMIN__NOTIFICATIONS_TOGGLE"
                  onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                  className="text-[10px] font-medium text-primary hover:opacity-75 flex-shrink-0 mt-1"
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hard Delete Selected
          </button>
        </div>
      )}

      {/* Bulk Delete PIN Dialog */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Bulk Delete Notifications</h3>
                <p className="text-xs text-red-600 font-semibold">Permanently delete {selectedIds.size} notification(s)</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">Enter PIN to confirm</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={bulkPin}
                onChange={e => setBulkPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setBulkDeleteOpen(false); setBulkPin(''); }} className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={bulkDeleteNotifications}
                disabled={bulkDeleting || bulkPin.length !== 4}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send to All Modal */}
      {sendOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setSendOpen(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[460px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Send Notification</h3>
                <p className="text-xs text-muted-foreground">This will appear in every user's notification bell</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Title</label>
                <input value={sendForm.title} onChange={e => setSendForm(p => ({ ...p, title: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="e.g. New feature launched!" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Message (optional)</label>
                <textarea value={sendForm.body} onChange={e => setSendForm(p => ({ ...p, body: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" rows={3} placeholder="Additional details..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sendForm.sendEmail} onChange={e => setSendForm(p => ({ ...p, sendEmail: e.target.checked }))} className="w-4 h-4 rounded border-border accent-[#1E9A80]" />
                <span className="text-sm text-foreground">Also send via email</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSendOpen(false)} className="flex-1 h-11 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={sendToAll} disabled={sending} className="flex-1 h-11 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Send to all users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
