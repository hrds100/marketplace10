import { LayoutDashboard, Loader2 } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import StatCards from '../components/dashboard/StatCards';
import MessagesChart from '../components/dashboard/MessagesChart';

const emptyStats = {
  messagesToday: { sent: 0, received: 0 },
  unreadCount: 0,
  activeAutomations: 0,
  deliveryRate: 0,
  dailyMessages: [],
  statusBreakdown: [],
};

export default function SmsDashboardPage() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  const data = stats ?? emptyStats;

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="h-6 w-6 text-[#1E9A80]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
      </div>

      <div className="space-y-6">
        <StatCards stats={data} />
        <MessagesChart stats={data} />
      </div>
    </div>
  );
}
