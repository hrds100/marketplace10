// crm-v2 realtime — channel name constants + typed subscription helpers.
//
// One place to express channel naming so it's impossible to subscribe
// to the wrong channel from a hook. Hooks call `subscribeXxx(...)`,
// not `supabase.channel(...)` directly.

import { supabase } from '@/integrations/supabase/client';
import type {
  CallRow,
  DialerQueueRow,
  LiveTranscriptRow,
  LiveCoachEventRow,
  AgentLimitsRow,
} from './types';

export const channelNames = {
  /** wk_calls.agent_id=eq.<uid> — the agent's call list. */
  myCalls: (agentId: string) => `crmv2-my-calls-${agentId}`,
  /** wk_dialer_queue.campaign_id=eq.<id> — the queue. */
  campaignQueue: (campaignId: string) => `crmv2-queue-${campaignId}`,
  /** wk_live_transcripts.call_id=eq.<id> — live transcript. */
  liveTranscript: (callId: string) => `crmv2-transcript-${callId}`,
  /** wk_live_coach_events.call_id=eq.<id> — live coach. */
  liveCoach: (callId: string) => `crmv2-coach-${callId}`,
  /** wk_voice_agent_limits.agent_id=eq.<uid> — spend / admin flag. */
  agentLimits: (agentId: string) => `crmv2-limits-${agentId}`,
  /** broadcast `dialer:<agentId>` — server fires winner-of-parallel-dial. */
  dialerBroadcast: (agentId: string) => `dialer:${agentId}`,
} as const;

type Unsub = () => void;

interface PgChange<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | Record<string, never>;
  old: T | Record<string, never>;
}

function pgChannel<T>(opts: {
  channel: string;
  table: string;
  filter: string;
  events?: Array<'INSERT' | 'UPDATE' | 'DELETE' | '*'>;
  onChange: (change: PgChange<T>) => void;
}): Unsub {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch = (supabase as any).channel(opts.channel);
  const events = opts.events ?? ['*'];
  for (const ev of events) {
    ch.on(
      'postgres_changes',
      { event: ev, schema: 'public', table: opts.table, filter: opts.filter },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        opts.onChange({
          eventType: payload.eventType,
          new: payload.new ?? {},
          old: payload.old ?? {},
        });
      }
    );
  }
  ch.subscribe();
  return () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase as any).removeChannel(ch);
    } catch {
      /* ignore */
    }
  };
}

export const realtime = {
  myCalls(agentId: string, onChange: (change: PgChange<CallRow>) => void): Unsub {
    return pgChannel<CallRow>({
      channel: channelNames.myCalls(agentId),
      table: 'wk_calls',
      filter: `agent_id=eq.${agentId}`,
      onChange,
    });
  },

  campaignQueue(campaignId: string, onChange: (change: PgChange<DialerQueueRow>) => void): Unsub {
    return pgChannel<DialerQueueRow>({
      channel: channelNames.campaignQueue(campaignId),
      table: 'wk_dialer_queue',
      filter: `campaign_id=eq.${campaignId}`,
      onChange,
    });
  },

  liveTranscript(callId: string, onChange: (change: PgChange<LiveTranscriptRow>) => void): Unsub {
    return pgChannel<LiveTranscriptRow>({
      channel: channelNames.liveTranscript(callId),
      table: 'wk_live_transcripts',
      filter: `call_id=eq.${callId}`,
      events: ['INSERT'],
      onChange,
    });
  },

  liveCoach(callId: string, onChange: (change: PgChange<LiveCoachEventRow>) => void): Unsub {
    return pgChannel<LiveCoachEventRow>({
      channel: channelNames.liveCoach(callId),
      table: 'wk_live_coach_events',
      filter: `call_id=eq.${callId}`,
      events: ['INSERT'],
      onChange,
    });
  },

  agentLimits(agentId: string, onChange: (change: PgChange<AgentLimitsRow>) => void): Unsub {
    return pgChannel<AgentLimitsRow>({
      channel: channelNames.agentLimits(agentId),
      table: 'wk_voice_agent_limits',
      filter: `agent_id=eq.${agentId}`,
      events: ['UPDATE', 'INSERT'],
      onChange,
    });
  },

  /** Broadcast channel for `dialer:<agentId>` event=`winner` (server-fires when a parallel dial races and one wins). */
  dialerBroadcast(
    agentId: string,
    onWinner: (payload: {
      call_id?: string;
      contact_id?: string;
      campaign_id?: string | null;
      twilio_call_sid?: string;
    }) => void
  ): Unsub {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any).channel(channelNames.dialerBroadcast(agentId));
    ch.on(
      'broadcast',
      { event: 'winner' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => onWinner(payload?.payload ?? {})
    );
    ch.subscribe();
    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void (supabase as any).removeChannel(ch);
      } catch {
        /* ignore */
      }
    };
  },
};
