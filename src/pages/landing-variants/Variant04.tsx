import { useState } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  LayoutGrid,
  CreditCard,
  Globe,
  Check,
  X,
  Upload,
  Search,
  Star,
  Menu,
} from "lucide-react";

const NAV_LINKS = ["Features", "Pricing", "Sign In"];

const FEATURES = [
  {
    icon: Palette,
    title: "Brand Identity",
    desc: "Upload your logo, choose your accent colour, and set your brand name. Your site, your look.",
  },
  {
    icon: LayoutGrid,
    title: "Property Listings",
    desc: "Showcase all your properties with photos, amenities, and pricing in a polished layout.",
  },
  {
    icon: CreditCard,
    title: "Direct Bookings",
    desc: "Guests book and pay you directly. No middleman fees eating into your margins.",
  },
  {
    icon: Globe,
    title: "Custom Domain",
    desc: "Use yourbrand.nfstay.app out of the box, or connect your own custom domain.",
  },
];

const ACCENT_COLOURS = [
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#db2777",
  "#171717",
];

const COMPARISON = [
  { label: "Commission", direct: "0%", ota: "15-20%" },
  { label: "Guest data", direct: "You own it", ota: "Platform owns it" },
  { label: "Brand", direct: "Your brand", ota: "Airbnb brand" },
  {
    label: "Repeat bookings",
    direct: "Direct relationship",
    ota: "Back through platform",
  },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Variant04() {
  const [accent, setAccent] = useState(ACCENT_COLOURS[0]);
  const [brandName, setBrandName] = useState("Your Brand");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="text-xl font-bold tracking-tight">
            NFs<span className="text-green-600">Tay</span>
          </span>
          <div className="hidden md:flex items-center gap-6 text-sm">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="text-gray-600 hover:text-gray-900">
                {l}
              </a>
            ))}
            <a
              href="#"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              Build Your Site
            </a>
          </div>
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={22} />
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="text-gray-600 py-1">
                {l}
              </a>
            ))}
            <a
              href="#"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-center font-medium"
            >
              Build Your Site
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-6"
          >
            New Feature
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5"
          >
            Your brand. Your bookings.
            <br className="hidden sm:block" /> Your rules.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-8"
          >
            Launch a direct booking website for your serviced accommodation in
            minutes. Customise your brand, list properties, and take bookings
            — without Airbnb's fees.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href="#"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
            >
              Build Your Site
            </a>
            <a
              href="#"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400 transition"
            >
              See Example
            </a>
          </motion.div>
        </div>

        {/* Mock browser */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="max-w-4xl mx-auto mt-14"
        >
          <div className="rounded-2xl border border-gray-200 shadow-xl overflow-hidden bg-white">
            {/* Chrome bar */}
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 ml-3 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
                yourbrand.nfstay.app
              </div>
            </div>
            {/* Mock site */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">Your Brand</span>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>Properties</span>
                  <span>About</span>
                  <span>Contact</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 text-center">
                <p className="text-2xl font-bold text-gray-800 mb-4">
                  Find Your Perfect Stay
                </p>
                <div className="max-w-md mx-auto flex items-center bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <Search size={14} className="text-gray-400 mr-2" />
                  <span className="text-xs text-gray-400">
                    Search by location or dates...
                  </span>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">
                Featured Properties
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 h-20 md:h-28" />
                    <div className="p-2 space-y-1">
                      <div className="h-2.5 w-3/4 bg-gray-200 rounded" />
                      <div className="h-2 w-1/2 bg-gray-100 rounded" />
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={8}
                            className="text-yellow-400 fill-yellow-400"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CUSTOMISATION FEATURES ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Make it yours in minutes
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Everything you need to launch a professional, branded booking site
            for your portfolio.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BRAND PREVIEW ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            See how it looks
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Customisation panel */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-5 border border-gray-100">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Accent Colour
                </label>
                <div className="flex gap-2">
                  {ACCENT_COLOURS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        accent === c
                          ? "border-gray-900 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Logo
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center text-gray-400 text-xs">
                  <Upload size={20} className="mb-1" />
                  <span>Drag and drop or click to upload</span>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: accent }}>
                    {brandName || "Your Brand"}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Book Now
                  </span>
                </div>
                <div
                  className="rounded-lg p-6 text-center"
                  style={{ backgroundColor: accent + "12" }}
                >
                  <p className="font-semibold text-sm mb-2">
                    Welcome to {brandName || "Your Brand"}
                  </p>
                  <div
                    className="text-[10px] inline-block text-white px-3 py-1 rounded"
                    style={{ backgroundColor: accent }}
                  >
                    Browse Properties
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map((n) => (
                    <div key={n} className="rounded border border-gray-100">
                      <div className="h-16 bg-gray-100 rounded-t" />
                      <div className="p-2">
                        <div className="h-2 w-3/4 bg-gray-200 rounded mb-1" />
                        <div
                          className="h-2 w-1/3 rounded"
                          style={{ backgroundColor: accent + "33" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
            Direct bookings vs. OTA platforms
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-3 pr-4 font-medium text-gray-500" />
                  <th className="py-3 px-4 font-semibold text-green-700">
                    Direct (NFsTay)
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-400">
                    Airbnb
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-green-700 flex items-center gap-1.5">
                      <Check size={14} /> {row.direct}
                    </td>
                    <td className="py-3 px-4 text-gray-400 align-middle">
                      <span className="inline-flex items-center gap-1.5">
                        <X size={14} /> {row.ota}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="py-20 px-4">
        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xl md:text-2xl font-medium leading-relaxed text-gray-800 mb-6">
            "We moved 30% of our bookings direct within 3 months. The savings
            on commission alone paid for the entire NFsTay membership."
          </p>
          <footer className="text-sm text-gray-500">
            — Sarah K., Manchester
          </footer>
        </motion.blockquote>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Included in every Pro plan
          </h2>
          <p className="text-gray-500 mb-8">
            No add-ons, no hidden fees. Your booking site comes with your
            membership.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex-1">
              <p className="text-sm text-gray-500 mb-1">Monthly</p>
              <p className="text-3xl font-bold mb-1">
                &pound;67<span className="text-base font-normal text-gray-400">/mo</span>
              </p>
            </div>
            <div className="bg-white border-2 border-green-600 rounded-xl p-6 flex-1 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Best Value
              </span>
              <p className="text-sm text-gray-500 mb-1">Lifetime</p>
              <p className="text-3xl font-bold mb-1">&pound;997</p>
              <p className="text-xs text-gray-400">One-time payment</p>
            </div>
          </div>
          <a
            href="#"
            className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Start Building
          </a>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="bg-gradient-to-r from-green-600 to-gray-900 py-16 px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Stop paying 20% to platforms.
          <br className="hidden sm:block" /> Build your direct channel.
        </h2>
        <a
          href="#"
          className="inline-block bg-white text-green-700 font-medium px-8 py-3 rounded-lg hover:bg-green-50 transition"
        >
          Build Your Site
        </a>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span className="font-bold text-gray-700">
            NFs<span className="text-green-600">Tay</span>
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600">Features</a>
            <a href="#" className="hover:text-gray-600">Pricing</a>
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
          </div>
          <span>&copy; {new Date().getFullYear()} NFsTay. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
