import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Variant09() {
  const statementLines = [
    'Browse 120+ verified deals.',
    'Message landlords directly.',
    'Start hosting in weeks.',
  ];

  const included = [
    'Deal marketplace with Airdna-verified financials',
    'CRM pipeline with drag-and-drop stages',
    'Built-in messaging with property context',
    'Direct booking site (yourbrand.nfstay.app)',
    'nfstay Academy — 36 lessons, 9 modules',
    'Agent programme — 40% recurring commission',
    'JV Partners — invest from £500',
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased">
      {/* NAV */}
      <nav className="w-full px-6 md:px-12 py-5 flex items-center justify-between bg-white">
        <span className="text-lg font-semibold tracking-tight">nfstay</span>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Sign In
          </a>
          <a
            href="#"
            className="text-sm font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-full hover:bg-emerald-700 transition-colors"
          >
            Join
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 md:px-12 pt-28 pb-32 md:pt-40 md:pb-44 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto"
        >
          Find landlord-approved properties. Start hosting on Airbnb.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-8 text-lg text-neutral-400"
        >
          The UK's rent-to-rent marketplace.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10"
        >
          <a
            href="#"
            className="inline-block text-sm font-medium bg-emerald-600 text-white px-6 py-2.5 rounded-full hover:bg-emerald-700 transition-colors"
          >
            Explore Deals
          </a>
        </motion.div>
      </section>

      {/* THE PITCH */}
      <section className="px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-2xl mx-auto">
          <FadeIn className="my-12">
            <p className="text-lg md:text-xl leading-relaxed text-neutral-700">
              Finding rent-to-rent deals today is chaotic. Operators scroll through Gumtree,
              trawl Facebook groups, and rely on word of mouth. There is no single place where
              landlord-approved, compliance-ready properties are listed. Until now.
            </p>
          </FadeIn>
          <FadeIn className="my-12" delay={0.1}>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-700">
              nfstay is a marketplace built exclusively for serviced accommodation. Every
              property listed has landlord consent. Every deal includes verified financials —
              projected revenue, running costs, net profit. Every listing is compliance-checked
              before it goes live.
            </p>
          </FadeIn>
          <FadeIn className="my-12" delay={0.1}>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-700">
              Beyond the marketplace, you get the tools to run your business. A CRM pipeline
              to track every deal from enquiry to keys. A built-in messaging inbox with full
              property context. A direct booking site builder under your own brand.
            </p>
          </FadeIn>
          <FadeIn className="my-12" delay={0.1}>
            <p className="text-lg md:text-xl leading-relaxed text-neutral-700">
              nfstay is also a community. JV partnerships let investors deploy capital from
              £500. The Academy teaches the full rent-to-rent playbook across 36 structured
              lessons. The agent programme pays 40% recurring commission for every referral.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* THREE THINGS */}
      <section className="px-6 md:px-12 py-24 md:py-36 text-center">
        {statementLines.map((line, i) => (
          <FadeIn key={i} className="my-16 md:my-20" delay={i * 0.1}>
            <p className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight">
              {line}
            </p>
          </FadeIn>
        ))}
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-xl mx-auto">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-10">
              What's included
            </h2>
          </FadeIn>
          <ul className="space-y-4">
            {included.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <li className="flex items-start gap-3 text-lg text-neutral-700">
                  <ArrowRight className="w-4 h-4 mt-1.5 text-emerald-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 md:px-12 py-24 md:py-36 text-center">
        <FadeIn>
          <p className="text-xl md:text-2xl text-neutral-400">Free to browse.</p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-3xl md:text-5xl font-bold tracking-tight mt-6">
            £67/month for everything.
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="text-xl md:text-2xl text-neutral-400 mt-6">
            £997 for lifetime access.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <a
            href="#"
            className="inline-block mt-10 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors underline underline-offset-4"
          >
            Get Started
          </a>
        </FadeIn>
      </section>

      {/* SINGLE QUOTE */}
      <section className="px-6 md:px-12 py-24 md:py-36 text-center">
        <FadeIn>
          <blockquote className="max-w-3xl mx-auto">
            <p className="text-2xl md:text-4xl italic leading-snug text-neutral-800">
              "I signed my first deal within two weeks of joining nfstay."
            </p>
            <footer className="mt-8 text-sm text-neutral-400">
              — Tom H., Manchester
            </footer>
          </blockquote>
        </FadeIn>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 md:px-12 py-28 md:py-40 text-center">
        <FadeIn>
          <p className="text-4xl md:text-6xl font-bold tracking-tight">Ready?</p>
          <div className="mt-10">
            <a
              href="#"
              className="inline-block text-sm font-medium bg-emerald-600 text-white px-6 py-2.5 rounded-full hover:bg-emerald-700 transition-colors"
            >
              Explore Deals
            </a>
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 py-10 text-center border-t border-neutral-100">
        <p className="text-sm font-semibold tracking-tight">nfstay</p>
        <p className="mt-2 text-xs text-neutral-400">
          <a href="#" className="hover:text-neutral-600 transition-colors">Privacy</a>
          {' · '}
          <a href="#" className="hover:text-neutral-600 transition-colors">Terms</a>
        </p>
      </footer>
    </div>
  );
}
