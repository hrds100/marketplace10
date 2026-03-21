import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageSquare,
  Send,
  Pin,
  LayoutGrid,
  FileText,
  PieChart,
  Zap,
  GitMerge,
  Search,
  CheckCircle2,
  Handshake,
  Home,
  PenLine,
  Menu,
  X,
  MapPin,
  BedDouble,
  PoundSterling,
  BadgeCheck,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const threads = [
  { name: "NFsTay Support", pinned: true, preview: "Welcome to NFsTay! Here's how to...", time: "Pinned" },
  { name: "Chris Germano", detail: "Manchester · 5-bed house", preview: "Hi, I saw your listing and...", time: "20 Mar" },
  { name: "Sarah Patel", detail: "Leeds · 3-bed flat", preview: "Can we discuss the rent terms?", time: "19 Mar" },
  { name: "James O'Brien", detail: "Liverpool · 4-bed terrace", preview: "I'd be happy to arrange a viewing", time: "18 Mar" },
];

const flowSteps = [
  { icon: Search, label: "Discover deal", desc: "Find a property that fits your criteria" },
  { icon: Send, label: "Send inquiry", desc: "Message the landlord directly from the listing" },
  { icon: MessageSquare, label: "Discuss terms", desc: "Negotiate rent, contract length, and access" },
  { icon: Handshake, label: "Negotiate", desc: "Agree on final numbers with full context" },
  { icon: PenLine, label: "Sign contract", desc: "Close the deal and formalise the agreement" },
  { icon: Home, label: "Start hosting", desc: "List on Airbnb, Booking.com and go live" },
];

const features = [
  {
    icon: LayoutGrid,
    title: "Property Context in Every Thread",
    desc: "See the deal, numbers, and listing while you chat. No tab-switching, no lost context.",
  },
  {
    icon: PieChart,
    title: "Earnings Estimator",
    desc: "Nights booked, nightly rate, and estimated revenue right in the sidebar of every conversation.",
  },
  {
    icon: FileText,
    title: "Quick Templates",
    desc: "Pre-written messages for common scenarios: first contact, follow-up, negotiation.",
  },
  {
    icon: GitMerge,
    title: "CRM Integration",
    desc: "Every conversation maps to a deal stage in your pipeline. Nothing slips through.",
  },
];

