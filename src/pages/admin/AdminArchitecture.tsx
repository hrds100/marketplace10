import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SystemHealthTab from "@/components/admin/SystemHealthTab";
import TestMonitorTab from "@/components/admin/TestMonitorTab";

export default function AdminArchitecture() {
  return (
    <div data-feature="ADMIN">
      <h1 className="text-[28px] font-bold text-foreground mb-1">nfstay Platform Architecture</h1>
      <p className="text-sm text-muted-foreground mb-8">One repo, one database, one signup — three products</p>

      <Tabs defaultValue="health" className="mb-8">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="tests">Test Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <SystemHealthTab />
        </TabsContent>

        <TabsContent value="tests">
          <TestMonitorTab />
        </TabsContent>

        <TabsContent value="architecture">

      {/* Three Apps */}
      <div data-feature="ADMIN__ARCHITECTURE_DIAGRAM" className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {/* Marketplace */}
        <div data-feature="ADMIN__ARCH_MARKETPLACE" className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-emerald-400" />
          <div className="p-6">
            <div className="text-2xl mb-2">🏠</div>
            <h2 className="text-lg font-bold text-foreground mb-0.5">Marketplace</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary inline-block mb-3">hub.nfstay.com</span>
            <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">UK rent-to-rent property marketplace. Landlords list deals, agents browse, CRM, inbox, university.</p>
            <TagSection title="Key Features" tags={['Deal listings', 'CRM', 'Inbox / Chat', 'University']} highlight="primary" extraTags={['Admin panel', 'Affiliates']} />
            <TagSection title="Integrations" tags={['GoHighLevel', 'Resend', 'WhatsApp', 'Google Maps', 'Pexels']} />
            <TagSection title="Code" tags={['src/pages/', 'src/components/', 'src/hooks/']} />
            <StatusBadge status="live" />
          </div>
        </div>

        {/* Invest */}
        <div data-feature="ADMIN__ARCH_INVEST" className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="p-6">
            <div className="text-2xl mb-2">⛓️</div>
            <h2 className="text-lg font-bold text-foreground mb-0.5">Invest</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 inline-block mb-3">hub.nfstay.com/invest/*</span>
            <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">Tokenized real estate. Buy fractional shares on BNB Chain, earn rent, vote on governance, boost APR.</p>
            <TagSection title="Key Features" tags={['Buy shares', 'Claim rent', 'Vote', 'Boost APR']} highlight="amber" extraTags={['Portfolio', 'Payouts']} />
            <TagSection title="Blockchain" tags={['BNB Chain', 'Particle Wallet', 'USDC', 'STAY Token', 'The Graph', 'Revolut']} />
            <TagSection title="Smart Contracts" tags={['RWA Marketplace', 'RWA Token', 'Voting', 'Rent', 'Booster']} />
            <TagSection title="Code" tags={['src/pages/invest/', 'useBlockchain.ts', 'useInvestData.ts']} />
            <StatusBadge status="live" />
          </div>
        </div>

        {/* Booking */}
        <div data-feature="ADMIN__ARCH_NFSTAY" className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
          <div className="p-6">
            <div className="text-2xl mb-2">🏨</div>
            <h2 className="text-lg font-bold text-foreground mb-0.5">Booking</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 inline-block mb-3">nfstay.app</span>
            <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">Short-term rental booking. Operators list properties, travelers search & book, Stripe payments, Airbnb sync.</p>
            <TagSection title="Key Features" tags={['Operator dashboard', 'Traveler search', 'Reservations', 'White-label']} highlight="blue" extraTags={['Onboarding', 'Analytics']} />
            <TagSection title="Integrations" tags={['Stripe', 'Hospitable', 'iCal', 'Google Maps', 'Cloudflare', 'Resend']} />
            <TagSection title="Code" tags={['src/pages/nfstay/', 'src/components/nfstay/', 'src/hooks/nfstay/']} />
            <StatusBadge status="branch" />
          </div>
        </div>
      </div>

      {/* Shared Infrastructure */}
      <div data-feature="ADMIN__ARCH_INTEGRATIONS" className="bg-card rounded-2xl border border-border p-6 max-w-[560px] mx-auto mb-10">
        <h3 className="text-sm font-bold text-foreground mb-0.5 text-center">Where They Meet</h3>
        <p className="text-[11px] text-muted-foreground text-center mb-5">Shared infrastructure — the building's foundation</p>
        <div className="grid grid-cols-2 gap-2.5">
          <SharedItem icon="🔐" text="Supabase Auth" sub="One signup for all 3 apps" />
          <SharedItem icon="👤" text="profiles table" sub="Shared identity" />
          <SharedItem icon="🔀" text="middleware.ts" sub="Routes traffic by domain" />
          <SharedItem icon="📱" text="App.tsx" sub="All routes registered here" />
          <SharedItem icon="🎨" text="components/ui/" sub="Shared design system" />
          <SharedItem icon="🔔" text="notifications table" sub="All apps insert here" />
        </div>
      </div>

      {/* User Flow */}
      <div className="text-center mb-10">
        <h3 className="text-sm font-bold text-foreground mb-4">User Journey — One Signup, Three Products</h3>
        <div className="flex items-center justify-center gap-0 flex-wrap">
          <FlowStep className="bg-violet-50 text-violet-700 border-violet-200">Sign up</FlowStep>
          <span className="text-muted-foreground text-lg px-2">→</span>
          <FlowStep className="bg-blue-50 text-blue-700 border-blue-200">OTP verify</FlowStep>
          <span className="text-muted-foreground text-lg px-2">→</span>
          <FlowStep className="bg-amber-50 text-amber-700 border-amber-200">Wallet created</FlowStep>
          <span className="text-muted-foreground text-lg px-2">→</span>
          <FlowStep className="bg-emerald-50 text-emerald-700 border-emerald-200">Use any app</FlowStep>
        </div>
      </div>

      {/* Database Isolation */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4 text-center">Database Isolation — Same Supabase, Separate Tables</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DbGroup title="Marketplace tables" color="primary" tables={['properties', 'crm_deals', 'chat_threads', 'chat_messages', 'modules / lessons', 'inquiries', 'landlord_invites']} />
          <DbGroup title="Invest tables (inv_*)" color="amber" tables={['inv_properties', 'inv_orders', 'inv_shareholdings', 'inv_payouts', 'inv_proposals', 'aff_profiles', 'aff_commissions']} />
          <DbGroup title="Booking tables (nfs_*)" color="blue" tables={['nfs_operators', 'nfs_properties', 'nfs_reservations', 'nfs_stripe_accounts', 'nfs_hospitable_connections', 'nfs_promo_codes', 'nfs_analytics']} />
        </div>
      </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}

function TagSection({ title, tags, highlight, extraTags }: {
  title: string;
  tags: string[];
  highlight?: 'primary' | 'amber' | 'blue';
  extraTags?: string[];
}) {
  const highlightStyles = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-600',
    blue: 'bg-blue-500/10 text-blue-600',
  };
  const allTags = [...tags, ...(extraTags || [])];
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground mb-1.5 font-semibold">{title}</div>
      <div className="flex flex-wrap gap-1">
        {allTags.map(t => (
          <span
            key={t}
            className={`text-[11px] px-2 py-0.5 rounded ${
              highlight && tags.includes(t)
                ? highlightStyles[highlight]
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'live' | 'branch' }) {
  const isLive = status === 'live';
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold mt-2 ${isLive ? 'text-emerald-600' : 'text-amber-600'}`}>
      <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {isLive ? 'Live' : 'Built — not deployed'}
    </div>
  );
}

function SharedItem({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-secondary/50 rounded-xl border border-border">
      <div className="text-xl shrink-0">{icon}</div>
      <div>
        <div className="text-xs font-medium text-foreground">{text}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function FlowStep({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`px-5 py-3 rounded-xl text-[13px] font-semibold border ${className}`}>
      {children}
    </div>
  );
}

function DbGroup({ title, color, tables }: { title: string; color: 'primary' | 'amber' | 'blue'; tables: string[] }) {
  const styles = {
    primary: { bg: 'bg-primary/5', border: 'border-primary/20', title: 'text-primary' },
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', title: 'text-amber-600' },
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', title: 'text-blue-600' },
  }[color];
  return (
    <div className={`rounded-xl p-4 ${styles.bg} border ${styles.border}`}>
      <div className={`text-[11px] font-bold uppercase tracking-[1px] mb-2.5 ${styles.title}`}>{title}</div>
      {tables.map(t => (
        <div key={t} className="text-[11px] font-mono text-muted-foreground py-0.5">{t}</div>
      ))}
    </div>
  );
}
