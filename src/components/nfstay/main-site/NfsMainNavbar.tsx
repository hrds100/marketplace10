import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, X, Search, Clock, Users, Hotel, CalendarDays } from "lucide-react";
import { NfsLogo } from "@/components/nfstay/NfsLogo";
import { NfsCurrencySelector } from "./NfsCurrencySelector";
import { Button } from "@/components/ui/button";

export function NfsMainNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const isSearchPage = location.pathname === "/search";
  const isHomePage = location.pathname === "/";

  const handleSearch = () => {
    const p = new URLSearchParams();
    if (query) p.set("query", query);
    navigate(`/search?${p.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <header data-feature="BOOKING_NFSTAY__MAIN_SITE" className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-[1600px] mx-auto flex items-center h-16 px-4 gap-3">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            data-feature="BOOKING_NFSTAY__NAVBAR_MENU"
            className="p-2 rounded-lg hover:bg-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <NfsLogo data-feature="BOOKING_NFSTAY__NAVBAR_LOGO" />
        </div>

        {/* Center: context-dependent */}
        {isHomePage ? (
          /* Homepage: Find a stay / Reservations tabs */
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center bg-secondary/50 rounded-full border border-border px-1 py-1 gap-0.5">
              <Link
                to="/search"
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-card text-primary shadow-sm"
              >
                <Hotel className="w-4 h-4" />
                Find a stay
              </Link>
              <Link
                to="/traveler/reservations"
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Reservations
              </Link>
            </div>
          </div>
        ) : isSearchPage ? (
          /* Search page: inline search bar in the navbar */
          <div className="hidden md:flex items-center justify-center flex-1">
            <div data-feature="BOOKING_NFSTAY__NAVBAR_SEARCH" className="flex items-center border border-border rounded-full bg-background px-2 py-1.5 shadow-sm max-w-2xl w-full">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Where to?"
                  className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground"
                />
              </div>
              <div className="h-6 w-px bg-border" />
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 hover:text-foreground transition-colors whitespace-nowrap">
                <Clock className="w-4 h-4" />
                <span>Any dates...</span>
              </button>
              <div className="h-6 w-px bg-border" />
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 hover:text-foreground transition-colors whitespace-nowrap">
                <Users className="w-4 h-4" />
                <span>1 guest</span>
              </button>
              <Button size="sm" className="rounded-full px-5 ml-1" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: currency + account */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <NfsCurrencySelector />
          <Link
            to="/signin"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg border border-border"
          >
            Account
          </Link>
        </div>

        {/* Mobile: currency + search shortcut */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <NfsCurrencySelector />
          {!isHomePage && (
            <button
              className="p-2 rounded-lg hover:bg-secondary"
              onClick={() => navigate("/search")}
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 space-y-3">
          <Link to="/search" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Find a stay</Link>
          <Link to="/traveler/reservations" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Reservations</Link>
          <Link to="/booking" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Find your booking</Link>
          <hr className="border-border" />
          <Link to="/nfstay" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Operator portal</Link>
          <Link to="/admin/nfstay" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Admin portal</Link>
          <hr className="border-border" />
          <Link to="/signin" className="block text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>Sign in</Link>
          <Button asChild className="w-full rounded-lg" onClick={() => setMobileOpen(false)}>
            <Link to="/signup">List your property</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
