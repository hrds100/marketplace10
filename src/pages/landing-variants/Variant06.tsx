import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Link2,
  Users,
  PoundSterling,
  ChevronDown,
  ChevronUp,
  Trophy,
  Repeat,
  Gem,
  ShieldCheck,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const steps = [
  { num: "1", label: "Share your link" },
  { num: "2", label: "User joins" },
  { num: "3", label: "You get paid" },
];

const howItWorks = [
  {
    step: "01",
    title: "Sign up and get your unique link",
    desc: "Takes 30 seconds. No approval needed. You get a personal referral link the moment you register.",
  },
  {
    step: "02",
    title: "Share with your network",
    desc: "Social media, WhatsApp groups, property forums, YouTube. Anywhere your audience already spends time.",
  },
  {
    step: "03",
    title: "Earn on every conversion",
    desc: "40% on subscriptions, 10% on JV investments. Commissions are tracked automatically and paid monthly.",
  },
];

const benefits = [
  {
    icon: Repeat,
    title: "Recurring Income",
    desc: "Earn every month your referrals stay subscribed. One share, ongoing reward.",
  },
  {
    icon: Gem,
    title: "High Ticket",
    desc: "Up to \u00a3399 per lifetime referral. Premium payouts for a premium product.",
  },
  {
    icon: ShieldCheck,
    title: "Real Product",
    desc: "nfstay is a live platform with paying customers and active deal flow across the UK.",
  },
  {
    icon: TrendingUp,
    title: "No Ceiling",
    desc: "No cap on earnings or referrals. Scale as far as your network reaches.",
  },
];

const faqs = [
  {
    q: "How do I track my referrals?",
    a: "Your agent dashboard shows every click, sign-up, and conversion in real time. You always know exactly where you stand.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are calculated at month-end and paid within the first 10 business days of the following month via bank transfer.",
  },
  {
    q: "Can I be an agent and an operator?",
    a: "Yes. Many nfstay agents also use the platform for their own rent-to-rent deals. The two roles are completely independent.",
  },
];

const plans = [
  { label: "Monthly (\u00a367)", price: 67, result: "\u00a3268/month recurring", period: "month" },
  { label: "Yearly (\u00a3397)", price: 397, result: "\u00a31,588 per year", period: "year" },
  { label: "Lifetime (\u00a3997)", price: 997, result: "\u00a33,988 one-time", period: "one-time" },
];