export default function Variant07() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ─── STICKY NAV ─── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 lg:px-8">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-emerald-600">NFs</span>Tay
          </span>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-gray-900">Deals</a>
            <a href="#" className="hover:text-gray-900">Inbox</a>
            <a href="#" className="hover:text-gray-900">CRM</a>
            <a href="#" className="hover:text-gray-900">Pricing</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</button>
            <button className="text-sm font-medium bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
              Get Started
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 text-sm">
            <a href="#" className="py-2">Deals</a>
            <a href="#" className="py-2">Inbox</a>
            <a href="#" className="py-2">CRM</a>
            <a href="#" className="py-2">Pricing</a>
            <button className="mt-2 bg-emerald-600 text-white py-2 rounded-lg font-medium">Get Started</button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-16 pb-20 px-4 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl mx-auto text-center">
          <motion.h1 variants={fadeIn} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            Message landlords. Close deals.{" "}
            <span className="text-emerald-600">All in one inbox.</span>
          </motion.h1>
          <motion.p variants={fadeIn} className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            NFsTay's built-in messaging connects you directly to landlords and agents. See property details, estimated earnings, and close your deal without leaving the conversation.
          </motion.p>
          <motion.div variants={fadeIn} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2">
              Start Messaging <ArrowRight size={16} />
            </button>
            <button className="w-full sm:w-auto border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
              Browse Deals First
            </button>
          </motion.div>
        </motion.div>

        {/* ─── Mock Inbox ─── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-14 max-w-6xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
        >
          <div className="grid md:grid-cols-[240px_1fr_260px] min-h-[420px]">
            {/* Thread list */}
            <div className="border-r border-gray-100 bg-gray-50">
              <div className="p-3 border-b border-gray-100">
                <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-400 border border-gray-200">Search conversations...</div>
              </div>
              {threads.map((t, i) => (
                <div key={i} className={`px-3 py-3 border-b border-gray-100 cursor-pointer hover:bg-white transition ${i === 1 ? "bg-white" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      {t.pinned && <Pin size={12} className="text-emerald-500" />}
                      {t.name}
                    </span>
                    <span className="text-[11px] text-gray-400">{t.time}</span>
                  </div>
                  {t.detail && <p className="text-[11px] text-gray-400 mt-0.5">{t.detail}</p>}
                  <p className="text-xs text-gray-500 mt-1 truncate">{t.preview}</p>
                </div>
              ))}
            </div>

            {/* Chat area */}
            <div className="flex flex-col">
              {/* Property card */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <BedDouble size={20} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">5-bedroom, Serviced Accommodation, Manchester</p>
                  <p className="text-xs text-gray-400">m46fg · Chris Germano</p>
                </div>
              </div>
              {/* Messages */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 text-sm max-w-[80%]">
                    Hi, I saw your 5-bed in Manchester. Is it still available for a rent-to-rent agreement?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[80%]">
                    Yes, it is. The landlord is open to a 3-year contract. Would you like the full details?
                  </div>
                </div>
                {/* Earnings callout */}
                <div className="mx-auto max-w-sm bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Earnings Estimate</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">£1,010<span className="text-sm font-normal text-emerald-500">/mo</span></p>
                  <p className="text-xs text-gray-500 mt-1">You could earn £1,010 hosting this property on Airbnb</p>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 text-sm max-w-[80%]">
                    That looks great. Can we schedule a viewing this week?
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
                  Type a message...
                </div>
                <button className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition">
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Right panel — Inquiry details */}
            <div className="hidden md:block border-l border-gray-100 p-4 space-y-4 bg-gray-50">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inquiry Details</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Property</p>
                  <p className="font-medium">5-bed House, Manchester</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Location</p>
                  <p className="font-medium flex items-center gap-1"><MapPin size={12} /> M4 6FG</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Type</p>
                  <p className="font-medium">Serviced Accommodation</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Monthly Rent</p>
                  <p className="font-semibold text-emerald-600 flex items-center gap-1"><PoundSterling size={12} /> 1,000/mo</p>
                </div>
              </div>
              <button className="w-full text-sm font-medium border border-emerald-600 text-emerald-600 py-2 rounded-lg hover:bg-emerald-50 transition">
                View Listing
              </button>
              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Earnings Estimator</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Nights/mo</span><span className="font-medium">22</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Nightly rate</span><span className="font-medium">£92</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="font-semibold text-emerald-600">£2,024</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Profit</span><span className="font-bold text-emerald-700">£1,010</span></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── MESSAGING FEATURES ─── */}
      <section className="py-20 px-4 lg:px-8 bg-gray-50">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center">
            Not just messaging. <span className="text-emerald-600">A deal-closing machine.</span>
          </motion.h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeIn} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── CONVERSATION FLOW ─── */}
      <section className="py-20 px-4 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center">
            From first message to <span className="text-emerald-600">signed contract</span>
          </motion.h2>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {flowSteps.map((s, i) => (
              <motion.div key={i} variants={fadeIn} className="text-center">
                <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <s.icon size={20} className="text-emerald-600" />
                </div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                {i < flowSteps.length - 1 && (
                  <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2">
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── DEAL CONTEXT ─── */}
      <section className="py-20 px-4 lg:px-8 bg-gray-50">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center">
            See everything <span className="text-emerald-600">without switching tabs</span>
          </motion.h2>
          <motion.div variants={fadeIn} className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 min-h-[320px]">
              {/* Chat side */}
              <div className="p-5 border-r border-gray-100 space-y-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Conversation</p>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 text-sm max-w-[85%]">
                  What is the minimum contract length you would consider?
                </div>
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[85%]">
                    We need at least 2 years, but 3 years preferred for this property.
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 text-sm max-w-[85%]">
                  That works for us. Can you confirm the monthly rent is £1,000?
                </div>
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[85%]">
                    Confirmed. £1,000/mo with a 2-month deposit. Ready to sign when you are.
                  </div>
                </div>
              </div>
              {/* Property details side */}
              <div className="p-5 space-y-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Property Details</p>
                <div className="w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                  Property Image Placeholder
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Rent</p>
                    <p className="font-semibold">£1,000/mo</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Est. Profit</p>
                    <p className="font-semibold text-emerald-600">£1,010/mo</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Type</p>
                    <p className="font-semibold">SA · 5-bed</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="font-semibold">Manchester</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <BadgeCheck size={14} /> Airdna Verified Earnings
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── METRICS ─── */}
      <section className="py-20 px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-5xl md:text-6xl font-extrabold text-emerald-600">3x</p>
          <p className="mt-3 text-xl md:text-2xl font-bold text-gray-900">
            Operators who use NFsTay inbox close 3x faster than email
          </p>
          <p className="mt-3 text-gray-500 text-sm max-w-lg mx-auto">
            Built-in property context, earnings data, and CRM integration mean fewer messages, faster decisions, and more signed contracts.
          </p>
        </motion.div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 px-4 lg:px-8 bg-emerald-600">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-2xl mx-auto text-center text-white"
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold">
            Your next deal is one message away
          </motion.h2>
          <motion.p variants={fadeIn} className="mt-4 text-emerald-100 leading-relaxed">
            Join operators across the UK who are closing rent-to-rent deals faster with NFsTay's messaging-first platform.
          </motion.p>
          <motion.div variants={fadeIn} className="mt-8">
            <button className="bg-white text-emerald-700 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition inline-flex items-center gap-2">
              Start Messaging <ArrowRight size={16} />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <span className="text-white font-bold text-lg">NFsTay</span>
            <p className="mt-3 leading-relaxed">The UK's rent-to-rent marketplace. Find deals, message landlords, close contracts.</p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Product</p>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Deals</a></li>
              <li><a href="#" className="hover:text-white transition">Inbox</a></li>
              <li><a href="#" className="hover:text-white transition">CRM</a></li>
              <li><a href="#" className="hover:text-white transition">Pricing</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Company</p>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">About</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
              <li><a href="#" className="hover:text-white transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Legal</p>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition">Terms</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-gray-800 text-xs text-center">
          NFsTay Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
