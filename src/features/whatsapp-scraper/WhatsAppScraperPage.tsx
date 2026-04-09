import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScraperGroups } from './hooks/useScraperGroups';
import { useScraperDeals } from './hooks/useScraperDeals';
import { useScraperConfig } from './hooks/useScraperConfig';
import { useScraperStats } from './hooks/useScraperStats';
import ScraperDashboard from './components/ScraperDashboard';
import GroupManager from './components/GroupManager';
import DealQueue from './components/DealQueue';
import ScraperStats from './components/ScraperStats';
import ScraperSettings from './components/ScraperSettings';

export default function WhatsAppScraperPage() {
  const { groups, loading: groupsLoading, error: groupsError, toggleGroup, refreshGroups } = useScraperGroups();
  const { deals, loading: dealsLoading, error: dealsError, approveDeal, rejectDeal, submitDeal, bulkApprove, bulkReject } = useScraperDeals();
  const { config, loading: configLoading, error: configError, updateConfig } = useScraperConfig();
  const stats = useScraperStats(deals);

  const activeGroups = groups.filter(g => g.is_active).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Deal Scanner</h1>
        <p className="text-[14px] text-[#6B7280] mt-1">
          Monitor and manage deals scraped from WhatsApp groups
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-[#F3F3EE] border border-[#E5E7EB]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="deals">Deal Queue</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ScraperDashboard
            dealsToday={stats.dealsToday}
            dealsThisWeek={stats.dealsThisWeek}
            activeGroups={activeGroups}
            totalGroups={groups.length}
            byDay={stats.byDay}
            topGroups={stats.byGroup.slice(0, 5)}
          />
        </TabsContent>

        <TabsContent value="groups">
          <GroupManager
            groups={groups}
            loading={groupsLoading}
            error={groupsError}
            onToggleGroup={toggleGroup}
            onRefresh={refreshGroups}
          />
        </TabsContent>

        <TabsContent value="deals">
          <DealQueue
            deals={deals}
            loading={dealsLoading}
            error={dealsError}
            onApprove={approveDeal}
            onReject={rejectDeal}
            onSubmit={submitDeal}
            onBulkApprove={bulkApprove}
            onBulkReject={bulkReject}
          />
        </TabsContent>

        <TabsContent value="stats">
          <ScraperStats
            dealsToday={stats.dealsToday}
            dealsThisWeek={stats.dealsThisWeek}
            dealsThisMonth={stats.dealsThisMonth}
            totalApproved={stats.totalApproved}
            totalRejected={stats.totalRejected}
            approvalRate={stats.approvalRate}
            uniquePhones={stats.uniquePhones}
            byGroup={stats.byGroup}
            byCity={stats.byCity}
            byPropertyType={stats.byPropertyType}
            byDay={stats.byDay}
            totalDeals={deals.length}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ScraperSettings
            config={config}
            loading={configLoading}
            error={configError}
            onSave={updateConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
