import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BarChart3, MessageSquare, Home, Users, BookOpen,
  Star, ChevronDown, ChevronRight, Menu, X, Shield, Zap,
  TrendingUp, Globe, Award, DollarSign, CheckCircle, ArrowRight,
  Layout, Mail, GraduationCap, UserPlus, CreditCard, HelpCircle,
  Building, MapPin, BedDouble, PoundSterling, Flame, Trophy,
  Layers, Send, ExternalLink, Check
} from 'lucide-react';

const C = {
  primary: '#262c37',
  darkest: '#0f0f10',
  accent: '#41ce8e',
  light: '#f6f7f9',
  muted: 'rgba(246,247,249,0.7)',
  surface: '#262c37',
  border: '#353b47',
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function SectionCaption({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 12, lineHeight: '150%', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '1.5px', color: C.accent, marginBottom: 12,
    }}>{children}</p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 36, lineHeight: '120%', fontWeight: 700, color: C.light, marginBottom: 16,
    }}>{children}</h2>
  );
}

function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 16, lineHeight: '160%', color: C.muted, ...style }}>{children}</p>
  );
}

function Btn({
  children, variant = 'primary', onClick, style,
}: { children: React.ReactNode; variant?: 'primary' | 'ghost'; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
        borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer',
        transition: 'all 250ms ease',
        ...(variant === 'primary'
          ? { background: C.accent, color: C.darkest, border: 'none' }
          : { background: 'transparent', color: C.light, border: `1.5px solid ${C.border}` }),
        ...style,
      }}
    >{children}</button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.darkest, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: 24, ...style,
    }}>{children}</div>
  );
}

function ImgPlaceholder({ h = 180, label }: { h?: number; label?: string }) {
  return (
    <div style={{
      height: h, background: `linear-gradient(135deg, ${C.primary}, ${C.darkest})`,
      borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.muted, fontSize: 13, fontWeight: 500, border: `1px solid ${C.border}`,
    }}>{label || 'Image'}</div>
  );
}

