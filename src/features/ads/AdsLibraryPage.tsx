import { useState, useMemo } from 'react';
import { Lock, Download, X, Search, Eye } from 'lucide-react';

const PASSWORD = '5891';

interface Ad {
  id: string;
  num: number;
  title: string;
  angle: string;
  category: string;
  filename: string;
}

const ADS: Ad[] = [
  { id: 'ad-01', num: 1, title: 'No Property Needed', angle: 'Airbnb income without buying property', category: 'Entry', filename: 'ad-01-no-property.png' },
  { id: 'ad-02', num: 2, title: 'Night Shift Exit', angle: 'From shift work to property income', category: 'Entry', filename: 'ad-02-night-shift.png' },
  { id: 'ad-03', num: 3, title: 'Learn From Zero', angle: 'Academy + real deals in one place', category: 'Education', filename: 'ad-03-learn-from-zero.png' },
  { id: 'ad-04', num: 4, title: 'Small Budget Start', angle: 'Start small, scale fast', category: 'Entry', filename: 'ad-04-small-budget.png' },
  { id: 'ad-05', num: 5, title: 'Your Booking Site', angle: 'Direct bookings, more profit', category: 'Feature', filename: 'ad-05-booking-site.png' },
  { id: 'ad-06', num: 6, title: 'Landlords Approved', angle: 'No cold calls, pre-approved deals', category: 'Trust', filename: 'ad-06-landlords-approved.png' },
  { id: 'ad-07', num: 7, title: 'Guest To Operator', angle: 'Switch from booking to running stays', category: 'Entry', filename: 'ad-07-guest-to-operator.png' },
  { id: 'ad-08', num: 8, title: 'Side Income Boost', angle: 'Add £1k/month with one unit', category: 'Income', filename: 'ad-08-side-income.png' },
  { id: 'ad-09', num: 9, title: 'Zero Experience OK', angle: 'Clear steps, no background needed', category: 'Entry', filename: 'ad-09-zero-experience.png' },
  { id: 'ad-10', num: 10, title: 'Easy Process', angle: 'Deal to keys in 4 steps', category: 'Process', filename: 'ad-10-easy-process.png' },
  { id: 'ad-11', num: 11, title: 'Build Portfolio', angle: 'First deal to full portfolio', category: 'Growth', filename: 'ad-11-build-portfolio.png' },
  { id: 'ad-12', num: 12, title: 'Action Over Courses', angle: 'Real deals, not just videos', category: 'Trust', filename: 'ad-12-action-over-courses.png' },
  { id: 'ad-13', num: 13, title: 'Monthly Earnings', angle: 'Work once, paid monthly', category: 'Income', filename: 'ad-13-monthly-earnings.png' },
  { id: 'ad-14', num: 14, title: 'JV Partners', angle: 'No capital? Partner up.', category: 'Partnership', filename: 'ad-14-jv-partners.png' },
  { id: 'ad-15', num: 15, title: 'Local Deals', angle: 'Deals in your city', category: 'Location', filename: 'ad-15-local-deals.png' },
];

const CATEGORIES = ['All', ...Array.from(new Set(ADS.map((a) => a.category)))];

