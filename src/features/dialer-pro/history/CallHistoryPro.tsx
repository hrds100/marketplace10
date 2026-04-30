import { useCallback, useEffect, useState } from 'react';
import { Phone, Play, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { signCallRecording } from '@/features/smsv2/caller-pad/hooks/useCalls';
import CallTranscriptModal from '@/features/smsv2/components/calls/CallTranscriptModal';

interface CallRow {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  direction: string;
  status: string;
  startedAt: string | null;
  durationSec: number | null;
  dispositionColumnName: string | null;
  recordingUrl: string | null;
  campaignName: string | null;
  agentNote: string | null;
}

interface Props {
  campaignId: string | null;
  agentId: string | null;
}

export default function CallHistoryPro({ campaignId, agentId }: Props) {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [transcriptCallId, setTranscriptCallId] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    if (!agentId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('wk_calls' as any) as any)
      .select(
        'id, direction, status, started_at, duration_sec, disposition_column_id, recording_url, agent_note, campaign_id, ' +
        'wk_contacts:contact_id ( name, phone )'
      )
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (campaignId) {
      q = q.eq('campaign_id', campaignId);
    }

    const { data: rows, error } = await q;
    if (error) { console.warn('[dialer-pro] history fetch error', error); return; }

    const mapped = ((rows ?? []) as Array<{
      id: string;
      direction: string;
      status: string;
      started_at: string | null;
      duration_sec: number | null;
      disposition_column_id: string | null;
      recording_url: string | null;
      agent_note: string | null;
      campaign_id: string | null;
      wk_contacts: { name: string | null; phone: string | null } | null;
    }>).map((r) => ({
      id: r.id,
      contactName: r.wk_contacts?.name ?? null,
      contactPhone: r.wk_contacts?.phone ?? null,
      direction: r.direction,
      status: r.status,
      startedAt: r.started_at,
      durationSec: r.duration_sec,
      dispositionColumnName: null,
      recordingUrl: r.recording_url,
      campaignName: null,
      agentNote: r.agent_note,
    }));

    setCalls(mapped);
    setLoading(false);
  }, [campaignId, agentId]);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    void fetchCalls();
  }, [agentId, fetchCalls]);

  // Realtime: re-fetch when new calls are inserted or updated
  useEffect(() => {
    if (!agentId) return;
    const channel = supabase
      .channel(`dialer-pro-history-${agentId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'wk_calls',
        filter: `agent_id=eq.${agentId}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, () => {
        void fetchCalls();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [agentId, fetchCalls]);

  const handlePlay = async (url: string) => {
    const signed = await signCallRecording(url);
    if (signed) setPlayingUrl(signed);
  };

  const formatDuration = (sec: number | null) => {
    if (sec === null) return '--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8 text-sm text-[#9CA3AF]">Loading history…</div>;
  }

  if (calls.length === 0) {
    return <div className="flex items-center justify-center py-8 text-sm text-[#9CA3AF]">No calls yet</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {playingUrl && (
        <div className="p-2 bg-white border border-[#E5E7EB] rounded-lg mb-2">
          <audio src={playingUrl} controls autoPlay className="w-full h-8" onEnded={() => setPlayingUrl(null)} />
        </div>
      )}

      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#1E9A80]/30 transition-colors text-xs"
        >
          <Phone className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1A1A1A] truncate">{call.contactName ?? 'Unknown'}</span>
              <span className="text-[#9CA3AF]">{call.contactPhone}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#9CA3AF]">
            <Clock className="w-3 h-3" />
            {formatDuration(call.durationSec)}
          </div>
          <span className="text-[#9CA3AF]">{formatDate(call.startedAt)}</span>
          <div className="flex items-center gap-1">
            {call.recordingUrl && (
              <button
                onClick={() => void handlePlay(call.recordingUrl!)}
                className="p-1 rounded hover:bg-black/[0.04] text-[#6B7280]"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setTranscriptCallId(call.id)}
              className="p-1 rounded hover:bg-black/[0.04] text-[#6B7280]"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {transcriptCallId && (
        <CallTranscriptModal
          callId={transcriptCallId}
          callerLabel="Call"
          onClose={() => setTranscriptCallId(null)}
        />
      )}
    </div>
  );
}
