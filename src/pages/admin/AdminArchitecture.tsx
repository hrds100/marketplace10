export default function AdminArchitecture() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e0e0e0] -m-6 -mt-6 p-10" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h1 className="text-center text-[28px] font-bold text-white mb-2">NFStay Platform Architecture</h1>
      <p className="text-center text-sm text-[#888] mb-12">One repo, one database, one signup — three products</p>

      {/* Three Apps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto mb-12">
        {/* Marketplace */}
        <div className="rounded-2xl p-7 relative overflow-hidden bg-[#111827] border border-[#1e3a5f]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3b82f6] to-[#60a5fa]" />
          <div className="text-[32px] mb-3">🏠</div>
          <div className="text-xl font-bold mb-1">Marketplace</div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#1e3a5f] text-[#60a5fa] inline-block mb-4">hub.nfstay.com</span>
          <p className="text-[13px] text-[#999] mb-5 leading-relaxed">UK rent-to-rent property marketplace. Landlords list deals, agents browse, CRM, inbox, university.</p>
          <Section title="Key Features" tags={['Deal listings', 'CRM', 'Inbox / Chat', 'University']} highlightTags={['Deal listings', 'CRM', 'Inbox / Chat', 'University']} highlightClass="bg-[rgba(59,130,246,0.15)] text-[#93c5fd]" extraTags={['Admin panel', 'Affiliates']} />
          <Section title="Integrations" tags={['GoHighLevel', 'Resend', 'WhatsApp', 'Google Maps', 'Pexels']} />
          <Section title="Code" tags={['src/pages/', 'src/components/', 'src/hooks/']} />
          <StatusBadge status="live" />
        </div>

        {/* Invest */}
        <div className="rounded-2xl p-7 relative overflow-hidden bg-[#1a1412] border border-[#5c3a1e]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]" />
          <div className="text-[32px] mb-3">⛓️</div>
          <div className="text-xl font-bold mb-1">Invest</div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#5c3a1e] text-[#fbbf24] inline-block mb-4">hub.nfstay.com/invest/*</span>
          <p className="text-[13px] text-[#999] mb-5 leading-relaxed">Tokenized real estate. Buy fractional shares on BNB Chain, earn rent, vote on governance, boost APR.</p>
          <Section title="Key Features" tags={['Buy shares', 'Claim rent', 'Vote', 'Boost APR']} highlightTags={['Buy shares', 'Claim rent', 'Vote', 'Boost APR']} highlightClass="bg-[rgba(245,158,11,0.15)] text-[#fcd34d]" extraTags={['Portfolio', 'Payouts']} />
          <Section title="Blockchain" tags={['BNB Chain', 'Particle Wallet', 'USDC', 'STAY Token', 'The Graph', 'Revolut']} />
          <Section title="Smart Contracts" tags={['RWA Marketplace', 'RWA Token', 'Voting', 'Rent', 'Booster']} />
          <Section title="Code" tags={['src/pages/invest/', 'useBlockchain.ts', 'useInvestData.ts']} />
          <StatusBadge status="live" />
        </div>

        {/* Booking */}
        <div className="rounded-2xl p-7 relative overflow-hidden bg-[#0f1a14] border border-[#1e5c3a]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#10b981] to-[#34d399]" />
          <div className="text-[32px] mb-3">🏨</div>
          <div className="text-xl font-bold mb-1">Booking</div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#1e5c3a] text-[#34d399] inline-block mb-4">nfstay.app</span>
          <p className="text-[13px] text-[#999] mb-5 leading-relaxed">Short-term rental booking. Operators list properties, travelers search & book, Stripe payments, Airbnb sync.</p>
          <Section title="Key Features" tags={['Operator dashboard', 'Traveler search', 'Reservations', 'White-label']} highlightTags={['Operator dashboard', 'Traveler search', 'Reservations', 'White-label']} highlightClass="bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]" extraTags={['Onboarding', 'Analytics']} />
          <Section title="Integrations" tags={['Stripe', 'Hospitable', 'iCal', 'Google Maps', 'Cloudflare', 'Resend']} />
          <Section title="Code" tags={['src/pages/nfstay/', 'src/components/nfstay/', 'src/hooks/nfstay/']} />
          <StatusBadge status="branch" />
        </div>
      </div>

      {/* Connector Lines */}
      <div className="max-w-[1100px] mx-auto">
        <svg width="100%" height="48" viewBox="0 0 1100 48" preserveAspectRatio="none">
          <path d="M 183 0 L 183 24 L 550 24 L 550 48" stroke="#2a2a4a" strokeWidth="2" fill="none" />
          <path d="M 550 0 L 550 48" stroke="#2a2a4a" strokeWidth="2" fill="none" />
          <path d="M 917 0 L 917 24 L 550 24 L 550 48" stroke="#2a2a4a" strokeWidth="2" fill="none" />
          <circle cx="550" cy="24" r="4" fill="#8b5cf6" />
        </svg>

        {/* Shared Layer */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#2a2a4a] rounded-2xl p-8 max-w-[520px] mx-auto">
          <div className="text-sm font-bold text-white mb-1 text-center">Where They Meet</div>
          <div className="text-[11px] text-[#666] text-center mb-5">Shared infrastructure — the building's foundation</div>
          <div className="grid grid-cols-2 gap-2.5">
            <SharedItem icon="🔐" text="Supabase Auth" sub="One signup for all 3 apps" />
            <SharedItem icon="👤" text="profiles table" sub="Shared identity" />
            <SharedItem icon="🔀" text="middleware.ts" sub="Routes traffic by domain" />
            <SharedItem icon="📱" text="App.tsx" sub="All routes registered here" />
            <SharedItem icon="🎨" text="components/ui/" sub="Shared design system" />
            <SharedItem icon="🔔" text="notifications table" sub="All apps insert here" />
          </div>
        </div>
      </div>

      {/* User Flow */}
      <div className="max-w-[1100px] mx-auto mt-12 text-center">
        <div className="text-sm font-bold text-white mb-4">User Journey — One Signup, Three Products</div>
        <div className="flex items-center justify-center gap-0 flex-wrap">
          <FlowStep className="bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.3)]">Sign up</FlowStep>
          <span className="text-[#444] text-xl px-2">→</span>
          <FlowStep className="bg-[rgba(59,130,246,0.15)] text-[#93c5fd] border-[rgba(59,130,246,0.3)]">OTP verify</FlowStep>
          <span className="text-[#444] text-xl px-2">→</span>
          <FlowStep className="bg-[rgba(245,158,11,0.15)] text-[#fcd34d] border-[rgba(245,158,11,0.3)]">Wallet created</FlowStep>
          <span className="text-[#444] text-xl px-2">→</span>
          <FlowStep className="bg-[rgba(16,185,129,0.15)] text-[#6ee7b7] border-[rgba(16,185,129,0.3)]">Use any app</FlowStep>
        </div>
      </div>

      {/* Database Isolation */}
      <div className="max-w-[1100px] mx-auto mt-12">
        <div className="text-sm font-bold text-white mb-4 text-center">Database Isolation — Same Supabase, Separate Tables</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DbGroup title="Marketplace tables" color="blue" tables={['properties', 'crm_deals', 'chat_threads', 'chat_messages', 'modules / lessons', 'inquiries', 'landlord_invites']} />
          <DbGroup title="Invest tables (inv_*)" color="amber" tables={['inv_properties', 'inv_orders', 'inv_shareholdings', 'inv_payouts', 'inv_proposals', 'aff_profiles', 'aff_commissions']} />
          <DbGroup title="Booking tables (nfs_*)" color="green" tables={['nfs_operators', 'nfs_properties', 'nfs_reservations', 'nfs_stripe_accounts', 'nfs_hospitable_connections', 'nfs_promo_codes', 'nfs_analytics']} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, tags, highlightTags, highlightClass, extraTags }: {
  title: string;
  tags: string[];
  highlightTags?: string[];
  highlightClass?: string;
  extraTags?: string[];
}) {
  const allTags = [...tags, ...(extraTags || [])];
  return (
    <div className="mb-3.5">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[#666] mb-1.5 font-semibold">{title}</div>
      <div className="flex flex-wrap gap-1">
        {allTags.map(t => (
          <span key={t} className={`text-[11px] px-2 py-0.5 rounded ${highlightTags?.includes(t) && highlightClass ? highlightClass : 'bg-white/[0.06] text-[#bbb]'}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'live' | 'branch' }) {
  const isLive = status === 'live';
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mt-3 ${isLive ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
      <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]' : 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]'}`} />
      {isLive ? 'Live' : 'Built — not deployed'}
    </div>
  );
}

function SharedItem({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
      <div className="text-xl shrink-0">{icon}</div>
      <div>
        <div className="text-xs font-medium text-[#ccc]">{text}</div>
        <div className="text-[10px] text-[#666]">{sub}</div>
      </div>
    </div>
  );
}

function FlowStep({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`px-5 py-3 rounded-xl text-[13px] font-medium border ${className}`}>
      {children}
    </div>
  );
}

function DbGroup({ title, color, tables }: { title: string; color: 'blue' | 'amber' | 'green'; tables: string[] }) {
  const styles = {
    blue: { bg: 'bg-[rgba(59,130,246,0.08)]', border: 'border-[rgba(59,130,246,0.2)]', title: 'text-[#60a5fa]' },
    amber: { bg: 'bg-[rgba(245,158,11,0.08)]', border: 'border-[rgba(245,158,11,0.2)]', title: 'text-[#fbbf24]' },
    green: { bg: 'bg-[rgba(16,185,129,0.08)]', border: 'border-[rgba(16,185,129,0.2)]', title: 'text-[#34d399]' },
  }[color];
  return (
    <div className={`rounded-xl p-4 ${styles.bg} border ${styles.border}`}>
      <div className={`text-[11px] font-bold uppercase tracking-[1px] mb-2.5 ${styles.title}`}>{title}</div>
      {tables.map(t => (
        <div key={t} className="text-[11px] font-mono text-[#999] py-0.5">{t}</div>
      ))}
    </div>
  );
}
