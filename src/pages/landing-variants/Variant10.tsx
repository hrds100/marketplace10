import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Globe,
  GraduationCap,
  Users,
  Check,
  Star,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const journeyLevels = [
  {
    level: 1,
    title: 'Noobie',
    properties: '0 properties',
    description: 'Sign up and explore. Browse deals, start learning.',
    features: ['nfstay Academy', 'Deal Marketplace'],
    status: 'complete' as const,
  },
  {
    level: 2,
    title: 'Deal Rookie',
    properties: '1 property',
    description: 'Close your first deal. Add it to your CRM pipeline.',
    features: ['CRM Pipeline', 'Inbox Messaging'],
    status: 'complete' as const,
  },
  {
    level: 3,
    title: 'Cashflow Builder',
    properties: '3 properties',
    description: 'Scale to 3 properties. Launch your booking site.',
    features: ['Booking Site Builder', 'Direct Bookings'],
    status: 'current' as const,
  },
  {
    level: 4,
    title: 'Portfolio Boss',
    properties: '5 properties',
    description: 'Build a real portfolio. Start earning from JV partnerships.',
    features: ['JV Partners', 'Governance Voting'],
    status: 'locked' as const,
  },
  {
    level: 5,
    title: 'Empire Builder',
    properties: '10 properties',
    description: 'Diversify with investments and agent income.',
    features: ['Agent Programme', 'Portfolio Dashboard'],
    status: 'locked' as const,
  },
  {
    level: 6,
    title: 'Property Titan',
    properties: '15+ properties',
    description: "You're running an empire. nfstay grows with you.",
    features: ['Full platform access', 'Priority support'],
    status: 'locked' as const,
    star: true,
  },
];

const tools = [
  {
    icon: Search,
    title: 'Deal Marketplace',
    description: 'Browse rent-to-rent deals across the UK, ready to close.',
    unlocksAt: 'Level 1',
  },
  {
    icon: LayoutDashboard,
    title: 'CRM Pipeline',
    description: 'Track every deal from lead to signed contract in one view.',
    unlocksAt: 'Level 2',
  },
  {
    icon: MessageSquare,
    title: 'Inbox Messaging',
    description: 'Message landlords, agents, and partners directly inside nfstay.',
    unlocksAt: 'Level 2',
  },
  {
    icon: Globe,
    title: 'Booking Site',
    description: 'Launch a direct booking website for your properties in minutes.',
    unlocksAt: 'Level 3',
  },
  {
    icon: GraduationCap,
    title: 'University',
    description: 'Step-by-step training from sourcing to scaling your portfolio.',
    unlocksAt: 'Level 1',
  },
  {
    icon: Users,
    title: 'JV Partners',
    description: 'Find joint venture partners and co-invest on bigger deals.',
    unlocksAt: 'Level 4',
  },
];

const stats = [
  { value: '200+', label: 'Operators on the journey' },
  { value: '120+', label: 'Deals available' },
  { value: '\u00a3680', label: 'Avg monthly profit per deal' },
  { value: '15', label: 'UK cities' },
];

