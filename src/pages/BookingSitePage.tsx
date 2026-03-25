import { useState } from 'react';
import { Globe, Smartphone, Monitor, ExternalLink, Copy, Check, Palette, Type, Image, MessageSquare, Mail, Phone, Link2 } from 'lucide-react';
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
  accentColor: '#10b981',
  heroHeadline: 'Find Your Perfect Stay',
  heroSubheadline: 'Book directly with us for the best rates and experience',
  heroImage: heroImages[0],
  aboutBio: 'We offer carefully curated vacation rentals in the most beautiful locations.',
  contactEmail: '',
  contactPhone: '',
  socialInstagram: '',
  socialFacebook: '',
};

export default function BookingSitePage() {
  const [branding, setBranding] = useState(defaultBranding);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'content' | 'contact'>('brand');
  const [paymentOpen, setPaymentOpen] = useState(false);

  const siteUrl = `${branding.subdomain}.nfstay.app`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${siteUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const update = (field: string, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
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

        {/* URL Bar */}
        <div className="px-5 py-3 border-b border-border/30 bg-gray-50/50">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your site URL</label>
          <div className="mt-1.5 flex items-center gap-2">
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
                <input
                  type="text"
                  value={branding.brandName}
                  onChange={e => update('brandName', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="Your brand name"
                />
              </Field>
              <Field label="Accent Color">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={e => update('accentColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border/50 cursor-pointer"
                  />
                  <div className="flex gap-1.5">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#000000'].map(c => (
                      <button
                        key={c}
                        onClick={() => update('accentColor', c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${branding.accentColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
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
              <Field label="Hero Headline">
                <input
                  data-feature="BOOKING_NFSTAY__CUSTOMIZER_HEADLINE"
                  type="text"
                  value={branding.heroHeadline}
                  onChange={e => update('heroHeadline', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="Find Your Perfect Stay"
                />
              </Field>
              <Field label="Hero Subheadline">
                <input
                  type="text"
                  value={branding.heroSubheadline}
                  onChange={e => update('heroSubheadline', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="Book directly with us"
                />
              </Field>
              <Field label="About Your Business">
                <textarea
                  value={branding.aboutBio}
                  onChange={e => update('aboutBio', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                  placeholder="Tell guests about your business..."
                />
              </Field>
              <Field label="Hero Image">
                <div className="grid grid-cols-5 gap-1.5">
                  {heroImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => update('heroImage', img)}
                      className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${branding.heroImage === img ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-transparent hover:border-gray-300'}`}
                    >
                      <img src={img} alt={`Hero ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {activeTab === 'contact' && (
            <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_CONTACT">
              <Field label="Email">
                <input
                  type="email"
                  value={branding.contactEmail}
                  onChange={e => update('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="hello@yourbrand.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={branding.contactPhone}
                  onChange={e => update('contactPhone', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="+44 7xxx xxx xxx"
                />
              </Field>
              <Field label="Instagram">
                <input
                  type="text"
                  value={branding.socialInstagram}
                  onChange={e => update('socialInstagram', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="@yourbrand"
                />
              </Field>
              <Field label="Facebook">
                <input
                  type="text"
                  value={branding.socialFacebook}
                  onChange={e => update('socialFacebook', e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="facebook.com/yourbrand"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-5 border-t border-border/30 bg-gray-50/50 space-y-2">
          <button
            data-feature="BOOKING_NFSTAY__CUSTOMIZER_SAVE"
            onClick={() => setPaymentOpen(true)}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[13px] font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:opacity-95"
          >
            Publish Site
          </button>
          <button
            onClick={() => setPaymentOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border/50 hover:bg-gray-50 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Connect your own domain
          </button>
          <p className="text-[10px] text-center text-muted-foreground">
            Your site will be live at <span className="font-medium">{siteUrl}</span>
          </p>
        </div>

        {/* GHL Payment iframe — same as subscription flow */}
        <PaymentSheet
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onUnlocked={() => { setPaymentOpen(false); }}
        />
      </div>

      {/* Right Panel — Preview */}
      <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_PREVIEW" className="flex-1 bg-[hsl(210,20%,96%)] flex flex-col overflow-hidden">
        {/* Preview Toolbar */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-border/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-muted-foreground">Preview</span>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-gray-100 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </button>
        </div>

        {/* Preview Frame */}
        <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
          <div
            className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[1100px]'}`}
            style={{ minHeight: previewMode === 'mobile' ? '667px' : '600px' }}
          >
            {/* Mock Browser Chrome */}
            <div className="h-8 bg-gray-100 flex items-center px-3 gap-1.5 border-b border-gray-200">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-md px-3 py-0.5 text-[10px] text-muted-foreground text-center truncate">
                  https://{siteUrl}
                </div>
              </div>
            </div>

            {/* Mock Site Header */}
            <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100">
              <span className="text-[15px] font-bold" style={{ color: branding.accentColor }}>
                {branding.brandName}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground">Properties</span>
                <span className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground">About</span>
                <span className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground">Contact</span>
              </div>
            </div>

            {/* Mock Hero */}
            <div className="relative h-[280px] overflow-hidden">
              <img
                src={branding.heroImage}
                alt="Hero"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h2 className={`font-bold text-white mb-2 ${previewMode === 'mobile' ? 'text-xl' : 'text-3xl'}`}>
                  {branding.heroHeadline}
                </h2>
                <p className={`text-white/80 ${previewMode === 'mobile' ? 'text-sm' : 'text-base'}`}>
                  {branding.heroSubheadline}
                </p>
              </div>
            </div>

            {/* Mock Search Bar */}
            <div className="px-6 -mt-5 relative z-10">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Location</p>
                  <p className="text-[13px] text-foreground">Where are you going?</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Check in — Check out</p>
                  <p className="text-[13px] text-foreground">Add dates</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Guests</p>
                  <p className="text-[13px] text-foreground">Add guests</p>
                </div>
                <button
                  className="px-5 py-2.5 text-white text-[13px] font-semibold rounded-lg"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Mock Property Cards */}
            <div className="p-6 pt-8">
              <h3 className="text-[15px] font-semibold text-foreground mb-4">Featured Properties</h3>
              <div className={`grid gap-4 ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {[
                  { img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80', title: 'Modern City Apartment', loc: 'London, UK', price: '£120' },
                  { img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80', title: 'Luxury Penthouse Suite', loc: 'Manchester, UK', price: '£185' },
                  { img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80', title: 'Cozy Studio Retreat', loc: 'Birmingham, UK', price: '£85' },
                ].map((p, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                    <img src={p.img} alt={p.title} className="w-full h-[140px] object-cover" />
                    <div className="p-3">
                      <h4 className="text-[13px] font-semibold text-foreground">{p.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.loc}</p>
                      <p className="text-[13px] font-bold mt-2" style={{ color: branding.accentColor }}>
                        {p.price}<span className="text-[11px] font-normal text-muted-foreground"> / night</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold" style={{ color: branding.accentColor }}>
                  {branding.brandName}
                </span>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  {branding.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {branding.contactEmail}
                    </span>
                  )}
                  {branding.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {branding.contactPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
