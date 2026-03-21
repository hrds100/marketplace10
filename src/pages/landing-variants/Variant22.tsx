import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V9: Minimal typography — dark premium, text-focused, almost no visuals
export default function Variant09() {
  return (
    <div className="bg-[#0A0E0D]">
      <NavBar theme="dark" />
      <Section className="bg-[#0A0E0D] pt-24 md:pt-36 pb-16">
        <SR>
          <div className="max-w-4xl">
            <h1 className="font-playfair text-5xl font-medium tracking-tight text-white md:text-7xl md:leading-[1.05] italic">
              Rent-to-rent,<br />simplified.
            </h1>
            <p className="mt-8 text-xl text-[#9CA3AF] max-w-2xl leading-relaxed">
              NFsTay is the marketplace where UK property operators find verified deals, invest in short-lets, manage their pipeline, and build direct booking sites — all from one account.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <PillButton variant="primary" className="px-10 py-4 text-base">Browse Deals</PillButton>
              <PillButton variant="outline-light" className="px-10 py-4 text-base">Learn More</PillButton>
            </div>
          </div>
        </SR>
      </Section>
      <DealsSection theme="dark" />
      <JVSection theme="dark" />
      <BookingSiteSection theme="dark" />
      <CRMSection theme="dark" />
      <UniversitySection theme="dark" />
      <AffiliateSection theme="dark" />
      <TestimonialsSection theme="dark" />
      <StatsBar theme="dark" />
      <PricingSection theme="dark" />
      <FAQSection theme="dark" />
      <CTABand headline="Start building your property business" />
      <FooterSection theme="dark" />
    </div>
  );
}
