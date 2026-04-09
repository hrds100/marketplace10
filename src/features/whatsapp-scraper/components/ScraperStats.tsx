import { useState } from 'react';
import { BarChart3, Users, MapPin, Home, Calendar } from 'lucide-react';
import StatCard from './StatCard';

interface ScraperStatsProps {
  dealsToday: number;
  dealsThisWeek: number;
  dealsThisMonth: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
  uniquePhones: number;
  byGroup: { groupName: string; count: number; approvalRate: number }[];
  byCity: { city: string; count: number }[];
  byPropertyType: { type: string; count: number }[];
  byDay: { date: string; scraped: number; approved: number; rejected: number }[];
  totalDeals: number;
}

type DateRange = 'today' | '7days' | '30days';

export default function ScraperStats({
  dealsToday,
  dealsThisWeek,
  dealsThisMonth,
  totalApproved,
  totalRejected,
  approvalRate,
  uniquePhones,
  byGroup,
  byCity,
  byPropertyType,
  byDay,
  totalDeals,
}: ScraperStatsProps) {
  const [range, setRange] = useState<DateRange>('7days');

  const displayDeals = range === 'today' ? dealsToday : range === '7days' ? dealsThisWeek : dealsThisMonth;
  const avgPerDay = range === 'today' ? dealsToday : range === '7days'
    ? Math.round(dealsThisWeek / 7)
    : Math.round(dealsThisMonth / 30);

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="flex items-center gap-1 bg-[#F3F3EE] rounded-lg p-1 w-fit">
        {([
          { label: 'Today', value: 'today' as const },
          { label: '7 Days', value: '7days' as const },
          { label: '30 Days', value: '30days' as const },
        ]).map(tab => (
          <button
            key={tab.value}
            onClick={() => setRange(tab.value)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              range === tab.value
                ? 'bg-white text-[#1E9A80] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1A1A1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={BarChart3} label="Total Scraped" value={displayDeals} />
        <StatCard icon={BarChart3} label="Approved" value={totalApproved} />
        <StatCard icon={BarChart3} label="Rejected" value={totalRejected} />
        <StatCard icon={BarChart3} label="Approval Rate" value={`${approvalRate}%`} />
        <StatCard icon={Users} label="Unique Phones" value={uniquePhones} />
        <StatCard icon={Calendar} label="Avg/Day" value={avgPerDay} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group breakdown */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">By Group</h3>
          {byGroup.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF] text-center py-4">No data</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Group</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Deals</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Approval</th>
                </tr>
              </thead>
              <tbody>
                {byGroup.map(g => (
                  <tr key={g.groupName} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="py-2 text-[13px] text-[#1A1A1A]">{g.groupName}</td>
                    <td className="py-2 text-[13px] text-[#6B7280] text-right">{g.count}</td>
                    <td className="py-2 text-[13px] text-[#1E9A80] text-right font-medium">{g.approvalRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* City breakdown */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">By City</h3>
          {byCity.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF] text-center py-4">No data</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 text-[11px] font-semibold text-[#6B7280] uppercase">City</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Deals</th>
                </tr>
              </thead>
              <tbody>
                {byCity.map(c => (
                  <tr key={c.city} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="py-2 text-[13px] text-[#1A1A1A] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#9CA3AF]" /> {c.city}
                    </td>
                    <td className="py-2 text-[13px] text-[#6B7280] text-right">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Property type breakdown */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">By Property Type</h3>
          {byPropertyType.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF] text-center py-4">No data</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Type</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Deals</th>
                </tr>
              </thead>
              <tbody>
                {byPropertyType.map(t => (
                  <tr key={t.type} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="py-2 text-[13px] text-[#1A1A1A] flex items-center gap-1">
                      <Home className="w-3 h-3 text-[#9CA3AF]" /> {t.type}
                    </td>
                    <td className="py-2 text-[13px] text-[#6B7280] text-right">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Daily breakdown */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Daily Breakdown</h3>
          {byDay.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF] text-center py-4">No data</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Date</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Scraped</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Approved</th>
                  <th className="text-right py-2 text-[11px] font-semibold text-[#6B7280] uppercase">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map(d => (
                  <tr key={d.date} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="py-2 text-[13px] text-[#1A1A1A]">
                      {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-2 text-[13px] text-[#6B7280] text-right">{d.scraped}</td>
                    <td className="py-2 text-[13px] text-[#1E9A80] text-right">{d.approved}</td>
                    <td className="py-2 text-[13px] text-red-500 text-right">{d.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
