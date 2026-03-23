import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Check, Copy, Lock } from 'lucide-react';

/* ─── DATA ─── */

const COLOR_GROUPS = [
  {
    label: 'Primary',
    colors: [
      { name: 'nfstay Green', value: '#1E9A80', desc: 'Buttons, links, active states, checkmarks' },
      { name: 'Green Tint', value: 'rgba(30,154,128,0.08)', desc: 'Active tabs, hover fills, badges' },
    ],
  },
  {
    label: 'Text',
    colors: [
      { name: 'Heading', value: '#1A1A1A', desc: 'Page headings, nav links' },
      { name: 'Logo Black', value: '#0A0A0A', desc: 'Logo, sign-in headings' },
      { name: 'Button Black', value: '#111111', desc: 'Dark button backgrounds' },
      { name: 'Body Grey', value: '#6B7280', desc: 'Subtitles, descriptions' },
      { name: 'Muted Grey', value: '#9CA3AF', desc: 'Strikethrough, disabled' },
    ],
  },
  {
    label: 'Backgrounds',
    colors: [
      { name: 'White', value: '#FFFFFF', desc: 'Cards, inputs, modals' },
      { name: 'Off-White', value: '#F3F3EE', desc: 'Page background' },
    ],
  },
  {
    label: 'Borders',
    colors: [
      { name: 'Border', value: '#E5E7EB', desc: 'Dividers, card borders' },
    ],
  },
];

const TYPOGRAPHY = [
  { font: 'Sora', role: 'Logo only', weights: '400, 700', sample: 'nfstay', sampleStyle: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 24 } },
  { font: 'Inter', role: 'Body, nav, buttons, headings', weights: '400–900', sample: 'The quick brown fox jumps over the lazy dog', sampleStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 15 } },
  { font: 'Playfair Display', role: 'Accent italic only', weights: '400 italic', sample: 'Find, negotiate and grow your portfolio', sampleStyle: { fontFamily: "'Playfair Display', serif", fontWeight: 400, fontStyle: 'italic' as const, fontSize: 20 } },
];

const HEADING_SCALE = [
  { label: 'Hero H1', size: '46px', weight: '500', spacing: '-1.4px' },
  { label: 'Section H2', size: '34–48px', weight: '700', spacing: '0–0.34px' },
  { label: 'Subsection H2', size: '24px', weight: '700', spacing: '0.24px' },
  { label: 'Card H3', size: '16px', weight: '600', spacing: '0.16px' },
  { label: 'Step number', size: '56px', weight: '900', spacing: 'normal' },
  { label: 'Step label', size: '11px', weight: '700', spacing: 'normal (uppercase)' },
];

const BUTTON_SPECS = [
  { name: 'Primary CTA', bg: '#1E9A80', text: '#FFFFFF', radius: '14–16px', padding: '13px 16–40px', font: 'Inter 500–600' },
  { name: 'Dark CTA', bg: '#111111', text: '#FFFFFF', radius: '16px', padding: '13px 16px', font: 'Inter 500' },
  { name: 'Outline', bg: '#FFFFFF', text: '#1A1A1A', radius: '10–12px', padding: '10px 20px', font: 'Inter 500' },
  { name: 'Pill (social)', bg: 'transparent', text: '#0A0A0A', radius: '9999px', padding: '8px 12px', font: 'Inter 500' },
  { name: 'Tab (active)', bg: 'rgba(30,154,128,0.08)', text: '#1E9A80', radius: '8px', padding: '8px 10px', font: 'Inter 500' },
];

const CARD_SPECS = {
  bg: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.08) or #E8E5DF',
  radius: '12–16px',
  shadow: 'rgba(0,0,0,0.08) 0 4px 24px -2px',
  hoverShadow: 'rgba(0,0,0,0.1) 0 8px 32px',
  greenAccent: '3–4px solid #1E9A80 top border on feature cards',
  padding: '16–24px',
};

const SHADOW_SPECS = [
  { name: 'Card', value: 'rgba(0,0,0,0.08) 0 4px 24px -2px' },
  { name: 'Card hover', value: 'rgba(0,0,0,0.1) 0 8px 32px' },
  { name: 'Subtle', value: 'rgba(0,0,0,0.04) 0 2px 8px' },
  { name: 'Green glow', value: 'rgba(30,154,128,0.35) 0 4px 16px' },
  { name: 'Input', value: 'rgba(0,0,0,0.05) 0 4px 8px -1px' },
];

