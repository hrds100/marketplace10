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
import { useDialerCampaigns } from '../hooks/useDialerCampaigns';
import { useDefaultCallScript } from '../hooks/useDefaultCallScript';
import { useAgentScript } from '../hooks/useAgentScript';
import { useSmsTemplates, type SmsTemplate } from '../hooks/useSmsTemplates';
import { useTerminologies, type Terminology } from '../hooks/useTerminologies';
import { useCoachFacts, type CoachFact } from '../hooks/useCoachFacts';
import { useCampaignAgents } from '../hooks/useCampaignAgents';
import { useCampaignNumbers } from '../hooks/useCampaignNumbers';
import { useAgentsToday } from '../hooks/useAgentsToday';
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
  { id: 'kb', label: 'Coach facts', icon: Brain },
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

// PR 56 (Hugo 2026-04-27): the AI / KB / Glossary tabs are scoped to
// either workspace defaults or a specific campaign's overrides.
// Campaigns / Agents / Numbers / Pipelines / Templates remain
// workspace-level. We pass selectedCampaignId only to the cascade-
// aware tabs.
const CAMPAIGN_SCOPED_TABS = new Set(['ai', 'kb', 'glossary']);

// PR 56: a tiny inline pill that reflects whether a field is
// inheriting a workspace default ('inherited') or has a per-campaign
// override ('override'). When the user is in workspace mode the
// badge is hidden. When the user has overridden a field in campaign
// mode, the badge shows a "↺" reset action that clears the override.
function ScopeBadge({
  source,
  campaignId,
  onReset,
}: {
  source: 'workspace' | 'campaign' | undefined;
  campaignId: string | null;
  onReset?: () => void;
}) {
  if (!campaignId) return null;
  if (source === 'campaign') {
    return (
      <span className="inline-flex items-center gap-1 ml-2 text-[9px] uppercase font-bold tracking-wide text-[#1E9A80] bg-[#ECFDF5] px-1.5 py-0.5 rounded">
        override
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="hover:text-[#0F766E]"
            title="Clear override + fall back to workspace default"
          >
            ↺
          </button>
        )}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center ml-2 text-[9px] uppercase font-bold tracking-wide text-[#9CA3AF] bg-[#F3F3EE] px-1.5 py-0.5 rounded"
      title="Inherited from workspace default — edit to create a campaign override"
    >
      inherited
    </span>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('pipelines');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const showCampaignPicker = CAMPAIGN_SCOPED_TABS.has(tab);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Settings</h1>
          <p className="text-[13px] text-[#6B7280]">
            Nothing in the agent UI is hardcoded — everything below is editable here
          </p>
        </div>
        {showCampaignPicker && (
          <CampaignScopePicker
            value={selectedCampaignId}
            onChange={setSelectedCampaignId}
          />
        )}
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
          {tab === 'ai' && <AITab campaignId={selectedCampaignId} />}
          {tab === 'kb' && <KnowledgeBaseTab campaignId={selectedCampaignId} />}
          {tab === 'glossary' && <GlossaryTab campaignId={selectedCampaignId} />}
          {tab === 'pacing' && <PacingTab />}
          {tab === 'kill' && <KillTab />}
        </main>
      </div>
    </div>
  );
}