/* ─── NAVBAR ─── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const links = ['Deals', 'Invest', 'CRM', 'Academy', 'Pricing'];
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100, height: 72,
      background: 'rgba(15,15,16,0.8)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
      padding: '0 24px', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: C.light, letterSpacing: '-0.5px' }}>
        NFs<span style={{ color: C.accent }}>Tay</span>
      </span>

      {/* Desktop links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hide-mobile">
        {links.map(l => (
          <a key={l} href={`#${l.toLowerCase()}`} style={{
            color: C.muted, fontSize: 14, fontWeight: 500, textDecoration: 'none',
            transition: 'color 200ms',
          }}>{l}</a>
        ))}
        <Btn variant="primary" style={{ padding: '10px 20px', fontSize: 14 }}>Get Started</Btn>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="show-mobile"
        style={{ background: 'none', border: 'none', color: C.light, cursor: 'pointer' }}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute', top: 72, left: 0, right: 0,
              background: C.darkest, borderBottom: `1px solid ${C.border}`,
              padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            {links.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} style={{
                color: C.muted, fontSize: 16, fontWeight: 500, textDecoration: 'none',
              }}>{l}</a>
            ))}
            <Btn variant="primary">Get Started</Btn>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media(min-width:769px){.show-mobile{display:none!important}}
        @media(max-width:768px){.hide-mobile{display:none!important}.show-mobile{display:flex!important}}
      `}</style>
    </nav>
  );
}

/* ─── HERO ─── */
function Hero() {
  const stats = [
    { value: '120+', label: 'Deals' },
    { value: '£680', label: 'Avg Profit' },
    { value: '15', label: 'Cities' },
    { value: '4.8/5', label: 'Rating' },
  ];
  return (
    <section style={{
      background: `radial-gradient(ellipse at 50% 0%, rgba(65,206,142,0.05) 0%, ${C.darkest} 70%)`,
      padding: '100px 24px 80px', textAlign: 'center',
    }}>
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
        style={{ maxWidth: 800, margin: '0 auto' }}>
        <motion.div variants={fadeUp}><SectionCaption>THE UK'S RENT-TO-RENT MARKETPLACE</SectionCaption></motion.div>
        <motion.h1 variants={fadeUp} style={{
          fontSize: 48, lineHeight: '120%', fontWeight: 700, color: C.light,
          letterSpacing: '-0.96px', marginBottom: 20,
        }}>The all-in-one platform for rent-to-rent operators</motion.h1>
        <motion.div variants={fadeUp}>
          <Body style={{ maxWidth: 600, margin: '0 auto 32px' }}>
            Browse verified Airbnb deals, manage your pipeline, invest in properties,
            and build your direct booking site — everything in one place.
          </Body>
        </motion.div>
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn variant="primary">Explore Deals <ArrowRight size={16} /></Btn>
          <Btn variant="ghost">Watch How It Works</Btn>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
          gap: 24, maxWidth: 700, margin: '64px auto 0',
        }}
      >
        {stats.map(s => (
          <motion.div key={s.label} variants={fadeUp} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.accent }}>{s.value}</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ─── DEALS ─── */
function Deals() {
  const deals = [
    { city: 'Manchester', postcode: 'M15 4UH', type: '2-Bed House', rent: '£1,000', profit: '£500', badge: 'Airdna Verified' },
    { city: 'London', postcode: 'E16 2GR', type: 'Studio', rent: '£1,400', profit: '£450', badge: 'Exclusive JV' },
    { city: 'Liverpool', postcode: 'L1', type: '5-Bed House', rent: '£2,250', profit: '£1,000', badge: 'Airdna Verified' },
  ];
  return (
    <section id="deals" style={{ background: C.surface, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>LIVE DEALS</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Landlord-Approved Deals Across the UK</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Every listing is pre-negotiated with landlords and verified with Airdna revenue data.</Body></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}
        >
          {deals.map(d => (
            <motion.div key={d.postcode} variants={fadeUp}>
              <Card>
                <ImgPlaceholder h={160} label={`${d.city} Property`} />
                <div style={{ marginTop: 16 }}>
                  <span style={{
                    display: 'inline-block', background: 'rgba(65,206,142,0.12)', color: C.accent,
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, marginBottom: 12,
                  }}>{d.badge}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <MapPin size={14} color={C.accent} />
                    <span style={{ color: C.light, fontSize: 15, fontWeight: 600 }}>{d.city} &middot; {d.postcode}</span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
                    <BedDouble size={13} style={{ marginRight: 4 }} />{d.type}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: C.muted }}>Monthly Rent</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.light }}>{d.rent}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: C.muted }}>Est. Profit</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{d.profit}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="primary" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 13 }}>View Deal</Btn>
                    <Btn variant="ghost" style={{ padding: '10px 14px', fontSize: 13 }}><MessageSquare size={14} /></Btn>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Btn variant="ghost">Browse All Deals <ArrowRight size={16} /></Btn>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { num: '01', icon: <Search size={22} />, title: 'Browse', desc: 'Search verified rent-to-rent deals across 15 UK cities with full financial breakdowns.' },
    { num: '02', icon: <BarChart3 size={22} />, title: 'Analyse', desc: 'Airdna revenue data, occupancy rates, and profit projections on every listing.' },
    { num: '03', icon: <MessageSquare size={22} />, title: 'Message', desc: 'Contact landlords directly through the built-in CRM and inbox.' },
    { num: '04', icon: <Home size={22} />, title: 'Host', desc: 'Launch your Airbnb with your own branded booking site and start earning.' },
  ];
  return (
    <section style={{ background: C.darkest, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}><SectionCaption>HOW IT WORKS</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Four Steps to Your First Deal</SectionHeading></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: 32, marginTop: 48, position: 'relative',
          }}
        >
          {steps.map((s, i) => (
            <motion.div key={s.num} variants={fadeUp} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', border: `2px solid ${C.accent}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: C.accent,
              }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 4 }}>{s.num}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.light, marginBottom: 8 }}>{s.title}</div>
              <Body style={{ fontSize: 14 }}>{s.desc}</Body>
              {i < steps.length - 1 && (
                <div className="step-line" style={{
                  position: 'absolute', top: 28, right: -16, width: 32,
                  borderTop: `2px dashed ${C.border}`,
                }} />
              )}
            </motion.div>
          ))}
        </motion.div>
        <style>{`@media(max-width:768px){.step-line{display:none!important}}`}</style>
      </div>
    </section>
  );
}

