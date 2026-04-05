import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Upload, Image as ImageIcon, X, Settings2, Check, Save, Loader2, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fetchPexelsPhotos } from '@/lib/pexels';
import { normalizeUKPhone } from '@/lib/phoneValidation';

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

interface ParsedListing {
  name: string | null;
  city: string | null;
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rent_monthly: number | null;
  profit_est: number | null;
  property_category: string | null;
  furnished: boolean | null;
  garage: boolean | null;
  description: string | null;
  features: string[] | null;
  type: string | null;
  sa_approved: string | null;
  notes: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  lister_type: string | null;
  deposit: number | null;
  sourcing_fee: number | null;
  deal_type: string | null;
  listing_type: string | null;
  nightly_rate_projected: number | null;
  purchase_price: number | null;
  end_value: number | null;
  refurb_cost: number | null;
}

interface AIPricingResult {
  estimated_nightly_rate: number;
  estimated_monthly_revenue: number;
  estimated_profit: number;
  confidence: string;
  notes: string;
  airbnb_url_7d?: string;
  airbnb_url_30d?: string;
  airbnb_url_90d?: string;
}

type PublishPhase = 'idle' | 'publishing' | 'analysing' | 'reveal' | 'fallback';

export default function AdminQuickList() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Input state
  const [rawText, setRawText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Pexels fallback photos per listing index
  const [pexelsMap, setPexelsMap] = useState<Map<number, string[]>>(new Map());

  // AI state
  const [parsing, setParsing] = useState(false);
  const [listings, setListings] = useState<ParsedListing[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const listing = listings[activeIdx] || null;

  // System prompt
  const [showPrompt, setShowPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptSaving, setPromptSaving] = useState(false);
  const [aiSettingsId, setAiSettingsId] = useState<string | null>(null);

  // Publishing + Airbnb estimation phases
  const [publishPhase, setPublishPhase] = useState<PublishPhase>('idle');
  const [pricingResult, setPricingResult] = useState<AIPricingResult | null>(null);
  const [lastPublishedListing, setLastPublishedListing] = useState<ParsedListing | null>(null);

  // Get next sequential property number from DB
  const getNextPropertyNumber = async (): Promise<number> => {
    const { count } = await supabase.from('properties')
      .select('id', { count: 'exact', head: true });
    return 1001 + (count || 0);
  };

  // Update a field on the active listing
  const updateField = (key: keyof ParsedListing, value: unknown) => {
    setListings(prev => prev.map((l, i) => i === activeIdx ? { ...l, [key]: value } : l));
  };

  // Load system prompt from ai_settings
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from('ai_settings') as any)
        .select('id, system_prompt_description')
        .limit(1)
        .single();
      if (data) {
        setAiSettingsId(data.id);
        setSystemPrompt(data.system_prompt_description || '');
      }
      setPromptLoading(false);
    })();
  }, []);

  // Photo handling
  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addPhotos(files);
  }, []);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addPhotos(Array.from(e.target.files));
  }, []);

  const addPhotos = (files: File[]) => {
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // ── AI PARSING ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!rawText.trim()) {
      toast.error('Paste some listing text first');
      return;
    }
    setParsing(true);
    try {
      // Call the AI edge function - handles all parsing, K suffix, emojis, small towns, description
      const { data, error } = await supabase.functions.invoke('ai-parse-listing', {
        body: { rawText, systemPrompt: systemPrompt || undefined },
      });

      if (error) throw new Error(error.message || 'AI parsing failed');
      if (data?.error) throw new Error(data.error);

      const aiListings: ParsedListing[] = (data?.listings || []).map((l: Record<string, unknown>) => ({
        name: (l.name as string) || null,
        city: (l.city as string) || null,
        postcode: (l.postcode as string) || null,
        bedrooms: typeof l.bedrooms === 'number' ? l.bedrooms : null,
        bathrooms: typeof l.bathrooms === 'number' ? l.bathrooms : null,
        rent_monthly: typeof l.rent_monthly === 'number' ? l.rent_monthly : null,
        profit_est: typeof l.profit_est === 'number' ? l.profit_est : null,
        property_category: (l.property_category as string) || null,
        furnished: typeof l.furnished === 'boolean' ? l.furnished : null,
        garage: typeof l.garage === 'boolean' ? l.garage : null,
        description: (l.description as string) || null,
        features: Array.isArray(l.features) ? l.features : null,
        type: (l.type as string) || null,
        sa_approved: (l.sa_approved as string) || 'yes',
        notes: (l.notes as string) || null,
        contact_phone: normalizeUKPhone((l.contact_phone as string) || '') || (l.contact_phone as string) || null,
        contact_name: (l.contact_name as string) || null,
        contact_email: (l.contact_email as string) || null,
        lister_type: (l.lister_type as string) || null,
        deposit: typeof l.deposit === 'number' ? l.deposit : null,
        sourcing_fee: typeof l.sourcing_fee === 'number' ? l.sourcing_fee : null,
        deal_type: (l.deal_type as string) || null,
        listing_type: (l.listing_type as string) || 'rental',
        nightly_rate_projected: typeof l.nightly_rate_projected === 'number' ? l.nightly_rate_projected : null,
        purchase_price: typeof l.purchase_price === 'number' ? l.purchase_price : null,
        end_value: typeof l.end_value === 'number' ? l.end_value : null,
        refurb_cost: typeof l.refurb_cost === 'number' ? l.refurb_cost : null,
      }));

      if (aiListings.length === 0) throw new Error('AI could not parse any listings from the text');

      setListings(aiListings);
      setActiveIdx(0);

      // Fetch Pexels photos per listing (if no user photos uploaded)
      if (photos.length === 0) {
        const newMap = new Map<number, string[]>();
        for (let i = 0; i < aiListings.length; i++) {
          const city = aiListings[i].city;
          if (city) {
            const urls = await fetchPexelsPhotos(city, 'city skyline street', 4);
            if (urls.length > 0) newMap.set(i, urls);
          }
        }
        setPexelsMap(newMap);
        // Show first listing's Pexels previews
        const firstUrls = newMap.get(0);
        if (firstUrls) setPhotoPreviews(firstUrls);
      }

      toast.success(aiListings.length > 1 ? `${aiListings.length} listings detected` : 'Listing generated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse listing');
    } finally {
      setParsing(false);
    }
  };

  // Update photo previews when switching between listings
  useEffect(() => {
    if (photos.length > 0) return; // User uploaded photos take priority
    const urls = pexelsMap.get(activeIdx);
    if (urls) setPhotoPreviews(urls);
    else if (pexelsMap.size > 0) setPhotoPreviews([]);
  }, [activeIdx, pexelsMap, photos.length]);

  // Upload photos to Supabase Storage
  const uploadPhotos = async (propertyId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `properties/${propertyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('deals-photos').upload(path, file);
      if (error) {
        console.error('Photo upload failed:', error);
        continue;
      }
      const { data: urlData } = supabase.storage.from('deals-photos').getPublicUrl(path);
      if (urlData?.publicUrl) urls.push(urlData.publicUrl);
    }
    return urls;
  };

  // ── PUBLISH ────────────────────────────────────────────────────
  const handlePublish = async (status: 'live' | 'pending', publishAll = false) => {
    const toPublish = publishAll ? listings : listing ? [listing] : [];
    if (toPublish.length === 0) {
      toast.error('Generate a listing first');
      return;
    }
    setPublishPhase('publishing');
    setLastPublishedListing(toPublish[0]);
    try {
      let nextNum = await getNextPropertyNumber();
      let lastPropertyId: string | null = null;

      for (let idx = 0; idx < toPublish.length; idx++) {
        const item = toPublish[idx];
        const cleanName = (item.name || 'Untitled').replace(/\s*\(\s*\)\s*$/, '').trim();
        const propName = `Property #${nextNum} - ${cleanName}`;
        nextNum++;

        const { data: prop, error: insertErr } = await supabase.from('properties')
          .insert({
            name: propName,
            city: item.city || '',
            postcode: item.postcode || '',
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            rent_monthly: item.rent_monthly,
            profit_est: item.profit_est || 0,
            property_category: item.property_category,
            type: item.type || null,
            description: item.description,
            notes: item.notes,
            sa_approved: 'yes',
            garage: item.garage || false,
            status,
            submitted_by: user?.id || null,
            photos: [],
            contact_phone: item.contact_phone,
            contact_name: item.contact_name,
            contact_email: item.contact_email,
            lister_type: item.lister_type as 'landlord' | 'agent' | 'deal_sourcer' | null,
            source: 'quick_list' as const,
            landlord_whatsapp: item.contact_phone,
            deposit: item.deposit,
            sourcing_fee: item.sourcing_fee,
            deal_type: item.deal_type,
            listing_type: (item.listing_type || 'rental') as 'rental' | 'sale',
            nightly_rate_projected: item.nightly_rate_projected,
            purchase_price: item.purchase_price,
            end_value: item.end_value,
            refurb_cost: item.refurb_cost,
          })
          .select('id')
          .single();

        if (insertErr) throw new Error(insertErr.message);
        if (prop?.id) lastPropertyId = prop.id;

        // Admin bell notification for new property
        if (prop?.id) {
          (supabase.from('notifications') as any).insert({
            user_id: null,
            type: 'new_property',
            title: 'New property published: ' + (item.name || 'Untitled'),
            body: 'Published via Quick List',
            property_id: prop.id,
          }).then(() => {});
        }

        // Generate friendly slug: city-type-shortid (e.g. skelton-brr-bf3f36da)
        if (prop?.id) {
          const slugParts = [item.city, item.deal_type || item.type, (prop.id as string).slice(0, 8)]
            .filter(Boolean)
            .join('-')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-');
          supabase.from('properties').update({ slug: slugParts }).eq('id', prop.id).then(() => {});
        }

        // Upload photos or use Pexels URLs
        if (prop?.id) {
          let urls: string[] = [];
          if (photos.length > 0) {
            urls = await uploadPhotos(prop.id);
          } else {
            const pexelUrls = pexelsMap.get(publishAll ? idx : activeIdx);
            if (pexelUrls && pexelUrls.length > 0) urls = pexelUrls;
          }
          if (urls.length > 0) {
            await supabase.from('properties')
              .update({ photos: urls })
              .eq('id', prop.id);
          }
        }
      }

      // Show analysing phase while Airbnb pricing runs
      setPublishPhase('analysing');

      // Run Airbnb pricing on the last property
      if (lastPropertyId && toPublish[0]) {
        const item = toPublish[0];
        const minDelay = new Promise(r => setTimeout(r, 2500));
        const pricingFetch = (async (): Promise<AIPricingResult | null> => {
          const c = new AbortController(); const t = setTimeout(() => c.abort(), 25_000);
          try {
            const res = await fetch(`${N8N_BASE}/webhook/airbnb-pricing`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                city: item.city || '', postcode: item.postcode || '',
                bedrooms: item.bedrooms || 0, bathrooms: item.bathrooms || 0,
                type: item.type || item.property_category || 'Flat',
                rent: item.rent_monthly || 0, propertyId: lastPropertyId,
              }),
              signal: c.signal,
            });
            clearTimeout(t);
            if (!res.ok) { console.error('[airbnb-pricing] HTTP', res.status, await res.text().catch(() => '')); return null; }
            const data = await res.json();
            if (!data?.estimated_nightly_rate) { console.error('[airbnb-pricing] Missing estimated_nightly_rate:', data); return null; }
            return data as AIPricingResult;
          } catch (err) { console.error('[airbnb-pricing] Webhook failed:', err); clearTimeout(t); return null; }
        })();

        const [, result] = await Promise.all([minDelay, pricingFetch]);
        if (result) {
          setPricingResult(result);
          setPublishPhase('reveal');
          await supabase.from('properties').update({
            estimated_nightly_rate: result.estimated_nightly_rate,
            estimated_monthly_revenue: result.estimated_monthly_revenue,
            estimated_profit: result.estimated_profit,
            profit_est: result.estimated_profit || 0,
            estimation_confidence: result.confidence,
            estimation_notes: result.notes,
            airbnb_search_url_7d: result.airbnb_url_7d || null,
            airbnb_search_url_30d: result.airbnb_url_30d || null,
            airbnb_search_url_90d: result.airbnb_url_90d || null,
            ai_model_used: 'gpt-4o-mini',
          }).eq('id', lastPropertyId);
        } else {
          setPublishPhase('fallback');
        }
      } else {
        setPublishPhase('fallback');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
      setPublishPhase('idle');
    }
  };

  const resetAll = () => {
    setRawText('');
    setPhotos([]);
    setPhotoPreviews([]);
    setPexelsMap(new Map());
    setListings([]);
    setActiveIdx(0);
    setPublishPhase('idle');
    setPricingResult(null);
    setLastPublishedListing(null);
  };

  // Save system prompt
  const handleSavePrompt = async () => {
    setPromptSaving(true);
    try {
      if (aiSettingsId) {
        await (supabase.from('ai_settings') as any)
          .update({ system_prompt_description: systemPrompt, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq('id', aiSettingsId);
      } else {
        const { data } = await (supabase.from('ai_settings') as any)
          .insert({ system_prompt_description: systemPrompt, updated_by: user?.id })
          .select('id')
          .single();
        if (data) setAiSettingsId(data.id);
      }
      toast.success('System prompt saved');
    } catch {
      toast.error('Failed to save prompt');
    } finally {
      setPromptSaving(false);
    }
  };

  // Active Pexels URLs for current listing
  const activePexelsUrls = pexelsMap.get(activeIdx) || [];

  // ── Phase: Analysing ──
  if (publishPhase === 'analysing') {
    const item = lastPublishedListing;
    return (
      <div data-feature="ADMIN__QUICK_LIST" className="max-w-[1200px]">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-lg border border-border rounded-2xl p-8 bg-card text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <h2 className="text-[22px] font-bold text-foreground mt-5">We are preparing your listing</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Our AI is analysing Airbnb data and comparable listings in {item?.city || 'your area'}.</p>
            <div className="mt-6 rounded-xl bg-secondary p-4 text-left">
              <div className="text-sm font-bold text-foreground">{item?.name || 'Property'}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item?.city}{item?.postcode ? ` - ${item.postcode}` : ''}</div>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {item?.type && <span>{item.type}</span>}
                {item?.bedrooms && <span>{item.bedrooms} bed</span>}
                {item?.deal_type && <span className="font-medium">{item.deal_type}</span>}
              </div>
              {item?.rent_monthly ? (
                <div className="text-sm font-semibold text-foreground mt-2">{'\u00A3'}{item.rent_monthly.toLocaleString()} / month</div>
              ) : item?.purchase_price ? (
                <div className="text-sm font-semibold text-foreground mt-2">Purchase: {'\u00A3'}{item.purchase_price.toLocaleString()}</div>
              ) : null}
            </div>
            <div className="mt-6 w-full h-1.5 rounded-full overflow-hidden bg-border">
              <div className="h-full rounded-full bg-primary" style={{ animation: 'analysingProgress 2.5s ease-out forwards' }} />
            </div>
            <style>{`@keyframes analysingProgress { from { width: 0% } to { width: 92% } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Reveal ──
  if (publishPhase === 'reveal' && pricingResult) {
    const item = lastPublishedListing;
    const rent = item?.rent_monthly || 0;
    const cc = pricingResult.confidence === 'High' ? 'bg-emerald-100 text-emerald-800' : pricingResult.confidence === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
    return (
      <div data-feature="ADMIN__QUICK_LIST" className="max-w-[1200px]">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-lg border border-border rounded-2xl p-8 bg-card text-center">
            <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6 text-primary" /></div>
            <h2 className="text-[22px] font-bold text-foreground mt-4">Congratulations!</h2>
            <p className="text-sm text-muted-foreground mt-1.5">This property could make <span className="font-semibold text-foreground">{'\u00A3'}{pricingResult.estimated_monthly_revenue.toLocaleString()}</span> per month on Airbnb for Airbnb operators.</p>
            <div className="mt-5 rounded-xl bg-accent-light p-6 text-left">
              <div className="flex justify-between items-center py-2 border-b border-border/30"><span className="text-sm text-muted-foreground">Estimated nightly rate</span><span className="text-sm font-semibold text-foreground">{'\u00A3'}{pricingResult.estimated_nightly_rate}/night</span></div>
              <div className="flex justify-between items-center py-2 border-b border-border/30"><span className="text-sm text-muted-foreground">Est. monthly revenue</span><span className="text-sm font-semibold text-foreground">{'\u00A3'}{pricingResult.estimated_monthly_revenue.toLocaleString()}</span></div>
              {rent > 0 && <div className="flex justify-between items-center py-2 border-b border-border/30"><span className="text-sm text-muted-foreground">Monthly rent</span><span className="text-sm font-semibold text-foreground">-{'\u00A3'}{rent.toLocaleString()}</span></div>}
              <div className="flex justify-between items-center pt-3 mt-1"><span className="text-base font-bold text-foreground">Est. monthly profit</span><span className="text-2xl font-bold text-primary">{'\u00A3'}{pricingResult.estimated_profit.toLocaleString()}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-center"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${cc}`}>Confidence: {pricingResult.confidence}</span></div>
            {pricingResult.notes && <p className="text-xs text-muted-foreground mt-3 max-w-[400px] mx-auto">{pricingResult.notes}</p>}
            <div className="border-t border-border mt-6 pt-5">
              <button onClick={resetAll} className="h-11 px-8 rounded-lg bg-foreground text-background font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
                List another <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Fallback ──
  if (publishPhase === 'fallback') {
    return (
      <div data-feature="ADMIN__QUICK_LIST" className="max-w-[1200px]">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center"><CheckCircle className="w-6 h-6 text-primary" /></div>
          <h2 className="text-[22px] font-bold text-foreground mt-4">Published!</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[400px]">Your listing is live. AI is still analysing market data - estimated profitability will appear shortly.</p>
          <div className="flex justify-center mt-6">
            <button onClick={resetAll} className="h-11 px-8 rounded-lg bg-foreground text-background font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
              List another <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: Idle (main form) ──
  return (
    <div data-feature="ADMIN__QUICK_LIST" className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Quick List</h1>
          <p className="text-sm text-muted-foreground mt-1">Paste a WhatsApp listing, upload photos, and publish in seconds.</p>
        </div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" /> System Prompt
        </button>
      </div>

      {/* System Prompt Panel */}
      {showPrompt && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">AI Parsing Instructions</h2>
            </div>
            <button
              onClick={handleSavePrompt}
              disabled={promptSaving}
              className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {promptSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          </div>
          <textarea
            rows={10}
            value={promptLoading ? 'Loading...' : systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            disabled={promptLoading}
            placeholder="Instructions for how AI should parse raw listing text..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">This prompt tells the AI what to extract. Changes apply to all future listings.</p>
        </div>
      )}

      {/* Main layout: Input left, Preview right */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* LEFT - Input */}
        <div className="space-y-4">

          {/* Photo upload */}
          <div
            className="bg-card border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
            onDrop={handlePhotoDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Drop photos here or click to upload</p>
          </div>

          {/* Photo previews */}
          {photoPreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photoPreviews.map((src, i) => {
                const isPexels = activePexelsUrls.includes(src);
                return (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt="" className={`w-full h-full object-cover ${isPexels ? 'blur-[8px] scale-110' : ''}`} />
                    {isPexels && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-0.5">
                        <Lock className="w-3.5 h-3.5 text-white/90" />
                        <span className="text-white text-[6px] font-medium">On request</span>
                      </div>
                    )}
                    {!isPexels && (
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Raw text */}
          <textarea
            data-feature="ADMIN__QUICK_LIST_INPUT"
            rows={16}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"Paste the WhatsApp listing here...\n\nExample:\n\uD83D\uDD25 R2R Opportunity - 1 Bed Flat | Worthing (BN11)\n\uD83D\uDCCD Marine Parade, BN11 3QA\n\uD83D\uDECF\uFE0F 1 Bedroom\n\uD83D\uDEC1 1 Bathroom\nRent: \u00A31,400 pcm"}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />

          {/* Generate button */}
          <button
            data-feature="ADMIN__QUICK_LIST_PARSE"
            onClick={handleGenerate}
            disabled={parsing || !rawText.trim()}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {parsing ? 'AI is parsing...' : 'Generate Listing'}
          </button>
        </div>

        {/* RIGHT - Preview */}
        <div>
          {!listing ? (
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Paste text and click Generate to preview the listing here</p>
            </div>
          ) : (
            <div data-feature="ADMIN__QUICK_LIST_PREVIEW" className="bg-card border border-border rounded-2xl p-5 space-y-4">
              {/* Multi-listing tabs */}
              {listings.length > 1 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {listings.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        i === activeIdx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {i + 1}. {l.city || l.postcode || `Listing ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  Preview {listings.length > 1 ? `(${activeIdx + 1}/${listings.length})` : ''}
                </h2>
                {listings.length > 1 && (
                  <button
                    onClick={() => handlePublish('live', true)}
                    disabled={publishPhase !== 'idle'}
                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Publish All ({listings.length})
                  </button>
                )}
              </div>

              {/* Photo strip */}
              {photoPreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photoPreviews.map((src, i) => {
                    const isPexels = activePexelsUrls.includes(src);
                    return (
                      <div key={i} className="relative flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden border border-border">
                        <img src={src} alt="" className={`w-full h-full object-cover ${isPexels ? 'blur-[8px] scale-110' : ''}`} />
                        {isPexels && (
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                            <Lock className="w-4 h-4 text-white/90" />
                            <span className="text-white text-[8px] font-medium">Photos on request</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Title</label>
                  <input value={listing.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">City</label>
                  <input value={listing.city || ''} onChange={e => updateField('city', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Postcode</label>
                  <input value={listing.postcode || ''} onChange={e => updateField('postcode', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Bedrooms</label>
                  <input type="number" value={listing.bedrooms ?? ''} onChange={e => updateField('bedrooms', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Bathrooms</label>
                  <input type="number" value={listing.bathrooms ?? ''} onChange={e => updateField('bathrooms', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Rent (pcm)</label>
                  <input type="number" value={listing.rent_monthly ?? ''} onChange={e => updateField('rent_monthly', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Profit (est.)</label>
                  <input type="number" value={listing.profit_est ?? ''} onChange={e => updateField('profit_est', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Type</label>
                  <select value={listing.property_category || ''} onChange={e => updateField('property_category', e.target.value || null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                    <option value="">Select</option>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                    <option value="hmo">HMO</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
                  <textarea rows={4} value={listing.description || ''} onChange={e => updateField('description', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Features</label>
                  <input value={listing.features?.join(', ') || ''} onChange={e => updateField('features', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="Comma-separated" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
              </div>

              {/* Contact fields */}
              <div className="border-t border-border pt-3 mt-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Phone</label>
                    <input value={listing.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N/A" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Name</label>
                    <input value={listing.contact_name || ''} onChange={e => updateField('contact_name', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N/A" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email</label>
                    <input value={listing.contact_email || ''} onChange={e => updateField('contact_email', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Optional" type="email" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Lister Type</label>
                    <div className="flex gap-3 mt-1">
                      {([['landlord', 'Landlord'], ['agent', 'Agent'], ['deal_sourcer', 'Deal Sourcer']] as const).map(([val, label]) => (
                        <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={`lister_type_${activeIdx}`} value={val} checked={listing.lister_type === val}
                            onChange={() => updateField('lister_type', val)}
                            className="w-4 h-4 accent-[#1E9A80]" />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Deal details */}
              <div className="border-t border-border pt-3 mt-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Deal Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Deal Type</label>
                    <select value={listing.deal_type || ''} onChange={e => updateField('deal_type', e.target.value || null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="">Select</option>
                      <option value="R2SA">R2SA</option>
                      <option value="R2R">R2R</option>
                      <option value="BRR">BRR</option>
                      <option value="flip">Flip</option>
                      <option value="block">Block</option>
                      <option value="HMO">HMO</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Listing Type</label>
                    <select value={listing.listing_type || 'rental'} onChange={e => updateField('listing_type', e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="rental">Rental</option>
                      <option value="sale">Sale</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Deposit</label>
                    <input type="number" value={listing.deposit ?? ''} onChange={e => updateField('deposit', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N/A" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Sourcing Fee</label>
                    <input type="number" value={listing.sourcing_fee ?? ''} onChange={e => updateField('sourcing_fee', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N/A" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Nightly Rate (proj.)</label>
                    <input type="number" value={listing.nightly_rate_projected ?? ''} onChange={e => updateField('nightly_rate_projected', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N/A" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Purchase Price</label>
                    <input type="number" value={listing.purchase_price ?? ''} onChange={e => updateField('purchase_price', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N/A" />
                  </div>
                  {/* BRR-specific fields */}
                  {(listing.deal_type === 'BRR' || listing.deal_type === 'flip') && (
                    <>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">End Value (GDV)</label>
                        <input type="number" value={listing.end_value ?? ''} onChange={e => updateField('end_value', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="After refurb value" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Refurb Cost</label>
                        <input type="number" value={listing.refurb_cost ?? ''} onChange={e => updateField('refurb_cost', e.target.value ? Number(e.target.value) : null)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Renovation cost" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  data-feature="ADMIN__QUICK_LIST_SUBMIT"
                  onClick={() => handlePublish('pending')}
                  disabled={publishPhase !== 'idle'}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {publishPhase !== 'idle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Submit for Approval
                </button>
                <button
                  onClick={() => handlePublish('live')}
                  disabled={publishPhase !== 'idle'}
                  className="h-11 px-5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-secondary disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  Skip &amp; Publish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
