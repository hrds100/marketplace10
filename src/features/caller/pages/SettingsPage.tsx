// SettingsPage — admin settings.
// Tab router: AI coach, Knowledge base (inline edit), SMS templates
// (CRUD), Twilio numbers, Channels (Unipile/Resend/Twilio), Agents,
// Kill switches.

import { useState } from 'react';
import {
  Bot,
  BookOpen,
  MessageSquare,
  Phone,
  ShieldOff,
  Loader2,
  Plug,
  Users,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiSettings } from '../hooks/useAiSettings';
import { useCoachFacts, type CoachFact } from '../hooks/useCoachFacts';
import { useSmsTemplates, type SmsTemplate } from '../hooks/useSmsTemplates';
import { useTwilioNumbers } from '../hooks/useTwilioNumbers';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useChannels, type UnipileProvider } from '../hooks/useChannels';
import { useAgents, type WorkspaceRole } from '../hooks/useAgents';
import { useCallerToasts } from '../store/toastsProvider';

type TabId = 'ai' | 'kb' | 'templates' | 'numbers' | 'channels' | 'agents' | 'kill';

const TABS: { id: TabId; label: string; icon: typeof Bot }[] = [
  { id: 'ai', label: 'AI coach', icon: Bot },
  { id: 'kb', label: 'Knowledge base', icon: BookOpen },
  { id: 'templates', label: 'SMS templates', icon: MessageSquare },
  { id: 'numbers', label: 'Numbers', icon: Phone },
  { id: 'channels', label: 'Channels', icon: Plug },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'kill', label: 'Kill switches', icon: ShieldOff },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('ai');
  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          Settings
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          Admin only. Changes propagate to live agents in realtime.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[#E5E7EB]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'px-3 py-2 text-[13px] font-medium border-b-2 -mb-px inline-flex items-center gap-2',
              tab === id
                ? 'border-[#1E9A80] text-[#1E9A80]'
                : 'border-transparent text-[#6B7280] hover:text-[#1A1A1A]'
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'ai' && <AiCoachTab />}
      {tab === 'kb' && <KnowledgeBaseTab />}
      {tab === 'templates' && <SmsTemplatesTab />}
      {tab === 'numbers' && <NumbersTab />}
      {tab === 'channels' && <ChannelsTab />}
      {tab === 'agents' && <AgentsTab />}
      {tab === 'kill' && <KillSwitchTab />}
    </div>
  );
}

// ─── AI coach tab ────────────────────────────────────────────────────