// PR 56: dropdown that lets the admin pick "Workspace defaults" or a
// specific campaign for the AI/KB/Glossary tabs. Reads campaigns from
// useDialerCampaigns so it shows whatever's in wk_dialer_campaigns.
function CampaignScopePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { campaigns, refetch } = useDialerCampaigns();
  const current = campaigns.find((c) => c.id === value);
  const [duplicating, setDuplicating] = useState(false);

  const onDuplicate = async () => {
    if (!current) return;
    const newName = window.prompt(
      `Duplicate "${current.name}" — what should the copy be called?`,
      `${current.name} (copy)`,
    );
    if (!newName?.trim()) return;
    setDuplicating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('wk_duplicate_campaign', {
        p_source_id: current.id,
        p_new_name: newName.trim(),
      });
      if (error) {
        window.alert(`Duplicate failed: ${error.message}`);
        return;
      }
      refetch();
      if (typeof data === 'string') onChange(data);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        Editing
      </span>
      <select
        value={value ?? '__workspace__'}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '__workspace__' ? null : v);
        }}
        className="bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/40 focus:border-[#1E9A80]"
        title="Switch between workspace defaults and a specific campaign override"
      >
        <option value="__workspace__">Workspace defaults</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {current && (
        <>
          <span className="text-[10px] font-medium text-[#1E9A80] bg-[#ECFDF5] px-1.5 py-0.5 rounded">
            campaign override
          </span>
          <button
            onClick={() => void onDuplicate()}
            disabled={duplicating}
            className="text-[12px] font-medium text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-3 py-1.5 rounded-[10px] disabled:opacity-60"
            title="Copy this campaign + its full bundle (AI / facts / glossary / agents / numbers)"
          >
            {duplicating ? 'Duplicating…' : '+ Duplicate'}
          </button>
        </>
      )}
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
  // PR 40 (Hugo 2026-04-27): "When you click toggle SMS, it overlaps
  // things." Three fixes:
  //   - Bigger track (40×20) + bigger knob (16×16) so the visual is
  //     more legible and matches the Numbers tab toggle (consistent
  //     across the app).
  //   - Knob centred via top calc so it never clips the track edge
  //     (was top-0.5 + h-3 inside h-4 = 1px clearance — fragile).
  //   - flex-wrap on the row so when the children content (template
  //     dropdown, task title, retry hours) is too wide for the
  //     remaining space, it wraps under the title instead of pushing
  //     the row's height + colliding with the column-detail border.
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onToggle(!on)}
        className={cn(
          'w-10 h-5 rounded-full relative transition-colors flex-shrink-0',
          on ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'
        )}
        aria-pressed={on}
      >
        <span
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
            on ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
      <span className="text-[12px] font-medium text-[#1A1A1A] w-[140px] flex-shrink-0">
        {title}
      </span>
      <div className="flex-1 flex gap-1.5 items-center min-w-[200px]">
        {children}
      </div>
    </div>
  );
}