export default function Variant06() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [calcTab, setCalcTab] = useState<"sub" | "jv">("sub");

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── STICKY NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="text-xl font-bold tracking-tight">
            NFs<span className="text-emerald-600">Tay</span>
          </span>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how" className="hover:text-gray-900 transition">How It Works</a>
            <a href="#earnings" className="hover:text-gray-900 transition">Earnings</a>
            <a href="#" className="hover:text-gray-900 transition">Sign In</a>
            <a
              href="#cta"
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              Become an Agent
            </a>
          </div>

          <button
            className="md:hidden p-2 text-gray-700"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
            <a href="#how" className="py-2" onClick={() => setMobileOpen(false)}>How It Works</a>
            <a href="#earnings" className="py-2" onClick={() => setMobileOpen(false)}>Earnings</a>
            <a href="#" className="py-2">Sign In</a>
            <a href="#cta" className="bg-emerald-600 text-white text-center py-2.5 rounded-lg" onClick={() => setMobileOpen(false)}>
              Become an Agent
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="py-20 md:py-28 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h1 variants={fadeIn} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            Earn by sharing <span className="text-emerald-600">nfstay</span>
          </motion.h1>

          <motion.p variants={fadeIn} className="mt-5 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Become an nfstay agent. Share your referral link. Earn up to 40% recurring commission
            on every subscription — and 10% on JV deals.
          </motion.p>

          <motion.div variants={fadeIn} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#cta"
              className="w-full sm:w-auto bg-emerald-600 text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              Become an Agent <ArrowRight size={18} />
            </a>
            <a
              href="#earnings"
              className="w-full sm:w-auto border-2 border-gray-300 text-gray-700 font-semibold px-8 py-3.5 rounded-lg hover:border-emerald-600 hover:text-emerald-700 transition text-center"
            >
              See Earnings
            </a>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-14 flex items-center justify-center gap-3 md:gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-3 md:gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {s.num}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight size={16} className="text-gray-400 shrink-0" />
                )}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── EARNINGS CALCULATOR ── */}
      <section id="earnings" className="py-20 bg-gray-50 px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center">
            Earnings Calculator
          </motion.h2>

          {/* Tabs */}
          <motion.div variants={fadeIn} className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setCalcTab("sub")}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                calcTab === "sub" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              Subscriptions (40%)
            </button>
            <button
              onClick={() => setCalcTab("jv")}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                calcTab === "jv" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              JV Deals (10%)
            </button>
          </motion.div>

          {calcTab === "sub" ? (
            <motion.div variants={fadeIn} className="mt-10">
              {/* Slider placeholder */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                <p className="text-sm text-gray-500 font-medium mb-3">Referrals</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
                    <div className="absolute left-0 top-0 h-2 w-1/3 bg-emerald-500 rounded-full" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/3 -translate-x-1/2 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow" />
                  </div>
                  <span className="text-lg font-bold text-emerald-700">10 referrals</span>
                </div>
              </div>

              <p className="text-center text-gray-600 mb-6">
                If you refer <span className="font-bold text-gray-900">10 people</span> on...
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div key={p.label} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <p className="text-sm font-medium text-gray-500">{p.label}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      10 x {"\u00a3"}{p.price} x 40%
                    </p>
                    <p className="mt-3 text-2xl md:text-3xl font-extrabold text-emerald-600">
                      {p.result}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <p className="text-sm text-emerald-700 font-medium">Per Referral Highlight</p>
                <p className="mt-1 text-3xl font-extrabold text-emerald-700">{"\u00a3"}399 one-time</p>
                <p className="text-sm text-emerald-600">for each lifetime referral</p>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={fadeIn} className="mt-10 bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-600 mb-4">
                Earn <span className="font-bold text-emerald-700">10% commission</span> on every JV
                investment that comes through your link.
              </p>
              <p className="text-sm text-gray-500">
                JV deal sizes vary. On a {"\u00a3"}50,000 investment, you earn {"\u00a3"}5,000.
                No cap on deal size or number of deals.
              </p>
              <p className="mt-6 text-4xl font-extrabold text-emerald-600">{"\u00a3"}5,000+</p>
              <p className="text-sm text-gray-500 mt-1">per qualified JV referral</p>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center">
            How It Works
          </motion.h2>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <motion.div key={item.step} variants={fadeIn} className="text-center md:text-left">
                <span className="inline-block text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-4">
                  Step {item.step}
                </span>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── WHY AGENTS LOVE IT ── */}
      <section className="py-20 bg-gray-50 px-4">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Agents Love It
          </motion.h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={fadeIn}
                className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4"
              >
                <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <b.icon size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{b.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── LEADERBOARD TEASER ── */}
      <section className="py-20 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Leaderboard</span>
          </motion.div>

          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold">
            Top Agents This Month
          </motion.h2>

          <motion.div variants={fadeIn} className="mt-10 bg-gray-50 border border-gray-200 rounded-xl p-10">
            <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700">Be the first on the leaderboard</p>
            <p className="text-sm text-gray-500 mt-2">
              Early agents get the most visibility. Sign up now and claim your spot.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-gray-50 px-4">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-center mb-10">
            Questions
          </motion.h2>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <motion.div key={i} variants={fadeIn} className="bg-white rounded-xl border border-gray-200">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm"
                >
                  {f.q}
                  {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{f.a}</div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA BAND ── */}
      <section id="cta" className="py-16 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold">Start earning today</h2>
          <p className="mt-3 text-emerald-100 text-lg">No upfront cost. No approval process. Just results.</p>
          <a
            href="#"
            className="mt-8 inline-flex items-center gap-2 bg-white text-emerald-700 font-semibold px-8 py-3.5 rounded-lg hover:bg-emerald-50 transition"
          >
            Become an Agent <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span className="font-bold text-gray-900">
            NFs<span className="text-emerald-600">Tay</span>
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-900 transition">Terms</a>
            <a href="#" className="hover:text-gray-900 transition">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition">Contact</a>
          </div>
          <p>{"\u00a9"} 2026 nfstay Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
