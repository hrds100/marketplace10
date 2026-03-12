import { Outlet } from 'react-router-dom';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(210 20% 98%)' }}>
      <DashboardSidebar />
      <main className="md:ml-56 pb-20 md:pb-8">
        <div className="max-w-[1440px] mx-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
