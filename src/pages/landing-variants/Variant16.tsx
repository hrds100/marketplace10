import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, HowItWorksSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V3: All-in-one platform — light SHIPPER, split hero with dashboard mockup
export default function Variant03() {
  return (
    <div className="bg-[#F8F6F3]">
      <NavBar theme="light" />

      {/* ── Hero: Split ── */}
      <Section className="bg-[#F8F6F3] pt-16 md:pt-24 pb-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <SR>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-[#1C1C1C] md:text-5xl md:leading-[1.1]">
              Your rent-to-rent business,{' '}
              <span className="font-playfair italic">one platform</span>
            </h1>
            <p className="mt-5 text-lg text-[#6B7280] max-w-lg">
              Deals marketplace. Investor partnerships. Direct bookings. CRM. Training. Everything you need to build and scale your short-let operation.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Explore the Platform</PillButton>
              <PillButton variant="outline" className="px-8 py-3.5 text-base">Watch Demo</PillButton>
            </div>
            <div className="mt-8 flex items-center gap-6">
              {[
                { v: '4,200+', l: 'operators' },
                { v: '1,800+', l: 'deals' },
                { v: '10', l: 'cities' },
              ].map(s => (
                <div key={s.l}>
                  <p className="font-inter text-xl font-bold text-[#1C1C1C]">{s.v}</p>
                  <p className="text-xs text-[#6B7280]">{s.l}</p>
                </div>
              ))}
            </div>
          </SR>
          <SR delay={200}>
            <div className="rounded-2xl bg-white border border-[#E8E5E0] p-4 shadow-xl shadow-black/5">
              <div className="rounded-xl bg-[#F8F6F3] p-4 space-y-4" style={{ minHeight: 360 }}>
                <div className="flex gap-3">
                  <div className="h-8 w-24 rounded-lg bg-[#22C55E]/15" />
                  <div className="h-8 w-20 rounded-lg bg-[#E8E5E0]" />
                  <div className="h-8 w-20 rounded-lg bg-[#E8E5E0]" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['Deals', 'JV Portfolio', 'Inbox'].map(tab => (
                    <div key={tab} className="rounded-xl bg-white border border-[#E8E5E0] p-3">
                      <p className="text-xs font-medium text-[#6B7280] mb-2">{tab}</p>
                      <div className="space-y-1.5">
                        <div className="h-3 w-full rounded bg-[#E8E5E0]" />
                        <div className="h-3 w-3/4 rounded bg-[#E8E5E0]" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-[#E8E5E0] p-3">
                    <p className="text-xs font-medium text-[#6B7280] mb-1">Monthly Profit</p>
                    <p className="text-lg font-bold text-[#22C55E]">+£2,140</p>
                  </div>
                  <div className="rounded-xl bg-white border border-[#E8E5E0] p-3">
                    <p className="text-xs font-medium text-[#6B7280] mb-1">Active Deals</p>
                    <p className="text-lg font-bold text-[#1C1C1C]">7</p>
                  </div>
                </div>
              </div>
            </div>
          </SR>
        </div>
      </Section>

      <HowItWorksSection theme="light" />
      <CRMSection theme="light" headline="Built-in CRM for every deal" />
      <DealsSection theme="light" />
      <JVSection theme="light" />
      <BookingSiteSection theme="light" />
      <UniversitySection theme="light" />
      <AffiliateSection theme="light" />
      <TestimonialsSection theme="light" />
      <PricingSection theme="light" />
      <FAQSection theme="light" />
      <CTABand headline="See why 4,200+ operators choose nfstay" />
      <FooterSection theme="light" />
    </div>
  );
}