function AiCoachTab() {
  const { settings, setField, save, saving, saved, loading, error } = useAiSettings();
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
      <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        Three-layer prompt
      </div>
      {error && <ErrorBox text={error} />}
      <Field label="Layer 1 — Style / voice">
        <textarea
          value={settings.coachStylePrompt}
          onChange={(e) => setField('coachStylePrompt', e.target.value)}
          rows={6}
          className="w-full text-[13px] font-mono leading-relaxed border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
          placeholder="How the coach speaks (tone, register, brevity)…"
        />
      </Field>
      <Field label="Layer 2 — Script / call logic">
        <textarea
          value={settings.coachScriptPrompt}
          onChange={(e) => setField('coachScriptPrompt', e.target.value)}
          rows={10}
          className="w-full text-[13px] font-mono leading-relaxed border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
          placeholder="Call structure, objection handling, escalation rules…"
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Toggle
          label="AI enabled"
          checked={settings.aiEnabled}
          onChange={(v) => setField('aiEnabled', v)}
        />
        <Toggle
          label="Live coach enabled"
          checked={settings.liveCoachEnabled}
          onChange={(v) => setField('liveCoachEnabled', v)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-[#1E9A80] px-4 py-2 rounded-[10px] disabled:opacity-60"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-[12px] text-[#1E9A80]">Saved.</span>}
      </div>
      <div className="text-[11px] text-[#9CA3AF] italic">
        Layer 3 (Knowledge base) lives in the next tab.
      </div>
    </div>
  );
}

// ─── Knowledge base tab (inline edit) ─────────────────────────────────

function KnowledgeBaseTab() {
  const { facts, loading, error, upsert, remove } = useCoachFacts();
  const [editing, setEditing] = useState<Partial<CoachFact> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const toasts = useCallerToasts();

  const open = (f?: CoachFact) =>
    setEditing(
      f
        ? { ...f }
        : {
            key: '',
            label: '',
            value: '',
            keywords: [],
            sortOrder: facts.length,
            isActive: true,
          }
    );

  const onSave = async () => {
    if (!editing) return;
    if (!editing.key || !editing.label || !editing.value) {
      setSubmitErr('Key, label, and value are required.');
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    const r = await upsert({
      id: editing.id,
      key: editing.key,
      label: editing.label,
      value: editing.value,
      keywords: editing.keywords ?? [],
      sortOrder: editing.sortOrder ?? facts.length,
      isActive: editing.isActive ?? true,
    });
    setSubmitting(false);
    if (r.ok) {
      toasts.push(editing.id ? 'Fact updated' : 'Fact added', 'success');
      setEditing(null);
    } else {
      setSubmitErr(r.error ?? 'save failed');
    }
  };

  const onRemove = async (id: string) => {
    const r = await remove(id);
    if (r.ok) toasts.push('Fact removed', 'success');
    else toasts.push(`Delete failed: ${r.error}`, 'error');
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBox text={error} />}

      <div className="flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          {facts.length} facts
        </div>
        <button
          type="button"
          onClick={() => open()}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px]"
        >
          <Plus className="w-3.5 h-3.5" />
          Add fact
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && facts.length === 0 && <Empty text="Loading…" />}
        {!loading && facts.length === 0 && <Empty text="No facts yet. Add one above." />}
        <ul className="divide-y divide-[#E5E7EB]">
          {facts.map((f) => (
            <li key={f.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-[11px] bg-[#F3F3EE] px-1.5 py-0.5 rounded font-mono">
                    {f.key}
                  </code>
                  <span className="text-[13px] font-semibold text-[#1A1A1A]">
                    {f.label}
                  </span>
                  {!f.isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                      inactive
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#6B7280] mt-0.5 whitespace-pre-wrap break-words">
                  {f.value}
                </div>
                {f.keywords.length > 0 && (
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                    keywords: {f.keywords.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => open(f)}
                  className="p-1.5 rounded-[8px] hover:bg-[#F3F3EE] text-[#6B7280]"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void onRemove(f.id)}
                  className="p-1.5 rounded-[8px] hover:bg-[#FEF2F2] text-[#B91C1C]"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit fact' : 'Add fact'} onClose={() => setEditing(null)}>
          {submitErr && <ErrorBox text={submitErr} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Key (slug)">
              <input
                value={editing.key ?? ''}
                onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
              />
            </Field>
            <Field label="Label">
              <input
                value={editing.label ?? ''}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
              />
            </Field>
          </div>
          <Field label="Value">
            <textarea
              value={editing.value ?? ''}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              rows={3}
              className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
            />
          </Field>
          <Field label="Keywords (comma-separated)">
            <input
              value={(editing.keywords ?? []).join(', ')}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  keywords: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
            />
          </Field>
          <Toggle
            label="Active"
            checked={editing.isActive ?? true}
            onChange={(v) => setEditing({ ...editing, isActive: v })}
          />
          <ModalFooter
            onCancel={() => setEditing(null)}
            onSave={() => void onSave()}
            saving={submitting}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── SMS templates tab (CRUD) ────────────────────────────────────────

function SmsTemplatesTab() {
  const { templates, loading, error, upsert, remove } = useSmsTemplates();
  const [editing, setEditing] = useState<Partial<SmsTemplate> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const toasts = useCallerToasts();

  const open = (t?: SmsTemplate) =>
    setEditing(t ? { ...t } : { name: '', bodyMd: '', mergeFields: [] });

  const onSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.bodyMd) {
      setSubmitErr('Name and body are required.');
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    const r = await upsert({
      id: editing.id,
      name: editing.name,
      bodyMd: editing.bodyMd,
    });
    setSubmitting(false);
    if (r.ok) {
      toasts.push(editing.id ? 'Template updated' : 'Template added', 'success');
      setEditing(null);
    } else {
      setSubmitErr(r.error ?? 'save failed');
    }
  };

  const onRemove = async (id: string) => {
    const r = await remove(id);
    if (r.ok) toasts.push('Template removed', 'success');
    else toasts.push(`Delete failed: ${r.error}`, 'error');
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBox text={error} />}

      <div className="flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          {templates.length} templates
        </div>
        <button
          type="button"
          onClick={() => open()}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px]"
        >
          <Plus className="w-3.5 h-3.5" />
          Add template
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && templates.length === 0 && <Empty text="Loading…" />}
        {!loading && templates.length === 0 && <Empty text="No templates yet." />}
        <ul className="divide-y divide-[#E5E7EB]">
          {templates.map((t) => (
            <li key={t.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1A1A1A]">{t.name}</div>
                <div className="text-[12px] text-[#6B7280] mt-1 whitespace-pre-wrap break-words font-mono">
                  {t.bodyMd}
                </div>
                {t.mergeFields.length > 0 && (
                  <div className="text-[11px] text-[#9CA3AF] mt-1">
                    merge: {t.mergeFields.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => open(t)}
                  className="p-1.5 rounded-[8px] hover:bg-[#F3F3EE] text-[#6B7280]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void onRemove(t.id)}
                  className="p-1.5 rounded-[8px] hover:bg-[#FEF2F2] text-[#B91C1C]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit template' : 'Add template'} onClose={() => setEditing(null)}>
          {submitErr && <ErrorBox text={submitErr} />}
          <Field label="Name">
            <input
              value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
            />
          </Field>
          <Field label="Body (use {{first_name}} etc. for merge fields)">
            <textarea
              value={editing.bodyMd ?? ''}
              onChange={(e) => setEditing({ ...editing, bodyMd: e.target.value })}
              rows={6}
              className="w-full text-[13px] font-mono border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
            />
          </Field>
          <ModalFooter
            onCancel={() => setEditing(null)}
            onSave={() => void onSave()}
            saving={submitting}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Numbers tab (read-only) ─────────────────────────────────────────

function NumbersTab() {
  const { numbers, loading, error } = useTwilioNumbers();
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      {error && <ErrorBox text={error} />}
      {loading && numbers.length === 0 && <Empty text="Loading…" />}
      {!loading && numbers.length === 0 && <Empty text="No Twilio numbers configured." />}
      <table className="w-full text-[13px]">
        <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Label</th>
            <th className="text-left px-4 py-2 font-semibold">E.164</th>
            <th className="text-left px-4 py-2 font-semibold">Capabilities</th>
            <th className="text-left px-4 py-2 font-semibold">Recording</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {numbers.map((n) => (
            <tr key={n.id}>
              <td className="px-4 py-2 font-semibold text-[#1A1A1A]">{n.label}</td>
              <td className="px-4 py-2 tabular-nums text-[#6B7280]">{n.e164}</td>
              <td className="px-4 py-2 text-[11px] text-[#6B7280]">
                {n.capabilities.join(' · ') || '—'}
              </td>
              <td className="px-4 py-2 text-[11px] text-[#6B7280]">
                {n.recordingEnabled ? 'on' : 'off'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Channels tab ───────────────────────────────────────────────────

function ChannelsTab() {
  const { rows, credentials, loading, error, toggleActive, connectUnipile } = useChannels();
  const toasts = useCallerToasts();
  const [linking, setLinking] = useState<UnipileProvider | null>(null);

  const onConnect = async (provider: UnipileProvider) => {
    setLinking(provider);
    const r = await connectUnipile(provider);
    setLinking(null);
    if (r.error) toasts.push(`Connect failed: ${r.error}`, 'error');
    else toasts.push(`${provider} hosted-auth window opened`, 'info');
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBox text={error} />}

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Connect a channel
        </div>
        <div className="flex flex-wrap gap-2">
          {(['WHATSAPP', 'GMAIL', 'OUTLOOK'] as UnipileProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void onConnect(p)}
              disabled={linking === p}
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-[10px] hover:bg-[#F3F3EE] disabled:opacity-50"
            >
              {linking === p ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plug className="w-3.5 h-3.5" />
              )}
              Connect {p.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-[#9CA3AF] italic">
          Opens Unipile's hosted-auth flow in a new tab. The credential row
          appears below once Unipile webhooks back.
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Credentials ({credentials.length})
        </div>
        {credentials.length === 0 && <Empty text="No credentials yet." />}
        <ul className="divide-y divide-[#E5E7EB]">
          {credentials.map((c) => (
            <li key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#1A1A1A]">{c.label}</div>
                <div className="text-[11px] text-[#6B7280]">
                  {c.provider}
                  {c.lastSeenAt
                    ? ` · last seen ${new Date(c.lastSeenAt).toLocaleString()}`
                    : ''}
                </div>
              </div>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full',
                  c.isConnected
                    ? 'bg-[#ECFDF5] text-[#1E9A80]'
                    : 'bg-[#FEF2F2] text-[#B91C1C]'
                )}
              >
                {c.isConnected ? 'connected' : 'offline'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Numbers + handles ({rows.length})
        </div>
        {loading && rows.length === 0 && <Empty text="Loading…" />}
        {!loading && rows.length === 0 && <Empty text="No numbers / handles yet." />}
        <ul className="divide-y divide-[#E5E7EB]">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#1A1A1A]">
                  {r.label || r.e164}
                </div>
                <div className="text-[11px] text-[#6B7280] tabular-nums">
                  {r.channel} · {r.provider} · {r.e164}
                </div>
              </div>
              <Toggle
                label={r.isActive ? 'On' : 'Off'}
                checked={r.isActive}
                onChange={(v) => void toggleActive(r.id, v)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Agents tab ──────────────────────────────────────────────────────

function AgentsTab() {
  const { agents, loading, error, setRole, setDailyLimit } = useAgents();
  const toasts = useCallerToasts();

  return (
    <div className="space-y-3">
      {error && <ErrorBox text={error} />}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && agents.length === 0 && <Empty text="Loading…" />}
        {!loading && agents.length === 0 && <Empty text="No agents yet." />}
        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Name</th>
              <th className="text-left px-4 py-2 font-semibold">Email</th>
              <th className="text-left px-4 py-2 font-semibold">Role</th>
              <th className="text-right px-4 py-2 font-semibold">Daily limit (£)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 font-semibold text-[#1A1A1A]">{a.name}</td>
                <td className="px-4 py-2 text-[#6B7280]">{a.email}</td>
                <td className="px-4 py-2">
                  <select
                    value={a.workspaceRole ?? ''}
                    onChange={async (e) => {
                      const next = (e.target.value || null) as WorkspaceRole | null;
                      const r = await setRole(a.id, next);
                      if (!r.ok) toasts.push(`Role update failed: ${r.error}`, 'error');
                      else toasts.push(`${a.name} → ${next ?? 'no role'}`, 'success');
                    }}
                    className="text-[12px] border border-[#E5E7EB] rounded-[8px] px-2 py-1 bg-white"
                  >
                    <option value="">— none —</option>
                    <option value="agent">agent</option>
                    <option value="admin">admin</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <DailyLimitInput
                    valuePence={a.dailyLimitPence}
                    onSave={async (pence) => {
                      const r = await setDailyLimit(a.id, pence);
                      if (!r.ok) toasts.push(`Limit update failed: ${r.error}`, 'error');
                      else toasts.push(`${a.name} limit saved`, 'success');
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-[#9CA3AF] italic">
        Inviting new agents (email + temp password) lands in a future PR.
        For now create the auth user in Supabase, then set their workspace role here.
      </div>
    </div>
  );
}

function DailyLimitInput({
  valuePence,
  onSave,
}: {
  valuePence: number | null;
  onSave: (pence: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(valuePence !== null ? `${valuePence / 100}` : '');
  const dirty = draft !== (valuePence !== null ? `${valuePence / 100}` : '');
  return (
    <div className="inline-flex items-center gap-1">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="—"
        className="text-[12px] border border-[#E5E7EB] rounded-[8px] px-2 py-1 bg-white w-20 text-right tabular-nums"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => {
            const num = parseFloat(draft);
            if (Number.isNaN(num)) return void onSave(null);
            void onSave(Math.round(num * 100));
          }}
          className="text-[11px] font-semibold text-[#1E9A80] hover:underline"
        >
          Save
        </button>
      )}
    </div>
  );
}

// ─── Kill switches tab ───────────────────────────────────────────────

function KillSwitchTab() {
  const ks = useKillSwitch();
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
      <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
        Toggles affect every agent immediately.
      </div>
      <Toggle
        label="All dialers"
        sub="When ON, no agent can place a new call."
        checked={ks.allDialers}
        onChange={() => void ks.toggle('allDialers')}
      />
      <Toggle
        label="AI coach"
        sub="When ON, the live coach stops generating suggestions."
        checked={ks.aiCoach}
        onChange={() => void ks.toggle('aiCoach')}
      />
      <Toggle
        label="Outbound (SMS / WhatsApp / email)"
        sub="When ON, all outbound message sends are blocked."
        checked={ks.outbound}
        onChange={() => void ks.toggle('outbound')}
      />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start justify-between gap-3 py-2 text-left"
    >
      <div>
        <div className="text-[13px] font-semibold text-[#1A1A1A]">{label}</div>
        {sub && <div className="text-[11px] text-[#6B7280] mt-0.5">{sub}</div>}
      </div>
      <span
        className={cn(
          'inline-flex items-center w-9 h-5 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'
        )}
      >
        <span
          className={cn(
            'block w-4 h-4 rounded-full bg-white transform transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </span>
    </button>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
      {text}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">{text}</div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[150] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <h2 className="text-[15px] font-bold text-[#1A1A1A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#1A1A1A] p-1"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="text-[12px] font-semibold text-[#6B7280] px-3 py-1.5 hover:text-[#1A1A1A]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 text-[12px] font-semibold text-white bg-[#1E9A80] px-3 py-1.5 rounded-[10px] disabled:opacity-50"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save
      </button>
    </div>
  );
}
