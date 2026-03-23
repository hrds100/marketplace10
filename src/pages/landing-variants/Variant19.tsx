import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V6: Affiliate/Agent-first — light SHIPPER, earnings-focused hero
export default function Variant06() {
  return (
    <div className="bg-[#F8F6F3]">
      <NavBar theme="light" />
      <Section className="bg-[#F8F6F3] pt-16 md:pt-24 pb-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <SR>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-[#1C1C1C] md:text-5xl md:leading-[1.1]">
              Share nfstay.{' '}<span className="font-playfair italic">Earn commission.</span>
            </h1>
            <p className="mt-5 text-lg text-[#6B7280] max-w-lg">Become an nfstay Agent. Earn 20% recurring on subscriptions, 5% on JV investments, and £50 per closed deal. No cap on earnings.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Become an Agent</PillButton>
              <PillButton variant="outline" className="px-8 py-3.5 text-base">See Commission Tiers</PillButton>
            </div>
          </SR>
          <SR delay={200}>
            <div className="rounded-2xl bg-white border border-[#E8E5E0] p-6 shadow-xl shadow-black/5">
              <p className="text-[#6B7280] text-sm mb-1">Your referral earnings</p>
              <p className="text-3xl font-bold text-[#22C55E] font-inter mb-4">£3,240</p>
              <div className="space-y-2">
                {[{ m: 'Jan', v: 420 },{ m: 'Feb', v: 580 },{ m: 'Mar', v: 640 },{ m: 'Apr', v: 510 },{ m: 'May', v: 720 },{ m: 'Jun', v: 370 }].map(d => (
                  <div key={d.m} className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7280] w-8">{d.m}</span>
                    <div className="flex-1 h-5 rounded-full bg-[#F8F6F3] overflow-hidden"><div className="h-full rounded-full bg-[#22C55E]/80" style={{ width: `${(d.v / 720) * 100}%` }} /></div>
                    <span className="text-xs font-medium text-[#1C1C1C] w-10 text-right">£{d.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </SR>
        </div>
      </Section>
      <AffiliateSection theme="light" headline="Three ways to earn" />
      <StatsBar theme="light" />
      <DealsSection theme="light" />
      <JVSection theme="light" />
      <BookingSiteSection theme="light" />
      <CRMSection theme="light" />
      <UniversitySection theme="light" />
      <TestimonialsSection theme="light" />
      <PricingSection theme="light" />
      <FAQSection theme="light" />
      <CTABand headline="Start earning as an nfstay Agent" sub="Share your link. Earn commission. No limits." />
      <FooterSection theme="light" />
    </div>
  );
}
