import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  property_id: string | null;
}

export default function NotificationBell() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch notifications
  // Admin sees: own notifications + admin-wide (user_id IS NULL)
  // Regular user sees: own notifications only
  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifications = async () => {
      let query = (supabase.from('notifications') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Admin: own + broadcast (user_id IS NULL). Regular users: own only.
      if (isAdmin) {
        query = query.or(`user_id.eq.${user.id},user_id.is.null`);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data } = await query;
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id, isAdmin]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await (supabase.from('notifications') as any).update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    // Mark own notifications read
    await (supabase.from('notifications') as any).update({ read: true }).eq('user_id', user.id).eq('read', false);
    // Admin: also mark admin-wide notifications read
    if (isAdmin) {
      await (supabase.from('notifications') as any).update({ read: true }).is('user_id', null).eq('read', false);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const icon = (type: string) => {
    if (type === 'deal_approved') return '✅';
    if (type === 'deal_rejected') return '❌';
    if (type === 'deal_expired') return '⏰';
    if (type === 'new_signup') return '👤';
    if (type === 'purchase_confirmed') return '💰';
    if (type === 'commission_earned') return '🤝';
    if (type === 'commission_claimable') return '💵';
    if (type === 'rent_available') return '🏠';
    if (type === 'rent_claimed') return '🏦';
    if (type === 'payout_request') return '📤';
    if (type === 'payout_completed') return '✅';
    if (type === 'proposal_created') return '📋';
    if (type === 'proposal_result') return '🗳️';
    if (type === 'new_deal') return '🏡';
    if (type === 'deal_edit') return '✏️';
    if (type === 'new_message') return '💬';
    if (type === 'nda_signed') return '📝';
    return '🔔';
  };

  return (
    <div data-feature="NOTIFICATIONS" ref={ref} className="relative">
      <button
        data-feature="NOTIFICATIONS__BELL_BUTTON"
        onClick={() => setOpen(!open)}
        className="relative flex items-center p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        title="Notifications"
      >
        <Bell className="w-[15px] h-[15px] text-muted-foreground" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span data-feature="NOTIFICATIONS__UNREAD_COUNT" className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div data-feature="NOTIFICATIONS__DROPDOWN" className="absolute right-0 top-10 w-[340px] bg-white border border-border/50 rounded-xl shadow-xl z-[200] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <span className="text-[13px] font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-emerald-600 font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  data-feature="NOTIFICATIONS__ITEM"
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    const msgTypes = ['new_message', 'nda_signed'];
                    if (msgTypes.includes(n.type)) {
                      setOpen(false);
                      navigate('/dashboard/crm');
                    }
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border/20 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-emerald-50/40' : ''}`}
                >
                  <div className="flex gap-2.5">
                    <span className="text-sm flex-shrink-0 mt-0.5">{icon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[13px] truncate ${!n.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                          {n.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
