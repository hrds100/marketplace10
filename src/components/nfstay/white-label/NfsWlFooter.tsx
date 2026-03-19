// White-label footer — matches VPS WhiteLabelFooter
// Platform mode: NFStay branding with platform links
import { Link } from 'react-router-dom';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';

export default function NfsWlFooter() {
  const { operator, isPlatform } = useNfsWhiteLabel();

  if (!operator) return null;

  // Platform mode — NFStay branded footer
  if (isPlatform) {
    return (
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-semibold mb-3">NFStay</h3>
              <p className="text-sm text-gray-400">
                Find and book vacation rentals directly from property managers. No middlemen, no hidden fees.
              </p>
            </div>

            {/* Explore */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Explore
              </h4>
              <div className="space-y-2.5">
                <Link
                  to="/search"
                  className="block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Browse Properties
                </Link>
                <Link
                  to="/search"
                  className="block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Search by Location
                </Link>
              </div>
            </div>

            {/* For Property Managers */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                For Property Managers
              </h4>
              <div className="space-y-2.5">
                <a
                  href="https://hub.nfstay.com/nfstay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Operator Dashboard
                </a>
                <a
                  href="https://hub.nfstay.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  List Your Property
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} NFStay. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Operator white-label footer
  const brandName = operator.brand_name || 'Vacation Rentals';
  const hasContact =
    operator.contact_email || operator.contact_phone || operator.contact_whatsapp;
  const hasSocial =
    operator.social_instagram || operator.social_facebook || operator.airbnb_url;

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand + About */}
          <div>
            <h3 className="text-lg font-semibold mb-3">{brandName}</h3>
            {operator.about_bio && (
              <p className="text-sm text-gray-400 line-clamp-3">
                {operator.about_bio}
              </p>
            )}
          </div>

          {/* Contact */}
          {hasContact && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Contact
              </h4>
              <div className="space-y-2.5">
                {operator.contact_email && (
                  <a
                    href={`mailto:${operator.contact_email}`}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {operator.contact_email}
                  </a>
                )}
                {operator.contact_phone && (
                  <a
                    href={`tel:${operator.contact_phone}`}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {operator.contact_phone}
                  </a>
                )}
                {operator.contact_whatsapp && (
                  <a
                    href={`https://wa.me/${operator.contact_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {hasSocial && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Follow Us
              </h4>
              <div className="space-y-2.5">
                {operator.social_instagram && (
                  <a
                    href={operator.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {operator.social_facebook && (
                  <a
                    href={operator.social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {operator.airbnb_url && (
                  <a
                    href={operator.airbnb_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Airbnb
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider + Powered by */}
        <div className="mt-10 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            Powered by{' '}
            <a
              href="https://nfstay.app"
              className="hover:text-gray-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              NFStay
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
