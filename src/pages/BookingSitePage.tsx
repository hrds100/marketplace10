import { useState, useRef, useCallback } from 'react';
import { Globe, Smartphone, Monitor, Copy, Check, Palette, Type, Image, Mail, Phone, Link2, Upload, MapPin, Star, Bath, Bed, Users, ChevronDown, ChevronLeft, Search, Clock, MessageCircle, User } from 'lucide-react';
import PaymentSheet from '@/components/PaymentSheet';

const heroImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
];


const defaultBranding = {
  brandName: 'Your Brand',
  subdomain: 'yourbrand',
  customDomain: '',
  accentColor: '#10b981',
  heroHeadline: 'Find Your Perfect Stay',
  heroSubheadline: 'Book directly with us for the best rates and experience',
  aboutBio: 'We offer carefully curated vacation rentals in the most beautiful locations.',
  aboutPhoto: '',
  faq1Q: 'How do I book a property?',
  faq1A: 'Simply browse our listings, select your dates and guests, and complete checkout.',
  faq2Q: 'What is your cancellation policy?',
  faq2A: 'Free cancellation up to 48 hours before check-in.',
  faq3Q: 'Is there a minimum stay?',
  faq3A: 'Most properties have a 2-night minimum stay.',
  contactEmail: '',
  contactPhone: '',
  contactWhatsapp: '',
  socialInstagram: '',
  socialFacebook: '',
  socialTwitter: '',
  socialTiktok: '',
};

