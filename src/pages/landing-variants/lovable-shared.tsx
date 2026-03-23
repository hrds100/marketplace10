import { useState, useEffect, useRef, type ReactNode } from 'react';

/* ════════════════════════════════════════════════════════════════
   SHIPPER / nfstay Brand System
   ════════════════════════════════════════════════════════════════ */

export type Theme = 'light' | 'dark' | 'investment';

export const t = {
  light: {
    bg: 'bg-[#F8F6F3]', bgAlt: 'bg-white', text: 'text-[#1C1C1C]',
    textMuted: 'text-[#6B7280]', card: 'bg-white border border-[#E8E5E0]',
    nav: 'bg-[#F8F6F3]/90 backdrop-blur-md', accent: 'text-[#22C55E]',
    sectionBorder: 'border-[#E8E5E0]',
  },
  dark: {
    bg: 'bg-[#0A0E0D]', bgAlt: 'bg-[#131A16]', text: 'text-white',
    textMuted: 'text-[#9CA3AF]', card: 'bg-[#131A16] border border-[#1F2B25]',
    nav: 'bg-[#0A0E0D]/90 backdrop-blur-md', accent: 'text-[#22C55E]',
    sectionBorder: 'border-[#1F2B25]',
  },
  investment: {
    bg: 'bg-[#111827]', bgAlt: 'bg-[#0F172A]', text: 'text-white',
    textMuted: 'text-[#9CA3AF]', card: 'bg-[#1F2937] border border-[#374151]',
    nav: 'bg-[#111827]/90 backdrop-blur-md', accent: 'text-[#22C55E]',
    sectionBorder: 'border-[#374151]',
  },
};

/* ════════ useInView ════════ */
export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

/* ════════ ScrollReveal ════════ */
export function SR({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, vis] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >{children}</div>
  );
}