function WebhookUrlRow({ label, path }: { label: string; path: string }) {
  // Use the build-time SUPABASE_URL so admins always see the right host.
  const projectRef = 'asazddtvjvmckouxcmmo';
  const url = `https://${projectRef}.supabase.co${path}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="py-2 border-b border-[#E5E7EB] last:border-0">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 text-[11px] font-mono bg-[#F3F3EE] px-2 py-1.5 rounded-[8px] truncate">
          {url}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="text-[11px] font-medium border border-[#E5E7EB] hover:bg-[#F3F3EE] text-[#1A1A1A] px-2.5 py-1.5 rounded-[8px] flex-shrink-0"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
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

// ─── SMS templates — real CRUD on wk_sms_templates ──────────────
//
// Hugo 2026-04-30: stage-coupled templates. Each template can
// optionally carry a move_to_stage_id; when an agent picks the
// template and sends, the contact moves to that stage.
function TemplatesTab() {
  const { items, loading, error, add, patch, remove } = useSmsTemplates();
  const { columns } = useSmsV2();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    body_md: string;
    move_to_stage_id: string | null;
  }>({ name: '', body_md: '', move_to_stage_id: null });
  const [actionError, setActionError] = useState<string | null>(null);

  const startEdit = (t: SmsTemplate) => {
    setEditingId(t.id);
    setDraft({
      name: t.name,
      body_md: t.body_md,
      move_to_stage_id: t.move_to_stage_id,
    });
  };
  const startNew = () => {
    setEditingId('new');
    setDraft({ name: '', body_md: '', move_to_stage_id: null });
  };
  const cancel = () => {
    setEditingId(null);
    setActionError(null);
  };

  const save = async () => {
    setActionError(null);
    try {
      if (editingId === 'new') {
        await add({
          name: draft.name.trim(),
          body_md: draft.body_md.trim(),
          is_global: true,
          owner_agent_id: null,
          move_to_stage_id: draft.move_to_stage_id,
        });
      } else if (editingId) {
        await patch(editingId, {
          name: draft.name.trim(),
          body_md: draft.body_md.trim(),
          move_to_stage_id: draft.move_to_stage_id,
        });
      }
      cancel();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'save failed');
    }
  };

  const del = async (t: SmsTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    setActionError(null);
    try {
      await remove(t.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'delete failed');
    }
  };

  return (
    <Card title="SMS templates" hint={`${items.length} templates · stage-coupled = sending moves contact`}>
      <div className="text-[11px] text-[#6B7280] leading-snug mb-3">
        Each template can optionally <strong>move the contact to a pipeline stage</strong> when an
        agent uses it to send. Replaces the old "AI auto-detects stage" idea
        — stage progression is now triggered by template choice.
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-[#6B7280]">
          {loading ? 'Loading…' : `${items.length} templates`}
        </div>
        <button
          onClick={startNew}
          disabled={editingId !== null}
          className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] inline-flex items-center gap-1 hover:bg-[#1E9A80]/90 disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" /> New template
        </button>
      </div>

      {(error || actionError) && (
        <div className="text-[11px] text-[#EF4444] mb-2">
          ⚠ {actionError ?? error}
        </div>
      )}

      {editingId === 'new' && (
        <TemplateEditor
          draft={draft}
          setDraft={setDraft}
          columns={columns}
          onSave={save}
          onCancel={cancel}
        />
      )}

      <div className="space-y-2">
        {items.map((t) => {
          const targetStage = columns.find((c) => c.id === t.move_to_stage_id);
          return (
            <div
              key={t.id}
              className="border border-[#E5E7EB] rounded-xl p-3 bg-white"
            >
              {editingId === t.id ? (
                <TemplateEditor
                  draft={draft}
                  setDraft={setDraft}
                  columns={columns}
                  onSave={save}
                  onCancel={cancel}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1A1A1A]">{t.name}</span>
                      {targetStage && (
                        <span className="text-[10px] bg-[#ECFDF5] text-[#1E9A80] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-0.5">
                          → {targetStage.name}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-[11px] px-2 py-1 rounded-md border border-[#E5E7EB] hover:bg-[#F3F3EE]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void del(t)}
                        className="text-[11px] px-2 py-1 rounded-md text-[#EF4444] hover:bg-[#FEF2F2]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[12px] text-[#6B7280] leading-snug whitespace-pre-wrap">
                    {t.body_md}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {!loading && items.length === 0 && editingId !== 'new' && (
          <div className="text-[12px] text-[#9CA3AF] text-center py-6">
            No templates yet. Click "New template" to add one.
          </div>
        )}
      </div>
    </Card>
  );
}

function TemplateEditor({
  draft,
  setDraft,
  columns,
  onSave,
  onCancel,
}: {
  draft: { name: string; body_md: string; move_to_stage_id: string | null };
  setDraft: (d: { name: string; body_md: string; move_to_stage_id: string | null }) => void;
  columns: PipelineColumn[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) =>
    setDraft({ ...draft, [k]: v });
  const canSave = draft.name.trim().length > 0 && draft.body_md.trim().length > 0;
  return (
    <div className="border border-[#1E9A80]/40 bg-[#ECFDF5] rounded-xl p-3 mb-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Name</Label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Send breakdown"
            className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
          />
        </div>
        <div>
          <Label>Move contact to stage (optional)</Label>
          <select
            value={draft.move_to_stage_id ?? ''}
            onChange={(e) => set('move_to_stage_id', e.target.value || null)}
            className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
          >
            <option value="">— No stage move —</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label>Body (use {'{{first_name}}'} / {'{{agent_first_name}}'})</Label>
        <textarea
          value={draft.body_md}
          onChange={(e) => set('body_md', e.target.value)}
          rows={4}
          placeholder="Hi {{first_name}}, …"
          className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-[10px] bg-white"
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

// ─── Campaigns ─────────────────────────────────────────────────────
// PR 57 (Hugo 2026-04-27): replaced the mock store-driven UI with
// real wk_dialer_campaigns CRUD + per-campaign agent + number
// assignment panels. The body lives in RealCampaignsPanel below.
function CampaignsTab() {
  return <RealCampaignsPanel />;
}

// PR 57 (Hugo 2026-04-27): real wk_dialer_campaigns CRUD + per-
// campaign agent + number assignments. Replaces the mock UI that
// edited the in-memory store. Admin can:
//   - Create / rename / delete real campaigns
//   - Toggle is_active + ai_coach_enabled
//   - Set parallel_lines + auto_advance_seconds
//   - Assign agents (dialer enforcement gate via wk_campaign_agents)
//   - Assign numbers (dialer picks from-line via wk_campaign_numbers)
//   - Duplicate a campaign (RPC wk_duplicate_campaign — copies bundle)
function RealCampaignsPanel() {
  const { campaigns, refetch } = useDialerCampaigns();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const create = async () => {
    setActionError(null);
    if (!newName.trim()) return;
    setCreating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('wk_dialer_campaigns' as any) as any)
        .insert({
          name: newName.trim(),
          parallel_lines: 3,
          auto_advance_seconds: 10,
          ai_coach_enabled: true,
          is_active: false,
        });
      if (error) {
        setActionError(error.message);
        return;
      }
      setNewName('');
      refetch();
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?\nThis removes the campaign + its bundle (AI overrides, facts, glossary, agent + number assignments). Queue rows are deleted via ON DELETE CASCADE.`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('wk_dialer_campaigns' as any) as any)
      .delete()
      .eq('id', id);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (expandedId === id) setExpandedId(null);
    refetch();
  };

  const patch = async (id: string, p: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('wk_dialer_campaigns' as any) as any)
      .update(p)
      .eq('id', id);
    if (error) setActionError(error.message);
    else refetch();
  };

  const duplicate = async (id: string, name: string) => {
    const newCopyName = window.prompt(`Duplicate "${name}" — name for the copy?`, `${name} (copy)`);
    if (!newCopyName?.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('wk_duplicate_campaign', {
      p_source_id: id,
      p_new_name: newCopyName.trim(),
    });
    if (error) {
      setActionError(error.message);
      return;
    }
    refetch();
  };

  return (
    <Card title="Campaigns" hint="Real wk_dialer_campaigns rows · drives /crm/dialer + per-campaign coach overrides">
      {actionError && (
        <div className="mb-2 px-2 py-1 text-[11px] text-[#B91C1C] bg-[#FEE2E2] rounded-[6px]">
          {actionError}
        </div>
      )}

      <div className="flex gap-1.5 mb-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void create()}
          placeholder="New campaign name…"
          className="flex-1 px-3 py-1.5 text-[12px] bg-white border border-[#E5E7EB] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/40"
        />
        <button
          onClick={() => void create()}
          disabled={creating || !newName.trim()}
          className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[10px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
        >
          {creating ? 'Creating…' : '+ Create'}
        </button>
      </div>

      <div className="space-y-2">
        {campaigns.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] italic px-1 py-2">
            No campaigns yet. Create one above.
          </div>
        )}
        {campaigns.map((c) => {
          const isOpen = expandedId === c.id;
          return (
            <div key={c.id} className="border border-[#E5E7EB] rounded-xl">
              <div className="flex items-center justify-between px-3 py-2.5">
                <button
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                  className="flex-1 text-left text-[13px] font-semibold text-[#1A1A1A] hover:text-[#1E9A80]"
                >
                  {isOpen ? '▾ ' : '▸ '}
                  {c.name}
                </button>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF] mr-3">
                  {c.parallelLines} lines · {c.totalLeads} leads
                </span>
                <button
                  onClick={() => void duplicate(c.id, c.name)}
                  className="text-[11px] text-[#1A1A1A] border border-[#E5E7EB] hover:bg-[#F3F3EE] px-2 py-1 rounded-[8px] mr-1.5"
                  title="Duplicate this campaign + its full bundle"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => void remove(c.id, c.name)}
                  className="text-[11px] text-[#EF4444] hover:bg-[#FEE2E2] px-2 py-1 rounded-[8px]"
                  title="Delete (cascades bundle)"
                >
                  Delete
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-[#E5E7EB] p-3 space-y-3 bg-[#F9FAFB]">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Parallel lines (1–5)">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        defaultValue={c.parallelLines}
                        onBlur={(e) => {
                          const n = Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1));
                          if (n !== c.parallelLines) void patch(c.id, { parallel_lines: n });
                        }}
                        className="w-full px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] tabular-nums bg-white"
                      />
                    </Field>
                    <Field label="Auto-advance (s)">
                      <input
                        type="number"
                        min={1}
                        defaultValue={c.autoAdvanceSeconds}
                        onBlur={(e) => {
                          const n = Math.max(1, parseInt(e.target.value, 10) || 10);
                          if (n !== c.autoAdvanceSeconds) void patch(c.id, { auto_advance_seconds: n });
                        }}
                        className="w-full px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px] tabular-nums bg-white"
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => void patch(c.id, { ai_coach_enabled: !c.aiCoachEnabled })}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                        c.aiCoachEnabled
                          ? 'bg-[#ECFDF5] text-[#1E9A80] border-[#1E9A80]/30'
                          : 'bg-[#F3F3EE] text-[#9CA3AF] border-[#E5E7EB]'
                      )}
                    >
                      <Bot className="w-3 h-3" />
                      AI coach: {c.aiCoachEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <CampaignAgentsPanel campaignId={c.id} />
                  <CampaignNumbersPanel campaignId={c.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── PR 57: per-campaign agent assignments ────────────────────────
// Lives inside RealCampaignsPanel as a sub-panel for each expanded
// campaign row. wk-dialer-start enforces these on Start.
function CampaignAgentsPanel({ campaignId }: { campaignId: string }) {
  const { rows, add, remove } = useCampaignAgents(campaignId);
  const { agents } = useAgentsToday();
  const [pickingAgentId, setPickingAgentId] = useState<string>('');
  const assignedIds = new Set(rows.map((r) => r.agent_id));
  const available = agents.filter((a) => !assignedIds.has(a.id) && !a.isAdmin);

  const onAdd = async () => {
    if (!pickingAgentId) return;
    try {
      await add(pickingAgentId);
      setPickingAgentId('');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'add failed');
    }
  };

  return (
    <div className="border border-[#E5E7EB] bg-white rounded-[10px] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
        Assigned agents
        <span className="ml-2 text-[10px] text-[#6B7280] normal-case font-normal">
          {rows.length === 0
            ? 'no rows → any agent may dial this campaign'
            : `${rows.length} agent${rows.length === 1 ? '' : 's'} — only these may dial`}
        </span>
      </div>
      <div className="space-y-1.5 mb-2">
        {rows.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic">
            None assigned. Add at least one to lock this campaign down.
          </div>
        )}
        {rows.map((r) => {
          const a = agents.find((x) => x.id === r.agent_id);
          return (
            <div key={r.id} className="flex items-center justify-between text-[12px]">
              <span className="text-[#1A1A1A]">
                {a?.name ?? r.agent_id.slice(0, 8)}{' '}
                <span className="text-[10px] text-[#9CA3AF]">({r.role})</span>
              </span>
              <button
                onClick={() => void remove(r.id)}
                className="text-[10px] text-[#EF4444] hover:underline"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <select
          value={pickingAgentId}
          onChange={(e) => setPickingAgentId(e.target.value)}
          className="flex-1 px-2 py-1.5 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px]"
        >
          <option value="">Pick an agent…</option>
          {available.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => void onAdd()}
          disabled={!pickingAgentId}
          className="bg-[#1E9A80] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── PR 57: per-campaign number assignments ───────────────────────
// wk-dialer-start picks the from-line from these rows by priority
// ASC. When empty it falls back to the agent's caller-ID then to any
// voice-enabled workspace number.
function CampaignNumbersPanel({ campaignId }: { campaignId: string }) {
  const { rows, add, remove, setPriority } = useCampaignNumbers(campaignId);
  const [pickingNumberId, setPickingNumberId] = useState<string>('');
  const [allNumbers, setAllNumbers] = useState<
    Array<{ id: string; e164: string; voice_enabled: boolean; sms_enabled: boolean }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_numbers' as any) as any)
        .select('id, e164, voice_enabled, sms_enabled')
        .order('e164', { ascending: true });
      if (!cancelled) {
        setAllNumbers(
          (data ?? []) as Array<{ id: string; e164: string; voice_enabled: boolean; sms_enabled: boolean }>
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedIds = new Set(rows.map((r) => r.number_id));
  const available = allNumbers.filter((n) => !assignedIds.has(n.id));

  const onAdd = async () => {
    if (!pickingNumberId) return;
    try {
      await add(pickingNumberId, rows.length); // priority ASC by insertion
      setPickingNumberId('');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'add failed');
    }
  };

  return (
    <div className="border border-[#E5E7EB] bg-white rounded-[10px] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
        Assigned numbers
        <span className="ml-2 text-[10px] text-[#6B7280] normal-case font-normal">
          {rows.length === 0
            ? 'no rows → dialer falls back to workspace pool'
            : `${rows.length} number${rows.length === 1 ? '' : 's'} — first priority dials out`}
        </span>
      </div>
      <div className="space-y-1.5 mb-2">
        {rows.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic">
            None pinned. wk-dialer-start uses any voice-enabled workspace number.
          </div>
        )}
        {rows.map((r) => {
          const n = allNumbers.find((x) => x.id === r.number_id);
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-[#1A1A1A] tabular-nums flex-1">
                {n?.e164 ?? r.number_id.slice(0, 8)}
                {n && !n.voice_enabled && (
                  <span className="ml-2 text-[9px] text-[#B45309] bg-[#FEF3C7] px-1 rounded">
                    not voice-enabled
                  </span>
                )}
              </span>
              <input
                type="number"
                defaultValue={r.priority}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n !== r.priority) void setPriority(r.id, n);
                }}
                className="w-12 px-1.5 py-0.5 text-[11px] border border-[#E5E7EB] rounded text-right tabular-nums"
                title="Lower = picked first"
              />
              <button
                onClick={() => void remove(r.id)}
                className="text-[10px] text-[#EF4444] hover:underline"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <select
          value={pickingNumberId}
          onChange={(e) => setPickingNumberId(e.target.value)}
          className="flex-1 px-2 py-1.5 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px]"
        >
          <option value="">Pick a number…</option>
          {available.map((n) => (
            <option key={n.id} value={n.id}>
              {n.e164} {n.voice_enabled ? '' : '(no voice)'}
            </option>
          ))}
        </select>
        <button
          onClick={() => void onAdd()}
          disabled={!pickingNumberId}
          className="bg-[#1E9A80] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[#1E9A80]/90 disabled:opacity-60"
        >
          + Add
        </button>
      </div>
    </div>
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

      {/* PR 39 (Hugo 2026-04-27): inbound SMS wasn't being received.
          Most common cause: Twilio's per-number 'A message comes in'
          webhook URL isn't set / points elsewhere. Surface the URL
          here so admins can copy it directly into the Twilio Console. */}
      <Card
        title="Webhook URLs (Twilio Console)"
        hint="Set these on every active number's 'A message comes in' / 'A call comes in' fields"
      >
        <WebhookUrlRow
          label="Inbound SMS"
          path="/functions/v1/sms-webhook-incoming"
        />
        <WebhookUrlRow
          label="Inbound WhatsApp"
          path="/functions/v1/wa-webhook-incoming"
        />
        <WebhookUrlRow
          label="Inbound voice"
          path="/functions/v1/wk-voice-twiml-incoming"
        />
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
                {/* PR 40: knob centred via top-1/2 + translate so it
                    never clips. min-w on the label so the
                    Enabled/Disabled text doesn't get squeezed under
                    the knob on narrow screens. */}
                <button
                  onClick={() => void toggleNumber(n.e164, !n.voice_enabled)}
                  className="flex items-center gap-2 group flex-shrink-0"
                  title={n.voice_enabled ? 'Click to disable voice' : 'Click to enable voice'}
                  aria-pressed={n.voice_enabled}
                >
                  <span
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
                      n.voice_enabled ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                        n.voice_enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      'text-[12px] font-medium min-w-[60px] text-left',
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
function AITab({ campaignId = null }: { campaignId?: string | null } = {}) {
  const ks = useKillSwitch();
  const { settings, loading, saving, error, saved, fieldSource, setField, save, resetField } =
    useAiSettings({ campaignId });
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
            <Label>
              Layer 1 — Style / voice
              <ScopeBadge
                source={fieldSource.coach_style_prompt}
                campaignId={campaignId}
                onReset={() => void resetField('coach_style_prompt')}
              />
            </Label>
            <div className="text-[10px] text-[#9CA3AF] mb-1">
              How the rep sounds. UK English, plain, commercial. Bans on
              acting notes, multiple variants, American slop.
              {campaignId
                ? ' Per-campaign override stored in wk_campaign_ai_settings.'
                : ' Persisted to wk_ai_settings.coach_style_prompt (workspace default).'}
            </div>
            <textarea
              value={settings.coach_style_prompt}
              onChange={(e) => setField('coach_style_prompt', e.target.value)}
              rows={8}
              placeholder={
                campaignId
                  ? 'Leave empty to inherit the workspace default.'
                  : 'Leave empty to use the canonical default from the edge function.'
              }
              className="w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2"
            />
          </div>
          <div>
            <Label>
              Layer 2 — Script / call logic
              <ScopeBadge
                source={fieldSource.coach_script_prompt}
                campaignId={campaignId}
                onReset={() => void resetField('coach_script_prompt')}
              />
            </Label>
            <div className="text-[10px] text-[#9CA3AF] mb-1">
              Call stages, open-ended default, earned-close gate,
              retrieval instruction (point the model at the KB for
              factual questions).
              {campaignId
                ? ' Per-campaign override stored in wk_campaign_ai_settings.'
                : ' Persisted to wk_ai_settings.coach_script_prompt (workspace default).'}
            </div>
            <textarea
              value={settings.coach_script_prompt}
              onChange={(e) => setField('coach_script_prompt', e.target.value)}
              rows={12}
              placeholder={
                campaignId
                  ? 'Leave empty to inherit the workspace default.'
                  : 'Leave empty to use the canonical default from the edge function.'
              }
              className="w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2"
            />
          </div>
          <div className="text-[11px] text-[#6B7280] border border-dashed border-[#E5E7EB] rounded-lg p-2 bg-[#F9FAFB]">
            <span className="font-semibold text-[#1A1A1A]">Layer 3 — Coach facts</span> lives in <code className="bg-[#F3F3EE] px-1 rounded">wk_coach_facts</code> and is edited in the <span className="font-semibold">Coach facts</span> tab on the left. The agent-facing <span className="font-semibold">Glossary</span> + <span className="font-semibold">Objections</span> tabs (col 4 of the live-call screen) live in <code className="bg-[#F3F3EE] px-1 rounded">wk_terminologies</code> — separate surface, separate Settings tab.
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
function GlossaryTab({
  campaignId = null,
}: { campaignId?: string | null } = {}) {
  // PR 56: campaign-aware. workspace rows show as inherited; new
  // entries go into wk_campaign_terminologies when scoped to a campaign.
  const { items, loading, error, add, patch, remove } = useTerminologies({ campaignId });
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
function KnowledgeBaseTab({
  campaignId = null,
}: { campaignId?: string | null } = {}) {
  // PR 56: when campaignId is set, edits go to wk_campaign_facts
  // and the list shows merged workspace + campaign facts. The hook
  // already handles that — we just thread the prop through.
  const { items, loading, error, add, patch, remove } = useCoachFacts({ campaignId });
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
        title="Coach facts"
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
              No facts yet. Click "Add fact" to seed the coach facts.
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
      {/* PR 27 honesty banner: every input here is uncontrolled with
          static defaultValues — nothing saves anywhere. Real pacing
          + block-list lands in a follow-up. Existing per-agent spend
          limits + the global kill switch ARE wired (see Agents +
          Kill-switches tabs); this tab is the future home for CSV
          block-list + global concurrency caps. */}
      <Card title="Pacing & safety">
        <div className="px-3 py-2 bg-[#FFFBEB] border border-[#F59E0B]/40 rounded-[10px] text-[11px] text-[#92400E]">
          ⚠ Coming soon — none of the inputs below persist yet. Per-agent
          spend caps (real, persisted) live in the <strong>Agents & spend</strong>
          tab. Global kill switches are in the <strong>Kill switches & audit</strong>
          tab. The block list + global parallel-line cap shown here is a
          mockup; if you need to block a number today, do it in the
          Twilio console or via SQL on <code className="bg-white/60 px-1 rounded">sms_opt_outs</code>.
        </div>
      </Card>
      <Card title="Global limits (mockup)">
        <div className="grid grid-cols-2 gap-3 opacity-60">
          <Field label="Max parallel lines per agent">
            <input
              defaultValue={3}
              disabled
              className="w-full px-2 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[10px] tabular-nums bg-[#F3F3EE] cursor-not-allowed"
            />
          </Field>
          <Field label="Retry attempts cap per lead">
            <input
              defaultValue={3}
              disabled
              className="w-full px-2 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[10px] tabular-nums bg-[#F3F3EE] cursor-not-allowed"
            />
          </Field>
        </div>
      </Card>
      <Card title="Block list (mockup)" hint="Numbers we never dial">
        <textarea
          rows={4}
          disabled
          defaultValue={'+44 7000 000000\n+44 7000 000001'}
          className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px] bg-[#F3F3EE] cursor-not-allowed opacity-60"
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
