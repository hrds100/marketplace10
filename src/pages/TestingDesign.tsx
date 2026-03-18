import { useState } from 'react';
import { Gem, TrendingUp, ArrowRight, Sparkles, Shield, Star, Zap, Crown, Lock, ChevronRight } from 'lucide-react';

const PROPERTY = {
  image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
  name: '3-Bed Terrace, Northern Quarter',
  city: 'Manchester',
  postcode: 'M4 5JD',
  rent: 1450,
  profit: 680,
  type: 'Terraced House',
  daysAgo: 3,
  returns: '12.4%',
  funded: 64,
  minContribution: 500,
  target: 45000,
};

const PROPERTY2 = {
  image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80',
  name: '2-Bed Apartment, City Centre',
  city: 'Leeds',
  postcode: 'LS1 4AP',
  rent: 1200,
  profit: 520,
  type: 'Apartment',
  daysAgo: 5,
  returns: '9.8%',
  funded: 42,
  minContribution: 250,
  target: 32000,
};

// ─── SHARED STYLES ──────────────────────────────────
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 12px rgba(191,149,63,0.15); }
  50% { box-shadow: 0 0 24px rgba(191,149,63,0.35), 0 0 48px rgba(191,149,63,0.1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes border-glow {
  0%, 100% { border-color: #C9A842; }
  50% { border-color: #F0D55E; }
}
`;

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-[7px] border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-[13px] font-medium ${gold ? 'font-bold' : 'text-foreground'}`} style={gold ? { color: '#A67C00' } : undefined}>{value}</span>
    </div>
  );
}

function ProgressBar({ percent, gold }: { percent: number; gold?: boolean }) {
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${percent}%`,
          background: gold ? 'linear-gradient(90deg, #BF953F, #F0D55E, #BF953F)' : 'linear-gradient(90deg, #10b981, #14b8a6)',
        }}
      />
    </div>
  );
}

// ─── CARD 1: Classic Gold ───────────────────────────
function Card1() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border-[1.5px]" style={{ borderColor: '#C9A842', boxShadow: '0 0 16px rgba(191,149,63,0.18)' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-md" style={{ background: 'linear-gradient(135deg, #FDF5D6, #F5E6A3, #E8D478)', color: '#8B6914', border: '1px solid #C9A842' }}>
            <Gem className="w-3 h-3" /> Joint Venture
          </span>
        </div>
      </div>
      <div className="p-3.5 pt-3">
        <h3 className="text-[15px] font-bold text-foreground">{PROPERTY.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY.city} · {PROPERTY.postcode}</p>
        <div className="mt-3">
          <Row label="Monthly rent" value={`£${PROPERTY.rent.toLocaleString()}/mo`} />
          <Row label="Est. profit" value={`£${PROPERTY.profit}/mo`} gold />
          <Row label="Est. Returns" value={PROPERTY.returns} gold />
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 text-white shadow-sm h-[38px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center hover:opacity-90" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
            Partner Now
          </button>
          <button className="flex-1 h-[38px] rounded-lg text-[13px] font-medium hover:bg-amber-50/40" style={{ border: '1px solid #C9A842', color: '#8B6914' }}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD 2: Dark + Gold (Premium) ──────────────────
function Card2() {
  return (
    <div className="rounded-2xl overflow-hidden border-[1.5px]" style={{ borderColor: '#C9A842', background: '#1A1A2E', boxShadow: '0 0 20px rgba(191,149,63,0.2)' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#1A1A2E' }}>
            💎 Joint Venture
          </span>
        </div>
        <div className="absolute bottom-3 left-3.5 right-3.5">
          <h3 className="text-[15px] font-bold text-white">{PROPERTY.name}</h3>
          <p className="text-[13px] text-white/60">{PROPERTY.city} · {PROPERTY.postcode}</p>
        </div>
      </div>
      <div className="p-3.5">
        <div className="space-y-0">
          <div className="flex justify-between py-[7px] border-b border-white/10">
            <span className="text-xs text-white/50">Monthly rent</span>
            <span className="text-[13px] font-medium text-white">£{PROPERTY.rent.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between py-[7px] border-b border-white/10">
            <span className="text-xs text-white/50">Est. profit</span>
            <span className="text-[13px] font-bold" style={{ color: '#F0D55E' }}>£{PROPERTY.profit}/mo</span>
          </div>
          <div className="flex justify-between py-[7px]">
            <span className="text-xs text-white/50">Est. Returns</span>
            <span className="text-[13px] font-bold" style={{ color: '#F0D55E' }}>{PROPERTY.returns}</span>
          </div>
        </div>
        <button className="w-full mt-3 text-[#1A1A2E] shadow-lg h-[40px] rounded-lg text-[13px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)' }}>
          <Gem className="w-3.5 h-3.5" /> Partner Now
        </button>
      </div>
    </div>
  );
}

// ─── CARD 3: Pulse Glow ─────────────────────────────
function Card3() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border-[1.5px]" style={{ borderColor: '#C9A842', animation: 'pulse-gold 3s ease-in-out infinite' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY2.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-md" style={{ background: 'linear-gradient(135deg, #FDF5D6, #E8D478)', color: '#8B6914', border: '1px solid #C9A842' }}>
            <Sparkles className="w-3 h-3" /> Joint Venture
          </span>
        </div>
      </div>
      <div className="p-3.5 pt-3">
        <h3 className="text-[15px] font-bold text-foreground">{PROPERTY2.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY2.city}</p>
        <div className="mt-3">
          <Row label="Monthly rent" value={`£${PROPERTY2.rent.toLocaleString()}/mo`} />
          <Row label="Est. profit" value={`£${PROPERTY2.profit}/mo`} gold />
          <Row label="Est. Returns" value={PROPERTY2.returns} gold />
        </div>
        <button className="w-full mt-3 text-white h-[40px] rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
          Start Partnership <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── CARD 4: Floating + Shimmer Button ──────────────
function Card4() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border-[1.5px]" style={{ borderColor: '#C9A842', boxShadow: '0 4px 24px rgba(191,149,63,0.15)', animation: 'float 4s ease-in-out infinite' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: '#1A1A2E', color: '#F0D55E', border: '1px solid #C9A842' }}>
            💎 Exclusive JV
          </span>
        </div>
        <div className="absolute bottom-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'rgba(191,149,63,0.9)' }}>
            {PROPERTY.funded}% funded
          </span>
        </div>
      </div>
      <div className="p-3.5 pt-3">
        <h3 className="text-[15px] font-bold text-foreground">{PROPERTY.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY.city}</p>
        <div className="mt-2 mb-2">
          <ProgressBar percent={PROPERTY.funded} gold />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{PROPERTY.funded}% funded</span>
            <span className="text-[10px] font-medium" style={{ color: '#A67C00' }}>Target: £{PROPERTY.target.toLocaleString()}</span>
          </div>
        </div>
        <Row label="Min. contribution" value={`£${PROPERTY.minContribution}`} gold />
        <Row label="Est. Returns" value={PROPERTY.returns} gold />
        <button
          className="w-full mt-3 text-white h-[42px] rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-95"
          style={{ background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #BF953F)', backgroundSize: '200% 100%', animation: 'shimmer 3s ease-in-out infinite', color: '#5C4000' }}
        >
          Partner Now <Zap className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── CARD 5: Returns Focus ─────────────
function Card5() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <div className="relative h-[180px] overflow-hidden">
        <img src={PROPERTY2.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3.5">
          <span className="text-[28px] font-extrabold text-white">{PROPERTY2.returns}</span>
          <p className="text-[11px] text-white/70 -mt-0.5">Est. Annual Returns</p>
        </div>
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'linear-gradient(135deg, #FDF5D6, #E8D478)', color: '#8B6914' }}>
            💎 JV Opportunity
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="text-[15px] font-bold text-foreground">{PROPERTY2.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY2.city} · Min £{PROPERTY2.minContribution}</p>
        <div className="mt-2">
          <ProgressBar percent={PROPERTY2.funded} gold />
          <p className="text-[10px] text-muted-foreground mt-1">{PROPERTY2.funded}% funded — £{PROPERTY2.target.toLocaleString()} target</p>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 h-[38px] rounded-lg text-[13px] font-semibold text-white inline-flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90">
            Partner from £{PROPERTY2.minContribution}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD 6: Minimal Luxury ─────────────────────────
function Card6() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg" style={{ border: '2px solid transparent', backgroundClip: 'padding-box', outline: '2px solid #C9A842', outlineOffset: '-2px' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4" style={{ color: '#BF953F' }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#BF953F' }}>Joint Venture</span>
        </div>
        <h3 className="text-[16px] font-bold text-foreground">{PROPERTY.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY.city}</p>
        <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
          <div className="text-center">
            <div className="text-[18px] font-extrabold" style={{ color: '#A67C00' }}>{PROPERTY.returns}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Returns</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-[18px] font-extrabold text-foreground">£{PROPERTY.profit}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Profit/mo</div>
          </div>
          <div className="text-center">
            <div className="text-[18px] font-extrabold text-foreground">£{PROPERTY.minContribution}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Min. contribution</div>
          </div>
        </div>
        <button className="w-full h-[42px] rounded-lg text-[13px] font-bold inline-flex items-center justify-center gap-1.5 text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
          Hands-Off Partnership <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── CARD 7: Dark Glass ─────────────────────────────
function Card7() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '1px solid rgba(191,149,63,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <div className="relative h-[180px] overflow-hidden">
        <img src={PROPERTY2.image} className="w-full h-full object-cover opacity-80" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1a1a2e]" />
        <div className="absolute top-3 right-3">
          <span className="text-[24px] font-black text-white">{PROPERTY2.returns}</span>
          <p className="text-[9px] text-white/50 text-right uppercase tracking-wider">Annual Return</p>
        </div>
      </div>
      <div className="p-4 -mt-4 relative z-10">
        <div className="flex items-center gap-1.5 mb-2">
          <Gem className="w-3.5 h-3.5" style={{ color: '#F0D55E' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#F0D55E' }}>Joint Venture</span>
        </div>
        <h3 className="text-[15px] font-bold text-white">{PROPERTY2.name}</h3>
        <p className="text-[12px] text-white/40 mt-0.5">{PROPERTY2.city} · {PROPERTY2.type}</p>
        <div className="mt-3 space-y-0">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-[11px] text-white/40">Monthly profit</span>
            <span className="text-[13px] font-bold" style={{ color: '#F0D55E' }}>£{PROPERTY2.profit}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[11px] text-white/40">Min. invest</span>
            <span className="text-[13px] font-semibold text-white">£{PROPERTY2.minContribution}</span>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar percent={PROPERTY2.funded} gold />
          <p className="text-[9px] text-white/30 mt-1">{PROPERTY2.funded}% funded</p>
        </div>
        <button className="w-full mt-3 h-[40px] rounded-lg text-[13px] font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#1a1a2e' }}>
          Partner Now <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── CARD 8: Split Layout (Gold bar) ────────────────
function Card8() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-md">
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #B38728, #FCF6BA, #BF953F)' }} />
      <div className="relative h-[190px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-[11px] font-semibold text-white">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Joint Venture
          </span>
        </div>
      </div>
      <div className="p-3.5 pt-3">
        <h3 className="text-[15px] font-bold text-foreground">{PROPERTY.name}</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY.city}</p>
        <div className="flex items-center gap-4 mt-3 py-3 px-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #FDF5D6, #FBF1C7)' }}>
          <div>
            <div className="text-[20px] font-extrabold" style={{ color: '#8B6914' }}>{PROPERTY.returns}</div>
            <div className="text-[9px] text-muted-foreground">Est. Returns</div>
          </div>
          <div className="w-px h-8" style={{ background: '#D4AC2B' }} />
          <div>
            <div className="text-[20px] font-extrabold" style={{ color: '#8B6914' }}>£{PROPERTY.profit}</div>
            <div className="text-[9px] text-muted-foreground">Monthly profit</div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 h-[38px] rounded-lg text-[13px] font-bold text-white inline-flex items-center justify-center gap-1.5 hover:opacity-90" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
            Join This Deal
          </button>
          <button className="flex-1 h-[38px] rounded-lg text-[13px] font-medium border border-border text-foreground hover:bg-secondary">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD 9: Gradient Border + Secure Badge ─────────
function Card9() {
  return (
    <div className="relative rounded-2xl p-[2px]" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FCF6BA, #AA771C)' }}>
      <div className="bg-card rounded-[14px] overflow-hidden">
        <div className="relative h-[200px] overflow-hidden">
          <img src={PROPERTY2.image} className="w-full h-full object-cover" alt="" />
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 rounded-full text-[11px] font-semibold shadow-sm" style={{ color: '#8B6914' }}>
              <Shield className="w-3 h-3" /> Secured Partnership
            </span>
          </div>
        </div>
        <div className="p-3.5 pt-3">
          <h3 className="text-[15px] font-bold text-foreground">{PROPERTY2.name}</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">{PROPERTY2.city}</p>
          <div className="mt-3">
            <Row label="Monthly profit" value={`£${PROPERTY2.profit}/mo`} gold />
            <Row label="Est. Returns" value={PROPERTY2.returns} gold />
            <Row label="Min. contribution" value={`£${PROPERTY2.minContribution}`} />
          </div>
          <div className="mt-2">
            <ProgressBar percent={PROPERTY2.funded} gold />
            <p className="text-[10px] text-muted-foreground mt-1">{PROPERTY2.funded}% funded</p>
          </div>
          <button className="w-full mt-3 h-[40px] rounded-lg text-[13px] font-bold text-white inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:opacity-90 shadow-md">
            <Lock className="w-3.5 h-3.5" /> Secure Your Spot
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD 10: Animated Border Glow ──────────────────
function Card10() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border-2" style={{ animation: 'border-glow 2.5s ease-in-out infinite', borderColor: '#C9A842', boxShadow: '0 0 20px rgba(191,149,63,0.12)' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3.5 right-3.5 flex justify-between items-end">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#1A1A2E' }}>
              💎 JOINT VENTURE
            </span>
            <h3 className="text-[15px] font-bold text-white mt-1">{PROPERTY.name}</h3>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-black text-white">{PROPERTY.returns}</div>
            <div className="text-[9px] text-white/60">Returns</div>
          </div>
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-xs text-muted-foreground">Monthly profit</span>
          <span className="text-[14px] font-bold" style={{ color: '#A67C00' }}>£{PROPERTY.profit}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-muted-foreground">Partner from</span>
          <span className="text-[14px] font-bold text-foreground">£{PROPERTY.minContribution}</span>
        </div>
        <div className="mt-1">
          <ProgressBar percent={PROPERTY.funded} gold />
          <p className="text-[10px] text-muted-foreground mt-1">{PROPERTY.funded}% funded — limited spots</p>
        </div>
        <button className="w-full mt-3 h-[42px] rounded-lg text-[14px] font-bold inline-flex items-center justify-center gap-1.5 text-white hover:opacity-90 shadow-lg" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
          Partner Now <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── CARD 11: White Clean + Gold Accent ─────────────
function Card11() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY2.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#3D2E00' }}>
            <Gem className="w-3.5 h-3.5" /> JOINT VENTURE
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-[16px] font-bold text-gray-900">{PROPERTY2.name}</h3>
        <p className="text-[13px] text-gray-500 mt-0.5">{PROPERTY2.city} · {PROPERTY2.type}</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-3" style={{ background: '#FDF8E8' }}>
            <div className="text-[20px] font-extrabold" style={{ color: '#8B6914' }}>{PROPERTY2.returns}</div>
            <div className="text-[10px] text-gray-500">Est. Returns</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#FDF8E8' }}>
            <div className="text-[20px] font-extrabold" style={{ color: '#8B6914' }}>£{PROPERTY2.profit}</div>
            <div className="text-[10px] text-gray-500">Monthly Profit</div>
          </div>
        </div>
        <button className="w-full mt-4 h-[44px] rounded-xl text-[14px] font-bold text-white inline-flex items-center justify-center gap-2 hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
          Start Partnership Today <TrendingUp className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-center text-gray-400 mt-2">From £{PROPERTY2.minContribution} · {PROPERTY2.funded}% funded</p>
      </div>
    </div>
  );
}

// ─── CARD 12: Compact Urgency ───────────────────────
function Card12() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border-[1.5px]" style={{ borderColor: '#C9A842' }}>
      <div className="relative h-[200px] overflow-hidden">
        <img src={PROPERTY.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute top-0 left-0 right-0 py-1.5 text-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(90deg, #BF953F, #F0D55E, #BF953F)' }}>
          🔥 Limited — Only {100 - PROPERTY.funded}% remaining
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Gem className="w-3.5 h-3.5" style={{ color: '#BF953F' }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#BF953F' }}>Joint Venture</span>
        </div>
        <h3 className="text-[15px] font-bold text-foreground">{PROPERTY.name}</h3>
        <p className="text-[13px] text-muted-foreground">{PROPERTY.city}</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-[22px] font-black" style={{ color: '#8B6914' }}>{PROPERTY.returns}</div>
            <div className="text-[9px] text-muted-foreground">Est. Returns</div>
          </div>
          <button className="h-[40px] px-6 rounded-lg text-[13px] font-bold text-white inline-flex items-center gap-1.5 hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg, #BF953F, #D4AC2B, #F0D55E, #D4AC2B, #BF953F)' }}>
            Partner <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────
export default function TestingDesign() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="min-h-screen bg-[hsl(210,20%,96%)] py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-[28px] font-bold text-foreground mb-2">Joint Venture Card Designs</h1>
          <p className="text-sm text-muted-foreground mb-8">Pick your favourite style, CTA, and animation. These are all the same card size.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">1 — Classic Gold</p>
              <Card1 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">2 — Dark + Gold Premium</p>
              <Card2 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">3 — Pulse Glow</p>
              <Card3 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">4 — Floating + Shimmer + Progress</p>
              <Card4 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">5 — Returns Focus (Green CTA)</p>
              <Card5 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">6 — Minimal Luxury</p>
              <Card6 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">7 — Dark Glass</p>
              <Card7 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">8 — Gold Bar Split</p>
              <Card8 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">9 — Gradient Border + Secure</p>
              <Card9 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">10 — Animated Border Glow</p>
              <Card10 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">11 — White Clean + Gold Accent</p>
              <Card11 />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">12 — Compact + Urgency Banner</p>
              <Card12 />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
