import { LayoutDashboard } from 'lucide-react';
import { mockStats } from '../data/mockStats';
import StatCards from '../components/dashboard/StatCards';
import MessagesChart from '../components/dashboard/MessagesChart';

export default function SmsDashboardPage() {
  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="h-6 w-6 text-[#1E9A80]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Dashboard</h1>
      </div>

      <div className="space-y-6">
        <StatCards stats={mockStats} />
        <MessagesChart stats={mockStats} />
      </div>
    </div>
  );
}
