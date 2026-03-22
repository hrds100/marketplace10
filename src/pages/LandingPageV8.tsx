import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import LandingNav from '@/components/LandingNav';

function Counter({ target, prefix = '', suffix = '', decimals = 0 }: { target: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = (ts: number) => { if (!start) start = ts; const p = Math.min((ts - start) / 800, 1); setVal((1 - Math.pow(1 - p, 3)) * target); if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()}{suffix}</span>;
}

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.5 } };

const DEALS = [
  { name: '2-Bed Flat, Ancoats', city: 'Manchester', pc: 'M4 6BF', rent: 850, profit: 1200, type: '2-bed flat', badge: 'Featured', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=220&fit=crop' },
  { name: '3-Bed House, Headingley', city: 'Leeds', pc: 'LS6 3BN', rent: 950, profit: 1400, type: '3-bed house', badge: 'Live', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=220&fit=crop' },
  { name: '1-Bed Studio, Baltic', city: 'Liverpool', pc: 'L1 0AH', rent: 650, profit: 980, type: '1-bed studio', badge: 'Featured', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=220&fit=crop' },
  { name: '2-Bed Flat, Digbeth', city: 'Birmingham', pc: 'B5 6DB', rent: 780, profit: 1100, type: '2-bed flat', badge: 'Live', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=220&fit=crop' },
  { name: '3-Bed Terrace, Clifton', city: 'Bristol', pc: 'BS8 1AB', rent: 1100, profit: 1650, type: '3-bed terrace', badge: 'Live', img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=220&fit=crop' },
  { name: '1-Bed Flat, Shoreditch', city: 'London', pc: 'E1 6QR', rent: 1350, profit: 1900, type: '1-bed flat', badge: 'Live', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=220&fit=crop' },
];

const PERSONAS = {
  new: { heading: 'Starting from scratch? We have got you.', sub: 'Learn the model, find your first deal, and close it in one platform.', cards: [
    { title: 'Academy first', desc: 'Start with structured courses. Learn sourcing, analysis and landlord pitching.' },
    { title: 'Browse real deals', desc: 'Apply what you learn on 1,800+ verified properties.' },
    { title: 'Message landlords', desc: 'Use the inbox to send your first inquiry with confidence.' },
  ]},
  scaling: { heading: 'Ready to scale? Organise and accelerate.', sub: 'Manage multiple deals, track your pipeline and never miss a follow-up.', cards: [
    { title: 'CRM pipeline', desc: 'Visual deal stages from inquiry to signed contract. Drag, drop, done.' },
    { title: 'Unified inbox', desc: 'All landlord conversations in one searchable feed.' },
    { title: 'Earnings estimator', desc: 'Model returns on every property before you commit.' },
  ]},
  landlord: { heading: 'List your property. Get qualified operators.', sub: 'Reach serious rent-to-rent operators who guarantee rent.', cards: [
    { title: 'List your deal', desc: 'Submit your property and reach 4,200+ verified operators.' },
    { title: 'Inbox messages', desc: 'Receive and respond to inquiries from qualified operators.' },
    { title: 'Guaranteed rent', desc: 'Operators pay monthly, regardless of occupancy.' },
  ]},
};

type PersonaKey = keyof typeof PERSONAS;

const COURSES = [
  { name: 'Getting Started', lessons: 6, level: 'Beginner' as const },
  { name: 'Property Hunting', lessons: 8, level: 'Beginner' as const },
  { name: 'Landlord Pitching', lessons: 6, level: 'Intermediate' as const },
  { name: 'Numbers and Profit', lessons: 8, level: 'Intermediate' as const },
  { name: 'Scaling Your Portfolio', lessons: 10, level: 'Intermediate' as const },
  { name: 'Direct Bookings', lessons: 6, level: 'Beginner' as const },
];

const TESTIMONIALS = [
  { q: 'NFsTay helped me close my first three deals in under a month. The CRM is the reason I stay organised.', name: 'Sarah K.', city: 'Manchester' },
  { q: 'The Academy alone paid for itself. I went from zero to signing my first property in six weeks.', name: 'Tom P.', city: 'London' },
  { q: 'Every deal is verified. The earnings estimator is accurate. I use it before every viewing.', name: 'Priya S.', city: 'Birmingham' },
];

const PRICING = ['1,800+ verified deals','CRM pipeline','Unified inbox','Earnings estimator','NFsTay Academy','Direct landlord contact','Priority deal alerts','Affiliate programme'];

export default function LandingPageV8() {
  const [persona, setPersona] = useState<PersonaKey>('new');
  const p = PERSONAS[persona];

  return (
    <div className="min-h-screen" style={{ background: '#f3f3ee' }}>
      <LandingNav />

      {/* HERO */}
      <section className="relative overflow-hidden flex items-center" style={{ background: 'hsl(215 50% 11%)', minHeight: '70vh' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, hsla(145,63%,42%,0.08) 0%, transparent 60%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6 w-full py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'hsla(145,63%,42%,0.12)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs font-semibold tracking-wider uppercase text-primary">&pound;680 average monthly profit per deal</span>
            </div>
            <h1 className="text-[34px] md:text-[46px] lg:text-[56px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white max-w-2xl">
              Find, negotiate and grow{' '}
              <span className="relative inline-block">your Airbnb portfolio
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 320 8" fill="none" style={{ opacity: 0.6 }}><path d="M0 6C60 2 100 2 160 4C220 6 260 2 320 4" stroke="hsl(145 63% 42%)" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed max-w-[480px]" style={{ color: 'hsl(215 20% 65%)' }}>The unified workspace for finding, analysing and closing landlord-approved rent-to-rent deals across the UK.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="h-[48px] px-7 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] inline-flex items-center transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Start 3-day trial for &pound;5 <ArrowRight className="ml-2 w-4 h-4" /></Link>
              <Link to="/signin" className="h-[48px] px-7 rounded-lg font-medium text-[15px] inline-flex items-center transition-all duration-200 border-[1.5px] border-hero-border text-white hover:scale-[1.02] hover:shadow-lg active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Explore the platform first</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BLOCK 1: TRUST STRIPE */}
      <motion.section {...fade} className="py-14" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-0">
          {[{ v: 4200, s: '+', l: 'UK operators' },{ v: 1800, s: '+', l: 'Verified deals' },{ v: 680, p: '\u00a3', l: 'Avg. monthly profit' },{ v: 10, l: 'UK cities' },{ v: 4.8, l: 'Operator rating', d: 1 }].map((s, i) => (
            <div key={i} className="px-4 sm:px-7 py-3 text-center border-b sm:border-b-0 sm:border-r border-gray-200 last:border-b-0 sm:last:border-r-0">
              <div className="text-[28px] font-extrabold text-gray-900 tracking-tight"><Counter target={s.v} prefix={s.p||''} suffix={s.s||''} decimals={s.d||0} /></div>
              <div className="text-xs text-gray-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* BLOCK: PERSONA SELECTOR (unique to V8) */}
      <motion.section {...fade} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-[32px] font-bold text-gray-900 tracking-tight">What describes you?</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Select your stage to see how NFsTay fits.</p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap mb-10">
            {([['new','New operator'],['scaling','Scaling operator'],['landlord','Landlord']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setPersona(key)} className={`px-6 py-3 rounded-full text-sm font-medium border transition-all duration-200 active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] ${persona === key ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-gray-200 text-gray-500 hover:border-primary hover:text-primary'}`}>{label}</button>
            ))}
          </div>
          <motion.div key={persona} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">{p.heading}</h3>
            <p className="text-gray-500 mb-8 text-center">{p.sub}</p>
            <div className="grid sm:grid-cols-3 gap-5">
              {p.cards.map((c, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-out">
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-2">{c.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* BLOCK 2: DEAL GRID */}
      <motion.section {...fade} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Browse landlord-approved deals</h2><p className="text-gray-500 mt-3 max-w-lg mx-auto">Every listing is verified, compliance-checked and ready to operate.</p></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEALS.map((d, i) => (
              <motion.div key={i} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-out">
                <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${d.img}')` }}><span className="absolute top-2.5 left-2.5 bg-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm">{d.badge}</span></div>
                <div className="p-5">
                  <h4 className="text-[15px] font-semibold text-gray-900">{d.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{d.city} &middot; {d.pc}</p>
                  <div className="mt-3 space-y-0">
                    <div className="flex justify-between py-1.5 border-t border-gray-100 text-sm"><span className="text-gray-500">Monthly rent</span><span className="font-medium">&pound;{d.rent.toLocaleString()}</span></div>
                    <div className="flex justify-between py-1.5 border-t border-gray-100 text-sm"><span className="text-gray-500">Est. profit</span><span className="font-bold text-primary">&pound;{d.profit.toLocaleString()}</span></div>
                    <div className="flex justify-between py-1.5 border-t border-gray-100 text-sm"><span className="text-gray-500">Type</span><span className="font-medium">{d.type}</span></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to="/signup" className="flex-1 h-11 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold flex items-center justify-center transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Visit listing</Link>
                    <Link to="/signup" className="flex-1 h-11 rounded-lg border border-gray-200 text-xs font-medium flex items-center justify-center transition-all duration-200 hover:bg-gray-100 active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Inquire now</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">Updated daily &mdash; 1,800+ verified listings across the UK</p>
        </div>
      </motion.section>

      {/* BLOCK 3: PIPELINE */}
      <motion.section {...fade} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Close faster. Miss nothing.</h2><p className="text-gray-500 mt-3 max-w-lg mx-auto">Track every deal from first message to signed contract.</p></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[{ s: 'Spotted', c: '#3b82f6', d: [{ n: '2-Bed, Ancoats', m: 'Manchester \u00b7 \u00a3850/mo' },{ n: '1-Bed, Hulme', m: 'Manchester \u00b7 \u00a3700/mo' }] },
              { s: 'Shortlisted', c: '#f59e0b', d: [{ n: '3-Bed, Headingley', m: 'Leeds \u00b7 \u00a3950/mo' }] },
              { s: 'Offer Sent', c: '#8b5cf6', d: [{ n: '2-Bed, Digbeth', m: 'Birmingham \u00b7 \u00a3780/mo' },{ n: '3-Bed, Clifton', m: 'Bristol \u00b7 \u00a31,100/mo' }] },
              { s: 'Signed', c: '#1e9a80', d: [{ n: '1-Bed, Shoreditch', m: 'London \u00b7 \u00a31,350/mo' }] },
            ].map((col, i) => (
              <div key={i} className="flex-1 min-w-[180px] bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wide"><span className="w-2 h-2 rounded-full" style={{ background: col.c }} />{col.s}</div>
                {col.d.map((d, j) => (<div key={j} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5 mb-1.5 text-sm"><strong className="block text-gray-900">{d.n}</strong><span className="text-xs text-gray-500">{d.m}</span></div>))}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-8">
            {['See every deal at a glance','Set follow-up reminders','Never let a deal go cold','From lead to lease in one view'].map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{b}</div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* BLOCK 4: UNIFIED INBOX */}
      <motion.section {...fade} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Every landlord. One inbox.</h2><p className="text-gray-500 mt-3 max-w-lg mx-auto">WhatsApp, email and portal messages in a single thread &mdash; linked to your deals.</p></div>
          <div className="flex border border-gray-100 rounded-2xl overflow-hidden bg-white min-h-[280px]">
            <div className="w-[220px] border-r border-gray-50 bg-gray-50 flex-shrink-0 hidden sm:block">
              <div className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-gray-100">Conversations</div>
              <div className="px-4 py-3 bg-emerald-50 border-b border-gray-100"><div className="text-sm font-semibold text-gray-900">James Thornton</div><div className="text-xs text-gray-500 truncate">Is the Manchester flat available?</div></div>
              <div className="px-4 py-3 border-b border-gray-100"><div className="text-sm font-semibold text-gray-900">Sarah Chen</div><div className="text-xs text-gray-500 truncate">Viewing confirmed for Thursday</div></div>
              <div className="px-4 py-3"><div className="text-sm font-semibold text-gray-900">David Walsh</div><div className="text-xs text-gray-500 truncate">Contract sent for review</div></div>
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
            {['Auto-link messages to deals','Reminders before viewings and renewals','See deal stage inside every thread'].map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{f}</div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* BLOCK 5: JOURNEY */}
      <motion.section {...fade} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">From first search to first profit</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[{ n: '01', t: 'Browse 1,800+ verified deals', d: 'Filter by city, type and profit.', m: 'Deal Marketplace' },
              { n: '02', t: 'Analyse profit', d: 'Model nightly rates, occupancy and costs.', m: 'Earnings Estimator' },
              { n: '03', t: 'Message the landlord', d: 'Property context alongside every thread.', m: 'Unified Inbox' },
              { n: '04', t: 'Track in your pipeline', d: 'Spotted, Shortlisted, Offer Sent, Signed.', m: 'CRM Pipeline' },
              { n: '05', t: 'Sign the agreement', d: 'Everything documented in one place.', m: 'Contracts' },
              { n: '06', t: 'Go live and earn', d: 'List on Airbnb or your own booking site.', m: 'Revenue' },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{s.n}</div>
                <div><h4 className="text-sm font-semibold text-gray-900">{s.t}</h4><p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.d}</p><div className="mt-2 bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5 text-[11px] text-gray-500">{s.m}</div></div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* BLOCK 6: ACADEMY */}
      <motion.section {...fade} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Learn rent-to-rent. Then do it. In the same place.</h2><p className="text-gray-500 mt-3 max-w-lg mx-auto">15 years of operator knowledge, structured into step-by-step modules.</p></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COURSES.map((c, i) => (
              <motion.div key={i} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-out">
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">{c.name}</h3>
                <div className="text-xs text-gray-500">{c.lessons} lessons &middot; <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.level === 'Beginner' ? 'bg-emerald-50 text-primary' : 'bg-amber-50 text-amber-700'}`}>{c.level}</span></div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">All modules included in your &pound;67/month membership</p>
        </div>
      </motion.section>

      {/* BLOCK 7: TESTIMONIALS */}
      <motion.section {...fade} className="py-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Trusted by UK operators</h2></div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} {...fade} transition={{ ...fade.transition, delay: i * 0.1 }} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <p className="text-[15px] text-gray-900 leading-relaxed mb-4">&ldquo;{t.q}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{t.name.split(' ').map(n => n[0]).join('')}</div>
                  <div><div className="text-sm font-semibold text-gray-900">{t.name}</div><div className="text-xs text-gray-500">{t.city}</div></div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            {['Airdna-verified data','UK compliant','4.8 operator rating','10 UK cities'].map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-primary" />{b}</span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* BLOCK 8: PRICING */}
      <motion.section {...fade} className="py-20" style={{ background: '#f3f3ee' }}>
        <div className="max-w-[480px] mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-[32px] font-bold text-gray-900 tracking-tight">Simple pricing for serious operators</h2><p className="text-gray-500 mt-3">One plan. Everything included. Cancel any time.</p></div>
          <div className="border-2 border-primary rounded-[20px] p-8 text-center bg-white shadow-[0_0_0_1px_#1e9a80,0_12px_40px_rgba(30,154,128,0.08)]">
            <div className="text-lg font-bold text-gray-900 mb-1">Full Access</div>
            <div className="text-[52px] font-extrabold text-gray-900 leading-none tracking-tight">&pound;67<span className="text-lg font-normal text-gray-500"> / month</span></div>
            <div className="text-[15px] font-semibold text-primary mt-2">Start with a 3-day trial for &pound;5</div>
            <div className="text-sm text-gray-400 mt-1 mb-6">Cancel online at any time. No contracts.</div>
            <ul className="text-left space-y-0 mb-6">
              {PRICING.map((f, i) => (<li key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{f}</li>))}
            </ul>
            <Link to="/signup" className="block w-full h-12 rounded-xl bg-primary text-white font-semibold text-[15px] flex items-center justify-center transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Start 3-day trial for &pound;5</Link>
            <p className="text-xs text-gray-400 mt-3">Cancel online at any time. No contracts.</p>
          </div>
        </div>
      </motion.section>

      {/* BLOCK 9: CTA BAND */}
      <section className="py-16 text-center" style={{ background: 'linear-gradient(135deg, #1e9a80, #0e1726)' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-[28px] font-bold text-white mb-2">Ready to find your next deal?</h2>
          <p className="text-white/70 mb-6">Join 4,200+ operators building their portfolio with NFsTay.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/signup" className="h-12 px-8 rounded-xl bg-white text-gray-900 font-semibold text-[15px] inline-flex items-center transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Start 3-day trial for &pound;5</Link>
            <Link to="/signin" className="h-12 px-8 rounded-xl font-medium text-[15px] inline-flex items-center text-white/70 border border-white/20 hover:text-white hover:border-white/40 transition-all duration-200 active:scale-[0.97] active:duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]">Sign in</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div><div className="flex items-center gap-1 mb-3" style={{ fontFamily: "'Sora', sans-serif" }}><span className="flex items-center justify-center w-7 h-7 border-2 border-gray-900 rounded-md text-xs font-bold">nf</span><span className="text-lg tracking-widest">stay</span></div><p className="text-sm text-gray-500 leading-relaxed">The UK rent-to-rent marketplace.</p></div>
            <div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Platform</h4><div className="space-y-1"><a href="#" className="block text-sm text-gray-500 hover:text-primary">Deals</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">CRM Pipeline</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Unified Inbox</a></div></div>
            <div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Learn</h4><div className="space-y-1"><a href="#" className="block text-sm text-gray-500 hover:text-primary">Academy</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">How It Works</a></div></div>
            <div><h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Company</h4><div className="space-y-1"><a href="#" className="block text-sm text-gray-500 hover:text-primary">Pricing</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Agent Programme</a><a href="#" className="block text-sm text-gray-500 hover:text-primary">Contact</a></div></div>
          </div>
          <div className="border-t border-gray-50 pt-4 text-center text-xs text-gray-400">&copy; 2026 NFsTay. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
