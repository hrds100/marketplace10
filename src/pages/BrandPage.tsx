import { useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/* ── colour data (matches index.css) ── */
const BRAND_COLORS = [
  { name: 'Primary (Green)', hsl: '145 63% 42%', hex: '#27A94B', use: 'Buttons, links, active states' },
  { name: 'Primary Foreground', hsl: '0 0% 100%', hex: '#FFFFFF', use: 'Text on primary backgrounds' },
  { name: 'Secondary', hsl: '210 20% 96%', hex: '#F1F5F9', use: 'Secondary buttons, subtle backgrounds' },
  { name: 'Accent Light', hsl: '149 80% 96%', hex: '#ECFDF5', use: 'Badge backgrounds, hover tints' },
  { name: 'Destructive', hsl: '0 84% 60%', hex: '#EF4444', use: 'Delete buttons, error states' },
  { name: 'Muted Foreground', hsl: '215 16% 47%', hex: '#64748B', use: 'Secondary text, hints' },
  { name: 'Border', hsl: '214 32% 91%', hex: '#E2E8F0', use: 'All borders' },
];

const SEMANTIC_COLORS = [
  { name: 'Success', hsl: '160 60% 45%', hex: '#2DD4A8', use: 'Success toasts, confirmed states' },
  { name: 'Warning', hsl: '38 92% 50%', hex: '#F59E0B', use: 'Warning badges, caution states' },
  { name: 'Danger', hsl: '0 84% 60%', hex: '#EF4444', use: 'Error states, destructive actions' },
  { name: 'Info', hsl: '217 91% 60%', hex: '#3B82F6', use: 'Info badges, neutral alerts' },
];

const HERO_COLORS = [
  { name: 'Hero Background', hsl: '215 50% 11%', hex: '#0F1729', use: 'Dark header background' },
  { name: 'Hero Surface', hsl: '215 35% 18%', hex: '#1E293B', use: 'Cards on dark background' },
  { name: 'Hero Border', hsl: '215 22% 28%', hex: '#334155', use: 'Borders on dark background' },
  { name: 'Hero Text', hsl: '0 0% 100%', hex: '#FFFFFF', use: 'White text on dark' },
  { name: 'Hero Subtext', hsl: '215 20% 65%', hex: '#94A3B8', use: 'Lighter text on dark' },
];

const FONTS = [
  {
    name: 'Inter',
    family: 'Inter, system-ui, sans-serif',
    use: 'Body text',
    weights: [
      { weight: 400, label: 'Regular' },
      { weight: 500, label: 'Medium' },
      { weight: 600, label: 'Semibold' },
      { weight: 700, label: 'Bold' },
    ],
  },
  {
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    use: 'Headings',
    weights: [
      { weight: 500, label: 'Medium' },
      { weight: 600, label: 'Semibold' },
      { weight: 700, label: 'Bold' },
      { weight: 800, label: 'Extra Bold' },
    ],
  },
  {
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    use: 'Accent / decorative text',
    weights: [
      { weight: 400, label: 'Regular Italic', italic: true },
      { weight: 700, label: 'Bold', italic: false },
    ],
  },
];

/* ── favicon SVG generators ── */
const GREEN = '#27A94B';
const DARK_BG = '#0F1729';

function faviconSvg1(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${GREEN}"/><text x="64" y="88" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-weight="800" font-size="80" fill="white">n</text></svg>`;
}
function faviconSvg2(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${GREEN}"/><text x="64" y="88" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-weight="800" font-size="80" fill="white">n</text></svg>`;
}
function faviconSvg3(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${DARK_BG}"/><text x="64" y="88" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-weight="800" font-size="80" fill="${GREEN}">n</text></svg>`;
}
function faviconSvg4(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${GREEN}"/><text x="64" y="84" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-weight="800" font-size="64" fill="white">nf</text></svg>`;
}
function faviconSvg5(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><text x="64" y="100" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-weight="800" font-size="120" fill="${GREEN}">n</text></svg>`;
}

const FAVICON_OPTIONS = [
  { label: 'Option 1 — Green circle, white "n"', render: faviconSvg1 },
  { label: 'Option 2 — Green rounded square, white "n"', render: faviconSvg2 },
  { label: 'Option 3 — Dark circle, green "n"', render: faviconSvg3 },
  { label: 'Option 4 — Green circle, white "nf"', render: faviconSvg4 },
  { label: 'Option 5 — Minimal green "n", no background', render: faviconSvg5 },
];

function ColorSwatch({ name, hsl, hex, use }: { name: string; hsl: string; hex: string; use: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-16 h-16 rounded-lg border border-border flex-shrink-0" style={{ backgroundColor: hex }} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">HSL: {hsl}</p>
        <p className="text-xs text-muted-foreground">HEX: {hex}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{use}</p>
      </div>
    </div>
  );
}

export default function BrandPage() {
  const logoLightRef = useRef<HTMLDivElement>(null);
  const logoDarkRef = useRef<HTMLDivElement>(null);

  const downloadLogo = useCallback((variant: 'dark' | 'light') => {
    const canvas = document.createElement('canvas');
    const scale = 3;
    canvas.width = 400 * scale;
    canvas.height = 100 * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, 400, 100);
    ctx.font = "800 48px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = variant === 'dark' ? '#0F1729' : '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText('nfstay', 20, 50);
    const link = document.createElement('a');
    link.download = `nfstay-logo-${variant}-on-transparent.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Brand Assets</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            <strong>nfstay</strong> visual identity and guidelines
          </p>
        </div>

        {/* ── LOGO ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">Logo</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Dark on light</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div ref={logoLightRef} className="bg-white rounded-lg p-8 border border-border w-full flex items-center justify-center">
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 48, color: '#0F1729' }}>nfstay</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadLogo('dark')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Light on dark</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div ref={logoDarkRef} className="rounded-lg p-8 w-full flex items-center justify-center" style={{ backgroundColor: DARK_BG }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 48, color: '#FFFFFF' }}>nfstay</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadLogo('light')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── FAVICONS ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">Favicon Options</h2>
          <p className="text-sm text-muted-foreground mb-6">Pick the one you like — tell me the option number.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FAVICON_OPTIONS.map((opt, i) => (
              <Card key={i}>
                <CardHeader><CardTitle className="text-sm">{opt.label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-4 mb-3">
                    <div dangerouslySetInnerHTML={{ __html: opt.render(128) }} />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">32px:</span>
                      <div dangerouslySetInnerHTML={{ __html: opt.render(32) }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">16px:</span>
                      <div dangerouslySetInnerHTML={{ __html: opt.render(16) }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── COLOUR PALETTE ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">Colour Palette</h2>

          <h3 className="text-sm font-semibold text-foreground mb-4">Brand Colours</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {BRAND_COLORS.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-4">Semantic Colours</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {SEMANTIC_COLORS.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-4">Hero Section (Dark Header)</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HERO_COLORS.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>
        </section>

        {/* ── TYPOGRAPHY ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-6">Typography</h2>
          <div className="space-y-8">
            {FONTS.map((font) => (
              <Card key={font.name}>
                <CardHeader>
                  <CardTitle className="text-base">{font.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Used for: {font.use}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {font.weights.map((w) => (
                    <div key={w.label}>
                      <p className="text-xs text-muted-foreground mb-1">{w.label} ({w.weight})</p>
                      <p
                        className="text-lg text-foreground"
                        style={{
                          fontFamily: font.family,
                          fontWeight: w.weight,
                          fontStyle: w.italic ? 'italic' : 'normal',
                        }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} <strong>nfstay</strong>. All rights reserved.
        </div>
      </div>
    </div>
  );
}
