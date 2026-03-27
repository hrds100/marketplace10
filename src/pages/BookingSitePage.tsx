import { useState, useEffect } from 'react';
import { Globe, Smartphone, Monitor, Copy, Check, Palette, Type, Image, Mail, Phone, Link2, Upload, Loader2, AlertCircle, CheckCircle2, LayoutDashboard, Building2, CalendarCheck, Paintbrush, TrendingUp, Star, Eye } from 'lucide-react';
import PaymentSheet from '@/components/PaymentSheet';
import BookingSitePreview from './BookingSitePreview';
import { getBridgeUrl } from '@/lib/authBridge';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';
import { useUserTier } from '@/hooks/useUserTier';
import { isPaidTier } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const defaultBranding = {
  brandName: '',
  subdomain: '',
  customDomain: '',
  accentColor: '#10b981',
  heroHeadline: 'Find Your Perfect Stay',
  heroSubheadline: 'Book directly with us for the best rates and experience',
  aboutBio: '',
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
  footerTagline: 'Book your stay directly. No middlemen, no hidden fees.',
};

const previewDefaultBranding = {
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
  footerTagline: 'Book your stay directly. No middlemen, no hidden fees.',
};

export default function BookingSitePage() {
  useEffect(() => { document.title = 'nfstay - Booking Site'; }, []);

  const { tier, loading: tierLoading } = useUserTier();
  const { isAdmin } = useAuth();
  const paid = isPaidTier(tier) || isAdmin;

  if (tierLoading) {
    return (
      <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!paid) return <BookingSitePreviewPage />;

  return <BookingSiteDashboard />;
}

/* ─────────────────────────────────────────────
   FREE USER - exact preview from commit 7a2266c
   ───────────────────────────────────────────── */
function BookingSitePreviewPage() {
  const [branding, setBranding] = useState(previewDefaultBranding);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'content' | 'contact'>('brand');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom'>('subdomain');
  const [hexInput, setHexInput] = useState(previewDefaultBranding.accentColor);

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
      {/* Left Panel - Controls */}
      <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-border/30 bg-white flex flex-col overflow-hidden flex-shrink-0">
        {/* Header */}
        <div className="p-5 border-b border-border/30">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">Booking Site</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Your branded booking platform, included for all members</p>
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
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, SVG - max 2MB</p>
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
                <p className="text-[11px] font-semibold text-foreground mb-2">Footer</p>
              </div>
              <Field label="Footer Tagline">
                <input type="text" value={branding.footerTagline || ''} onChange={e => update('footerTagline', e.target.value)} className="w-full px-3 py-1.5 text-[12px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 transition-all" placeholder="Book your stay directly. No middleman fees." />
              </Field>
              <p className="text-[10px] text-muted-foreground">Contact info and social links are pulled from the Contact tab.</p>
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

      {/* Right Panel - Self-contained mockup preview */}
      <div data-feature="BOOKING_NFSTAY__CUSTOMIZER_PREVIEW" className="flex-1 bg-[hsl(210,20%,96%)] flex flex-col overflow-hidden">
        {/* Preview Toolbar */}
        <div className="h-12 px-5 flex items-center justify-between border-b border-border/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-muted-foreground">Preview</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Demo</span>
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

            <BookingSitePreview branding={branding as any} isMobile={previewMode === 'mobile'} onPayment={() => setPaymentOpen(true)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAID USER - dashboard with tabs
   ───────────────────────────────────────────── */
function BookingSiteDashboard() {
  const { operator, loading: opLoading, error: opError } = useNfsOperator();
  const { update: saveOperator, saving, error: saveError, success: saveSuccess } = useNfsOperatorUpdate();

  const [branding, setBranding] = useState(defaultBranding);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'content' | 'contact'>('brand');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom'>('subdomain');
  const [hexInput, setHexInput] = useState(defaultBranding.accentColor);
  const [seeded, setSeeded] = useState(false);
  const [topTab, setTopTab] = useState<'dashboard' | 'properties' | 'reservations' | 'branding'>('dashboard');

  // Dashboard stats
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({ properties: 0, reservations: 0, revenue: 0 });

  // Properties list
  const [properties, setProperties] = useState<Array<Record<string, unknown>>>([]);
  const [propsLoading, setPropsLoading] = useState(false);

  // Reservations list
  const [reservations, setReservations] = useState<Array<Record<string, unknown>>>([]);
  const [resLoading, setResLoading] = useState(false);

  // Fetch dashboard stats
  useEffect(() => {
    if (!operator?.id || topTab !== 'dashboard') return;
    setStatsLoading(true);
    Promise.all([
      (supabase.from('nfs_properties') as any).select('id', { count: 'exact', head: true }).eq('operator_id', operator.id),
      (supabase.from('nfs_reservations') as any).select('id, total_price').eq('operator_id', operator.id),
    ]).then(([propRes, resRes]) => {
      const propCount = propRes.count || 0;
      const resList = resRes.data || [];
      const revenue = resList.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.total_price) || 0), 0);
      setStats({ properties: propCount, reservations: resList.length, revenue });
      setStatsLoading(false);
    });
  }, [operator?.id, topTab]);

  // Fetch properties
  useEffect(() => {
    if (!operator?.id || topTab !== 'properties') return;
    setPropsLoading(true);
    (supabase.from('nfs_properties') as any)
      .select('id, name, city, status, images')
      .eq('operator_id', operator.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Array<Record<string, unknown>> | null }) => {
        setProperties(data || []);
        setPropsLoading(false);
      });
  }, [operator?.id, topTab]);

  // Fetch reservations
  useEffect(() => {
    if (!operator?.id || topTab !== 'reservations') return;
    setResLoading(true);
    (supabase.from('nfs_reservations') as any)
      .select('id, guest_name, check_in, check_out, status, total_price, nfs_properties(name)')
      .eq('operator_id', operator.id)
      .order('check_in', { ascending: false })
      .then(({ data }: { data: Array<Record<string, unknown>> | null }) => {
        setReservations(data || []);
        setResLoading(false);
      });
  }, [operator?.id, topTab]);

  // Pre-fill branding from operator record
  useEffect(() => {
    if (!operator || seeded) return;
    const faqs = (operator.faqs as Array<{ question?: string; answer?: string }>) || [];
    setBranding({
      brandName: operator.brand_name || '',
      subdomain: operator.subdomain || '',
      customDomain: operator.custom_domain || '',
      accentColor: operator.accent_color || '#10b981',
      heroHeadline: operator.hero_headline || defaultBranding.heroHeadline,
      heroSubheadline: operator.hero_subheadline || defaultBranding.heroSubheadline,
      aboutBio: operator.about_bio || '',
      aboutPhoto: operator.about_photo || '',
      faq1Q: faqs[0]?.question || defaultBranding.faq1Q,
      faq1A: faqs[0]?.answer || defaultBranding.faq1A,
      faq2Q: faqs[1]?.question || defaultBranding.faq2Q,
      faq2A: faqs[1]?.answer || defaultBranding.faq2A,
      faq3Q: faqs[2]?.question || defaultBranding.faq3Q,
      faq3A: faqs[2]?.answer || defaultBranding.faq3A,
      contactEmail: operator.contact_email || '',
      contactPhone: operator.contact_phone || '',
      contactWhatsapp: operator.contact_whatsapp || '',
      socialInstagram: operator.social_instagram || '',
      socialFacebook: operator.social_facebook || '',
      socialTwitter: operator.social_twitter || '',
      socialTiktok: operator.social_tiktok || '',
      footerTagline: defaultBranding.footerTagline,
    });
    setHexInput(operator.accent_color || '#10b981');
    if (operator.primary_domain_type === 'custom') setDomainMode('custom');
    setSeeded(true);
  }, [operator, seeded]);

  const siteUrl = domainMode === 'custom' && branding.customDomain
    ? branding.customDomain
    : `${branding.subdomain || 'yourbrand'}.nfstay.app`;

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

  const handleSave = async () => {
    const faqs = [
      { question: branding.faq1Q, answer: branding.faq1A },
      { question: branding.faq2Q, answer: branding.faq2A },
      { question: branding.faq3Q, answer: branding.faq3A },
    ];
    await saveOperator({
      brand_name: branding.brandName || null,
      subdomain: branding.subdomain || null,
      custom_domain: branding.customDomain || null,
      primary_domain_type: domainMode,
      accent_color: branding.accentColor || null,
      hero_headline: branding.heroHeadline || null,
      hero_subheadline: branding.heroSubheadline || null,
      about_bio: branding.aboutBio || null,
      about_photo: branding.aboutPhoto || null,
      faqs,
      contact_email: branding.contactEmail || null,
      contact_phone: branding.contactPhone || null,
      contact_whatsapp: branding.contactWhatsapp || null,
      social_instagram: branding.socialInstagram || null,
      social_facebook: branding.socialFacebook || null,
      social_twitter: branding.socialTwitter || null,
      social_tiktok: branding.socialTiktok || null,
    });
  };

  // Loading state
  if (opLoading) {
    return (
      <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No operator record
  if (!operator && !opLoading) {
    return (
      <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Complete your booking site setup</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {opError || 'You need to set up your operator profile before customising your booking site.'}
          </p>
          <button
            onClick={() => {
              window.open(getBridgeUrl("https://nfstay.app", "/admin/nfstay"), "_blank");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:opacity-95"
          >
            Start Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY" className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden relative">

      {/* Top Tab Bar */}
      <div className="border-b border-border bg-card px-5 flex-shrink-0">
        <div className="flex gap-1 py-2">
          {([
            { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'properties' as const, label: 'Properties', icon: Building2 },
            { id: 'reservations' as const, label: 'Reservations', icon: CalendarCheck },
            { id: 'branding' as const, label: 'Branding', icon: Paintbrush },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setTopTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${topTab === tab.id ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-gray-50'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {topTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back{operator?.brand_name ? `, ${operator.brand_name}` : ''}! Here's your property overview.
            </p>
          </div>
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, change: `${stats.reservations} bookings`, sub: 'all time' },
                { label: 'Active Listings', value: stats.properties, icon: Building2, change: `${stats.properties} total`, sub: 'properties' },
                { label: 'Reservations', value: stats.reservations, icon: CalendarCheck, change: `${stats.reservations} total`, sub: 'reservations' },
                { label: 'Avg Rating', value: '-', icon: Star, change: '-', sub: 'coming soon' },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                    <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-primary font-medium">{s.change}</span> {s.sub}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Properties Tab */}
      {topTab === 'properties' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
              <p className="text-sm text-muted-foreground">{properties.length} properties managed</p>
            </div>
            <button
              onClick={() => window.open(getBridgeUrl("https://nfstay.app", "/admin/nfstay/properties"), "_blank")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-95 transition-opacity"
            >
              Add Property
            </button>
          </div>
          {propsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No properties found</p>
              <p className="text-sm text-muted-foreground">Add your first property to get started</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left bg-muted/30">
                      <th className="p-4 font-medium text-muted-foreground">Property</th>
                      <th className="p-4 font-medium text-muted-foreground">Location</th>
                      <th className="p-4 font-medium text-muted-foreground">Status</th>
                      <th className="p-4 font-medium text-muted-foreground w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((prop) => {
                      const images = (prop.images as string[]) || [];
                      return (
                        <tr key={String(prop.id)} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {images[0] ? (
                                <img src={String(images[0])} alt={String(prop.name)} className="w-12 h-12 rounded-lg object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{String(prop.name || 'Unnamed')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{String(prop.city || '-')}</td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${prop.status === 'active' || prop.status === 'listed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {String(prop.status || 'draft')}
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => window.open(getBridgeUrl("https://nfstay.app", `/property/${String(prop.id)}`), "_blank")}
                              className="p-1.5 rounded-lg hover:bg-secondary"
                            >
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reservations Tab */}
      {topTab === 'reservations' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
            <p className="text-sm text-muted-foreground">{reservations.length} total reservations</p>
          </div>
          {resLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No reservations found</p>
              <p className="text-sm text-muted-foreground">Reservations will appear here once guests book your properties.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left bg-muted/30">
                      <th className="p-4 font-medium text-muted-foreground">Guest</th>
                      <th className="p-4 font-medium text-muted-foreground">Property</th>
                      <th className="p-4 font-medium text-muted-foreground">Check-in</th>
                      <th className="p-4 font-medium text-muted-foreground">Check-out</th>
                      <th className="p-4 font-medium text-muted-foreground">Amount</th>
                      <th className="p-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((res) => {
                      const propData = res.nfs_properties as Record<string, unknown> | null;
                      return (
                        <tr key={String(res.id)} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-medium">{String(res.guest_name || '-')}</td>
                          <td className="p-4 text-muted-foreground truncate max-w-[160px]">{propData ? String(propData.name) : '-'}</td>
                          <td className="p-4 text-muted-foreground whitespace-nowrap">{res.check_in ? new Date(String(res.check_in)).toLocaleDateString() : '-'}</td>
                          <td className="p-4 text-muted-foreground whitespace-nowrap">{res.check_out ? new Date(String(res.check_out)).toLocaleDateString() : '-'}</td>
                          <td className="p-4 font-medium">${Number(res.total_price || 0).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : res.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {String(res.status || 'pending')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branding Tab - original content */}
      {topTab === 'branding' && (
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel - Controls */}
      <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-border/30 bg-white flex flex-col overflow-hidden flex-shrink-0">
        {/* Header */}
        <div className="p-5 border-b border-border/30">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">Booking Site</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Your branded booking platform, included for all members</p>
            </div>
          </div>
          <button
            onClick={() => {
              window.open(getBridgeUrl("https://nfstay.app", "/admin/nfstay"), "_blank");
            }}
            className="text-xs text-primary hover:underline font-medium"
          >
            Open Booking Site Admin
          </button>
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
              <button onClick={handleCopy} className="p-2 rounded-lg border border-border/50 hover:bg-gray-50 transition-colors" title="Copy URL">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
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
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, SVG - max 2MB</p>
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
                <p className="text-[11px] font-semibold text-foreground mb-2">Footer</p>
              </div>
              <Field label="Footer Tagline">
                <input type="text" value={branding.footerTagline || ''} onChange={e => update('footerTagline', e.target.value)} className="w-full px-3 py-1.5 text-[12px] border border-border/50 rounded-lg outline-none focus:border-emerald-500 transition-all" placeholder="Book your stay directly. No middleman fees." />
              </Field>
              <p className="text-[10px] text-muted-foreground">Contact info and social links are pulled from the Contact tab.</p>
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
          {saveError && (
            <div className="flex items-center gap-2 text-red-600 text-[12px] mb-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-emerald-600 text-[12px] mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Changes saved</span>
            </div>
          )}
          <button
            data-feature="BOOKING_NFSTAY__CUSTOMIZER_SAVE"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[13px] font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          <p className="text-[10px] text-center text-muted-foreground">
            Your site will be live at <span className="font-medium">{siteUrl}</span>
          </p>
        </div>

        <PaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} onUnlocked={() => { setPaymentOpen(false); }} />
      </div>

      {/* Right Panel - Live preview */}
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

            <BookingSitePreview branding={branding as any} isMobile={previewMode === 'mobile'} onPayment={() => setPaymentOpen(true)} />
          </div>
        </div>
      </div>
      </div>
      )}
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
