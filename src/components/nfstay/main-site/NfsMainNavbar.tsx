// NFStay main site navbar — exact port of VPS Navbar.tsx
// Pill switcher (Search / Bookings), mobile bottom bar, hamburger menu
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, CircleX } from 'lucide-react';

const NAV_LINKS = [
  { href: '#Featured', label: 'Featured' },
  { href: '#Reviews', label: 'Reviews' },
  { href: '#About', label: 'About' },
  { href: '#Faq', label: 'FAQ' },
];

export default function NfsMainNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSearchPage = location.pathname === '/search';
  const navMode = location.pathname === '/search' ? 'search' : 'home';

  // Close menus on route change
  useEffect(() => {
    setSidebarOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* ── Main navbar ── */}
      <nav className={`sticky top-0 left-0 right-0 w-full h-16 sm:h-20 bg-white z-50`}>
        <div className="max-w-full mx-auto xl:px-10 md:px-10 sm:px-4 px-3 h-full">
          <div
            className={`${isSearchPage ? 'flex justify-between items-center' : 'grid grid-cols-3'} h-full gap-2 sm:gap-3 md:gap-0`}
          >
            {/* ── Logo ── */}
            <div className={`flex items-center gap-2 sm:gap-4 ${isSearchPage ? 'hidden lg:flex' : 'flex'}`}>
              <Link to="/" className="flex flex-row flex-0 pt-1.5">
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent ml-1">
                  NFsTay
                </span>
              </Link>
            </div>

            {/* ── Desktop pill switcher (hidden on search) ── */}
            {!isSearchPage && (
              <div className="hidden lg:flex items-center justify-center">
                <div className="relative bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-full p-1.5 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-300 group">
                  {/* Sliding background */}
                  <div
                    className={`absolute top-1.5 h-[calc(100%-12px)] bg-gradient-to-r from-purple-600 to-teal-500 rounded-full transition-all duration-500 ease-out shadow-sm ${
                      navMode === 'search' ? 'left-1.5 w-[calc(50%-6px)]' : 'left-[calc(50%+3px)] w-[calc(50%-6px)]'
                    }`}
                  />
                  <button
                    onClick={() => navigate('/search')}
                    className={`relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] transform hover:scale-105 ${
                      navMode === 'search' ? 'text-white' : 'text-gray-600 hover:text-purple-600'
                    }`}
                  >
                    <span className="hidden xl:inline">Search Properties</span>
                    <span className="xl:hidden">Search</span>
                  </button>
                  <button
                    onClick={() => navigate('/booking')}
                    className={`relative z-10 px-4 xl:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[120px] xl:min-w-[140px] transform hover:scale-105 ${
                      navMode === 'home' ? 'text-white' : 'text-gray-600 hover:text-purple-600'
                    }`}
                  >
                    <span className="hidden xl:inline">My Reservations</span>
                    <span className="xl:hidden">Bookings</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Right actions ── */}
            <div className={`items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 ${isSearchPage ? 'hidden lg:flex' : 'flex ml-auto'}`}>
              <div className="hidden lg:flex items-center gap-2 lg:gap-3">
                <a
                  href="mailto:hello@nfstay.com"
                  className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Contact
                </a>
              </div>

              <a
                href="https://hub.nfstay.com/nfstay"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full hover:opacity-90 transition-opacity"
              >
                List Your Property
              </a>

              {/* Hamburger (left sidebar trigger) */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile right drawer ── */}
        <div
          className={`fixed inset-y-0 right-0 w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-lg shadow-2xl transform transition-transform duration-300 ease-in-out z-40 border-l border-gray-200/50 ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } md:hidden`}
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 py-4 sm:py-6">
              <div className="px-4 sm:px-6 mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Menu</h3>
              </div>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center py-2.5 sm:py-3 px-4 sm:px-6 text-sm sm:text-base font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200 border-l-2 border-transparent hover:border-purple-500"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="border-t border-gray-100 bg-gradient-to-r from-purple-50/50 to-green-50/50 py-4 sm:py-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
              <a
                href="https://hub.nfstay.com/nfstay"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full px-4 py-3 font-medium bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl hover:opacity-90 transition-opacity duration-200 shadow-lg text-center"
              >
                List Your Property
              </a>
              <a
                href="mailto:hello@nfstay.com"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full px-4 py-3 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-gray-700 text-center"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>

        {/* Mobile right drawer overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-gradient-to-br from-purple-900/30 via-black/40 to-green-900/30 backdrop-blur-sm md:hidden z-30 animate-in fade-in duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </nav>

      {/* ── Left sidebar ── */}
      <div
        className={`fixed top-0 left-0 h-full w-[240px] sm:w-[300px] bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex justify-between items-center">
          <span className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Explore</span>
          <CircleX
            onClick={() => setSidebarOpen(false)}
            className="cursor-pointer text-gray-600 hover:text-gray-900 w-5 h-5"
          />
        </div>
        <div className="border-t border-gray-100" />
        <div className="p-4">
          {[
            { name: 'Find Stays', desc: 'Browse vacation rentals', href: '/search' },
            { name: 'List Property', desc: 'Create your booking site free', href: 'https://hub.nfstay.com/nfstay' },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={() => setSidebarOpen(false)}
              className="mt-6 block cursor-pointer hover:bg-[#f0f0ed] p-2 hover:rounded-lg"
            >
              <h1 className="font-semibold text-base">{item.name}</h1>
              <p className="text-[#737373] font-medium text-sm">{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-[39]" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Mobile bottom pill nav (exact VPS match) ── */}
      <div className="fixed bottom-0 left-0 right-0 shadow-lg z-40 lg:hidden">
        <div className="flex items-center justify-center p-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm w-full max-w-[300px]">
            <button
              onClick={() => navigate('/search')}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                navMode === 'search'
                  ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => navigate('/booking')}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                navMode === 'home'
                  ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Bookings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
