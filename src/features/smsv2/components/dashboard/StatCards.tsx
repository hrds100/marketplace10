import type { LucideIcon } from 'lucide-react';
import { Phone, Users, PoundSterling, Activity, Radio } from 'lucide-react';

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'green';
}

const STATS: Stat[] = [
  { label: 'Calls today', value: '342', icon: Phone, hint: '+22 vs yesterday', tone: 'green' },
  { label: 'Active agents', value: '4 / 5', icon: Users, hint: 'James offline' },
  { label: 'Spend today', value: '£38.40', icon: PoundSterling, hint: '£11.60 left' },
  { label: 'Answer rate', value: '47%', icon: Activity, hint: 'rolling 24h' },
  { label: 'Connected now', value: '3', icon: Radio, hint: 'live calls' },
];

export default function StatCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {STATS.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-4 hover:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)] transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
              {s.label}
            </div>
            <s.icon
              className="w-4 h-4 text-[#1E9A80]"
              strokeWidth={1.8}
            />
          </div>
          <div
            className={
              'text-[26px] font-bold mt-2 tabular-nums ' +
              (s.tone === 'green' ? 'text-[#1E9A80]' : 'text-[#1A1A1A]')
            }
          >
            {s.value}
          </div>
          {s.hint && <div className="text-[11px] text-[#6B7280] mt-0.5">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}
