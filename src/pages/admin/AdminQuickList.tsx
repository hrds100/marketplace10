import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Upload, Image as ImageIcon, X, Settings2, Check, Save, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fetchPexelsPhotos } from '@/lib/pexels';

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
}

const EMPTY_LISTING: ParsedListing = {
  name: null, city: null, postcode: null, bedrooms: null, bathrooms: null,
  rent_monthly: null, profit_est: null, property_category: null, furnished: null,
  garage: null, description: null, features: null, type: null, sa_approved: null, notes: null,
};

export default function AdminQuickList() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Input state
  const [rawText, setRawText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Pexels fallback photos (URLs, not Files)
  const [pexelsUrls, setPexelsUrls] = useState<string[]>([]);

  // AI state - supports multiple listings from one paste
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

  // Publishing
  const [publishing, setPublishing] = useState(false);

  // Get next sequential property number from DB
  const getNextPropertyNumber = async (): Promise<number> => {
    const { count } = await (supabase.from('properties') as any)
      .select('id', { count: 'exact', head: true });
    return 1001 + (count || 0);
  };

  // Update a field on the active listing
  const updateField = (key: keyof ParsedListing, value: any) => {
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

  // Split text into individual listings if numbered (1. xxx 2. xxx)
  const splitMultiListings = (text: string): string[] => {
    // Check for numbered pattern: "1." or "1)" at start of line
    const numbered = text.split(/\n(?=\d+[.)]\s*)/);
    if (numbered.length > 1 && numbered.filter(s => s.trim()).length > 1) {
      return numbered.map(s => s.replace(/^\d+[.)]\s*/, '').trim()).filter(s => s.length > 5);
    }
    return [text];
  };

  // Parse a single listing text into structured fields
  const parseSingleListing = async (text: string): Promise<ParsedListing> => {
    // Extract postcode
    const postcodeMatch = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d?[A-Z]{0,2})\b/i);
    const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase().trim() : null;

      // Extract bedrooms - check for "X bedroom" pattern, also "total: X flats/units"
      const bedsMatch = text.match(/(\d+)\s*(?:bed(?:room)?s?|double\s+bed)/i);
      const totalUnitsMatch = text.match(/total:?\s*(\d+)\s*(?:flat|unit|room)/i);
      const unitCountMatch = text.match(/(\d+)[\s-]*unit/i);
      const bedrooms = totalUnitsMatch ? parseInt(totalUnitsMatch[1])
        : unitCountMatch ? parseInt(unitCountMatch[1])
        : bedsMatch ? parseInt(bedsMatch[1])
        : null;

      // Extract bathrooms - but avoid matching "1 Bath Each" as 1 bathroom for the whole block
      const allBathMatches = [...text.matchAll(/(\d+)\s*bath(?:room)?s?/gi)];
      let bathrooms: number | null = null;
      if (allBathMatches.length > 0) {
        // Sum if multiple bathroom references, or take highest number
        const nums = allBathMatches.map(m => parseInt(m[1]));
        bathrooms = Math.max(...nums);
      }

      const rentMatch = text.match(/[£]?\s*(\d[\d,]*)\s*(?:pcm|pm|per\s*month)/i);
      const rent_monthly = rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : null;

      // Resolve city from postcode using Google Maps Geocoding API
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      let city: string | null = null;

      if (postcode && apiKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode + ', UK')}&key=${apiKey}`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const result = geoData.results?.[0];
            if (result) {
              const components = result.address_components || [];
              // Try postal_town first (most accurate for UK), then locality, then admin_area_level_2
              const postalTown = components.find((c: any) => c.types.includes('postal_town'));
              const locality = components.find((c: any) => c.types.includes('locality'));
              const admin2 = components.find((c: any) => c.types.includes('administrative_area_level_2'));
              city = postalTown?.long_name || locality?.long_name || admin2?.long_name || null;
            }
          }
        } catch {
          // Geocoding failed - fall through to text search
        }
      }

      // Fallback: search for known city names in the text (word boundary match to avoid "Bath" in "Bathroom")
      if (!city) {
        const knownCities = [
          'London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Sheffield',
          'Bristol', 'Newcastle', 'Nottingham', 'Leicester', 'Coventry', 'Bradford',
          'Cardiff', 'Edinburgh', 'Glasgow', 'Belfast', 'Wolverhampton', 'Walsall',
          'Sunderland', 'Derby', 'Southampton', 'Portsmouth', 'Plymouth', 'Brighton',
          'Hull', 'Stoke', 'Blackpool', 'Bolton', 'Oldham', 'Luton', 'Milton Keynes',
          'Reading', 'Oxford', 'Cambridge', 'Ipswich', 'Norwich', 'Exeter', 'Gloucester',
          'Bath', 'Bournemouth', 'Ilford', 'Croydon', 'Harrow', 'Romford', 'Bromley',
          'Slough', 'Watford', 'Guildford', 'Canterbury', 'York', 'Lancaster', 'Preston',
          'Blackburn', 'Carlisle', 'Darlington', 'Middlesbrough', 'Durham', 'Aberdeen',
          'Dundee', 'Inverness', 'Perth', 'Swansea', 'Newport', 'Northampton', 'Lincoln',
          'Peterborough', 'Chelmsford', 'Colchester', 'Swindon', 'Salisbury', 'Taunton',
          'Worcester', 'Hereford', 'Shrewsbury', 'Telford', 'Chester', 'Crewe', 'Warrington',
          'Stockport', 'Halifax', 'Huddersfield', 'Wakefield', 'Harrogate', 'Doncaster',
        ];
        // Use word boundaries to avoid matching "Bath" inside "Bathroom"
        city = knownCities.find(c => new RegExp(`\\b${c}\\b`, 'i').test(text)) || null;
      }

      // Detect type
      const typeMap: [RegExp, string, string][] = [
        [/\bbungalow\b/i, 'Bungalow', 'house'],
        [/\bhmo\b/i, 'HMO', 'hmo'],
        [/\bstudio\b/i, 'Studio', 'flat'],
        [/\bflat\b/i, 'Flat', 'flat'],
        [/\bhouse\b/i, 'House', 'house'],
        [/\broom\b/i, 'Room', 'flat'],
        [/\bapartment\b/i, 'Flat', 'flat'],
      ];
      let type: string | null = null;
      let property_category: string | null = null;
      for (const [re, t, cat] of typeMap) {
        if (re.test(text)) { type = t; property_category = cat; break; }
      }

      // Check SA approved
      const saMatch = text.match(/sa\s*(?:approved|compliant|complaint)/i);
      const hmoMatch = text.match(/hmo\s*(?:compliant|complaint|licensed)/i);

      // Generate name - detect multi-unit blocks
      const isBlock = /\b(block|whole block|entire block)\b/i.test(text) || (unitCountMatch !== null);
      const bedLabel = isBlock && unitCountMatch
        ? `${unitCountMatch[1]}-Unit Block`
        : bedrooms
          ? `${bedrooms}-Bed`
          : null;
      const name = [
        bedLabel,
        isBlock ? null : (type || 'Property'),
        city,
      ].filter(Boolean).join(', ');

      // Build parsed listing
      const parsed: ParsedListing = {
        name,
        city,
        postcode,
        bedrooms,
        bathrooms,
        rent_monthly,
        property_category,
        type,
        furnished: /\bfurnished\b/i.test(text) ? true : null,
        garage: /\bgarage\b/i.test(text) || /\bparking\b/i.test(text) ? true : null,
        description: null,
        features: [],
        sa_approved: 'yes',
        notes: null,
      };

      // Extract profit if mentioned in text
      const profitMatch = text.match(/(?:monthly\s*)?profit[:\s]*[£]?\s*(\d[\d,]*)/i);
      parsed.profit_est = profitMatch ? parseInt(profitMatch[1].replace(/,/g, '')) : null;

      return parsed;
  };

  // Main generate handler - supports multi-listing text
  const handleGenerate = async () => {
    if (!rawText.trim()) {
      toast.error('Paste some listing text first');
      return;
    }
    setParsing(true);
    try {
      const chunks = splitMultiListings(rawText);
      const parsed: ParsedListing[] = [];

      for (const chunk of chunks) {
        const listing = await parseSingleListing(chunk);
        parsed.push(listing);
      }

      setListings(parsed);
      setActiveIdx(0);

      // Fetch Pexels city photos for the first listing if no photos uploaded
      if (photos.length === 0 && parsed[0]?.city) {
        const urls = await fetchPexelsPhotos(parsed[0].city, 'city skyline street', 4);
        if (urls.length > 0) {
          setPexelsUrls(urls);
          setPhotoPreviews(urls);
        }
      }

      toast.success(parsed.length > 1 ? `${parsed.length} listings detected` : 'Listing generated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to parse listing');
    } finally {
      setParsing(false);
    }
  };

  // Upload photos to Supabase Storage
  const uploadPhotos = async (propertyId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `properties/${propertyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('nfs-images').upload(path, file);
      if (error) {
        console.error('Photo upload failed:', error);
        continue;
      }
      const { data: urlData } = supabase.storage.from('nfs-images').getPublicUrl(path);
      if (urlData?.publicUrl) urls.push(urlData.publicUrl);
    }
    return urls;
  };

  // Publish one or all listings
  const handlePublish = async (status: 'live' | 'pending', publishAll = false) => {
    const toPublish = publishAll ? listings : listing ? [listing] : [];
    if (toPublish.length === 0) {
      toast.error('Generate a listing first');
      return;
    }
    setPublishing(true);
    try {
      let nextNum = await getNextPropertyNumber();

      for (const item of toPublish) {
        const propName = `Property #${nextNum} - ${item.name || 'Untitled'}`;
        nextNum++;

      // Insert property with all required fields
      const { data: prop, error: insertErr } = await (supabase.from('properties') as any)
        .insert({
          name: propName,
          city: item.city,
          postcode: item.postcode,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          rent_monthly: item.rent_monthly,
          profit_est: item.profit_est || 0,
          property_category: item.property_category,
          type: item.type || 'Flat',
          description: item.description,
          notes: item.notes,
          sa_approved: 'yes',
          garage: listing.garage || false,
          status,
          submitted_by: user?.id || null,
          photos: [],
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // Upload photos or use Pexels URLs
      if (prop?.id) {
        let urls: string[] = [];
        if (photos.length > 0) {
          urls = await uploadPhotos(prop.id);
        } else if (pexelsUrls.length > 0) {
          urls = pexelsUrls;
        }
        if (urls.length > 0) {
          await (supabase.from('properties') as any)
            .update({ photos: urls })
            .eq('id', prop.id);
        }

        // Run Airbnb pricing estimation (same as ListADealPage)
        try {
          const pricingRes = await fetch(`${N8N_BASE}/webhook/airbnb-pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: item.city || '',
              postcode: item.postcode || '',
              bedrooms: item.bedrooms || 0,
              bathrooms: item.bathrooms || 0,
              type: item.type || item.property_category || 'Flat',
              rent: item.rent_monthly || 0,
              propertyId: prop.id,
            }),
          });
          if (pricingRes.ok) {
            const pricing = await pricingRes.json();
            if (pricing?.estimated_nightly_rate) {
              await (supabase.from('properties') as any)
                .update({
                  estimated_nightly_rate: pricing.estimated_nightly_rate,
                  estimated_monthly_revenue: pricing.estimated_monthly_revenue,
                  estimated_profit: pricing.estimated_profit,
                  estimation_confidence: pricing.confidence,
                  estimation_notes: pricing.notes,
                  airbnb_search_url_7d: pricing.airbnb_url_7d || null,
                  airbnb_search_url_30d: pricing.airbnb_url_30d || null,
                  airbnb_search_url_90d: pricing.airbnb_url_90d || null,
                  ai_model_used: 'gpt-4o-mini',
                })
                .eq('id', prop.id);
            }
          }
        } catch {
          // Pricing estimation failed - not critical, listing still publishes
        }
      }

      } // end for loop

      const count = toPublish.length;
      toast.success(status === 'live'
        ? `${count} listing${count > 1 ? 's' : ''} published!`
        : `${count} listing${count > 1 ? 's' : ''} saved as draft`);
      // Reset form
      setRawText('');
      setPhotos([]);
      setPhotoPreviews([]);
      setPexelsUrls([]);
      setListings([]);
      setActiveIdx(0);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
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

  // (updateField defined above with listings array support)

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
          <p className="text-[10px] text-muted-foreground mt-1.5">This prompt tells the AI what to extract and what to strip (contact info, fees, etc). Changes apply to all future listings.</p>
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
                const isPexels = pexelsUrls.includes(src);
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
            placeholder={"Paste the WhatsApp listing here...\n\nExample:\n🔥 R2R Opportunity - 1 Bed Flat | Worthing (BN11)\n📍 Marine Parade, BN11 3QA\n🛏️ 1 Bedroom\n🛁 1 Bathroom\nRent: £1,400 pcm"}
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
            {parsing ? 'Generating...' : 'Generate Listing'}
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
                    disabled={publishing}
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
                    const isPexels = pexelsUrls.includes(src);
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
                  <input
                    value={listing.name || ''}
                    onChange={e => updateField('name', e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">City</label>
                  <input
                    value={listing.city || ''}
                    onChange={e => updateField('city', e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Postcode</label>
                  <input
                    value={listing.postcode || ''}
                    onChange={e => updateField('postcode', e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={listing.bedrooms ?? ''}
                    onChange={e => updateField('bedrooms', e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={listing.bathrooms ?? ''}
                    onChange={e => updateField('bathrooms', e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Rent (pcm)</label>
                  <input
                    type="number"
                    value={listing.rent_monthly ?? ''}
                    onChange={e => updateField('rent_monthly', e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Profit (est.)</label>
                  <input
                    type="number"
                    value={listing.profit_est ?? ''}
                    onChange={e => updateField('profit_est', e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Type</label>
                  <select
                    value={listing.property_category || ''}
                    onChange={e => updateField('property_category', e.target.value || null)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                    <option value="hmo">HMO</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={listing.description || ''}
                    onChange={e => updateField('description', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Features</label>
                  <input
                    value={listing.features?.join(', ') || ''}
                    onChange={e => updateField('features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Comma-separated"
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  data-feature="ADMIN__QUICK_LIST_SUBMIT"
                  onClick={() => handlePublish('live')}
                  disabled={publishing}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve & Publish
                </button>
                <button
                  onClick={() => handlePublish('pending')}
                  disabled={publishing}
                  className="h-11 px-5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-secondary disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
