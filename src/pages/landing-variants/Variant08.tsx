import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  MapPin,
  CheckCircle,
  Search,
  Users,
  Mail,
  Handshake,
  GraduationCap,
  Globe,
  UserPlus,
  Menu,
  X,
  Quote,
  ChevronRight,
} from 'lucide-react';

const testimonials = [
  {
    quote: 'Found my first deal in Manchester within a week. The CRM keeps me organized.',
    name: 'Tom H.',
    location: 'Manchester',
    detail: '2 properties',
  },
  {
    quote: 'The university lessons gave me confidence to pitch landlords. Now I run 4 units.',
    name: 'Sarah K.',
    location: 'Leeds',
    detail: '4 properties',
  },
  {
    quote: 'Inbox messaging saved me hours of back-and-forth emails.',
    name: 'James P.',
    location: 'Liverpool',
    detail: '3 properties',
  },
  {
    quote: 'JV Partners let me invest in properties I couldn\'t afford alone.',
    name: 'Priya M.',
    location: 'London',
    detail: 'Investor',
  },
  {
    quote: 'The booking site builder helped us save 15% on commissions.',
    name: 'David R.',
    location: 'Birmingham',
    detail: '5 properties',
  },
  {
    quote: 'I earn \u00a3400/month as an nfstay agent just by sharing my link.',
    name: 'Rachel L.',
    location: 'Bristol',
    detail: 'Agent',
  },
];

const cities = [
  { name: 'Manchester', deals: 28, top: '38%', left: '48%' },
  { name: 'Liverpool', deals: 15, top: '40%', left: '42%' },
  { name: 'London', deals: 12, top: '68%', left: '58%' },
  { name: 'Leeds', deals: 8, top: '37%', left: '52%' },
  { name: 'Birmingham', deals: 10, top: '52%', left: '50%' },
  { name: 'Bristol', deals: 6, top: '62%', left: '44%' },
  { name: 'Edinburgh', deals: 5, top: '22%', left: '46%' },
  { name: 'Sheffield', deals: 7, top: '42%', left: '52%' },
  { name: 'Nottingham', deals: 4, top: '47%', left: '52%' },
  { name: 'Newcastle', deals: 3, top: '28%', left: '50%' },
];

const stats = [
  { value: '\u00a3680', label: 'Avg monthly profit per deal' },
  { value: '120+', label: 'Verified deals listed' },
  { value: '15', label: 'UK cities covered' },
  { value: '4.8/5', label: 'Operator satisfaction rating' },
];

const payouts = [
  { date: '1 Mar 2026', property: '3-bed Salford Quays', amount: '\u00a3680.00', status: 'Paid' },
  { date: '1 Feb 2026', property: '2-bed Anfield Flat', amount: '\u00a3520.00', status: 'Paid' },
  { date: '1 Jan 2026', property: '1-bed Headingley Studio', amount: '\u00a3330.00', status: 'Paid' },
];

const features = [
  { icon: Search, label: 'Deals' },
  { icon: Users, label: 'CRM' },
  { icon: Mail, label: 'Inbox' },
  { icon: Handshake, label: 'JV Partners' },
  { icon: GraduationCap, label: 'University' },
  { icon: Globe, label: 'Booking Site' },
  { icon: UserPlus, label: 'Agent Programme' },
];

const trustBadges = ['Airdna Verified', 'UK Compliant', '120+ Deals', '15 Cities'];

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
}

