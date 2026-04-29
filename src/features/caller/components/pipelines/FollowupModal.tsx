// FollowupModal — appears when a contact lands in a column whose
// `requires_followup=true`. The agent picks a relative window (hours)
// + an optional note; we write a `wk_followups` row keyed to the
// contact.

import { useState } from 'react';
import { X, Loader2, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCallerToasts } from '../../store/toastsProvider';

interface Props {
  open: boolean;
  contactId: string | null;
  contactName?: string;
  columnName?: string;
  suggestedHours?: number;
  onClose: () => void;
  onSaved?: () => void;
}

const PRESETS = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'Tomorrow morning', hours: 18 },
  { label: 'In 3 days', hours: 72 },
  { label: 'Next week', hours: 24 * 7 },
];

export default function FollowupModal({
  open,
  contactId,
  contactName,
  columnName,
  suggestedHours,
  onClose,
  onSaved,
}: Props) {
  const [hours, setHours] = useState<number>(suggestedHours ?? 24);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toasts = useCallerToasts();

  if (!open || !contactId) return null;

  const dueAt = new Date(Date.now() + hours * 3_600_000);

  const onSave = async () => {
    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_followups' as any) as any).insert({
      contact_id: contactId,
      due_at: dueAt.toISOString(),
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (e) {
      toasts.push(`Follow-up failed: ${e.message}`, 'error');
      return;
    }
    toasts.push('Follow-up scheduled', 'success');
    setNote('');
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-[440px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <h2 className="text-[15px] font-bold text-[#1A1A1A] inline-flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#1E9A80]" />
            Schedule follow-up
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#1A1A1A] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-[12px] text-[#6B7280]">
            <strong className="text-[#1A1A1A]">{contactName ?? 'Contact'}</strong>
            {columnName && (
              <>
                {' '}moved to <strong className="text-[#1E9A80]">{columnName}</strong>.
              </>
            )}{' '}
            When should we follow up?
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.hours}
                type="button"
                onClick={() => setHours(p.hours)}
                className={`text-[12px] font-medium px-3 py-2 rounded-[10px] border ${hours === p.hours ? 'bg-[#1E9A80] text-white border-[#1E9A80]' : 'bg-white text-[#1A1A1A] border-[#E5E7EB] hover:bg-[#F3F3EE]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#9CA3AF]">
            Due: <span className="tabular-nums text-[#1A1A1A] font-medium">{dueAt.toLocaleString()}</span>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional) — what to follow up about…"
            rows={3}
            className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold text-[#6B7280] px-3 py-1.5 hover:text-[#1A1A1A]"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={submitting}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px] disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save follow-up
          </button>
        </div>
      </div>
    </div>
  );
}
