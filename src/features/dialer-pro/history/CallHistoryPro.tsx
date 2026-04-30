import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Play, FileText, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { signCallRecording } from '@/features/smsv2/caller-pad/hooks/useCalls';
import CallTranscriptModal from '@/features/smsv2/components/calls/CallTranscriptModal';

const PAGE_SIZE = 25;

interface CallRow {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  direction: string;
  status: string;
  startedAt: string | null;
  durationSec: number | null;
  recordingUrl: string | null;
  agentNote: string | null;
}

async function fetchPage(pageParam: number): Promise<CallRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase.from('wk_calls' as any) as any)
    .select(
      'id, direction, status, started_at, duration_sec, recording_url, agent_note, ' +
      'wk_contacts:contact_id ( name, phone )'
    )
    .order('created_at', { ascending: false })
    .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  console.log('call history data:', rows, 'error:', error);

  if (error) { console.warn('[dialer-pro] history fetch error', error); return []; }

  return ((rows ?? []) as Array<{
    id: string; direction: string; status: string;
    started_at: string | null; duration_sec: number | null;
    recording_url: string | null; agent_note: string | null;
    wk_contacts: { name: string | null; phone: string | null } | null;
  }>).map((r) => ({
    id: r.id,
    contactName: r.wk_contacts?.name ?? null,
    contactPhone: r.wk_contacts?.phone ?? null,
    direction: r.direction,
    status: r.status,
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    recordingUrl: r.recording_url,
    agentNote: r.agent_note,
  }));
}

export default function CallHistoryPro() {
  const queryClient = useQueryClient();
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [transcriptCallId, setTranscriptCallId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['dialer-pro-call-history'],
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
  });

  // Realtime — re-fetch first page when wk_calls changes
  useEffect(() => {
    const channel = supabase
      .channel('call-history-realtime')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'wk_calls',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, () => {
        void queryClient.invalidateQueries({ queryKey: ['dialer-pro-call-history'] });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  // IntersectionObserver — load next page when sentinel is visible
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const calls = data?.pages.flat() ?? [];

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

  if (isLoading) {
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
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F3F3EE]/50 transition-colors text-xs group"
        >
          <Phone className="w-3 h-3 text-[#9CA3AF] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[#1A1A1A] truncate text-[11px]">{call.contactName ?? 'Unknown'}</div>
            <div className="text-[10px] text-[#9CA3AF] truncate">{call.contactPhone}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] text-[#6B7280] tabular-nums">{formatDuration(call.durationSec)}</div>
            <div className="text-[9px] text-[#9CA3AF]">{formatDate(call.startedAt)}</div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {call.recordingUrl && (
              <button
                onClick={() => void handlePlay(call.recordingUrl!)}
                className="p-0.5 rounded hover:bg-black/[0.04] text-[#6B7280]"
              >
                <Play className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setTranscriptCallId(call.id)}
              className="p-0.5 rounded hover:bg-black/[0.04] text-[#6B7280]"
            >
              <FileText className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-2 text-[11px] text-[#9CA3AF]">Loading more…</div>
      )}

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
