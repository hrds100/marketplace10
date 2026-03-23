import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Search, LayoutGrid, MessageSquare, BookOpen, CheckCircle, MapPin, ChevronRight } from 'lucide-react';
import LandingNav from '@/components/LandingNav';

/* ── Animated counter ── */
function Counter({ target, prefix = '', suffix = '', decimals = 0 }: { target: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1200, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(eased * target);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()}{suffix}</span>;
}

/* ── Fade-in wrapper ── */
const fadeIn = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.5 } };

/* ── Data ── */
const DEALS = [
  { name: '2-Bed Flat, Ancoats', city: 'Manchester', postcode: 'M4 6BF', rent: 850, profit: 1200, type: '2-bed flat', badge: 'Featured', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=220&fit=crop' },
  { name: '3-Bed House, Headingley', city: 'Leeds', postcode: 'LS6 3BN', rent: 950, profit: 1400, type: '3-bed house', badge: 'Live', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=220&fit=crop' },
  { name: '1-Bed Studio, Baltic', city: 'Liverpool', postcode: 'L1 0AH', rent: 650, profit: 980, type: '1-bed studio', badge: 'Featured', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=220&fit=crop' },
  { name: '2-Bed Flat, Digbeth', city: 'Birmingham', postcode: 'B5 6DB', rent: 780, profit: 1100, type: '2-bed flat', badge: 'Live', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=220&fit=crop' },
  { name: '3-Bed Terrace, Clifton', city: 'Bristol', postcode: 'BS8 1AB', rent: 1100, profit: 1650, type: '3-bed terrace', badge: 'Live', img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=220&fit=crop' },
  { name: '1-Bed Flat, Shoreditch', city: 'London', postcode: 'E1 6QR', rent: 1350, profit: 1900, type: '1-bed flat', badge: 'Live', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=220&fit=crop' },
];

const TIMELINE = [
  { step: 1, title: 'Learn the fundamentals', desc: 'Complete Academy courses. Understand rent-to-rent economics, compliance and landlord pitching.', tag: 'Academy', mock: '9 modules \u00b7 36 lessons \u00b7 36 checklists' },
  { step: 2, title: 'Browse live deals', desc: 'Filter 1,800+ verified properties by city, type and profit margin.', tag: 'Deals', mock: 'Manchester \u00b7 2-bed flat \u00b7 \u00a3850/mo \u00b7 +\u00a31,200 profit' },
  { step: 3, title: 'Analyse the returns', desc: 'Use the earnings estimator to model nightly rates, occupancy and profit.', tag: 'Estimator', mock: '22 nights \u00b7 \u00a3102/night \u00b7 Est. profit \u00a31,200/mo' },
  { step: 4, title: 'Message the landlord', desc: 'Open the unified inbox. Property context alongside every message.', tag: 'Inbox', mock: '\u201cIs this property approved for short-term lets?\u201d' },
  { step: 5, title: 'Track in your pipeline', desc: 'Drag deals between stages: Spotted, Shortlisted, Offer Sent, Signed.', tag: 'Pipeline', mock: 'Spotted \u2192 Shortlisted \u2192 Offer \u2192 Signed' },
  { step: 6, title: 'Sign the agreement', desc: 'Close the deal. Everything documented in one place.', tag: 'CRM' },
  { step: 7, title: 'Go live and earn', desc: 'List on Airbnb or your own direct booking site. Start hosting.', tag: 'Booking Site' },
  { step: 8, title: 'Scale to 10 units', desc: 'Repeat the process. Grow from one property to a full portfolio.', tag: 'Portfolio' },
];

const COURSES = [
  { name: 'Getting Started', lessons: 6, level: 'Beginner' },
  { name: 'Property Hunting', lessons: 8, level: 'Beginner' },
  { name: 'Landlord Pitching', lessons: 6, level: 'Intermediate' },
  { name: 'Numbers and Profit', lessons: 8, level: 'Intermediate' },
  { name: 'Scaling Your Portfolio', lessons: 10, level: 'Intermediate' },
  { name: 'Direct Bookings', lessons: 6, level: 'Beginner' },
];

const TESTIMONIALS = [
  { quote: 'nfstay helped me close my first three deals in under a month. The CRM is the reason I stay organised.', name: 'Sarah K.', city: 'Manchester' },
  { quote: 'The Academy alone paid for itself. I went from zero to signing my first property in six weeks.', name: 'Tom P.', city: 'London' },
  { quote: 'Every deal is verified. The earnings estimator is accurate. I use it before every viewing.', name: 'Priya S.', city: 'Birmingham' },
];

const PRICING_FEATURES = [
  '1,800+ verified deals', 'CRM pipeline', 'Unified inbox', 'Earnings estimator',
  'nfstay Academy', 'Direct landlord contact', 'Priority deal alerts', 'Affiliate programme',
];

export default function LandingPageV10() {
  return (
    <div className="min-h-screen" style={{ background: '#f3f3ee' }}>
      <LandingNav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden flex items-center" style={{ background: 'hsl(215 50% 11%)', minHeight: '70vh' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, hsla(145,63%,42%,0.08) 0%, transparent 60%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6 w-full py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'hsla(145,63%,42%,0.12)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs font-semibold tracking-wider uppercase text-primary">\u00a3680 average monthly profit per deal</span>
            </div>
            <h1 className="text-[34px] md:text-[46px] lg:text-[56px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white max-w-2xl">
              Find, negotiate and grow{' '}
              <span className="relative inline-block">
                your Airbnb portfolio
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 320 8" fill="none" style={{ opacity: 0.6 }}>
                  <path d="M0 6C60 2 100 2 160 4C220 6 260 2 320 4" stroke="hsl(145 63% 42%)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed max-w-[480px]" style={{ color: 'hsl(215 20% 65%)' }}>
              The unified workspace for finding, analysing and closing landlord-approved rent-to-rent deals across the UK.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="h-[48px] px-7 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] inline-flex items-center hover:opacity-90 transition-opacity">
                Start 3-day trial for \u00a35 <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link to="/signin" className="h-[48px] px-7 rounded-lg font-medium text-[15px] inline-flex items-center transition-colors" style={{ border: '1.5px solid hsl(215 22% 28%)', color: 'white' }}>
                Explore the platform first
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BLOCK 1: TRUST STRIPE ── */}
      <motion.section {...fadeIn} className="py-10" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6 flex flex-wrap justify-center gap-0">
          {[
            { val: 4200, suffix: '+', label: 'UK operators' },
            { val: 1800, suffix: '+', label: 'Verified deals' },
            { val: 680, prefix: '\u00a3', label: 'Avg. monthly profit' },
            { val: 10, label: 'UK cities' },
            { val: 4.8, label: 'Operator rating', decimals: 1 },
          ].map((s, i) => (
            <div key={i} className="px-7 py-3 text-center border-r border-gray-200 last:border-r-0">
              <div className="text-[28px] font-extrabold text-gray-900 tracking-tight">
                <Counter target={s.val} prefix={s.prefix || ''} suffix={s.suffix || ''} decimals={s.decimals || 0} />
              </div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── BLOCK 5 (PROMOTED): JOURNEY TIMELINE ── */}
      <motion.section {...fadeIn} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Your path to <span className="text-primary italic" style={{ fontFamily: "'Playfair Display', serif" }}>property income</span></h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">From complete beginner to portfolio owner. nfstay supports every step.</p>
          </div>
          <div className="relative max-w-[640px] mx-auto">
            <div className="absolute left-5 top-0 bottom-0 w-0.5" style={{ background: 'linear-gradient(180deg, #1e9a80, #e8e5df)' }} />
            {TIMELINE.map((t, i) => (
              <motion.div key={i} {...fadeIn} transition={{ ...fadeIn.transition, delay: i * 0.08 }} className="flex gap-6 py-7 relative">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0 z-10 border-[3px]" style={{ borderColor: '#f3f3ee' }}>{t.step}</div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">{t.title}</h4>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{t.desc}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded">{t.tag}</span>
                  {t.mock && <div className="mt-2 bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-xs text-gray-500">{t.mock}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── BLOCK 2: DEAL GRID ── */}
      <motion.section {...fadeIn} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Browse landlord-approved deals</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Every listing is verified, compliance-checked and ready to operate.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEALS.map((d, i) => (
              <motion.div key={i} {...fadeIn} transition={{ ...fadeIn.transition, delay: i * 0.08 }} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${d.img}')` }}>
                  <span className="absolute top-2.5 left-2.5 bg-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm">{d.badge}</span>
                </div>
                <div className="p-4">
                  <h4 className="text-[15px] font-semibold text-gray-900">{d.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{d.city} &middot; {d.postcode}</p>
                  <div className="mt-3 space-y-0">
                    <div className="flex justify-between py-1.5 border-t border-gray-50 text-sm"><span className="text-gray-500">Monthly rent</span><span className="font-medium">&pound;{d.rent.toLocaleString()}</span></div>
                    <div className="flex justify-between py-1.5 border-t border-gray-50 text-sm"><span className="text-gray-500">Est. profit</span><span className="font-bold text-primary">&pound;{d.profit.toLocaleString()}</span></div>
                    <div className="flex justify-between py-1.5 border-t border-gray-50 text-sm"><span className="text-gray-500">Type</span><span className="font-medium">{d.type}</span></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to="/signup" className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold flex items-center justify-center">Visit listing</Link>
                    <Link to="/signup" className="flex-1 h-9 rounded-lg border border-gray-200 text-xs font-medium flex items-center justify-center hover:bg-gray-50">Inquire now</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">Updated daily &mdash; 1,800+ verified listings across the UK</p>
        </div>
      </motion.section>

      {/* ── BLOCK 3: PIPELINE ── */}
      <motion.section {...fadeIn} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Close faster. Miss nothing.</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Track every deal from first message to signed contract.</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { stage: 'Spotted', color: '#3b82f6', deals: [{ name: '2-Bed, Ancoats', meta: 'Manchester \u00b7 \u00a3850/mo' }, { name: '1-Bed, Hulme', meta: 'Manchester \u00b7 \u00a3700/mo' }] },
              { stage: 'Shortlisted', color: '#f59e0b', deals: [{ name: '3-Bed, Headingley', meta: 'Leeds \u00b7 \u00a3950/mo' }] },
              { stage: 'Offer Sent', color: '#8b5cf6', deals: [{ name: '2-Bed, Digbeth', meta: 'Birmingham \u00b7 \u00a3780/mo' }, { name: '3-Bed, Clifton', meta: 'Bristol \u00b7 \u00a31,100/mo' }] },
              { stage: 'Signed', color: '#1e9a80', deals: [{ name: '1-Bed, Shoreditch', meta: 'London \u00b7 \u00a31,350/mo' }] },
            ].map((col, i) => (
              <div key={i} className="flex-1 min-w-[180px] bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />{col.stage}
                </div>
                {col.deals.map((d, j) => (
                  <div key={j} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5 mb-1.5 text-sm">
                    <strong className="block text-gray-900">{d.name}</strong>
                    <span className="text-xs text-gray-500">{d.meta}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-8">
            {['See every deal at a glance', 'Set follow-up reminders', 'Never let a deal go cold', 'From lead to lease in one view'].map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{b}
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── BLOCK 4: UNIFIED INBOX ── */}
      <motion.section {...fadeIn} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Every landlord. One inbox.</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">WhatsApp, email and portal messages in a single thread &mdash; linked to your deals.</p>
          </div>
          <div className="flex border border-gray-100 rounded-2xl overflow-hidden bg-white min-h-[280px]">
            <div className="w-[220px] border-r border-gray-50 bg-gray-50 flex-shrink-0">
              <div className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-gray-100">Conversations</div>
              <div className="px-4 py-3 bg-emerald-50 border-b border-gray-100"><div className="text-sm font-semibold text-gray-900">James Thornton</div><div className="text-xs text-gray-500 truncate">Is the Manchester flat available?</div></div>
              <div className="px-4 py-3 border-b border-gray-100 hover:bg-gray-100 transition cursor-pointer"><div className="text-sm font-semibold text-gray-900">Sarah Chen</div><div className="text-xs text-gray-500 truncate">Viewing confirmed for Thursday</div></div>
              <div className="px-4 py-3 hover:bg-gray-100 transition cursor-pointer"><div className="text-sm font-semibold text-gray-900">David Walsh</div><div className="text-xs text-gray-500 truncate">Contract sent for review</div></div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3 text-sm font-semibold border-b border-gray-100 flex items-center gap-2">James Thornton <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">2-Bed, Ancoats</span></div>
              <div className="flex-1 p-4 flex flex-col gap-2.5 bg-gray-50">
                <div className="self-start max-w-[75%] bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm">Is the 2-bed in Ancoats still available for serviced accommodation?</div>
                <div className="self-end max-w-[75%] bg-primary text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">Yes, the landlord has approved it. Monthly rent is &pound;850 with an estimated profit of &pound;1,200.</div>
                <div className="self-start max-w-[75%] bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm">That sounds ideal. When can I arrange a viewing?</div>
                <div className="self-end max-w-[75%] bg-primary text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">Thursday at 5pm works. I will send the address now.</div>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {['Auto-link messages to deals', 'Reminders before viewings and renewals', 'See deal stage inside every thread'].map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{f}</div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── BLOCK 6: ACADEMY ── */}
      <motion.section {...fadeIn} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Learn rent-to-rent. Then do it. In the same place.</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">15 years of operator knowledge, structured into step-by-step modules.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COURSES.map((c, i) => (
              <motion.div key={i} {...fadeIn} transition={{ ...fadeIn.transition, delay: i * 0.08 }} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">{c.name}</h3>
                <div className="text-xs text-gray-500">{c.lessons} lessons &middot; <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.level === 'Beginner' ? 'bg-emerald-50 text-primary' : 'bg-amber-50 text-amber-700'}`}>{c.level}</span></div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">All modules included in your &pound;67/month membership</p>
        </div>
      </motion.section>

      {/* ── BLOCK 7: TRUST ── */}
      <motion.section {...fadeIn} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Trusted by UK operators</h2></div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} {...fadeIn} transition={{ ...fadeIn.transition, delay: i * 0.1 }} className="bg-white border border-gray-100 rounded-2xl p-6">
                <p className="text-[15px] text-gray-900 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{t.name.split(' ').map(n => n[0]).join('')}</div>
                  <div><div className="text-sm font-semibold text-gray-900">{t.name}</div><div className="text-xs text-gray-500">{t.city}</div></div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            {['Airdna-verified data', 'UK compliant', '4.8 operator rating', '10 UK cities'].map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />{b}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── BLOCK 8: PRICING ── */}
      <motion.section {...fadeIn} className="py-20 bg-white">
        <div className="max-w-[480px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Simple pricing for serious operators</h2>
            <p className="text-gray-500 mt-3">One plan. Everything included. Cancel any time.</p>
          </div>
          <div className="border-2 border-primary rounded-[20px] p-8 text-center shadow-[0_0_0_1px_#1e9a80,0_12px_40px_rgba(30,154,128,0.08)]">
            <div className="text-lg font-bold text-gray-900 mb-1">Full Access</div>
            <div className="text-[52px] font-extrabold text-gray-900 leading-none tracking-tight">&pound;67<span className="text-lg font-normal text-gray-500"> / month</span></div>
            <div className="text-[15px] font-semibold text-primary mt-2">Start with a 3-day trial for &pound;5</div>
            <div className="text-sm text-gray-400 mt-1 mb-6">Cancel online at any time. No contracts.</div>
            <ul className="text-left space-y-0 mb-6">
              {PRICING_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/signup" className="block w-full h-12 rounded-xl bg-primary text-white font-semibold text-[15px] flex items-center justify-center hover:opacity-90 transition-opacity">
              Start 3-day trial for &pound;5
            </Link>
            <p className="text-xs text-gray-400 mt-3">Cancel online at any time. No contracts.</p>
          </div>
        </div>
      </motion.section>

      {/* ── BLOCK 9: CTA BAND ── */}
      <section className="py-16 text-center" style={{ background: 'linear-gradient(135deg, #1e9a80, #0e1726)' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-[28px] font-bold text-white mb-2">Ready to find your next deal?</h2>
          <p className="text-white/70 mb-6">Join 4,200+ operators building their portfolio with nfstay.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/signup" className="h-12 px-8 rounded-xl bg-white text-gray-900 font-semibold text-[15px] inline-flex items-center hover:bg-gray-100 transition-colors">Start 3-day trial for &pound;5</Link>
            <Link to="/signin" className="h-12 px-8 rounded-xl font-medium text-[15px] inline-flex items-center text-white/70 hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-1 mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
                <span className="flex items-center justify-center w-7 h-7 border-2 border-gray-900 rounded-md text-xs font-bold">nf</span>
                <span className="text-lg tracking-widest">stay</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">The UK rent-to-rent marketplace. Find, analyse and close landlord-approved deals.</p>
            </div>
            <div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Platform</h4><div className="space-y-1"><a href="#" className="block text-sm text-gray-500 hover:text-primary">Deals</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">CRM Pipeline</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Unified Inbox</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Booking Site</a></div></div>
            <div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Learn</h4><div className="space-y-1"><a href="#" className="block text-sm text-gray-500 hover:text-primary">Academy</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">How It Works</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Blog</a></div></div>
            <div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Company</h4><div className="space-y-1"><a href="#" className="block text-sm text-gray-500 hover:text-primary">Pricing</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Agent Programme</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Contact</a></div></div>
          </div>
          <div className="border-t border-gray-50 pt-4 text-center text-xs text-gray-400">&copy; 2026 nfstay. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
