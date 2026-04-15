import { Clock, Send, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  stats: { pending: number; sending: number; sent: number; failed: number };
}

export default function WebhookQueueStats({ stats }: Props) {
  const cards = [
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      colour: 'text-[#6B7280]',
      bg: 'bg-[#F3F3EE]',
    },
    {
      label: 'Sending',
      value: stats.sending,
      icon: Send,
      colour: 'text-[#1E9A80]',
      bg: 'bg-[#ECFDF5]',
    },
    {
      label: 'Sent',
      value: stats.sent,
      icon: CheckCircle2,
      colour: 'text-[#1E9A80]',
      bg: 'bg-[#ECFDF5]',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      colour: 'text-[#EF4444]',
      bg: 'bg-[#FEE2E2]',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, colour, bg }) => (
        <div
          key={label}
          className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3"
        >
          <div className={`rounded-lg p-2 ${bg}`}>
            <Icon className={`h-4 w-4 ${colour}`} />
          </div>
          <div>
            <p className="text-xs text-[#6B7280]">{label}</p>
            <p className="text-xl font-bold text-[#1A1A1A]">{value.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
