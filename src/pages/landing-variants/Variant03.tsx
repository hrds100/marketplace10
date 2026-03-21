import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Menu,
  X,
  ArrowRight,
  Play,
  GripVertical,
  MessageSquare,
  LayoutDashboard,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  PoundSterling,
  Check,
} from 'lucide-react';

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Mock Components ─── */

function KanbanBoard() {
  const columns = [
    { title: 'New Lead', count: 2, color: 'bg-blue-100 border-blue-300', cards: ['3-bed flat, Clapham', '2-bed house, Leeds'] },
    { title: 'Under Negotiation', count: 1, color: 'bg-amber-100 border-amber-300', cards: ['4-bed HMO, Manchester'] },
    { title: 'Contract Sent', count: 1, color: 'bg-emerald-100 border-emerald-300', cards: ['Studio, Bristol'] },
    { title: 'Follow Up', count: 0, color: 'bg-gray-100 border-gray-300', cards: [] },
  ];
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {columns.map((col) => (
        <div key={col.title} className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>{col.title}</span>
            <span className="bg-gray-200 text-gray-600 rounded-full px-1.5 text-[10px]">{col.count}</span>
          </div>
          {col.cards.map((card) => (
            <div key={card} className={`rounded-lg border p-2.5 text-xs ${col.color}`}>
              <div className="flex items-center gap-1 mb-1 text-gray-400">
                <GripVertical className="w-3 h-3" />
              </div>
              <p className="font-medium text-gray-700 text-[11px] leading-tight">{card}</p>
            </div>
          ))}
          {col.cards.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-3 text-[10px] text-gray-400 text-center">
              No deals
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MockInbox() {
  const threads = [
    { name: 'Sarah M.', preview: 'Hi, is the Clapham flat still available?', time: '2m', unread: true },
    { name: 'James P.', preview: 'I can do 3 years at that rate.', time: '14m', unread: false },
    { name: 'Letting Co.', preview: 'Documents attached.', time: '1h', unread: false },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="grid grid-cols-12 divide-x divide-gray-200 min-h-[260px]">
        {/* Thread list */}
        <div className="col-span-4 bg-gray-50">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-400">
              <Search className="w-3 h-3" /> Search threads
            </div>
          </div>
          {threads.map((t) => (
            <div key={t.name} className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer ${t.unread ? 'bg-emerald-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-800">{t.name}</span>
                <span className="text-[10px] text-gray-400">{t.time}</span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{t.preview}</p>
            </div>
          ))}
        </div>
        {/* Conversation */}
        <div className="col-span-5 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 text-xs font-medium text-gray-700">Sarah M.</div>
          <div className="flex-1 p-3 space-y-2">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-[11px] text-gray-700 max-w-[80%]">
              Hi, is the Clapham flat still available?
            </div>
            <div className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-[11px] max-w-[80%] ml-auto">
              Yes it is. Want to arrange a viewing?
            </div>
          </div>
          <div className="px-3 py-2 border-t border-gray-200 flex items-center gap-2">
            <div className="flex-1 bg-gray-50 rounded-md px-2 py-1 text-[11px] text-gray-400">Type a message...</div>
            <Send className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
        {/* Property sidebar */}
        <div className="col-span-3 p-3 bg-gray-50">
          <div className="w-full h-16 bg-gray-200 rounded-md mb-2" />
          <p className="text-[11px] font-medium text-gray-700">3-bed flat, Clapham</p>
          <p className="text-[10px] text-gray-500 mt-0.5">SW4, London</p>
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-md p-2">
            <p className="text-[10px] font-medium text-emerald-700">Est. Airbnb earnings</p>
            <p className="text-sm font-semibold text-emerald-800 mt-0.5">£1,010 /month</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function Variant03() {
  const [mobileNav, setMobileNav] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: 'Can I import my existing deals?', a: 'Yes. Upload a CSV or add deals manually. Your pipeline is ready in minutes, with all deal stages preserved.' },
    { q: 'Is the inbox connected to WhatsApp?', a: 'The inbox consolidates messages from the NFsTay platform. WhatsApp integration is on the roadmap for Q3.' },
    { q: 'How many deals can I track?', a: 'Free accounts can browse deals. Pro accounts get unlimited CRM pipeline slots, messaging threads, and deal tracking.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">NFsTay</span>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#deals" className="hover:text-gray-900 transition">Deals</a>
            <a href="#crm" className="hover:text-gray-900 transition">CRM</a>
            <a href="#inbox" className="hover:text-gray-900 transition">Inbox</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-gray-600 hover:text-gray-900 transition">Sign In</button>
            <button className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md transition font-medium">
              Start Free
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            {['Deals', 'CRM', 'Inbox', 'Pricing'].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="block text-sm text-gray-600" onClick={() => setMobileNav(false)}>{l}</a>
            ))}
            <button className="w-full text-sm bg-emerald-600 text-white py-2 rounded-md font-medium mt-2">Start Free</button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <Section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={fade}>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              Your rent-to-rent pipeline, organised
            </h1>
            <p className="mt-5 text-gray-600 text-base md:text-lg leading-relaxed max-w-lg">
              Track every deal from first contact to signed contract. NFsTay gives operators a purpose-built CRM, messaging inbox, and deal flow — no spreadsheets required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-md text-sm font-medium transition flex items-center gap-2">
                Start Your Pipeline <ArrowRight className="w-4 h-4" />
              </button>
              <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-2.5 rounded-md text-sm font-medium transition flex items-center gap-2">
                <Play className="w-4 h-4" /> Watch Demo
              </button>
            </div>
          </motion.div>
          <motion.div variants={fade} className="bg-gray-50 rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              <LayoutDashboard className="w-3.5 h-3.5" /> Pipeline Overview
            </div>
            <KanbanBoard />
          </motion.div>
        </div>
      </Section>

      {/* ─── PIPELINE FEATURES ─── */}
      <div id="crm" className="bg-gray-50 border-y border-gray-200">
        <Section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <motion.div variants={fade} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Built for rent-to-rent operators</h2>
            <p className="mt-3 text-gray-500 max-w-md mx-auto">
              Every feature designed around how UK operators actually source and close deals.
            </p>
          </motion.div>

          {/* Feature 1 — CRM Pipeline */}
          <motion.div variants={fade} className="grid md:grid-cols-2 gap-10 items-center mb-16">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-3">
                <LayoutDashboard className="w-4 h-4" /> CRM Pipeline
              </div>
              <h3 className="text-xl md:text-2xl font-semibold">Drag deals through stages</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">
                See your monthly pipeline at a glance. Move deals between stages, set follow-up reminders, and never lose track of where a negotiation stands.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-2">
                {['New Lead', 'Negotiation', 'Signed'].map((stage, i) => (
                  <div key={stage} className="space-y-2">
                    <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{stage}</div>
                    {Array.from({ length: 2 - i }).map((_, j) => (
                      <div key={j} className="h-12 rounded-md bg-gray-100 border border-gray-200" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Feature 2 — Inbox */}
          <motion.div variants={fade} className="grid md:grid-cols-2 gap-10 items-center mb-16">
            <div className="order-2 md:order-1 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="space-y-2">
                {['Sarah M. — Is the flat available?', 'James P. — I can do 3 years', 'Letting Co. — Documents attached'].map((t) => (
                  <div key={t} className="flex items-center gap-3 px-3 py-2 rounded-md bg-gray-50 border border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
                    <span className="text-xs text-gray-600 truncate">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-3">
                <MessageSquare className="w-4 h-4" /> Inbox Messaging
              </div>
              <h3 className="text-xl md:text-2xl font-semibold">Message landlords and agents directly</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">
                See property details, earnings estimates, and quick-reply templates in every thread. Keep every conversation next to the deal it belongs to.
              </p>
            </div>
          </motion.div>

          {/* Feature 3 — Deal Listings */}
          <motion.div variants={fade} className="grid md:grid-cols-2 gap-10 items-center" id="deals">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-3">
                <Search className="w-4 h-4" /> Deal Listings
              </div>
              <h3 className="text-xl md:text-2xl font-semibold">Browse landlord-approved deals</h3>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Verified financials on every listing. Add any deal to your CRM with one click and start working it through your pipeline immediately.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="space-y-3">
                {[
                  { addr: '3-bed flat, Clapham', rent: '£1,400', est: '£2,410' },
                  { addr: '4-bed HMO, Manchester', rent: '£950', est: '£2,180' },
                ].map((deal) => (
                  <div key={deal.addr} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{deal.addr}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Rent: {deal.rent}/mo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-700">{deal.est}</p>
                      <p className="text-[10px] text-gray-400">Est. revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </Section>
      </div>

      {/* ─── INBOX DEEP DIVE ─── */}
      <Section className="max-w-6xl mx-auto px-4 py-16 md:py-24" id="inbox">
        <motion.div variants={fade} className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Every conversation in one place</h2>
          <p className="mt-3 text-gray-500 max-w-lg mx-auto">
            Property details, earnings estimates, and messaging — all in a single view so you can respond faster and close sooner.
          </p>
        </motion.div>
        <motion.div variants={fade} className="hidden md:block">
          <MockInbox />
        </motion.div>
        {/* Mobile simplified inbox */}
        <motion.div variants={fade} className="md:hidden space-y-3">
          <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
            <p className="text-xs font-medium text-gray-700 mb-2">Sarah M.</p>
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-700 mb-2">Is the Clapham flat still available?</div>
            <div className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-xs ml-auto max-w-[80%]">Yes it is. Want to arrange a viewing?</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-medium text-emerald-700">You could earn</p>
            <p className="text-lg font-bold text-emerald-800">£1,010 /month</p>
            <p className="text-[11px] text-emerald-600 mt-1">hosting this property on Airbnb</p>
          </div>
        </motion.div>
        {/* Earnings estimator */}
        <motion.div variants={fade} className="mt-10 max-w-md mx-auto bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Earnings Estimator</h4>
          <div className="space-y-3">
            {[
              { label: 'Nights booked / month', value: '20' },
              { label: 'Nightly rate', value: '£163' },
              { label: 'Est. revenue', value: '£3,260', highlight: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className={`text-sm font-semibold ${row.highlight ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ─── METRICS ROW ─── */}
      <div className="bg-gray-50 border-y border-gray-200">
        <Section className="max-w-6xl mx-auto px-4 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: '0 to pipeline in 5 minutes' },
              { icon: Search, label: '120+ deals to track' },
              { icon: MessageSquare, label: 'Direct landlord messaging' },
              { icon: LayoutDashboard, label: 'No spreadsheets ever' },
            ].map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fade}
                className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm"
              >
                <Icon className="w-5 h-5 text-emerald-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">{label}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ─── PRICING ─── */}
      <Section className="max-w-6xl mx-auto px-4 py-16 md:py-24" id="pricing">
        <motion.div variants={fade} className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-gray-500">Start free. Upgrade when your pipeline grows.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <motion.div variants={fade} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Free</h3>
            <p className="text-3xl font-bold mt-2">£0</p>
            <p className="text-xs text-gray-500 mt-1">No card required</p>
            <ul className="mt-6 space-y-2.5">
              {['Browse deals', 'View listings', 'Basic deal details'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button className="mt-6 w-full border border-gray-300 hover:border-gray-400 text-gray-700 py-2 rounded-md text-sm font-medium transition">
              Get Started
            </button>
          </motion.div>
          {/* Pro */}
          <motion.div variants={fade} className="rounded-xl border-2 border-emerald-600 bg-white p-6 shadow-sm relative">
            <div className="absolute -top-3 left-5 bg-emerald-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Most popular
            </div>
            <h3 className="text-lg font-semibold">Pro</h3>
            <p className="text-3xl font-bold mt-2">£67<span className="text-base font-normal text-gray-500">/mo</span></p>
            <p className="text-xs text-gray-500 mt-1">or £397/year or £997 lifetime</p>
            <ul className="mt-6 space-y-2.5">
              {['Full CRM pipeline', 'Inbox messaging', 'Booking site builder', 'Operator university', 'Priority support'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-medium transition">
              Start Your Pipeline
            </button>
          </motion.div>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <div className="bg-gray-50 border-y border-gray-200">
        <Section className="max-w-2xl mx-auto px-4 py-16">
          <motion.div variants={fade} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Questions</h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fade} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-gray-800">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ─── CTA BAND ─── */}
      <Section className="bg-emerald-600">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <motion.h2 variants={fade} className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Stop losing deals to spreadsheets
          </motion.h2>
          <motion.p variants={fade} className="mt-3 text-emerald-100 max-w-md mx-auto">
            Your pipeline is waiting. Set it up in under five minutes and start closing.
          </motion.p>
          <motion.div variants={fade} className="mt-8">
            <button className="bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-3 rounded-md text-sm font-semibold transition inline-flex items-center gap-2">
              Start Your Pipeline <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-lg font-bold tracking-tight">NFsTay</span>
            <p className="text-xs text-gray-500 mt-1">The operator platform for rent-to-rent.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-700 transition">Terms</a>
            <a href="#" className="hover:text-gray-700 transition">Privacy</a>
            <a href="#" className="hover:text-gray-700 transition">Support</a>
            <span>© {new Date().getFullYear()} NFsTay Ltd</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
