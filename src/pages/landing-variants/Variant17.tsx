import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, HowItWorksSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V4: Booking site builder focus — light SHIPPER, mock browser hero
export default function Variant04() {
  return (
    <div className="bg-[#F8F6F3]">
      <NavBar theme="light" />

      {/* ── Hero ── */}
      <Section className="bg-[#F8F6F3] pt-16 md:pt-24 pb-8">
        <SR>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="font-inter text-4xl font-bold tracking-tight text-[#1C1C1C] md:text-6xl md:leading-[1.1]">
              Stop paying OTA commissions.{' '}
              <span className="font-playfair italic">Go direct.</span>
            </h1>
            <p className="mt-5 text-lg text-[#6B7280] max-w-xl mx-auto">
              Build a branded booking website in minutes. Your logo, your colours, your listings — at yourbrand.nfstay.app. Take bookings directly from guests.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Build Your Site Free</PillButton>
              <PillButton variant="outline" className="px-8 py-3.5 text-base">See Examples</PillButton>
            </div>
          </div>
        </SR>
        <SR delay={200}>
          <div className="max-w-4xl mx-auto rounded-2xl bg-white border border-[#E8E5E0] p-3 shadow-2xl shadow-black/5">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="h-3 w-3 rounded-full bg-red-400/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
              <span className="h-3 w-3 rounded-full bg-green-400/60" />
              <span className="ml-3 rounded-lg bg-[#F8F6F3] px-4 py-1 text-xs text-[#6B7280] flex-1 text-center">yourbrand.nfstay.app</span>
            </div>
            <div className="rounded-xl bg-[#F8F6F3] p-6" style={{ minHeight: 300 }}>
              <div className="flex items-center justify-between mb-6">
                <div className="h-8 w-28 rounded-lg bg-[#22C55E]/20" />
                <div className="flex gap-3">
                  <div className="h-4 w-12 rounded bg-[#E8E5E0]" />
                  <div className="h-4 w-12 rounded bg-[#E8E5E0]" />
                  <div className="h-4 w-16 rounded bg-[#22C55E]/20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl bg-white border border-[#E8E5E0] overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-[#22C55E]/5 to-[#22C55E]/10" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-[#E8E5E0]" />
                      <div className="h-3 w-1/2 rounded bg-[#E8E5E0]" />
                      <div className="h-6 w-20 rounded-full bg-[#22C55E]/15 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SR>
      </Section>

      <BookingSiteSection theme="light" headline="Everything you need to go direct" sub="Custom branding, direct payments, SEO-optimised listings, and zero platform commissions. Your booking site is live in minutes." />
      <StatsBar theme="light" />
      <DealsSection theme="light" headline="Find properties to list" sub="Browse the marketplace for landlord-approved deals, then list them on your own booking site." />
      <JVSection theme="light" />
      <CRMSection theme="light" />
      <UniversitySection theme="light" />
      <AffiliateSection theme="light" />
      <TestimonialsSection theme="light" />
      <HowItWorksSection theme="light" headline="From deal to direct bookings" steps={[
        { step: '01', title: 'Pick a deal', desc: 'Find a landlord-approved property from the marketplace.' },
        { step: '02', title: 'Build your site', desc: 'Create yourbrand.nfstay.app with your logo and colours.' },
        { step: '03', title: 'List your property', desc: 'Add photos, pricing, and availability. Go live instantly.' },
        { step: '04', title: 'Take direct bookings', desc: 'Guests book and pay you directly. No OTA fees.' },
      ]} />
      <PricingSection theme="light" />
      <FAQSection theme="light" />
      <CTABand headline="Your brand. Your guests. Zero commissions." sub="Build your direct booking site today." />
      <FooterSection theme="light" />
    </div>
  );
}
