// NFStay main site landing page — nfstay.app/
// Sections: Hero → Popular Destinations → Featured Properties → Reviews → About → List CTA → Services → FAQs
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CircleCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useNfsPropertySearch } from '@/hooks/nfstay/use-nfs-property-search';
import NfsPropertyCard from '@/components/nfstay/properties/NfsPropertyCard';
import NfsHeroSearch from '@/components/nfstay/main-site/NfsHeroSearch';
import NfsPopularDestinations from '@/components/nfstay/main-site/NfsPopularDestinations';
import NfsReviewScroller from '@/components/nfstay/main-site/NfsReviewScroller';

// ─────────────────────────────────────────────
// Static content (ported from VPS TravalerData/Data + traveler/page.tsx)
// ─────────────────────────────────────────────
const SERVICES = [
  'Free booking website with your custom domain and design',
  'Secure payment processing for every booking',
  'Calendar syncing across all your platforms',
  'Guest messaging via WhatsApp, email, or your preferred app',
  'Host dashboard to fully control reservations, pricing, and analytics',
];

const FAQS = [
  {
    question: 'What is NFsTay?',
    answer:
      'NFsTay is a platform that connects travelers and hosts for direct bookings, without middlemen or high OTA fees.',
  },
  {
    question: 'How much does it cost to host?',
    answer:
      "It's completely free to create your NFsTay site. We only charge a 3% fee per booking.",
  },
  {
    question: 'What are the benefits of booking directly?',
    answer:
      'You get the best rates, direct communication with hosts, and no service fees.',
  },
  {
    question: 'Do I need technical skills to host?',
    answer:
      'Not at all. NFsTay builds your booking site automatically — you just upload photos, pricing, and details.',
  },
  {
    question: 'How do payouts work?',
    answer: 'Payments go directly to your connected account after guest check-in.',
  },
  {
    question: 'What payment options are supported?',
    answer:
      'Guests can pay with credit or debit card, Apple Pay, Google Pay, or crypto.',
  },
  {
    question: 'Can I customise my booking site?',
    answer:
      'Yes, you can add your logo, change colours, and connect your own domain.',
  },
  {
    question: 'What is the cancellation policy?',
    answer:
      'Hosts choose their own policy — flexible, moderate, or strict — visible before guests book.',
  },
];

// ─────────────────────────────────────────────
// Main landing page
// ─────────────────────────────────────────────
export default function NfsMainLanding() {
  const navigate = useNavigate();
  const { results, loading, search } = useNfsPropertySearch();

  // Load all listed properties on mount for featured section
  useEffect(() => {
    search({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-16 lg:pb-0">
      {/* ── Hero ─────────────────────────────────── */}
      <NfsHeroSearch />

      {/* ── Popular Destinations ─────────────────── */}
      <NfsPopularDestinations />

      {/* ── Featured Properties ───────────────────── */}
      <section id="Featured" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover the extraordinary. Your dream stay awaits in our featured
              properties.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No properties yet
              </h3>
              <p className="text-gray-600 mb-6">
                Check back soon for amazing properties!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.slice(0, 8).map((property) => (
                  <NfsPropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => navigate(`/property/${property.id}`)}
                  />
                ))}
              </div>
              <div className="text-center mt-12">
                <button
                  onClick={() => navigate('/search')}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 text-white font-medium rounded-full transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  View All Properties
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────── */}
      <NfsReviewScroller />

      {/* ── About ─────────────────────────────────── */}
      <section id="About" className="container mx-auto px-4 pt-12 md:pt-16 lg:pt-20 mt-10">
        <div className="grid sm:gap-8 md:grid-cols-2 md:gap-12 lg:gap-16 bg-[#f0f3f7] md:p-10 p-6 rounded-2xl">
          {/* Gradient placeholder — swap for <img src="/family.jpg" /> if asset is available */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gradient-to-br from-purple-100 to-teal-100 flex items-center justify-center">
            <span className="text-5xl">🏡</span>
          </div>
          <div className="space-y-8 mt-4 sm:mt-8">
            <h2 className="text-4xl font-bold tracking-tight md:text-3xl sm:text-2xl">
              About us
            </h2>
            <div className="space-y-6 text-black font-medium text-sm sm:text-lg max-w-xl">
              <p>
                At NFsTay, we're redefining how travelers book and how hosts
                earn. NFsTay is a direct booking platform that connects guests
                with verified hosts — no middlemen, no extra fees.
              </p>
              <p>
                Travelers can discover unique properties and book directly, while
                hosts can create their own booking sites for free and only pay a
                3% commission per booking. We believe in fair, transparent,
                people-first travel — where both guests and hosts win.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── List Your Property CTA ────────────────── */}
      <section className="bg-[#984cfc] mt-32 py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-semibold mb-4">List Your Property</h2>
          <p className="text-sm font-medium mb-4 leading-relaxed">
            Create your direct booking site in minutes with NFsTay — it's free.
            Manage your listings, sync calendars, accept payments, and
            communicate with guests all in one place.
          </p>
          <p className="text-sm font-medium leading-relaxed mb-8">
            There are no setup or monthly fees — only a small 3% commission per
            booking. You stay in control: your brand, your guests, your income.
          </p>
          <a
            href="https://hub.nfstay.com/nfstay"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-3 bg-white text-purple-700 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-lg"
          >
            Get Started Free
          </a>
        </div>
      </section>

      {/* ── Services ──────────────────────────────── */}
      <section className="container mx-auto px-4 py-12 md:py-16 lg:py-20 mt-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Services included
            </h2>
            <ul className="space-y-4 w-full max-w-xl">
              {SERVICES.map((service) => (
                <li
                  key={service}
                  className="flex items-center gap-2 w-full rounded-3xl bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm border"
                >
                  <CircleCheck className="h-6 w-6 text-white shrink-0 fill-emerald-500" />
                  <span className="text-sm font-medium text-black">{service}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Gradient placeholder — swap for <img src="/service.png" /> if asset is available */}
          <div className="relative overflow-hidden rounded-xl aspect-video bg-gradient-to-br from-purple-50 to-teal-50 flex items-center justify-center">
            <span className="text-7xl">🌆</span>
          </div>
        </div>
      </section>

      {/* ── FAQs ──────────────────────────────────── */}
      <div id="Faq" className="max-w-3xl mx-auto px-4 py-16 mt-10">
        <h2 className="text-4xl font-bold text-center mb-10">General FAQs</h2>
        <div className="w-full space-y-4">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FAQ accordion item
// ─────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-lg transition-colors duration-200 ${open ? 'bg-[#f0f3f7]' : 'bg-white'} border border-gray-200`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:no-underline"
      >
        <span className="font-semibold text-base text-left">{question}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600">{answer}</p>
        </div>
      )}
    </div>
  );
}
