import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  LayoutGrid,
  MessageSquare,
  Globe,
  GraduationCap,
  Users,
  Menu,
  X,
  Check,
  ChevronDown,
  Star,
  ArrowRight,
  Zap,
  Flame,
  Trophy,
  Share2,
  UserPlus,
  DollarSign,
  Sparkles,
  Shield,
  BarChart3,
  Repeat,
  Search,
} from 'lucide-react';

const colors = {
  primary: '#262c37',
  darkest: '#0f0f10',
  accent: '#41ce8e',
  light: '#f6f7f9',
  white: '#ffffff',
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Variant13() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const navLinks = ['Deals', 'Features', 'JV Partners', 'Academy', 'Pricing'];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── NAVBAR ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100"
        style={{ height: 72 }}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: colors.primary }}>
            nfstay
          </span>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/\s/g, '-')}`}
                className="text-sm font-semibold transition-colors duration-200"
                style={{ color: colors.primary }}
              >
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="#pricing"
              className="text-sm font-semibold transition-colors duration-200"
              style={{ color: colors.primary }}
            >
              Log in
            </a>
            <a
              href="#pricing"
              className="text-sm font-bold px-5 py-2.5 rounded-lg transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent, color: colors.white }}
            >
              Get Started
            </a>
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/\s/g, '-')}`}
                className="text-sm font-semibold"
                style={{ color: colors.primary }}
                onClick={() => setMobileOpen(false)}
              >
                {l}
              </a>
            ))}
            <a
              href="#pricing"
              className="text-sm font-bold px-5 py-2.5 rounded-lg text-center"
              style={{ background: colors.accent, color: colors.white }}
            >
              Get Started
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative pt-[72px] overflow-hidden"
        style={{ background: colors.darkest }}
      >
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.accent}14 0%, transparent 70%)`,
          }}
        />

        <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-20 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-6"
              style={{ color: colors.accent, letterSpacing: '0.15em' }}
            >
              Rent-to-Rent Made Simple
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-[56px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white max-w-3xl"
            >
              Stop searching.
              <br />
              Start hosting.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg md:text-xl leading-relaxed max-w-2xl"
              style={{ color: 'rgba(246,247,249,0.7)' }}
            >
              nfstay puts landlord-approved Airbnb deals, a full CRM pipeline, direct booking site,
              investor partnerships, and operator training in one platform. The UK's fastest-growing
              rent-to-rent marketplace.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href="#deals"
                className="inline-flex items-center justify-center h-14 px-10 rounded-lg text-base font-bold transition-all duration-200 hover:opacity-90"
                style={{ background: colors.accent, color: colors.white }}
              >
                Browse Live Deals
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center h-14 px-10 rounded-lg text-base font-bold border-2 border-white/30 text-white transition-all duration-200 hover:border-white/60"
              >
                See Pricing
              </a>
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-16 rounded-2xl p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6"
            style={{ background: colors.primary }}
          >
            {[
              { value: '120+', label: 'Live Deals' },
              { value: '\u00a3680', label: 'Avg Monthly Profit' },
              { value: '15', label: 'UK Cities' },
              { value: '4.8/5', label: 'Operator Rating' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── DEALS MARKETPLACE ── */}
      <section id="deals" className="py-20 md:py-28" style={{ background: colors.light }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Landlord-Approved Deals
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: '#6b7280', lineHeight: '160%' }}>
              Every deal is compliance-checked, financially verified with Airdna data, and ready to operate.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              { city: 'Manchester', beds: '2-bed Apartment', rent: 1000, profit: 500 },
              { city: 'Leeds', beds: '3-bed Terrace', rent: 1200, profit: 680 },
              { city: 'Birmingham', beds: '1-bed Flat', rent: 850, profit: 400 },
            ].map((d) => (
              <motion.div
                key={d.city}
                variants={fadeUp}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300">
                  <span
                    className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ background: colors.accent }}
                  >
                    Live
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 mb-1">
                    <MapPin size={14} /> {d.city}
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: colors.primary }}>{d.beds}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-semibold">Monthly Rent</div>
                      <div className="text-lg font-bold" style={{ color: colors.primary }}>{'\u00a3'}{d.rent.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase font-semibold" style={{ color: colors.accent }}>Est. Profit</div>
                      <div className="text-lg font-bold" style={{ color: colors.accent }}>{'\u00a3'}{d.profit}/mo</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                    <Check size={12} style={{ color: colors.accent }} /> Airdna verified
                  </div>
                  <div className="mt-5 flex gap-3">
                    <button
                      className="flex-1 h-10 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
                      style={{ background: colors.accent }}
                    >
                      View Deal
                    </button>
                    <button
                      className="flex-1 h-10 rounded-lg text-sm font-bold border transition-all duration-200 hover:bg-gray-50"
                      style={{ borderColor: '#e5e7eb', color: colors.primary }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-12">
            <a
              href="#deals"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-bold transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent, color: colors.white }}
            >
              Explore All Deals <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES ── */}
      <section id="features" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Everything You Need
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              One platform to find, manage, and scale your rent-to-rent portfolio.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Deal Marketplace', desc: 'Browse 120+ verified rent-to-rent properties across 15 UK cities. Filter by profit, location, and property type.' },
              { icon: LayoutGrid, title: 'CRM Pipeline', desc: 'Track deals from first contact to signed contract with drag-and-drop stages. Never lose a lead again.' },
              { icon: MessageSquare, title: 'Inbox Messaging', desc: 'Message landlords directly with property context, earnings estimates, and professional templates built in.' },
              { icon: Globe, title: 'Direct Booking Site', desc: 'Launch yourbrand.nfstay.app with custom branding and zero commission. Own your guests, own your revenue.' },
              { icon: GraduationCap, title: 'nfstay Academy', desc: '9 modules, 36 lessons, XP system. Learn rent-to-rent from experienced operators who run real portfolios.' },
              { icon: Users, title: 'Agent Programme', desc: 'Earn 40% recurring commission by referring new members. Share your link, build passive income.' },
            ].map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="rounded-2xl p-8 transition-all duration-200 hover:shadow-md"
                style={{ background: colors.light }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                  style={{ background: `${colors.accent}18` }}
                >
                  <f.icon size={22} style={{ color: colors.accent }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: colors.primary }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── JV PARTNERS ── */}
      <section id="jv-partners" className="py-20 md:py-28" style={{ background: colors.primary }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em] text-white text-center">
              Partner on UK Airbnbs
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-center max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Invest from $1 per share. Earn monthly rental income. Vote on property decisions.
            </motion.p>
          </motion.div>

          <div className="mt-14 grid lg:grid-cols-2 gap-8">
            {/* Featured property */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: colors.darkest }}
            >
              <div className="h-52 bg-gradient-to-br from-gray-700 to-gray-800 relative">
                <span
                  className="absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full text-white"
                  style={{ background: colors.accent }}
                >
                  Featured
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white">Pembroke Place, Liverpool</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {[
                    { label: 'Share Price', value: '$1' },
                    { label: 'Total Value', value: '$52K' },
                    { label: 'Owners', value: '10' },
                    { label: 'Target APR', value: '13.3%' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-xs text-gray-500 uppercase font-semibold">{s.label}</div>
                      <div className="text-lg font-bold text-white">{s.value}</div>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-6 w-full h-12 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
                  style={{ background: colors.accent }}
                >
                  View Property
                </button>
              </div>
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col justify-center"
            >
              <h3 className="text-xl font-bold text-white mb-8">How JV Works</h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Choose Property', desc: 'Browse vetted UK Airbnb properties with full financials.' },
                  { step: '02', title: 'Buy Shares', desc: 'Invest from $1 per share. Own a fraction of real property.' },
                  { step: '03', title: 'Earn Income', desc: 'Receive monthly rental income proportional to your shares.' },
                  { step: '04', title: 'Vote on Decisions', desc: 'Participate in property management decisions as a co-owner.' },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: `${colors.accent}20`, color: colors.accent }}
                    >
                      {s.step}
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{s.title}</div>
                      <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Portfolio journey */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-12 rounded-2xl p-6 flex flex-wrap items-center justify-center gap-4 md:gap-8"
            style={{ background: colors.darkest }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Portfolio Journey:
            </span>
            {['Noobie', 'Explorer', 'Investor', 'Portfolio Pro', 'Property Titan'].map((level, i) => (
              <React.Fragment key={level}>
                <span className="text-sm font-bold" style={{ color: i === 0 ? colors.accent : 'rgba(255,255,255,0.6)' }}>
                  {level}
                </span>
                {i < 4 && <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />}
              </React.Fragment>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <a
              href="#jv-partners"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent }}
            >
              View Properties <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── CRM & INBOX DEEP DIVE ── */}
      <section className="py-20 md:py-28" style={{ background: colors.light }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Your Pipeline. Your Inbox. Your Deals.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              Manage every landlord conversation and deal stage from one dashboard.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl overflow-hidden shadow-xl"
            style={{ background: colors.white }}
          >
            <div className="grid lg:grid-cols-2 min-h-[420px]">
              {/* CRM board mock */}
              <div className="p-6 border-r border-gray-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">CRM Pipeline</div>
                <div className="grid grid-cols-4 gap-3">
                  {['New Lead', 'Contacted', 'Viewing', 'Signed'].map((stage, i) => (
                    <div key={stage}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: i === 3 ? colors.accent : '#9ca3af' }}>
                        {stage}
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: 3 - Math.floor(i * 0.5) }).map((_, j) => (
                          <div
                            key={j}
                            className="rounded-lg p-2.5 border border-gray-100"
                            style={{ background: colors.light }}
                          >
                            <div className="h-2 w-16 bg-gray-200 rounded mb-1.5" />
                            <div className="h-1.5 w-12 bg-gray-200 rounded" />
                            <div className="mt-2 flex items-center gap-1">
                              <div className="h-1.5 w-8 rounded" style={{ background: `${colors.accent}40` }} />
                              <div className="h-1.5 w-6 bg-gray-200 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inbox mock */}
              <div className="p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Inbox</div>
                <div className="space-y-3">
                  {[
                    { from: 'You', msg: 'Hi Mrs. Johnson, I saw your property listed on Rightmove...', time: '2m' },
                    { from: 'Landlord', msg: 'Yes, it\'s still available. What did you have in mind?', time: '5m' },
                    { from: 'You', msg: 'I\'d like to discuss a guaranteed rent arrangement.', time: '8m' },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-3 max-w-[85%] ${m.from === 'You' ? 'ml-auto' : ''}`}
                      style={{
                        background: m.from === 'You' ? `${colors.accent}12` : colors.light,
                        borderLeft: m.from === 'You' ? `3px solid ${colors.accent}` : 'none',
                      }}
                    >
                      <div className="text-[10px] font-bold text-gray-400 mb-1">{m.from} &middot; {m.time} ago</div>
                      <div className="text-xs text-gray-700">{m.msg}</div>
                    </div>
                  ))}
                  <div
                    className="rounded-xl p-4 border-2 mt-4"
                    style={{ borderColor: colors.accent, background: `${colors.accent}08` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 size={14} style={{ color: colors.accent }} />
                      <span className="text-xs font-bold" style={{ color: colors.accent }}>Earnings Estimate</span>
                    </div>
                    <div className="text-sm font-bold" style={{ color: colors.primary }}>
                      You could earn {'\u00a3'}1,010/mo hosting this property on Airbnb
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="text-center mt-10">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent }}
            >
              Start Your Pipeline <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── BOOKING SITE ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Build Your Direct Booking Channel
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              Stop paying OTA commissions. Launch your own branded booking site in minutes.
            </motion.p>
          </motion.div>

          {/* Browser mock */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto rounded-2xl shadow-xl overflow-hidden"
            style={{ background: colors.light }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 h-7 rounded-md bg-gray-100 flex items-center px-3 text-xs text-gray-400">
                yourbrand.nfstay.app
              </div>
            </div>

            {/* Mock site content */}
            <div className="p-6 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="h-4 w-24 bg-gray-300 rounded" />
                <div className="flex gap-3">
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>
                  Find Your Perfect Stay
                </div>
                <div className="mt-4 max-w-md mx-auto h-10 rounded-lg bg-white border border-gray-200 flex items-center px-4 gap-2">
                  <Search size={14} className="text-gray-300" />
                  <span className="text-xs text-gray-300">Search destinations...</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['Manchester Loft', 'Leeds Suite', 'Birmingham Studio'].map((p) => (
                  <div key={p} className="rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-300" />
                    <div className="p-3">
                      <div className="text-xs font-bold" style={{ color: colors.primary }}>{p}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{'\u00a3'}89/night</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Sparkles, title: 'Custom Branding', desc: 'Your logo, your colours, your domain.' },
              { icon: Shield, title: 'Zero Commission', desc: 'Keep 100% of every booking.' },
              { icon: Users, title: 'Guest Data Ownership', desc: 'Build your own guest database.' },
              { icon: Repeat, title: 'Repeat Bookings', desc: 'Direct relationships, loyal guests.' },
            ].map((b) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                className="rounded-2xl p-6 text-center"
                style={{ background: colors.light }}
              >
                <b.icon size={24} className="mx-auto mb-3" style={{ color: colors.accent }} />
                <div className="text-sm font-bold mb-1" style={{ color: colors.primary }}>{b.title}</div>
                <div className="text-xs text-gray-500">{b.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent }}
            >
              Build Your Site <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── UNIVERSITY ── */}
      <section id="academy" className="py-20 md:py-28" style={{ background: colors.light }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Learn Rent-to-Rent from the Ground Up
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              nfstay Academy: 9 modules, 36 lessons, 36 checklists. Beginner to intermediate.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Getting Started', lessons: 4, time: '~30 min', xp: 320, progress: 100 },
              { title: 'Property Hunting', lessons: 4, time: '~32 min', xp: 350, progress: 60 },
              { title: 'Landlord Pitching', lessons: 4, time: '~26 min', xp: 280, progress: 25 },
            ].map((m) => (
              <motion.div
                key={m.title}
                variants={fadeUp}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <GraduationCap size={20} style={{ color: colors.accent }} />
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${colors.accent}15`, color: colors.accent }}>
                    +{m.xp} XP
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1" style={{ color: colors.primary }}>{m.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{m.lessons} lessons &middot; {m.time}</p>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${m.progress}%`, background: colors.accent }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1.5">{m.progress}% complete</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Gamification strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10 rounded-2xl bg-white p-6 shadow-sm flex flex-wrap items-center justify-center gap-8"
          >
            <div className="flex items-center gap-2">
              <Zap size={18} style={{ color: colors.accent }} />
              <span className="text-sm font-bold" style={{ color: colors.primary }}>950 XP earned</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={18} style={{ color: '#f59e0b' }} />
              <span className="text-sm font-bold" style={{ color: colors.primary }}>7-day streak</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={18} style={{ color: colors.accent }} />
              <span className="text-sm font-bold" style={{ color: colors.primary }}>Operator Level 2</span>
            </div>
          </motion.div>

          <div className="text-center mt-10">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent }}
            >
              Start Learning <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── AGENT PROGRAMME ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Earn by Sharing nfstay
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              40% commission on every referral. No cap. No limits.
            </motion.p>
          </motion.div>

          {/* 3-step */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            {[
              { icon: Share2, title: 'Share Your Link', desc: 'Get a unique referral link from your dashboard.' },
              { icon: UserPlus, title: 'User Joins', desc: 'They sign up for any paid plan through your link.' },
              { icon: DollarSign, title: 'You Get Paid', desc: '40% commission deposited into your account.' },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="rounded-2xl p-8 text-center relative"
                style={{ background: colors.light }}
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ArrowRight size={20} style={{ color: '#d1d5db' }} />
                  </div>
                )}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${colors.accent}15` }}
                >
                  <s.icon size={24} style={{ color: colors.accent }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: colors.primary }}>{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Earnings calculator */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto rounded-2xl p-8 text-center"
            style={{ background: colors.light }}
          >
            <div className="text-sm text-gray-500 mb-3">Example: Refer 10 people on Lifetime ({'\u00a3'}997)</div>
            <div className="text-3xl font-extrabold mb-2" style={{ color: colors.primary }}>
              Total: {'\u00a3'}3,988
            </div>
            <div className="text-sm text-gray-500 mb-4">at 40% commission</div>
            <div
              className="inline-block text-base font-bold px-6 py-2.5 rounded-lg"
              style={{ background: `${colors.accent}15`, color: colors.accent }}
            >
              Per referral: {'\u00a3'}399 one-time
            </div>
          </motion.div>

          <div className="text-center mt-10">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: colors.accent }}
            >
              Become an Agent <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 md:py-28" style={{ background: colors.light }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em]" style={{ color: colors.primary }}>
              Choose Your Plan
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg max-w-xl mx-auto" style={{ color: '#6b7280' }}>
              Start free. Upgrade when you are ready to scale.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '\u00a30',
                period: 'forever',
                desc: 'Browse deals and preview the platform.',
                features: ['Browse deal listings', 'Limited academy access', 'Community access'],
                cta: 'Start Free',
                primary: false,
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '\u00a367',
                period: '/month',
                alt: 'or \u00a3397/year',
                desc: 'Full access to every tool and feature.',
                features: ['All deals + saved searches', 'Full CRM pipeline', 'Inbox messaging', 'Direct booking site', 'Full academy + XP', 'Agent programme'],
                cta: 'Start Pro',
                primary: true,
                highlighted: false,
              },
              {
                name: 'Lifetime',
                price: '\u00a3997',
                period: 'one-time',
                desc: 'Everything. Forever. No recurring fees.',
                features: ['Everything in Pro', 'Lifetime updates', 'Priority support', 'Early feature access', 'Founding member badge', 'Agent programme'],
                cta: 'Go Lifetime',
                primary: true,
                highlighted: true,
              },
            ].map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                className={`relative bg-white rounded-2xl p-8 shadow-md transition-all duration-200 hover:shadow-lg ${
                  plan.highlighted ? 'border-2' : 'border border-gray-100'
                }`}
                style={{ borderColor: plan.highlighted ? colors.accent : undefined }}
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full text-white"
                    style={{ background: colors.accent }}
                  >
                    Best Value
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1" style={{ color: colors.primary }}>{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                <div className="mb-1">
                  <span className="text-3xl font-extrabold" style={{ color: colors.primary }}>{plan.price}</span>
                  <span className="text-sm text-gray-400 ml-1">{plan.period}</span>
                </div>
                {plan.alt && <div className="text-xs text-gray-400 mb-4">{plan.alt}</div>}
                {!plan.alt && <div className="mb-4" />}
                <button
                  className={`w-full h-12 rounded-lg text-sm font-bold transition-all duration-200 ${
                    plan.primary ? 'text-white hover:opacity-90' : 'border-2 hover:bg-gray-50'
                  }`}
                  style={{
                    background: plan.primary ? colors.accent : 'transparent',
                    borderColor: plan.primary ? undefined : '#e5e7eb',
                    color: plan.primary ? colors.white : colors.primary,
                  }}
                >
                  {plan.cta}
                </button>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={16} className="shrink-0 mt-0.5" style={{ color: colors.accent }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature comparison */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-14 max-w-3xl mx-auto"
          >
            <div className="text-sm font-bold text-center mb-6" style={{ color: colors.primary }}>Feature Comparison</div>
            <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
              {[
                { feature: 'Deal Marketplace', free: 'Browse only', pro: 'Full access', lifetime: 'Full access' },
                { feature: 'CRM Pipeline', free: '--', pro: 'Unlimited', lifetime: 'Unlimited' },
                { feature: 'Inbox Messaging', free: '--', pro: 'Unlimited', lifetime: 'Unlimited' },
                { feature: 'Direct Booking Site', free: '--', pro: '1 site', lifetime: '1 site' },
                { feature: 'Academy', free: '3 lessons', pro: 'All 36', lifetime: 'All 36' },
                { feature: 'Agent Programme', free: '--', pro: '40% commission', lifetime: '40% commission' },
              ].map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-4 text-xs px-6 py-3 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}
                >
                  <div className="font-semibold" style={{ color: colors.primary }}>{row.feature}</div>
                  <div className="text-center text-gray-400">{row.free}</div>
                  <div className="text-center text-gray-600">{row.pro}</div>
                  <div className="text-center font-semibold" style={{ color: colors.accent }}>{row.lifetime}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-20 md:py-28" style={{ background: colors.primary }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em] text-white text-center mb-14"
          >
            Trusted by UK Operators
          </motion.h2>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: 'Found my first deal within a week. The CRM keeps me organised and I never miss a follow-up.',
                name: 'Tom H.',
                location: 'Manchester',
                detail: '2 properties',
              },
              {
                quote: 'The academy gave me confidence to pitch landlords. Went from zero to four properties in three months.',
                name: 'Sarah K.',
                location: 'Leeds',
                detail: '4 properties',
              },
              {
                quote: 'JV Partners let me invest in properties I couldn\'t afford alone. Getting passive income every month.',
                name: 'Priya M.',
                location: 'London',
                detail: 'Investor',
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className="rounded-2xl p-6"
                style={{ background: colors.darkest }}
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={colors.accent} stroke="none" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-white/80 mb-6">"{t.quote}"</p>
                <div>
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-xs text-white/50">{t.location} &middot; {t.detail}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-[36px] font-bold leading-[1.2] tracking-[-0.02em] text-center mb-14"
            style={{ color: colors.primary }}
          >
            Frequently Asked Questions
          </motion.h2>

          <div className="space-y-3">
            {[
              {
                q: 'What is rent-to-rent?',
                a: 'Rent-to-rent is a property strategy where you rent a property from a landlord on a long-term contract and then sub-let it on a short-term basis (e.g., Airbnb). The difference between what you pay the landlord and what guests pay you is your profit.',
              },
              {
                q: 'How are deals verified?',
                a: 'Every deal on nfstay goes through a compliance check including landlord consent verification, Airdna revenue estimates, local regulation review, and financial modelling. Only deals that meet our criteria are listed as "Live".',
              },
              {
                q: 'Do I need experience?',
                a: 'No. nfstay Academy takes you from complete beginner to confident operator. The 9 modules cover everything from property hunting to landlord pitching to guest management.',
              },
              {
                q: 'What\'s in the free plan?',
                a: 'The free plan lets you browse the deal marketplace, access 3 academy lessons, and join the community. Upgrade to Pro or Lifetime for full CRM, inbox, booking site, and academy access.',
              },
              {
                q: 'How do JV partnerships work?',
                a: 'JV Partners is our fractional property investment feature. You buy shares in a property from $1 each, earn monthly rental income proportional to your ownership, and vote on management decisions alongside other co-owners.',
              },
              {
                q: 'Can I build a booking site?',
                a: 'Yes. Pro and Lifetime members can launch a fully branded direct booking site at yourbrand.nfstay.app. You keep 100% of booking revenue with zero commission fees.',
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="rounded-2xl border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors duration-200 hover:bg-gray-50"
                >
                  <span className="text-sm font-bold pr-4" style={{ color: colors.primary }}>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 transition-transform duration-200"
                    style={{
                      color: '#9ca3af',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-gray-600">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: colors.darkest }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center bottom, ${colors.accent}12 0%, transparent 60%)`,
          }}
        />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-[44px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white"
            >
              Your first deal is waiting.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Join 200+ UK operators on nfstay.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10">
              <a
                href="#deals"
                className="inline-flex items-center justify-center h-14 px-12 rounded-lg text-base font-bold text-white transition-all duration-200 hover:opacity-90"
                style={{ background: colors.accent }}
              >
                Browse Live Deals
              </a>
              <div className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                or start with a free account
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-16" style={{ background: colors.darkest }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="text-xl font-extrabold text-white">nfstay</span>
              <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                The UK's rent-to-rent marketplace for operators and investors.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: ['Deals', 'CRM', 'Booking Site', 'Academy', 'JV Partners'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Press'],
              },
              {
                title: 'Legal',
                links: ['Terms', 'Privacy', 'Cookies', 'Licensing'],
              },
              {
                title: 'Support',
                links: ['Help Centre', 'Contact', 'Status', 'API Docs'],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {col.title}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm transition-colors duration-200 hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.55)' }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            &copy; 2025 nfstay. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
