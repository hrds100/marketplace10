// White-label footer — matches VPS WhiteLabelFooter
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';

export default function NfsWlFooter() {
  const { operator } = useNfsWhiteLabel();

  if (!operator) return null;

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