const DESIGN_PROMPT = `You are building a page for nfstay (hub.nfstay.com). Follow this design system exactly.

PHILOSOPHY: Clean, editorial, trust-first. Premium property magazine — not SaaS dashboard. Generous whitespace, minimal colour, typographic hierarchy.

COLOURS (only these — no others):
- Primary green: #1E9A80 (buttons, links, active states, checkmarks)
- Green tint: rgba(30,154,128,0.08) (active tabs, hover fills, badges)
- Heading text: #1A1A1A
- Logo black: #0A0A0A
- Button black: #111111
- Body grey: #6B7280
- Muted grey: #9CA3AF
- White: #FFFFFF (cards, inputs)
- Off-white: #F3F3EE (page background)
- Border: #E5E7EB

FONTS:
- Inter: everything (body, headings, nav, buttons). Weights 400–900.
- Sora: logo only (700 for "nf", 400 for "stay").
- Playfair Display: accent italic only (hero subheading).

HEADING SCALE:
- Hero H1: 46px, weight 500, letter-spacing -1.4px
- Section H2: 34–48px, weight 700
- Subsection H2: 24px, weight 700
- Card H3: 16px, weight 600
- Body text: 15px, weight 400, colour #6B7280

BUTTONS:
- Primary CTA: bg #1E9A80, white text, radius 14–16px, shadow rgba(30,154,128,0.35) 0 4px 16px
- Dark CTA: bg #111111, white text, radius 16px
- Outline: bg white, border rgba(0,0,0,0.08), radius 10–12px
- Pill (social login): bg transparent, border #E5E5E5, radius 9999px
- Active tab: bg rgba(30,154,128,0.08), text #1E9A80, radius 8px

CARDS:
- White bg, border 1px solid rgba(0,0,0,0.08), radius 12–16px
- Shadow: rgba(0,0,0,0.08) 0 4px 24px -2px
- Hover: rgba(0,0,0,0.1) 0 8px 32px + translateY(-1px)
- Feature cards: 3–4px solid #1E9A80 top border

NAVBAR:
- Fixed, bg rgba(255,255,255,0.92), backdrop-filter blur(12px)
- Max-width 1280px, centred

LAYOUT:
- Section padding: 88–140px vertical
- Container max-width: 1000–1680px
- 4px/8px grid spacing
- Mobile first (375px → sm → md → lg → xl)

RULES:
- No new hex colours beyond the 10 listed above
- Tailwind classes only (no inline styles)
- shadcn/ui components first
- Lucide React icons only
- Every component needs: normal, empty, loading, error states`;

/* ─── COMPONENT ─── */

const BRAND_PW = '5891';

