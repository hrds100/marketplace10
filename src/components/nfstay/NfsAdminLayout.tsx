import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NfsAdminSidebar } from "./NfsAdminSidebar";

export function NfsAdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <NfsAdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card shrink-0">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm font-semibold text-destructive">Admin Portal</span>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
