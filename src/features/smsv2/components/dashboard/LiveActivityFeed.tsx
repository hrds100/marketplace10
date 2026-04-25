import { Eye, Bot, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_AGENTS } from '../../data/mockAgents';
import { formatPence } from '../../data/helpers';

const FEED = [
  {
    agentId: 'a-tom',
    target: 'Sarah Jenkins',
    duration: '02:14',
    coach: true,
    cost: 42,
    status: 'connected',
  },
  {
    agentId: 'a-mike',
    target: '+44 7700 900...',
    duration: '00:48',
    coach: false,
    cost: 14,
    status: 'connected',
  },
  {
    agentId: 'a-aisha',
    target: '+44 7700 900...',
    duration: '00:08',
    coach: true,
    cost: 4,
    status: 'ringing',
  },
  {
    agentId: 'a-priya',
    target: 'idle 4m',
    duration: '',
    coach: false,
    cost: 0,
    status: 'idle',
  },
];

const STATUS_DOT = {
  connected: 'bg-[#1E9A80] animate-pulse',
  ringing: 'bg-[#F59E0B] animate-pulse',
  idle: 'bg-[#F59E0B]',
  offline: 'bg-[#EF4444]',
} as const;

export default function LiveActivityFeed() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1E9A80] animate-pulse" />
          <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Live activity</h3>
          <span className="text-[10px] text-[#9CA3AF]">realtime</span>
        </div>
        <span className="text-[11px] text-[#6B7280]">{FEED.length} active</span>
      </div>

      <div className="divide-y divide-[#E5E7EB]">
        {FEED.map((row, i) => {
          const agent = MOCK_AGENTS.find((a) => a.id === row.agentId);
          if (!agent) return null;
          return (
            <div
              key={i}
              className="px-4 py-2.5 flex items-center gap-3 text-[13px] hover:bg-[#F3F3EE]/50"
            >
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full flex-shrink-0',
                  STATUS_DOT[row.status as keyof typeof STATUS_DOT]
                )}
              />
              <span className="font-semibold text-[#1A1A1A] w-20">
                {agent.name.split(' ')[0]}
              </span>
              <span className="text-[#6B7280]">
                {row.status === 'idle' ? '' : 'calling '}
                <span className="text-[#1A1A1A]">{row.target}</span>
              </span>
              {row.duration && (
                <span className="text-[#6B7280] tabular-nums">· {row.duration}</span>
              )}
              {row.coach && (
                <span className="flex items-center gap-1 text-[10px] font-medium bg-[#ECFDF5] text-[#1E9A80] px-1.5 py-0.5 rounded">
                  <Bot className="w-3 h-3" /> coach
                </span>
              )}
              {row.cost > 0 && (
                <span className="text-[11px] text-[#9CA3AF] tabular-nums">
                  {formatPence(row.cost)}
                </span>
              )}
              <button className="ml-auto flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#1E9A80] px-2 py-1 rounded hover:bg-[#ECFDF5]">
                <Eye className="w-3.5 h-3.5" /> watch
              </button>
              <button className="text-[11px] text-[#6B7280] hover:text-[#1E9A80] px-2 py-1 rounded hover:bg-[#ECFDF5]">
                <Phone className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
