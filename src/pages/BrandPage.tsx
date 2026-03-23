import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/* ── colours from hub.nfstay.com homepage (index.css :root) ── */
const BRAND_COLORS = [
  { name: 'Primary Green', hsl: 'hsl(145, 63%, 42%)', hex: '#279E4A', use: 'Buttons, links, active states' },
  { name: 'Background', hsl: 'hsl(210, 20%, 98%)', hex: '#F8FAFC', use: 'Page background' },
  { name: 'Foreground', hsl: 'hsl(222, 84%, 5%)', hex: '#0A0F1E', use: 'Primary text' },
  { name: 'Card', hsl: 'hsl(0, 0%, 100%)', hex: '#FFFFFF', use: 'Cards, panels, modals' },
  { name: 'Muted Text', hsl: 'hsl(215, 16%, 47%)', hex: '#64748B', use: 'Secondary text, labels' },
  { name: 'Border', hsl: 'hsl(214, 32%, 91%)', hex: '#E2E8F0', use: 'All borders, dividers' },
  { name: 'Accent Light', hsl: 'hsl(149, 80%, 96%)', hex: '#ECFDF5', use: 'Green tint backgrounds, badges' },
  { name: 'Dark (Buttons)', hsl: 'hsl(0, 0%, 7%)', hex: '#121212', use: 'Dark CTA buttons (Get Started, Login)' },
];

const FONTS = [
  {
    name: 'Sora',
    family: "'Sora', sans-serif",
    use: 'Logo',
    weights: [
      { weight: 700, label: 'Bold (box)', italic: false },
      { weight: 400, label: 'Regular (wordmark)', italic: false },
    ],
  },
  {
    name: 'Inter',
    family: 'Inter, system-ui, sans-serif',
    use: 'Body text, UI elements',
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
      { weight: 600, label: 'Semibold' },
      { weight: 700, label: 'Bold' },
      { weight: 800, label: 'Extra Bold' },
    ],
  },
  {
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    use: 'Decorative / accent text',
    weights: [
      { weight: 400, label: 'Regular Italic', italic: true },
    ],
  },
];

/* ── favicon SVG generators ── */
const GREEN = '#279E4A';
const DARK = '#0A0F1E';

function faviconSvg1(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${GREEN}"/><text x="64" y="88" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="80" fill="white">n</text></svg>`;
}
function faviconSvg2(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${GREEN}"/><text x="64" y="88" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="80" fill="white">n</text></svg>`;
}
function faviconSvg3(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${DARK}"/><text x="64" y="88" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="80" fill="${GREEN}">n</text></svg>`;
}
function faviconSvg4(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="white" stroke="${DARK}" stroke-width="8"/><text x="64" y="86" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="70" fill="${DARK}">nf</text></svg>`;
}
function faviconSvg5(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="${DARK}"/><text x="64" y="86" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="70" fill="white">nf</text></svg>`;
}

const FAVICON_OPTIONS = [
  { label: 'Option 1 — Green circle, white "n"', render: faviconSvg1 },
  { label: 'Option 2 — Green rounded square, white "n"', render: faviconSvg2 },
  { label: 'Option 3 — Dark circle, green "n"', render: faviconSvg3 },
  { label: 'Option 4 — White square, dark "nf" (matches logo)', render: faviconSvg4 },
  { label: 'Option 5 — Dark square, white "nf"', render: faviconSvg5 },
];

function ColorSwatch({ name, hsl, hex, use }: { name: string; hsl: string; hex: string; use: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-16 h-16 rounded-lg border border-border flex-shrink-0" style={{ backgroundColor: hex }} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{hsl}</p>
        <p className="text-xs text-muted-foreground">{hex}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{use}</p>
      </div>
    </div>
  );
}

/* ── inline logo renderer (matches NfsLogo component exactly) ── */
function LogoPreview({ bgColor, textColor, borderColor }: { bgColor: string; textColor: string; borderColor: string }) {
  return (
    <div className="rounded-lg p-10 w-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
      <div className="flex items-center" style={{ gap: 4 }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: `2.5px solid ${borderColor}`,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: textColor,
            lineHeight: 1,
          }}
        >
          nf
        </div>
        <span
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 400,
            fontSize: 32,
            color: textColor,
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          stay
        </span>
      </div>
    </div>
  );
}

export default function BrandPage() {
  const downloadLogo = useCallback((variant: 'dark' | 'light') => {
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

    const textColor = variant === 'dark' ? '#0A0F1E' : '#FFFFFF';
    const boxSize = 40;
    const boxX = 20;
    const boxY = 20;

    // Draw box
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxSize, boxSize, 8);
    ctx.stroke();

    // "nf" inside box
    ctx.font = "700 18px 'Sora', sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('nf', boxX + boxSize / 2, boxY + boxSize / 2);

    // "stay" beside box
    ctx.font = "400 28px 'Sora', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText('stay', boxX + boxSize + 5, boxY + boxSize / 2 + 1);

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
                <LogoPreview bgColor="#FFFFFF" textColor="#0A0F1E" borderColor="#0A0F1E" />
                <Button variant="outline" size="sm" onClick={() => downloadLogo('dark')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Light on dark</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <LogoPreview bgColor="#0A0F1E" textColor="#FFFFFF" borderColor="#FFFFFF" />
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BRAND_COLORS.map((c) => <ColorSwatch key={c.name} {...c} />)}
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
