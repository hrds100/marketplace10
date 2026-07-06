// CallAudioSettings — Settings → Channels → "Calls" card.
//
// Hugo 2026-07-06: what happens when an inbound call to one of our Twilio
// numbers isn't answered (or the assigned agent is busy on another call):
//   voicemail — current behavior: prompt + record a voicemail (default)
//   message   — play an admin-uploaded audio file, then hang up (no voicemail)
//
// Admin uploads ONE audio file (mp3/wav — the formats Twilio <Play>
// streams), picks the numbers it applies to (with Select all), and saves.
// Storage: public bucket wk-call-audio (Twilio fetches the URL directly).
// The inbound TwiML lives in supabase/functions/wk-voice-twiml-incoming.

import { useEffect, useRef, useState } from 'react';
import { PhoneOff, UploadCloud, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';

interface NumberRow {
  id: string;
  e164: string;
  label: string | null;
  unanswered_action: 'voicemail' | 'message';
  unanswered_message_url: string | null;
}

export default function CallAudioSettings() {
  const { pushToast } = useSmsV2();
  const [numbers, setNumbers] = useState<NumberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'voicemail' | 'message'>('voicemail');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('wk_numbers' as any) as any)
          .select('id, e164, label, unanswered_action, unanswered_message_url')
          .eq('voice_enabled', true)
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as NumberRow[];
        setNumbers(rows);
        // Pre-fill from the first number that already has a message
        // configured, so re-opening the tab shows the current state.
        const existing = rows.find((r) => r.unanswered_action === 'message');
        if (existing) {
          setAction('message');
          setAudioUrl(existing.unanswered_message_url);
          setSelected(new Set(
            rows.filter((r) => r.unanswered_action === 'message').map((r) => r.id)
          ));
        }
      } catch (e) {
        pushToast(e instanceof Error ? e.message : 'Could not load numbers', 'error');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSelected = numbers.length > 0 && selected.size === numbers.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(numbers.map((n) => n.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp3';
      if (!['mp3', 'wav'].includes(ext)) {
        throw new Error('Please upload an .mp3 or .wav file');
      }
      const path = `unanswered/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('wk-call-audio')
        .upload(path, file, { contentType: file.type || 'audio/mpeg' });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('wk-call-audio').getPublicUrl(path);
      setAudioUrl(data.publicUrl);
      setAction('message');
      pushToast('Audio uploaded — pick numbers and save', 'success');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      pushToast('Select at least one number', 'error');
      return;
    }
    if (action === 'message' && !audioUrl) {
      pushToast('Upload an audio file first', 'error');
      return;
    }
    setSaving(true);
    try {
      const ids = Array.from(selected);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('wk_numbers' as any) as any)
        .update({
          unanswered_action: action,
          unanswered_message_url: action === 'message' ? audioUrl : null,
        })
        .in('id', ids);
      if (error) throw new Error(error.message);
      setNumbers((prev) =>
        prev.map((n) =>
          selected.has(n.id)
            ? {
                ...n,
                unanswered_action: action,
                unanswered_message_url: action === 'message' ? audioUrl : null,
              }
            : n
        )
      );
      pushToast(
        action === 'message'
          ? `Message set on ${ids.length} number${ids.length === 1 ? '' : 's'} — unanswered calls hear your audio`
          : `Voicemail restored on ${ids.length} number${ids.length === 1 ? '' : 's'}`,
        'success'
      );
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <PhoneOff className="w-4 h-4 text-[#1E9A80]" strokeWidth={1.8} />
        <h3 className="text-[13px] font-semibold text-[#1A1A1A]">
          Calls — when nobody answers
        </h3>
      </div>
      <p className="text-[11px] text-[#6B7280] mb-3">
        Applies when an inbound call rings out or the line is busy. Voicemail is
        the default; or play your own audio and hang up (no voicemail).
      </p>

      {loading && <div className="text-[12px] text-[#6B7280]">Loading numbers…</div>}

      {!loading && numbers.length === 0 && (
        <div className="text-[12px] text-[#6B7280]">
          No voice-enabled numbers yet — pair one in the list above first.
        </div>
      )}

      {!loading && numbers.length > 0 && (
        <div className="space-y-4">
          {/* Behavior picker */}
          <div className="space-y-1.5">
            {([
              { value: 'voicemail', title: 'Ask to leave a voicemail', sub: 'Default — greeting, beep, records a message' },
              { value: 'message', title: 'Play a message (no voicemail)', sub: 'Plays your uploaded audio, then hangs up' },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-2.5 p-2.5 rounded-[10px] border cursor-pointer transition-colors',
                  action === opt.value
                    ? 'border-[#1E9A80] bg-[#ECFDF5]'
                    : 'border-[#E5E7EB] hover:bg-black/[0.02]'
                )}
              >
                <input
                  type="radio"
                  name="unanswered-action"
                  checked={action === opt.value}
                  onChange={() => setAction(opt.value)}
                  className="mt-0.5 accent-[#1E9A80]"
                />
                <span>
                  <span className="block text-[12px] font-medium text-[#1A1A1A]">{opt.title}</span>
                  <span className="block text-[11px] text-[#6B7280]">{opt.sub}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Audio upload + preview (only relevant for 'message') */}
          {action === 'message' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 rounded-[10px] disabled:opacity-60"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading…' : audioUrl ? 'Replace audio' : 'Upload audio'}
                </button>
                <span className="text-[11px] text-[#9CA3AF]">.mp3 or .wav</span>
              </div>
              {audioUrl && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio controls src={audioUrl} className="w-full h-9" />
              )}
            </div>
          )}

          {/* Number picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#6B7280] uppercase">
                Apply to numbers
              </span>
              <button
                onClick={toggleAll}
                className="text-[11px] font-semibold text-[#1E9A80] hover:underline"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="border border-[#E5E7EB] rounded-[10px] divide-y divide-[#E5E7EB]">
              {numbers.map((n) => (
                <label
                  key={n.id}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-black/[0.02]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(n.id)}
                    onChange={() => toggleOne(n.id)}
                    className="accent-[#1E9A80]"
                  />
                  <span className="text-[12px] text-[#1A1A1A] tabular-nums">
                    {n.label ? `${n.label} · ${n.e164}` : n.e164}
                  </span>
                  {n.unanswered_action === 'message' && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-[#1E9A80] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      message set
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || selected.size === 0}
              className="px-4 py-2 text-[12px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 rounded-[10px] disabled:opacity-60"
            >
              {saving ? 'Saving…' : `Save for ${selected.size} number${selected.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
