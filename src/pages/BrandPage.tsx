import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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
      <div className="max-w-[960px] mx-auto px-6 py-12">

        {/* Header */}
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#1C1C1C', fontFamily: "'Inter', sans-serif" }}>Brand Assets</h1>
        <p className="text-sm mb-10" style={{ color: '#6B7280' }}><strong>nfstay</strong> — visual identity</p>

        {/* ── ROW 1: Logo + Favicon ── */}
        <div className="grid md:grid-cols-[1fr_auto] gap-6 mb-10">

          {/* Logo */}
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

          {/* Favicon */}
          <div className="bg-white rounded-xl p-6 flex items-center gap-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-4">
              {/* 48px preview */}
              <div style={{ width: 48, height: 48, border: '2px solid #0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
              {/* 32px preview */}
              <div style={{ width: 32, height: 32, border: '1.5px solid #0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
              {/* 16px preview */}
              <div style={{ width: 16, height: 16, border: '1px solid #0a0a0a', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 7, color: '#0a0a0a', lineHeight: 1, background: 'white' }}>nf</div>
            </div>
            <span className="text-xs" style={{ color: '#6B7280' }}>Favicon</span>
          </div>
        </div>

        {/* ── ROW 2: Colours + Fonts ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">

          {/* Colours */}
          <div className="bg-white rounded-xl p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#1C1C1C' }}>Colours</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'Green', hex: '#1E9A80' },
                { name: 'Green Hover', hex: '#178F72' },
                { name: 'Green Light', hex: 'rgba(30,154,128,0.08)' },
                { name: 'Dark', hex: '#1C1C1C' },
                { name: 'Grey', hex: '#6B7280' },
                { name: 'Background', hex: '#F3F3EE' },
                { name: 'Warm', hex: '#EAE9E4' },
                { name: 'White', hex: '#FFFFFF' },
                { name: 'Border', hex: 'rgba(0,0,0,0.08)' },
              ].map((c) => (
                <div key={c.name} className="text-center">
                  <div
                    className="w-full aspect-square rounded-lg mb-1.5"
                    style={{
                      backgroundColor: c.hex,
                      border: c.hex === '#FFFFFF' || c.hex.includes('rgba') || c.hex === '#F3F3EE' || c.hex === '#EAE9E4' ? '1px solid #ddd' : undefined,
                    }}
                  />
                  <p className="text-[11px] font-medium" style={{ color: '#1C1C1C' }}>{c.name}</p>
                  <p className="text-[10px]" style={{ color: '#6B7280' }}>{c.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className="bg-white rounded-xl p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
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
        </div>

        {/* Footer */}
        <p className="text-center text-[11px]" style={{ color: '#6B7280' }}>&copy; {new Date().getFullYear()} <strong>nfstay</strong></p>
      </div>
    </div>
  );
}
