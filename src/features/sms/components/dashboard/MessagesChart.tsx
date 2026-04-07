import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { SmsDashboardStats } from '../../types';

interface MessagesChartProps {
  stats: SmsDashboardStats;
}

export default function MessagesChart({ stats }: MessagesChartProps) {
  return (
    <div className="space-y-6">
      {/* Line chart */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-4">Messages (last 30 days)</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.dailyMessages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#1E9A80"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#1E9A80' }}
              />
              <Line
                type="monotone"
                dataKey="received"
                stroke="#9CA3AF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#9CA3AF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1E9A80]" />
            <span className="text-xs text-[#6B7280]">Sent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]" />
            <span className="text-xs text-[#6B7280]">Received</span>
          </div>
        </div>
      </div>

      {/* Pie chart */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-4">Message status breakdown</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.statusBreakdown}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
                label={({ status, count }: { status: string; count: number }) => `${status}: ${count}`}
                labelLine={{ stroke: '#E5E7EB' }}
                style={{ fontSize: 11 }}
              >
                {stats.statusBreakdown.map((entry) => (
                  <Cell key={entry.status} fill={entry.colour} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#6B7280' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