export default function Variant08() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* STICKY NAV */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-green-600">NFs</span>Tay
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#deals" className="hover:text-gray-900 transition">Deals</a>
            <a href="#reviews" className="hover:text-gray-900 transition">Reviews</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
            <a href="#signin" className="text-gray-500 hover:text-gray-900 transition">Sign In</a>
            <a
              href="#join"
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Join nfstay
            </a>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 text-sm">
            <a href="#deals" className="py-2">Deals</a>
            <a href="#reviews" className="py-2">Reviews</a>
            <a href="#pricing" className="py-2">Pricing</a>
            <a href="#signin" className="py-2 text-gray-500">Sign In</a>
            <a href="#join" className="bg-green-600 text-white text-center py-2 rounded-lg">
              Join nfstay
            </a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="bg-gray-50 py-20 px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto"
        >
          Trusted by operators across the UK
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-lg text-gray-600 max-w-xl mx-auto"
        >
          Real deals. Real returns. Real operators building their short-let portfolios with nfstay.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#deals"
            className="bg-green-600 text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-green-700 transition"
          >
            See Live Deals
          </a>
          <a
            href="#reviews"
            className="text-green-700 font-medium flex items-center gap-1 hover:underline"
          >
            Read Stories <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Trust badges */}
        <div className="mt-14 overflow-hidden">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                <CheckCircle className="w-4 h-4 text-green-500" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* OPERATOR STORIES */}
      <section id="reviews" className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">What operators are saying</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
            >
              <Quote className="w-6 h-6 text-green-200 mb-3" />
              <p className="text-gray-700 leading-relaxed mb-4">"{t.quote}"</p>
              <Stars />
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">{t.name}</span>
                  <span className="mx-1 text-gray-300">|</span>
                  <MapPin className="w-3 h-3 inline text-gray-400" /> {t.location}
                  <span className="mx-1 text-gray-300">|</span>
                  <span className="text-green-600 font-medium">{t.detail}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* UK COVERAGE MAP */}
      <section className="bg-gray-50 py-20 px-4" id="deals">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Deals across the UK</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Mock map */}
            <div className="relative w-full max-w-xs mx-auto aspect-[3/5] bg-green-50 rounded-[2rem] border-2 border-green-200 overflow-hidden">
              {cities.map((c) => (
                <div
                  key={c.name}
                  className="absolute w-3 h-3 bg-green-500 rounded-full ring-4 ring-green-200/50"
                  style={{ top: c.top, left: c.left }}
                  title={`${c.name} — ${c.deals} deals`}
                />
              ))}
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium">
                UK Coverage Map
              </span>
            </div>

            {/* City list */}
            <div>
              <ul className="space-y-3">
                {cities.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </span>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {c.deals} deals
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-gray-500 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                New cities added every week
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS SNAPSHOT */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">The numbers speak</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm"
            >
              <span className="text-3xl md:text-4xl font-bold text-green-600">{s.value}</span>
              <p className="mt-2 text-sm text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PAYOUT HISTORY */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Real payouts, every month</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Property</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((p, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{p.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">{p.property}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{p.amount}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            Total Earned: <span className="font-semibold text-gray-800">\u00a31,530.00</span>
          </p>
        </div>
      </section>

      {/* FEATURES OVERVIEW */}
      <section className="py-20 px-4 max-w-4xl mx-auto" id="pricing">
        <h2 className="text-3xl font-bold text-center mb-10">Everything you need</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition"
            >
              <f.icon className="w-6 h-6 text-green-600" />
              <span className="text-sm font-semibold text-gray-800">{f.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-20 px-4 text-center" id="join">
        <h2 className="text-3xl md:text-4xl font-bold text-white max-w-lg mx-auto">
          Join 200+ UK operators on nfstay
        </h2>
        <a
          href="#join"
          className="mt-8 inline-block bg-white text-green-700 font-semibold px-10 py-3.5 rounded-lg hover:bg-green-50 transition text-base"
        >
          Get Started Free
        </a>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <span className="font-bold text-white text-lg tracking-tight">
            <span className="text-green-400">NFs</span>Tay
          </span>
          <div className="flex gap-6">
            <a href="#deals" className="hover:text-white transition">Deals</a>
            <a href="#reviews" className="hover:text-white transition">Reviews</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
          </div>
          <span className="text-gray-500">&copy; 2026 nfstay. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