/* ─── JV PARTNERS / INVEST ─── */
function Invest() {
  const tiers = ['Noobie', 'Deal Rookie', 'Cashflow Builder', 'Portfolio Boss', 'Property Titan'];
  const payouts = [
    { date: '01 Mar 2026', amount: '£42.80', status: 'Paid' },
    { date: '01 Feb 2026', amount: '£42.80', status: 'Paid' },
    { date: '01 Jan 2026', amount: '£38.60', status: 'Paid' },
  ];
  return (
    <section id="invest" style={{ background: C.surface, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>JV PARTNERSHIPS</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Partner on Airbnbs from £500</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Co-own rent-to-rent deals. Earn monthly payouts. No landlord hassle.</Body></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24 }}
        >
          {/* Investment details */}
          <motion.div variants={fadeUp}>
            <Card style={{ height: '100%' }}>
              <div style={{ fontSize: 14, color: C.accent, fontWeight: 600, marginBottom: 20 }}>DEAL SNAPSHOT</div>
              {[
                ['Share Price', '$1.00'],
                ['Total Shares', '52,000'],
                ['Max Owners', '10'],
                ['Target APR', '13.3%'],
                ['Min Investment', '£500'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ color: C.muted, fontSize: 14 }}>{k}</span>
                  <span style={{ color: C.light, fontSize: 14, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <ImgPlaceholder h={120} label="Property Preview" />
            </Card>
          </motion.div>

          {/* Payout table */}
          <motion.div variants={fadeUp}>
            <Card style={{ height: '100%' }}>
              <div style={{ fontSize: 14, color: C.accent, fontWeight: 600, marginBottom: 20 }}>PAYOUT HISTORY</div>
              <div style={{ borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 12px',
                  background: 'rgba(65,206,142,0.06)', fontSize: 12, color: C.muted, fontWeight: 600,
                }}>
                  <span>Date</span><span>Amount</span><span style={{ textAlign: 'right' }}>Status</span>
                </div>
                {payouts.map(p => (
                  <div key={p.date} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px',
                    borderBottom: `1px solid ${C.border}`, fontSize: 14,
                  }}>
                    <span style={{ color: C.muted }}>{p.date}</span>
                    <span style={{ color: C.light, fontWeight: 600 }}>{p.amount}</span>
                    <span style={{ textAlign: 'right' }}>
                      <span style={{
                        background: 'rgba(65,206,142,0.15)', color: C.accent,
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                      }}>{p.status}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, fontWeight: 600 }}>PORTFOLIO JOURNEY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tiers.map((t, i) => (
                    <span key={t} style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: i === 0 ? C.accent : 'rgba(65,206,142,0.08)',
                      color: i === 0 ? C.darkest : C.accent,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Btn variant="primary">View Properties <ArrowRight size={16} /></Btn>
        </div>
      </div>
    </section>
  );
}

/* ─── CRM & INBOX ─── */
function CrmInbox() {
  const columns = [
    { title: 'New Leads', count: 4, color: '#6366f1' },
    { title: 'Contacted', count: 2, color: '#f59e0b' },
    { title: 'Negotiating', count: 3, color: C.accent },
    { title: 'Won', count: 1, color: '#22c55e' },
  ];
  const threads = [
    { name: 'David Chen', preview: 'Yes, the property is still...', time: '2m ago', unread: true },
    { name: 'Sarah Patel', preview: 'I can do £950 per month...', time: '1h ago', unread: false },
    { name: 'James Wilson', preview: 'Let me check with the...', time: '3h ago', unread: false },
  ];
  return (
    <section id="crm" style={{ background: C.darkest, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>BUILT-IN CRM</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Your Deal Pipeline and Inbox</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Track every lead, conversation, and deal in one integrated workspace.</Body></motion.div>
        </motion.div>

        {/* Kanban */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card style={{ padding: 20, marginBottom: 24, overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 16, minWidth: 700 }}>
              {columns.map(col => (
                <div key={col.title} style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.light }}>{col.title}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: C.muted,
                      background: C.surface, padding: '2px 6px', borderRadius: 4,
                    }}>{col.count}</span>
                  </div>
                  {Array.from({ length: Math.min(col.count, 2) }).map((_, i) => (
                    <div key={i} style={{
                      background: C.surface, borderRadius: 8, padding: 12, marginBottom: 8,
                      border: `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontSize: 13, color: C.light, fontWeight: 500, marginBottom: 4 }}>Property Lead</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Manchester area</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Inbox */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 260 }} className="inbox-grid">
              {/* Thread list */}
              <div style={{ borderRight: `1px solid ${C.border}`, padding: 0 }}>
                <div style={{
                  padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
                  fontSize: 13, fontWeight: 600, color: C.light,
                }}>
                  <Mail size={14} style={{ marginRight: 6 }} />Inbox
                </div>
                {threads.map(t => (
                  <div key={t.name} style={{
                    padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                    background: t.unread ? 'rgba(65,206,142,0.04)' : 'transparent', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: t.unread ? 700 : 500, color: C.light }}>{t.name}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{t.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.preview}</div>
                  </div>
                ))}
              </div>

              {/* Chat area */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.light, marginBottom: 16 }}>David Chen</div>
                  <div style={{
                    background: C.surface, borderRadius: '12px 12px 12px 4px', padding: 14,
                    fontSize: 14, color: C.muted, maxWidth: 320, marginBottom: 12,
                  }}>Yes, the property is still available. Would you like to arrange a viewing?</div>
                  <div style={{
                    background: 'rgba(65,206,142,0.1)', border: `1px solid rgba(65,206,142,0.2)`,
                    borderRadius: 10, padding: 14, maxWidth: 300,
                  }}>
                    <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 4 }}>DEAL POTENTIAL</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>You could earn £1,010/mo</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', gap: 8, marginTop: 16, background: C.surface,
                  borderRadius: 8, padding: 8,
                }}>
                  <input placeholder="Type your message..." style={{
                    flex: 1, background: 'transparent', border: 'none', color: C.light,
                    fontSize: 14, outline: 'none',
                  }} />
                  <Btn variant="primary" style={{ padding: '8px 16px' }}><Send size={14} /></Btn>
                </div>
              </div>
            </div>
            <style>{`@media(max-width:640px){.inbox-grid{grid-template-columns:1fr!important}}`}</style>
          </Card>
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Btn variant="primary">Start Your Pipeline <ArrowRight size={16} /></Btn>
        </div>
      </div>
    </section>
  );
}

/* ─── BOOKING SITE ─── */
function BookingSite() {
  const benefits = ['Custom domain', 'Direct bookings', 'Stripe payments', 'Guest messaging'];
  return (
    <section style={{ background: C.surface, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>BOOKING SITE BUILDER</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Your Brand. Your Bookings.</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Build a professional direct-booking website in minutes. Reduce OTA fees and own the guest relationship.</Body></motion.div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          {/* Mock browser */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
              background: C.primary, borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{
                flex: 1, background: C.darkest, borderRadius: 6, padding: '6px 14px',
                fontSize: 12, color: C.muted, marginLeft: 12,
              }}>yourbrand.nfstay.app</div>
            </div>
            <ImgPlaceholder h={280} label="Your branded booking site preview" />
          </Card>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}
        >
          {benefits.map(b => (
            <motion.div key={b} variants={fadeUp} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(65,206,142,0.08)',
              border: `1px solid rgba(65,206,142,0.15)`, borderRadius: 20, padding: '8px 16px',
              fontSize: 13, color: C.accent, fontWeight: 600,
            }}>
              <Check size={14} />{b}
            </motion.div>
          ))}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Btn variant="primary">Build Your Site <ExternalLink size={16} /></Btn>
        </div>
      </div>
    </section>
  );
}

/* ─── UNIVERSITY / ACADEMY ─── */
function Academy() {
  const modules = [
    { icon: <BookOpen size={20} />, title: 'Getting Started', lessons: 8, xp: '120 XP', desc: 'Set up your profile, understand the marketplace, and prepare your first deal search.' },
    { icon: <Search size={20} />, title: 'Property Hunting', lessons: 12, xp: '240 XP', desc: 'Learn to spot profitable deals, run revenue analysis, and filter for winners.' },
    { icon: <MessageSquare size={20} />, title: 'Landlord Pitching', lessons: 10, xp: '200 XP', desc: 'Master the scripts and strategies that get landlords to say yes.' },
  ];
  return (
    <section id="academy" style={{ background: C.darkest, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>LEARN</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>NFsTay Academy</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Level up with structured courses, XP rewards, and streaks that keep you consistent.</Body></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}
        >
          {modules.map(m => (
            <motion.div key={m.title} variants={fadeUp}>
              <Card style={{ height: '100%' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: 'rgba(65,206,142,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.accent, marginBottom: 16,
                }}>{m.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.light, marginBottom: 8 }}>{m.title}</div>
                <Body style={{ fontSize: 14, marginBottom: 16 }}>{m.desc}</Body>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{m.lessons} lessons</span>
                  <span style={{ color: C.accent, fontWeight: 600 }}>{m.xp}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
          {[
            { icon: <Flame size={18} />, label: '7-Day Streak' },
            { icon: <Trophy size={18} />, label: 'Level 4' },
            { icon: <Zap size={18} />, label: '560 XP' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 8, color: C.accent,
              background: 'rgba(65,206,142,0.06)', borderRadius: 8, padding: '10px 16px',
              fontSize: 14, fontWeight: 600,
            }}>{s.icon}{s.label}</div>
          ))}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Btn variant="primary">Start Learning <GraduationCap size={16} /></Btn>
        </div>
      </div>
    </section>
  );
}

/* ─── AGENT PROGRAMME ─── */
function AgentProgramme() {
  return (
    <section style={{ background: C.surface, padding: '80px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>REFERRAL PROGRAMME</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Earn as an Agent</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Recommend NFsTay and earn recurring commissions on every subscription and investment.</Body></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 24 }}
        >
          {[
            { value: '40%', label: 'Recurring on Subscriptions', desc: 'Earn 40% of every monthly or lifetime plan your referrals purchase.' },
            { value: '10%', label: 'On JV Investments', desc: 'Get 10% of the investment management fee from every JV deal.' },
            { value: '£3,988', label: 'From 10 Lifetime Refs', desc: 'Just ten lifetime referrals earns you nearly four thousand pounds.' },
          ].map(item => (
            <motion.div key={item.label} variants={fadeUp}>
              <Card style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.accent, marginBottom: 8 }}>{item.value}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.light, marginBottom: 8 }}>{item.label}</div>
                <Body style={{ fontSize: 14 }}>{item.desc}</Body>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Btn variant="primary">Become an Agent <UserPlus size={16} /></Btn>
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
function Pricing() {
  const plans = [
    {
      name: 'Free', price: '£0', period: 'forever', highlight: false,
      features: ['Browse 5 deals per day', 'Basic filters', 'Community access', 'Academy preview'],
    },
    {
      name: 'Pro', price: '£67', period: '/mo', highlight: false,
      features: ['Unlimited deal access', 'Full CRM and inbox', 'Airdna revenue data', 'Booking site builder', 'Priority support', 'Agent dashboard'],
    },
    {
      name: 'Lifetime', price: '£997', period: 'one-time', highlight: true,
      features: ['Everything in Pro, forever', 'Full Academy access', 'VIP deal alerts', 'White-glove onboarding', 'Lifetime updates', 'Exclusive JV deals'],
    },
  ];
  return (
    <section id="pricing" style={{ background: C.darkest, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>PRICING</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Simple, Transparent Pricing</SectionHeading></motion.div>
          <motion.div variants={fadeUp}><Body>Start free. Upgrade when you are ready to go full-time.</Body></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'stretch' }}
        >
          {plans.map(p => (
            <motion.div key={p.name} variants={fadeUp}>
              <Card style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                ...(p.highlight ? {
                  border: `2px solid ${C.accent}`,
                  boxShadow: `0 0 40px rgba(65,206,142,0.15)`,
                } : {}),
              }}>
                {p.highlight && (
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: C.darkest, background: C.accent,
                    padding: '4px 12px', borderRadius: 4, alignSelf: 'flex-start', marginBottom: 16,
                  }}>BEST VALUE</div>
                )}
                <div style={{ fontSize: 16, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{p.name}</div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: C.light }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>{p.period}</span>
                </div>
                <div style={{ flex: 1 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <CheckCircle size={16} color={C.accent} />
                      <span style={{ fontSize: 14, color: C.muted }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Btn
                  variant={p.highlight ? 'primary' : 'ghost'}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
                >
                  {p.name === 'Free' ? 'Get Started' : p.name === 'Pro' ? 'Subscribe' : 'Get Lifetime Access'}
                </Btn>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS ─── */
function Testimonials() {
  const reviews = [
    { name: 'Tom H.', location: 'Manchester', text: 'Found my first deal within a week. The Airdna data made it easy to pitch to the landlord with confidence. Already cashflowing.', rating: 5 },
    { name: 'Sarah K.', location: 'Leeds', text: 'The CRM keeps everything in one place. No more spreadsheets. I went from zero deals to three in two months on Pro.', rating: 5 },
    { name: 'Priya M.', location: 'London', text: 'The JV partnership model is brilliant. I invested in a Liverpool property and get monthly payouts without any management headaches.', rating: 5 },
  ];
  return (
    <section style={{ background: C.surface, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>TESTIMONIALS</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>What Operators Are Saying</SectionHeading></motion.div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}
        >
          {reviews.map(r => (
            <motion.div key={r.name} variants={fadeUp}>
              <Card>
                <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} size={16} fill={C.accent} color={C.accent} />
                  ))}
                </div>
                <Body style={{ fontSize: 15, marginBottom: 20, fontStyle: 'italic' }}>"{r.text}"</Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: C.surface,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.accent, fontWeight: 700, fontSize: 16,
                  }}>{r.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.light }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{r.location}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs = [
    { q: 'What is rent-to-rent?', a: 'Rent-to-rent is a strategy where you lease a property from a landlord at a fixed monthly rent and then sub-let it on platforms like Airbnb for a higher nightly rate, keeping the profit difference.' },
    { q: 'Are the deals actually verified?', a: 'Every deal on NFsTay includes Airdna revenue projections, landlord approval status, and detailed financial breakdowns so you can make informed decisions before committing.' },
    { q: 'How does the JV partnership work?', a: 'You invest from as little as £500 into a rent-to-rent property. NFsTay manages the operation and you receive monthly payouts proportional to your share ownership.' },
    { q: 'Can I cancel my Pro subscription?', a: 'Yes. You can cancel anytime from your dashboard. Your access continues until the end of your current billing period with no penalties or lock-ins.' },
    { q: 'What cities do you cover?', a: 'We currently have deals across 15 UK cities including Manchester, London, Liverpool, Leeds, Birmingham, Bristol, Edinburgh, Glasgow, and more — with new cities added regularly.' },
    { q: 'Do I need experience to get started?', a: 'Not at all. The NFsTay Academy walks you through everything from finding your first deal to pitching landlords. Many of our most successful operators started with zero experience.' },
  ];
  return (
    <section style={{ background: C.darkest, padding: '80px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div variants={fadeUp}><SectionCaption>FAQ</SectionCaption></motion.div>
          <motion.div variants={fadeUp}><SectionHeading>Frequently Asked Questions</SectionHeading></motion.div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          {faqs.map((f, i) => (
            <motion.div key={i} variants={fadeUp} style={{
              borderBottom: `1px solid ${C.border}`,
            }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: C.light, paddingRight: 16 }}>{f.q}</span>
                <ChevronDown
                  size={18} color={C.muted}
                  style={{ transform: openIdx === i ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}
                />
              </button>
              <AnimatePresence>
                {openIdx === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <Body style={{ paddingBottom: 20 }}>{f.a}</Body>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCta() {
  return (
    <section style={{
      background: `linear-gradient(180deg, ${C.surface} 0%, ${C.darkest} 100%)`,
      padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(65,206,142,0.08) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
        <motion.div variants={fadeUp}><SectionCaption>GET STARTED TODAY</SectionCaption></motion.div>
        <motion.div variants={fadeUp}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: C.light, lineHeight: '120%', marginBottom: 16 }}>
            Ready to find your first deal?
          </h2>
        </motion.div>
        <motion.div variants={fadeUp}><Body style={{ marginBottom: 32 }}>Join hundreds of rent-to-rent operators already using NFsTay to build their property portfolios.</Body></motion.div>
        <motion.div variants={fadeUp}>
          <Btn variant="primary" style={{ padding: '16px 32px', fontSize: 16 }}>
            Browse Live Deals <ArrowRight size={18} />
          </Btn>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  const cols = [
    { title: 'Product', links: ['Deals', 'Invest', 'CRM', 'Booking Sites', 'Academy'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
    { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
    { title: 'Support', links: ['Help Centre', 'Community', 'Status', 'Changelog'] },
  ];
  return (
    <footer style={{ background: C.darkest, borderTop: `1px solid ${C.border}`, padding: '64px 24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: 40, marginBottom: 48,
        }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.light }}>
              NFs<span style={{ color: C.accent }}>Tay</span>
            </span>
            <Body style={{ fontSize: 13, marginTop: 12 }}>
              The UK's rent-to-rent marketplace. Find deals, invest, and grow your property portfolio.
            </Body>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.light, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>{c.title}</div>
              {c.links.map(l => (
                <a key={l} href="#" style={{
                  display: 'block', fontSize: 14, color: C.muted, textDecoration: 'none',
                  marginBottom: 10, transition: 'color 200ms',
                }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: C.muted }}>2026 NFsTay. All rights reserved.</span>
          <span style={{ fontSize: 13, color: C.muted }}>London, United Kingdom</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── MAIN COMPONENT ─── */
export default function Variant12() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: C.darkest, minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}a:hover{color:${C.accent}!important}button:hover{opacity:0.9}`}</style>
      <Navbar />
      <Hero />
      <Deals />
      <HowItWorks />
      <Invest />
      <CrmInbox />
      <BookingSite />
      <Academy />
      <AgentProgramme />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCta />
      <Footer />
    </div>
  );
}
