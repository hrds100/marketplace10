import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, HowItWorksSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V1: Classic marketplace — light SHIPPER theme, centered hero, deals-first
export default function Variant01() {
  return (
    <div className="bg-[#F8F6F3]">
      <NavBar theme="light" />

      {/* ── Hero ── */}
      <Section className="bg-[#F8F6F3] pt-16 md:pt-24 pb-8">
        <SR>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#22C55E]/10 px-4 py-1.5 text-sm font-medium text-[#22C55E] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> £680 average monthly profit per deal
            </span>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-[#1C1C1C] md:text-6xl md:leading-[1.1]">
              Find landlord-approved<br />
              <span className="font-playfair italic">rent-to-rent deals</span>
            </h1>
            <p className="mt-5 text-lg text-[#6B7280] max-w-xl mx-auto">
              Browse verified Airbnb-ready properties across 10 UK cities. Every deal includes landlord consent, compliance checks, and profit projections.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Browse Live Deals</PillButton>
              <PillButton variant="outline" className="px-8 py-3.5 text-base">See How It Works</PillButton>
            </div>
          </div>
        </SR>
      </Section>

      <StatsBar theme="light" />
      <DealsSection theme="light" />
      <HowItWorksSection theme="light" />
      <JVSection theme="light" />
      <BookingSiteSection theme="light" />
      <CRMSection theme="light" />
      <UniversitySection theme="light" />
      <AffiliateSection theme="light" />
      <TestimonialsSection theme="light" />
      <PricingSection theme="light" />
      <FAQSection theme="light" />
      <CTABand />
      <FooterSection theme="light" />
    </div>
  );
}
