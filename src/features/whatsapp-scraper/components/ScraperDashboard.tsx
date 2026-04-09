import { useState, useEffect } from 'react';
import { BarChart3, Calendar, Radio, Pause, Play, RefreshCw } from 'lucide-react';
import StatCard from './StatCard';
import ActivityFeed from './ActivityFeed';
import { useScraperActivity } from '../hooks/useScraperActivity';
import { useScraperConfig } from '../hooks/useScraperConfig';
import type { ScraperGroup } from '../types';

interface ScraperDashboardProps {
  dealsToday: number;
  dealsThisWeek: number;
  activeGroups: number;
  totalGroups: number;
  byDay: { date: string; scraped: number; approved: number; rejected: number }[];
  topGroups: { groupName: string; count: number }[];
}

export default function ScraperDashboard({
  dealsToday,
  dealsThisWeek,
  activeGroups,
  totalGroups,
  byDay,
  topGroups,
}: ScraperDashboardProps) {
  const { activities, loading: activityLoading } = useScraperActivity(20);
  const { config, updateConfig } = useScraperConfig();
  const [extensionAlive, setExtensionAlive] = useState(false);

  // Check extension heartbeat from config
  useEffect(() => {
    // Extension writes a heartbeat timestamp to wa_scraper_config
    // We check if it's less than 2 minutes old
    const checkHeartbeat = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await (supabase.from('wa_scraper_config') as any)
          .select('key, value')
          .eq('key', 'last_heartbeat')
          .single();

        if (data?.value) {
          const heartbeatTime = new Date(data.value as string).getTime();
          const twoMinAgo = Date.now() - 2 * 60 * 1000;
          setExtensionAlive(heartbeatTime > twoMinAgo);
        }
      } catch {
        setExtensionAlive(false);
      }
    };
    checkHeartbeat();
    const interval = setInterval(checkHeartbeat, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePause = async () => {
    await updateConfig({ is_paused: !config.is_paused });
  };

  const handleScanNow = async () => {
    await updateConfig({ is_paused: false });
    const { supabase } = await import('@/integrations/supabase/client');
    await (supabase.from('wa_scraper_config') as any)
      .upsert({ key: 'force_rescan', value: true, updated_at: new Date().toISOString() });
  };

  const maxDailyDeals = Math.max(...byDay.map(d => d.scraped), 1);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label="Deals Today" value={dealsToday} />
        <StatCard icon={Calendar} label="Deals This Week" value={dealsThisWeek} />
        <StatCard
          icon={Radio}
          label="Groups Active"
          value={`${activeGroups} / ${totalGroups}`}
        />
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${extensionAlive ? 'bg-[#1E9A80] animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[13px] font-medium text-[#6B7280]">Extension Status</span>
          </div>
          <div className="text-lg font-bold text-[#1A1A1A]">
            {extensionAlive ? 'Connected' : 'Offline'}
          </div>
          {config.is_paused && (
            <span className="text-[12px] font-medium text-amber-500">Paused</span>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleTogglePause}
          className={`h-10 px-5 rounded-lg text-[14px] font-medium transition-colors flex items-center gap-2 ${
            config.is_paused
              ? 'bg-[#1E9A80] text-white hover:bg-[#178a72]'
              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
          }`}
        >
          {config.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {config.is_paused ? 'Resume Scanning' : 'Pause Scanning'}
        </button>
        <button
          onClick={handleScanNow}
          className="h-10 px-5 rounded-lg bg-[#1E9A80] text-white text-[14px] font-medium hover:bg-[#178a72] transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Scan Now
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily chart (bar chart using styled divs) */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Deals Per Day (Last 7 Days)</h3>
          <div className="space-y-2">
            {byDay.map(day => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-[11px] text-[#9CA3AF] w-16 flex-shrink-0">
                  {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 h-5 bg-[#F3F3EE] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#1E9A80] rounded-full transition-all"
                    style={{ width: `${(day.scraped / maxDailyDeals) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] font-medium text-[#1A1A1A] w-6 text-right">{day.scraped}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Recent Activity</h3>
          <ActivityFeed activities={activities} loading={activityLoading} />
        </div>
      </div>

      {/* Top groups */}
      {topGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Top 5 Groups by Deals</h3>
          <div className="space-y-2">
            {topGroups.slice(0, 5).map((g, i) => (
              <div key={g.groupName} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#F3F3EE] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-[#9CA3AF] w-5">{i + 1}</span>
                  <span className="text-[13px] font-medium text-[#1A1A1A]">{g.groupName}</span>
                </div>
                <span className="text-[13px] font-semibold text-[#1E9A80]">{g.count} deals</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
