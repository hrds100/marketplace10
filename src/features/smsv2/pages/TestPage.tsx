// /smsv2/test — diagnostic page for the live transcript + AI coach pipeline.
// Two independent panels:
//   1. Mic test — record 5s in the browser, POST to wk-test-transcribe, show
//      Whisper transcript + GPT-4o-mini coach tip. Proves OpenAI auth +
//      browser→Supabase→OpenAI→browser works WITHOUT Twilio in the picture.
//   2. Realtime feed — subscribes to wk_live_transcripts + wk_live_coach_events
//      INSERTs for any call_id and renders them as they arrive. Proves the
//      Supabase Realtime broadcast → browser→ render path works.
//
// Use:
//   - First, confirm the mic panel works end-to-end. If it fails, the issue
//     is in OpenAI auth or browser permissions, not in Twilio.
//   - Second, place a real call from a different tab and watch the realtime
//     feed populate. If the feed receives rows, the bridge is healthy and
//     any UI gap on the live-call screen is a component-level bug. If the
//     feed stays empty even with the DB filling, realtime/RLS/publication
//     is broken.

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type RecState = 'idle' | 'recording' | 'uploading' | 'transcribing' | 'ok' | 'err';

interface TranscribeResp {
  transcript?: string;
  tip?: string | null;
  ms?: number;
  error?: string;
}

interface FeedRow {
  id: string;
  call_id: string;
  created: number;
  kind: 'transcript' | 'coach';
  speaker?: string;
  body: string;
}

