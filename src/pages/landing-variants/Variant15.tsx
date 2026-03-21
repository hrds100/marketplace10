import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V2: Investment-first — dark investment theme, JV returns as hero focus
export default function Variant02() {
  return (
    <div className="bg-[#111827]">
      <NavBar theme="investment" />

      {/* ── Hero ── */}
      <Section className="bg-[#111827] pt-16 md:pt-24 pb-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <SR>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#22C55E]/10 px-4 py-1.5 text-sm font-medium text-[#22C55E] mb-6">
              Up to 14.2% projected APY
            </span>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-white md:text-5xl md:leading-[1.1]">
              Own shares in UK<br />
              <span className="font-playfair italic">short-let properties</span>
            </h1>
            <p className="mt-5 text-lg text-[#9CA3AF] max-w-lg">
              Invest from £500. Earn monthly rental income. Vote on property decisions. Track every payout from your portfolio dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">View Open Investments</PillButton>
              <PillButton variant="outline-light" className="px-8 py-3.5 text-base">How JV Works</PillButton>
            </div>
          </SR>
          <SR delay={200}>
            <div className="rounded-2xl bg-[#1F2937] border border-[#374151] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-inter font-semibold">Your Portfolio</h3>
                <span className="text-[#22C55E] text-sm font-semibold">+£847 this month</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Pembroke Place', shares: 4, income: '£356', apy: '14.2%' },
                  { name: 'Victoria Lodge', shares: 2, income: '£224', apy: '11.8%' },
                  { name: 'Riverside Court', shares: 3, income: '£267', apy: '12.6%' },
                ].map(p => (
                  <div key={p.name} className="flex items-center justify-between rounded-xl bg-[#111827] p-3">
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-[#9CA3AF] text-xs">{p.shares} shares</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#22C55E] text-sm font-semibold">{p.income}/mo</p>
                      <p className="text-[#9CA3AF] text-xs">{p.apy} APY</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#374151] flex justify-between">
                <span className="text-[#9CA3AF] text-sm">Total portfolio value</span>
                <span className="text-white font-semibold">£4,850</span>
              </div>
            </div>
          </SR>
        </div>
      </Section>

      <JVSection theme="investment" headline="Open JV opportunities" />
      <StatsBar theme="investment" />
      <DealsSection theme="investment" headline="Deals marketplace" sub="Not ready to invest passively? Browse rent-to-rent deals and operate properties yourself." />
      <BookingSiteSection theme="investment" />
      <CRMSection theme="investment" />
      <UniversitySection theme="investment" />
      <AffiliateSection theme="investment" />
      <TestimonialsSection theme="investment" />
      <PricingSection theme="investment" />
      <FAQSection theme="investment" />
      <CTABand headline="Start building your property portfolio" sub="Browse open JV investments or find your first rent-to-rent deal." />
      <FooterSection theme="investment" />
    </div>
  );
}
