// NFStay main site footer — shown on nfstay.app
import { Link } from 'react-router-dom';

export default function NfsMainFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#f0f3f7] mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Logo */}
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            NFsTay
          </span>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-5 text-sm font-medium text-gray-600">
            <a href="#Featured" className="hover:text-purple-600 transition-colors">
              Featured
            </a>
            <a href="#About" className="hover:text-purple-600 transition-colors">
              About
            </a>
            <a
              href="https://hub.nfstay.com/nfstay"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition-colors"
            >
              List Your Property
            </a>
            <a href="#Faq" className="hover:text-purple-600 transition-colors">
              FAQ
            </a>
            <Link to="/search" className="hover:text-purple-600 transition-colors">
              Search
            </Link>
          </nav>
        </div>

        <div className="mt-6 text-center text-sm font-semibold text-gray-800">
          © {year} NFsTay — All rights reserved. &nbsp;
          <span className="font-normal text-gray-500">
            Direct bookings. No middlemen.
          </span>
        </div>
      </div>
    </footer>
  );
}
