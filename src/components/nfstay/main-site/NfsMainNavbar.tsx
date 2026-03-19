// NFStay main site navbar — shown on nfstay.app for all public pages
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NfsMainNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            NFsTay
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/search" className="hover:text-purple-600 transition-colors">
            Search Properties
          </Link>
          <a href="#About" className="hover:text-purple-600 transition-colors">
            About
          </a>
          <a href="#Faq" className="hover:text-purple-600 transition-colors">
            FAQ
          </a>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://hub.nfstay.com/nfstay"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              className="rounded-full bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 text-white border-0"
            >
              List Your Property
            </Button>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <Link
            to="/search"
            className="block py-2 text-sm font-medium text-gray-700 hover:text-purple-600"
            onClick={() => setMobileOpen(false)}
          >
            Search Properties
          </Link>
          <a
            href="#About"
            className="block py-2 text-sm font-medium text-gray-700 hover:text-purple-600"
            onClick={() => setMobileOpen(false)}
          >
            About
          </a>
          <a
            href="#Faq"
            className="block py-2 text-sm font-medium text-gray-700 hover:text-purple-600"
            onClick={() => setMobileOpen(false)}
          >
            FAQ
          </a>
          <a
            href="https://hub.nfstay.com/nfstay"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              className="w-full rounded-full bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 text-white border-0 mt-2"
            >
              List Your Property
            </Button>
          </a>
        </div>
      )}
    </header>
  );
}
