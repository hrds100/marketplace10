// White-label layout — wraps all white-label pages with themed navbar + footer
import { Outlet, Link } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { useNfsWhiteLabelTheme } from '@/hooks/nfstay/use-nfs-white-label-theme';
import NfsWlNavbar from './NfsWlNavbar';
import NfsWlFooter from './NfsWlFooter';
import { TriangleAlert, RefreshCw } from 'lucide-react';

export default function NfsWhiteLabelLayout() {
  const { operator, loading, error } = useNfsWhiteLabel();
  useNfsWhiteLabelTheme(operator?.accent_color);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <TriangleAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Website Not Available
          </h1>
          <p className="text-gray-600 mb-6">
            This subdomain is not associated with any vacation rental operator.
          </p>
          <ul className="text-sm text-gray-500 text-left space-y-2 mb-8 max-w-xs mx-auto">
            <li>• The website is still being set up</li>
            <li>• The URL was entered incorrectly</li>
            <li>• This is a temporary issue</li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Go to Main Site
            </Link>
          </div>
          <p className="mt-8 text-xs text-gray-400">
            Need help?{' '}
            <a
              href="mailto:support@nfstay.app"
              className="underline hover:text-gray-600"
            >
              support@nfstay.app
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col nfs-wl-themed">
      <NfsWlNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <NfsWlFooter />
    </div>
  );
}
