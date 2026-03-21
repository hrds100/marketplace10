import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V7: CRM/Inbox-first — investment theme, pipeline-focused hero
export default function Variant07() {
  return (
    <div className="bg-[#111827]">
      <NavBar theme="investment" />
      <Section className="bg-[#111827] pt-16 md:pt-24 pb-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <SR>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#22C55E]/10 px-4 py-1.5 text-sm font-medium text-[#22C55E] mb-6">Built-in CRM for property deals</span>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-white md:text-5xl md:leading-[1.1]">
              From first message to{' '}<span className="font-playfair italic">signed contract</span>
            </h1>
            <p className="mt-5 text-lg text-[#9CA3AF] max-w-lg">Message landlords, track negotiations, and manage your entire deal pipeline in one inbox. No spreadsheets. No missed follow-ups.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Try the CRM Free</PillButton>
              <PillButton variant="outline-light" className="px-8 py-3.5 text-base">See Features</PillButton>
            </div>
          </SR>
          <SR delay={200}>
            <div className="rounded-2xl bg-[#1F2937] border border-[#374151] p-4">
              <div className="grid grid-cols-4 gap-2">
                {['New Lead', 'Negotiating', 'Contract Sent', 'Follow Up'].map((s, si) => (
                  <div key={s} className="rounded-lg bg-[#111827] p-2">
                    <p className="text-[10px] font-semibold text-[#9CA3AF] mb-2 truncate">{s}</p>
                    {[0,1].filter(() => Math.random() > 0.3 || si < 2).slice(0, si === 0 ? 2 : 1).map((_, j) => (
                      <div key={j} className="mb-1.5 rounded bg-[#1F2937] p-1.5">
                        <div className="h-2 w-16 rounded bg-white/10 mb-1" />
                        <div className="h-2 w-10 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </SR>
        </div>
      </Section>
      <CRMSection theme="investment" headline="Your deal pipeline, visualised" />
      <DealsSection theme="investment" />
      <JVSection theme="investment" />
      <BookingSiteSection theme="investment" />
      <UniversitySection theme="investment" />
      <AffiliateSection theme="investment" />
      <TestimonialsSection theme="investment" />
      <StatsBar theme="investment" />
      <PricingSection theme="investment" />
      <FAQSection theme="investment" />
      <CTABand headline="Close more deals with a smarter pipeline" />
      <FooterSection theme="investment" />
    </div>
  );
}
