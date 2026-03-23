import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Upload, Image as ImageIcon, X, Settings2, Check, Save, Loader2 } from 'lucide-react';
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
  rent_monthly: null, property_category: null, furnished: null, garage: null,
  description: null, features: null, type: null, sa_approved: null, notes: null,
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

  // AI state
  const [parsing, setParsing] = useState(false);
  const [listing, setListing] = useState<ParsedListing | null>(null);

  // System prompt
  const [showPrompt, setShowPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptSaving, setPromptSaving] = useState(false);
  const [aiSettingsId, setAiSettingsId] = useState<string | null>(null);

  // Publishing
  const [publishing, setPublishing] = useState(false);

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

  // Parse raw text into structured fields + get AI description
  const handleGenerate = async () => {
    if (!rawText.trim()) {
      toast.error('Paste some listing text first');
      return;
    }
    setParsing(true);
    try {
      const text = rawText;

      // Step 1: Extract fields from raw text with regex
      const postcodeMatch = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d?[A-Z]{0,2})\b/i);
      const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase().trim() : null;

      const bedsMatch = text.match(/(\d+)\s*(?:bed(?:room)?s?|double\s+bed)/i);
      const bedrooms = bedsMatch ? parseInt(bedsMatch[1]) : null;

      const bathsMatch = text.match(/(\d+)\s*bath(?:room)?s?/i);
      const bathrooms = bathsMatch ? parseInt(bathsMatch[1]) : null;

      const rentMatch = text.match(/[£]?\s*(\d[\d,]*)\s*(?:pcm|pm|per\s*month)/i);
      const rent_monthly = rentMatch ? parseInt(rentMatch[1].replace(/,/g, '')) : null;

      // Derive city from postcode prefix
      const postcodeCity: Record<string, string> = {
        'IG': 'Ilford', 'BN': 'Worthing', 'M': 'Manchester', 'B': 'Birmingham',
        'L': 'Liverpool', 'LS': 'Leeds', 'S': 'Sheffield', 'BS': 'Bristol',
        'NG': 'Nottingham', 'LE': 'Leicester', 'CF': 'Cardiff', 'EH': 'Edinburgh',
        'G': 'Glasgow', 'NE': 'Newcastle', 'SR': 'Sunderland', 'CV': 'Coventry',
        'SW': 'London', 'SE': 'London', 'E': 'London', 'N': 'London', 'W': 'London',
        'EC': 'London', 'WC': 'London', 'NW': 'London', 'EN': 'London',
        'CR': 'Croydon', 'BR': 'Bromley', 'DA': 'Dartford', 'KT': 'Kingston',
        'TW': 'Twickenham', 'HA': 'Harrow', 'UB': 'Uxbridge', 'SM': 'Sutton',
        'RG': 'Reading', 'OX': 'Oxford', 'CB': 'Cambridge', 'PE': 'Peterborough',
        'MK': 'Milton Keynes', 'LU': 'Luton', 'AL': 'St Albans', 'WD': 'Watford',
        'HP': 'Hemel Hempstead', 'SL': 'Slough', 'GU': 'Guildford', 'PO': 'Portsmouth',
        'SO': 'Southampton', 'BH': 'Bournemouth', 'DT': 'Dorchester', 'EX': 'Exeter',
        'PL': 'Plymouth', 'TQ': 'Torquay', 'BA': 'Bath', 'GL': 'Gloucester',
        'WR': 'Worcester', 'HR': 'Hereford', 'SY': 'Shrewsbury', 'ST': 'Stoke',
        'DE': 'Derby', 'DN': 'Doncaster', 'HU': 'Hull', 'YO': 'York',
        'HG': 'Harrogate', 'BD': 'Bradford', 'HX': 'Halifax', 'WF': 'Wakefield',
        'HD': 'Huddersfield', 'OL': 'Oldham', 'BL': 'Bolton', 'WN': 'Wigan',
        'PR': 'Preston', 'BB': 'Blackburn', 'FY': 'Blackpool', 'LA': 'Lancaster',
        'CA': 'Carlisle', 'DL': 'Darlington', 'TS': 'Middlesbrough', 'DH': 'Durham',
        'CT': 'Canterbury', 'ME': 'Rochester', 'TN': 'Tunbridge Wells', 'SS': 'Southend',
        'CM': 'Chelmsford', 'CO': 'Colchester', 'IP': 'Ipswich', 'NR': 'Norwich',
        'LN': 'Lincoln', 'WS': 'Walsall', 'WV': 'Wolverhampton', 'DY': 'Dudley',
        'RM': 'Romford',
      };
      const prefix = postcode ? postcode.replace(/\d.*/, '') : null;
      const cityFromPostcode = prefix ? postcodeCity[prefix] || null : null;

      // Check for city name in text
      const cityNames = Object.values(postcodeCity);
      const cityInText = cityNames.find(c => text.toLowerCase().includes(c.toLowerCase()));
      const city = cityInText || cityFromPostcode;

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

      // Generate name
      const name = [
        bedrooms ? `${bedrooms}-Bed` : null,
        type || 'Property',
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
        sa_approved: saMatch ? 'yes' : hmoMatch ? 'yes' : null,
        notes: null,
      };

      // Step 2: Clean text before sending to AI (strip contact info, fees, emojis)
      const cleanedText = text
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '') // emojis
        .replace(/\b0\d{10,11}\b/g, '') // UK phone numbers
        .replace(/\+\d{10,13}/g, '') // intl phone numbers
        .replace(/whatsapp\s*[:📲]?\s*/gi, '')
        .replace(/\bDM\b.*$/gim, '') // DM lines
        .replace(/\b(call|text|contact|message|ring)\b.*\d{5,}/gi, '') // contact lines with numbers
        .replace(/procurement\s*fee.*$/gim, '') // procurement fee lines
        .replace(/deposit.*£?\d+.*$/gim, '') // deposit lines
        .replace(/agent\s*fee.*$/gim, '') // agent fee lines
        .replace(/available\s*now/gi, '')
        .replace(/\n{3,}/g, '\n\n') // collapse blank lines
        .trim();

      try {
        const descRes = await fetch(`${N8N_BASE}/webhook/ai-generate-listing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: parsed.city || '',
            postcode: parsed.postcode || '',
            bedrooms: parsed.bedrooms || 0,
            bathrooms: parsed.bathrooms || 0,
            type: parsed.type || parsed.property_category || '',
            rent: parsed.rent_monthly || 0,
            notes: cleanedText,
          }),
        });
        if (descRes.ok) {
          const descData = await descRes.json();
          if (descData?.description) parsed.description = descData.description;
        }
      } catch {
        // Description generation failed - not critical
      }

      setListing(parsed);

      // Auto-fetch Pexels city photos if no photos uploaded
      if (photos.length === 0 && parsed.city) {
        const urls = await fetchPexelsPhotos(parsed.city, 'city skyline street', 4);
        if (urls.length > 0) {
          setPexelsUrls(urls);
          setPhotoPreviews(urls);
        }
      }

      toast.success('Listing generated');
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

  // Publish or save draft
  const handlePublish = async (status: 'live' | 'pending') => {
    if (!listing?.name) {
      toast.error('Generate a listing first');
      return;
    }
    setPublishing(true);
    try {
      // Insert property
      const { data: prop, error: insertErr } = await (supabase.from('properties') as any)
        .insert({
          name: listing.name,
          city: listing.city,
          postcode: listing.postcode,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          rent_monthly: listing.rent_monthly,
          property_category: listing.property_category,
          type: listing.type,
          description: listing.description,
          notes: listing.notes,
          sa_approved: listing.sa_approved || 'awaiting',
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
      }

      toast.success(status === 'live' ? 'Published!' : 'Saved as draft');
      // Reset form
      setRawText('');
      setPhotos([]);
      setPhotoPreviews([]);
      setPexelsUrls([]);
      setListing(null);
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

  // Field updater
  const updateField = (key: keyof ParsedListing, value: any) => {
    setListing(prev => prev ? { ...prev, [key]: value } : null);
  };

  return (
    <div className="max-w-[1200px]">
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
            <div>
              {pexelsUrls.length > 0 && photos.length === 0 && (
                <p className="text-[10px] text-muted-foreground mb-1.5 italic">Images for illustrative purposes only</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {pexelsUrls.includes(src) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] text-center py-0.5">Illustrative</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw text */}
          <textarea
            rows={16}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"Paste the WhatsApp listing here...\n\nExample:\n🔥 R2R Opportunity - 1 Bed Flat | Worthing (BN11)\n📍 Marine Parade, BN11 3QA\n🛏️ 1 Bedroom\n🛁 1 Bathroom\nRent: £1,400 pcm"}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />

          {/* Generate button */}
          <button
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
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Preview</h2>

              {/* Photo strip */}
              {photoPreviews.length > 0 && (
                <div>
                  {pexelsUrls.length > 0 && photos.length === 0 && (
                    <p className="text-[10px] text-muted-foreground mb-1.5 italic">Images for illustrative purposes only</p>
                  )}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img src={src} alt="" className="w-28 h-20 rounded-lg object-cover border border-border" />
                        {pexelsUrls.includes(src) && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] text-center py-0.5 rounded-b-lg">Illustrative only</div>
                        )}
                      </div>
                    ))}
                  </div>
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
