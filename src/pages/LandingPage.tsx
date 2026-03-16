import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star, CheckCircle, BookOpen, Target, TrendingUp, BarChart3, Shield, ChevronDown } from 'lucide-react';
import LandingNav from '@/components/LandingNav';
import { listings, faqItems } from '@/data/mockData';
import PropertyCard from '@/components/PropertyCard';
import { useFavourites } from '@/hooks/useFavourites';

function Counter({ target, suffix = '' }: {target: number;suffix?: string;}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const duration = 1800;
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          setCount(Math.floor(p * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const { toggle, isFav } = useFavourites();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const navigate = useNavigate();
  const stripListings = listings.slice(0, 4);

  const goSignUp = () => navigate('/signup');

  return (
    <div className="min-h-screen bg-card">
      <LandingNav />

      {/* HERO */}
      <section className="relative min-h-screen overflow-hidden flex items-center" style={{ background: 'hsl(215 50% 11%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, hsla(145,63%,42%,0.08) 0%, transparent 60%)' }} />
        <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 w-full flex items-center min-h-screen">
          <div className="grid lg:grid-cols-[55%_45%] gap-16 items-center w-full py-24">
            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7" style={{ background: 'hsla(145,63%,42%,0.12)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
                <span className="text-xs font-semibold tracking-wider uppercase text-primary">£680 average monthly profit per deal</span>
              </div>

              <h1 className="text-[34px] md:text-[46px] lg:text-[60px] font-extrabold leading-[1.08] tracking-[-0.035em]" style={{ color: 'white' }}>
                Airbnb-ready properties with{' '}
                <span className="relative inline-block">
                  permission to operate and profit
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 320 8" fill="none" style={{ opacity: 0.6 }}>
                    <path d="M0 6C60 2 100 2 160 4C220 6 260 2 320 4" stroke="hsl(145 63% 42%)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed max-w-[480px]" style={{ color: 'hsl(215 20% 65%)' }}>NFsTay connects short-term rental operators with verified, landlord-approved rent-to-rent opportunities. Browse, analyse, and close deals, all in one place.

              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/signup" className="h-[52px] px-7 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] inline-flex items-center hover:opacity-90 transition-opacity">
                  Browse Live Deals <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <a href="#how-it-works" className="h-[52px] px-7 rounded-lg font-medium text-[15px] inline-flex items-center transition-colors" style={{ border: '1.5px solid hsl(215 22% 28%)', color: 'white' }}>
                  See How It Works
                </a>
              </div>

              {/* Stats */}
              <div className="mt-12 flex items-center gap-8 flex-wrap">
                {[{ n: 4200, s: '+', l: 'UK operators' }, { n: 1800, s: '+', l: 'verified deals' }, { n: 10, s: '', l: 'cities covered' }].map((s, i) =>
                <div key={i} className="flex items-center gap-8">
                    {i > 0 && <div className="w-px h-9 hidden sm:block" style={{ background: 'hsl(215 22% 28%)' }} />}
                    <div>
                      <div className="text-xl font-bold" style={{ color: 'white' }}><Counter target={s.n} suffix={s.s} /></div>
                      <div className="text-[13px]" style={{ color: 'hsl(215 20% 65%)' }}>{s.l}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatars */}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) =>
                  <img key={i} src={`https://picsum.photos/seed/auth-av${i}/40/40`} className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'hsl(215 50% 11%)' }} alt="" />
                  )}
                </div>
                <span className="text-[13px]" style={{ color: 'hsl(215 20% 65%)' }}>Joined by 47 operators this month</span>
                <div className="flex items-center gap-1 ml-4">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />)}
                  <span className="text-[13px] ml-1" style={{ color: 'hsl(215 16% 47%)' }}>4.8 · Excellent</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Floating cards */}
            <div className="hidden lg:block relative h-[480px]">
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="absolute top-10 left-5 z-20 float-fast">
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl min-w-[280px]" style={{ background: 'hsl(215 35% 18%)', boxShadow: '0 20px 60px rgba(0,0,0,0.30)' }}>
                  <img src="https://picsum.photos/seed/hero-notif/40/40" className="w-10 h-10 rounded-lg object-cover" alt="" />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'white' }}>New deal matched in Manchester</p>
                    <p className="text-xs" style={{ color: 'hsl(215 20% 65%)' }}>3-bed flat · Est. profit £680/mo</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-primary pulse-dot ml-auto" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="absolute right-0 top-20 z-10 float-slow">
                <div className="w-[320px] rounded-[20px] overflow-hidden bg-card" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}>
                  <img src="https://picsum.photos/seed/hero-prop1/640/400" className="w-full h-[200px] object-cover" alt="" />
                  <div className="p-[18px_20px_20px]">
                    <div className="flex justify-between items-start">
                      <span className="text-[15px] font-bold text-foreground">Maple House, Manchester</span>
                      <span className="badge-green text-xs">+£680/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">3-bed flat · M14 · Live</p>
                    <div className="mt-3 flex gap-6">
                      <div><div className="text-[11px] text-muted-foreground">Monthly rent</div><div className="text-[13px] font-medium text-foreground">£1,250</div></div>
                      <div><div className="text-[11px] text-muted-foreground">Profit</div><div className="text-[13px] font-bold text-accent-foreground">£680</div></div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ delay: 0.5, duration: 0.6 }} className="absolute right-5 top-[200px] z-0 rotate-[2deg]">
                <div className="w-[300px] rounded-2xl bg-card p-4" style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.20)' }}>
                  <div className="flex items-center gap-3">
                    <img src="https://picsum.photos/seed/hero-prop2/80/80" className="w-12 h-12 rounded-lg object-cover" alt="" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Victoria Court, Leeds</p>
                      <span className="badge-green text-[11px]">+£540/mo</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[120px] z-10" style={{ background: 'linear-gradient(transparent, hsl(0 0% 100%))' }} />
      </section>

      {/* LANDLORD CTA */}
      <section className="py-16 bg-gradient-to-r from-emerald-50 to-teal-50 border-y border-emerald-100">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Landlords: List Your Property</h2>
            <p className="text-sm md:text-base text-gray-600 mt-2 max-w-md">Get qualified operators who guarantee rent. No management hassle.</p>
          </div>
          <Link
            to="/dashboard/list-a-deal"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 shadow-xl transition-all inline-flex items-center gap-2 shrink-0"
          >
            Submit a Deal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* DEALS STRIP */}
      <section id="deals-strip" className="py-20 bg-card">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between border-b border-border pb-3.5">
            <div className="flex gap-8">
              <button className="text-[15px] font-semibold text-foreground pb-3.5 border-b-2 border-foreground -mb-[15px]">Live Deals</button>
              <button className="text-[15px] font-medium text-muted-foreground pb-3.5 -mb-[15px]">Featured Deals</button>
            </div>
            <button onClick={goSignUp} className="text-sm font-semibold text-primary hover:opacity-75 transition-opacity">View all deals →</button>
          </div>
          <p className="text-[15px] text-muted-foreground mt-5 mb-8">Updated daily — 1,800+ landlord-approved rent-to-rent listings across the UK</p>

          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {stripListings.map((l) =>
            <div key={l.id} className="min-w-[280px] snap-start">
                <PropertyCard listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} forceSignUp />
              </div>
            )}
          </div>

          <div className="mt-9 text-center">
            <button onClick={goSignUp} className="bg-nfstay-black text-nfstay-black-foreground h-[52px] px-8 rounded-lg font-semibold text-[15px] inline-flex items-center hover:opacity-90 transition-opacity">
              Browse All 1,800+ Deals <ArrowRight className="ml-2 w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 bg-secondary">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 text-center">
          <h2 className="text-[36px] md:text-[42px] font-bold tracking-[-0.025em] text-foreground">How NFsTay works</h2>
          <p className="text-lg text-muted-foreground mt-4 max-w-[560px] mx-auto leading-relaxed">Three steps to your first rent-to-rent deal. No experience needed.</p>

          <div className="grid md:grid-cols-3 gap-8 mt-14">
            {[
            { icon: Target, step: '01', title: 'Browse deals', desc: 'Search 1,800+ landlord-approved properties across 10 UK cities. Filter by rent, profit, and type.' },
            { icon: BarChart3, step: '02', title: 'Analyse & compare', desc: 'Use the earnings estimator, track deals in your CRM pipeline, and compare profit margins side by side.' },
            { icon: TrendingUp, step: '03', title: 'Close & earn', desc: 'Contact landlords directly, sign your rent-to-rent agreement, and start earning from day one.' }].
            map((s) =>
            <div key={s.step} className="bg-card rounded-2xl p-8 border border-border card-hover text-left">
                <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center mb-5">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Step {s.step}</span>
                <h3 className="text-xl font-bold text-foreground mt-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{s.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-card">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 text-center">
          <h2 className="text-[36px] md:text-[42px] font-bold tracking-[-0.025em] text-foreground">Simple pricing</h2>
          <p className="text-lg text-muted-foreground mt-4 max-w-[480px] mx-auto">Try everything for $4. Cancel any time.</p>

          <div className="max-w-[480px] mx-auto mt-14">
            <div className="bg-card rounded-2xl p-8 border-2 border-primary text-left relative">
              <span className="badge-green-fill">Full Access</span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">£4</span>
                <span className="text-muted-foreground text-sm">/ 3-day trial</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Then £97/Month after trial. Cancel any time.</p>
              <p className="text-sm text-muted-foreground mt-1">Full access to everything. No restrictions.</p>
              <ul className="mt-6 space-y-3">
                {['1,800+ verified deals', 'Priority deal alerts', 'Affiliate programme', 'Direct landlord contact', 'Full CRM access', 'Airbnb University', 'Earnings estimator', 'Cancel any time'].map((v) =>
                <li key={v} className="flex items-center gap-2.5 text-sm text-foreground"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{v}</li>
                )}
              </ul>
              <Link to="/signup" className="mt-8 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center hover:opacity-90 transition-opacity">
                Get access, no credit card needed
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">Access dashboard without credit card</p>
            </div>
          </div>
        </div>
      </section>

      {/* UNIVERSITY PREVIEW */}
      <section id="university" className="py-20 bg-secondary">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: 'hsla(145,63%,42%,0.12)' }}>
            <span className="text-sm">🎓</span>
            <span className="text-xs font-semibold text-primary">Powered by GPT-4.1 AI</span>
          </div>
          <h2 className="text-[36px] md:text-[42px] font-bold tracking-[-0.025em] text-foreground">Airbnb University</h2>
          <p className="text-lg text-muted-foreground mt-4 max-w-[520px] mx-auto">15yr operator knowledge, 100+ properties trained in AI. Learn everything about rent-to-rent with step-by-step modules.</p>

          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {[
            { emoji: '🚀', title: 'Getting Started', desc: 'Set up your R2R business from scratch', lessons: 6 },
            { emoji: '🏠', title: 'Property Hunting', desc: 'Find the best opportunities', lessons: 8 },
            { emoji: '💬', title: 'Landlord Pitching', desc: 'Win landlords with proven scripts', lessons: 5 }].
            map((m) =>
            <div key={m.title} className="bg-card rounded-2xl p-6 border border-border card-hover text-left cursor-pointer" onClick={goSignUp}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{m.emoji}</span>
                  <h3 className="text-base font-bold text-foreground">{m.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{m.desc}</p>
                <p className="text-xs text-muted-foreground mt-3">{m.lessons} lessons</p>
              </div>
            )}
          </div>

          <button onClick={goSignUp} className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-75 transition-opacity">
            <BookOpen className="w-4 h-4" /> View all 9 modules →
          </button>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-card">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 text-center">
          <h2 className="text-[36px] md:text-[42px] font-bold tracking-[-0.025em] text-foreground">Trusted by operators</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {[
            { name: 'Sarah K.', role: 'Manchester', quote: 'NFsTay helped me find my first three deals in under a month. The CRM is a game-changer for staying organised.' },
            { name: 'Tom P.', role: 'London', quote: 'The university modules alone are worth the subscription. I went from zero knowledge to closing my first property in 6 weeks.' },
            { name: 'Priya S.', role: 'Birmingham', quote: 'Finally a platform that takes rent-to-rent seriously. Every deal is verified and the earnings estimator is spot-on.' }].
            map((t, i) =>
            <div key={t.name} className="bg-card rounded-2xl p-6 border border-border text-left">
                <div className="flex gap-1 mb-4">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 fill-yellow-500 text-yellow-500" />)}</div>
                <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-5">
                  <img src={`https://picsum.photos/seed/testi${i + 1}/80/80`} className="w-10 h-10 rounded-full object-cover" alt="" />
                  <div><div className="text-sm font-semibold text-foreground">{t.name}</div><div className="text-xs text-muted-foreground">{t.role}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-secondary">
        <div className="max-w-[720px] mx-auto px-6 md:px-10">
          <h2 className="text-[36px] md:text-[42px] font-bold tracking-[-0.025em] text-foreground text-center">Frequently asked questions</h2>
          <div className="mt-12 space-y-3">
            {faqItems.slice(0, 6).map((faq) =>
            <div key={faq.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-[15px] font-medium text-foreground">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${openFaq === faq.id ? 'rotate-180' : ''}`} />
                </button>
                <motion.div
                initial={false}
                animate={{ height: openFaq === faq.id ? 'auto' : 0, opacity: openFaq === faq.id ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden">
                
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: 'hsl(215 50% 11%)' }}>
        <div className="max-w-[640px] mx-auto px-6 md:px-10 text-center">
          <h2 className="text-[36px] md:text-[42px] font-bold tracking-[-0.025em]" style={{ color: 'white' }}>Ready to find your next deal?</h2>
          <p className="text-lg mt-4" style={{ color: 'hsl(215 20% 65%)' }}>Join 4,200+ operators already using NFsTay to build their rent-to-rent portfolio.</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/signup" className="h-[52px] px-8 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] inline-flex items-center hover:opacity-90 transition-opacity">
              Get Started — No Credit Card Needed <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link to="/signin" className="h-[52px] px-8 rounded-lg font-medium text-[15px] inline-flex items-center" style={{ border: '1.5px solid hsl(215 22% 28%)', color: 'white' }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <span className="text-lg font-extrabold text-foreground">NFsTay</span>
              <p className="text-sm text-muted-foreground mt-2 max-w-[300px]">The UK's leading rent-to-rent deal platform. Find, analyse, and close landlord-approved opportunities.</p>
            </div>
            <div className="flex gap-12">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
                <div className="space-y-2">
                  <Link to="/signup" className="block text-sm text-foreground hover:text-primary transition-colors">Deals</Link>
                  <Link to="/signup" className="block text-sm text-foreground hover:text-primary transition-colors">University</Link>
                  <Link to="/signup" className="block text-sm text-foreground hover:text-primary transition-colors">CRM</Link>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Company</h4>
                <div className="space-y-2">
                  <a href="#pricing" className="block text-sm text-foreground hover:text-primary transition-colors">Pricing</a>
                  <a href="#how-it-works" className="block text-sm text-foreground hover:text-primary transition-colors">How it Works</a>
                  <Link to="/signin" className="block text-sm text-foreground hover:text-primary transition-colors">Sign In</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 NFsTay Ltd. All rights reserved. Registered in England & Wales.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>);

}