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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_TEMPLATES, MOCK_CAMPAIGNS, COACH_PROMPTS } from '../data/mockCampaigns';
import { MOCK_AGENTS } from '../data/mockAgents';
import { MOCK_NUMBERS } from '../data/mockCampaigns';
import { formatPence } from '../data/helpers';
import { useKillSwitch } from '../hooks/useKillSwitch';

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

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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

// — Pipelines tab —
function PipelinesTab() {
  return (
    <>
      <Card
        title="Pipeline columns = outcome buttons"
        hint="Drag to reorder · 1–9 = keyboard shortcut"
      >
        <div className="space-y-2">
          {ACTIVE_PIPELINE.columns.map((col) => {
            const Icon = ICON_MAP[col.icon] ?? Sparkles;
            const a = col.automation;
            return (
              <div
                key={col.id}
                className="border border-[#E5E7EB] rounded-xl p-3 flex items-center gap-3"
              >
                <GripVertical className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
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
                      defaultValue={col.name}
                      className="text-[13px] font-semibold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 rounded px-1"
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
                <button className="text-[#9CA3AF] hover:text-[#EF4444] p-1.5 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1.5 rounded-[10px]">
          <Plus className="w-3.5 h-3.5" /> Add column
        </button>
      </Card>

      <Card title="Live preview — what the agent sees post-call">
        <div className="grid grid-cols-3 gap-2">
          {ACTIVE_PIPELINE.columns.slice(0, 6).map((col) => {
            const Icon = ICON_MAP[col.icon] ?? Sparkles;
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
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-[#9CA3AF]">{col.position}.</div>
                    <div className="text-[12px] font-semibold text-[#1A1A1A]">{col.name}</div>
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

// — Templates —
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

// — Campaigns —
function CampaignsTab() {
  return (
    <Card title="Campaigns & lead distribution">
      <div className="space-y-2">
        {MOCK_CAMPAIGNS.map((c) => (
          <div key={c.id} className="border border-[#E5E7EB] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">{c.name}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                {c.mode} · {c.parallelLines} lines · {c.autoAdvanceSeconds}s auto-advance
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
              <span>Pipeline: {ACTIVE_PIPELINE.name}</span>
              <span>·</span>
              <span>{c.totalLeads} leads</span>
              <span>·</span>
              <span>AI coach: {c.aiCoachEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        ))}
        <button className="flex items-center gap-1 text-[12px] font-medium text-[#1E9A80] hover:bg-[#ECFDF5] px-2 py-1.5 rounded-[10px]">
          <Plus className="w-3.5 h-3.5" /> New campaign · CSV upload
        </button>
      </div>
    </Card>
  );
}

// — Agents —
function AgentsTab() {
  return (
    <Card title="Agents & spend limits" hint="Edit limit = instant effect">
      <table className="w-full text-[13px]">
        <thead className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
          <tr>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Role</th>
            <th className="text-left py-2">Ext.</th>
            <th className="text-right py-2">Spend</th>
            <th className="text-right py-2">Limit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {MOCK_AGENTS.map((a) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// — Numbers —
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
              <td className="py-2 text-center">
                {n.recordingEnabled ? '✅' : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// — AI —
function AITab() {
  const ks = useKillSwitch();
  return (
    <>
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
            <details
              key={p.id}
              className="border border-[#E5E7EB] rounded-xl p-3"
            >
              <summary className="text-[13px] font-semibold text-[#1A1A1A] cursor-pointer">
                {p.name}
              </summary>
              <pre className="mt-2 text-[11px] text-[#6B7280] whitespace-pre-wrap font-mono leading-snug">
                {p.body}
              </pre>
            </details>
          ))}
        </div>
      </Card>
    </>
  );
}

// — Pacing —
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
          defaultValue="+44 7000 000000\n+44 7000 000001"
          className="w-full px-3 py-2 text-[12px] font-mono border border-[#E5E7EB] rounded-[10px]"
        />
      </Card>
    </>
  );
}

// — Kill switches —
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
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}
