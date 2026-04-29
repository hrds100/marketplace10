// PastCallScreen — read-only call detail.
// Shows recording playback (signed URL), AI summary, next steps, and
// the unified call timeline. Realtime — new transcript / summary /
// recording rows surface without a refresh.

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Sparkles } from 'lucide-react';
import TimelinePane from '../components/live-call/TimelinePane';
import { useCallDetail } from '../hooks/useCallDetail';

export default function PastCallScreen() {
  const { callId } = useParams<{ callId: string }>();
  const { detail, loading } = useCallDetail(callId ?? null);

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to="/caller/calls"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280] hover:text-[#1A1A1A] px-2 py-1 rounded-lg hover:bg-black/[0.04]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to call history
        </Link>
      </div>

      <div>
        <h1 className="text-[22px] font-bold text-[#1A1A1A] tracking-tight">
          Past call
        </h1>
        <p className="text-[11px] text-[#9CA3AF] mt-0.5 tabular-nums">
          {callId ?? '—'}
        </p>
      </div>

      {detail.recordingUrl && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
          <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
            Recording
            {detail.recordingDurationSec ? (
              <span className="ml-2 text-[#6B7280] normal-case font-normal">
                {formatDuration(detail.recordingDurationSec)}
              </span>
            ) : null}
          </div>
          <audio
            controls
            src={detail.recordingUrl}
            className="w-full"
            preload="metadata"
          />
        </div>
      )}

      {!detail.recordingUrl && !loading && (
        <div className="text-[11px] text-[#9CA3AF] italic">
          {detail.recordingStatus
            ? `Recording status: ${detail.recordingStatus}`
            : 'No recording for this call.'}
        </div>
      )}

      {(detail.aiSummary || detail.aiNextSteps) && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
          {detail.aiSummary && (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1.5 inline-flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
                Summary
              </div>
              <div className="text-[13px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                {detail.aiSummary}
              </div>
            </div>
          )}
          {detail.aiNextSteps && (
            <div>
              <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1.5 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1E9A80]" />
                Next steps
              </div>
              <div className="text-[13px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                {detail.aiNextSteps}
              </div>
            </div>
          )}
        </div>
      )}

      {!detail.aiSummary && !detail.aiNextSteps && !loading && (
        <div className="text-[11px] text-[#9CA3AF] italic">
          AI summary will appear here once wk-ai-postcall finishes (typically 5-10s after hang-up).
        </div>
      )}

      <TimelinePane callId={callId ?? null} isLive={false} />
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