/* ════════ PillButton ════════ */
export function PillButton({ children, variant = 'primary', className = '', ...props }: {
  children: ReactNode; variant?: 'primary' | 'outline' | 'dark' | 'outline-light'; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v: Record<string, string> = {
    primary: 'bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-lg shadow-[#22C55E]/25',
    outline: 'border-2 border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white',
    dark: 'bg-[#1C1C1C] text-white hover:bg-[#374151]',
    'outline-light': 'border-2 border-white/30 text-white hover:bg-white/10',
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold tracking-tight transition-all duration-200 active:scale-[0.97] font-inter ${v[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* ════════ NavBar ════════ */
export function NavBar({ theme = 'light' }: { theme?: Theme }) {
  const th = t[theme];
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? `${th.nav} shadow-sm` : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <span className={`font-inter text-xl font-bold tracking-tight ${th.text}`}>nfstay</span>
        <div className={`hidden items-center gap-8 lg:flex`}>
          {['Deals', 'JV Partners', 'University', 'Agents', 'Pricing'].map(l => (
            <a key={l} href="#" className={`text-sm font-medium transition-colors hover:text-[#22C55E] ${th.textMuted}`}>{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className={`hidden text-sm font-medium lg:block hover:text-[#22C55E] ${th.textMuted}`}>Sign In</a>
          <PillButton variant="primary" className="text-sm px-5 py-2.5">Get Started</PillButton>
        </div>
      </div>
    </nav>
  );
}

/* ════════ Section Wrapper ════════ */
export function Section({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`px-6 py-20 md:py-28 ${className}`}><div className="mx-auto max-w-7xl">{children}</div></section>;
}

/* ════════ SectionHeading ════════ */
export function SH({ title, sub, theme = 'light', className = '' }: { title: string; sub?: string; theme?: Theme; className?: string }) {
  const th = t[theme];
  return (
    <div className={`mb-14 max-w-2xl ${className}`}>
      <h2 className={`font-inter text-3xl font-bold tracking-tight md:text-4xl leading-[1.15] ${th.text}`}>{title}</h2>
      {sub && <p className={`mt-4 text-lg leading-relaxed ${th.textMuted}`}>{sub}</p>}
    </div>
  );
}

/* ════════ DEAL CARDS ════════ */
const deals = [
  { name: 'Maple House', loc: 'Manchester, M14', beds: 3, type: '3-bed flat', rent: 1250, profit: 680, status: 'Live' },
  { name: 'Pembroke Place', loc: 'Liverpool, L8', beds: 2, type: '2-bed apartment', rent: 950, profit: 520, status: 'Live' },
  { name: 'Riverside Court', loc: 'Birmingham, B5', beds: 4, type: '4-bed house', rent: 1600, profit: 840, status: 'New' },
  { name: 'Ashton Terrace', loc: 'Leeds, LS6', beds: 2, type: '2-bed flat', rent: 850, profit: 460, status: 'Live' },
  { name: 'Victoria Lodge', loc: 'Bristol, BS2', beds: 3, type: '3-bed maisonette', rent: 1400, profit: 720, status: 'New' },
  { name: 'Kensington Row', loc: 'Nottingham, NG1', beds: 1, type: '1-bed studio', rent: 650, profit: 380, status: 'Live' },
];

export function DealCard({ d, theme = 'light' }: { d: typeof deals[0]; theme?: Theme }) {
  const th = t[theme];
  return (
    <div className={`rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${th.card}`}>
      <div className="mb-3 h-36 rounded-xl bg-gradient-to-br from-[#22C55E]/10 to-[#22C55E]/5 flex items-center justify-center">
        <span className={`text-xs font-medium ${th.textMuted}`}>[Property photo]</span>
      </div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className={`font-inter text-base font-semibold ${th.text}`}>{d.name}</h4>
          <p className={`text-sm ${th.textMuted}`}>{d.type} · {d.loc}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.status === 'New' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#22C55E]/10 text-[#16A34A]'}`}>{d.status}</span>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-dashed pt-3" style={{ borderColor: theme === 'light' ? '#E8E5E0' : '#2D3B35' }}>
        <div><p className={`text-xs ${th.textMuted}`}>Monthly rent</p><p className={`text-sm font-semibold ${th.text}`}>£{d.rent.toLocaleString()}</p></div>
        <div className="text-right"><p className={`text-xs ${th.textMuted}`}>Est. profit</p><p className="text-sm font-bold text-[#22C55E]">+£{d.profit}/mo</p></div>
      </div>
    </div>
  );
}

export function DealsSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bg}>
      <SR><SH theme={theme} title={headline || 'Browse verified rent-to-rent deals'} sub={sub || 'Every deal is landlord-approved, compliance-checked, and ready to operate. Filter by city, profit margin, or property type.'} /></SR>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d, i) => <SR key={d.name} delay={i * 80}><DealCard d={d} theme={theme} /></SR>)}
      </div>
    </Section>
  );
}

/* ════════ JV PARTNERS ════════ */
const jvProps = [
  { name: 'Pembroke Place', city: 'Liverpool', totalValue: 185000, sharesAvail: 12, apy: 14.2, monthlyPerShare: 89, funded: 88 },
  { name: 'Victoria Lodge', city: 'Bristol', totalValue: 240000, sharesAvail: 8, apy: 11.8, monthlyPerShare: 112, funded: 72 },
  { name: 'Riverside Court', city: 'Birmingham', totalValue: 310000, sharesAvail: 20, apy: 12.6, monthlyPerShare: 76, funded: 60 },
];

export function JVSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bgAlt}>
      <SR><SH theme={theme} title={headline || 'Invest in high-performing short-lets'} sub={sub || 'Buy shares in UK Airbnb properties. Earn monthly income, vote on proposals, and track payouts — all from your dashboard.'} /></SR>
      <div className="grid gap-6 md:grid-cols-3">
        {jvProps.map((p, i) => (
          <SR key={p.name} delay={i * 100}>
            <div className={`rounded-2xl p-6 ${th.card}`}>
              <div className="mb-4 flex items-center justify-between">
                <h4 className={`font-inter font-semibold ${th.text}`}>{p.name}</h4>
                <span className="rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-xs font-semibold text-[#22C55E]">Open</span>
              </div>
              <p className={`text-sm mb-4 ${th.textMuted}`}>{p.city} · {p.sharesAvail} shares available</p>
              <div className="mb-3 h-2 rounded-full bg-[#22C55E]/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#22C55E] transition-all duration-1000" style={{ width: `${p.funded}%` }} />
              </div>
              <p className={`text-xs mb-4 ${th.textMuted}`}>{p.funded}% funded</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className={`text-xs ${th.textMuted}`}>Value</p><p className={`text-sm font-semibold ${th.text}`}>£{(p.totalValue / 1000).toFixed(0)}k</p></div>
                <div><p className={`text-xs ${th.textMuted}`}>APY</p><p className="text-sm font-bold text-[#22C55E]">{p.apy}%</p></div>
                <div><p className={`text-xs ${th.textMuted}`}>Per share</p><p className={`text-sm font-semibold ${th.text}`}>£{p.monthlyPerShare}/mo</p></div>
              </div>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ BOOKING SITE BUILDER ════════ */
export function BookingSiteSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bg}>
      <div className="grid gap-12 lg:grid-cols-2 items-center">
        <SR>
          <SH theme={theme} title={headline || 'Build your own booking site'} sub={sub || 'Create a branded direct-booking website at yourbrand.nfstay.app. Add your logo, colours, listings, and content sections. Stop paying OTA commissions.'} className="mb-6" />
          <ul className="space-y-3">
            {['Custom domain and branding', 'Drag-and-drop content sections', 'Direct payment integration', 'SEO-optimised listing pages'].map(f => (
              <li key={f} className={`flex items-center gap-3 text-sm ${th.text}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#22C55E] text-xs">✓</span>{f}
              </li>
            ))}
          </ul>
        </SR>
        <SR delay={150}>
          <div className={`rounded-2xl p-2 ${th.card}`}>
            <div className="rounded-xl bg-gradient-to-br from-[#22C55E]/5 to-transparent p-6" style={{ minHeight: 280 }}>
              <div className={`mb-2 flex items-center gap-2 text-xs ${th.textMuted}`}>
                <span className="inline-block h-3 w-3 rounded-full bg-red-400/60" />
                <span className="inline-block h-3 w-3 rounded-full bg-yellow-400/60" />
                <span className="inline-block h-3 w-3 rounded-full bg-green-400/60" />
                <span className="ml-2 rounded bg-[#22C55E]/10 px-3 py-0.5">yourbrand.nfstay.app</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className={`h-8 w-32 rounded-lg ${theme === 'light' ? 'bg-[#E8E5E0]' : 'bg-white/10'}`} />
                <div className={`h-4 w-48 rounded ${theme === 'light' ? 'bg-[#E8E5E0]' : 'bg-white/10'}`} />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className={`h-28 rounded-xl ${theme === 'light' ? 'bg-[#E8E5E0]' : 'bg-white/10'}`} />
                  <div className={`h-28 rounded-xl ${theme === 'light' ? 'bg-[#E8E5E0]' : 'bg-white/10'}`} />
                </div>
              </div>
            </div>
          </div>
        </SR>
      </div>
    </Section>
  );
}

/* ════════ CRM / INBOX ════════ */
const pipelineStages = ['New Lead', 'Under Negotiation', 'Contract Sent', 'Follow Up'];
const pipelineItems = [
  { name: 'Marcus Henley', prop: '3-bed, Salford', stage: 0 },
  { name: 'Sarah Chen', prop: '2-bed, Didsbury', stage: 0 },
  { name: 'James O\'Brien', prop: '4-bed, Anfield', stage: 1 },
  { name: 'Priya Patel', prop: '1-bed, Headingley', stage: 2 },
  { name: 'Tom Richards', prop: '3-bed, Clifton', stage: 3 },
];

export function CRMSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bgAlt}>
      <div className="grid gap-12 lg:grid-cols-2 items-center">
        <SR delay={100}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {pipelineStages.map((stage, si) => (
              <div key={stage} className={`rounded-xl p-3 ${th.card}`}>
                <p className={`text-xs font-semibold mb-3 ${th.textMuted}`}>{stage}</p>
                <div className="space-y-2">
                  {pipelineItems.filter(p => p.stage === si).map(p => (
                    <div key={p.name} className={`rounded-lg p-2 text-xs ${theme === 'light' ? 'bg-[#F8F6F3]' : 'bg-white/5'}`}>
                      <p className={`font-medium ${th.text}`}>{p.name}</p>
                      <p className={th.textMuted}>{p.prop}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SR>
        <SR>
          <SH theme={theme} title={headline || 'Manage every deal in one inbox'} sub={sub || 'Message landlords and agents directly. Track every conversation through your pipeline — from first contact to signed contract.'} className="mb-6" />
          <ul className="space-y-3">
            {['Unified inbox for all conversations', 'Kanban pipeline with drag-and-drop', 'Automated follow-up reminders', 'Deal notes and document storage'].map(f => (
              <li key={f} className={`flex items-center gap-3 text-sm ${th.text}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#22C55E] text-xs">✓</span>{f}
              </li>
            ))}
          </ul>
        </SR>
      </div>
    </Section>
  );
}

/* ════════ UNIVERSITY ════════ */
const courses = [
  { title: 'Rent-to-Rent Fundamentals', modules: 12, xp: 240, level: 'Beginner' },
  { title: 'Deal Analysis Masterclass', modules: 8, xp: 180, level: 'Intermediate' },
  { title: 'Serviced Accommodation Ops', modules: 15, xp: 320, level: 'Advanced' },
];

export function UniversitySection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bg}>
      <SR><SH theme={theme} title={headline || 'Learn rent-to-rent from the ground up'} sub={sub || 'nfstay University: UK-focused training with XP, levels, and streaks. Go from complete beginner to confident operator.'} /></SR>
      <div className="grid gap-5 md:grid-cols-3">
        {courses.map((c, i) => (
          <SR key={c.title} delay={i * 100}>
            <div className={`rounded-2xl p-6 ${th.card}`}>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mb-4 ${c.level === 'Beginner' ? 'bg-[#22C55E]/15 text-[#22C55E]' : c.level === 'Intermediate' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-orange-500/15 text-orange-500'}`}>{c.level}</span>
              <h4 className={`font-inter text-lg font-semibold mb-2 ${th.text}`}>{c.title}</h4>
              <p className={`text-sm mb-4 ${th.textMuted}`}>{c.modules} modules</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#22C55E] text-sm">⚡</span>
                  <span className={`text-sm font-medium ${th.text}`}>{c.xp} XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔥</span>
                  <span className={`text-sm ${th.textMuted}`}>Streak bonus</span>
                </div>
              </div>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ AFFILIATE / AGENT ════════ */
const commissions = [
  { tier: 'Subscription Referral', rate: '20%', desc: 'Recurring commission on every membership you refer' },
  { tier: 'JV Deal Referral', rate: '5%', desc: 'One-time commission on JV investments from your link' },
  { tier: 'Deal Marketplace', rate: '£50', desc: 'Flat fee for every deal closed through your referral' },
];

export function AffiliateSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bgAlt}>
      <SR><SH theme={theme} title={headline || 'Earn as an nfstay Agent'} sub={sub || 'Share your unique link. Earn commission on subscriptions, JV investments, and deal closings. No cap, no catch.'} /></SR>
      <div className="grid gap-5 md:grid-cols-3">
        {commissions.map((c, i) => (
          <SR key={c.tier} delay={i * 100}>
            <div className={`rounded-2xl p-6 ${th.card}`}>
              <p className="text-3xl font-bold text-[#22C55E] mb-2 font-inter">{c.rate}</p>
              <h4 className={`font-inter font-semibold mb-2 ${th.text}`}>{c.tier}</h4>
              <p className={`text-sm ${th.textMuted}`}>{c.desc}</p>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ PRICING ════════ */
const plans = [
  { name: 'Free', price: '£0', period: '', desc: 'Browse deals and explore the platform', features: ['View deal listings', 'Limited marketplace access', 'Community forum access', 'Basic university modules'], cta: 'Start Free', popular: false },
  { name: 'Pro Monthly', price: '£49', period: '/month', desc: 'Full access to every tool and deal', features: ['Unlimited deal access', 'JV Partners marketplace', 'Booking site builder', 'Full inbox & CRM', 'All university courses', 'Agent referral programme', 'Priority support'], cta: 'Go Pro', popular: true },
  { name: 'Pro Yearly', price: '£39', period: '/month', desc: 'Save 20% with annual billing', features: ['Everything in Pro Monthly', 'Billed £468/year', '2 months free', 'Early access to new deals', 'Exclusive webinars'], cta: 'Save 20%', popular: false },
  { name: 'Lifetime', price: '£997', period: 'one-time', desc: 'Pay once, access forever', features: ['Everything in Pro', 'Lifetime access', 'Founding member badge', 'VIP support channel', 'All future features included'], cta: 'Get Lifetime', popular: false },
];

export function PricingSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bg}>
      <SR><SH theme={theme} title={headline || 'Simple, transparent pricing'} sub={sub || 'Start free. Upgrade when you are ready. Cancel anytime.'} className="text-center mx-auto" /></SR>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p, i) => (
          <SR key={p.name} delay={i * 80}>
            <div className={`relative rounded-2xl p-6 flex flex-col ${p.popular ? 'ring-2 ring-[#22C55E] shadow-xl shadow-[#22C55E]/10' : ''} ${th.card}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#22C55E] px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>}
              <h4 className={`font-inter text-lg font-semibold mb-1 ${th.text}`}>{p.name}</h4>
              <div className="mb-2 flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${th.text}`}>{p.price}</span>
                {p.period && <span className={`text-sm ${th.textMuted}`}>{p.period}</span>}
              </div>
              <p className={`text-sm mb-6 ${th.textMuted}`}>{p.desc}</p>
              <ul className="mb-6 flex-1 space-y-2">
                {p.features.map(f => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${th.text}`}>
                    <span className="text-[#22C55E] mt-0.5 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <PillButton variant={p.popular ? 'primary' : theme === 'light' ? 'outline' : 'outline-light'} className="w-full justify-center">
                {p.cta}
              </PillButton>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ FAQ ════════ */
const defaultFaqs = [
  { q: 'What is rent-to-rent?', a: 'Rent-to-rent is a strategy where you rent a property from a landlord and then sublet it — typically as a short-let on Airbnb. The difference between what you pay the landlord and what guests pay is your profit.' },
  { q: 'Are the deals really landlord-approved?', a: 'Yes. Every deal on nfstay has been verified for landlord consent, insurance compliance, and planning permission where applicable. We do not list unverified opportunities.' },
  { q: 'How does JV investing work?', a: 'You can buy shares in a specific short-let property managed by experienced operators. You receive a share of the monthly rental income proportional to your stake. You can also vote on key decisions about the property.' },
  { q: 'Can I cancel my subscription?', a: 'Absolutely. Monthly plans can be cancelled at any time. Yearly and lifetime plans are non-refundable but give you long-term access at a lower cost.' },
  { q: 'Do I need experience to get started?', a: 'No. nfstay University covers everything from beginner fundamentals to advanced operations. Many of our operators started with zero experience.' },
  { q: 'How does the booking site builder work?', a: 'You can create a fully branded booking website at yourbrand.nfstay.app in minutes. Add your logo, colours, listings, and content. Guests book directly with you — no OTA commissions.' },
];

export function FAQSection({ theme = 'light', headline, sub, faqs }: { theme?: Theme; headline?: string; sub?: string; faqs?: { q: string; a: string }[] }) {
  const th = t[theme];
  const items = faqs || defaultFaqs;
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Section className={th.bgAlt}>
      <SR><SH theme={theme} title={headline || 'Frequently asked questions'} sub={sub} className="text-center mx-auto" /></SR>
      <div className="mx-auto max-w-3xl divide-y" style={{ borderColor: theme === 'light' ? '#E8E5E0' : '#1F2B25' }}>
        {items.map((f, i) => (
          <SR key={i} delay={i * 60}>
            <div className="py-5">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className={`flex w-full items-center justify-between text-left text-base font-medium transition-colors ${th.text} hover:text-[#22C55E]`}
              >
                {f.q}
                <span className={`ml-4 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className={`text-sm leading-relaxed ${th.textMuted}`}>{f.a}</p>
              </div>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ TESTIMONIALS ════════ */
const testimonials = [
  { name: 'Amara Osei', role: 'Operator', loc: 'Manchester', quote: 'I closed my first deal within two weeks of joining. The pipeline CRM made follow-ups effortless.' },
  { name: 'Daniel Whitfield', role: 'JV Investor', loc: 'London', quote: 'The JV portfolio gives me exposure to short-lets without managing anything myself. Payouts arrive like clockwork.' },
  { name: 'Fatima Al-Rashid', role: 'Agent', loc: 'Birmingham', quote: 'I have earned over £3,200 in referral commissions in six months. The affiliate programme practically sells itself.' },
  { name: 'Callum Murray', role: 'Beginner', loc: 'Leeds', quote: 'nfstay University took me from knowing nothing to running two properties. The XP system kept me engaged.' },
];

export function TestimonialsSection({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  const th = t[theme];
  return (
    <Section className={th.bg}>
      <SR><SH theme={theme} title={headline || 'Trusted by operators across the UK'} sub={sub} className="text-center mx-auto" /></SR>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((tm, i) => (
          <SR key={tm.name} delay={i * 80}>
            <div className={`rounded-2xl p-6 ${th.card}`}>
              <p className={`text-sm leading-relaxed mb-4 ${th.text}`}>"{tm.quote}"</p>
              <div>
                <p className={`text-sm font-semibold ${th.text}`}>{tm.name}</p>
                <p className={`text-xs ${th.textMuted}`}>{tm.role} · {tm.loc}</p>
              </div>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ HOW IT WORKS ════════ */
const defaultSteps = [
  { step: '01', title: 'Browse deals', desc: 'Filter verified rent-to-rent opportunities by city, property type, and profit margin.' },
  { step: '02', title: 'Analyse and compare', desc: 'Review financials, landlord terms, and compliance details for each deal.' },
  { step: '03', title: 'Contact the landlord', desc: 'Use the built-in inbox to reach out, negotiate, and manage your pipeline.' },
  { step: '04', title: 'Start operating', desc: 'Sign the contract, list on Airbnb or your own booking site, and start earning.' },
];

export function HowItWorksSection({ theme = 'light', headline, sub, steps }: { theme?: Theme; headline?: string; sub?: string; steps?: { step: string; title: string; desc: string }[] }) {
  const th = t[theme];
  const s = steps || defaultSteps;
  return (
    <Section className={th.bgAlt}>
      <SR><SH theme={theme} title={headline || 'How it works'} sub={sub || 'Four steps from browsing to earning.'} className="text-center mx-auto" /></SR>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {s.map((st, i) => (
          <SR key={st.step} delay={i * 100}>
            <div className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#22C55E] font-inter text-sm font-bold mb-4">{st.step}</span>
              <h4 className={`font-inter text-base font-semibold mb-2 ${th.text}`}>{st.title}</h4>
              <p className={`text-sm ${th.textMuted}`}>{st.desc}</p>
            </div>
          </SR>
        ))}
      </div>
    </Section>
  );
}

/* ════════ STATS BAR ════════ */
const defaultStats = [
  { value: '4,200+', label: 'UK operators' },
  { value: '1,800+', label: 'Verified deals' },
  { value: '10', label: 'Cities covered' },
  { value: '£680', label: 'Avg. monthly profit' },
];

export function StatsBar({ theme = 'light', stats }: { theme?: Theme; stats?: { value: string; label: string }[] }) {
  const th = t[theme];
  const s = stats || defaultStats;
  return (
    <div className={`border-y py-10 px-6 ${th.sectionBorder} ${th.bg}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 md:justify-between">
        {s.map((st, i) => (
          <SR key={st.label} delay={i * 80}>
            <div className="text-center">
              <p className={`font-inter text-2xl font-bold md:text-3xl ${th.text}`}>{st.value}</p>
              <p className={`text-sm mt-1 ${th.textMuted}`}>{st.label}</p>
            </div>
          </SR>
        ))}
      </div>
    </div>
  );
}

/* ════════ CTA BAND ════════ */
export function CTABand({ theme = 'light', headline, sub }: { theme?: Theme; headline?: string; sub?: string }) {
  return (
    <Section className="bg-[#22C55E]">
      <SR>
        <div className="text-center">
          <h2 className="font-inter text-3xl font-bold tracking-tight text-white md:text-4xl mb-4">{headline || 'Ready to find your next deal?'}</h2>
          {sub && <p className="text-white/80 text-lg mb-6 max-w-xl mx-auto">{sub}</p>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <PillButton variant="dark" className="px-8 py-3.5">Browse Live Deals</PillButton>
            <PillButton variant="outline-light" className="px-8 py-3.5">See Pricing</PillButton>
          </div>
        </div>
      </SR>
    </Section>
  );
}

/* ════════ FOOTER ════════ */
export function FooterSection({ theme = 'light' }: { theme?: Theme }) {
  const th = t[theme];
  return (
    <footer className={`px-6 py-16 ${th.bg}`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <span className={`font-inter text-lg font-bold ${th.text}`}>nfstay</span>
            <p className={`text-sm mt-3 max-w-[200px] ${th.textMuted}`}>The UK's rent-to-rent deals marketplace. Browse, invest, and grow.</p>
          </div>
          {[
            { title: 'Product', links: ['Deals', 'JV Partners', 'Booking Sites', 'Inbox & CRM'] },
            { title: 'Learn', links: ['University', 'Blog', 'Guides', 'Webinars'] },
            { title: 'Company', links: ['About', 'Agents', 'Pricing', 'Contact'] },
          ].map(col => (
            <div key={col.title}>
              <p className={`text-sm font-semibold mb-3 ${th.text}`}>{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(l => <li key={l}><a href="#" className={`text-sm hover:text-[#22C55E] transition-colors ${th.textMuted}`}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className={`mt-12 border-t pt-6 text-sm ${th.textMuted} ${th.sectionBorder}`}>
          © {new Date().getFullYear()} nfstay. Part of the SHIPPER family. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
