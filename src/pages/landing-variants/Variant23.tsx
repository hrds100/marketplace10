import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V10: Gamified journey — dark premium, vertical timeline hero
export default function Variant10() {
  const milestones = [
    { level: 'Beginner', title: 'Learn the fundamentals', desc: 'Complete NFsTay University courses. Earn XP and unlock marketplace access.', feature: 'University' },
    { level: 'Explorer', title: 'Browse live deals', desc: 'Filter 1,800+ verified rent-to-rent opportunities across 10 UK cities.', feature: 'Deals' },
    { level: 'Investor', title: 'Buy JV shares', desc: 'Invest from £500 in managed short-lets. Earn monthly income passively.', feature: 'JV Partners' },
    { level: 'Operator', title: 'Close your first deal', desc: 'Use the CRM to message landlords, negotiate terms, and sign contracts.', feature: 'Inbox & CRM' },
    { level: 'Builder', title: 'Launch your booking site', desc: 'Go direct with yourbrand.nfstay.app. Take bookings without OTA fees.', feature: 'Booking Site' },
    { level: 'Titan', title: 'Earn as an Agent', desc: 'Share NFsTay with others. Earn 20% recurring commission and grow your network.', feature: 'Affiliate' },
  ];

  return (
    <div className="bg-[#0A0E0D]">
      <NavBar theme="dark" />
      <Section className="bg-[#0A0E0D] pt-16 md:pt-24 pb-8">
        <SR>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="font-inter text-4xl font-bold tracking-tight text-white md:text-6xl md:leading-[1.1]">
              Your path to{' '}<span className="font-playfair italic">property income</span>
            </h1>
            <p className="mt-5 text-lg text-[#9CA3AF] max-w-xl mx-auto">From complete beginner to property business owner. NFsTay guides you through every step — learning, investing, operating, and scaling.</p>
            <div className="mt-8">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Start Your Journey</PillButton>
            </div>
          </div>
        </SR>
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#22C55E] to-[#22C55E]/10 md:left-1/2" />
          {milestones.map((m, i) => (
            <SR key={m.level} delay={i * 120}>
              <div className={`relative flex items-start gap-6 mb-10 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} md:gap-12`}>
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#22C55E] border-4 border-[#0A0E0D] z-10 mt-1" />
                <div className="ml-14 md:ml-0 md:w-1/2">
                  <div className={`rounded-2xl bg-[#131A16] border border-[#1F2B25] p-5 ${i % 2 === 0 ? 'md:mr-8' : 'md:ml-8'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-xs font-semibold text-[#22C55E]">{m.level}</span>
                      <span className="text-xs text-[#9CA3AF]">{m.feature}</span>
                    </div>
                    <h4 className="text-white font-inter font-semibold mb-1">{m.title}</h4>
                    <p className="text-sm text-[#9CA3AF]">{m.desc}</p>
                  </div>
                </div>
              </div>
            </SR>
          ))}
        </div>
      </Section>
      <UniversitySection theme="dark" />
      <DealsSection theme="dark" />
      <JVSection theme="dark" />
      <BookingSiteSection theme="dark" />
      <CRMSection theme="dark" />
      <AffiliateSection theme="dark" />
      <TestimonialsSection theme="dark" />
      <StatsBar theme="dark" />
      <PricingSection theme="dark" />
      <FAQSection theme="dark" />
      <CTABand headline="Begin your journey today" sub="From beginner to property Titan. Start free." />
      <FooterSection theme="dark" />
    </div>
  );
}
