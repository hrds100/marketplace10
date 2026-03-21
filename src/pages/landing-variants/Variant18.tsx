import { NavBar, SR, PillButton, Section, StatsBar, DealsSection, JVSection, BookingSiteSection, CRMSection, UniversitySection, AffiliateSection, PricingSection, FAQSection, TestimonialsSection, CTABand, FooterSection } from './lovable-shared';

// V5: Education-first — dark premium theme, university as entry point
export default function Variant05() {
  return (
    <div className="bg-[#0A0E0D]">
      <NavBar theme="dark" />

      {/* ── Hero ── */}
      <Section className="bg-[#0A0E0D] pt-16 md:pt-24 pb-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <SR>
            <h1 className="font-inter text-4xl font-bold tracking-tight text-white md:text-5xl md:leading-[1.1]">
              Master rent-to-rent{' '}
              <span className="font-playfair italic">before you spend a penny</span>
            </h1>
            <p className="mt-5 text-lg text-[#9CA3AF] max-w-lg">
              NFsTay University: structured courses, XP-based progression, and daily streaks. Learn the UK rent-to-rent model from scratch — then apply it with live deals.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PillButton variant="primary" className="px-8 py-3.5 text-base">Start Learning Free</PillButton>
              <PillButton variant="outline-light" className="px-8 py-3.5 text-base">View Curriculum</PillButton>
            </div>
          </SR>
          <SR delay={200}>
            <div className="rounded-2xl bg-[#131A16] border border-[#1F2B25] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white font-inter font-semibold">Your Progress</p>
                  <p className="text-[#9CA3AF] text-sm">Level 4 — Deal Analyst</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔥</span>
                  <span className="text-[#22C55E] font-semibold text-sm">12-day streak</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-[#9CA3AF] mb-1">
                  <span>740 / 1,000 XP</span>
                  <span>Level 5</span>
                </div>
                <div className="h-3 rounded-full bg-[#1F2B25] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] w-[74%]" />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {[
                  { title: 'Rent-to-Rent Fundamentals', progress: 100 },
                  { title: 'Deal Analysis Masterclass', progress: 65 },
                  { title: 'Serviced Accommodation Ops', progress: 20 },
                ].map(c => (
                  <div key={c.title} className="flex items-center justify-between rounded-xl bg-[#0A0E0D] p-3">
                    <span className="text-white text-sm">{c.title}</span>
                    <span className={`text-xs font-semibold ${c.progress === 100 ? 'text-[#22C55E]' : 'text-[#9CA3AF]'}`}>
                      {c.progress === 100 ? 'Complete' : `${c.progress}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SR>
        </div>
      </Section>

      <UniversitySection theme="dark" headline="Structured courses for every level" sub="From beginner fundamentals to advanced property operations. Earn XP, unlock levels, and build real skills." />
      <DealsSection theme="dark" headline="Turn learning into live deals" sub="Once you complete the fundamentals course, you get full access to the deals marketplace. Theory becomes practice." />
      <JVSection theme="dark" headline="Not ready to operate? Invest instead." sub="Buy shares in managed short-lets while you are still learning. Earn income from day one." />
      <BookingSiteSection theme="dark" />
      <CRMSection theme="dark" />
      <AffiliateSection theme="dark" />
      <TestimonialsSection theme="dark" />
      <StatsBar theme="dark" />
      <PricingSection theme="dark" />
      <FAQSection theme="dark" />
      <CTABand headline="Learn first. Earn forever." sub="Start with NFsTay University — it's free." />
      <FooterSection theme="dark" />
    </div>
  );
}