export default function TestPage() {
  // ── Mic recorder state ───────────────────────────────────────────────
  const [recState, setRecState] = useState<RecState>('idle');
  const [recError, setRecError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Realtime feed state ──────────────────────────────────────────────
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [feedSubscribed, setFeedSubscribed] = useState<'idle' | 'ok' | 'err'>('idle');

  // ── Mic recorder ─────────────────────────────────────────────────────
  const stopAndUpload = async () => {
    if (!mediaRecorderRef.current) return;
    setRecState('uploading');
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const startRecording = async () => {
    setRecError(null);
    setTranscript(null);
    setTip(null);
    setLatencyMs(null);
    setRecSeconds(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const fd = new FormData();
          // Send with .webm extension so Whisper auto-detects format.
          fd.append('audio', blob, 'recording.webm');
          setRecState('transcribing');
          const sess = await supabase.auth.getSession();
          const tok = sess.data.session?.access_token ?? '';
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wk-test-transcribe`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${tok}` },
              body: fd,
            }
          );
          const data: TranscribeResp = await resp.json().catch(() => ({}));
          if (!resp.ok || data.error) {
            setRecState('err');
            setRecError(data.error || `HTTP ${resp.status}`);
            return;
          }
          setRecState('ok');
          setTranscript(data.transcript ?? '');
          setTip(data.tip ?? null);
          setLatencyMs(data.ms ?? null);
        } catch (e) {
          setRecState('err');
          setRecError(e instanceof Error ? e.message : 'unknown');
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecState('recording');
      tickRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (e) {
      setRecState('err');
      setRecError(
        e instanceof Error
          ? `Mic permission denied or unavailable: ${e.message}`
          : 'Mic permission denied'
      );
    }
  };

  // ── Realtime feed ────────────────────────────────────────────────────
  useEffect(() => {
    const tCh = supabase
      .channel('test-feed-transcripts')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'wk_live_transcripts' },
        (payload: { new: { id: string; call_id: string; speaker: string; body: string } }) => {
          setFeed((prev) =>
            [
              {
                id: `t-${payload.new.id}`,
                call_id: payload.new.call_id,
                created: Date.now(),
                kind: 'transcript',
                speaker: payload.new.speaker,
                body: payload.new.body,
              },
              ...prev,
            ].slice(0, 30)
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setFeedSubscribed('ok');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setFeedSubscribed('err');
      });
    const cCh = supabase
      .channel('test-feed-coach')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'wk_live_coach_events' },
        (payload: { new: { id: string; call_id: string; kind: string; body: string } }) => {
          setFeed((prev) =>
            [
              {
                id: `c-${payload.new.id}`,
                call_id: payload.new.call_id,
                created: Date.now(),
                kind: 'coach',
                speaker: payload.new.kind,
                body: payload.new.body,
              },
              ...prev,
            ].slice(0, 30)
          );
        }
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(tCh); } catch { /* noop */ }
      try { supabase.removeChannel(cCh); } catch { /* noop */ }
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">smsv2 — pipeline test</h1>
        <p className="text-[13px] text-[#6B7280] mt-1">
          Diagnostic harness for the live transcript + AI coach pipeline. Use this
          to isolate whether issues are in Twilio, the OpenAI side, or the
          frontend render path.
        </p>
      </div>

      {/* MIC TEST */}
      <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">
            Step 1 — Mic test (no Twilio)
          </h2>
          <span className="text-[11px] text-[#9CA3AF]">
            Browser → wk-test-transcribe → OpenAI Whisper + GPT-4o-mini
          </span>
        </div>

        <div className="flex items-center gap-4">
          {recState !== 'recording' ? (
            <button
              onClick={startRecording}
              disabled={recState === 'uploading' || recState === 'transcribing'}
              className="inline-flex items-center gap-2 bg-[#1E9A80] hover:bg-[#1E9A80]/90 disabled:opacity-50 text-white px-4 py-2 rounded-[10px] text-[13px] font-semibold"
            >
              <Mic className="w-4 h-4" /> Record 5 seconds
            </button>
          ) : (
            <button
              onClick={stopAndUpload}
              className="inline-flex items-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white px-4 py-2 rounded-[10px] text-[13px] font-semibold"
            >
              <MicOff className="w-4 h-4" /> Stop ({recSeconds}s)
            </button>
          )}

          <span className="text-[12px] text-[#6B7280] flex items-center gap-2">
            {recState === 'idle' && 'Ready.'}
            {recState === 'recording' && (
              <><span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" /> Recording…</>
            )}
            {recState === 'uploading' && (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading audio…</>
            )}
            {recState === 'transcribing' && (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> OpenAI transcribing…</>
            )}
            {recState === 'ok' && (
              <><CheckCircle2 className="w-3.5 h-3.5 text-[#1E9A80]" /> OK · {latencyMs}ms</>
            )}
            {recState === 'err' && (
              <><AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" /> {recError}</>
            )}
          </span>
        </div>

        {transcript && (
          <div className="mt-4 space-y-2">
            <div className="bg-[#F3F3EE] rounded-[10px] p-3">
              <div className="text-[10px] font-bold uppercase text-[#9CA3AF] mb-1">Transcript</div>
              <div className="text-[14px] text-[#1A1A1A]">{transcript}</div>
            </div>
            {tip && (
              <div className="bg-[#ECFDF5] border border-[#1E9A80]/30 rounded-[10px] p-3 flex gap-2">
                <Sparkles className="w-4 h-4 text-[#1E9A80] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#1E9A80] mb-1">Coach tip</div>
                  <div className="text-[13px] text-[#1A1A1A]">{tip}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REALTIME FEED */}
      <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">
            Step 2 — Realtime feed (any call_id)
          </h2>
          <span
            className={cn(
              'text-[11px] inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
              feedSubscribed === 'ok' && 'bg-[#ECFDF5] text-[#1E9A80]',
              feedSubscribed === 'err' && 'bg-[#FEF2F2] text-[#EF4444]',
              feedSubscribed === 'idle' && 'bg-[#F3F3EE] text-[#9CA3AF]'
            )}
          >
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              feedSubscribed === 'ok' && 'bg-[#1E9A80]',
              feedSubscribed === 'err' && 'bg-[#EF4444]',
              feedSubscribed === 'idle' && 'bg-[#9CA3AF]'
            )} />
            {feedSubscribed === 'ok' && 'Subscribed to wk_live_transcripts + wk_live_coach_events'}
            {feedSubscribed === 'err' && 'Realtime channel error'}
            {feedSubscribed === 'idle' && 'Connecting…'}
          </span>
        </div>

        <p className="text-[12px] text-[#6B7280] mb-3">
          Place a real Twilio call in another tab, talk for 30 seconds. Inserts on
          either table for any call_id should appear here within a second of being
          written.
        </p>

        <div className="border border-[#E5E7EB] rounded-[10px] divide-y divide-[#E5E7EB] max-h-[400px] overflow-y-auto">
          {feed.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
              No events yet. Place a call to see live data flow here.
            </div>
          )}
          {feed.map((row) => (
            <div key={row.id} className="px-4 py-2.5 text-[13px] flex items-start gap-3">
              <span className={cn(
                'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                row.kind === 'transcript'
                  ? 'bg-[#F3F3EE] text-[#6B7280]'
                  : 'bg-[#ECFDF5] text-[#1E9A80]'
              )}>
                {row.kind === 'transcript' ? row.speaker : 'COACH'}
              </span>
              <span className="text-[#1A1A1A] flex-1">{row.body}</span>
              <span className="text-[10px] text-[#9CA3AF] tabular-nums">
                …{row.call_id.slice(-6)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
