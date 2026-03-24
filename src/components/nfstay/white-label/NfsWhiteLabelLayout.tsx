import { Outlet, Link } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { Mail, Phone, MessageCircle } from 'lucide-react';

export default function NfsWhiteLabelLayout() {
  const { operator, loading, error } = useNfsWhiteLabel();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-background">
        <h1 className="text-2xl font-bold">Storefront not found</h1>
        <p className="text-sm text-muted-foreground">
          This domain is not linked to an active storefront.
        </p>
      </div>
    );
  }

  const accentColor = operator.accent_color || '#2563eb';

  return (
    <div data-feature="BOOKING_NFSTAY__WHITE_LABEL" className="min-h-screen flex flex-col bg-background" style={{ '--nfs-accent': accentColor } as React.CSSProperties}>
      {/* Header */}
      <header className="border-b border-border/40 bg-white dark:bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {operator.logo_url ? (
              <img
                src={operator.logo_url}
                alt={operator.logo_alt || operator.brand_name || ''}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-lg font-bold" style={{ color: accentColor }}>
                {operator.brand_name || 'Vacation Rentals'}
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
            {operator.contact_email && (
              <a href={`mailto:${operator.contact_email}`} className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
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
            <div>
              <h4 className="font-semibold text-sm mb-2">
                {operator.brand_name || 'Vacation Rentals'}
              </h4>
              {operator.about_bio && (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {operator.about_bio}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Contact</h4>
              <div className="space-y-1.5">
                {operator.contact_email && (
                  <a href={`mailto:${operator.contact_email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Mail className="w-3.5 h-3.5" /> {operator.contact_email}
                  </a>
                )}
                {operator.contact_phone && (
                  <a href={`tel:${operator.contact_phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Phone className="w-3.5 h-3.5" /> {operator.contact_phone}
                  </a>
                )}
                {operator.contact_whatsapp && (
                  <a href={`https://wa.me/${operator.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Links</h4>
              <div className="space-y-1.5">
                {operator.social_instagram && (
                  <a href={operator.social_instagram} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground">Instagram</a>
                )}
                {operator.social_facebook && (
                  <a href={operator.social_facebook} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground">Facebook</a>
                )}
                {operator.airbnb_url && (
                  <a href={operator.airbnb_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground">Airbnb</a>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by <a href="https://nfstay.app" className="hover:underline" target="_blank" rel="noopener noreferrer">nfstay</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
