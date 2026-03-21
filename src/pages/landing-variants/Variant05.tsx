import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Handshake, ClipboardCheck, Home, TrendingUp,
  Zap, Flame, Trophy, ArrowRight, ChevronRight, GraduationCap,
  CheckCircle, Star, Menu, X,
} from 'lucide-react';

const NAV_LINKS = ['Modules', 'Pricing', 'Sign In'];

const MODULES = [
  { icon: BookOpen, title: 'Getting Started', desc: 'Set up your R2R business from scratch.', lessons: 4, mins: 30, xp: 320 },
  { icon: Search, title: 'Property Hunting', desc: 'Find the best rent-to-rent opportunities.', lessons: 4, mins: 32, xp: 320 },
  { icon: Handshake, title: 'Landlord Pitching', desc: 'Win landlords over with proven scripts.', lessons: 4, mins: 26, xp: 320 },
  { icon: ClipboardCheck, title: 'Due Diligence', desc: 'Verify numbers, check compliance, avoid traps.', lessons: 4, mins: 28, xp: 320 },
  { icon: Home, title: 'Setting Up', desc: 'Furnish, list, and prepare for guests.', lessons: 4, mins: 30, xp: 320 },
  { icon: TrendingUp, title: 'Scaling Up', desc: 'Grow from 1 property to a portfolio.', lessons: 4, mins: 34, xp: 320 },
];

const STATS = [
  { value: '9', label: 'Modules' },
  { value: '36', label: 'Lessons' },
  { value: '36', label: 'Checklists' },
  { value: 'Beginner to Intermediate', label: 'Level' },
];

const STEPS = [
  { num: '01', title: 'Learn', desc: 'Complete modules at your pace', icon: GraduationCap },
  { num: '02', title: 'Browse', desc: 'Access landlord-approved deals on the marketplace', icon: Search },
  { num: '03', title: 'Close', desc: 'Use CRM and inbox to secure your first property', icon: CheckCircle },
];

