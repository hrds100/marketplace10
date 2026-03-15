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
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  property_id: string | null;
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

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // notifications table not in generated types — cast needed
    const { data } = await (supabase.from('notifications') as any)
      .select('*')
      .eq('user_id', user.id)
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    if (notif.property_id) {
      navigate(`/admin/submissions`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Loading notifications...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {notifications.map((notif, i) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
                !notif.read ? 'bg-accent-light/50' : ''
              } ${i > 0 ? 'border-t border-border' : ''}`}
              onClick={() => handleClick(notif)}
            >
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
    </div>
  );
}
