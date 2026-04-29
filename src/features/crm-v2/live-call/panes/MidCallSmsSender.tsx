// crm-v2 MidCallSmsSender — quick-send SMS / WhatsApp / Email
// during a live call.
//
// Reads templates from wk_sms_templates. Sends via:
//   - SMS:      wk-sms-send (Twilio)
//   - WhatsApp: unipile-send (Unipile API)
//   - Email:    wk-email-send (Resend)
//
// Pared-down vs the smsv2 MidCallSmsSender:
//   - No mandatory stage picker (Hugo can pick outcome separately)
//   - No follow-up prompt modal (separate concern)
//   - No "From: …" line preview (server picks the number)
//
// Those advanced flows can come back if Hugo asks. PR C.3 ships the
// core "send a templated message mid-call" UX.

import { useEffect, useMemo, useState } from 'react';
import { Send, MessageSquare, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { interpolateTemplate } from '../../lib/interpolateTemplate';
import { useDialer } from '../../state/DialerProvider';

type Channel = 'sms' | 'whatsapp' | 'email';

interface Template {
  id: string;
  name: string;
  body_md: string;
  channel: Channel | null;
  subject: string | null;
}

const CHANNEL_LABEL: Record<Channel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

const CHANNEL_ICON: Record<Channel, typeof MessageSquare> = {
  sms: MessageSquare,
  whatsapp: Phone,
  email: Mail,
};

const CHANNEL_FN: Record<Channel, string> = {
  sms: 'wk-sms-send',
  whatsapp: 'unipile-send',
  email: 'wk-email-send',
};

interface SendInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { sid?: string; error?: string; external_id?: string } | null;
    error: { message: string } | null;
  }>;
}

export default function MidCallSmsSender() {
  const { call, callPhase } = useDialer();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTpls, setLoadingTpls] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);

  // Reset state when the call changes.
  useEffect(() => {
    setSelectedTemplateId('');
    setBody('');
    setSubject('');
    setFeedback(null);
  }, [call?.contactId]);

  // Load templates once. wk_sms_templates RLS is workspace-wide read.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_sms_templates' as any) as any)
        .select('id, name, body_md, channel, subject')
        .order('name', { ascending: true });
      if (cancelled) return;
      setTemplates((data ?? []) as Template[]);
      setLoadingTpls(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTemplates = useMemo(() => {
    if (!channel) return templates;
    return templates.filter((t) => !t.channel || t.channel === channel);
  }, [templates, channel]);

  const onPickTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const contactFirst = (call?.contactName ?? '').trim().split(/\s+/)[0] ?? '';
    setBody(
      interpolateTemplate(t.body_md, {
        firstName: contactFirst,
        agentFirstName: '',
      })
    );
    if (t.subject) {
      setSubject(
        interpolateTemplate(t.subject, {
          firstName: contactFirst,
          agentFirstName: '',
        })
      );
    }
    if (t.channel && !channel) setChannel(t.channel);
  };

  const isLive =
    callPhase === 'in_call' ||
    callPhase === 'dialing' ||
    callPhase === 'ringing';

  const canSend = !!channel && !!body.trim() && !!call?.contactId && !sending;

  const onSend = async () => {
    if (!canSend || !channel || !call) return;
    setSending(true);
    setFeedback(null);
    try {
      const fnName = CHANNEL_FN[channel];
      const payload: Record<string, unknown> = {
        contact_id: call.contactId,
        body: body.trim(),
      };
      if (channel === 'email') {
        payload.subject = subject.trim() || '(no subject)';
      }
      const { data, error } = await (
        supabase.functions as unknown as SendInvoke
      ).invoke(fnName, { body: payload });
      if (error) {
        setFeedback({ tone: 'err', msg: error.message });
        return;
      }
      if (data?.error) {
        setFeedback({ tone: 'err', msg: data.error });
        return;
      }
      setFeedback({ tone: 'ok', msg: `${CHANNEL_LABEL[channel]} sent` });
      setBody('');
      setSubject('');
      setSelectedTemplateId('');
    } catch (e) {
      setFeedback({
        tone: 'err',
        msg: e instanceof Error ? e.message : 'send failed',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="border-t border-[#E5E7EB] p-3 space-y-2 bg-white"
      data-testid="mid-call-sms"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-semibold text-[#9CA3AF] tracking-wide">
          Send
        </span>
        <div className="flex gap-1">
          {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => {
            const Icon = CHANNEL_ICON[c];
            const active = channel === c;
            return (
              <button
                key={c}
                onClick={() => setChannel(c)}
                disabled={!isLive && callPhase !== 'in_call'}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded',
                  active
                    ? 'bg-[#1E9A80] text-white'
                    : 'border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F3EE]'
                )}
                data-testid={`mid-call-channel-${c}`}
                title={CHANNEL_LABEL[c]}
              >
                <Icon className="w-3 h-3" />
                {CHANNEL_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>

      <select
        value={selectedTemplateId}
        onChange={(e) => onPickTemplate(e.target.value)}
        disabled={loadingTpls}
        className="w-full px-2 py-1 text-[11px] bg-white border border-[#E5E7EB] rounded-[8px]"
        data-testid="mid-call-template"
      >
        <option value="">{loadingTpls ? 'Loading…' : 'Pick a template…'}</option>
        {visibleTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.channel ? ` · ${CHANNEL_LABEL[t.channel]}` : ''}
          </option>
        ))}
      </select>

      {channel === 'email' && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px]"
          data-testid="mid-call-subject"
        />
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          channel
            ? `Type your ${CHANNEL_LABEL[channel]}…`
            : 'Pick a channel above to start typing.'
        }
        rows={3}
        className="w-full px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px] resize-none"
        data-testid="mid-call-body"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={() => void onSend()}
          disabled={!canSend}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold',
            canSend
              ? 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
              : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
          )}
          data-testid="mid-call-send"
        >
          <Send className="w-3 h-3" />
          {sending ? 'Sending…' : 'Send'}
        </button>
        {feedback && (
          <span
            className={cn(
              'text-[10px]',
              feedback.tone === 'ok' ? 'text-[#1E9A80]' : 'text-[#B91C1C]'
            )}
          >
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  );
}
