import { Outlet } from "react-router-dom";
import { NfsMainNavbar } from "./NfsMainNavbar";
import { NfsMainFooter } from "./NfsMainFooter";

export default function NfsMainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <NfsMainNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <NfsMainFooter />
    </div>
  );
}