export default function BrandPage() {
  const [copied, setCopied] = useState(false);
  const [pw, setPw] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const handlePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === BRAND_PW) setUnlocked(true);
  };

  const downloadLogo = useCallback(() => {
    const canvas = document.createElement('canvas');
    const scale = 4;
    const w = 300;
    const h = 80;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, w, h);

    const boxSize = 40;
    const boxX = 20;
    const boxY = 20;

    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxSize, boxSize, 8);
    ctx.stroke();

    ctx.font = "700 18px 'Sora', sans-serif";
    ctx.fillStyle = '#0a0a0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('nf', boxX + boxSize / 2, boxY + boxSize / 2);

    ctx.font = "400 28px 'Sora', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText('stay', boxX + boxSize + 5, boxY + boxSize / 2 + 1);

    const link = document.createElement('a');
    link.download = 'nfstay-logo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const downloadFavicon = useCallback((size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.15);
    ctx.fill();

    // Border
    const bw = Math.max(1, size * 0.05);
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = bw;
    const inset = bw / 2;
    ctx.beginPath();
    ctx.roundRect(inset, inset, size - bw, size - bw, size * 0.15);
    ctx.stroke();

    // "nf" text
    const fontSize = Math.round(size * 0.4);
    ctx.font = `700 ${fontSize}px 'Sora', sans-serif`;
    ctx.fillStyle = '#0a0a0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('nf', size / 2, size / 2 + 1);

    const link = document.createElement('a');
    if (size <= 48) {
      // Convert to ICO-compatible PNG
      link.download = `nfstay-favicon-${size}x${size}.png`;
    } else {
      link.download = `nfstay-favicon-${size}x${size}.png`;
    }
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const copyPrompt = useCallback(() => {
    navigator.clipboard.writeText(DESIGN_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const needsBorder = (val: string) =>
    ['#FFFFFF', '#F3F3EE', '#E5E7EB'].includes(val) || val.includes('0.08');

  const S = {
    page: { background: '#F3F3EE' } as React.CSSProperties,
    card: { border: '1px solid rgba(0,0,0,0.08)' } as React.CSSProperties,
    h1: { color: '#1A1A1A', fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    sub: { color: '#6B7280' } as React.CSSProperties,
    heading: { color: '#1A1A1A' } as React.CSSProperties,
    label: { color: '#6B7280' } as React.CSSProperties,
    cell: { color: '#1A1A1A' } as React.CSSProperties,
    cellSub: { color: '#6B7280' } as React.CSSProperties,
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={S.page}>
        <form onSubmit={handlePw} className="bg-white rounded-xl p-8 w-full max-w-[340px]" style={S.card}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(30,154,128,0.08)' }}>
              <Lock className="w-5 h-5" style={{ color: '#1E9A80' }} />
            </div>
            <div>
              <h1 className="text-base font-semibold" style={S.heading}>Brand Assets</h1>
              <p className="text-xs" style={S.sub}>Enter password to access</p>
            </div>
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="w-full rounded-[10px] px-3 py-2.5 text-sm mb-3 outline-none"
            style={{ border: '1px solid #E5E5E5', fontFamily: 'Inter, sans-serif' }}
            autoFocus
          />
          <Button
            type="submit"
            className="w-full text-sm font-medium"
            style={{ background: '#1E9A80', color: '#fff', borderRadius: 10 }}
          >
            Access
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={S.page}>
      <div className="max-w-[1100px] mx-auto px-6 py-12">

        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={S.h1}>Brand Assets</h1>
        <p className="text-sm mb-10" style={S.sub}><strong>nfstay</strong> — visual identity &amp; design system</p>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* Design Philosophy */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-3" style={S.heading}>Design Philosophy</h2>
              <p className="text-[13px] leading-relaxed" style={S.sub}>
                Clean, editorial, trust-first. Think premium property magazine — not SaaS dashboard.
                Generous whitespace, minimal colour, strong typographic hierarchy, soft containers on
                warm off-white backgrounds. One accent colour (green) — everything else is greyscale.
              </p>
            </div>

            {/* Logo + Favicon */}
            <div className="grid md:grid-cols-[1fr_auto] gap-6">
              <div className="bg-white rounded-xl p-8 flex items-center justify-between" style={S.card}>
                <div className="flex items-center" style={{ gap: 4 }}>
                  <div style={{ width: 42, height: 42, border: '2px solid #0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#0a0a0a', lineHeight: 1 }}>nf</div>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 400, fontSize: 28, color: '#0a0a0a', letterSpacing: 2, lineHeight: 1 }}>stay</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadLogo} className="ml-6 shrink-0">
                  <Download className="w-4 h-4 mr-1.5" />
                  PNG
                </Button>
              </div>
              <div className="bg-white rounded-xl p-6" style={S.card}>
                <div className="flex items-center gap-4 mb-3">
                  <div style={{ width: 48, height: 48, border: '2px solid #0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
                  <div style={{ width: 32, height: 32, border: '1.5px solid #0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
                  <div style={{ width: 16, height: 16, border: '1px solid #0a0a0a', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 7, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
                </div>
                <p className="text-[10px] mb-2" style={S.sub}>Favicon — download at standard sizes</p>
                <div className="flex gap-2">
                  {[16, 32, 48, 180, 512].map((sz) => (
                    <Button key={sz} variant="outline" size="sm" onClick={() => downloadFavicon(sz)} className="text-[10px] px-2 py-1 h-auto">
                      <Download className="w-3 h-3 mr-1" />
                      {sz}px
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colour Palette */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-5" style={S.heading}>Colour Palette</h2>
              <div className="space-y-6">
                {COLOR_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] font-semibold mb-2" style={S.label}>{group.label}</p>
                    <div className="flex flex-wrap gap-3">
                      {group.colors.map((c) => (
                        <div key={c.value} className="text-center" style={{ width: 88 }}>
                          <div
                            className="w-full h-14 rounded-lg mb-1.5"
                            style={{
                              backgroundColor: c.value,
                              border: needsBorder(c.value) ? '1px solid #ddd' : undefined,
                            }}
                          />
                          <p className="text-[10px] font-medium leading-tight" style={S.heading}>{c.name}</p>
                          <p className="text-[9px] mt-0.5" style={S.label}>{c.value}</p>
                          <p className="text-[8px] mt-0.5 leading-snug" style={S.cellSub}>{c.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-4" style={S.heading}>Typography</h2>
              <div className="space-y-5">
                {TYPOGRAPHY.map((t) => (
                  <div key={t.font}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="text-[11px] font-semibold" style={S.label}>{t.font}</p>
                      <p className="text-[9px]" style={S.cellSub}>{t.role} · {t.weights}</p>
                    </div>
                    <p style={{ ...t.sampleStyle, color: '#1A1A1A' }}>{t.sample}</p>
                  </div>
                ))}
              </div>

              {/* Heading scale */}
              <h3 className="text-[11px] font-semibold mt-6 mb-2" style={S.label}>Heading Scale</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr style={{ color: '#9CA3AF' }}>
                      <td className="pb-1 pr-4">Element</td>
                      <td className="pb-1 pr-4">Size</td>
                      <td className="pb-1 pr-4">Weight</td>
                      <td className="pb-1">Letter Spacing</td>
                    </tr>
                  </thead>
                  <tbody>
                    {HEADING_SCALE.map((h) => (
                      <tr key={h.label} style={S.cell}>
                        <td className="py-0.5 pr-4 font-medium">{h.label}</td>
                        <td className="py-0.5 pr-4">{h.size}</td>
                        <td className="py-0.5 pr-4">{h.weight}</td>
                        <td className="py-0.5">{h.spacing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Buttons */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-4" style={S.heading}>Buttons</h2>
              <div className="space-y-3">
                {BUTTON_SPECS.map((b) => (
                  <div key={b.name} className="flex items-center gap-4">
                    <div
                      className="shrink-0 flex items-center justify-center text-[12px] font-medium"
                      style={{
                        backgroundColor: b.bg,
                        color: b.text,
                        borderRadius: b.radius.split('–')[0],
                        padding: '8px 16px',
                        border: b.bg === 'transparent' || b.bg === '#FFFFFF' ? '1px solid #E5E7EB' : 'none',
                        minWidth: 100,
                      }}
                    >
                      {b.name}
                    </div>
                    <div>
                      <p className="text-[10px] font-medium" style={S.heading}>{b.name}</p>
                      <p className="text-[9px]" style={S.cellSub}>
                        bg: {b.bg} · text: {b.text} · radius: {b.radius} · {b.font}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards & Shadows */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-4" style={S.heading}>Cards</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: 'rgba(0,0,0,0.08) 0 4px 24px -2px' }}>
                  <p className="text-[10px] font-medium" style={S.heading}>Default Card</p>
                  <p className="text-[9px] mt-1" style={S.cellSub}>radius 12–16px, shadow, border</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#fff', borderTop: '3px solid #1E9A80', border: '1px solid rgba(0,0,0,0.08)', borderTopWidth: 3, borderTopColor: '#1E9A80', boxShadow: 'rgba(0,0,0,0.08) 0 4px 24px -2px' }}>
                  <p className="text-[10px] font-medium" style={S.heading}>Feature Card</p>
                  <p className="text-[9px] mt-1" style={S.cellSub}>+ green top border</p>
                </div>
              </div>

              <h3 className="text-[11px] font-semibold mb-2" style={S.label}>Shadows</h3>
              <div className="space-y-2">
                {SHADOW_SPECS.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white shrink-0" style={{ boxShadow: s.value }} />
                    <div>
                      <p className="text-[10px] font-medium" style={S.heading}>{s.name}</p>
                      <p className="text-[9px] font-mono" style={S.cellSub}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navbar */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-3" style={S.heading}>Navbar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <tbody>
                    {[
                      ['Position', 'Fixed, top'],
                      ['Background', 'rgba(255,255,255,0.92)'],
                      ['Blur', 'backdrop-filter: blur(12px)'],
                      ['Max width', '1280px, centred'],
                      ['Nav links', 'Inter 400, 16px, #1A1A1A'],
                    ].map(([prop, val]) => (
                      <tr key={prop} style={S.cell}>
                        <td className="py-0.5 pr-4 font-medium" style={{ width: 100 }}>{prop}</td>
                        <td className="py-0.5 font-mono" style={S.cellSub}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Layout */}
            <div className="bg-white rounded-xl p-6" style={S.card}>
              <h2 className="text-sm font-semibold mb-3" style={S.heading}>Layout &amp; Spacing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <tbody>
                    {[
                      ['Grid unit', '4px / 8px increments'],
                      ['Section padding', '88–140px vertical'],
                      ['Container', '1000–1680px max-width'],
                      ['Card gaps', '16–24px'],
                      ['Border radius', '10px (sm), 12px (md), 16px (lg)'],
                      ['Breakpoints', 'sm 640 · md 768 · lg 1024 · xl 1280'],
                      ['Approach', 'Mobile first (375px base)'],
                    ].map(([prop, val]) => (
                      <tr key={prop} style={S.cell}>
                        <td className="py-0.5 pr-4 font-medium" style={{ width: 120 }}>{prop}</td>
                        <td className="py-0.5" style={S.cellSub}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Design Prompt */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
            <div className="bg-white rounded-xl p-5" style={S.card}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={S.heading}>Design Prompt</h2>
                <Button variant="outline" size="sm" onClick={copyPrompt} className="shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-[10px] mb-3" style={S.cellSub}>
                Paste this into any AI coding tool (Claude, Cursor, Lovable) to replicate the nfstay design system on any new page.
              </p>
              <pre
                className="text-[9px] leading-relaxed p-4 rounded-lg overflow-auto max-h-[70vh]"
                style={{ background: '#F3F3EE', color: '#1A1A1A', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {DESIGN_PROMPT}
              </pre>
            </div>
          </div>

        </div>

        <p className="text-center text-[11px] mt-10" style={S.sub}>&copy; {new Date().getFullYear()} <strong>nfstay</strong></p>
      </div>
    </div>
  );
}