const fade = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function Variant05() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">NFsTay</span>
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Academy
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="hover:text-stone-900 transition-colors">{l}</a>
            ))}
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              Start Learning
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white px-4 pb-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="block text-sm font-medium text-stone-600 py-1">{l}</a>
            ))}
            <button className="w-full bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
              Start Learning
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/60 via-stone-50 to-stone-50">
        <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <motion.span
            variants={fade} initial="hidden" animate="visible" transition={{ duration: 0.5 }}
            className="inline-block text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full mb-6"
          >
            UK-Focused Training
          </motion.span>

          <motion.h1
            variants={fade} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight max-w-3xl mx-auto"
          >
            Learn rent-to-rent from operators who do it daily
          </motion.h1>

          <motion.p
            variants={fade} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 text-stone-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            NFsTay Academy teaches you everything from finding your first deal to scaling a portfolio.
            9 modules, 36 lessons, 36 checklists — built by operators with 15+ years of experience.
          </motion.p>

          <motion.div
            variants={fade} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-7 py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              Start Learning Free <ArrowRight className="w-4 h-4" />
            </button>
            <button className="border border-stone-300 hover:border-stone-400 text-stone-700 font-semibold px-7 py-3 rounded-lg transition-colors">
              View Curriculum
            </button>
          </motion.div>

          <motion.div
            variants={fade} initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto"
          >
            {STATS.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-stone-200 px-4 py-3">
                <p className="text-lg font-bold text-emerald-700">{s.value}</p>
                <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CURRICULUM ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">What you'll learn</h2>
            <p className="mt-3 text-stone-500 max-w-lg mx-auto">
              6 of 9 core modules shown below. Each includes video walkthroughs, downloadable checklists, and real-deal examples.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              const progress = Math.round(((i + 1) / MODULES.length) * 15);
              return (
                <motion.div
                  key={m.title}
                  variants={fade} initial="hidden" whileInView="visible"
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-emerald-50 text-emerald-600 rounded-xl p-2.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      +{m.xp} XP
                    </span>
                  </div>

                  <h3 className="font-bold text-base">{m.title}</h3>
                  <p className="text-sm text-stone-500 mt-1 flex-1">{m.desc}</p>

                  <div className="mt-4 text-xs text-stone-400 flex items-center gap-3">
                    <span>{m.lessons} lessons</span>
                    {m.mins && <span>~{m.mins} min</span>}
                  </div>

                  {/* progress bar */}
                  <div className="mt-3 w-full bg-stone-100 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                  </div>

                  <button className="mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                    Open Module <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GAMIFICATION ── */}
      <section className="py-20 px-4 bg-gradient-to-b from-stone-50 to-amber-50/40">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Learning that sticks</h2>
            <p className="mt-3 text-stone-500 max-w-lg mx-auto">
              Earn XP for every lesson and checklist you complete. Track your progress, maintain streaks, and level up.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* XP */}
            <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="bg-white rounded-2xl border border-stone-200 p-6 text-center"
            >
              <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Earn XP</h3>
              <p className="text-sm text-stone-500 mt-2">
                Complete lessons and checklists to earn experience points. Every action moves you closer to your next level.
              </p>
            </motion.div>

            {/* Levels */}
            <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-stone-200 p-6 text-center"
            >
              <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Level Up</h3>
              <p className="text-sm text-stone-500 mt-2 mb-4">
                Operator Level 1, Level 2, and beyond. See how far you've come at a glance.
              </p>
              <div className="w-full bg-stone-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '38%' }} />
              </div>
              <p className="text-xs text-stone-400 mt-2">Level 1 — 38% to Level 2</p>
            </motion.div>

            {/* Streaks */}
            <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-stone-200 p-6 text-center"
            >
              <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-4">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Keep Your Streak</h3>
              <p className="text-sm text-stone-500 mt-2">
                1-day streak and counting. Consistency compounds — your progress carries over to real deals on NFsTay.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FROM LEARNING TO DOING ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold">Turn knowledge into live deals</h2>
            <p className="mt-3 text-stone-500 max-w-lg mx-auto">
              Every lesson connects to a real workflow inside NFsTay.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.num} variants={fade} initial="hidden" whileInView="visible"
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-stone-400 tracking-wider">{s.num}</span>
                  <h3 className="font-bold text-lg mt-1">{s.title}</h3>
                  <p className="text-sm text-stone-500 mt-2 max-w-xs mx-auto">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="py-16 px-4 bg-white">
        <motion.div
          variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <Star className="w-5 h-5 text-amber-400 mx-auto mb-4" />
          <blockquote className="text-lg sm:text-xl font-medium leading-relaxed text-stone-800">
            "I went from zero knowledge to operating 3 properties in 6 months. The academy gave me the
            confidence to pitch landlords."
          </blockquote>
          <p className="mt-5 text-sm text-stone-500 font-medium">James R., Leeds</p>
        </motion.div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Academy access included in Pro</h2>
            <p className="mt-3 text-stone-500">Choose the plan that fits where you are right now.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="bg-white rounded-2xl border border-stone-200 p-6"
            >
              <h3 className="font-bold text-lg">Free</h3>
              <p className="text-3xl font-extrabold mt-2">$0<span className="text-sm font-normal text-stone-400">/forever</span></p>
              <ul className="mt-5 space-y-2 text-sm text-stone-600">
                {['Preview of 3 modules', 'Community access', 'Basic checklists'].map((t) => (
                  <li key={t} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{t}</li>
                ))}
              </ul>
              <button className="mt-6 w-full border border-stone-300 hover:border-stone-400 text-stone-700 font-semibold py-2.5 rounded-lg text-sm transition-colors">
                Get Started
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border-2 border-emerald-600 p-6 relative"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                Most Popular
              </span>
              <h3 className="font-bold text-lg">Pro</h3>
              <p className="text-3xl font-extrabold mt-2">
                $67<span className="text-sm font-normal text-stone-400">/month</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">or $997 lifetime</p>
              <ul className="mt-5 space-y-2 text-sm text-stone-600">
                {[
                  'All 9 modules + 36 lessons',
                  '36 downloadable checklists',
                  'Full deal marketplace access',
                  'CRM and inbox tools',
                  'XP tracking and streaks',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{t}</li>
                ))}
              </ul>
              <button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
                Start Pro
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-4 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-center">
        <motion.div variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">Your first deal starts with your first lesson</h2>
          <p className="mt-4 text-emerald-100 max-w-lg mx-auto">
            Join operators across the UK who are building rent-to-rent portfolios with NFsTay Academy.
          </p>
          <button className="mt-8 bg-white text-emerald-700 font-semibold px-8 py-3 rounded-lg hover:bg-emerald-50 transition-colors inline-flex items-center gap-2">
            Start Learning Free <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-stone-900 text-stone-400 py-12 px-4">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <span className="text-white font-bold text-lg">NFsTay</span>
            <p className="mt-2 leading-relaxed">Rent-to-rent training and deal marketplace. Built by operators, for operators.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Academy</h4>
            <ul className="space-y-1.5">
              {['Modules', 'Pricing', 'Checklists', 'Community'].map((l) => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Platform</h4>
            <ul className="space-y-1.5">
              {['Marketplace', 'CRM', 'Inbox', 'Privacy', 'Terms'].map((l) => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-stone-800 text-xs text-stone-500">
          2026 NFsTay Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
