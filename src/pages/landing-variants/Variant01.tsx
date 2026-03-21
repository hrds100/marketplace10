import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  BarChart3,
  MessageSquare,
  Globe,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Home,
  Menu,
  X,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const stats = [
  { value: "120+", label: "Deals Listed" },
  { value: "\u00a3680", label: "Avg Monthly Profit" },
  { value: "15", label: "UK Cities" },
  { value: "4.8/5", label: "Operator Rating" },
];

const steps = [
  {
    num: 1,
    title: "Browse Verified Deals",
    desc: "Every property is landlord-approved and compliance-checked before listing.",
  },
  {
    num: 2,
    title: "Analyse the Numbers",
    desc: "See monthly rent, estimated profit, occupancy data, and Airdna verification.",
  },
  {
    num: 3,
    title: "Secure Your Deal",
    desc: "Message the landlord, negotiate terms, and close directly through NFsTay.",
  },
];

const deals = [
  {
    location: "Manchester",
    postcode: "M15 4UH",
    rent: 1000,
    profit: 500,
    type: "2-bed apartment",
    color: "bg-emerald-100",
  },
  {
    location: "Birmingham",
    postcode: "B5 7RN",
    rent: 850,
    profit: 420,
    type: "1-bed studio",
    color: "bg-sky-100",
  },
  {
    location: "Liverpool",
    postcode: "L1 4DS",
    rent: 1200,
    profit: 680,
    type: "3-bed house",
    color: "bg-amber-100",
  },
];

const features = [
  {
    icon: Search,
    title: "Deal Marketplace",
    desc: "Browse landlord-approved rent-to-rent and serviced accommodation deals across the UK.",
  },
  {
    icon: BarChart3,
    title: "CRM Pipeline",
    desc: "Track every deal from enquiry to signed contract with a visual pipeline built for operators.",
  },
  {
    icon: MessageSquare,
    title: "Inbox Messaging",
    desc: "Communicate with landlords and agents directly inside NFsTay. No more lost emails.",
  },
  {
    icon: Globe,
    title: "Booking Site Builder",
    desc: "Launch a direct-booking website for your properties in minutes, not weeks.",
  },
  {
    icon: GraduationCap,
    title: "NFsTay University",
    desc: "Step-by-step courses on sourcing, compliance, furnishing, and scaling your SA business.",
  },
  {
    icon: Users,
    title: "Agent Programme",
    desc: "Source deals for other operators and earn referral fees through the NFsTay agent network.",
  },
];

const testimonials = [
  {
    quote:
      "I found my first rent-to-rent deal within two weeks of signing up. The verification gives me confidence that the landlord is genuinely on board.",
    name: "James Thornton",
    role: "SA Operator",
    location: "Manchester",
  },
  {
    quote:
      "The CRM alone saves me hours every week. Having everything in one place -- deals, messages, pipeline -- means I actually stay organised.",
    name: "Priya Kaur",
    role: "Portfolio Operator",
    location: "Birmingham",
  },
  {
    quote:
      "NFsTay University taught me more in a month than six months of YouTube. The deal marketplace then let me put it into practice straight away.",
    name: "Daniel Hughes",
    role: "New Operator",
    location: "Leeds",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "\u00a30",
    period: "/month",
    desc: "Browse deals and explore the marketplace",
    features: ["Browse all live deals", "View full listing details", "Basic search and filters", "NFsTay University preview"],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro Monthly",
    price: "\u00a367",
    period: "/month",
    desc: "Full access for active operators",
    features: [
      "Everything in Free",
      "CRM deal pipeline",
      "Inbox messaging",
      "Booking site builder",
      "Full University access",
      "Priority support",
    ],
    cta: "Start Pro",
    highlighted: false,
  },
  {
    name: "Lifetime",
    price: "\u00a3997",
    period: " one-time",
    desc: "Everything, forever. No recurring fees.",
    features: [
      "Everything in Pro",
      "Lifetime platform access",
      "All future features included",
      "Agent programme access",
      "Founding member badge",
      "1-to-1 onboarding call",
    ],
    cta: "Go Lifetime",
    highlighted: true,
  },
];

const faqs = [
  {
    q: "What is a rent-to-rent deal?",
    a: "Rent-to-rent is a strategy where you lease a property from a landlord at a fixed monthly rent, then sublease it as a serviced accommodation or short-term rental on platforms like Airbnb and Booking.com. The difference between what you pay the landlord and what guests pay you is your profit.",
  },
  {
    q: "How does NFsTay verify deals?",
    a: "Every listing goes through a multi-step verification process. We confirm landlord consent, check the property's compliance status (including planning, insurance, and licensing), and review the financial projections against market data from Airdna and comparable listings.",
  },
  {
    q: "Do I need experience?",
    a: "No. NFsTay is designed for both new and experienced operators. If you are just starting out, NFsTay University walks you through every step from sourcing your first deal to managing live guests. The marketplace also shows verified deals so you can learn by analysing real opportunities.",
  },
  {
    q: "What's included in the free plan?",
    a: "The free plan lets you browse every live deal on the marketplace, view full listing details including financials, and access the introductory modules of NFsTay University. You can upgrade to Pro when you are ready to use the CRM, messaging, and booking site tools.",
  },
];

