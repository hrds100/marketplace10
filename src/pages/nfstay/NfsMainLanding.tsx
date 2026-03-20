// NFsTay main site landing page — nfstay.app index
// Public page — no auth required
import { useNavigate } from 'react-router-dom';
import NfsPopularDestinations from '@/components/nfstay/main-site/NfsPopularDestinations';
import NfsReviewScroller from '@/components/nfstay/main-site/NfsReviewScroller';

export default function NfsMainLanding() {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section className="relative min-h-[520px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-purple-600 to-teal-500 px-4">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-3xl mx-auto py-20">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <div className="flex -space-x-2">
              {['#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444'].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: c }}
                >
                  {['G','J','S','O','M'][i]}
                </div>
              ))}
            </div>
            <span className="text-white text-sm font-medium">4,200+ operators trust NFsTay</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Your Airbnb portfolio<br />starts here
          </h1>
          <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-xl mx-auto">
            Join thousands of operators using NFsTay to find and close deals faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/booking')}
              className="px-8 py-4 bg-white text-purple-700 font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-base"
            >
              Find My Booking
            </button>
            <button
              onClick={() => navigate('/nfstay')}
              className="px-8 py-4 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-2xl hover:bg-white/25 transition-all duration-200 text-base"
            >
              List Your Property
            </button>
          </div>

          <p className="mt-6 text-white/60 text-sm">
            ✓ Fully authorised properties, ready for Airbnb income
          </p>
        </div>
      </section>

      {/* ── Popular Destinations (hidden when no properties) ── */}
      <NfsPopularDestinations />

      {/* ── Reviews ── */}
      <NfsReviewScroller />

      {/* ── Operator CTA ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to list your property?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Create your booking site in minutes. No commission. Direct bookings only.
          </p>
          <button
            onClick={() => navigate('/nfstay')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-teal-500 text-white font-semibold rounded-2xl shadow-lg hover:opacity-90 hover:scale-105 transition-all duration-200 text-base"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Bottom padding for mobile bottom nav */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
