import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/* ── colours from hub.nfstay.com static homepage (public/landing/css/base.css) ── */
const BRAND_COLORS = [
  { name: 'Green (Primary)', hex: '#1E9A80', use: 'Buttons, links, accents' },
  { name: 'Green Light', hex: 'rgba(30, 154, 128, 0.08)', use: 'Hover tints, tag backgrounds' },
  { name: 'Dark Text', hex: '#1C1C1C', use: 'Headings, body text, CTA buttons' },
  { name: 'Secondary Text', hex: '#6B7280', use: 'Labels, captions, muted text' },
  { name: 'Hero Background', hex: '#F3F3EE', use: 'Page background (warm off-white)' },
  { name: 'Hero Gradient End', hex: '#EAE9E4', use: 'Hero gradient middle tone' },
  { name: 'White', hex: '#FFFFFF', use: 'Cards, nav background, buttons' },
  { name: 'Border', hex: 'rgba(0, 0, 0, 0.08)', use: 'Subtle borders, dividers' },
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
    use: 'Body text, nav links, buttons',
    weights: [
      { weight: 400, label: 'Regular' },
      { weight: 500, label: 'Medium' },
      { weight: 600, label: 'Semibold' },
      { weight: 700, label: 'Bold' },
    ],
  },
  {
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    use: 'Hero italic accent text',
    weights: [
      { weight: 400, label: 'Regular Italic', italic: true },
    ],
  },
];

function ColorSwatch({ name, hex, use }: { name: string; hex: string; use: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-16 h-16 rounded-lg flex-shrink-0"
        style={{
          backgroundColor: hex,
          border: hex === '#FFFFFF' || hex.includes('rgba') ? '1px solid #e5e5e5' : undefined,
        }}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{hex}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{use}</p>
      </div>
    </div>
  );
}

/* ── inline logo renderer (matches NfsLogo component — Sora font, bordered box) ── */
function LogoPreview() {
  return (
    <div className="rounded-lg p-10 w-full flex items-center justify-center bg-white border border-border">
      <div className="flex items-center" style={{ gap: 4 }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: '2.5px solid #0a0a0a',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: '#0a0a0a',
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
            color: '#0a0a0a',
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

/* ── favicon: the "nf" box from the logo ── */
function FaviconPreview({ size }: { size: number }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="white" stroke="#0a0a0a" stroke-width="10"/><text x="64" y="88" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="70" fill="#0a0a0a">nf</text></svg>`;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function BrandPage() {
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

  return (
    <div className="min-h-screen" style={{ background: '#F3F3EE' }}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: '#1C1C1C' }}>Brand Assets</h1>
          <p className="mt-2 text-lg" style={{ color: '#6B7280' }}>
            <strong>nfstay</strong> visual identity and guidelines
          </p>
        </div>

        {/* ── LOGO ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight mb-6" style={{ color: '#1C1C1C' }}>Logo</h2>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <LogoPreview />
              <Button variant="outline" size="sm" onClick={downloadLogo}>
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ── FAVICON ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight mb-6" style={{ color: '#1C1C1C' }}>Favicon</h2>
          <Card>
            <CardHeader><CardTitle className="text-sm">The "nf" box from the logo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">128px</p>
                  <FaviconPreview size={128} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">32px</p>
                  <FaviconPreview size={32} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">16px</p>
                  <FaviconPreview size={16} />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── COLOUR PALETTE ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight mb-6" style={{ color: '#1C1C1C' }}>Colour Palette</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BRAND_COLORS.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>
        </section>

        {/* ── TYPOGRAPHY ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold tracking-tight mb-6" style={{ color: '#1C1C1C' }}>Typography</h2>
          <div className="space-y-6">
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
                        className="text-lg"
                        style={{
                          fontFamily: font.family,
                          fontWeight: w.weight,
                          fontStyle: w.italic ? 'italic' : 'normal',
                          color: '#1C1C1C',
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
        <div className="border-t pt-6 text-center text-xs" style={{ borderColor: 'rgba(0,0,0,0.08)', color: '#6B7280' }}>
          &copy; {new Date().getFullYear()} <strong>nfstay</strong>. All rights reserved.
        </div>
      </div>
    </div>
  );
}
