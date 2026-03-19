// White-label landing page — operator's branded storefront homepage
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown, ArrowRight } from 'lucide-react';
import NfsWlFeaturedProperties from '@/components/nfstay/white-label/NfsWlFeaturedProperties';

export default function NfsWlLanding() {
  const navigate = useNavigate();
  const { operator } = useNfsWhiteLabel();
  const [searchQuery, setSearchQuery] = useState('');

  if (!operator) return null; // Layout handles loading/error — this is a safety guard

  const faqs = Array.isArray(operator.faqs)
    ? (operator.faqs as { question: string; answer: string }[])
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center px-4 py-28 md:py-36"
        style={{
          backgroundImage: operator.hero_photo
            ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${operator.hero_photo})`
            : undefined,
          backgroundColor: operator.hero_photo
            ? undefined
            : (operator.accent_color || '#2563eb'),
        }}
      >
        <div className="mx-auto max-w-3xl text-center text-white">
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            {operator.hero_headline ||
              `Welcome to ${operator.brand_name || 'our vacation rentals'}`}
          </h1>
          {operator.hero_subheadline && (
            <p className="mb-8 text-lg opacity-90 md:text-xl">
              {operator.hero_subheadline}
            </p>
          )}

          {/* Inline search bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-xl items-center gap-2 rounded-full bg-white/95 p-1.5 shadow-lg backdrop-blur-sm"
          >
            <div className="flex flex-1 items-center gap-2 pl-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by location, property name..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <Button type="submit" size="sm" className="rounded-full px-5">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Featured Properties */}
      <NfsWlFeaturedProperties />

      {/* About Section */}
      {operator.about_bio && (
        <section className="bg-muted/10 px-4 py-16">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
            {operator.about_photo && (
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <img
                  src={operator.about_photo}
                  alt={operator.brand_name || 'About us'}
                  className="h-72 w-full object-cover md:h-80"
                />
              </div>
            )}
            <div
              className={
                operator.about_photo ? '' : 'text-center md:col-span-2'
              }
            >
              <h2 className="mb-4 text-2xl font-bold">About Us</h2>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                {operator.about_bio}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-2 text-center text-2xl font-bold">
              Frequently Asked Questions
            </h2>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Everything you need to know
            </p>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <FaqItem
                  key={i}
                  question={faq.question}
                  answer={faq.answer}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section
        className="px-4 py-20 text-center"
        style={{
          backgroundColor: operator.accent_color
            ? `${operator.accent_color}08`
            : undefined,
        }}
      >
        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 text-2xl font-bold">Ready to book your stay?</h2>
          <p className="mb-8 text-muted-foreground">
            Browse our available properties and find your perfect getaway.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/search')}
            className="gap-2 px-8 text-base"
          >
            View All Properties
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-background">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-medium">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
