import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Smartphone, Monitor, ExternalLink, Copy, Check, Palette, Type, Image, Mail, Phone, Link2, Upload } from 'lucide-react';
import PaymentSheet from '@/components/PaymentSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const heroImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
];

// Demo operator ID — used for live preview on nfstay.app
const DEMO_OPERATOR_ID = '00000000-0000-0000-0000-000000000099';

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
  socialInstagram: '',
  socialFacebook: '',
};

export default function BookingSitePage() {
  const { user } = useAuth();
  const [branding, setBranding] = useState(defaultBranding);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'content' | 'contact'>('brand');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom'>('subdomain');
  const [hexInput, setHexInput] = useState(defaultBranding.accentColor);
  const [iframeKey, setIframeKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const siteUrl = domainMode === 'custom' && branding.customDomain
    ? branding.customDomain
    : `${branding.subdomain}.nfstay.app`;

  // Sync branding changes to the demo operator in Supabase (debounced)
  const syncToDb = useCallback((updates: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await (supabase.from('nfs_operators') as any)
        .update(updates)
        .eq('id', DEMO_OPERATOR_ID);
      // Refresh the iframe to show new branding
      setIframeKey(k => k + 1);
    }, 800);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${siteUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const update = (field: string, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
    // Map frontend fields to nfs_operators columns
    const dbMap: Record<string, string> = {
      brandName: 'brand_name',
      accentColor: 'accent_color',
      heroHeadline: 'hero_headline',
      heroSubheadline: 'hero_subheadline',
      aboutBio: 'about_bio',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
      socialInstagram: 'social_instagram',
      socialFacebook: 'social_facebook',
    };
    if (dbMap[field]) {
      syncToDb({ [dbMap[field]]: value });
    }
    // Sync FAQ fields as JSON array
    if (field.startsWith('faq')) {
      const updated = { ...branding, [field]: value };
      const faqs = [1, 2, 3].map(i => ({
        question: (updated as Record<string, string>)[`faq${i}Q`] || '',
        answer: (updated as Record<string, string>)[`faq${i}A`] || '',
      })).filter(f => f.question);
      syncToDb({ faqs });
    }
  };

  const updateColor = (color: string) => {
    update('accentColor', color);
    setHexInput(color);
  };

  const previewUrl = `https://nfstay.app?preview=${DEMO_OPERATOR_ID}`;

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
              <Field label="Email">
                <input type="email" value={branding.contactEmail} onChange={e => update('contactEmail', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="hello@yourbrand.com" />
              </Field>
              <Field label="Phone">
                <input type="tel" value={branding.contactPhone} onChange={e => update('contactPhone', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="+44 7xxx xxx xxx" />
              </Field>
              <Field label="Instagram">
                <input type="text" value={branding.socialInstagram} onChange={e => update('socialInstagram', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="@yourbrand" />
              </Field>
              <Field label="Facebook">
                <input type="text" value={branding.socialFacebook} onChange={e => update('socialFacebook', e.target.value)} className="w-full px-3 py-2 text-[13px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all" placeholder="facebook.com/yourbrand" />
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

      {/* Right Panel — Live Preview (real nfstay.app with demo operator branding) */}
      <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_PREVIEW" className="flex-1 bg-[hsl(210,20%,96%)] flex flex-col overflow-hidden">
        {/* Preview Toolbar */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-border/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-muted-foreground">Live Preview</span>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Monitor className="w-4 h-4" />
              </button>
              <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-gray-100 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </a>
        </div>

        {/* Preview Frame — real nfstay.app iframe */}
        <div className="flex-1 flex items-start justify-center p-4 overflow-hidden">
          <div className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 h-full ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full'}`}>
            {/* Mock Browser Chrome */}
            <div className="h-8 bg-gray-100 flex items-center px-3 gap-1.5 border-b border-gray-200 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-md px-3 py-0.5 text-[10px] text-muted-foreground text-center truncate">
                  https://{siteUrl}
                </div>
              </div>
            </div>

            {/* Real nfstay.app iframe — scaled to always render at desktop width */}
            <div className="relative overflow-hidden" style={{ height: 'calc(100% - 32px)' }}>
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="border-0 origin-top-left"
                style={previewMode === 'desktop' ? {
                  width: '1440px',
                  height: '200%',
                  transform: 'scale(0.65)',
                  transformOrigin: 'top left',
                } : {
                  width: '375px',
                  height: '100%',
                  margin: '0 auto',
                  display: 'block',
                }}
                title="Booking site preview"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
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
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
