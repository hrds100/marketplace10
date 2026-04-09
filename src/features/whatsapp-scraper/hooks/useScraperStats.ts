import { useMemo } from 'react';
import type { ScraperDeal } from '../types';

interface GroupStat {
  groupName: string;
  count: number;
  approvalRate: number;
}

interface CityStat {
  city: string;
  count: number;
}

interface PropertyTypeStat {
  type: string;
  count: number;
}

interface DayStat {
  date: string;
  scraped: number;
  approved: number;
  rejected: number;
}

export function useScraperStats(deals: ScraperDeal[]) {
  return useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dealsToday = deals.filter(d => d.created_at.slice(0, 10) === todayStr).length;
    const dealsThisWeek = deals.filter(d => new Date(d.created_at) >= weekAgo).length;
    const dealsThisMonth = deals.filter(d => new Date(d.created_at) >= monthAgo).length;

    const totalApproved = deals.filter(d => d.status === 'approved' || d.status === 'submitted').length;
    const totalRejected = deals.filter(d => d.status === 'rejected').length;
    const approvalRate = deals.length > 0 ? Math.round((totalApproved / deals.length) * 100) : 0;

    const uniquePhones = new Set(deals.map(d => d.sender_phone).filter(Boolean)).size;

    // By group
    const groupMap = new Map<string, { total: number; approved: number }>();
    for (const deal of deals) {
      const existing = groupMap.get(deal.group_name) ?? { total: 0, approved: 0 };
      existing.total++;
      if (deal.status === 'approved' || deal.status === 'submitted') existing.approved++;
      groupMap.set(deal.group_name, existing);
    }
    const byGroup: GroupStat[] = Array.from(groupMap.entries())
      .map(([groupName, { total, approved }]) => ({
        groupName,
        count: total,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By city
    const cityMap = new Map<string, number>();
    for (const deal of deals) {
      const city = deal.parsed_data?.city ?? 'Unknown';
      cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    }
    const byCity: CityStat[] = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    // By property type
    const typeMap = new Map<string, number>();
    for (const deal of deals) {
      const type = deal.parsed_data?.property_type ?? 'Unknown';
      typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
    }
    const byPropertyType: PropertyTypeStat[] = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // By day (last 7 days)
    const dayMap = new Map<string, DayStat>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      dayMap.set(dateStr, { date: dateStr, scraped: 0, approved: 0, rejected: 0 });
    }
    for (const deal of deals) {
      const dateStr = deal.created_at.slice(0, 10);
      const stat = dayMap.get(dateStr);
      if (stat) {
        stat.scraped++;
        if (deal.status === 'approved' || deal.status === 'submitted') stat.approved++;
        if (deal.status === 'rejected') stat.rejected++;
      }
    }
    const byDay: DayStat[] = Array.from(dayMap.values());

    return {
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
    };
  }, [deals]);
}
