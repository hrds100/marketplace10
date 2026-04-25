import { Plus, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_CAMPAIGNS } from '../../data/mockCampaigns';

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CampaignList({ activeId, onSelect }: Props) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          My campaigns
        </h3>
        <button className="text-[#1E9A80] hover:bg-[#ECFDF5] p-1 rounded">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y divide-[#E5E7EB]">
        {MOCK_CAMPAIGNS.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full text-left px-4 py-3 hover:bg-[#F3F3EE]/50 transition-colors',
              activeId === c.id && 'bg-[#ECFDF5]'
            )}
          >
            <div className="flex items-center gap-2">
              <Megaphone
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  activeId === c.id ? 'text-[#1E9A80]' : 'text-[#6B7280]'
                )}
              />
              <span
                className={cn(
                  'text-[13px] font-semibold truncate',
                  activeId === c.id ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'
                )}
              >
                {c.name}
              </span>
            </div>
            <div className="text-[11px] text-[#6B7280] tabular-nums mt-1 ml-5">
              {c.totalLeads - c.doneLeads} left · {c.doneLeads} done
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
