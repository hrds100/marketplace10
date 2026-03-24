// White-label landing page — operator's branded storefront homepage
import { useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function NfsWlLanding() {
  const navigate = useNavigate();
  const { operator } = useNfsWhiteLabel();

  if (!operator) return null;

  const faqs = Array.isArray(operator.faqs) ? operator.faqs as { question: string; answer: string }[] : [];

  return (
    <div data-feature="BOOKING_NFSTAY__WHITE_LABEL">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center py-24 px-4"
        style={{
          backgroundImage: operator.hero_photo
            ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${operator.hero_photo})`
            : undefined,
          backgroundColor: operator.hero_photo ? undefined : (operator.accent_color || '#2563eb'),
        }}
      >
        <div className="max-w-3xl mx-auto text-center text-white">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {operator.hero_headline || `Welcome to ${operator.brand_name || 'our vacation rentals'}`}
          </h1>
          {operator.hero_subheadline && (
            <p className="text-lg md:text-xl opacity-90 mb-8">
              {operator.hero_subheadline}
            </p>
          )}
          <Button
            size="lg"
            onClick={() => navigate('/search')}
            className="text-base px-8"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Properties
          </Button>
        </div>
      </section>

      {/* About Section */}
      {operator.about_bio && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2 items-center">
            {operator.about_photo && (
              <div className="rounded-xl overflow-hidden">
                <img
                  src={operator.about_photo}
                  alt={operator.brand_name || 'About us'}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}
            <div className={operator.about_photo ? '' : 'md:col-span-2 text-center'}>
              <h2 className="text-2xl font-bold mb-4">About Us</h2>
              <p className="text-muted-foreground whitespace-pre-line">{operator.about_bio}</p>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="py-16 px-4 bg-muted/20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <FaqItem key={i} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to book?</h2>
        <p className="text-muted-foreground mb-6">Browse our available properties and find your perfect stay.</p>
        <Button size="lg" onClick={() => navigate('/search')}>
          View All Properties
        </Button>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/40 bg-background">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium">{question}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
