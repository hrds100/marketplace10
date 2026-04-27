// ChannelsTab — Settings → Channels. Lists every paired channel
// (SMS via Twilio, WhatsApp via Wazzup24, Email via Resend) grouped
// by provider, with on/off toggle per row and a "Sync from Wazzup24"
// button that pulls newly-paired WhatsApp numbers into wk_numbers.
//
// PR 64 (multi-channel PR 5), Hugo 2026-04-27.

import { useMemo, useState } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  QrCode,
  Linkedin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useChannels,
  type ChannelRow,
  type ChannelProvider,
  type UnipileProvider,
} from '../../hooks/useChannels';
import { useSmsV2 } from '../../store/SmsV2Store';

interface SectionDef {
  provider: ChannelProvider;
  channelKind: 'sms' | 'whatsapp' | 'email';
  label: string;
  Icon: typeof Phone;
  hint: string;
  externalLink?: { href: string; label: string };
  /** PR 69: when set, render a "Connect via QR" button that calls
   *  unipile-create-link with the given Unipile provider. */
  unipileConnect?: { provider: UnipileProvider; label: string; icon: typeof Phone };
}

const SECTIONS: SectionDef[] = [
  {
    provider: 'twilio',
    channelKind: 'sms',
    label: 'SMS — Twilio',
    Icon: Phone,
    hint: 'Numbers managed in the Numbers tab; this list is read-only here.',
  },
  {
    provider: 'unipile',
    channelKind: 'whatsapp',
    label: 'WhatsApp — Unipile',
    Icon: MessageSquare,
    hint: 'Click "Connect via QR" — Unipile opens a hosted page where you scan the WhatsApp QR with your phone. After scanning, the number appears below and is ready to send/receive.',
    unipileConnect: { provider: 'WHATSAPP', label: 'Connect via QR', icon: QrCode },
  },
  {
    provider: 'wazzup',
    channelKind: 'whatsapp',
    label: 'WhatsApp — Wazzup24 (legacy)',
    Icon: MessageSquare,
    hint: 'Legacy gateway — being phased out in favour of Unipile. Existing chats keep working until you disconnect the channel.',
    externalLink: {
      href: 'https://app.wazzup24.com/',
      label: 'Open Wazzup24',
    },
  },
  {
    provider: 'resend',
    channelKind: 'email',
    label: 'Email — Resend',
    Icon: Mail,
    hint: 'Outbound from elijah@/georgia@mail.nfstay.com works today. Inbound is being re-wired — expect a separate update.',
  },
];

