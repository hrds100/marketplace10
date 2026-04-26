import { useState } from 'react';
import {
  Kanban,
  MessageSquare,
  Megaphone,
  Users,
  Phone,
  Bot,
  Shield,
  Activity,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Clock,
  PhoneMissed,
  X,
  Voicemail,
  Ban,
  Key,
  Eye,
  EyeOff,
  Mail,
  BookOpen,
  Brain,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_TEMPLATES, COACH_PROMPTS } from '../data/mockCampaigns';
import { formatPence } from '../data/helpers';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useAiSettings } from '../hooks/useAiSettings';
import { useDefaultCallScript } from '../hooks/useDefaultCallScript';
import { useAgentScript } from '../hooks/useAgentScript';
import { useTerminologies, type Terminology } from '../hooks/useTerminologies';
import { useCoachFacts, type CoachFact } from '../hooks/useCoachFacts';
import { useTwilioAccount } from '../hooks/useTwilioAccount';
import { useSmsV2 } from '../store/SmsV2Store';
import { supabase } from '@/integrations/supabase/client';
import type { Agent, PipelineColumn } from '../types';

interface CreateAgentInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: {
      user_id?: string;
      email?: string;
      role?: string;
      extension?: string | null;
      daily_limit_pence?: number;
      error?: string;
    } | null;
    error: { message: string } | null;
  }>;
}

const TABS = [
  { id: 'pipelines', label: 'Pipelines & outcomes', icon: Kanban },
  { id: 'templates', label: 'SMS templates', icon: MessageSquare },
  { id: 'campaigns', label: 'Campaigns & leads', icon: Megaphone },
  { id: 'agents', label: 'Agents & spend', icon: Users },
  { id: 'numbers', label: 'Numbers', icon: Phone },
  { id: 'ai', label: 'AI coach', icon: Bot },
  { id: 'kb', label: 'Knowledge base', icon: Brain },
  { id: 'glossary', label: 'Glossary', icon: BookOpen },
  { id: 'pacing', label: 'Pacing & safety', icon: Shield },
  { id: 'kill', label: 'Kill switches & audit', icon: Activity },
] as const;

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Clock,
  PhoneMissed,
  X,
  Voicemail,
  Ban,
};

