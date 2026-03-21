import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Coins,
  BarChart3,
  Vote,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const NAV_LINKS = ["Marketplace", "Portfolio", "Proposals", "Payouts"];

const STATS = [
  { label: "Current APR", value: "13.3%", icon: TrendingUp },
  { label: "Active Partners", value: "10", icon: Users },
  { label: "Total Earned", value: "\u00a31.53", icon: Coins },
];

const MILESTONES = [
  "Noobie",
  "Deal Rookie",
  "Cashflow Builder",
  "Portfolio Boss",
  "Empire Builder",
  "Property Titan",
];

const STEPS = [
  {
    icon: Building2,
    title: "Choose a Property",
    desc: "Browse verified UK Airbnbs with projected returns and full financials.",
  },
  {
    icon: Coins,
    title: "Buy Shares",
    desc: "Invest from $1 per share via card or crypto. No minimum lock-in.",
  },
  {
    icon: BarChart3,
    title: "Earn Income",
    desc: "Receive monthly payouts proportional to your shares in each property.",
  },
  {
    icon: Vote,
    title: "Vote on Decisions",
    desc: "Governance proposals let partners shape the property\u2019s future together.",
  },
];

const PAYOUTS = [
  {
    date: "20 Mar 2026",
    property: "Pembroke Place",
    amount: "$0.56",
    method: "USDC",
    status: "Paid",
  },
  {
    date: "18 Mar 2026",
    property: "Pembroke Place",
    amount: "$0.42",
    method: "USDC",
    status: "Paid",
  },
  {
    date: "15 Mar 2026",
    property: "Pembroke Place",
    amount: "$0.55",
    method: "USDC",
    status: "Paid",
  },
];

/* ------------------------------------------------------------------ */

