import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Star, Shield, CreditCard, Globe, Clock, MessageCircle, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NfsHeroSearch } from "@/components/nfstay/main-site/NfsHeroSearch";
import { NfsPropertyCard } from "@/components/nfstay/main-site/NfsPropertyCard";
import { mockProperties } from "@/data/nfstay/mock-properties";
import { mockDestinations } from "@/data/nfstay/mock-destinations";
import { mockTestimonials } from "@/data/nfstay/mock-reservations";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRecentlyViewed } from "@/hooks/nfstay/useRecentlyViewed";

const faqs = [
  { q: 'How does booking work?', a: 'Search for your ideal property, select your dates and guests, then complete booking with secure payment via Stripe. You\'ll receive instant confirmation.' },
  { q: 'What is your cancellation policy?', a: 'Each property sets its own cancellation policy \u2014 Flexible, Moderate, Strict, or Non-refundable. Check the property listing for details before booking.' },
  { q: 'How do I list my property?', a: 'Sign up as an operator, complete the onboarding wizard, and add your property details including photos, pricing, and availability. It takes about 10 minutes.' },
  { q: 'Are payments secure?', a: 'All payments are processed through Stripe, a PCI-compliant payment processor. Your card details are never stored on our servers.' },
  { q: 'Can I contact the host before booking?', a: 'Yes! Each listing includes a message option to contact the host with any questions before you book.' },
  { q: 'What if something goes wrong during my stay?', a: 'Our support team is available to help resolve any issues. Contact us through the booking details page or email support@nfstay.app.' },
  { q: 'How does the white-label feature work?', a: 'Operators can create a branded booking website on their own subdomain (yourname.nfstay.app) or custom domain. Guests book directly with no nfstay branding visible.' },
  { q: 'What is Hospitable integration?', a: 'Hospitable integration allows property managers to sync their listings and calendars across multiple platforms, avoiding double bookings and manual updates.' },
];

export default function NfsMainLanding() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);

  const scrollDestinations = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const scrollTestimonials = (dir: number) => {
    testimonialRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };

  const featuredProperties = mockProperties.slice(0, 8);
  const { recentIds } = useRecentlyViewed();
  const recentProperties = recentIds.map(id => mockProperties.find(p => p.id === id)).filter(Boolean);

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop"
            alt="Luxury vacation property"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-20 text-center">
          <span className="inline-block bg-primary/20 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4 backdrop-blur-sm border border-primary/30">
            \u2728 Book direct. Save more.
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Your next stay,<br />booked direct
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Discover handpicked vacation rentals from verified hosts. No middlemen, no hidden fees \u2014 just incredible stays.
          </p>

          <div className="max-w-3xl mx-auto">
            <NfsHeroSearch />
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentProperties.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Recently Viewed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recentProperties.slice(0, 4).map((p) => (
              <NfsPropertyCard key={p!.id} property={p!} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Popular Destinations</h2>
          <div className="flex gap-2">
            <button onClick={() => scrollDestinations(-1)} className="p-2 rounded-lg hover:bg-secondary border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollDestinations(1)} className="p-2 rounded-lg hover:bg-secondary border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none' }}>
          {mockDestinations.map((dest) => (
            <button
              key={dest.city}
              onClick={() => navigate(`/search?query=${dest.city}`)}
              className="flex-shrink-0 w-48 group relative rounded-2xl overflow-hidden"
            >
              <img src={dest.image} alt={dest.city} className="w-48 h-56 object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-semibold text-sm">{dest.city}</p>
              </div>
              <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {dest.propertyCount} properties
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Featured Properties</h2>
          <Button variant="link" onClick={() => navigate('/search')} className="text-primary">
            View all &rarr;
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredProperties.map((p) => (
            <NfsPropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-center mb-10">Simple, transparent, direct</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: 'Find your perfect stay', desc: 'Browse curated properties in top destinations. Use filters to narrow your search by type, price, and amenities.' },
            { icon: CreditCard, title: 'Book securely', desc: 'Book with confidence through Stripe\'s secure payment system. No hidden charges or surprise fees.' },
            { icon: Star, title: 'Enjoy your trip', desc: 'Check in smoothly with all the details you need. Direct communication with your host throughout.' },
          ].map((item) => (
            <div key={item.title} className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-md hover:border-primary/30 hover:-translate-y-px transition-all duration-200">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why nfstay */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10">Why book direct with nfstay?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Verified hosts', desc: 'Every operator is verified before their properties go live.' },
              { icon: CreditCard, title: 'No hidden fees', desc: 'What you see is what you pay. Transparent pricing always.' },
              { icon: Globe, title: 'Global properties', desc: 'Unique stays in top destinations across the world.' },
              { icon: Clock, title: 'Instant confirmation', desc: 'Book and get confirmed instantly. No waiting.' },
              { icon: MessageCircle, title: 'Direct communication', desc: 'Chat directly with your host before and during your stay.' },
              { icon: Headphones, title: '24/7 support', desc: 'Our team is here to help whenever you need assistance.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">What our guests say</h2>
          <div className="flex gap-2">
            <button onClick={() => scrollTestimonials(-1)} className="p-2 rounded-lg hover:bg-secondary border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollTestimonials(1)} className="p-2 rounded-lg hover:bg-secondary border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={testimonialRef} className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {mockTestimonials.map((t, i) => (
            <div key={i} className="flex-shrink-0 w-80 bg-card border border-border rounded-2xl p-6">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground mb-4 line-clamp-4">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-center mb-8">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-primary rounded-3xl p-10 md:p-16 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-3">Ready to list your property?</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">Join hundreds of operators already using nfstay to accept direct bookings.</p>
          <Button size="lg" variant="secondary" className="rounded-xl font-semibold" onClick={() => navigate('/signup')}>
            Get started free
          </Button>
        </div>
      </section>
    </div>
  );
}
