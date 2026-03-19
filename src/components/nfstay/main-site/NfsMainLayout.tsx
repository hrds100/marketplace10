// Layout wrapper for nfstay.app main site — shared navbar + footer
import { Outlet } from 'react-router-dom';
import NfsMainNavbar from './NfsMainNavbar';
import NfsMainFooter from './NfsMainFooter';

export default function NfsMainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <NfsMainNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <NfsMainFooter />
    </div>
  );
}
