import { useState } from 'react';
import { Play, Pause, Square, Bot, ArrowRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import CampaignList from '../components/dialer/CampaignList';
import ParallelDialerBoard from '../components/dialer/ParallelDialerBoard';
import SpendBanner from '../components/dialer/SpendBanner';
import StageSelector from '../components/shared/StageSelector';
import EditContactModal from '../components/contacts/EditContactModal';
import { MOCK_CAMPAIGNS, COACH_PROMPTS } from '../data/mockCampaigns';
import { useActiveCallCtx } from '../components/live-call/ActiveCallContext';
import { useSpendLimit } from '../hooks/useSpendLimit';
import { useSmsV2 } from '../store/SmsV2Store';
import type { Contact } from '../types';

export default function DialerPage() {
  const [activeId, setActiveId] = useState(MOCK_CAMPAIGNS[0].id);
  const [running, setRunning] = useState(true);
  const [editing, setEditing] = useState<Contact | null>(null);
  const camp = MOCK_CAMPAIGNS.find((c) => c.id === activeId)!;
  const { startCall } = useActiveCallCtx();
  const spend = useSpendLimit();
  const { contacts, patchContact, upsertContact } = useSmsV2();

  const upcoming = contacts.slice(0, 5);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">My dialer</h1>
          <p className="text-[13px] text-[#6B7280]">
            Run campaigns · parallel + power · winner takes the screen
          </p>
        </div>
      </header>

      <SpendBanner />

      <div className="grid grid-cols-12 gap-5">
        {/* Left — campaigns + queue */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <CampaignList activeId={activeId} onSelect={setActiveId} />

          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
                My queue
              </h3>
              <span className="text-[11px] text-[#6B7280]">Next 5</span>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {upcoming.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-2.5 hover:bg-[#F3F3EE]/50 flex items-center gap-2"
                >
                  <button
                    onClick={() => startCall(c.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280] tabular-nums">{c.phone}</div>
                  </button>
                  <StageSelector
                    value={c.pipelineColumnId}
                    onChange={(col) => patchContact(c.id, { pipelineColumnId: col })}
                    size="sm"
                  />
                  <button
                    onClick={() => setEditing(c)}
                    className="p-1.5 rounded hover:bg-white text-[#6B7280] hover:text-[#1A1A1A]"
                    title="Edit lead"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startCall(c.id)}
                    className="p-1.5 rounded hover:bg-white text-[#9CA3AF]"
                    title="Call"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — campaign detail + dialer */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                  Campaign
                </div>
                <h2 className="text-[18px] font-bold text-[#1A1A1A]">{camp.name}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRunning(true)}
                  disabled={spend.isLimitReached}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)]',
                    spend.isLimitReached
                      ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'
                      : 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
                  )}
                >
                  <Play className="w-3.5 h-3.5" /> Start
                </button>
                <button
                  onClick={() => setRunning(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium border border-[#E5E7EB] text-[#EF4444] hover:bg-[#FEF2F2]">
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Mode">
                <select className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]">
                  <option value="parallel">Parallel</option>
                  <option value="power">Power</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              <Field label="Lines">
                <select
                  defaultValue={camp.parallelLines}
                  className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Auto-advance">
                <select
                  defaultValue={camp.autoAdvanceSeconds}
                  className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
                >
                  {[5, 10, 15, 20, 30].map((n) => (
                    <option key={n}>{n}s</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="AI coach">
                <button
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-[13px] w-full justify-between border',
                    camp.aiCoachEnabled
                      ? 'bg-[#ECFDF5] border-[#1E9A80]/30 text-[#1E9A80] font-semibold'
                      : 'bg-[#F3F3EE] border-[#E5E7EB] text-[#6B7280]'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> {camp.aiCoachEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span className="text-[10px] opacity-60">click to toggle</span>
                </button>
              </Field>
              <Field label="System prompt">
                <select className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]">
                  {COACH_PROMPTS.map((p) => (
                    <option key={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-[#E5E7EB]">
              <Mini label="Queue" value={camp.totalLeads - camp.doneLeads} />
              <Mini label="Done" value={camp.doneLeads} tone="green" />
              <Mini label="Connected" value={camp.connectedLeads} tone="green" />
              <Mini label="Voicemail" value={camp.voicemailLeads} />
            </div>
          </div>

          <ParallelDialerBoard active={running} />
        </div>
      </div>

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => upsertContact(updated)}
      />
    </div>
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

function Mini({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'green';
}) {
  return (
    <div className="bg-[#F3F3EE] rounded-xl p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        {label}
      </div>
      <div
        className={
          'text-[18px] font-bold tabular-nums mt-0.5 ' +
          (tone === 'green' ? 'text-[#1E9A80]' : 'text-[#1A1A1A]')
        }
      >
        {value}
      </div>
    </div>
  );
}
