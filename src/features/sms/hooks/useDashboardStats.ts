import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import type { SmsDashboardStats } from '../types';

const STATUS_COLOURS: Record<string, string> = {
  delivered: '#1E9A80',
  sent: '#F59E0B',
  failed: '#EF4444',
  queued: '#9CA3AF',
  received: '#6B7280',
  undelivered: '#EF4444',
  scheduled: '#6B7280',
};

async function fetchDashboardStats(): Promise<SmsDashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Fetch today's messages grouped by direction
  const { data: todayMessages, error: todayError } = await (supabase
    .from('sms_messages' as never)
    .select('direction')
    .gte('created_at', todayIso) as never);

  if (todayError) throw todayError;

  const todayRows = (todayMessages as { direction: string }[]) ?? [];
  const sentToday = todayRows.filter((m) => m.direction === 'outbound').length;
  const receivedToday = todayRows.filter((m) => m.direction === 'inbound').length;

  // Fetch unread count
  const { data: unreadData, error: unreadError } = await (supabase
    .from('sms_conversations' as never)
    .select('unread_count') as never);

  if (unreadError) throw unreadError;
  const unreadCount = ((unreadData as { unread_count: number }[]) ?? [])
    .reduce((sum, r) => sum + (r.unread_count ?? 0), 0);

  // Fetch active automations count
  const { data: autoData, error: autoError } = await (supabase
    .from('sms_automations' as never)
    .select('id')
    .eq('is_active', true) as never);

  if (autoError) throw autoError;
  const activeAutomations = ((autoData as { id: string }[]) ?? []).length;

  // Fetch all outbound messages for delivery rate + status breakdown
  const { data: allOutbound, error: outError } = await (supabase
    .from('sms_messages' as never)
    .select('status, direction') as never);

  if (outError) throw outError;

  const allMessages = (allOutbound as { status: string; direction: string }[]) ?? [];
  const outboundMessages = allMessages.filter((m) => m.direction === 'outbound');
  const deliveredCount = outboundMessages.filter((m) => m.status === 'delivered').length;
  const totalOutbound = outboundMessages.length;
  const deliveryRate = totalOutbound > 0
    ? Math.round((deliveredCount / totalOutbound) * 1000) / 10
    : 0;

  // Status breakdown (all messages)
  const statusMap = new Map<string, number>();
  for (const m of allMessages) {
    const key = m.status ?? 'unknown';
    statusMap.set(key, (statusMap.get(key) ?? 0) + 1);
  }
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    colour: STATUS_COLOURS[status] ?? '#9CA3AF',
  }));

  // Daily messages (last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  const { data: recentMessages, error: recentError } = await (supabase
    .from('sms_messages' as never)
    .select('direction, created_at')
    .gte('created_at', thirtyDaysAgo) as never);

  if (recentError) throw recentError;

  const dailyMap = new Map<string, { sent: number; received: number }>();
  // Pre-fill all 30 days
  for (let i = 29; i >= 0; i--) {
    const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
    dailyMap.set(dateStr, { sent: 0, received: 0 });
  }

  for (const m of (recentMessages as { direction: string; created_at: string }[]) ?? []) {
    const dateStr = m.created_at.slice(0, 10);
    const entry = dailyMap.get(dateStr);
    if (entry) {
      if (m.direction === 'outbound') entry.sent++;
      else entry.received++;
    }
  }

  const dailyMessages = Array.from(dailyMap.entries()).map(([date, counts]) => ({
    date,
    sent: counts.sent,
    received: counts.received,
  }));

  return {
    messagesToday: { sent: sentToday, received: receivedToday },
    unreadCount,
    activeAutomations,
    deliveryRate,
    dailyMessages,
    statusBreakdown,
  };
}

export function useDashboardStats() {
  const query = useQuery({
    queryKey: ['sms-dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000, // Refresh every minute
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
