import { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  PhoneMissed,
  X,
  Voicemail,
  Ban,
  SkipForward,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveCallCtx } from './ActiveCallContext';
import { useSmsV2 } from '../../store/SmsV2Store';
import FollowupPromptModal from '../followups/FollowupPromptModal';

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Clock,
  PhoneMissed,
  X,
  Voicemail,
  Ban,
};

// PR 138 (Hugo 2026-04-28): rewritten to use the new state machine.
//
// Removed
// ───────
//   - secondsLeft / paused / submitted state — replaced by
//     `callPhase ∈ {outcome_submitting, outcome_done}` reads from
//     the reducer.
//   - the auto-advance countdown timer (Rule 2: kill post-call
//     countdown completely).
//   - the empty-default fallback that auto-fired
//     applyOutcome('next-now') (Rule 4: no auto-outcome).
//   - the setTimeout(applyOutcome, 200) chains — reducer transitions
//     synchronously now.
//   - the "Previous call" button (Hugo confirmed: Recent Calls
//     panel does this job).
//
// Kept
// ────
//   - keyboard shortcuts 1-9 / S / N — they dispatch immediately.
//   - QuickNote, outcome cards, SkipForward, "Next call".
//   - FollowupPromptModal for stages with requires_followup.

export default function PostCallPanel() {
  const { applyOutcome, call, callPhase, endCall } = useActiveCallCtx();
  const store = useSmsV2();
  const columns = store.columns;
  // Submission state lives in the reducer. The agent has clicked an
  // outcome iff callPhase has advanced past *_waiting_outcome.
  const submitted =
    callPhase === 'outcome_submitting' || callPhase === 'outcome_done';
  // PR 105 (Hugo 2026-04-28): the chosen outcome card stays highlighted
  // as "this is the one you picked", while the rest dim out so it's
  // obvious WHICH card the agent clicked.
  const [pickedColumnId, setPickedColumnId] = useState<string | null>(null);
  // PR 19: when the picked stage carries requires_followup=true, open
  // the prompt modal BEFORE committing applyOutcome.
  const [pendingFollowupColId, setPendingFollowupColId] = useState<string | null>(null);
  // PR 90: quick-note input state-bound, threaded through applyOutcome.
  const [quickNote, setQuickNote] = useState('');

  const handleClick = (columnId: string) => {
    if (submitted) return;
    const col = columns.find((c) => c.id === columnId);
    setPickedColumnId(columnId);
    // PR 19: if the picked stage requires a follow-up, open the modal
    // FIRST and let the agent pick a time + note. The actual outcome
    // submission happens in commitOutcome after the modal saves or is
    // skipped.
    if (col?.requiresFollowup) {
      setPendingFollowupColId(columnId);
      return;
    }
    commitOutcome(columnId);
  };

  const commitOutcome = (columnId: string) => {
    setPickedColumnId(columnId);
    const note = quickNote.trim() || undefined;
    // PR 138: synchronous dispatch — reducer flips to
    // outcome_submitting → outcome_done. No setTimeout dance.
    applyOutcome(columnId, note);
  };

  // Keyboard shortcuts (PR 138: dispatch immediately, no setTimeout).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitted) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const col = columns.find((c) => c.position === num);
        if (col) handleClick(col.id);
      } else if (e.key.toLowerCase() === 's') {
        applyOutcome('skipped', quickNote.trim() || undefined);
      } else if (e.key.toLowerCase() === 'n') {
        applyOutcome('next-now', quickNote.trim() || undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, columns]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#1E9A80]" />
        <span className="text-[13px] font-semibold text-[#1A1A1A]">
          ✅ Call ended · {call?.contactName} · Recording saved
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3">
          ⚡ Pick an outcome — pipeline columns
        </div>

        {/* Hugo 2026-04-26 (PR 17): outcome cards are pure pipeline
            routing now. The +SMS / +task / +tag automation badges came
            off because Hugo doesn't want the post-call pick to fire
            extra side-effects. */}
        <div className="grid grid-cols-2 gap-3">
          {columns.map((col) => {
            const Icon = ICON_MAP[col.icon] ?? Sparkles;
            // PR 105: three visual states for outcome cards.
            const isPicked = submitted && pickedColumnId === col.id;
            const isDimmed = submitted && pickedColumnId !== col.id;
            return (
              <button
                key={col.id}
                onClick={() => handleClick(col.id)}
                disabled={submitted}
                data-testid={`postcall-outcome-${col.id}`}
                data-picked={isPicked ? 'true' : undefined}
                className={cn(
                  'relative group p-3 rounded-2xl border-2 text-left bg-white transition-all',
                  isPicked
                    ? 'border-[#1E9A80] border-[3px] bg-[#ECFDF5] shadow-[0_8px_28px_rgba(30,154,128,0.45)] cursor-default ring-2 ring-[#1E9A80]/20'
                    : isDimmed
                      ? 'border-[#E5E7EB] opacity-25 grayscale cursor-not-allowed'
                      : 'border-[#E5E7EB] hover:border-[#1E9A80]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
                )}
              >
                {isPicked && (
                  <>
                    <span
                      className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold uppercase tracking-wide shadow-md"
                      aria-label="Picked"
                    >
                      ✓ DONE
                    </span>
                    <span className="absolute bottom-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1E9A80] text-white text-[16px] font-bold shadow-md">
                      ✓
                    </span>
                  </>
                )}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${col.colour}1A`, color: col.colour }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#9CA3AF] tabular-nums">
                      {col.position}.
                    </span>
                    <span
                      className={cn(
                        'text-[14px] font-semibold truncate',
                        isPicked ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'
                      )}
                    >
                      {col.name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick note */}
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1.5">
            Quick note
          </div>
          <input
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Add a note (optional)…"
            data-testid="postcall-quicknote"
            className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
          />
        </div>

        {columns.length === 0 && (
          <div className="mt-4 p-3 rounded-[10px] bg-[#FEF7E6] border border-[#FDE68A] text-[12px] text-[#1A1A1A]">
            No pipeline columns yet. Open Settings → Pipelines and add a few
            stages so you can pick an outcome from buttons here.
          </div>
        )}
      </div>

      {/* Footer — PR 138: NO countdown, NO "Next call in 0:XX". Just
          Skip / Next call. The "Previous call" button was dropped (Hugo
          confirmed: Recent Calls panel does this job). */}
      <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F3F3EE]/50 flex items-center gap-3">
        <div className="flex-1 text-[12px] text-[#6B7280]">
          {submitted ? (
            <span>Outcome saved — pick the next contact from Recent Calls or press Next call.</span>
          ) : (
            <span>Pick an outcome to continue.</span>
          )}
          <span className="ml-2 text-[10px] text-[#9CA3AF]">
            ⌨ 1–9 outcomes · S skip · N next call
          </span>
        </div>
        <button
          onClick={() => {
            if (submitted) return;
            applyOutcome('skipped', quickNote.trim() || undefined);
          }}
          disabled={submitted}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-white disabled:opacity-50"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip
        </button>
        <button
          onClick={async () => {
            if (submitted) return;
            // PR 134 (Hugo 2026-04-28): Hugo's report: "We press next
            // call when it goes to the voicemail, and then we press
            // next call, you should hang up." endCall is idempotent in
            // post_call (no-op on already-disconnected Twilio Calls)
            // but crucially it SWEEPS any zombie wk_calls + WebRTC
            // legs that would otherwise trip "A Call is already
            // active" on the next dial.
            await endCall();
            applyOutcome('next-now', quickNote.trim() || undefined);
          }}
          disabled={submitted}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)] disabled:opacity-50"
        >
          <Phone className="w-3.5 h-3.5" /> Next call
        </button>
      </div>

      {/* PR 19: follow-up prompt for Nurturing / Callback / Interested. */}
      {pendingFollowupColId && call?.contactId && (() => {
        const col = columns.find((c) => c.id === pendingFollowupColId);
        const contact = store.getContact(call.contactId);
        if (!col || !contact) return null;
        const suggestedHours =
          col.name.toLowerCase() === 'callback'
            ? 2
            : col.name.toLowerCase() === 'interested'
              ? 24
              : 24 * 3; // Nurturing default
        return (
          <FollowupPromptModal
            open
            onOpenChange={(o) => {
              if (!o) {
                const colId = pendingFollowupColId;
                setPendingFollowupColId(null);
                if (colId) commitOutcome(colId);
              }
            }}
            contactId={contact.id}
            contactName={contact.name}
            columnId={col.id}
            columnName={col.name}
            suggestedHoursAhead={suggestedHours}
            callId={call.callId}
            onSaved={() => {
              const colId = pendingFollowupColId;
              setPendingFollowupColId(null);
              if (colId) commitOutcome(colId);
            }}
          />
        );
      })()}
    </div>
  );
}
