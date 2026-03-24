import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLessons from './AdminLessons';
import AdminModules from './AdminModules';
import AdminUniversityAnalytics from './AdminUniversityAnalytics';

const TABS = ['lessons', 'modules', 'analytics'] as const;
type Tab = typeof TABS[number];

export default function AdminUniversity() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) ?? 'lessons';
  const activeTab = TABS.includes(tab) ? tab : 'lessons';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <Tabs data-feature="ADMIN__UNIVERSITY" value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-6">
        <TabsTrigger value="lessons">Lessons</TabsTrigger>
        <TabsTrigger value="modules">Modules</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="lessons">
        <AdminLessons />
      </TabsContent>
      <TabsContent value="modules">
        <AdminModules />
      </TabsContent>
      <TabsContent value="analytics">
        <AdminUniversityAnalytics />
      </TabsContent>
    </Tabs>
  );
}