export default function Variant02() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">
      {/* ===================== STICKY NAV ===================== */}
      <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 lg:px-8">
          <span className="text-xl font-bold tracking-tight text-white">
            NFs<span className="text-emerald-400">Tay</span>
          </span>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="hover:text-white transition">
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-slate-300 hover:text-white transition">
              Sign In
            </button>
            <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition">
              Start Investing
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-slate-300"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 pb-4 space-y-3 text-sm">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="block text-slate-300 py-1">
                {l}
              </a>
            ))}
            <button className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white">
              Start Investing
            </button>
          </div>
        )}
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 lg:px-8 lg:pt-28 lg:pb-24 text-center relative z-10">
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight"
          >
            Partner on Airbnbs from{" "}
            <span className="text-emerald-400">{"\u00a3"}500</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mx-auto mt-5 max-w-2xl text-lg text-slate-400 leading-relaxed"
          >
            Buy shares in high-performing UK short-lets. Earn monthly rental
            income. Vote on property decisions. Track everything from your
            dashboard.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button className="rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">
              View Properties
            </button>
            <button className="rounded-xl border border-slate-600 px-8 py-3.5 text-base font-semibold text-slate-300 hover:border-slate-400 hover:text-white transition">
              How It Works
            </button>
          </motion.div>

          {/* Stat cards */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center"
              >
                <s.icon className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-sm text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PORTFOLIO PREVIEW ============== */}
      <section className="bg-gray-950 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            Your Portfolio at a Glance
          </motion.h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Total Contributed", val: "$16.00" },
              { label: "Total Earnings", val: "$1.53" },
              { label: "Pending Payouts", val: "$0.82" },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <p className="text-sm text-slate-400">{c.label}</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">
                  {c.val}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Journey milestones */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="mt-14 max-w-4xl mx-auto"
          >
            <p className="text-sm font-semibold text-slate-400 mb-4 text-center">
              Your Journey
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {MILESTONES.map((m, i) => (
                <span
                  key={m}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                    i === 0
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-700 text-slate-500"
                  }`}
                >
                  {m}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Placeholder screenshot */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            className="mt-12 mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/40 h-56 flex items-center justify-center"
          >
            <span className="text-slate-600 text-sm">
              Dashboard preview placeholder
            </span>
          </motion.div>
        </div>
      </section>

      {/* ============== HOW JV WORKS ============== */}
      <section className="py-20 bg-[hsl(215,50%,11%)]">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            How Joint Ventures Work
          </motion.h2>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 mb-4">
                  <s.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-emerald-400 mb-1">
                  Step {i + 1}
                </p>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PAYOUTS SECTION ============== */}
      <section className="py-20 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            Real Returns, Real Payouts
          </motion.h2>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="mt-12 mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
          >
            {/* Table header */}
            <div className="grid grid-cols-5 gap-2 px-5 py-3 text-xs font-semibold text-slate-500 border-b border-slate-800 bg-slate-900/80">
              <span>Date</span>
              <span>Property</span>
              <span>Amount</span>
              <span>Method</span>
              <span>Status</span>
            </div>

            {PAYOUTS.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 px-5 py-3.5 text-sm border-b border-slate-800/50 last:border-0"
              >
                <span className="text-slate-400">{p.date}</span>
                <span className="text-white font-medium">{p.property}</span>
                <span className="text-emerald-400 font-semibold">
                  {p.amount}
                </span>
                <span className="text-slate-400">{p.method}</span>
                <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {p.status}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Summary card */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            className="mt-6 mx-auto max-w-3xl flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-4"
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-400">
                Available to Claim
              </span>
            </div>
            <span className="text-lg font-bold text-white">$0.00</span>
          </motion.div>
        </div>
      </section>

      {/* ============== PROPOSALS ============== */}
      <section className="py-20 bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            Governance You Can See
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="mx-auto mt-3 max-w-xl text-center text-slate-400 text-base"
          >
            Every financial decision goes through on-chain proposals. Partners
            vote, results are binding, and the books are always open.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            className="mt-12 mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-400">
                  Proposal #6
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  January Financials Confirmation
                </h3>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" /> Ends in 6 days
              </span>
            </div>

            {/* Voting bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-emerald-400 font-medium">100% Yes</span>
                <span className="text-slate-500">0% No</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-full rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>You voted <span className="text-white font-medium">Yes</span></span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============== PROPERTY SHOWCASE ============== */}
      <section className="py-20 bg-[hsl(215,50%,11%)]">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            Featured Property
          </motion.h2>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
          >
            {/* Placeholder image */}
            <div className="h-52 bg-slate-800 flex items-center justify-center">
              <span className="text-slate-600 text-sm">
                Property image placeholder
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold">Pembroke Place</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Liverpool, United Kingdom
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                  <Shield className="h-3.5 w-3.5" /> Verified
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: "Share Price", val: "$1" },
                  { label: "Total Shares", val: "52,317" },
                  { label: "Owners", val: "10" },
                  {
                    label: "Est. Monthly ($500)",
                    val: "$33.45",
                  },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="rounded-xl bg-slate-800/60 px-3 py-4"
                  >
                    <p className="text-xl font-bold text-emerald-400">
                      {d.val}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{d.label}</p>
                  </div>
                ))}
              </div>

              <button className="mt-6 w-full rounded-xl bg-emerald-500 py-3.5 text-base font-semibold text-white hover:bg-emerald-400 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                Secure Your Shares <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="relative py-24 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.08)_0%,_transparent_70%)] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-3xl text-center px-4">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl md:text-5xl font-extrabold leading-tight"
          >
            Start building your Airbnb portfolio today
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="mt-4 text-slate-400 text-lg"
          >
            Join NFsTay partners already earning monthly rental income from
            UK short-lets.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
          >
            <button className="mt-8 rounded-xl bg-emerald-500 px-10 py-4 text-base font-semibold text-white hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 mx-auto">
              View Properties <ExternalLink className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span className="font-semibold text-white">
            NFs<span className="text-emerald-400">Tay</span>
          </span>
          <p>&copy; {new Date().getFullYear()} NFsTay. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
