import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, BarChart3, MessageSquare, Rocket,
  BookOpen, Users, CreditCard, Star, ChevronDown, ChevronUp,
  Menu, X, ArrowRight, Check, Zap, Globe, TrendingUp,
  Home, DollarSign, Shield, Award, Layers, Send,
  GraduationCap, Link2, Share2, BadgeCheck
} from 'lucide-react';

const GREEN = '#41ce8e';
const DARK = '#262c37';
const DARKEST = '#0f0f10';
const LIGHT_BG = '#f6f7f9';
const CARD_BORDER = '#e8eaed';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Variant11() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const navLinks = ['Deals', 'JV Partners', 'Booking Site', 'University', 'Agents', 'Pricing'];

  const stats = [
    { value: '120+', label: 'Verified Deals' },
    { value: '\u00a3680', label: 'Avg Monthly Profit' },
    { value: '15', label: 'UK Cities' },
    { value: '4.8/5', label: 'Operator Rating' },
  ];

  const deals = [
    { city: 'Manchester', postcode: 'M15 4UH', type: '2-bed house', rent: '\u00a31,000', profit: '\u00a3500' },
    { city: 'Liverpool', postcode: 'L1', type: '3-bed flat', rent: '\u00a31,200', profit: '\u00a3680' },
    { city: 'Leeds', postcode: 'LS1', type: '1-bed apartment', rent: '\u00a3750', profit: '\u00a3350' },
  ];

  const steps = [
    { num: 1, title: 'Browse Deals', desc: 'Explore landlord-approved rent-to-rent opportunities across 15 UK cities.' },
    { num: 2, title: 'Analyse Returns', desc: 'See monthly rent, estimated profit, occupancy data, and Airdna verification.' },
    { num: 3, title: 'Message & Negotiate', desc: 'Contact landlords directly through the built-in inbox with property context.' },
    { num: 4, title: 'Close & Host', desc: 'Secure your deal, set up your booking site, and start earning.' },
  ];

  const modules = [
    { title: 'Getting Started', lessons: 4, time: '45 min', xp: 120 },
    { title: 'Property Hunting', lessons: 6, time: '1h 20min', xp: 240 },
    { title: 'Landlord Pitching', lessons: 5, time: '1h 10min', xp: 200 },
  ];

  const testimonials = [
    { quote: 'Found my first deal in Manchester within a week. The CRM keeps me organised.', name: 'Tom H.', location: 'Manchester', detail: '2 properties' },
    { quote: 'The academy gave me confidence to pitch landlords. Now I run 4 units.', name: 'Sarah K.', location: 'Leeds', detail: '4 properties' },
    { quote: 'JV Partners let me invest in properties I couldn\'t afford alone.', name: 'Priya M.', location: 'London', detail: 'investor' },
  ];

  const faqs = [
    { q: 'What is rent-to-rent?', a: 'Rent-to-rent is a strategy where you lease a property from a landlord on a long-term basis, then sub-let it on a short-term or serviced accommodation basis. You pay the landlord a guaranteed rent and keep the difference as profit.' },
    { q: 'How does NFsTay verify deals?', a: 'Every deal on NFsTay is compliance-checked and landlord-approved. We verify financials using Airdna data, confirm landlord consent, and check that the property meets local authority requirements for short-let use.' },
    { q: 'Do I need experience?', a: 'No. NFsTay Academy provides 9 modules and 36 lessons covering everything from finding your first deal to scaling a portfolio. Many of our operators started with zero experience.' },
    { q: 'What\u2019s included in the free plan?', a: 'The free plan lets you browse all live deals, view listing details, and access limited academy content. To unlock the CRM, inbox, booking site builder, and full academy, you\u2019ll need a Pro or Lifetime plan.' },
    { q: 'How do JV partnerships work?', a: 'JV Partners lets you buy fractional shares in high-performing Airbnb properties from just $1 per share. You earn monthly rental income proportional to your stake and can vote on property management decisions.' },
    { q: 'Can I build a booking site?', a: 'Yes. Pro and Lifetime members can launch a fully branded direct booking site at yourbrand.nfstay.app. List your properties, accept bookings, and avoid platform commissions entirely.' },
  ];

  const tiers = [
    {
      name: 'Free',
      price: '\u00a30',
      period: '',
      features: ['Browse all live deals', 'View listing details', 'Limited academy access', 'Community forum'],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '\u00a367',
      period: '/month',
      alt: '\u00a3397/year',
      features: ['Everything in Free', 'Full CRM & inbox', 'Booking site builder', 'Complete academy', 'Airdna-verified data', 'Priority support'],
      cta: 'Start Pro',
      highlighted: false,
    },
    {
      name: 'Lifetime',
      price: '\u00a3997',
      period: ' one-time',
      features: ['Everything in Pro', 'Lifetime access forever', 'Early feature access', 'Dedicated onboarding', 'Agent programme access', 'VIP support'],
      cta: 'Go Lifetime',
      highlighted: true,
    },
  ];

  const journeyLevels = ['Noobie', 'Deal Rookie', 'Cashflow Builder', 'Portfolio Boss', 'Property Titan'];

  const payouts = [
    { date: '15 Mar 2026', property: 'Manchester M15', amount: '\u00a312.40', status: 'Paid' },
    { date: '15 Feb 2026', property: 'Liverpool L1', amount: '\u00a38.90', status: 'Paid' },
    { date: '15 Jan 2026', property: 'Leeds LS1', amount: '\u00a36.20', status: 'Paid' },
  ];

  const crmColumns = [
    { title: 'New Lead', color: '#93c5fd', cards: ['3-bed Liverpool', '1-bed Bristol'] },
    { title: 'Under Negotiation', color: '#fbbf24', cards: ['2-bed Manchester'] },
    { title: 'Contract Sent', color: GREEN, cards: ['Studio Leeds'] },
    { title: 'Follow Up', color: '#f87171', cards: ['4-bed Birmingham'] },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }} className="min-h-screen bg-[#f6f7f9] text-[#262c37]">

        {/* ───────────────────── 1. NAVBAR ───────────────────── */}
        <nav className="sticky top-0 z-50 h-[72px] flex items-center justify-between px-6 lg:px-12 bg-white/80 backdrop-blur-md border-b border-[#e8eaed]">
          <span className="text-xl font-bold tracking-tight" style={{ color: DARK }}>NFsTay</span>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-sm font-medium text-[#262c37]/70 hover:text-[#262c37] transition-colors duration-200">
                {l}
              </a>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-[#262c37]/70 hover:text-[#262c37] transition-colors duration-200">Sign In</a>
            <button className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-[72px] left-0 w-full bg-white border-b border-[#e8eaed] shadow-lg md:hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                {navLinks.map((l) => (
                  <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-sm font-medium text-[#262c37]/70" onClick={() => setMobileMenuOpen(false)}>
                    {l}
                  </a>
                ))}
                <hr className="border-[#e8eaed]" />
                <a href="#" className="text-sm font-medium text-[#262c37]/70">Sign In</a>
                <button className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg w-full" style={{ backgroundColor: GREEN }}>
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </nav>

        {/* ───────────────────── 2. HERO ───────────────────── */}
        <section className="py-20 md:py-28 px-6" style={{ backgroundColor: LIGHT_BG }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-4xl mx-auto text-center">
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: GREEN, fontSize: 12, lineHeight: '150%' }}>
              The UK's Rent-to-Rent Marketplace
            </motion.p>
            <motion.h1 variants={fadeUp} className="font-bold mb-6" style={{ fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: '120%', letterSpacing: '-0.96px', color: DARK }}>
              Find landlord-approved Airbnb deals and start earning
            </motion.h1>
            <motion.p variants={fadeUp} className="text-base leading-relaxed max-w-2xl mx-auto mb-8" style={{ color: '#262c37cc', fontSize: 16, lineHeight: '160%' }}>
              NFsTay is the all-in-one platform for rent-to-rent operators. Browse verified deals, manage your pipeline, build your booking site, and grow your portfolio — all from one dashboard.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <button className="px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:shadow-lg" style={{ backgroundColor: GREEN }}>
                Browse Live Deals
              </button>
              <button className="px-8 py-3.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 hover:bg-[#262c37] hover:text-white" style={{ borderColor: DARK, color: DARK }}>
                See How It Works
              </button>
            </motion.div>
            <motion.p variants={fadeUp} className="text-xs font-medium" style={{ color: '#262c37aa' }}>
              Free to browse. 120+ live deals. 15 UK cities.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-12 w-full aspect-video bg-white rounded-2xl shadow-lg border border-[#e8eaed] flex items-center justify-center">
              <span className="text-sm font-medium" style={{ color: '#262c37aa' }}>NFsTay Dashboard Preview</span>
            </motion.div>
          </motion.div>
        </section>

        {/* ───────────────────── 3. STATS BAR ───────────────────── */}
        <section className="bg-white border-y border-[#e8eaed]">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 py-10 px-6 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold" style={{ color: DARK }}>{s.value}</p>
                <p className="text-xs font-medium mt-1 uppercase tracking-wide" style={{ color: '#262c37aa' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────────────── 4. DEALS MARKETPLACE ───────────────────── */}
        <section id="deals" className="py-20 px-6" style={{ backgroundColor: LIGHT_BG }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold mb-4" style={{ fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: '120%', color: DARK }}>
                Browse Landlord-Approved Deals
              </h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#262c37cc', lineHeight: '160%' }}>
                Every property is compliance-checked, landlord-approved, and listed with verified financials including Airdna data.
              </p>
            </motion.div>
            <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6 mb-10">
              {deals.map((d) => (
                <motion.div key={d.postcode} variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <div className="h-48 flex items-center justify-center" style={{ backgroundColor: CARD_BORDER, borderRadius: '16px 16px 0 0' }}>
                    <span className="text-xs font-medium" style={{ color: '#262c37aa' }}>Property Image</span>
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: GREEN }}>{d.city} · {d.postcode}</p>
                    <p className="text-lg font-bold mb-3" style={{ color: DARK }}>{d.type}</p>
                    <div className="flex justify-between mb-4">
                      <div>
                        <p className="text-xs" style={{ color: '#262c37aa' }}>Monthly Rent</p>
                        <p className="text-sm font-bold" style={{ color: DARK }}>{d.rent}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#262c37aa' }}>Est. Profit</p>
                        <p className="text-sm font-bold" style={{ color: GREEN }}>{d.profit}</p>
                      </div>
                    </div>
                    <p className="text-[10px] mb-4" style={{ color: '#262c37aa' }}>Airdna verified</p>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors duration-200 hover:bg-gray-50" style={{ borderColor: CARD_BORDER, color: DARK }}>
                        Visit Listing
                      </button>
                      <button className="flex-1 py-2 text-xs font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                        Inquire Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            <div className="text-center">
              <button className="px-8 py-3 text-sm font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                View All Deals <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 5. HOW IT WORKS ───────────────────── */}
        <section className="py-20 px-6 bg-white">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-bold text-center mb-16" style={{ fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: '120%', color: DARK }}>
              How NFsTay Works
            </motion.h2>
            <div className="grid md:grid-cols-4 gap-8 relative">
              {/* Connecting line — desktop only */}
              <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5" style={{ backgroundColor: CARD_BORDER }} />
              {steps.map((s) => (
                <motion.div key={s.num} variants={fadeUp} className="flex flex-col items-center text-center relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4 relative z-10" style={{ backgroundColor: GREEN }}>
                    {s.num}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: DARK }}>{s.title}</h3>
                  <p className="text-sm" style={{ color: '#262c37aa', lineHeight: '160%' }}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 6. JV PARTNERS / INVESTMENT ───────────────────── */}
        <section id="jv-partners" className="py-20 px-6" style={{ backgroundColor: LIGHT_BG }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold mb-4" style={{ color: DARK }}>Invest in UK Short-Lets</h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#262c37cc', lineHeight: '160%' }}>
                Buy shares in high-performing Airbnb properties from just $1 per share. Earn monthly rental income and vote on property decisions.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Portfolio card */}
              <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-8">
                <p className="text-xs font-semibold uppercase tracking-wide mb-6" style={{ color: '#262c37aa' }}>Your Portfolio</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs" style={{ color: '#262c37aa' }}>Total Contributed</p>
                    <p className="text-xl font-bold" style={{ color: DARK }}>$16.00</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#262c37aa' }}>Total Earnings</p>
                    <p className="text-xl font-bold" style={{ color: GREEN }}>$1.53</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#262c37aa' }}>Current APR</p>
                    <p className="text-xl font-bold" style={{ color: DARK }}>13.3%</p>
                  </div>
                </div>
                <div className="h-24 rounded-xl flex items-center justify-center" style={{ backgroundColor: LIGHT_BG }}>
                  <TrendingUp className="w-6 h-6 mr-2" style={{ color: GREEN }} />
                  <span className="text-xs font-medium" style={{ color: '#262c37aa' }}>Portfolio Growth Chart</span>
                </div>
              </motion.div>

              {/* Payout history */}
              <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-8">
                <p className="text-xs font-semibold uppercase tracking-wide mb-6" style={{ color: '#262c37aa' }}>Payout History</p>
                <div className="space-y-4">
                  {payouts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-[#e8eaed] last:border-0">
                      <div>
                        <p className="text-sm font-medium" style={{ color: DARK }}>{p.property}</p>
                        <p className="text-xs" style={{ color: '#262c37aa' }}>{p.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: DARK }}>{p.amount}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: GREEN }}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Journey progression */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-8 mb-10">
              <p className="text-xs font-semibold uppercase tracking-wide mb-6 text-center" style={{ color: '#262c37aa' }}>Your Journey</p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-0">
                {journeyLevels.map((level, i) => (
                  <React.Fragment key={level}>
                    <div className={`px-4 py-2 rounded-full text-xs font-semibold ${i === 0 ? 'text-white' : ''}`}
                      style={{ backgroundColor: i === 0 ? GREEN : LIGHT_BG, color: i === 0 ? '#fff' : '#262c37aa' }}>
                      {level}
                    </div>
                    {i < journeyLevels.length - 1 && <ArrowRight className="hidden md:block w-4 h-4 mx-2" style={{ color: CARD_BORDER }} />}
                  </React.Fragment>
                ))}
              </div>
            </motion.div>

            <div className="text-center">
              <button className="px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Start Investing <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 7. CRM & INBOX ───────────────────── */}
        <section className="py-20 px-6 bg-white">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold mb-4" style={{ color: DARK }}>Manage Your Pipeline</h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#262c37cc', lineHeight: '160%' }}>
                Track every deal from first contact to signed contract. Message landlords, manage stages, and close deals without leaving NFsTay.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              {/* CRM Kanban */}
              <motion.div variants={fadeUp} className="bg-[#f6f7f9] rounded-2xl border border-[#e8eaed] p-6 overflow-x-auto">
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#262c37aa' }}>Deal Pipeline</p>
                <div className="flex gap-3 min-w-[560px]">
                  {crmColumns.map((col) => (
                    <div key={col.title} className="flex-1 min-w-[130px]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                        <span className="text-[11px] font-semibold" style={{ color: DARK }}>{col.title}</span>
                      </div>
                      <div className="space-y-2">
                        {col.cards.map((c) => (
                          <div key={c} className="bg-white rounded-lg p-3 border border-[#e8eaed] shadow-sm">
                            <p className="text-xs font-medium" style={{ color: DARK }}>{c}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Inbox preview */}
              <motion.div variants={fadeUp} className="bg-[#f6f7f9] rounded-2xl border border-[#e8eaed] p-6">
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#262c37aa' }}>Inbox</p>
                <div className="space-y-3 mb-4">
                  {['Landlord — M15 4UH', 'Agent — Liverpool L1', 'Landlord — LS1 Flat'].map((thread, i) => (
                    <div key={thread} className={`bg-white rounded-lg p-3 border ${i === 0 ? 'border-[#41ce8e]' : 'border-[#e8eaed]'}`}>
                      <p className="text-xs font-semibold" style={{ color: DARK }}>{thread}</p>
                      <p className="text-[11px] mt-1" style={{ color: '#262c37aa' }}>
                        {i === 0 ? 'Happy to discuss terms further...' : i === 1 ? 'Contract ready for review.' : 'Viewing scheduled for Friday.'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e8eaed]">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" style={{ color: GREEN }} />
                    <span className="text-xs font-bold" style={{ color: GREEN }}>Earnings Estimate</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: DARK }}>You could earn <strong style={{ color: GREEN }}>{'\u00a3'}1,010</strong> hosting this property</p>
                </div>
              </motion.div>
            </div>
            <div className="text-center">
              <button className="px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Start Your Pipeline <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 8. BOOKING SITE BUILDER ───────────────────── */}
        <section id="booking-site" className="py-20 px-6" style={{ backgroundColor: LIGHT_BG }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold mb-4" style={{ color: DARK }}>Build Your Direct Booking Site</h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#262c37cc', lineHeight: '160%' }}>
                Launch yourbrand.nfstay.app in minutes. Your brand, your properties, your bookings — without paying Airbnb commissions.
              </p>
            </motion.div>

            {/* Mock browser window */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-lg border border-[#e8eaed] overflow-hidden mb-10">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#e8eaed]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#f87171]" />
                  <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
                  <div className="w-3 h-3 rounded-full bg-[#34d399]" />
                </div>
                <div className="flex-1 ml-4 bg-[#f6f7f9] rounded-md px-4 py-1.5">
                  <p className="text-[11px] font-medium" style={{ color: '#262c37aa' }}>yourbrand.nfstay.app</p>
                </div>
              </div>
              {/* Content area */}
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['Modern Studio — Manchester', 'Cosy Flat — Liverpool', 'City Loft — Leeds'].map((name) => (
                    <div key={name} className="rounded-xl border border-[#e8eaed] overflow-hidden">
                      <div className="h-28" style={{ backgroundColor: CARD_BORDER }} />
                      <div className="p-3">
                        <p className="text-xs font-semibold" style={{ color: DARK }}>{name}</p>
                        <p className="text-[10px] mt-1" style={{ color: GREEN }}>From {'\u00a3'}85/night</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Feature pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {['Custom Branding', 'Direct Bookings', 'Zero Commission', 'Your Domain'].map((pill) => (
                <span key={pill} className="px-4 py-2 rounded-full bg-white border border-[#e8eaed] text-xs font-semibold" style={{ color: DARK }}>
                  <Check className="inline w-3.5 h-3.5 mr-1.5" style={{ color: GREEN }} />
                  {pill}
                </span>
              ))}
            </motion.div>

            <div className="text-center">
              <button className="px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Build Your Site <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 9. UNIVERSITY / ACADEMY ───────────────────── */}
        <section id="university" className="py-20 px-6 bg-white">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <h2 className="text-2xl md:text-4xl font-bold" style={{ color: DARK }}>NFsTay Academy</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full" style={{ backgroundColor: `${GREEN}18`, color: GREEN }}>
                  UK-Focused Training
                </span>
              </div>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#262c37cc', lineHeight: '160%' }}>
                9 modules, 36 lessons, 36 checklists — built by operators with 15+ years of experience.
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6 mb-10">
              {modules.map((m) => (
                <motion.div key={m.title} variants={fadeUp} className="bg-[#f6f7f9] rounded-2xl border border-[#e8eaed] p-6 hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${GREEN}18` }}>
                    <GraduationCap className="w-6 h-6" style={{ color: GREEN }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: DARK }}>{m.title}</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-xs" style={{ color: '#262c37aa' }}>{m.lessons} lessons</span>
                    <span className="text-xs" style={{ color: '#262c37aa' }}>{m.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: GREEN }} />
                    <span className="text-xs font-semibold" style={{ color: GREEN }}>{m.xp} XP</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Gamification bar */}
            <motion.div variants={fadeUp} className="bg-[#f6f7f9] rounded-2xl border border-[#e8eaed] p-6 mb-10 max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" style={{ color: GREEN }} />
                  <span className="text-xs font-semibold" style={{ color: DARK }}>Level 3 — Cashflow Builder</span>
                </div>
                <span className="text-xs font-bold" style={{ color: GREEN }}>560 XP</span>
              </div>
              <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: CARD_BORDER }}>
                <div className="h-2.5 rounded-full" style={{ backgroundColor: GREEN, width: '56%' }} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px]" style={{ color: '#262c37aa' }}>5-day streak</span>
                <span className="text-[10px]" style={{ color: '#262c37aa' }}>440 XP to Level 4</span>
              </div>
            </motion.div>

            <div className="text-center">
              <button className="px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Start Learning <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 10. AGENT / AFFILIATE ───────────────────── */}
        <section id="agents" className="py-20 px-6" style={{ backgroundColor: LIGHT_BG }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold mb-4" style={{ color: DARK }}>Earn as an NFsTay Agent</h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#262c37cc', lineHeight: '160%' }}>
                Share your link. Earn 40% recurring commission on subscriptions and 10% on JV deals.
              </p>
            </motion.div>

            {/* 3-step flow */}
            <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-8 mb-10">
              {[
                { icon: <Share2 className="w-6 h-6" />, title: 'Share Link', desc: 'Get your unique referral link and share it on social media, email, or in communities.' },
                { icon: <Users className="w-6 h-6" />, title: 'User Joins', desc: 'When someone signs up through your link, they are tracked to your account permanently.' },
                { icon: <DollarSign className="w-6 h-6" />, title: 'You Get Paid', desc: 'Earn 40% recurring on their subscription and 10% on any JV investments they make.' },
              ].map((s) => (
                <motion.div key={s.title} variants={fadeUp} className="bg-white rounded-2xl border border-[#e8eaed] p-6 text-center">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${GREEN}18`, color: GREEN }}>
                    {s.icon}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: DARK }}>{s.title}</h3>
                  <p className="text-sm" style={{ color: '#262c37aa', lineHeight: '160%' }}>{s.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8eaed] p-8 text-center mb-10">
              <p className="text-sm mb-1" style={{ color: '#262c37aa' }}>Earnings Highlight</p>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: DARK }}>
                Refer 10 lifetime members = <span style={{ color: GREEN }}>{'\u00a3'}3,988</span>
              </p>
            </motion.div>

            <div className="text-center">
              <button className="px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-opacity duration-200 hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Become an Agent <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* ───────────────────── 11. PRICING ───────────────────── */}
        <section id="pricing" className="py-20 px-6 bg-white">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-bold text-center mb-4" style={{ color: DARK }}>
              Simple, Transparent Pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base text-center max-w-2xl mx-auto mb-12" style={{ color: '#262c37cc', lineHeight: '160%' }}>
              All plans include 15 UK cities, Airdna-verified data, and direct landlord access.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6">
              {tiers.map((t) => (
                <motion.div
                  key={t.name}
                  variants={fadeUp}
                  className={`rounded-2xl p-8 border-2 transition-shadow duration-300 hover:shadow-lg ${t.highlighted ? 'shadow-md' : ''}`}
                  style={{
                    borderColor: t.highlighted ? GREEN : CARD_BORDER,
                    backgroundColor: t.highlighted ? '#f9fefb' : '#fff',
                  }}
                >
                  {t.highlighted && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full text-white mb-4 inline-block" style={{ backgroundColor: GREEN }}>
                      Best Value
                    </span>
                  )}
                  <h3 className="text-lg font-bold mb-2" style={{ color: DARK }}>{t.name}</h3>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold" style={{ color: DARK }}>{t.price}</span>
                    {t.period && <span className="text-sm mb-1" style={{ color: '#262c37aa' }}>{t.period}</span>}
                  </div>
                  {'alt' in t && t.alt && <p className="text-xs mb-6" style={{ color: '#262c37aa' }}>or {t.alt}</p>}
                  {!('alt' in t) && <div className="mb-6" />}
                  <ul className="space-y-3 mb-8">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GREEN }} />
                        <span className="text-sm" style={{ color: '#262c37cc' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="w-full py-3 text-sm font-semibold rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: t.name === 'Free' ? 'transparent' : GREEN,
                      color: t.name === 'Free' ? DARK : '#fff',
                      border: t.name === 'Free' ? `2px solid ${CARD_BORDER}` : 'none',
                    }}
                  >
                    {t.cta}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ───────────────────── 12. TESTIMONIALS ───────────────────── */}
        <section className="py-20 px-6" style={{ backgroundColor: LIGHT_BG }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-6xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-bold text-center mb-12" style={{ color: DARK }}>
              What Operators Are Saying
            </motion.h2>
            <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <motion.div key={t.name} variants={fadeUp} className="bg-white rounded-2xl border border-[#e8eaed] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#fbbf24' }} />
                    ))}
                  </div>
                  <p className="text-sm mb-6" style={{ color: '#262c37cc', lineHeight: '170%' }}>"{t.quote}"</p>
                  <div>
                    <p className="text-sm font-bold" style={{ color: DARK }}>{t.name}</p>
                    <p className="text-xs" style={{ color: '#262c37aa' }}>{t.location} — {t.detail}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ───────────────────── 13. FAQ ───────────────────── */}
        <section className="py-20 px-6 bg-white">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-bold text-center mb-12" style={{ color: DARK }}>
              Frequently Asked Questions
            </motion.h2>
            <motion.div variants={staggerContainer} className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={fadeUp} className="bg-[#f6f7f9] rounded-2xl border border-[#e8eaed] overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-5 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-sm font-semibold pr-4" style={{ color: DARK }}>{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-5 h-5 flex-shrink-0" style={{ color: '#262c37aa' }} /> : <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: '#262c37aa' }} />}
                  </button>
                  {openFaq === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-5"
                    >
                      <p className="text-sm" style={{ color: '#262c37aa', lineHeight: '170%' }}>{faq.a}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ───────────────────── 14. FINAL CTA ───────────────────── */}
        <section className="py-20 px-6" style={{ backgroundColor: DARK }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="max-w-3xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-bold mb-4 text-white" style={{ lineHeight: '120%' }}>
              Ready to find your first rent-to-rent deal?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '160%' }}>
              Join 200+ UK operators building their portfolios with NFsTay.
            </motion.p>
            <motion.div variants={fadeUp}>
              <button className="px-10 py-4 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:shadow-xl" style={{ backgroundColor: GREEN }}>
                Browse Live Deals <ArrowRight className="inline ml-1 w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ───────────────────── 15. FOOTER ───────────────────── */}
        <footer className="py-16 px-6" style={{ backgroundColor: DARKEST }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              {/* Logo column */}
              <div className="col-span-2 md:col-span-1">
                <span className="text-xl font-bold text-white">NFsTay</span>
                <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: '160%' }}>
                  The UK's rent-to-rent marketplace for operators and investors.
                </p>
              </div>
              {/* Link columns */}
              {[
                { title: 'Product', links: ['Deals', 'JV Partners', 'Booking Site', 'University'] },
                { title: 'Company', links: ['About', 'Careers', 'Blog'] },
                { title: 'Legal', links: ['Privacy', 'Terms'] },
                { title: 'Support', links: ['Help', 'Contact'] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{col.title}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-sm transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.6)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t pt-8" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Copyright 2025 NFsTay. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
