// useAgentMessageCounts — today's outbound messages by channel for the
// signed-in agent. PR 121 (Hugo 2026-04-28).
//
// Powers the dialer page's per-channel send counters. Hugo's brief:
// "agents should see how many messages sent — SMS, WhatsApp, Email".
// Counts every wk_sms_messages row created_by=auth.uid() since 00:00
// today (browser-local), grouped by channel.

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Channel = 'sms' | 'whatsapp' | 'email';

export interface AgentMessageCounts {
  sms: number;
  whatsapp: number;
  email: number;
  loading: boolean;
}

export function useAgentMessageCounts(agentId: string | null): AgentMessageCounts {
  const [counts, setCounts] = useState<AgentMessageCounts>({
    sms: 0,
    whatsapp: 0,
    email: 0,
    loading: true,
  });

  useEffect(() => {
    if (!agentId) {
      setCounts({ sms: 0, whatsapp: 0, email: 0, loading: false });
      return;
    }
    let cancelled = false;

    async function load() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_sms_messages' as any) as any)
        .select('channel')
        .eq('direction', 'outbound')
        .eq('created_by', agentId)
        .gte('created_at', todayStart.toISOString());
      if (cancelled) return;
      const next = { sms: 0, whatsapp: 0, email: 0, loading: false };
      for (const row of (data ?? []) as Array<{ channel: Channel | null }>) {
        const ch: Channel = (row.channel ?? 'sms') as Channel;
        next[ch] = (next[ch] ?? 0) + 1;
      }
      setCounts(next);
    }

    void load();

    // PR 154 (Hugo 2026-04-29): realtime INSERT listener on
    // wk_sms_messages filtered by created_by=me. Counts now bump
    // immediately when the agent fires a mid-call send — no 30s lag.
    // Hugo Rule 13: numbers must be truthful. Cheap fallback poll
    // kept at a longer interval as belt-and-braces.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`smsv2-agent-msgs-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wk_sms_messages',
          filter: `created_by=eq.${agentId}`,
        },
        () => {
          if (!cancelled) void load();
        }
      )
      .subscribe();

    // Belt-and-braces fallback poll (longer interval since realtime
    // covers the live case).
    const id = window.setInterval(() => {
      if (!cancelled) void load();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [agentId]);

  return counts;
}