export default function AdsLibraryPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  const filtered = useMemo(() => {
    return ADS.filter((ad) => {
      const matchesCategory = activeCategory === 'All' || ad.category === activeCategory;
      const matchesSearch = search === '' ||
        ad.title.toLowerCase().includes(search.toLowerCase()) ||
        ad.angle.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Wrong passcode');
    }
  };

  const handleDownload = (ad: Ad) => {
    const link = document.createElement('a');
    link.href = `/ads/${ad.filename}`;
    link.download = ad.filename;
    link.click();
  };

  // ── Password gate ──
  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F3F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <form onSubmit={handleUnlock} style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px solid #E5E7EB', padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, border: '2.5px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, fontFamily: 'Sora, Inter, sans-serif', color: '#0A0A0A' }}>nf</div>
              <span style={{ fontSize: 24, fontWeight: 400, letterSpacing: 3, color: '#0A0A0A', fontFamily: 'Sora, Inter, sans-serif' }}>stay</span>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>Ads Library</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px' }}>Enter passcode to access</p>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passcode"
                autoFocus
                style={{ width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: '14px 0', borderRadius: 12, backgroundColor: '#1E9A80', color: '#FFFFFF', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' }}>
              Unlock
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Main library ──
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3F3EE', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'Sora, Inter, sans-serif', color: '#0A0A0A' }}>nf</div>
              <span style={{ fontSize: 18, fontWeight: 400, letterSpacing: 3, color: '#0A0A0A', fontFamily: 'Sora, Inter, sans-serif' }}>stay</span>
            </div>
            <div style={{ width: 1, height: 24, backgroundColor: '#E5E7EB' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>Static Ads Library</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1E9A80', backgroundColor: 'rgba(30,154,128,0.08)', padding: '5px 12px', borderRadius: 20 }}>
            {filtered.length} of {ADS.length}
          </span>
        </div>
      </div>

      {/* Title + search + filters */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px', letterSpacing: -0.5 }}>nfstay Static Ads Library</h1>
        <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px' }}>Preview and download image creatives</p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
          <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ads..."
            style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                border: activeCategory === cat ? '1.5px solid #1E9A80' : '1px solid #E5E7EB',
                backgroundColor: activeCategory === cat ? 'rgba(30,154,128,0.08)' : '#FFFFFF',
                color: activeCategory === cat ? '#1E9A80' : '#6B7280',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {filtered.map((ad) => (
            <div key={ad.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', transition: 'box-shadow 0.2s', display: 'flex', flexDirection: 'column' }}>

              {/* Image preview (9:16 ratio) */}
              <div
                style={{ position: 'relative', paddingTop: '177.78%', backgroundColor: '#EEEDEA', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => setPreviewAd(ad)}
              >
                <img
                  src={`/ads/${ad.filename}`}
                  alt={ad.title}
                  loading="lazy"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('[data-placeholder]')) {
                      const ph = document.createElement('div');
                      ph.setAttribute('data-placeholder', '1');
                      ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#9CA3AF;font-family:Inter,sans-serif;';
                      ph.innerHTML = `<span style="font-size:36px;font-weight:800;color:#E5E7EB">${String(ad.num).padStart(2, '0')}</span><span style="font-size:12px">Image pending</span>`;
                      parent.appendChild(ph);
                    }
                  }}
                />
                {/* Hover overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.3)'; (e.currentTarget.querySelector('[data-eye]') as HTMLElement | null)!.style.opacity = '1'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; (e.currentTarget.querySelector('[data-eye]') as HTMLElement | null)!.style.opacity = '0'; }}
                >
                  <div data-eye="" style={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: 6, color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>
                    <Eye style={{ width: 18, height: 18 }} /> Preview
                  </div>
                </div>
              </div>

              {/* Card info */}
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1E9A80', backgroundColor: 'rgba(30,154,128,0.08)', padding: '3px 10px', borderRadius: 8 }}>
                    {String(ad.num).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>{ad.category}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px', lineHeight: 1.3 }}>{ad.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 14px', lineHeight: 1.4, flex: 1 }}>{ad.angle}</p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPreviewAd(ad)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#1A1A1A', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Eye style={{ width: 14, height: 14 }} /> Preview
                  </button>
                  <button
                    onClick={() => handleDownload(ad)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', backgroundColor: '#1E9A80', color: '#FFFFFF', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Download style={{ width: 14, height: 14 }} /> Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>No ads match</p>
            <p style={{ fontSize: 14 }}>Try a different search or filter</p>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewAd && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setPreviewAd(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: 420, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setPreviewAd(null)}
              style={{ position: 'absolute', top: -44, right: 0, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>

            {/* Image */}
            <div style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEEDEA', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <img
                src={`/ads/${previewAd.filename}`}
                alt={previewAd.title}
                style={{ width: '100%', display: 'block' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>

            {/* Info bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  {String(previewAd.num).padStart(2, '0')}. {previewAd.title}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>{previewAd.angle}</p>
              </div>
              <button
                onClick={() => handleDownload(previewAd)}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: '#1E9A80', color: '#FFFFFF', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                <Download style={{ width: 14, height: 14 }} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
