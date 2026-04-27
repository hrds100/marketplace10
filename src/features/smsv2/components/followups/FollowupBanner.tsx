// FollowupBanner — persistent top-of-screen banner showing pending /
// snoozed follow-ups whose due_at has arrived (or soon will). Tickles
// the agent so they don't lose track of nurturing leads.
//
// Hugo 2026-04-26: "the notification should be a notification, maybe a
// banner whenever is the follow-up time, and there comes a banner. It
// stays consistently on the top, very small, expandable so they can
// see, and they have the option to call or SMS on this banner."
//
// Collapsed: pill with count + next due-name.
// Expanded: list with per-row Call / SMS / Mark done / Snooze 1h.
//
// Mounts inside Smsv2Layout once, polls a 30s tick to refresh "is this
// due yet?" state. The hook drives the data + realtime channel.

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  Check,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFollowups } from '../../hooks/useFollowups';
import { useSmsV2 } from '../../store/SmsV2Store';
import { useActiveCallCtx } from '../live-call/ActiveCallContext';

export default function FollowupBanner() {
  const { items, setStatus, snooze } = useFollowups();
  const { contacts, columns } = useSmsV2();
  const { startCall } = useActiveCallCtx();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [, setNow] = useState(Date.now());

  // Tick every 30s so "is this due yet?" stays current without a
  // realtime event. Banner re-renders cheaply — no DB hit.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const due = useMemo(() => {
    const now = Date.now();
    return items
      .filter((i) => new Date(i.due_at).getTime() <= now)
      .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  }, [items]);

  if (due.length === 0) return null;

  const next = due[0];
  const nextContact = contacts.find((c) => c.id === next.contact_id);
  const nextStage = next.column_id
    ? columns.find((c) => c.id === next.column_id)
    : undefined;

  return (
    <div className="bg-[#FFFBEB] border-b border-[#F59E0B]/40 px-4 py-1.5 z-[110] sticky top-0 flex-shrink-0">
      <div className="flex items-center gap-2 max-w-[1280px] mx-auto">
        <Bell className="w-3.5 h-3.5 text-[#B45309] flex-shrink-0" strokeWidth={2.4} />
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#B45309]">
          {due.length} follow-up{due.length > 1 ? 's' : ''} due
        </span>
        {!open && nextContact && (
          <span className="text-[12px] text-[#1A1A1A] truncate">
            <span className="font-semibold">{nextContact.name}</span>
            {nextStage ? (
              <>
                {' '}
                ·{' '}
                <span style={{ color: nextStage.colour }} className="font-medium">
                  {nextStage.name}
                </span>
              </>
            ) : null}
            {next.note ? <> · {next.note}</> : null}
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#B45309] hover:text-[#92400E]"
        >
          {open ? (
            <>
              Collapse <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Expand <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="max-w-[1280px] mx-auto mt-2 space-y-1 max-h-[260px] overflow-y-auto pr-1">
          {due.map((f) => {
            const contact = contacts.find((c) => c.id === f.contact_id);
            const stage = f.column_id
              ? columns.find((c) => c.id === f.column_id)
              : undefined;
            const dueAgo = relativeTime(f.due_at);
            return (
              <div
                key={f.id}
                className="flex items-center gap-2 bg-white border border-[#F59E0B]/40 rounded-md px-2 py-1.5"
              >
                <button
                  onClick={() => {
                    if (contact) navigate(`/crm/contacts/${contact.id}`);
                  }}
                  className="text-[12px] font-semibold text-[#1A1A1A] hover:underline truncate flex-1 text-left"
                  title={f.note ?? ''}
                >
                  {contact?.name ?? 'Unknown contact'}
                </button>
                {stage && (
                  <span
                    className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${stage.colour}1A`, color: stage.colour }}
                  >
                    {stage.name}
                  </span>
                )}
                <span className="text-[10px] text-[#B45309] tabular-nums whitespace-nowrap">
                  {dueAgo}
                </span>
                {f.note && (
                  <span className="text-[11px] text-[#6B7280] truncate flex-1">
                    {f.note}
                  </span>
                )}
                <button
                  onClick={() => contact && void startCall(contact.id)}
                  disabled={!contact}
                  title="Call now"
                  className="p-1 rounded hover:bg-[#1E9A80]/10 text-[#1E9A80] disabled:opacity-50"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => contact && navigate(`/crm/inbox?contact=${contact.id}`)}
                  disabled={!contact}
                  title="SMS now"
                  className="p-1 rounded hover:bg-[#3B82F6]/10 text-[#3B82F6] disabled:opacity-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => void snooze(f.id, 1)}
                  title="Snooze 1h"
                  className="p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => void setStatus(f.id, 'done')}
                  title="Mark done"
                  className="p-1 rounded hover:bg-[#1E9A80]/10 text-[#1E9A80]"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const past = ms < 0;
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  if (mins < 60) {
    return past ? `${mins}m ago` : `in ${mins}m`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return past ? `${hours}h ago` : `in ${hours}h`;
  }
  const days = Math.round(hours / 24);
  return past ? `${days}d ago` : `in ${days}d`;
}