const UNIPILE_OPTIONS: Array<{ provider: UnipileProvider; label: string; icon: typeof Phone }> = [
  { provider: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
  { provider: 'LINKEDIN', label: 'LinkedIn', icon: Linkedin },
  { provider: 'GMAIL', label: 'Gmail', icon: Mail },
  { provider: 'OUTLOOK', label: 'Outlook', icon: Mail },
  { provider: 'MAIL', label: 'Custom IMAP', icon: Mail },
];

export default function ChannelsTab() {
  const {
    rows,
    credentials,
    loading,
    error,
    syncing,
    toggleActive,
    syncWazzup,
    connectUnipile,
  } = useChannels();
  const { pushToast } = useSmsV2();
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [connectingUnipile, setConnectingUnipile] = useState<UnipileProvider | null>(null);
  const [unipileFallbackUrl, setUnipileFallbackUrl] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<ChannelProvider, ChannelRow[]>();
    for (const r of rows) {
      const arr = m.get(r.provider) ?? [];
      arr.push(r);
      m.set(r.provider, arr);
    }
    return m;
  }, [rows]);

  const credByProvider = useMemo(() => {
    const m = new Map<ChannelProvider, (typeof credentials)[number]>();
    for (const c of credentials) m.set(c.provider, c);
    return m;
  }, [credentials]);

  const handleToggle = async (id: string, next: boolean) => {
    setBusyRowId(id);
    try {
      await toggleActive(id, next);
      pushToast(next ? 'Channel enabled' : 'Channel disabled', 'success');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Toggle failed', 'error');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleSync = async () => {
    const r = await syncWazzup();
    if (r.error) {
      pushToast(`Wazzup sync failed: ${r.error}`, 'error');
      return;
    }
    pushToast(
      `Synced ${r.synced} WhatsApp ${r.synced === 1 ? 'channel' : 'channels'}` +
        (r.skipped ? ` (${r.skipped} skipped)` : ''),
      'success'
    );
  };

  const handleUnipileConnect = async (provider: UnipileProvider) => {
    setConnectingUnipile(provider);
    setUnipileFallbackUrl(null);
    try {
      const r = await connectUnipile(provider);
      if (r.error) {
        pushToast(`Connect failed: ${r.error}`, 'error');
        return;
      }
      if (r.url) {
        setUnipileFallbackUrl(r.url);
        pushToast(`Opened Unipile — scan the ${provider} QR/login on the new tab`, 'success');
      }
    } finally {
      setConnectingUnipile(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <div className="text-[12px] text-[#6B7280] py-4">Loading channels…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-1">Channels</h2>
        <p className="text-[12px] text-[#6B7280]">
          Every channel agents can send + receive on. Toggle a channel off and the dialer +
          message senders will skip it. Numbers can also be assigned to specific campaigns
          inside the Campaigns tab.
        </p>
        {error && (
          <div className="mt-3 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-[10px] px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {SECTIONS.map((section) => {
        const sectionRows = grouped.get(section.provider) ?? [];
        const cred = credByProvider.get(section.provider);
        const sectionConnected = cred?.is_connected ?? sectionRows.some((r) => r.is_active);
        return (
          <div key={section.provider} className="rounded-2xl border border-[#E5E7EB] bg-white">
            <header className="flex items-start justify-between gap-3 px-5 py-3 border-b border-[#E5E7EB]">
              <div className="flex items-start gap-3">
                <section.Icon className="w-5 h-5 text-[#1E9A80] mt-0.5" strokeWidth={1.8} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[#1A1A1A]">
                      {section.label}
                    </h3>
                    <ProviderBadge connected={sectionConnected} />
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{section.hint}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                {section.unipileConnect && (
                  <button
                    onClick={() => void handleUnipileConnect(section.unipileConnect!.provider)}
                    disabled={connectingUnipile === section.unipileConnect.provider}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90 px-3 py-1.5 rounded-[10px] disabled:opacity-60"
                    data-testid={`connect-${section.unipileConnect.provider.toLowerCase()}`}
                  >
                    <section.unipileConnect.icon className="w-3 h-3" />
                    {connectingUnipile === section.unipileConnect.provider
                      ? 'Opening…'
                      : section.unipileConnect.label}
                  </button>
                )}
                {section.provider === 'wazzup' && (
                  <button
                    onClick={() => void handleSync()}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px] disabled:opacity-60"
                  >
                    <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin')} />
                    {syncing ? 'Syncing…' : 'Sync from Wazzup'}
                  </button>
                )}
                {section.externalLink && (
                  <a
                    href={section.externalLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px]"
                    title="Opens in a new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {section.externalLink.label}
                  </a>
                )}
              </div>
            </header>

            {section.provider === 'unipile' && unipileFallbackUrl && (
              <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#ECFDF5]/40">
                <div className="text-[11px] text-[#1E9A80] font-semibold mb-1">
                  If the Unipile tab didn't open
                </div>
                <a
                  href={unipileFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] underline text-[#1E9A80] break-all"
                >
                  {unipileFallbackUrl}
                </a>
              </div>
            )}

            <div className="px-5 py-3">
              {sectionRows.length === 0 ? (
                <EmptyState section={section} />
              ) : (
                <ul className="space-y-1.5">
                  {sectionRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] border border-[#E5E7EB] bg-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CircleDot active={row.is_active} />
                        <span className="text-[13px] font-mono text-[#1A1A1A] truncate">
                          {row.e164}
                        </span>
                        {row.external_id && (
                          <span className="text-[10px] text-[#9CA3AF] font-mono truncate">
                            · {row.external_id.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => void handleToggle(row.id, !row.is_active)}
                        disabled={busyRowId === row.id}
                        className={cn(
                          'inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-full transition-colors',
                          row.is_active
                            ? 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
                            : 'bg-[#F3F3EE] text-[#6B7280] hover:bg-[#E5E7EB]',
                          busyRowId === row.id && 'opacity-60'
                        )}
                      >
                        {busyRowId === row.id ? '…' : row.is_active ? 'On' : 'Off'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProviderBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#1E9A80] bg-[#ECFDF5] px-1.5 py-0.5 rounded">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#B91C1C] bg-[#FEF2F2] px-1.5 py-0.5 rounded">
      <XCircle className="w-3 h-3" />
      Disconnected
    </span>
  );
}

function CircleDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full flex-none',
        active ? 'bg-[#1E9A80]' : 'bg-[#9CA3AF]'
      )}
      aria-label={active ? 'active' : 'inactive'}
    />
  );
}

function EmptyState({ section }: { section: SectionDef }) {
  const msg =
    section.provider === 'wazzup'
      ? 'No WhatsApp channels yet. Pair one on wazzup24.com, then click Sync.'
      : section.provider === 'resend'
        ? 'No email address yet. Set up the Resend domain inbox.nfstay.com and a wk_numbers row will appear after the first inbound or send.'
        : 'No SMS numbers yet. Add one in the Numbers tab.';
  return <div className="text-[12px] text-[#9CA3AF] py-3">{msg}</div>;
}