export default function BookingSitePage() {
  const [branding, setBranding] = useState(defaultBranding);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'content' | 'contact'>('brand');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom'>('subdomain');
  const [hexInput, setHexInput] = useState(defaultBranding.accentColor);

  const siteUrl = domainMode === 'custom' && branding.customDomain
    ? branding.customDomain
    : `${branding.subdomain}.nfstay.app`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${siteUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const update = (field: string, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  const updateColor = (color: string) => {
    update('accentColor', color);
    setHexInput(color);
  };

  return (
    <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel — Controls */}
      <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-border/30 bg-white flex flex-col overflow-hidden flex-shrink-0">
        {/* Header */}
        <div className="p-5 border-b border-border/30">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">Booking Site</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Your branded booking platform</p>
            </div>
          </div>
        </div>

        {/* URL Bar + Domain toggle */}
        <div className="px-5 py-3 border-b border-border/30 bg-gray-50/50">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your site URL</label>
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => setDomainMode('subdomain')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${domainMode === 'subdomain' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Subdomain
              </button>
              <button
                onClick={() => setDomainMode('custom')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${domainMode === 'custom' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                Own domain
              </button>
            </div>
          </div>

          {domainMode === 'subdomain' ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white border border-border/50 rounded-lg overflow-hidden">
                <span className="pl-3 text-[13px] text-muted-foreground select-none">https://</span>
                <input
                  type="text"
                  value={branding.subdomain}
                  onChange={e => update('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 py-2 pr-1 text-[13px] font-medium text-foreground outline-none bg-transparent min-w-0"
                />
                <span className="pr-3 text-[13px] text-muted-foreground select-none">.nfstay.app</span>
              </div>
              <button onClick={handleCopy} className="p-2 rounded-lg border border-border/50 hover:bg-gray-50 transition-colors" title="Copy URL">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white border border-border/50 rounded-lg overflow-hidden">
                <span className="pl-3 text-[13px] text-muted-foreground select-none">https://</span>
                <input
                  type="text"
                  value={branding.customDomain}
                  onChange={e => update('customDomain', e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                  className="flex-1 py-2 pr-3 text-[13px] font-medium text-foreground outline-none bg-transparent min-w-0"
                  placeholder="yourdomain.com"
                />
              </div>
              <button onClick={() => setPaymentOpen(true)} className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors" title="Connect domain">
                <Link2 className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-1">
          {([
            { id: 'brand' as const, label: 'Brand', icon: Palette },
            { id: 'content' as const, label: 'Content', icon: Type },
            { id: 'contact' as const, label: 'Contact', icon: Mail },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-gray-50'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'brand' && (
            <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_BRANDING">
              <Field label="Brand Name">
                <input type="text" value={branding.brandName} onChange={e => update('brandName', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="Your brand name" />
              </Field>
              <Field label="Accent Color">
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#000000'].map(c => (
                      <button key={c} onClick={() => updateColor(c)} className={`w-7 h-7 rounded-full border-2 transition-all ${branding.accentColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={branding.accentColor} onChange={e => updateColor(e.target.value)} className="w-8 h-8 rounded-lg border border-border/50 cursor-pointer flex-shrink-0" />
                    <div className="flex-1 flex items-center bg-white border border-border/50 rounded-lg overflow-hidden">
                      <span className="pl-2.5 text-[12px] text-muted-foreground select-none">#</span>
                      <input type="text" value={hexInput.replace('#', '')} onChange={e => { const v = e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 6); setHexInput(`#${v}`); if (v.length === 6) updateColor(`#${v}`); }} className="flex-1 py-1.5 pr-2 text-[12px] font-mono text-foreground outline-none bg-transparent" placeholder="10b981" maxLength={6} />
                    </div>
                    <div className="w-8 h-8 rounded-lg border border-border/30 flex-shrink-0" style={{ backgroundColor: branding.accentColor }} />
                  </div>
                </div>
              </Field>
              <Field label="Logo">
                <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all">
                  <Image className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">Click to upload logo</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, SVG — max 2MB</p>
                </div>
              </Field>
            </div>
          )}

          {activeTab === 'content' && (
            <>
              <p className="text-[10px] text-muted-foreground -mt-1 mb-2">Edit your site's content sections. Changes appear in the live preview.</p>

              <Field label="Hero Headline">
                <input data-feature="BOOKING_NFSTAY__CUSTOMIZER_HEADLINE" type="text" value={branding.heroHeadline} onChange={e => update('heroHeadline', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="Find Your Perfect Stay" />
              </Field>
              <Field label="Hero Subheadline">
                <input type="text" value={branding.heroSubheadline} onChange={e => update('heroSubheadline', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="Book directly with us" />
              </Field>

              <div className="border-t border-border/30 pt-3 mt-3">
                <p className="text-[11px] font-semibold text-foreground mb-2">About Section</p>
              </div>
              <Field label="About Your Business">
                <textarea value={branding.aboutBio} onChange={e => update('aboutBio', e.target.value)} rows={3} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none" placeholder="Tell guests about your business..." />
              </Field>

              <div className="border-t border-border/30 pt-3 mt-3">
                <p className="text-[11px] font-semibold text-foreground mb-2">FAQ Section</p>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1.5">
                  <Field label={`Question ${i}`}>
                    <input type="text" value={(branding as Record<string, string>)[`faq${i}Q`] || ''} onChange={e => update(`faq${i}Q`, e.target.value)} className="w-full px-3 py-1.5 text-[12px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 transition-all" placeholder={`FAQ question ${i}`} />
                  </Field>
                  <Field label={`Answer ${i}`}>
                    <textarea value={(branding as Record<string, string>)[`faq${i}A`] || ''} onChange={e => update(`faq${i}A`, e.target.value)} rows={2} className="w-full px-3 py-1.5 text-[12px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 transition-all resize-none" placeholder="Answer..." />
                  </Field>
                </div>
              ))}

              <div className="border-t border-border/30 pt-3 mt-3">
                <p className="text-[11px] font-semibold text-foreground mb-1">Footer</p>
                <p className="text-[10px] text-muted-foreground mb-2">Footer shows your brand name, contact info, and social links from the Contact tab.</p>
              </div>
            </>
          )}

          {activeTab === 'contact' && (
            <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_CONTACT">
              <p className="text-[10px] text-muted-foreground -mt-1 mb-2">Contact details appear in your site's footer, navbar, and contact page.</p>

              <Field label="Email">
                <input type="email" value={branding.contactEmail} onChange={e => update('contactEmail', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="hello@yourbrand.com" />
              </Field>
              <Field label="Phone">
                <input type="tel" value={branding.contactPhone} onChange={e => update('contactPhone', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="+44 7xxx xxx xxx" />
              </Field>
              <Field label="WhatsApp">
                <input type="tel" value={branding.contactWhatsapp} onChange={e => update('contactWhatsapp', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="+44 7xxx xxx xxx" />
              </Field>

              <div className="border-t border-border/30 pt-3 mt-3">
                <p className="text-[11px] font-semibold text-foreground mb-2">Social Links</p>
                <p className="text-[10px] text-muted-foreground mb-2">These appear in your footer with clickable icons.</p>
              </div>
              <Field label="Instagram">
                <input type="text" value={branding.socialInstagram} onChange={e => update('socialInstagram', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="@yourbrand" />
              </Field>
              <Field label="Facebook">
                <input type="text" value={branding.socialFacebook} onChange={e => update('socialFacebook', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="facebook.com/yourbrand" />
              </Field>
              <Field label="Twitter / X">
                <input type="text" value={branding.socialTwitter} onChange={e => update('socialTwitter', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="@yourbrand" />
              </Field>
              <Field label="TikTok">
                <input type="text" value={branding.socialTiktok} onChange={e => update('socialTiktok', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="@yourbrand" />
              </Field>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-5 border-t border-border/30 bg-gray-50/50 space-y-2">
          <button data-feature="BOOKING_NFSTAY__CUSTOMIZER_SAVE" onClick={() => setPaymentOpen(true)} className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[13px] font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:opacity-95">
            Publish Site
          </button>
          <p className="text-[10px] text-center text-muted-foreground">
            Your site will be live at <span className="font-medium">{siteUrl}</span>
          </p>
        </div>

        <PaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} onUnlocked={() => { setPaymentOpen(false); }} />
      </div>

      {/* Right Panel — Self-contained mockup preview */}
      <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_PREVIEW" className="flex-1 bg-[hsl(210,20%,96%)] flex flex-col overflow-hidden">
        {/* Preview Toolbar */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-border/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-muted-foreground">Preview</span>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Monitor className="w-4 h-4" />
              </button>
              <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="flex-1 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[1100px]'}`}>
            {/* Browser Chrome */}
            <div className="h-8 bg-gray-100 flex items-center px-3 gap-1.5 border-b border-gray-200">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-md px-3 py-0.5 text-[10px] text-muted-foreground text-center truncate">https://{siteUrl}</div>
              </div>
            </div>

            <MockPreview branding={branding} previewMode={previewMode} onPayment={() => setPaymentOpen(true)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

// ── Mock Properties ──
const MOCK_PROPS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80', title: 'Modern Shoreditch Loft', loc: 'London, UK', price: 145, beds: 2, baths: 1, guests: 4, type: 'Apartment', rating: 4.8, reviews: 24 },
  { id: 2, img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80', title: 'Chelsea Garden Flat', loc: 'London, UK', price: 195, beds: 3, baths: 2, guests: 6, type: 'Apartment', rating: 4.9, reviews: 31 },
  { id: 3, img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80', title: 'Covent Garden Studio', loc: 'London, UK', price: 89, beds: 1, baths: 1, guests: 2, type: 'Studio', rating: 4.7, reviews: 18 },
  { id: 4, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80', title: 'Camden Townhouse', loc: 'London, UK', price: 250, beds: 4, baths: 3, guests: 8, type: 'House', rating: 4.6, reviews: 12 },
  { id: 5, img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80', title: 'Notting Hill Mews', loc: 'London, UK', price: 175, beds: 2, baths: 1, guests: 4, type: 'Apartment', rating: 4.8, reviews: 42 },
  { id: 6, img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80', title: 'Canary Wharf Penthouse', loc: 'London, UK', price: 320, beds: 3, baths: 2, guests: 6, type: 'Penthouse', rating: 5.0, reviews: 8 },
  { id: 7, img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', title: 'Brixton Artist Flat', loc: 'London, UK', price: 95, beds: 1, baths: 1, guests: 3, type: 'Apartment', rating: 4.5, reviews: 15 },
  { id: 8, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80', title: 'Greenwich Riverside Home', loc: 'London, UK', price: 165, beds: 3, baths: 2, guests: 5, type: 'House', rating: 4.9, reviews: 22 },
];

// ── Mock Preview Component ──
function MockPreview({ branding, previewMode, onPayment }: { branding: typeof import('./BookingSitePage').default extends () => any ? never : Record<string, string>; previewMode: string; onPayment: () => void }) {
  const [page, setPage] = useState<'home' | 'search' | 'property' | 'about' | 'contact'>('home');
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState(MOCK_PROPS[0]);
  const ac = branding.accentColor;
  const isMobile = previewMode === 'mobile';

  // Navbar
  const Nav = () => (
    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10">
      <span className="text-[14px] font-bold" style={{ color: ac }}>{branding.brandName}</span>
      <div className="flex items-center gap-3">
        {!isMobile && (
          <>
            <button onClick={() => setPage('home')} className={`text-[11px] font-medium ${page === 'home' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Properties</button>
            <button onClick={() => setPage('about')} className={`text-[11px] font-medium ${page === 'about' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>About</button>
            <div className="relative">
              <button onClick={() => setContactOpen(!contactOpen)} className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                Contact <ChevronDown className="w-3 h-3" />
              </button>
              {contactOpen && (
                <div className="absolute right-0 top-6 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                  {branding.contactEmail && <div className="px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2 hover:bg-gray-50"><Mail className="w-3.5 h-3.5" />{branding.contactEmail || 'hello@yourbrand.com'}</div>}
                  {branding.contactWhatsapp && <div className="px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2 hover:bg-gray-50"><MessageCircle className="w-3.5 h-3.5 text-green-500" />{branding.contactWhatsapp}</div>}
                  {branding.contactPhone && <div className="px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2 hover:bg-gray-50"><Phone className="w-3.5 h-3.5" />{branding.contactPhone}</div>}
                  {!branding.contactEmail && !branding.contactWhatsapp && !branding.contactPhone && <div className="px-3 py-2 text-[11px] text-muted-foreground">Add contact info in the Contact tab</div>}
                </div>
              )}
            </div>
          </>
        )}
        <button onClick={onPayment} className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"><Clock className="w-3 h-3" />My Reservations</button>
        <button onClick={onPayment} className="px-2.5 py-1 text-[10px] font-semibold text-white rounded-full" style={{ backgroundColor: ac }}>Sign In</button>
      </div>
    </div>
  );

  // Property card
  const PropCard = ({ p, small }: { p: typeof MOCK_PROPS[0]; small?: boolean }) => (
    <div className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelectedProp(p); setPage('property'); }}>
      <div className="relative">
        <img src={p.img} alt={p.title} className={`w-full object-cover ${small ? 'h-[100px]' : 'h-[140px]'}`} />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-0.5">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-[10px] font-semibold">{p.rating}</span>
        </div>
      </div>
      <div className="p-2.5">
        <h4 className={`font-semibold text-foreground truncate ${small ? 'text-[11px]' : 'text-[12px]'}`}>{p.title}</h4>
        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{p.loc}</p>
        {!small && (
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{p.guests}</span>
            <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{p.beds}</span>
            <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.baths}</span>
          </div>
        )}
        <p className="text-[12px] font-bold mt-1.5" style={{ color: ac }}>£{p.price}<span className="text-[10px] font-normal text-muted-foreground"> / night</span></p>
      </div>
    </div>
  );

  // Footer
  const Footer = () => (
    <div className="px-4 py-4 bg-gray-900 text-white mt-4">
      <div className={`${isMobile ? '' : 'flex justify-between'}`}>
        <div>
          <span className="text-[13px] font-bold" style={{ color: ac }}>{branding.brandName}</span>
          <p className="text-[10px] text-gray-400 mt-1">Book directly with us. No middleman fees.</p>
        </div>
        <div className={`${isMobile ? 'mt-3' : ''} space-y-1`}>
          {branding.contactEmail && <p className="text-[10px] text-gray-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />{branding.contactEmail}</p>}
          {branding.contactPhone && <p className="text-[10px] text-gray-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />{branding.contactPhone}</p>}
          {branding.contactWhatsapp && <p className="text-[10px] text-gray-400 flex items-center gap-1.5"><MessageCircle className="w-3 h-3" />{branding.contactWhatsapp}</p>}
        </div>
      </div>
      {(branding.socialInstagram || branding.socialFacebook || branding.socialTwitter) && (
        <div className="flex gap-3 mt-3 text-[10px] text-gray-500">
          {branding.socialInstagram && <span>Instagram</span>}
          {branding.socialFacebook && <span>Facebook</span>}
          {branding.socialTwitter && <span>Twitter</span>}
          {branding.socialTiktok && <span>TikTok</span>}
        </div>
      )}
    </div>
  );

  if (page === 'property') return (
    <div onClick={() => setContactOpen(false)}>
      <Nav />
      <div className="p-4">
        <button onClick={() => setPage('home')} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-3"><ChevronLeft className="w-3.5 h-3.5" />Back</button>
        <div className={isMobile ? '' : 'flex gap-5'}>
          <div className="flex-1">
            <img src={selectedProp.img} alt="" className="w-full h-[200px] rounded-xl object-cover" />
            <h2 className="text-lg font-bold text-foreground mt-3">{selectedProp.title}</h2>
            <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{selectedProp.loc}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{selectedProp.beds} beds</span>
              <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{selectedProp.baths} baths</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{selectedProp.rating} ({selectedProp.reviews})</span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">A beautifully designed {selectedProp.type.toLowerCase()} with modern amenities in {selectedProp.loc.split(',')[0]}. Perfect for short stays and holidays. Direct booking — no middleman fees.</p>
          </div>
          <div className={`${isMobile ? 'mt-3' : 'w-[240px]'} flex-shrink-0`}>
            <div className="border border-gray-200 rounded-xl p-3 shadow-sm">
              <p className="text-lg font-bold">£{selectedProp.price} <span className="text-[12px] font-normal text-muted-foreground">/ night</span></p>
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden text-[10px]">
                <div className="flex">
                  <div className="flex-1 p-2 border-r border-gray-200"><p className="text-muted-foreground font-medium">Check in</p><p className="text-foreground">Add date</p></div>
                  <div className="flex-1 p-2"><p className="text-muted-foreground font-medium">Check out</p><p className="text-foreground">Add date</p></div>
                </div>
                <div className="p-2 border-t border-gray-200"><p className="text-muted-foreground font-medium">Guests</p><p className="text-foreground">1 guest</p></div>
              </div>
              <button onClick={onPayment} className="w-full mt-2 py-2 text-white text-[12px] font-semibold rounded-lg" style={{ backgroundColor: ac }}>Book Now</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (page === 'about') return (
    <div onClick={() => setContactOpen(false)}>
      <Nav />
      <div className="p-6 max-w-[600px] mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-3">About {branding.brandName}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{branding.aboutBio || 'Tell guests about your business in the Content tab.'}</p>
        {(branding.faq1Q || branding.faq2Q || branding.faq3Q) && (
          <div className="mt-8">
            <h3 className="text-base font-bold text-foreground mb-3">Frequently Asked Questions</h3>
            {[1, 2, 3].map(i => {
              const q = (branding as Record<string, string>)[`faq${i}Q`];
              const a = (branding as Record<string, string>)[`faq${i}A`];
              if (!q) return null;
              return (
                <div key={i} className="border-b border-gray-100 py-3">
                  <p className="text-[13px] font-semibold text-foreground">{q}</p>
                  <p className="text-[12px] text-muted-foreground mt-1">{a}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );

  // Home page
  return (
    <div onClick={() => setContactOpen(false)}>
      <Nav />
      {/* Hero */}
      <div className="px-6 py-10 text-center">
        <h1 className={`font-bold text-foreground ${isMobile ? 'text-xl' : 'text-3xl'}`}>{branding.heroHeadline}</h1>
        <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : 'text-base'}`}>{branding.heroSubheadline}</p>
      </div>
      {/* Search bar */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 text-[12px] text-muted-foreground">Search by location or property name...</div>
          <button className="px-4 py-2 text-white text-[12px] font-semibold rounded-lg flex-shrink-0" style={{ backgroundColor: ac }}>Search</button>
        </div>
      </div>
      {/* Property grid */}
      <div className="px-4">
        <h3 className="text-[14px] font-semibold text-foreground mb-3">Featured Properties</h3>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {MOCK_PROPS.slice(0, isMobile ? 4 : 6).map(p => <PropCard key={p.id} p={p} />)}
        </div>
      </div>
      {/* Recently viewed */}
      <div className="px-4 mt-6">
        <h3 className="text-[14px] font-semibold text-foreground mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4 text-muted-foreground" />Recently Viewed</h3>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {MOCK_PROPS.slice(4, 8).map(p => <PropCard key={p.id} p={p} small />)}
        </div>
      </div>
      <Footer />
    </div>
  );
}
