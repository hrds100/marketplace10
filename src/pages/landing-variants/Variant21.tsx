import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V8: Social proof heavy — investment theme, testimonials-first hero
export default function Variant08() {
  return (
    <div className="bg-[#111827]">
      <NavBar theme="investment" />
      <Section className="bg-[#111827] pt-16 md:pt-24 pb-8">
        <SR>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-lg">★</span>)}
              <span className="text-[#9CA3AF] text-sm ml-2">4.8 · Excellent</span>
            </div>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-white md:text-6xl md:leading-[1.1]">
              Trusted by <span className="text-[#22C55E]">4,200+</span> UK operators
            </h1>
            <p className="mt-5 text-lg text-[#9CA3AF] max-w-xl mx-auto">Join thousands of rent-to-rent operators, JV investors, and short-let entrepreneurs building profitable property businesses with NFsTay.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Join NFsTay Free</PillButton>
              <PillButton variant="outline-light" className="px-8 py-3.5 text-base">Read Success Stories</PillButton>
            </div>
            <p className="mt-6 text-sm text-[#9CA3AF]">Joined by 47 operators this month</p>
          </div>
        </SR>
      </Section>
      <TestimonialsSection theme="investment" headline="What our members say" />
      <StatsBar theme="investment" />
      <DealsSection theme="investment" />
      <JVSection theme="investment" />
      <BookingSiteSection theme="investment" />
      <CRMSection theme="investment" />
      <UniversitySection theme="investment" />
      <AffiliateSection theme="investment" />
      <PricingSection theme="investment" />
      <FAQSection theme="investment" />
      <CTABand headline="Join 4,200+ operators on NFsTay" sub="Start free. See why thousands trust us." />
      <FooterSection theme="investment" />
    </div>
  );
}
