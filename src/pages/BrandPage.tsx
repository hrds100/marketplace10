import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const COLOR_GROUPS = [
  {
    label: 'Greens',
    colors: [
      { name: 'Primary Green', hex: '#1E9A80' },
      { name: 'Hover Green', hex: '#14926E' },
      { name: 'Hover Green Alt', hex: '#178F72' },
      { name: 'Success Green', hex: '#059669' },
      { name: 'Emerald', hex: '#10B981' },
      { name: 'Light Emerald', hex: '#34D399' },
      { name: 'Teal', hex: '#0D9488' },
      { name: 'Green Tint', hex: '#ECFDF5' },
    ],
  },
  {
    label: 'Darks & Text',
    colors: [
      { name: 'Black', hex: '#111111' },
      { name: 'Near Black', hex: '#0A0A0A' },
      { name: 'Dark Text', hex: '#1C1C1C' },
      { name: 'Charcoal', hex: '#1A1A1A' },
      { name: 'Dark Navy', hex: '#080330' },
      { name: 'Dark 222', hex: '#222222' },
    ],
  },
  {
    label: 'Greys',
    colors: [
      { name: 'Grey 500', hex: '#6B7280' },
      { name: 'Grey 400', hex: '#9CA3AF' },
      { name: 'Grey Neutral', hex: '#808292' },
      { name: 'Grey 700', hex: '#374151' },
      { name: 'Grey 600', hex: '#4B5563' },
      { name: 'Grey 737', hex: '#737373' },
    ],
  },
  {
    label: 'Backgrounds',
    colors: [
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Off-White', hex: '#F3F3EE' },
      { name: 'Warm Beige', hex: '#EAE9E4' },
      { name: 'Light Grey', hex: '#FAFAFA' },
      { name: 'Cool Grey', hex: '#F9F9F9' },
      { name: 'Warm Grey', hex: '#F0F0EC' },
    ],
  },
  {
    label: 'Borders',
    colors: [
      { name: 'Border Light', hex: '#E5E7EB' },
      { name: 'Border Warm', hex: '#E8E5DF' },
      { name: 'Border DDD', hex: '#DDDDDD' },
      { name: 'Divider', hex: '#ECEFF3' },
      { name: 'Border D1', hex: '#D1D5DB' },
    ],
  },
  {
    label: 'Accents',
    colors: [
      { name: 'Red', hex: '#EF4444' },
      { name: 'Amber', hex: '#F59E0B' },
      { name: 'Blue', hex: '#3B82F6' },
      { name: 'Purple', hex: '#771EE6' },
      { name: 'Violet', hex: '#8B5CF6' },
      { name: 'Airbnb Red', hex: '#FF385C' },
    ],
  },
  {
    label: 'Dark Mode',
    colors: [
      { name: 'Dark Panel', hex: '#1A1B25' },
      { name: 'Dark Blue', hex: '#0E1726' },
      { name: 'Dark Surface', hex: '#1E2533' },
      { name: 'Dark Grey', hex: '#252636' },
    ],
  },
];

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

  const needsBorder = (hex: string) =>
    ['#FFFFFF', '#F3F3EE', '#EAE9E4', '#FAFAFA', '#F9F9F9', '#F0F0EC', '#ECFDF5',
     '#E5E7EB', '#E8E5DF', '#DDDDDD', '#ECEFF3', '#D1D5DB'].includes(hex);

  return (
    <div className="min-h-screen" style={{ background: '#F3F3EE' }}>
      <div className="max-w-[960px] mx-auto px-6 py-12">

        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#1C1C1C', fontFamily: "'Inter', sans-serif" }}>Brand Assets</h1>
        <p className="text-sm mb-10" style={{ color: '#6B7280' }}><strong>nfstay</strong> — visual identity</p>

        {/* ROW 1: Logo + Favicon */}
        <div className="grid md:grid-cols-[1fr_auto] gap-6 mb-10">
          <div className="bg-white rounded-xl p-8 flex items-center justify-between" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex items-center" style={{ gap: 4 }}>
              <div style={{ width: 42, height: 42, border: '2px solid #0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#0a0a0a', lineHeight: 1 }}>nf</div>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 400, fontSize: 28, color: '#0a0a0a', letterSpacing: 2, lineHeight: 1 }}>stay</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadLogo} className="ml-6 shrink-0">
              <Download className="w-4 h-4 mr-1.5" />
              PNG
            </Button>
          </div>
          <div className="bg-white rounded-xl p-6 flex items-center gap-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              <div style={{ width: 48, height: 48, border: '2px solid #0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
              <div style={{ width: 32, height: 32, border: '1.5px solid #0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
              <div style={{ width: 16, height: 16, border: '1px solid #0a0a0a', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 7, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
            </div>
            <span className="text-xs" style={{ color: '#6B7280' }}>Favicon</span>
          </div>
        </div>

        {/* ALL COLOURS — grouped */}
        <div className="bg-white rounded-xl p-6 mb-10" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: '#1C1C1C' }}>All Colours Found</h2>
          <div className="space-y-6">
            {COLOR_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: '#6B7280' }}>{group.label}</p>
                <div className="flex flex-wrap gap-3">
                  {group.colors.map((c) => (
                    <div key={c.hex} className="text-center" style={{ width: 72 }}>
                      <div
                        className="w-full h-12 rounded-lg mb-1"
                        style={{
                          backgroundColor: c.hex,
                          border: needsBorder(c.hex) ? '1px solid #ddd' : undefined,
                        }}
                      />
                      <p className="text-[10px] font-medium leading-tight" style={{ color: '#1C1C1C' }}>{c.name}</p>
                      <p className="text-[9px]" style={{ color: '#6B7280' }}>{c.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white rounded-xl p-6 mb-10" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1C1C1C' }}>Typography</h2>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium mb-1" style={{ color: '#6B7280' }}>Sora — Logo</p>
              <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#1C1C1C' }}>nfstay</p>
            </div>
            <div>
              <p className="text-[11px] font-medium mb-1" style={{ color: '#6B7280' }}>Inter — Body, nav, buttons</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 15, color: '#1C1C1C' }}>The quick brown fox jumps over the lazy dog</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 15, color: '#1C1C1C' }}>The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-[11px] font-medium mb-1" style={{ color: '#6B7280' }}>Playfair Display — Accent</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 18, color: '#1C1C1C' }}>Find, negotiate and grow your portfolio</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px]" style={{ color: '#6B7280' }}>&copy; {new Date().getFullYear()} <strong>nfstay</strong></p>
      </div>
    </div>
  );
}