const COLOUR_PALETTE = [
  '#1E9A80', '#F59E0B', '#3B82F6', '#EF4444',
  '#9CA3AF', '#525252', '#8B5CF6', '#EC4899',
];

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('pipelines');

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#6B7280]">
          Nothing in the agent UI is hardcoded — everything below is editable here
        </p>
      </header>

      <div className="grid grid-cols-12 gap-5">
        {/* Tab nav */}
        <nav className="col-span-12 lg:col-span-3 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] text-left transition-colors',
                tab === t.id
                  ? 'bg-white border border-[#E5E7EB] text-[#1E9A80] font-semibold shadow-sm'
                  : 'text-[#6B7280] hover:bg-white/50'
              )}
            >
              <t.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              {t.label}
            </button>
          ))}
        </nav>

        <main className="col-span-12 lg:col-span-9">
          {tab === 'pipelines' && <PipelinesTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'campaigns' && <CampaignsTab />}
          {tab === 'agents' && <AgentsTab />}
          {tab === 'numbers' && <NumbersTab />}
          {tab === 'ai' && <AITab />}
          {tab === 'kb' && <KnowledgeBaseTab />}
          {tab === 'glossary' && <GlossaryTab />}
          {tab === 'pacing' && <PacingTab />}
          {tab === 'kill' && <KillTab />}
        </main>
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-[#1A1A1A]">{title}</h3>
        {hint && <span className="text-[11px] text-[#9CA3AF]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Pipelines tab — fully editable ────────────────────────────────
function PipelinesTab() {
  const { columns: cols, patchColumn, upsertColumn, removeColumn } = useSmsV2();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<PipelineColumn>) => {
    patchColumn(id, patch);
  };
  const updateAuto = (id: string, patch: Partial<PipelineColumn['automation']>) => {
    const target = cols.find((c) => c.id === id);
    if (!target) return;
    patchColumn(id, { automation: { ...target.automation, ...patch } });
  };
  const addColumn = () => {
    const id = `col-new-${Date.now()}`;
    // Use the pipelineId from the first real hydrated column. Falls back
    // to the mock ACTIVE_PIPELINE.id only when no real columns exist
    // (fresh workspace with no rows yet) so writes land on a real
    // pipeline UUID instead of the mock string.
    const realPipelineId = cols[0]?.pipelineId ?? ACTIVE_PIPELINE.id;
    upsertColumn({
      id,
      pipelineId: realPipelineId,
      name: 'New stage',
      colour: COLOUR_PALETTE[cols.length % COLOUR_PALETTE.length],
      icon: 'Sparkles',
      position: cols.length + 1,
      automation: {
        sendSms: false,
        createTask: false,
        retryDial: false,
        addTag: false,
      },
    });
    setExpandedId(id);
  };
  const remove = (id: string) => {
    removeColumn(id);
    if (expandedId === id) setExpandedId(null);
  };
  const setTimeoutDefault = (id: string, checked: boolean) => {
    cols.forEach((c) => {
      const shouldBe = c.id === id ? checked : false;
      if ((c.isDefaultOnTimeout ?? false) !== shouldBe) {
        patchColumn(c.id, { isDefaultOnTimeout: shouldBe });
      }
    });
  };

  return (
    <>
      <Card
        title="Pipeline columns = outcome buttons (CRITICAL)"
        hint="Click a row to edit automations · drag to reorder · 1–9 = keyboard"
      >
        <div className="space-y-2">
          {cols.map((col) => {
            const Icon = ICON_MAP[col.icon] ?? Sparkles;
            const a = col.automation;
            const isOpen = expandedId === col.id;
            return (
              <div
                key={col.id}
                className="border border-[#E5E7EB] rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  <GripVertical className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 cursor-grab" />
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${col.colour}1A`, color: col.colour }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#9CA3AF] tabular-nums">
                        {col.position}
                      </span>
                      <input
                        value={col.name}
                        onChange={(e) => update(col.id, { name: e.target.value })}
                        className="text-[13px] font-semibold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 rounded px-1 max-w-[200px]"
                      />
                      {col.isDefaultOnTimeout && (
                        <span className="text-[9px] font-medium bg-[#FEF7E6] text-[#B45309] px-1 py-0.5 rounded">
                          TIMEOUT DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 flex flex-wrap gap-1">
                      {a.sendSms && (
                        <Chip label={`+SMS (${a.smsTemplateId ?? 'inline'})`} colour="#1E9A80" />
                      )}
                      {a.createTask && (
                        <Chip
                          label={`+task (${a.taskTitle ?? '—'} · ${a.taskDueInHours}h)`}
                          colour="#3B82F6"
                        />
                      )}
                      {a.retryDial && (
                        <Chip label={`+retry ${a.retryInHours}h`} colour="#F59E0B" />
                      )}
                      {a.addTag && <Chip label={`+tag ${a.tag}`} colour="#9CA3AF" />}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : col.id)}
                    className="text-[11px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1 rounded"
                  >
                    {isOpen ? 'Close' : 'Edit'}
                  </button>
                  <button
                    onClick={() => remove(col.id)}
                    className="text-[#9CA3AF] hover:text-[#EF4444] p-1.5 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-[#E5E7EB] p-3 bg-[#F3F3EE]/40 space-y-3">
                    {/* Colour picker */}
                    <div>
                      <Label>Colour</Label>
                      <div className="flex gap-1.5">
                        {COLOUR_PALETTE.map((p) => (
                          <button
                            key={p}
                            onClick={() => update(col.id, { colour: p })}
                            className={cn(
                              'w-6 h-6 rounded-full border-2',
                              col.colour === p
                                ? 'border-[#1A1A1A]'
                                : 'border-transparent'
                            )}
                            style={{ background: p }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Default-on-timeout */}
                    <label className="flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={col.isDefaultOnTimeout ?? false}
                        onChange={(e) => setTimeoutDefault(col.id, e.target.checked)}
                      />
                      <span className="text-[#1A1A1A]">
                        Default outcome when auto-advance timer expires
                      </span>
                    </label>

                    {/* Automations */}
                    <div className="border border-[#E5E7EB] rounded-xl bg-white p-3 space-y-3">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-[#9CA3AF]">
                        Pipeline automation engine — runs on click
                      </div>

                      {/* SMS */}
                      <ToggleRow
                        on={a.sendSms}
                        onToggle={(v) => updateAuto(col.id, { sendSms: v })}
                        title="Send SMS"
                      >
                        <select
                          disabled={!a.sendSms}
                          value={a.smsTemplateId ?? ''}
                          onChange={(e) =>
                            updateAuto(col.id, { smsTemplateId: e.target.value })
                          }
                          className="px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] bg-white disabled:opacity-50"
                        >
                          <option value="">Pick template…</option>
                          {MOCK_TEMPLATES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </ToggleRow>

                      {/* Task */}
                      <ToggleRow
                        on={a.createTask}
                        onToggle={(v) => updateAuto(col.id, { createTask: v })}
                        title="Create follow-up task"
                      >
                        <input
                          disabled={!a.createTask}
                          value={a.taskTitle ?? ''}
                          onChange={(e) =>
                            updateAuto(col.id, { taskTitle: e.target.value })
                          }
                          placeholder="Task title"
                          className="px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] flex-1 disabled:opacity-50"
                        />
                        <input
                          disabled={!a.createTask}
                          type="number"
                          value={a.taskDueInHours ?? ''}
                          onChange={(e) =>
                            updateAuto(col.id, {
                              taskDueInHours: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          placeholder="hrs"
                          className="px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] w-16 tabular-nums disabled:opacity-50"
                        />
                      </ToggleRow>

                      {/* Retry */}
                      <ToggleRow
                        on={a.retryDial}
                        onToggle={(v) => updateAuto(col.id, { retryDial: v })}
                        title="Retry dial in"
                      >
                        <input
                          disabled={!a.retryDial}
                          type="number"
                          value={a.retryInHours ?? ''}
                          onChange={(e) =>
                            updateAuto(col.id, {
                              retryInHours: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          placeholder="hrs"
                          className="px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] w-16 tabular-nums disabled:opacity-50"
                        />
                        <span className="text-[11px] text-[#6B7280]">hours</span>
                      </ToggleRow>

                      {/* Tag */}
                      <ToggleRow
                        on={a.addTag}
                        onToggle={(v) => updateAuto(col.id, { addTag: v })}
                        title="Add tag to contact"
                      >
                        <input
                          disabled={!a.addTag}
                          value={a.tag ?? ''}
                          onChange={(e) => updateAuto(col.id, { tag: e.target.value })}
                          placeholder="tag-name"
                          className="px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] flex-1 disabled:opacity-50"
                        />
                      </ToggleRow>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={addColumn}
          className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1.5 rounded-[10px]"
        >
          <Plus className="w-3.5 h-3.5" /> Add column
        </button>
      </Card>

      <Card title="Live preview — what the agent sees post-call" hint="Changes above reflect here instantly">
        <div className="grid grid-cols-3 gap-2">
          {cols.slice(0, 9).map((col) => {
            const Icon = ICON_MAP[col.icon] ?? Sparkles;
            const a = col.automation;
            return (
              <div
                key={col.id}
                className="border-2 border-[#E5E7EB] rounded-2xl p-2.5 bg-white"
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${col.colour}1A`, color: col.colour }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[#9CA3AF]">
                      {col.position}.
                    </div>
                    <div className="text-[12px] font-semibold text-[#1A1A1A] truncate">
                      {col.name}
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {a.sendSms && <span className="text-[8px] text-[#1E9A80]">+SMS</span>}
                      {a.createTask && (
                        <span className="text-[8px] text-[#3B82F6]">+task</span>
                      )}
                      {a.retryDial && (
                        <span className="text-[8px] text-[#F59E0B]">
                          +retry {a.retryInHours}h
                        </span>
                      )}
                      {a.addTag && (
                        <span className="text-[8px] text-[#9CA3AF]">+tag</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function ToggleRow({
  on,
  onToggle,
  title,
  children,
}: {
  on: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onToggle(!on)}
        className={cn(
          'w-8 h-4 rounded-full relative transition-colors flex-shrink-0',
          on ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
            on ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
      <span className="text-[12px] font-medium text-[#1A1A1A] w-[140px] flex-shrink-0">
        {title}
      </span>
      <div className="flex-1 flex gap-1.5 items-center">{children}</div>
    </div>
  );
}

function Chip({ label, colour }: { label: string; colour: string }) {
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ background: `${colour}15`, color: colour }}
    >
      {label}
    </span>
  );
}

// ─── Templates ─────────────────────────────────────────────────────
function TemplatesTab() {
  return (
    <Card title="SMS templates" hint={`${MOCK_TEMPLATES.length} templates`}>
      <div className="space-y-2">
        {MOCK_TEMPLATES.map((t) => (
          <div key={t.id} className="border border-[#E5E7EB] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{t.name}</span>
              <div className="flex gap-1">
                {t.mergeFields.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] bg-[#F3F3EE] text-[#6B7280] px-1.5 py-0.5 rounded"
                  >
                    {`{${f}}`}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-[12px] text-[#6B7280] leading-snug">{t.bodyMd}</div>
          </div>
        ))}
        <button className="flex items-center gap-1 text-[12px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1.5 rounded-[10px]">
          <Plus className="w-3.5 h-3.5" /> New template
        </button>
      </div>
    </Card>
  );
}

// ─── Campaigns ─────────────────────────────────────────────────────
function CampaignsTab() {
  const { campaigns, patchCampaign } = useSmsV2();
  return (
    <Card title="Campaigns & lead distribution">
      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="border border-[#E5E7EB] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{c.name}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                {c.mode} · {c.parallelLines} lines
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6B7280] mb-2 items-center">
              <span>Pipeline: {ACTIVE_PIPELINE.name}</span>
              <span>{c.totalLeads} leads</span>
              <button
                onClick={() => patchCampaign(c.id, { aiCoachEnabled: !c.aiCoachEnabled })}
                className={cn(
                  'inline-flex items-center justify-self-start gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                  c.aiCoachEnabled
                    ? 'bg-[#ECFDF5] text-[#1E9A80] border-[#1E9A80]/30'
                    : 'bg-[#F3F3EE] text-[#9CA3AF] border-[#E5E7EB]'
                )}
              >
                <Bot className="w-3 h-3" />
                AI coach: {c.aiCoachEnabled ? 'ON' : 'OFF'}
              </button>
              <span className="inline-flex items-center gap-1">
                Auto-advance:{' '}
                <input
                  type="number"
                  value={c.autoAdvanceSeconds}
                  onChange={(e) =>
                    patchCampaign(c.id, {
                      autoAdvanceSeconds: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="inline-block w-12 px-1 py-0.5 text-[11px] border border-[#E5E7EB] rounded tabular-nums"
                />
                s
              </span>
            </div>
            <details className="border-t border-[#E5E7EB] pt-2 mt-2">
              <summary className="text-[11px] text-[#1E9A80] cursor-pointer">
                Edit call script (markdown)
              </summary>
              <textarea
                rows={4}
                value={c.scriptMd ?? `Hi {name}, this is {agent} from NFSTAY…`}
                onChange={(e) => patchCampaign(c.id, { scriptMd: e.target.value })}
                className="mt-1.5 w-full px-2 py-1.5 text-[11px] font-mono border border-[#E5E7EB] rounded-[8px]"
              />
            </details>
          </div>
        ))}
        <button className="flex items-center gap-1 text-[12px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1.5 rounded-[10px]">
          <Plus className="w-3.5 h-3.5" /> New campaign · CSV upload
        </button>
      </div>
    </Card>
  );
}

// ─── Agents — invite + delete + spend ──────────────────────────────
function AgentsTab() {
  const { agents, upsertAgent, removeAgent, pushToast } = useSmsV2();
  const [inviting, setInviting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invite, setInvite] = useState({
    email: '',
    password: '',
    name: '',
    extension: '',
    role: 'agent' as Agent['role'],
    limit: 10,
  });

  const remove = (id: string) => removeAgent(id);

  const randomPassword = () => {
    const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    for (const n of arr) out += charset[n % charset.length];
    return out;
  };

  const send = async () => {
    setErrorMsg(null);
    if (!invite.email || !invite.name) {
      setErrorMsg('Name and email are required.');
      return;
    }
    if (invite.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (
        supabase.functions as unknown as CreateAgentInvoke
      ).invoke('wk-create-agent', {
        body: {
          email: invite.email.trim().toLowerCase(),
          password: invite.password,
          name: invite.name.trim(),
          extension: invite.extension.trim() || null,
          role: invite.role,
          daily_limit_pence: Math.max(0, Math.floor(invite.limit * 100)),
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }
      if (data?.error) {
        setErrorMsg(data.error);
        setSubmitting(false);
        return;
      }
      // Reflect locally so the table updates without a reload
      upsertAgent({
        id: data?.user_id ?? `a-new-${Date.now()}`,
        name: invite.name,
        email: invite.email,
        extension: data?.extension ?? invite.extension ?? '',
        role: invite.role,
        status: 'offline',
        callsToday: 0,
        answeredToday: 0,
        avgDurationSec: 0,
        spendPence: 0,
        limitPence: data?.daily_limit_pence ?? invite.limit * 100,
        isAdmin: invite.role === 'admin',
      });
      pushToast(`Agent created — share login with ${invite.email}`, 'success');
      setInvite({ email: '', password: '', name: '', extension: '', role: 'agent', limit: 10 });
      setInviting(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card title="Agents & spend limits" hint="Edit limit = instant effect">
        <table className="w-full text-[13px]">
          <thead className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Role</th>
              <th className="text-left py-2">Ext.</th>
              <th className="text-right py-2">Spend</th>
              <th className="text-right py-2">Limit (£)</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="py-2 font-semibold text-[#1A1A1A]">{a.name}</td>
                <td className="py-2 text-[#6B7280] capitalize">{a.role}</td>
                <td className="py-2 text-[#6B7280] tabular-nums">{a.extension}</td>
                <td className="py-2 text-right tabular-nums">{formatPence(a.spendPence)}</td>
                <td className="py-2 text-right">
                  <input
                    defaultValue={a.isAdmin ? '∞' : (a.limitPence / 100).toFixed(0)}
                    className="w-16 px-2 py-1 text-right tabular-nums border border-[#E5E7EB] rounded-[8px]"
                  />
                </td>
                <td className="py-2 text-right">
                  {a.isAdmin ? (
                    <span className="text-[10px] text-[#9CA3AF]">protected</span>
                  ) : (
                    <button
                      onClick={() => remove(a.id)}
                      className="text-[#9CA3AF] hover:text-[#EF4444] p-1.5 rounded"
                      title="Remove agent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!inviting && (
          <button
            onClick={() => setInviting(true)}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1E9A80] hover:bg-[#ECFDF5] px-3 py-1.5 rounded-[10px]"
          >
            <Plus className="w-3.5 h-3.5" /> Invite agent
          </button>
        )}

        {inviting && (
          <div className="mt-3 border border-[#E5E7EB] rounded-xl p-3 bg-[#F3F3EE]/40 space-y-2">
            <div className="text-[12px] font-semibold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Create agent — they sign in with this email + password
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Full name"
                value={invite.name}
                onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                className="px-2 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[8px]"
              />
              <input
                placeholder="email@nfstay.com"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                className="px-2 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[8px]"
              />
              <div className="col-span-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <Key className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password (≥ 8 chars)"
                    value={invite.password}
                    onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                    className="w-full pl-7 pr-8 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[8px] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A]"
                    title={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const pw = randomPassword();
                    setInvite((s) => ({ ...s, password: pw }));
                    setShowPw(true);
                  }}
                  className="text-[11px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1.5 rounded-[8px] whitespace-nowrap"
                  title="Generate a strong password"
                >
                  Generate
                </button>
              </div>
              <input
                placeholder="Extension (e.g. 106)"
                value={invite.extension}
                onChange={(e) => setInvite({ ...invite, extension: e.target.value })}
                className="px-2 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[8px] tabular-nums"
              />
              <select
                value={invite.role}
                onChange={(e) =>
                  setInvite({ ...invite, role: e.target.value as Agent['role'] })
                }
                className="px-2 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[8px] bg-white"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin (no spend cap)</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-[11px] text-[#6B7280]">Daily spend cap £</span>
                <input
                  type="number"
                  value={invite.limit}
                  onChange={(e) =>
                    setInvite({ ...invite, limit: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-20 px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] tabular-nums"
                />
              </div>
            </div>
            {errorMsg && (
              <div className="text-[11px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded px-2 py-1.5">
                {errorMsg}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  setInviting(false);
                  setErrorMsg(null);
                }}
                className="text-[11px] text-[#6B7280] hover:text-[#1A1A1A] px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => void send()}
                disabled={submitting}
                className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[#1E9A80]/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating…' : 'Create agent'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

// ─── Numbers — Twilio connection + per-number toggles ─────────────
function NumbersTab() {
  const { state, loading, busy, error, connect, disconnect, sync, toggleNumber } =
    useTwilioAccount();
  const [sid, setSid] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onConnect = async () => {
    setLocalError(null);
    if (!sid.trim().startsWith('AC')) {
      setLocalError('Account SID must start with "AC".');
      return;
    }
    if (token.trim().length < 16) {
      setLocalError('Auth token looks too short.');
      return;
    }
    const ok = await connect(sid.trim(), token.trim());
    if (ok) {
      setSid('');
      setToken('');
    }
  };

  const onDisconnect = async () => {
    if (!confirm('Disconnect Twilio? Numbers stay in the workspace but calls will fail.'))
      return;
    await disconnect();
  };

  if (loading) {
    return (
      <Card title="Twilio account">
        <div className="text-[12px] text-[#6B7280] py-4">Loading…</div>
      </Card>
    );
  }

  // ---------- Disconnected state ---------------------------------------
  if (!state.connected) {
    return (
      <Card
        title="Twilio account"
        hint="Paste your Account SID and Auth Token to connect"
      >
        <div className="space-y-3 max-w-[560px]">
          <div>
            <div className="text-[12px] font-medium text-[#1A1A1A] mb-1">Account SID</div>
            <input
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 text-[13px] font-mono border border-[#E5E7EB] rounded-[10px] bg-white"
            />
          </div>
          <div>
            <div className="text-[12px] font-medium text-[#1A1A1A] mb-1">Auth Token</div>
            <div className="relative">
              <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Auth token from Twilio console"
                className="w-full pl-9 pr-9 py-2 text-[13px] font-mono border border-[#E5E7EB] rounded-[10px] bg-white"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A]"
                title={showToken ? 'Hide' : 'Show'}
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {(localError || error) && (
            <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">
              {localError ?? error}
            </div>
          )}
          <button
            onClick={() => void onConnect()}
            disabled={busy === 'connect'}
            className="bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy === 'connect' ? 'Connecting…' : 'Connect Twilio account'}
          </button>
        </div>
      </Card>
    );
  }

  // ---------- Connected state ------------------------------------------
  const sidMasked = state.account_sid
    ? `${state.account_sid.slice(0, 6)}…${state.account_sid.slice(-6)}`
    : '';

  return (
    <>
      <Card title="Twilio account" hint="Connected">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1E9A80]" />
              <span className="text-[13px] font-semibold text-[#1A1A1A]">Twilio connected</span>
            </div>
            {state.friendly_name && (
              <div className="text-[12px] text-[#6B7280]">{state.friendly_name}</div>
            )}
            <div className="text-[11px] text-[#6B7280] font-mono">SID {sidMasked}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void sync()}
              disabled={busy === 'sync'}
              className="text-[12px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px] disabled:opacity-60"
            >
              {busy === 'sync' ? 'Syncing…' : 'Sync numbers'}
            </button>
            <button
              onClick={() => void onDisconnect()}
              disabled={busy === 'disconnect'}
              className="text-[12px] font-medium border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2] px-3 py-1.5 rounded-[10px] disabled:opacity-60"
            >
              {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect Twilio account'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </Card>

      <Card
        title="Enable your numbers below"
        hint="Toggle voice on/off — only enabled numbers can make outbound calls"
      >
        {state.numbers.length === 0 ? (
          <div className="text-[12px] text-[#6B7280] py-4">
            No numbers found. Buy a number in the Twilio console then click Sync.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {state.numbers.map((n) => (
              <div key={n.id} className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <div className="font-mono text-[14px] tabular-nums text-[#1A1A1A]">
                    {n.e164}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                    {[n.sms_enabled ? 'SMS' : null, n.recording_enabled ? 'recording' : null]
                      .filter(Boolean)
                      .join(' · ') || 'voice only'}
                    {' · '}max {n.max_calls_per_minute}/min
                  </div>
                </div>
                <button
                  onClick={() => void toggleNumber(n.e164, !n.voice_enabled)}
                  className="flex items-center gap-2 group"
                  title={n.voice_enabled ? 'Click to disable voice' : 'Click to enable voice'}
                >
                  <span
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors',
                      n.voice_enabled ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                        n.voice_enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      'text-[12px] font-medium tabular-nums',
                      n.voice_enabled ? 'text-[#1E9A80]' : 'text-[#9CA3AF]'
                    )}
                  >
                    {n.voice_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

// ─── AI — API key + model dropdown ─────────────────────────────────
function AITab() {
  const ks = useKillSwitch();
  const { settings, loading, saving, error, saved, setField, save } = useAiSettings();
  const [showKey, setShowKey] = useState(false);

  return (
    <>
      <Card title="OpenAI API key & model">
        <div className="space-y-3">
          <div>
            <Label>
              <span className="inline-flex items-center gap-1">
                <Key className="w-3 h-3" /> OpenAI API key (server-side only)
              </span>
            </Label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.openai_api_key}
                  onChange={(e) => setField('openai_api_key', e.target.value)}
                  placeholder={loading ? 'Loading…' : 'sk-proj-…'}
                  disabled={loading}
                  className="w-full px-3 py-2 pr-9 text-[13px] font-mono border border-[#E5E7EB] rounded-[10px] disabled:bg-[#F9FAFB]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A1A]"
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <button
                onClick={() => void save()}
                disabled={saving || loading}
                className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
              >
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1">
              Stored in <code className="bg-[#F3F3EE] px-1 rounded">wk_ai_settings</code> (admin-RLS).
              Read server-side only by edge functions; never sent to the browser bundle.
            </div>
            {error && (
              <div className="text-[10px] text-[#EF4444] mt-1">⚠ {error}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Model — post-call analysis (Whisper + summary)</Label>
              <select
                value={settings.postcall_model}
                onChange={(e) => setField('postcall_model', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
              >
                <optgroup label="GPT-5 family (newest)">
                  <option value="gpt-5.4">gpt-5.4 (most accurate)</option>
                  <option value="gpt-5.4-mini">gpt-5.4-mini (recommended · smart + fast)</option>
                  <option value="gpt-5.4-nano">gpt-5.4-nano (fastest)</option>
                </optgroup>
                <optgroup label="GPT-4.1 family">
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                </optgroup>
                <optgroup label="GPT-4o family (legacy)">
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </optgroup>
                <optgroup label="Reasoning">
                  <option value="o1-mini">o1-mini</option>
                </optgroup>
              </select>
            </div>
            <div>
              <Label>Model — live coach (chat completions, per-utterance)</Label>
              <select
                value={settings.live_coach_model}
                onChange={(e) => setField('live_coach_model', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
              >
                <optgroup label="GPT-5 family (newest)">
                  <option value="gpt-5.4">gpt-5.4 (most accurate · slower)</option>
                  <option value="gpt-5.4-mini">gpt-5.4-mini (recommended · smart + fast)</option>
                  <option value="gpt-5.4-nano">gpt-5.4-nano (fastest · less smart)</option>
                </optgroup>
                <optgroup label="GPT-4.1 family">
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                </optgroup>
                <optgroup label="GPT-4o family (legacy)">
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </optgroup>
              </select>
              <div className="text-[10px] text-[#9CA3AF] mt-1">
                Used by <code className="bg-[#F3F3EE] px-1 rounded">wk-voice-transcription</code> per caller utterance. Hot-swap takes effect on the next coach card (no redeploy).
              </div>
            </div>
          </div>

          <div>
            <Label>Whisper model (post-call transcription)</Label>
            <select
              value={settings.whisper_model}
              onChange={(e) => setField('whisper_model', e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
            >
              <option value="whisper-1">whisper-1 (default)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="AI coach master switch">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => ks.toggle('aiCoach')}
              className={cn(
                'px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-colors',
                !ks.aiCoach
                  ? 'bg-[#1E9A80] text-white'
                  : 'bg-[#F3F3EE] text-[#6B7280]'
              )}
            >
              {!ks.aiCoach ? 'AI Coach: ON' : 'AI Coach: OFF (kill switch active)'}
            </button>
            <span className="text-[11px] text-[#6B7280]">
              Master switch — disables coach across all campaigns immediately
            </span>
          </div>
          <div className="flex items-center gap-4 pt-2 border-t border-[#E5E7EB]">
            <label className="flex items-center gap-2 text-[12px] text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={settings.ai_enabled}
                onChange={(e) => setField('ai_enabled', e.target.checked)}
              />
              ai_enabled (post-call summaries on/off)
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={settings.live_coach_enabled}
                onChange={(e) => setField('live_coach_enabled', e.target.checked)}
              />
              live_coach_enabled (real-time WebSocket on/off)
            </label>
          </div>
        </div>
      </Card>

      <Card
        title="Live coach — three-layer prompt"
        hint="Style + Script + Knowledge Base (Hugo 2026-04-29). See docs/runbooks/COACH_PROMPT_LAYERS.md."
      >
        <div className="space-y-3">
          <div>
            <Label>Layer 1 — Style / voice</Label>
            <div className="text-[10px] text-[#9CA3AF] mb-1">
              How the rep sounds. UK English, plain, commercial. Bans on
              acting notes, multiple variants, American slop. Persisted
              to <code className="bg-[#F3F3EE] px-1 rounded">wk_ai_settings.coach_style_prompt</code>.
            </div>
            <textarea
              value={settings.coach_style_prompt}
              onChange={(e) => setField('coach_style_prompt', e.target.value)}
              rows={8}
              placeholder="Leave empty to use the canonical default from the edge function."
              className="w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2"
            />
          </div>
          <div>
            <Label>Layer 2 — Script / call logic</Label>
            <div className="text-[10px] text-[#9CA3AF] mb-1">
              Call stages, open-ended default, earned-close gate,
              retrieval instruction (point the model at the KB for
              factual questions). Persisted to <code className="bg-[#F3F3EE] px-1 rounded">wk_ai_settings.coach_script_prompt</code>.
            </div>
            <textarea
              value={settings.coach_script_prompt}
              onChange={(e) => setField('coach_script_prompt', e.target.value)}
              rows={12}
              placeholder="Leave empty to use the canonical default from the edge function."
              className="w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2"
            />
          </div>
          <div className="text-[11px] text-[#6B7280] border border-dashed border-[#E5E7EB] rounded-lg p-2 bg-[#F9FAFB]">
            <span className="font-semibold text-[#1A1A1A]">Layer 3 — Knowledge base</span> lives in <code className="bg-[#F3F3EE] px-1 rounded">wk_coach_facts</code> and is edited in the new <span className="font-semibold">Knowledge base</span> tab on the left.
          </div>
          <details className="border border-[#E5E7EB] rounded-xl p-3">
            <summary className="text-[12px] font-semibold text-[#6B7280] cursor-pointer">
              Legacy single-prompt (deprecated) — used only as fallback if both new layers are empty
            </summary>
            <div className="mt-2">
              <textarea
                value={settings.live_coach_system_prompt}
                onChange={(e) => setField('live_coach_system_prompt', e.target.value)}
                rows={6}
                className="w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2 opacity-70"
              />
            </div>
          </details>
          <div>
            <Label>Post-call analysis prompt</Label>
            <textarea
              value={settings.postcall_system_prompt}
              onChange={(e) => setField('postcall_system_prompt', e.target.value)}
              rows={6}
              className="w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2"
            />
          </div>
          <details className="border border-[#E5E7EB] rounded-xl p-3">
            <summary className="text-[12px] font-semibold text-[#6B7280] cursor-pointer">
              Reference prompts (read-only — copy into the editors above)
            </summary>
            <div className="mt-2 space-y-2">
              {COACH_PROMPTS.map((p) => (
                <div key={p.id} className="border border-[#E5E7EB] rounded-lg p-2">
                  <div className="text-[12px] font-semibold mb-1">{p.name}</div>
                  <pre className="text-[10px] text-[#6B7280] whitespace-pre-wrap font-mono">{p.body}</pre>
                </div>
              ))}
            </div>
          </details>
        </div>
      </Card>

      <AgentScriptCard />
      <CallScriptCard />
    </>
  );
}

// ─── My script (agent's own — overrides the default) ──────────────
// Hugo 2026-04-30: each agent edits their own script. The live-call
// pane resolves: own > default > hardcoded fallback.
function AgentScriptCard() {
  const { script, loading, saving, saved, error, setField, save, resetToDefault } =
    useAgentScript();
  return (
    <Card
      title="My script"
      hint={
        script.source === 'own'
          ? 'Your personal script (overrides the default). Markdown.'
          : script.source === 'default'
            ? 'Currently showing the default. Edit + save to create your own copy.'
            : 'No script yet. Edit + save to create one.'
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full font-semibold',
              script.source === 'own'
                ? 'bg-[#1E9A80]/10 text-[#1E9A80]'
                : 'bg-[#F3F3EE] text-[#6B7280]'
            )}
          >
            {script.source === 'own'
              ? '● Your version'
              : script.source === 'default'
                ? '○ Default (read-only preview)'
                : '○ Empty'}
          </span>
          {script.source === 'own' && (
            <button
              onClick={() => void resetToDefault()}
              disabled={saving}
              className="text-[10px] text-[#6B7280] underline hover:text-[#EF4444] disabled:opacity-50"
            >
              Reset to default
            </button>
          )}
        </div>
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" /> Script name
            </span>
          </Label>
          <input
            type="text"
            value={script.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] disabled:bg-[#F9FAFB]"
          />
        </div>
        <div>
          <Label>Body (Markdown)</Label>
          <textarea
            value={script.body_md}
            onChange={(e) => setField('body_md', e.target.value)}
            disabled={loading}
            rows={18}
            placeholder={loading ? 'Loading…' : '# Open\n- "Hi {{first_name}}, this is {{agent_first_name}}…"'}
            className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px] disabled:bg-[#F9FAFB]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void save()}
            disabled={saving || loading}
            className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save my script'}
          </button>
          <span className="text-[10px] text-[#9CA3AF]">
            Stored in <code className="bg-[#F3F3EE] px-1 rounded">wk_call_scripts</code> with{' '}
            <code className="bg-[#F3F3EE] px-1 rounded">owner_agent_id = your user id</code>.
            Live-call screen reads your own script first, falls back to default.
          </span>
        </div>
        {error && <div className="text-[10px] text-[#EF4444]">⚠ {error}</div>}
      </div>
    </Card>
  );
}

// ─── Default call script (admin) — fallback for everyone ──────────
function CallScriptCard() {
  const { script, loading, saving, saved, error, setField, save } = useDefaultCallScript();
  return (
    <Card
      title="Default call script (admin)"
      hint="Fallback for any agent who hasn't saved their own. Markdown."
    >
      <div className="space-y-3">
        <div>
          <Label>
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" /> Script name
            </span>
          </Label>
          <input
            type="text"
            value={script.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] disabled:bg-[#F9FAFB]"
          />
        </div>
        <div>
          <Label>Body (Markdown)</Label>
          <textarea
            value={script.body_md}
            onChange={(e) => setField('body_md', e.target.value)}
            disabled={loading}
            rows={18}
            placeholder={loading ? 'Loading…' : '# Open\n- "Hi {{first_name}}, this is {{agent_first_name}}…"'}
            className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px] disabled:bg-[#F9FAFB]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void save()}
            disabled={saving || loading}
            className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save script'}
          </button>
          <span className="text-[10px] text-[#9CA3AF]">
            Stored in <code className="bg-[#F3F3EE] px-1 rounded">wk_call_scripts</code> (is_default = true).
            Live-call CallScriptPane reads this row.
          </span>
        </div>
        {error && <div className="text-[10px] text-[#EF4444]">⚠ {error}</div>}
      </div>
    </Card>
  );
}

// ─── Glossary tab — wk_terminologies CRUD (admin) ─────────────────
function GlossaryTab() {
  const { items, loading, error, add, patch, remove } = useTerminologies();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    term: string;
    short_gist: string;
    definition_md: string;
  }>({ term: '', short_gist: '', definition_md: '' });
  const [actionError, setActionError] = useState<string | null>(null);

  const startEdit = (t: Terminology) => {
    setEditingId(t.id);
    setDraft({
      term: t.term,
      short_gist: t.short_gist ?? '',
      definition_md: t.definition_md,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setDraft({ term: '', short_gist: '', definition_md: '' });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft({ term: '', short_gist: '', definition_md: '' });
    setActionError(null);
  };

  const save = async () => {
    setActionError(null);
    try {
      if (editingId === 'new') {
        const nextOrder = (items[items.length - 1]?.sort_order ?? 0) + 10;
        await add({
          term: draft.term.trim(),
          short_gist: draft.short_gist.trim() || null,
          definition_md: draft.definition_md.trim(),
          sort_order: nextOrder,
          is_active: true,
        });
      } else if (editingId) {
        await patch(editingId, {
          term: draft.term.trim(),
          short_gist: draft.short_gist.trim() || null,
          definition_md: draft.definition_md.trim(),
        });
      }
      cancel();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'save failed');
    }
  };

  const toggleActive = async (t: Terminology) => {
    setActionError(null);
    try {
      await patch(t.id, { is_active: !t.is_active });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'update failed');
    }
  };

  const move = async (t: Terminology, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === t.id);
    const swapWith = items[idx + dir];
    if (!swapWith) return;
    setActionError(null);
    try {
      await Promise.all([
        patch(t.id, { sort_order: swapWith.sort_order }),
        patch(swapWith.id, { sort_order: t.sort_order }),
      ]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'reorder failed');
    }
  };

  const del = async (t: Terminology) => {
    if (!confirm(`Delete "${t.term}"? This is permanent.`)) return;
    setActionError(null);
    try {
      await remove(t.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'delete failed');
    }
  };

  return (
    <>
      <Card
        title="Glossary"
        hint="Terms shown on the live-call screen (col 4). Realtime — agents see edits live."
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] text-[#6B7280]">
            {loading ? 'Loading…' : `${items.length} terms`}
          </div>
          <button
            onClick={startNew}
            disabled={editingId !== null}
            className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" /> Add term
          </button>
        </div>

        {(error || actionError) && (
          <div className="text-[11px] text-[#EF4444] mb-2">
            ⚠ {actionError ?? error}
          </div>
        )}

        {editingId === 'new' && (
          <GlossaryEditor
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
          />
        )}

        <div className="space-y-2">
          {items.map((t, i) => (
            <div
              key={t.id}
              className={cn(
                'border rounded-xl p-3 transition-colors',
                t.is_active
                  ? 'border-[#E5E7EB] bg-white'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-70'
              )}
            >
              {editingId === t.id ? (
                <GlossaryEditor
                  draft={draft}
                  setDraft={setDraft}
                  onSave={save}
                  onCancel={cancel}
                />
              ) : (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button
                      onClick={() => void move(t, -1)}
                      disabled={i === 0}
                      className="text-[#9CA3AF] hover:text-[#1A1A1A] disabled:opacity-30 text-[10px]"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => void move(t, 1)}
                      disabled={i === items.length - 1}
                      className="text-[#9CA3AF] hover:text-[#1A1A1A] disabled:opacity-30 text-[10px]"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[14px] font-semibold text-[#1A1A1A]">
                        {t.term}
                      </div>
                      {!t.is_active && (
                        <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">
                          inactive
                        </span>
                      )}
                    </div>
                    {t.short_gist && (
                      <div className="text-[12px] text-[#6B7280] mt-0.5">
                        {t.short_gist}
                      </div>
                    )}
                    <details className="mt-1.5">
                      <summary className="text-[11px] text-[#1E9A80] cursor-pointer hover:underline">
                        Show definition
                      </summary>
                      <pre className="mt-2 text-[11px] text-[#1A1A1A] whitespace-pre-wrap font-mono bg-[#F3F3EE] rounded p-2 leading-relaxed">
                        {t.definition_md}
                      </pre>
                    </details>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="text-[11px] px-2 py-1 rounded-md border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#1A1A1A]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void toggleActive(t)}
                      className="text-[11px] px-2 py-1 rounded-md border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#6B7280]"
                    >
                      {t.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => void del(t)}
                      className="text-[11px] px-2 py-1 rounded-md text-[#EF4444] hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && items.length === 0 && editingId !== 'new' && (
            <div className="text-[12px] text-[#9CA3AF] text-center py-6">
              No glossary terms yet. Click "Add term" to create the first one.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function GlossaryEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: { term: string; short_gist: string; definition_md: string };
  setDraft: (d: { term: string; short_gist: string; definition_md: string }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (k: keyof typeof draft, v: string) => setDraft({ ...draft, [k]: v });
  const canSave = draft.term.trim().length > 0 && draft.definition_md.trim().length > 0;
  return (
    <div className="border border-[#1E9A80]/40 bg-[#ECFDF5] rounded-xl p-3 mb-3 space-y-2">
      <div>
        <Label>Term</Label>
        <input
          type="text"
          value={draft.term}
          onChange={(e) => set('term', e.target.value)}
          placeholder="e.g. Gross yield"
          className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
        />
      </div>
      <div>
        <Label>Short gist (one line, shown collapsed)</Label>
        <input
          type="text"
          value={draft.short_gist}
          onChange={(e) => set('short_gist', e.target.value)}
          placeholder="e.g. Annual rental income / property value, before costs."
          className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
        />
      </div>
      <div>
        <Label>Definition (Markdown)</Label>
        <textarea
          value={draft.definition_md}
          onChange={(e) => set('definition_md', e.target.value)}
          rows={5}
          placeholder="**Term** — full definition. Use **bold** + bullets if needed."
          className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px] bg-white"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!canSave}
          className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-[12px] text-[#6B7280] px-3 py-1.5 rounded-[10px] hover:bg-[#F3F3EE]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Knowledge base — wk_coach_facts CRUD (Hugo 2026-04-29) ──────
//
// Three-layer prompt system:
//   - Layer 1 (Style):   wk_ai_settings.coach_style_prompt    (AI tab)
//   - Layer 2 (Script):  wk_ai_settings.coach_script_prompt   (AI tab)
//   - Layer 3 (Facts):   wk_coach_facts                       (this tab)
//
// Facts the model may quote when the caller asks a direct factual
// question. The edge fn matches keywords against the caller's last
// utterance and passes the matches as a "POSSIBLY RELEVANT FACTS" hint.
// See docs/runbooks/COACH_PROMPT_LAYERS.md.
function KnowledgeBaseTab() {
  const { items, loading, error, add, patch, remove } = useCoachFacts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    key: string;
    label: string;
    value: string;
    keywordsRaw: string;
  }>({ key: '', label: '', value: '', keywordsRaw: '' });
  const [actionError, setActionError] = useState<string | null>(null);

  const startEdit = (f: CoachFact) => {
    setEditingId(f.id);
    setDraft({
      key: f.key,
      label: f.label,
      value: f.value,
      keywordsRaw: f.keywords.join(', '),
    });
  };

  const startNew = () => {
    setEditingId('new');
    setDraft({ key: '', label: '', value: '', keywordsRaw: '' });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft({ key: '', label: '', value: '', keywordsRaw: '' });
    setActionError(null);
  };

  const parseKeywords = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const save = async () => {
    setActionError(null);
    try {
      const keywords = parseKeywords(draft.keywordsRaw);
      if (editingId === 'new') {
        const nextOrder = (items[items.length - 1]?.sort_order ?? 0) + 10;
        await add({
          key: draft.key.trim(),
          label: draft.label.trim(),
          value: draft.value.trim(),
          keywords,
          sort_order: nextOrder,
          is_active: true,
        });
      } else if (editingId) {
        await patch(editingId, {
          key: draft.key.trim(),
          label: draft.label.trim(),
          value: draft.value.trim(),
          keywords,
        });
      }
      cancel();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'save failed');
    }
  };

  const toggleActive = async (f: CoachFact) => {
    setActionError(null);
    try {
      await patch(f.id, { is_active: !f.is_active });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'update failed');
    }
  };

  const move = async (f: CoachFact, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === f.id);
    const swapWith = items[idx + dir];
    if (!swapWith) return;
    setActionError(null);
    try {
      await Promise.all([
        patch(f.id, { sort_order: swapWith.sort_order }),
        patch(swapWith.id, { sort_order: f.sort_order }),
      ]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'reorder failed');
    }
  };

  const del = async (f: CoachFact) => {
    if (!confirm(`Delete fact "${f.key}"? This is permanent.`)) return;
    setActionError(null);
    try {
      await remove(f.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'delete failed');
    }
  };

  return (
    <>
      <Card
        title="Knowledge base"
        hint="Facts the AI may quote during a call. Edits propagate live."
      >
        <div className="text-[12px] text-[#6B7280] leading-snug mb-3">
          The coach matches each fact's <code className="bg-[#F3F3EE] px-1 rounded">keywords</code> against the caller's last utterance. Matches get highlighted to the model as <span className="font-semibold">POSSIBLY RELEVANT FACTS</span>. The full table is also passed in every call as the system-message KB. The model must answer factual questions ONLY from this table — it's instructed not to guess.
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] text-[#6B7280]">
            {loading ? 'Loading…' : `${items.length} facts`}
          </div>
          <button
            onClick={startNew}
            disabled={editingId !== null}
            className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-60"
          >
            <Plus className="w-3.5 h-3.5" /> Add fact
          </button>
        </div>

        {(error || actionError) && (
          <div className="text-[11px] text-[#EF4444] mb-2">
            ⚠ {actionError ?? error}
          </div>
        )}

        {editingId === 'new' && (
          <KnowledgeBaseEditor
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
          />
        )}

        <div className="space-y-2">
          {items.map((f, i) => (
            <div
              key={f.id}
              className={cn(
                'border rounded-xl p-3 transition-colors',
                f.is_active
                  ? 'border-[#E5E7EB] bg-white'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-70'
              )}
            >
              {editingId === f.id ? (
                <KnowledgeBaseEditor
                  draft={draft}
                  setDraft={setDraft}
                  onSave={save}
                  onCancel={cancel}
                />
              ) : (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button
                      onClick={() => void move(f, -1)}
                      disabled={i === 0}
                      className="text-[#9CA3AF] hover:text-[#1A1A1A] disabled:opacity-30 text-[10px]"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => void move(f, 1)}
                      disabled={i === items.length - 1}
                      className="text-[#9CA3AF] hover:text-[#1A1A1A] disabled:opacity-30 text-[10px]"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] bg-[#F3F3EE] text-[#525252] px-1.5 py-0.5 rounded font-mono">
                        {f.key}
                      </code>
                      <div className="text-[13px] font-semibold text-[#1A1A1A]">
                        {f.label}
                      </div>
                      {!f.is_active && (
                        <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">
                          inactive
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#1A1A1A] mt-1 leading-snug">
                      {f.value}
                    </div>
                    {f.keywords.length > 0 && (
                      <div className="text-[10px] text-[#6B7280] mt-1.5">
                        <span className="uppercase tracking-wide font-semibold mr-1">
                          keywords:
                        </span>
                        {f.keywords.join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(f)}
                      className="text-[11px] px-2 py-1 rounded-md border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#1A1A1A]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void toggleActive(f)}
                      className="text-[11px] px-2 py-1 rounded-md border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#6B7280]"
                    >
                      {f.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => void del(f)}
                      className="text-[11px] px-2 py-1 rounded-md text-[#EF4444] hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && items.length === 0 && editingId !== 'new' && (
            <div className="text-[12px] text-[#9CA3AF] text-center py-6">
              No facts yet. Click "Add fact" to seed the knowledge base.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function KnowledgeBaseEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: { key: string; label: string; value: string; keywordsRaw: string };
  setDraft: (d: { key: string; label: string; value: string; keywordsRaw: string }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (k: keyof typeof draft, v: string) => setDraft({ ...draft, [k]: v });
  const canSave =
    draft.key.trim().length > 0 &&
    draft.label.trim().length > 0 &&
    draft.value.trim().length > 0;
  return (
    <div className="border border-[#1E9A80]/40 bg-[#ECFDF5] rounded-xl p-3 mb-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Key (snake_case identifier)</Label>
          <input
            type="text"
            value={draft.key}
            onChange={(e) => set('key', e.target.value)}
            placeholder="e.g. partner_count"
            className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px] bg-white"
          />
        </div>
        <div>
          <Label>Label (human-readable)</Label>
          <input
            type="text"
            value={draft.label}
            onChange={(e) => set('label', e.target.value)}
            placeholder="e.g. Partners on the deal"
            className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
          />
        </div>
      </div>
      <div>
        <Label>Value (the answer the AI should quote)</Label>
        <textarea
          value={draft.value}
          onChange={(e) => set('value', e.target.value)}
          rows={3}
          placeholder="e.g. About 14 partners already on this deal."
          className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
        />
      </div>
      <div>
        <Label>Keywords (comma-separated trigger phrases)</Label>
        <input
          type="text"
          value={draft.keywordsRaw}
          onChange={(e) => set('keywordsRaw', e.target.value)}
          placeholder="how many people, how many partners, partner count"
          className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
        />
        <div className="text-[10px] text-[#9CA3AF] mt-1">
          Substring match against the caller's last utterance (case-insensitive). Each phrase comma-separated.
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!canSave}
          className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-[12px] text-[#6B7280] px-3 py-1.5 rounded-[10px] hover:bg-[#F3F3EE]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Pacing ────────────────────────────────────────────────────────
function PacingTab() {
  return (
    <>
      <Card title="Global limits">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max parallel lines per agent">
            <input
              defaultValue={3}
              className="w-full px-2 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[10px] tabular-nums"
            />
          </Field>
          <Field label="Retry attempts cap per lead">
            <input
              defaultValue={3}
              className="w-full px-2 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[10px] tabular-nums"
            />
          </Field>
        </div>
      </Card>
      <Card title="Block list" hint="Numbers we never dial">
        <textarea
          rows={4}
          defaultValue={'+44 7000 000000\n+44 7000 000001'}
          className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px]"
        />
      </Card>
    </>
  );
}

// ─── Kill switches ─────────────────────────────────────────────────
function KillTab() {
  const ks = useKillSwitch();
  return (
    <>
      <Card title="Active kill switches">
        <div className="space-y-2">
          {(['allDialers', 'aiCoach', 'outbound'] as const).map((k) => (
            <button
              key={k}
              onClick={() => ks.toggle(k)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2',
                ks[k]
                  ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
                  : 'border-[#E5E7EB] bg-white text-[#1A1A1A] hover:border-[#EF4444]/40'
              )}
            >
              <span className="text-[13px] font-semibold capitalize">
                {k.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="text-[11px]">{ks[k] ? 'ACTIVE' : 'inactive'}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Audit log" hint="Last 5 events">
        <div className="space-y-1.5 text-[12px]">
          {[
            { who: 'Hugo', what: 'Set Tom limit £10 → £25', when: '2m ago' },
            { who: 'Hugo', what: 'Pause All Dialers → ON', when: '8m ago' },
            { who: 'Tom', what: 'Updated SMS template "Thanks"', when: '14m ago' },
            { who: 'Hugo', what: 'Disabled AI coach (Re-engage)', when: '38m ago' },
            { who: 'System', what: 'Daily spend reset', when: '7h ago' },
          ].map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1.5 border-b border-[#E5E7EB] last:border-0"
            >
              <span className="text-[#1A1A1A] font-semibold w-12">{e.who}</span>
              <span className="text-[#6B7280] flex-1">{e.what}</span>
              <span className="text-[10px] text-[#9CA3AF] tabular-nums">{e.when}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
      {children}
    </div>
  );
}
