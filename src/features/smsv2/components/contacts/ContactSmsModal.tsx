// ContactSmsModal — quick-send SMS dialog from anywhere a contact is
// listed (ContactsPage row icon, ContactDetailPage header, etc.).
//
// Hugo 2026-04-30 bug report: "the SMS box around the v2 site never
// works, you know. Like next to it, there is the one to make calls and
// they send us to the code. Works, but for the SMS, never works, they
// are all not wired."
//
// Root cause: the SMS buttons in ContactsPage / ContactDetailPage were
// stubbed with onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
// or had no onClick at all. This component is the missing destination.
//
// Pattern matches MidCallSmsSender.tsx (PR #561) — same `sms-send` edge
// function, same templates table, same merge-field substitution. We
// keep them as separate components for now (Phase 4 will share logic
// once stage-coupled templates land).

import { useEffect, useMemo, useState } from 'react';
import { Send, MessageSquare, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';
import type { Contact } from '../../types';

interface Template {
  id: string;
  name: string;
  body_md: string;
}

interface SmsSendInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { sid?: string; error?: string } | null;
    error: { message: string } | null;
  }>;
}

interface TemplatesTable {
  from: (t: string) => {
    select: (c: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => Promise<{ data: Template[] | null; error: { message: string } | null }>;
    };
  };
}

interface Props {
  contact: Contact | null;
  onClose: () => void;
  agentFirstName?: string;
}

export default function ContactSmsModal({
  contact,
  onClose,
  agentFirstName,
}: Props) {
  const { pushToast } = useSmsV2();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingTpls, setLoadingTpls] = useState(true);
  const [recentSendCount, setRecentSendCount] = useState(0);
  const [showSentBanner, setShowSentBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // RLS gates the rows: agents see global + own. The order is
        // alphabetical within each — frontend doesn't need to split.
        const { data } = await (supabase as unknown as TemplatesTable)
          .from('wk_sms_templates')
          .select('id, name, body_md')
          .order('name', { ascending: true });
        if (!cancelled && data) setTemplates(data);
      } catch {
        // RLS / missing table — render with no templates; free-text still works.
      } finally {
        if (!cancelled) setLoadingTpls(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset state when modal opens for a different contact.
  useEffect(() => {
    if (contact) {
      setBody('');
      setRecentSendCount(0);
      setShowSentBanner(false);
    }
  }, [contact]);

  const firstName = useMemo(
    () => (contact?.name ?? '').trim().split(/\s+/)[0] ?? '',
    [contact]
  );

  const applyTemplate = (id: string) => {
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const expanded = tpl.body_md
      .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
      .replace(/\{\{\s*agent_first_name\s*\}\}/gi, agentFirstName ?? '');
    setBody(expanded);
    setShowSentBanner(false);
  };

  const send = async () => {
    if (!contact || !body.trim() || sending) return;
    setSending(true);
    try {
      const { data, error } = await (
        supabase.functions as unknown as SmsSendInvoke
      ).invoke('sms-send', {
        body: { to: contact.phone, body: body.trim() },
      });
      if (error || data?.error) {
        pushToast(
          `SMS send failed: ${error?.message ?? data?.error ?? 'unknown'}`,
          'error'
        );
        return;
      }
      pushToast('SMS sent', 'success');
      setBody('');
      setRecentSendCount((n) => n + 1);
      setShowSentBanner(true);
      // Auto-dismiss the banner after 4s so the user can fire another.
      setTimeout(() => setShowSentBanner(false), 4000);
    } catch (e) {
      pushToast(
        `SMS send crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  if (!contact) return null;

  const length = body.length;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-6"
      onClick={onClose}
      data-testid="contact-sms-modal"
    >
      <div
        className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-[520px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#1E9A80]" />
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">
              SMS to {firstName || contact.name}
            </h2>
            <span className="text-[11px] text-[#9CA3AF] tabular-nums ml-1">
              {contact.phone}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3">
          {showSentBanner && (
            <div
              className="flex items-center gap-2 bg-[#ECFDF5] border border-[#1E9A80]/40 rounded-[10px] px-3 py-2 text-[12px] text-[#1E9A80]"
              role="status"
            >
              <Check className="w-4 h-4" />
              <span>
                Message sent
                {recentSendCount > 1 ? ` · ${recentSendCount} this session` : ''}
              </span>
            </div>
          )}

          <select
            value=""
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={loadingTpls || templates.length === 0}
            className="w-full px-2 py-1.5 text-[12px] border border-[#E5E5E5] rounded-[10px] bg-white disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
          >
            <option value="">
              {loadingTpls
                ? 'Loading templates…'
                : templates.length === 0
                  ? 'No templates yet'
                  : 'Insert template…'}
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (showSentBanner) setShowSentBanner(false);
            }}
            placeholder="Type a message, or pick a template above."
            rows={5}
            className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80] resize-none"
            data-testid="contact-sms-modal-body"
          />

          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[10px] tabular-nums',
                length > 160 ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'
              )}
            >
              {length}/160
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-[12px] text-[#6B7280] px-3 py-1.5 rounded-[10px] hover:bg-[#F3F3EE]"
              >
                Done
              </button>
              <button
                onClick={() => void send()}
                disabled={!body.trim() || sending}
                className="bg-[#1E9A80] text-white text-[12px] font-semibold px-4 py-1.5 rounded-[10px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-50"
                data-testid="contact-sms-modal-send"
              >
                <Send className="w-3 h-3" />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
