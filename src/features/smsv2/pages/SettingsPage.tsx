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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_TEMPLATES, MOCK_CAMPAIGNS, COACH_PROMPTS } from '../data/mockCampaigns';
import { MOCK_AGENTS } from '../data/mockAgents';
import { MOCK_NUMBERS } from '../data/mockCampaigns';
import { formatPence } from '../data/helpers';
import { useKillSwitch } from '../hooks/useKillSwitch';
import type { Agent, PipelineColumn } from '../types';

const TABS = [
  { id: 'pipelines', label: 'Pipelines & outcomes', icon: Kanban },
  { id: 'templates', label: 'SMS templates', icon: MessageSquare },
  { id: 'campaigns', label: 'Campaigns & leads', icon: Megaphone },
  { id: 'agents', label: 'Agents & spend', icon: Users },
  { id: 'numbers', label: 'Numbers', icon: Phone },
  { id: 'ai', label: 'AI coach', icon: Bot },
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
  const [cols, setCols] = useState<PipelineColumn[]>(ACTIVE_PIPELINE.columns);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<PipelineColumn>) => {
    setCols((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const updateAuto = (id: string, patch: Partial<PipelineColumn['automation']>) => {
    setCols((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, automation: { ...c.automation, ...patch } } : c
      )
    );
  };
  const addColumn = () => {
    const id = `col-new-${Date.now()}`;
    setCols((prev) => [
      ...prev,
      {
        id,
        pipelineId: ACTIVE_PIPELINE.id,
        name: 'New stage',
        colour: COLOUR_PALETTE[prev.length % COLOUR_PALETTE.length],
        icon: 'Sparkles',
        position: prev.length + 1,
        automation: {
          sendSms: false,
          createTask: false,
          retryDial: false,
          addTag: false,
        },
      },
    ]);
    setExpandedId(id);
  };
  const remove = (id: string) => {
    setCols((prev) => prev.filter((c) => c.id !== id));
    if (expandedId === id) setExpandedId(null);
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
                        onChange={(e) => {
                          // only one column may be timeout default
                          setCols((prev) =>
                            prev.map((c) => ({
                              ...c,
                              isDefaultOnTimeout:
                                c.id === col.id ? e.target.checked : false,
                            }))
                          );
                        }}
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
  return (
    <Card title="Campaigns & lead distribution">
      <div className="space-y-2">
        {MOCK_CAMPAIGNS.map((c) => (
          <div key={c.id} className="border border-[#E5E7EB] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{c.name}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                {c.mode} · {c.parallelLines} lines
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6B7280] mb-2">
              <span>Pipeline: {ACTIVE_PIPELINE.name}</span>
              <span>{c.totalLeads} leads</span>
              <span>AI coach: {c.aiCoachEnabled ? 'ON' : 'OFF'}</span>
              <span>
                Auto-advance:{' '}
                <input
                  type="number"
                  defaultValue={c.autoAdvanceSeconds}
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
                defaultValue={c.scriptMd ?? `Hi {name}, this is {agent} from NFSTAY…`}
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
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState({
    email: '',
    name: '',
    extension: '',
    role: 'agent' as Agent['role'],
    limit: 10,
  });

  const remove = (id: string) =>
    setAgents((prev) => prev.filter((a) => a.id !== id));

  const send = () => {
    if (!invite.email || !invite.name) return;
    setAgents((prev) => [
      ...prev,
      {
        id: `a-new-${Date.now()}`,
        name: invite.name,
        email: invite.email,
        extension: invite.extension || `1${prev.length + 10}`,
        role: invite.role,
        status: 'offline',
        callsToday: 0,
        answeredToday: 0,
        avgDurationSec: 0,
        spendPence: 0,
        limitPence: invite.limit * 100,
        isAdmin: invite.role === 'admin',
      },
    ]);
    setInvite({ email: '', name: '', extension: '', role: 'agent', limit: 10 });
    setInviting(false);
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
              <Mail className="w-3.5 h-3.5" /> Invite by email
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
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                onClick={() => setInviting(false)}
                className="text-[11px] text-[#6B7280] hover:text-[#1A1A1A] px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={send}
                className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[#1E9A80]/90"
              >
                Send invite
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

// ─── Numbers ───────────────────────────────────────────────────────
function NumbersTab() {
  return (
    <Card title="Twilio numbers">
      <table className="w-full text-[13px]">
        <thead className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
          <tr>
            <th className="text-left py-2">Number</th>
            <th className="text-left py-2">Label</th>
            <th className="text-left py-2">Capabilities</th>
            <th className="text-right py-2">Max/min</th>
            <th className="text-right py-2">Cooldown</th>
            <th className="text-center py-2">Recording</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {MOCK_NUMBERS.map((n) => (
            <tr key={n.id}>
              <td className="py-2 font-mono text-[12px] tabular-nums">{n.e164}</td>
              <td className="py-2 text-[#1A1A1A]">{n.label}</td>
              <td className="py-2 text-[#6B7280] uppercase text-[10px]">
                {n.capabilities.join(' · ')}
              </td>
              <td className="py-2 text-right tabular-nums">{n.maxCallsPerMinute}</td>
              <td className="py-2 text-right tabular-nums">{n.cooldownSecondsAfterCall}s</td>
              <td className="py-2 text-center">{n.recordingEnabled ? '✅' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ─── AI — API key + model dropdown ─────────────────────────────────
function AITab() {
  const ks = useKillSwitch();
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');

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
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-…"
                  className="w-full px-3 py-2 pr-9 text-[13px] font-mono border border-[#E5E7EB] rounded-[10px]"
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
              <button className="bg-[#1E9A80] text-white text-[12px] font-semibold px-3 py-2 rounded-[10px] hover:bg-[#1E9A80]/90">
                Save
              </button>
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1">
              Stored encrypted in Supabase Vault. Never exposed to browser.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Model — post-call analysis</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
              >
                <option value="gpt-4o">gpt-4o (most accurate)</option>
                <option value="gpt-4o-mini">
                  gpt-4o-mini (recommended · cheap + fast)
                </option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="o1-mini">o1-mini (reasoning)</option>
              </select>
            </div>
            <div>
              <Label>Model — live coach</Label>
              <select
                defaultValue="gpt-4o-mini"
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (fast, low latency)</option>
                <option value="gpt-4o">gpt-4o (slower, smarter)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo (cheapest)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card title="AI coach master switch">
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
      </Card>

      <Card title="System prompts" hint="One per use case">
        <div className="space-y-2">
          {COACH_PROMPTS.map((p) => (
            <details key={p.id} className="border border-[#E5E7EB] rounded-xl p-3">
              <summary className="text-[13px] font-semibold text-[#1A1A1A] cursor-pointer">
                {p.name}
              </summary>
              <textarea
                defaultValue={p.body}
                rows={6}
                className="mt-2 w-full text-[11px] font-mono border border-[#E5E7EB] rounded-[8px] p-2"
              />
            </details>
          ))}
        </div>
      </Card>
    </>
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
