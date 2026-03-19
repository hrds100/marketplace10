// NFStay Main Site Layout — nfstay.app traveler-facing layout
// Header with NFStay branding + nav, content area, footer
// Mirrors the NfsWhiteLabelLayout structure but with platform branding

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Home, Search, CalendarDays, LogOut, User } from 'lucide-react';

export default function NfsMainSiteLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch {
      // Ignore — auth state listener handles cleanup
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-white dark:bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#2563eb]" />
            <span className="text-lg font-bold text-[#2563eb]">NFStay</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/search"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-4 h-4 hidden sm:block" />
              Properties
            </Link>

            {user && (
              <Link
                to="/reservations"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <CalendarDays className="w-4 h-4 hidden sm:block" />
                My Bookings
              </Link>
            )}

            {/* Auth */}
            {authLoading ? (
              <div className="w-20 h-8 bg-muted/30 rounded animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[140px]">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/signup')}
                className="text-sm"
              >
                <User className="w-4 h-4 mr-1" />
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand */}
            <div>
              <h4 className="font-semibold text-sm mb-2 text-[#2563eb]">NFStay</h4>
              <p className="text-xs text-muted-foreground">
                Find and book vacation rentals directly from property managers. No middlemen, no hidden fees.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Explore</h4>
              <div className="space-y-1.5">
                <Link to="/search" className="block text-xs text-muted-foreground hover:text-foreground">
                  Browse Properties
                </Link>
                <Link to="/search" className="block text-xs text-muted-foreground hover:text-foreground">
                  Search by Location
                </Link>
              </div>
            </div>

            {/* For operators */}
            <div>
              <h4 className="font-semibold text-sm mb-2">For Property Managers</h4>
              <div className="space-y-1.5">
                <a
                  href="https://hub.nfstay.com/nfstay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-muted-foreground hover:text-foreground"
                >
                  Operator Dashboard
                </a>
                <a
                  href="https://hub.nfstay.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-muted-foreground hover:text-foreground"
                >
                  List Your Property
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} NFStay. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
