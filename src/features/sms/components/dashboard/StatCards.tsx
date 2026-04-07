import { MessageSquare, Mail, Workflow, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmsDashboardStats } from '../../types';

interface StatCardsProps {
  stats: SmsDashboardStats;
}

export default function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      icon: MessageSquare,
      label: 'Messages Today',
      value: `${stats.messagesToday.sent} sent / ${stats.messagesToday.received} received`,
      highlight: false,
    },
    {
      icon: Mail,
      label: 'Unread',
      value: String(stats.unreadCount),
      highlight: stats.unreadCount > 0,
    },
    {
      icon: Workflow,
      label: 'Active Automations',
      value: String(stats.activeAutomations),
      highlight: false,
    },
    {
      icon: CheckCircle,
      label: 'Delivery Rate',
      value: `${stats.deliveryRate}%`,
      highlight: false,
      green: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="rounded-lg bg-[#F3F3EE] p-2">
              <card.icon className="h-4 w-4 text-[#6B7280]" />
            </div>
            <span className="text-xs font-medium text-[#6B7280]">{card.label}</span>
          </div>
          <p
            className={cn(
              'text-lg font-bold tabular-nums',
              card.green ? 'text-[#1E9A80]' : card.highlight ? 'text-[#F59E0B]' : 'text-[#1A1A1A]',
            )}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