const navLinks = ["Deals", "JV Partners", "University", "Agents"];

export default function Variant01() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="text-xl font-bold tracking-tight">
            NFs<span className="text-green-500">Tay</span>
          </span>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link} href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Sign In
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              Get Started
            </a>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileNav && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-3">
            {navLinks.map((link) => (
              <a key={link} href="#" className="block text-sm text-gray-600 py-1">
                {link}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <a href="#" className="text-sm text-gray-600">
                Sign In
              </a>
              <a href="#" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white">
                Get Started
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── HERO ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div variants={fadeIn} className="space-y-6">
              <span className="inline-block rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-sm font-medium text-green-700">
                4 landlord-approved properties live now
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Explore landlord-approved Airbnb deals across the UK
              </h1>

              <p className="text-lg text-gray-500 max-w-lg leading-relaxed">
                NFsTay connects short-term rental operators with verified rent-to-rent opportunities. Browse deals,
                analyse returns, and start hosting — all in one platform.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                >
                  Browse Live Deals <ArrowRight size={16} />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  See How It Works
                </a>
              </div>

              <p className="text-xs text-gray-400">Free to browse. No credit card required.</p>
            </motion.div>

            <motion.div variants={fadeIn}>
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-10 flex items-center justify-center min-h-[340px]">
                <span className="text-sm text-gray-400 font-medium">Deal cards preview</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── STATS BAR ── */}
        <section className="bg-gray-50 border-y border-gray-100">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={fadeIn}>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        >
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold text-center mb-16">
            How it works
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <motion.div key={step.num} variants={fadeIn} className="text-center space-y-4">
                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white font-bold text-lg">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── DEAL CARDS ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="bg-gray-50 border-y border-gray-100 py-24"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold text-center mb-14">
              Latest Deals on NFsTay
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-6">
              {deals.map((deal) => (
                <motion.div
                  key={deal.postcode}
                  variants={fadeIn}
                  className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className={`${deal.color} h-44 flex items-center justify-center`}>
                    <span className="text-sm text-gray-400 font-medium">Property photo</span>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin size={14} />
                      {deal.location} &middot; {deal.postcode}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Home size={14} />
                      {deal.type}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-xs text-gray-400">Monthly rent</p>
                        <p className="text-base font-semibold">&pound;{deal.rent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Est. monthly profit</p>
                        <p className="text-base font-semibold text-green-600">&pound;{deal.profit.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <a
                        href="#"
                        className="flex-1 text-center rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                      >
                        Visit Listing
                      </a>
                      <a
                        href="#"
                        className="flex-1 text-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Inquire Now
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── FEATURES ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        >
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Everything you need to build your portfolio
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-500 text-center mb-14 max-w-lg mx-auto">
            From sourcing your first deal to managing a portfolio of short-term rentals, NFsTay has you covered.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeIn}
                className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600">
                  <f.icon size={20} />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── TESTIMONIALS ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="bg-gray-50 border-y border-gray-100 py-24"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold text-center mb-14">
              Trusted by operators across the UK
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <motion.blockquote
                  key={t.name}
                  variants={fadeIn}
                  className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4"
                >
                  <div className="flex gap-0.5 text-green-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">"{t.quote}"</p>
                  <footer className="pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {t.role} &middot; {t.location}
                    </p>
                  </footer>
                </motion.blockquote>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── PRICING ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        >
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Simple, transparent pricing
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-500 text-center mb-14 max-w-md mx-auto">
            Start free, upgrade when you are ready. No hidden fees.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {pricingTiers.map((tier) => (
              <motion.div
                key={tier.name}
                variants={fadeIn}
                className={`rounded-2xl border p-6 space-y-5 ${
                  tier.highlighted
                    ? "border-green-500 bg-green-50 shadow-md ring-2 ring-green-500/20"
                    : "border-gray-200 bg-white shadow-sm"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                    {tier.highlighted && (
                      <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-medium text-white">
                        Best Value
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{tier.desc}</p>
                </div>

                <div>
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-gray-400">{tier.period}</span>
                </div>

                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-0.5 text-green-500 font-bold">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`block text-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tier.cta}
                </a>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="bg-gray-50 border-y border-gray-100 py-24"
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold text-center mb-14">
              Frequently asked questions
            </motion.h2>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={fadeIn} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {faq.q}
                    {openFaq === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── FINAL CTA ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="bg-gray-900 text-white py-24"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to find your first deal?</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Join hundreds of UK operators already using NFsTay to source, manage, and scale their rental portfolios.
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-8 py-3 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              Browse Live Deals <ArrowRight size={16} />
            </a>
          </div>
        </motion.section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold tracking-tight">
            NFs<span className="text-green-500">Tay</span>
          </span>
          <p className="text-xs text-gray-400">&copy; 2025 NFsTay. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
