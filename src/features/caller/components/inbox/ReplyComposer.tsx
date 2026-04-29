// ReplyComposer — channel-aware outbound message composer.
// Defaults to the channel of the most recent message in the thread; the
// agent can override per-message via the channel pills. Templates are
// pulled from useSmsTemplates and rendered raw (merge-field substitution
// is best-effort: we replace `{{first_name}}` with the contact's first
// name when available; deeper interpolation lands later).

import { useEffect, useMemo, useState } from 'react';
import { Send, MessageSquare, Mail, Phone, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSendMessage,
  type Channel,
  CHANNEL_LIMIT,
  CHANNEL_LABEL,
} from '../../hooks/useSendMessage';
import { useSmsTemplates } from '../../hooks/useSmsTemplates';
import { useCallerToasts } from '../../store/toastsProvider';

interface Props {
  contactId: string;
  contactName?: string;
  defaultChannel?: Channel;
  campaignId?: string | null;
  onSent?: () => void;
}

export default function ReplyComposer({
  contactId,
  contactName,
  defaultChannel = 'sms',
  campaignId,
  onSent,
}: Props) {
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<string>('');
  const { send } = useSendMessage();
  const { templates } = useSmsTemplates();
  const toasts = useCallerToasts();

  // Re-default the channel if the prop changes (e.g. switching threads).
  useEffect(() => {
    setChannel(defaultChannel);
  }, [defaultChannel]);

  const limit = CHANNEL_LIMIT[channel];
  const overLimit = body.length > limit;
  const canSend = !sending && body.trim().length > 0 && !overLimit;
  const templateOptions = useMemo(
    () => [{ id: '', name: '— pick a template —' }, ...templates],
    [templates]
  );

  const onPickTemplate = (id: string) => {
    setPickedTemplate(id);
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const firstName = (contactName ?? '').split(' ')[0] || 'there';
    const substituted = t.bodyMd.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
    setBody(substituted);
  };

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    const r = await send({
      contactId,
      channel,
      body,
      subject: channel === 'email' ? subject : undefined,
      campaignId: campaignId ?? null,
    });
    setSending(false);
    if (r.ok) {
      toasts.push(`${CHANNEL_LABEL[channel]} sent`, 'success');
      setBody('');
      setSubject('');
      setPickedTemplate('');
      onSent?.();
    } else {
      toasts.push(`Send failed: ${r.error ?? 'unknown'}`, 'error');
    }
  };

  return (
    <div
      data-feature="CALLER__REPLY_COMPOSER"
      className="border-t border-[#E5E7EB] p-3 bg-white space-y-2"
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className="uppercase tracking-wide text-[#9CA3AF] font-semibold">
          via
        </span>
        {(['sms', 'whatsapp', 'email'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium',
              channel === c
                ? 'bg-[#1E9A80] text-white'
                : 'bg-[#F3F3EE] text-[#6B7280] hover:bg-[#ECFDF5] hover:text-[#1E9A80]'
            )}
          >
            <ChannelIcon channel={c} />
            {CHANNEL_LABEL[c]}
          </button>
        ))}
        {templates.length > 0 && (
          <select
            value={pickedTemplate}
            onChange={(e) => onPickTemplate(e.target.value)}
            className="ml-auto text-[11px] border border-[#E5E7EB] rounded-[8px] px-2 py-1 bg-white"
          >
            {templateOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {channel === 'email' && (
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
        />
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Type your ${CHANNEL_LABEL[channel]}…`}
        rows={3}
        className={cn(
          'w-full text-[13px] border rounded-[10px] px-3 py-2 bg-white resize-none',
          overLimit
            ? 'border-[#FCA5A5] focus:ring-[#FCA5A5]/40'
            : 'border-[#E5E7EB] focus:ring-[#1E9A80]/40 focus:border-[#1E9A80]'
        )}
      />

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[10px] tabular-nums',
            overLimit ? 'text-[#B91C1C] font-semibold' : 'text-[#9CA3AF]'
          )}
        >
          {body.length} / {limit}
        </span>
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={!canSend}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {!sending && <Send className="w-3.5 h-3.5" />}
          Send
        </button>
      </div>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: Channel }) {
  const Icon =
    channel === 'email' ? Mail : channel === 'whatsapp' ? MessageSquare : Phone;
  return <Icon className="w-3 h-3" />;
}
