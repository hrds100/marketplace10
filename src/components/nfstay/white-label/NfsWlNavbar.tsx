// White-label navbar — matches VPS WhiteLabelNavbar
// Sticky top, logo + search bar + contact + Book Now + mobile hamburger
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import NfsWlContactModal from './NfsWlContactModal';
import { Phone, Menu, X, Search, House } from 'lucide-react';

export default function NfsWlNavbar() {
  const { operator } = useNfsWhiteLabel();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  if (!operator) return null;

  const accentColor = operator.accent_color || '#6366f1';
  const brandName = operator.brand_name || 'Vacation Rentals';
  const isSearchPage = location.pathname.includes('/search');
  const isPropertyPage = location.pathname.includes('/property/');
  const firstChar = brandName.charAt(0).toUpperCase();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const LogoFallback = () => (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
      style={{ backgroundColor: accentColor }}
    >
      {firstChar}
    </div>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-full xl:px-10 md:px-5 sm:px-4 px-3">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              {operator.logo_url && !logoError ? (
                <>
                  {logoLoading && (
                    <div className="h-10 w-10 rounded-lg animate-pulse bg-gray-200" />
                  )}
                  <img
                    src={operator.logo_url}
                    alt={operator.logo_alt || brandName}
                    className="h-[50px] w-auto object-contain"
                    style={{ display: logoLoading ? 'none' : 'block' }}
                    onLoad={() => setLogoLoading(false)}
                    onError={() => {
                      setLogoError(true);
                      setLogoLoading(false);
                    }}
                  />
                </>
              ) : (
                <LogoFallback />
              )}
            </Link>

            {/* Search bar — only on search route */}
            {isSearchPage && (
              <form
                onSubmit={handleSearchSubmit}
                className="hidden md:flex flex-1 max-w-[800px] mx-6"
              >
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  />
                </div>
              </form>
            )}

            {/* Right side — desktop */}
            <div className="hidden md:flex items-center gap-3">
              {/* Contact button */}
              <button
                onClick={() => setContactOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Contact</span>
              </button>

              {/* Book Now — hidden on property page */}
              {!isPropertyPage && (
                <Link
                  to="/search"
                  className="px-5 py-2 rounded-full text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: accentColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Book Now
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <House className="w-4 h-4" />
                Home
              </Link>

              {operator.about_bio && (
                <Link
                  to="/#about"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  About
                </Link>
              )}

              <div className="border-t border-gray-100 my-2" />

              {operator.contact_phone && (
                <a
                  href={`tel:${operator.contact_phone}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Phone className="w-4 h-4" />
                  {operator.contact_phone}
                </a>
              )}

              {operator.contact_email && (
                <a
                  href={`mailto:${operator.contact_email}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  {operator.contact_email}
                </a>
              )}

              {/* Book Now CTA */}
              <Link
                to="/search"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-4 py-2.5 rounded-full text-sm font-medium text-white mt-2"
                style={{ backgroundColor: accentColor }}
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </nav>

      <NfsWlContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