const pricing = [
  {
    name: 'Free',
    price: '\u00a30',
    period: '/month',
    description: 'Browse deals and start learning the basics.',
    features: ['Deal Marketplace access', 'Limited Academy content', 'Community forum'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '\u00a367',
    period: '/month',
    description: 'Everything you need to source, manage, and scale.',
    features: [
      'Full Deal Marketplace',
      'CRM Pipeline',
      'Inbox Messaging',
      'Booking Site Builder',
      'Full Academy access',
      'JV Partner matching',
    ],
    cta: 'Go Pro',
    highlighted: false,
  },
  {
    name: 'Lifetime',
    price: '\u00a3997',
    period: ' one-time',
    description: 'Lock in everything forever. No recurring fees.',
    features: [
      'Everything in Pro',
      'Lifetime platform access',
      'Priority support',
      'Early feature access',
      'Governance voting rights',
    ],
    cta: 'Go Lifetime',
    highlighted: true,
  },
];

function LevelCircle({ status, star }: { status: string; star?: boolean }) {
  if (status === 'complete') {
    return (
      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30">
        <Check className="h-5 w-5" />
      </div>
    );
  }
  if (status === 'current') {
    return (
      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-500 bg-slate-900 text-green-400 shadow-lg shadow-green-500/20">
        <span className="text-sm font-bold">3</span>
      </div>
    );
  }
  return (
    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-700 bg-slate-900 text-gray-500">
      {star ? <Star className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-gray-700" />}
    </div>
  );
}

export default function Variant10() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* STICKY NAV */}
      <nav className="sticky top-0 z-50 border-b border-gray-800/60 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-green-400">NFs</span>Tay
          </span>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#journey" className="text-sm text-gray-400 transition hover:text-white">Your Journey</a>
            <a href="#features" className="text-sm text-gray-400 transition hover:text-white">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 transition hover:text-white">Pricing</a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <button className="text-sm text-gray-400 transition hover:text-white">Sign In</button>
            <button className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600">
              Start Your Journey
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="border-t border-gray-800 px-4 pb-4 md:hidden">
            <div className="flex flex-col gap-3 pt-3">
              <a href="#journey" className="text-sm text-gray-300">Your Journey</a>
              <a href="#features" className="text-sm text-gray-300">Features</a>
              <a href="#pricing" className="text-sm text-gray-300">Pricing</a>
              <button className="text-left text-sm text-gray-300">Sign In</button>
              <button className="mt-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white">
                Start Your Journey
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 md:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-green-500/10 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold leading-tight tracking-tight md:text-6xl"
          >
            From zero to property portfolio
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-xl text-lg text-gray-400"
          >
            nfstay takes you from complete beginner to seasoned operator. Learn, deal, grow — with
            the tools, training, and marketplace to back every step.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-semibold text-white transition hover:bg-green-600">
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#journey"
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
            >
              See the Path <ChevronRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>

        {/* Where are you today? */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-16 max-w-3xl"
        >
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-gray-500">
            Where are you today?
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Complete Beginner', desc: 'Never done rent-to-rent' },
              { title: 'Getting Started', desc: 'Have knowledge, need deals' },
              { title: 'Scaling Up', desc: 'Operating, want more' },
            ].map((card) => (
              <button
                key={card.title}
                className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 text-left transition hover:border-green-500/50 hover:bg-gray-900"
              >
                <p className="font-semibold text-white">{card.title}</p>
                <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-400">{card.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* THE JOURNEY PATH */}
      <section id="journey" className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold md:text-4xl">The Journey Path</h2>
            <p className="mt-3 text-gray-400">Your roadmap from first signup to property empire.</p>
          </motion.div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 hidden h-full w-px bg-gradient-to-b from-green-500 via-green-500/40 to-gray-800 md:left-1/2 md:block" />
            <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-green-500 via-green-500/40 to-gray-800 md:hidden" />

            <div className="flex flex-col gap-12">
              {journeyLevels.map((lvl, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <motion.div
                    key={lvl.level}
                    initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="relative"
                  >
                    {/* Mobile layout */}
                    <div className="flex gap-4 md:hidden">
                      <div className="flex flex-col items-center">
                        <LevelCircle status={lvl.status} star={lvl.star} />
                        {i < journeyLevels.length - 1 && <div className="h-full w-px bg-gray-800" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium uppercase tracking-wider text-green-400">
                              Level {lvl.level}
                            </span>
                            <span className="text-xs text-gray-600">{lvl.properties}</span>
                          </div>
                          <h3 className="mt-1 text-lg font-bold">{lvl.title}</h3>
                          <p className="mt-1 text-sm text-gray-400">{lvl.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {lvl.features.map((f) => (
                              <span
                                key={f}
                                className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout — alternating */}
                    <div className="hidden md:grid md:grid-cols-[1fr_40px_1fr] md:items-center md:gap-6">
                      {isLeft ? (
                        <>
                          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-xs text-gray-600">{lvl.properties}</span>
                              <span className="text-xs font-medium uppercase tracking-wider text-green-400">
                                Level {lvl.level}
                              </span>
                            </div>
                            <h3 className="mt-1 text-lg font-bold">{lvl.title}</h3>
                            <p className="mt-1 text-sm text-gray-400">{lvl.description}</p>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              {lvl.features.map((f) => (
                                <span
                                  key={f}
                                  className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-center">
                            <LevelCircle status={lvl.status} star={lvl.star} />
                          </div>
                          <div />
                        </>
                      ) : (
                        <>
                          <div />
                          <div className="flex justify-center">
                            <LevelCircle status={lvl.status} star={lvl.star} />
                          </div>
                          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium uppercase tracking-wider text-green-400">
                                Level {lvl.level}
                              </span>
                              <span className="text-xs text-gray-600">{lvl.properties}</span>
                            </div>
                            <h3 className="mt-1 text-lg font-bold">{lvl.title}</h3>
                            <p className="mt-1 text-sm text-gray-400">{lvl.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {lvl.features.map((f) => (
                                <span
                                  key={f}
                                  className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS FOR EVERY STAGE */}
      <section id="features" className="border-t border-gray-800/60 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-bold md:text-4xl">Everything you need at every level</h2>
            <p className="mt-3 text-gray-400">Tools that unlock as you progress.</p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group rounded-xl border border-gray-800 bg-gray-900/40 p-6 transition hover:border-green-500/40 hover:bg-gray-900/70"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                  <tool.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{tool.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{tool.description}</p>
                <p className="mt-3 text-xs font-medium text-green-400/70">Unlocks at {tool.unlocksAt}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY STATS */}
      <section className="border-y border-gray-800/60 bg-gray-900/40 px-4 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-green-400">{s.value}</p>
              <p className="mt-1 text-sm text-gray-400">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-bold md:text-4xl">Start free. Upgrade when you're ready.</h2>
            <p className="mt-3 text-gray-400">No lock-in. Cancel anytime.</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 ${
                  plan.highlighted
                    ? 'border-green-500 bg-green-500/5 shadow-lg shadow-green-500/10'
                    : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                    Best Value
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">{plan.description}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                    plan.highlighted
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800/60 bg-gray-900/30 px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold md:text-4xl">Every empire started with a single deal.</h2>
          <p className="mt-4 text-gray-400">
            Join hundreds of operators building their property portfolios with nfstay.
          </p>
          <button className="mt-8 inline-flex items-center gap-2 rounded-lg bg-green-500 px-8 py-3 font-semibold text-white transition hover:bg-green-600">
            Start Your Journey <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800/60 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-green-400">NFs</span>Tay
          </span>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="transition hover:text-gray-300">Privacy</a>
            <a href="#" className="transition hover:text-gray-300">Terms</a>
            <a href="#" className="transition hover:text-gray-300">Contact</a>
          </div>
          <p className="text-sm text-gray-600">&copy; 2026 nfstay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
